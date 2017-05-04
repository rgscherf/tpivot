<?php

class Queryparser extends CI_Model {
    private $distinct_columns_seen = [];
    
    public function __construct() {
        parent::__construct();
        $this->load->database();
    }
    
    
    ////////////////////
    // UTILITY FUNCTIONS
    ////////////////////
    
    private function qualified_field_name($table, $field) {
        return 'CE_CASE_MGMT.' . strtoupper($table) . '.' . strtoupper($field['name']);
    }
    
    private function field_name($field) {
        return strtoupper($field['name']);
    }
    
    
    ////////////////
    // SELECT CLAUSE
    ////////////////
    
    private function get_selected_columns($query_model) {
        $rows = $query_model['Rows'];
        $cols = $query_model['Columns'];
        $vals = $query_model['Values'];
        return array_merge($rows, $cols, $vals);
    }
    
    private function make_simple_selections($table, $query_model, $select_distinct=false) {
        // Return selected columns plus selected table.
        
        $qualified_col_names = [];
        $selected_columns = $this->get_selected_columns($query_model);
        foreach ($selected_columns as $col) {
            $qualified_col_names[] = $this->qualified_field_name($table, $col);
        }
        
        // putting clause together
        $return_string = $select_distinct ? "SELECT DISTINCT \n" : "SELECT \n";
        $return_string .= join(",\n", $qualified_col_names);
        $return_string .= "\n FROM CE_CASE_MGMT.$table";
        return $return_string;
    }
    
    private function make_nested_selections($table, $query_model, $agg_column) {
        // if the user has asked for a list unique aggregation,
        // nest simple selections inside a LISTAGG for that field.
        
        // OUTER SELECT
        $return_string = "SELECT \n";
        $selected_columns = $this->get_selected_columns($query_model);
        $col_strings = [];
        foreach($selected_columns as $col) {
            $col_name = $this->field_name($col);
            if ($col_name != $agg_column) {
                $col_strings[] = $col_name;
            } else {
                $col_strings[] = "LISTAGG($col_name, '; ') WITHIN GROUP (ORDER BY $col_name) $col_name";
            }
        }
        
        // INNER SELECT
        $return_string .= join(",\n", $col_strings);
        $return_string .= "\n";
        $return_string .= "FROM (\n";
        $return_string .= $this->make_simple_selections($table, $query_model, true);
        $return_string .= ")\n";
        
        // GROUP BY EVERY COL THAT IS NOT THE LISTAGG COL
        $return_string .= "GROUP BY \n";
        $grouping_cols = [];
        foreach($selected_columns as $col) {
            $col_name = $this->field_name($col);
            if (in_array($col_name, $col_strings)) {
                $grouping_cols[] = $col_name;
            }
        }
        $return_string .= join(", ", $grouping_cols);
        $return_string .= "\n";
        
        return $return_string;
    }
    
    private function detect_listagg($query_model) {
        // Detects whether the user has chosed a LISTAGG aggregator.
        // If so, returns the FIRST field selected for LISTAGG to be aggregated
        // e.g. User can only listagg one field at a time.
        $listagg_detected = false;
        $listagg_column = "";
        foreach ($query_model["Values"] as $val) {
            $reducer = $val["reducer"];
            if ($reducer == "listagg") {
                $listagg_column = $this->field_name($val);
                $listagg_detected = true;
                break;
        }
    }
    return [$listagg_detected, $listagg_column];
}

private function make_selections($table, $query_model) {
    // Construct the query's SELECT clause.
    // make_simple_selections() constructs a basic select.
    // make_nested_selections() constructs select for LISTAGG queries.
    
    list($listagg_detected, $listagg_column) = $this->detect_listagg($query_model);
    if ($listagg_detected) {
        return $this->make_nested_selections($table, $query_model, $listagg_column);
    } else {
        return $this->make_simple_selections($table, $query_model);
    }
}


///////////////
// WHERE CLAUSE
///////////////

private function make_filters($query_model) {
    return '';
}


//////////////////////////
// PIVOT AGGREGATOR CLAUSE
//////////////////////////

private function make_aggregator($query_model) {
    // if there are aggregator values in the client query,
    // take the FIRST and combine its reducer name with its unqualified name.
    // if there are no aggregator values in the client query,
    // take the FIRST entry in columns and return its count.
    if (count($query_model['Values']) === 0) {
        $first_col = $this->field_name($query_model['Columns'][0]);
        return "count(" . $first_col . ")";
    } else {
        $first_val = $query_model['Values'][0];
        $first_val_name = $this->field_name($first_val);
        $reducer = strtoupper($first_val['reducer']);
        $reducer = $reducer == "LISTAGG" ? "MAX" : $reducer; // listagg 'aggregation' works at the SELECT level to get distinct entries
        return $reducer . "(" . $first_val_name . ")";
    }
}


////////////////
// PIVOT COLUMNS
////////////////

private function trimstr($str, $counter) {
    // Truncate a string to so it can be used as an Oracle column identifier.
    // Maxlen is set at 29. Max length for Oracle columns is 30 chars, but Oracle adds a trailing underscore.
    
    // Truncated strings will add an underscore and a counter value (which increments across all columns processed).
    // Special characters and spaces are stripped from every string.
    
    // There are also a number of special cases:
    // If the string is empty, return NIL (would be NULL, but that is a reserved word.)
    // If the string is an oracle reserved word, treat it as if we were truncating.
    // If the string begins with an underscore or numeral, replace that character with 'a'. Column names must begin with an alpha character.
    
    $maxlen = 29;
    $truncsym = '_';
    $maxlen_with_trunc = $maxlen - strlen($truncsym) - strlen($counter + 1);
    $disallowed_chars = explode(' ', "/ ( ) ! @ # $ % ^ & * + = < > . , - : '");
    $oracle_reserved_words = ['ACCESS', 'ELSE', 'MODIFY', 'START', 'ADD', 'EXCLUSIVE', 'NOAUDIT', 'SELECT', 'ALL', 'EXISTS', 'NOCOMPRESS', 'SESSION', 'ALTER', 'FILE', 'NOT', 'SET', 'AND', 'FLOAT', 'NOTFOUND', 'SHARE', 'ANY', 'FOR', 'NOWAIT', 'SIZE', 'ARRAYLEN', 'FROM', 'NULL', 'SMALLINT', 'AS', 'GRANT', 'NUMBER',	'SQLBUF', 'ASC', 'GROUP', 'OF',	'SUCCESSFUL', 'AUDIT', 'HAVING', 'OFFLINE',	'SYNONYM', 'BETWEEN', 'IDENTIFIED', 'ON', 'SYSDATE', 'BY', 'IMMEDIATE', 'ONLINE', 'TABLE', 'CHAR', 'IN', 'OPTION',	'THEN', 'CHECK', 'INCREMENT', 'OR',	'TO', 'CLUSTER', 'INDEX', 'ORDER',	'TRIGGER', 'COLUMN', 'INITIAL', 'PCTFREE',	'UID', 'COMMENT', 'INSERT', 'PRIOR',	'UNION', 'COMPRESS', 'INTEGER', 'PRIVILEGES',	'UNIQUE', 'CONNECT', 'INTERSECT', 'PUBLIC',	'UPDATE', 'CREATE', 'INTO', 'RAW',	'USER', 'CURRENT', 'IS', 'RENAME',	'VALIDATE', 'DATE', 'LEVEL', 'RESOURCE', 'VALUES', 'DECIMAL', 'LIKE', 'REVOKE',	'VARCHAR', 'DEFAULT', 'LOCK', 'ROW', 'VARCHAR2', 'DELETE', 'LONG', 'ROWID',	'VIEW', 'DESC', 'MAXEXTENTS', 'ROWLABEL',	'WHENEVER', 'DISTINCT', 'MINUS', 'ROWNUM',	'WHERE', 'DROP', 'MODE', 'ROWS',	'WITH'];
    
    $str = str_replace(['__', ' '], '_', $str);
    $str = str_replace($disallowed_chars, '', $str);
    
    if ($str != '') {
        $first_char = mb_substr($str, 0, 1);
        if ($first_char == '_' || preg_match('/[0-9]/', $first_char) == 1) {
            $str = substr_replace($str, 'a', 0, 1);
        }
    }
    
    $return_string = $str;
    $return_counter = $counter;
    
    if (in_array(strtoupper($str), $oracle_reserved_words) || in_array(strtoupper($str), $this->distinct_columns_seen)) {
        $return_string = $str . $truncsym . $counter;
        $return_counter = $counter + 1;
    }
    if (strlen($str) > $maxlen) {
        $return_string = substr($str, 0, $maxlen_with_trunc) . $truncsym . $counter;
        $return_counter = $counter + 1;
    }
    
    $this->distinct_columns_seen[] = strtoupper($return_string);
    return [$return_string, $return_counter];
}

private function get_distinct_entries($table, $col_name) {
    // Return the distinct entries in a given qualified column.
    // Sanitizes column entries. See $this->trimstr()
    
    $upper_table = 'CE_CASE_MGMT.' . strtoupper($table);
    $query = $this->db->query("SELECT DISTINCT UPPER($col_name) as $col_name FROM $upper_table");
    $unique_trim_counter = 0;
    $distinct_col_entries = null;
    foreach ($query->result_array() as $row) {
        $trim_result = $this->trimstr($row[$col_name], $unique_trim_counter);
        $distinct_entry_alias = $trim_result[0];
        $unique_trim_counter = max([$unique_trim_counter, $trim_result[1]]);
        
        $append_start_char = !$distinct_col_entries ? '' : ', ';
        $alias_clause = $row[$col_name] == '' ? '' : " AS $distinct_entry_alias"; // Empty strings will be renamed 'NULL' at the display layer.
        
        $distinct_col_entries .= $append_start_char . "q'[$row[$col_name]]'" . $alias_clause;
    }
    return $distinct_col_entries;
}

private function make_columns($table, $query_model) {
    // if there are entries in the column table, take the first and set its unique values as 'as'.
    // TODO if there are no entries in the column table, do ???
    $first_val = $query_model['Columns'][0];
    $col = $this->field_name($first_val);
    $distinct_col_entries = $this->get_distinct_entries($table, $col);
    return "FOR $col in ($distinct_col_entries)";
}


//////////////////
// MODEL VALIDATOR
//////////////////

// TODO: Should this be in Datastore instead?
private function model_is_valid($query_model) {
    return (
    count($query_model['Columns']) > 0
    && count($query_model['Rows']) > 0
    && count($query_model['Values']) > 0);
}


///////////////////////
// PUT IT ALL TOGETHER!
///////////////////////

public function make_pivot_query($incoming) {
    // validate model,
    // construct query
    $table = $incoming['table'];
    $query_model = $incoming['model'];
    
    if (!$this->model_is_valid($query_model)) {
        return false;
    }
    
    $selections = $this->make_selections($table, $query_model);
    $filters = $this->make_filters($query_model);
    $aggregator = $this->make_aggregator($query_model);
    $columns = $this->make_columns($table, $query_model);
    
    $sql_query = "
    SELECT * FROM (
    $selections
    $filters
    )
    pivot
    (
    $aggregator
    $columns
    )";
    
    return $sql_query;
}
}
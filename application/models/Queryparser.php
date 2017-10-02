<?php

class Queryparser extends CI_Model {
    private $distinct_columns_seen = [];
    public $name_map = [];

    private $names_human_to_machine = [];
    private $names_machine_to_human = [];
    
    public function __construct() {
        parent::__construct();
        $this->load->database();
    }
    
    
    ////////////////////
    // UTILITY FUNCTIONS
    ////////////////////
    
    private function table_location($table_info) {
        return $table_info['owner'] . '.' . $table_info['table'];
    }

    private function qualified_field_name($table_info, $field) {
        $location = $this->table_location($table_info);
        return  $location . '.' . strtoupper($field['name']);
    }
    
    private function field_name($field) {
        return strtoupper($field['name']);
    }

    private function make_mangled_identifier() {
        $length = 4;
        $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        $char_len = strlen($chars) - 1;
        $ret_string = '';
        foreach(range(0,$length) as $l) {
            $ret_string .= $chars[mt_rand(0,$char_len)];
        }
        return $ret_string;
    }

    private function register_alias($true_name) {
        if (isset($this->names_human_to_machine[$true_name])) {
            return $this->names_human_to_machine[$true_name];
        } else {
            $alias = $this->make_mangled_identifier();
            $this->names_human_to_machine[$true_name] = $alias;
            $this->names_machine_to_human[$alias] = $true_name;
            return $alias;
        }
    }

    public function get_name_map() {
        return $this->names_machine_to_human;
    }
    
    
    ///////////////
    // WHERE CLAUSE
    ///////////////
    
    private function valid_filters($filters) {
        $valid_filters = [];
        foreach($filters as $filter) {
            $val = $filter['filterVal'];
            if (!empty($val)) {
                $valid_filters[] = $filter;
            }
        }
        return $valid_filters;
    }
    
    private function make_single_filter($filter_obj) {
        // Stringify the JSON representation of filters.
        $existence = $filter_obj['filterExistence'] ? '' : 'NOT ';
        $field = $filter_obj['name'];
        $available_operations = ['less than' => '<', 'greater than' => '>', 'equal to' => '=', 'like' => 'LIKE', 'IN' => 'IN'];
        $operation = $available_operations[$filter_obj['filterOp']];
        if ($operation === 'IN') {
            //$value = '(' . implode(', ', $filter_obj['filterVal']) . ')';
            $value = '( ';
            foreach($filter_obj['filterVal'] as $selected) {
                $additional_char = $value === '( ' ? '' : ', ';
                $quoted = $selected === 'null' ? "q'['']'" : "q'[$selected]'";
                $value .= $additional_char . $quoted;
            }
            $value .= ')';

        } else {
            $value = $filter_obj['filterVal'];
        }
        if ($operation == 'LIKE') {
            return "$existence (regexp_like($field, '$value', 'i'))";
        } else {
            return "$existence($field $operation $value)";
        }
    }
    
    private function make_filters($query_model) {
        // Reduce through the filters array to get a SQL WHERE string.
        $filters = $this->valid_filters( $query_model['Filters'] );
        if (count($filters) > 0) {
            $where_string = 'WHERE ';
            foreach($filters as $filter) {
                $this_filter = $this->make_single_filter($filter);
                $where_string .= $where_string === 'WHERE ' ? $this_filter : ' AND ' . $this_filter;
            }
            return $where_string;
        } else {
            return '';
        }
    }
    
    
    ////////////////
    // SELECT CLAUSE
    ////////////////
    
    private function get_row_names($query_model) {
        $rows = $query_model['Rows'];
        $row_strs = [];
        foreach ($rows as $row) {
            $row_str = $this->field_name($row);
            $row_strs[] = $row_str;
        }
        return join($row_strs, ', ');
    }
    
    private function get_selected_columns($query_model) {
        $rows = $query_model['Rows'];
        $cols = $query_model['Columns'];
        $vals = $query_model['Values'];
        $all_columns = array_merge($rows, $cols, $vals);

        $selected_names = [];
        $selected_columns = [];

        foreach ($all_columns as $col) {
            if ( !in_array($col['name'], $selected_names) ) {
                $selected_names[] = $col['name'];
                $selected_columns[] = $col;
            }
        }
        return $selected_columns;
    }
    
    private function make_simple_selections($table_info, $query_model, $select_distinct=false) {
        // Return selected columns plus selected table.
        // This is the 'basic' selection used in all cases except for LISTAGG.
        
        $qualified_col_names = [];
        $selected_columns = $this->get_selected_columns($query_model);
        foreach ($selected_columns as $col) {
            $qualified_col_names[] = $this->qualified_field_name($table_info, $col);
        }
        
        // putting clause together
        $return_string = $select_distinct ? "SELECT DISTINCT \n" : "SELECT \n";
        $return_string .= join(",\n", $qualified_col_names);
        $return_string .= "\n FROM " . $this->table_location($table_info);
        $return_string .= "\n" . $this->make_filters($query_model);
        return $return_string;
    }
    
    private function make_nested_selections($table_info, $query_model, $agg_column) {
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
        $return_string .= $this->make_simple_selections($table_info, $query_model, true);
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
        // Detects whether the user has chosen a LISTAGG aggregator.
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
    // make_simple_selections() constructs a basic select for most cases.
    // make_nested_selections() constructs select for LISTAGG queries.
    
    list($listagg_detected, $listagg_column) = $this->detect_listagg($query_model);
    if ($listagg_detected) {
        return $this->make_nested_selections($table, $query_model, $listagg_column);
    } else {
        return $this->make_simple_selections($table, $query_model);
    }
}


//////////////////////////
// PIVOT AGGREGATOR CLAUSE
//////////////////////////

private function make_single_aggregator($agg_object, $first_aggregator_in_array) {
    // Construct a single aggregator expression from a JSON aggregator object.
    $field_name = $this->field_name($agg_object);
    $reducer_name = strtoupper($agg_object['reducer']);
    // LISTAGG 'aggregation' works at the SELECT level to get distinct entries. The aggregator is always MAX.
    // LISTAGG will therefore have undesirable behavior when it's not the only aggregator.
    $reducer_name = $reducer_name == 'LISTAGG' ? 'MAX' : $reducer_name; 

    $intended_alias = "$reducer_name($field_name)";
    $mangled_alias = $this->register_alias($intended_alias);
    $prefix = $first_aggregator_in_array ? '' : ', ';
    return $prefix . $reducer_name . '(' . $field_name . ') as ' . $mangled_alias ;
}

private function make_aggregator($query_model) {
    // Reduce through the Values array to make an SQL string of the user's desired aggregate fns.
    // if there are no aggregator values in the client query,
    // take the FIRST entry in columns and return its count.
    if (count($query_model['Values']) === 0) {
        $first_col = $this->field_name($query_model['Columns'][0]);
        return "count(" . $first_col . ")";
    } else {
        $ret = '';
        $first_agg = true;
        foreach ($query_model['Values'] as $aggregator_object) {
            $ret = $ret . $this->make_single_aggregator($aggregator_object, $first_agg);
            if ($first_agg) { $first_agg = false; }
        }
        return $ret;
    }
}


////////////////
// PIVOT COLUMNS
////////////////

private function trimstr($str, $counter) {
    /////////////////////////////////////////
    // THIS FUNCTION IS CURRENTLY DEPRECATED.
    // Removed column aliasing until we determine how to present column names.
    // Leaving this code here in case it's needed later.
    /////////////////////////////////////////

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

function cartesian_product($arrays) {
    // Return the cartesian product of an array of flat arrays.
    $result = array();
    $arrays = array_values($arrays);
    $sizeIn = sizeof($arrays);
    $size = $sizeIn > 0 ? 1 : 0;
    foreach ($arrays as $array)
        $size = $size * sizeof($array);
    for ($i = 0; $i < $size; $i ++)
    {
        $result[$i] = array();
        for ($j = 0; $j < $sizeIn; $j ++)
            array_push($result[$i], current($arrays[$j]));
        for ($j = ($sizeIn -1); $j >= 0; $j --)
        {
            if (next($arrays[$j]))
                break;
            elseif (isset ($arrays[$j]))
                reset($arrays[$j]);
        }
    }
    return $result;
}

private function get_filter_object_of_name($filters, $col_name) {
    // Given a column name, get the matching filter from filter array.
    // NB returns null if matching filter not found.
    foreach ($filters as $filter) {
        if ($filter['name'] == $col_name) {
            return $filter;
        }
    }
}

private function distinct_col_entries($table_info, $filters, $col_name) {
    // Get the distinct entries for a given column in the given table.
    // Searches filter array for a filter matching the given column name and inserts it into the query if found.
    $upper_table = $this->table_location($table_info);
    $filter = $this->get_filter_object_of_name($filters, $col_name);

    // A half-formed filter clause (e.g. filterVal == '') will bail on WHERE rather than cause an error. 
    if ($filter && !$filter['filterVal']) { 
        $filter = null; 
    }

    $filter = $filter ? $this->make_single_filter($filter) : $filter;
    $filter_string = $filter ? "WHERE $filter" : '';

    $query = $this->db->query("SELECT DISTINCT $col_name as $col_name FROM $upper_table $filter_string");
    return $query->result_array();
}

private function format_cartesian_tuple($cart_tuple) {
    // Turn a tuple of column values into a quoted string.
    // Provides a mangled alias for the column values so they will not be truncated/ambiguously defined/etc.
    // When there are multiple columns in a pivot, col values in the alias are delimited by '#$#' escape seq.
    $stringified_tuple = '';
    $mangled_elems = [];
    foreach ($cart_tuple as $elems_as_associative_array) {
        // cartesian_product returns each cart_tuple as a flat array of associative arrays in the format
        // [{col_name => value}], and we want just the values.
        $flat_elems = array_values($elems_as_associative_array);

        foreach($flat_elems as $elem) {
            $append_start_char = $stringified_tuple === '' ? '' : ', ';
            $stringified_tuple .= $append_start_char . "q'[$elem]'";
            $mangled_elem = $this->register_alias($elem);
            $mangled_elems[] = $mangled_elem;
        }
    }
    $mangled_elems_str = implode('#$#', $mangled_elems);
    return "($stringified_tuple) " . $mangled_elems_str;
}

private function juxt_cols($table_info, $filters, $col_names) {
    // Return, as a string, all the combinations of unique column values for the given column names in the given table.

    // get an array of arrays containing all distinct column entries in request
    $col_entries = [];
    foreach($col_names as $col_name) {
        $col_entries[] = $this->distinct_col_entries($table_info, $filters, $col_name);
    }
    // make a cartesian product of the entries
    $cartesian_product_of_entries = $this->cartesian_product($col_entries);
    // format the cartesian product arrays into array of quoted strings
    $cartesian_strings = [];
    foreach ($cartesian_product_of_entries as $cartesian_tuple) {
        $cartesian_strings[] = $this->format_cartesian_tuple($cartesian_tuple);
    }
    // join and return the array of quoted strings
    return join(', ', $cartesian_strings);
}

private function make_columns($table_info, $query_model) {
    // Make column entries for the pivot query. 
    $cols = [];
    foreach($query_model['Columns'] as $col) {
        $cols[] = $this->field_name($col);
    }
    $cols_string = join(', ', $cols);
    $juxtaposed_cols = $this->juxt_cols($table_info, $query_model['Filters'], $cols);
    return "
    FOR
    ( $cols_string )
    IN  
    ( $juxtaposed_cols )
    ";
}


//////////////////
// MODEL VALIDATOR
//////////////////

private function query_shape_selector($query_model) {
    // given a user query, pick the SQL 'template' that will be used.
    
    $rows_requested = count($query_model['Rows']) > 0;
    $cols_requested = count($query_model['Columns']) > 0;
    $vals_requested = count($query_model['Values']) > 0;
    $fils_requested = count($query_model['Filters']) > 0;

    $ret = '';
    if (!$rows_requested && !$cols_requested && $vals_requested) {
        $ret = 'values_only';
    } else if (!$rows_requested && !$cols_requested && !$vals_requested && $fils_requested) {
        $ret = 'values_only';
    } else if (!$cols_requested && $rows_requested) {
        // 'spreadsheet' view only includes row and value columns.
        $ret = 'spreadsheet';
    } else {
        // 'pivot' view is values with row/col intersections.
        $ret = 'pivot';
    }
    log_message('debug', 'Selected query shape: ' . $ret);
    return $ret;
}


///////////////////////
// PUT IT ALL TOGETHER!
///////////////////////

private function make_pivot_view($table_info, $query_model) {
    $from_selections = $this->make_selections($table_info, $query_model);
    $aggregator = $this->make_aggregator($query_model);
    $columns = $this->make_columns($table_info, $query_model);

    if (count($query_model['Values']) === 0) {
        $aggregator = "COUNT(*)";
    }
    
    $sql_query = "
    SELECT * FROM (
    $from_selections
    )
    pivot
    (
    $aggregator
    $columns
    )
    ";

    if (count($query_model['Rows']) > 0) {
        $selected_rows = $this->get_row_names($query_model);
        $sql_query .= "ORDER BY $selected_rows";
    }
    
    return $sql_query;
}

private function make_spreadsheet_view($table_info, $query_model) {
    $selected_rows = $this->get_row_names($query_model);
    if (count($query_model['Values']) === 0) {
        $aggregator = "COUNT(*)";
    } else {
        $aggregator = $this->make_aggregator($query_model);
    }
    $filters = $this->make_filters($query_model);
    $location = $this->table_location($table_info);

    $sql_query = "
    SELECT
    $selected_rows
    , $aggregator
    FROM $location
    $filters
    GROUP BY
    $selected_rows
    ORDER BY $selected_rows
    ";
    
    return $sql_query;
}

private function make_values_view($table_info, $query_model) {
    if (count($query_model['Values']) === 0) {
        $aggregator = "COUNT(*)";
    } else {
        $aggregator = $this->make_aggregator($query_model);
    }

    $sql_query = "
    SELECT $aggregator 
    FROM " . $this->table_location($table_info);

    $filters_in_query = count($query_model['Filters']) > 0;
    if($filters_in_query) {
        $filters = $this->make_filters($query_model);
        $sql_query.= $filters;
    }

    return $sql_query;
}

public function make_pivot_query($incoming) {
    $table_info = $incoming['table'];
    $query_model = $incoming['model'];
    $query_shape = $this->query_shape_selector($query_model);
    
    log_message('debug', 'ROWS: ' . json_encode($query_model['Rows']));
    log_message('debug', 'COLS: ' . json_encode($query_model['Columns']));
    log_message('debug', 'FILS: ' . json_encode($query_model['Filters']));
    log_message('debug', 'VALS: ' . json_encode($query_model['Values']));
    
    if (!$query_shape) {
        // The shape was not valid.
        return false;
    }
    
    $sql_query = "";
    switch ($query_shape) {
        case 'values_only':
            $sql_query = $this->make_values_view($table_info, $query_model);
            break;
        case 'spreadsheet':
            $sql_query = $this->make_spreadsheet_view($table_info, $query_model);
            break;
        case 'pivot':
            $sql_query = $this->make_pivot_view($table_info, $query_model);
            break;
        default:
            break;
}

return $sql_query;
}
}
<?php

class Queryparser extends CI_Model {
    
    public function __construct() {
        parent::__construct();
        $this->load->database();
    }
    
    private function qualified_field_name($table, $field) {
        return 'CE_CASE_MGMT.' . strtoupper($table) . '.' . strtoupper($field['name']);
    }
    
    private function field_name($field) {
        return strtoupper($field['name']);
    }
    
    private function make_selections($table, $query_model) {
        $rows = $query_model['Rows'];
        $cols = $query_model['Columns'];
        $vals = $query_model['Values'];
        $selected_columns = array_merge($rows, $cols, $vals);
        $qualified_col_names = [];
        foreach ($selected_columns as $col) {
            $qualified_col_names[] = $this->qualified_field_name($table, $col);
        }
        return join(",\n", $qualified_col_names);
    }
    
    private function make_filters($query_model) {
        return '';
    }
    
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
            return $reducer . "(" . $first_val_name . ")";
        }
    }
    
    
    private function trimstr($str, $counter) {
        // Truncate a string to so it can be used as an Oracle column identifier.
        // Maxlen is set at 29. Max length for Oracle columns is 30 chars, but
        // Oracle adds a trailing underscore.
        // Truncated strings will add an underscore and a counter value (which increments across all columns processed).
        // Special characters and spaces are stripped from every string.
        // There are also a number of special cases:
        // If the string is empty, return NIL (would be NULL, but that is a reserved word.)
        // If the string is an oracle reserved word, treat it as if we were truncating.
        
        $maxlen = 29;
        $truncsym = '_';
        $maxlen_with_trunc = $maxlen - strlen($truncsym) - strlen($counter);
        
        $str = str_replace(' ', '_', $str);
        $disallowed_chars = explode(' ', "/ ( ) ! @ # $ % ^ & * + = < > . ,");
        $str = str_replace($disallowed_chars, '', $str);
        
        $oracle_reserved_words = ['ACCESS', 'ELSE', 'MODIFY', 'START', 'ADD', 'EXCLUSIVE', 'NOAUDIT', 'SELECT', 'ALL', 'EXISTS', 'NOCOMPRESS', 'SESSION', 'ALTER', 'FILE', 'NOT', 'SET', 'AND', 'FLOAT', 'NOTFOUND', 'SHARE', 'ANY', 'FOR', 'NOWAIT', 'SIZE', 'ARRAYLEN', 'FROM', 'NULL', 'SMALLINT', 'AS', 'GRANT', 'NUMBER',	'SQLBUF', 'ASC', 'GROUP', 'OF',	'SUCCESSFUL', 'AUDIT', 'HAVING', 'OFFLINE',	'SYNONYM', 'BETWEEN', 'IDENTIFIED', 'ON', 'SYSDATE', 'BY', 'IMMEDIATE', 'ONLINE', 'TABLE', 'CHAR', 'IN', 'OPTION',	'THEN', 'CHECK', 'INCREMENT', 'OR',	'TO', 'CLUSTER', 'INDEX', 'ORDER',	'TRIGGER', 'COLUMN', 'INITIAL', 'PCTFREE',	'UID', 'COMMENT', 'INSERT', 'PRIOR',	'UNION', 'COMPRESS', 'INTEGER', 'PRIVILEGES',	'UNIQUE', 'CONNECT', 'INTERSECT', 'PUBLIC',	'UPDATE', 'CREATE', 'INTO', 'RAW',	'USER', 'CURRENT', 'IS', 'RENAME',	'VALIDATE', 'DATE', 'LEVEL', 'RESOURCE', 'VALUES', 'DECIMAL', 'LIKE', 'REVOKE',	'VARCHAR', 'DEFAULT', 'LOCK', 'ROW', 'VARCHAR2', 'DELETE', 'LONG', 'ROWID',	'VIEW', 'DESC', 'MAXEXTENTS', 'ROWLABEL',	'WHENEVER', 'DISTINCT', 'MINUS', 'ROWNUM',	'WHERE', 'DROP', 'MODE', 'ROWS',	'WITH'];
        
        if (in_array(strtoupper($str), $oracle_reserved_words)) {
            return [$str . $truncsym . $counter, $counter + 1];
        }
        if (strlen($str) > $maxlen) {
            return [substr($str, 0, $maxlen_with_trunc) . $truncsym . $counter, $counter + 1];
        }
        return [$str, $counter];
    }
    
    private function get_distinct_entries($table, $col_name) {
        // Return the distinct entries in a given qualified column.
        // Sanitizes column entries. See $this->trimstr()
        
        $upper_table = 'CE_CASE_MGMT.' . strtoupper($table);
        $query = $this->db->query("SELECT DISTINCT $col_name FROM $upper_table");
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
        // if there are no entries in the column table,
        $first_val = $query_model['Columns'][0];
        $col = $this->field_name($first_val);
        $distinct_col_entries = $this->get_distinct_entries($table, $col);
        return "FOR $col in ($distinct_col_entries)";
    }
    
    private function model_is_valid($query_model) {
        return (
        count($query_model['Columns']) > 0
        && count($query_model['Rows']) > 0
        && count($query_model['Values']) > 0);
    }
    
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
        SELECT
        $selections
        FROM CE_CASE_MGMT.SF_CASE
        WHERE TRUNC(CREATEDDATE) >= TRUNC(SYSDATE)-90
        AND ROWNUM <= 50000
        $filters
        ORDER BY CREATEDDATE DESC
        )
        pivot
        (
        $aggregator
        $columns
        )";
        
        return $sql_query;
    }
}
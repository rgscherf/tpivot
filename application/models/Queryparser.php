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
    
    private function make_and_clauses($query_model) {
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
    
    private function get_distinct_entries($table, $col_name) {
        // run a SELECT DISTINCT on qualified column name
        $upper_table = 'CE_CASE_MGMT.' . strtoupper($table);
        $query = $this->db->query("SELECT DISTINCT $col_name FROM $upper_table");
        $distincts = null;
        foreach ($query->result_array() as $row) {
            if (!$distincts) {
                $distincts .= "q'[$row[$col_name]]'";
            } else {
                $distincts .= ",q'[$row[$col_name]]'";
            }
        }
        return $distincts;
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
        $and_clauses = $this->make_and_clauses($query_model);
        $aggregator = $this->make_aggregator($query_model);
        $columns = $this->make_columns($table, $query_model);
        
        $sqlQuery = "
        SELECT * FROM (
        SELECT
        $selections
        FROM CE_CASE_MGMT.SF_CASE
        WHERE TRUNC(CREATEDDATE) >= TRUNC(SYSDATE)-90
        AND ROWNUM <= 50000
        $and_clauses
        ORDER BY CREATEDDATE DESC
        )
        pivot
        (
        $aggregator
        $columns
        )";
        
        return $sqlQuery;
    }
    // $test_data = json_decode('{"noField":[{"name":"Age"}],
    //     "Filters":[],
    //     "Rows":[{"name":"Province"}],
    //     "Columns":[{"name":"Party"}],
    // "Values":[{"name":"Gender","reducer":"count","displayAs":"raw"},{"name":"Name","reducer":"count","displayAs":"raw"}]}', true);
    
    // var_dump(make_pivot_query($test_data));
}
<?php

class Datasource extends CI_Model {
    private $sources;

    public function __construct() {
        parent::__construct();
        $this->load->database();
        $this->load->model('Queryparser');
        $table_source_path = './application/models/sources.json';
        $this->sources = json_decode(file_get_contents($table_source_path), true);
    }
    
    public function get_sources() {
        // Returns metadata about pivot table sources.
        return $this->sources;
    }
    
    private function make_header_row($incoming, $result_array) {
        // Given client query and array of results, construct the query's header row.
        // First, add the row field(s) specified by the user.
        // Next, add the null column value (if it exists).
        // Finally, sort remaining column entries in ascending order and add them to the header array.
        // This array is the first entry in the JSON result array.
        // All result rows present data in the order of this array.
        $query_cols = [];
        foreach ($incoming['model']['Rows'] as $row_obj) {
            $query_cols[] = $row_obj['name'];
        }
        if (array_key_exists("''", $result_array)) {
            $query_cols[] = '';
        }
        ksort($result_array[0]);
        foreach($result_array[0] as $key=>$val) {
            if (!in_array($key, $query_cols)) {
                $query_cols[] = $key;
            }
        }
        return $query_cols;
    }
    
    private function flatten_result_array($header, $result_array) {
        // Given the table header (an array containing column titles in correct order)
        // and an array of sql results, put all results into a flat array matching
        // the order of the header.
        
        $flat_results = [$header];
        foreach($result_array as $row) {
            $flat_row = [];
            foreach($header as $title) {
                $flat_row[] = $row[$title];
            }
            $flat_results[] = $flat_row;
        }
        return $flat_results;
    }

    private function validate_model_field($field_name, $field_object) {
        // Validate a single field object on the model. Here are the schema for query model objects:
        //{name: $fieldname} <- for Rows, Columns
        //{name: $fieldname, filterOp: $filterOpName, filterVal: $filterValName, filterExistence: $(true|false)} <- for Filters
        //{name: $fieldname, reducer: $reducerFnName <- for Values
        switch ($field_name) {
            case 'Rows':
                return is_string($field_object['name']);
                break;
            case 'Columns':
                return is_string($field_object['name']);
                break;
            case 'Values':
                return is_string($field_object['name']) && 
                       is_string($field_object['reducer']);
                break;
            case 'Filters':
                return is_string($field_object['name']) && 
                       is_string($field_object['filterOp']) &&
                       is_string($field_object['filterVal']) &&
                       is_bool($field_object['filterExistence']);
                break;
        }
    }

    private function validate_query_model($incoming) {
        // Validate the query model, returning true if valid.
        $is_valid = true;

        $is_valid = $is_valid && is_string($incoming['table']);

        $model = $incoming['model'];
        if ($model === null) { return false; }

        $expected_fields = ['Rows', 'Columns', 'Values', 'Filters'];
        $more_than_zero_fields_requested = true;
        $total_entries_in_query = 0;
        foreach ($expected_fields as $expected_field) {

            $field = $model[$expected_field];
            if ($field === null) { return false; }

            $is_valid = $is_valid && is_array($field);
            if (count($field) > 0) {
                $total_entries_in_query += count($field);
                foreach ($field as $field_entry) {
                    $is_valid = $is_valid && $this->validate_model_field($expected_field, $field_entry);
                }
            }
        }
        $is_valid = $is_valid && ($total_entries_in_query > 0);
        return $is_valid;
    }
    
    public function process_query($incoming) {
        // Take a client model object, parse it into an SQL query,
        // then execute that SQL query and return the results as an array of flat arrays
        // representing result rows.
        // An SQL error will return an object with the `error` flag set to true, and fields for the error code
        // and the SQL string that was executed.
        
        set_time_limit(300);
        
        if (!$this->validate_query_model($incoming)) {
            log_message('debug', "Got invalid model:");
            log_message('debug', json_encode($incoming));
            return false;
        }

        $sql_string = $this->Queryparser->make_pivot_query($incoming);
        log_message('debug', $sql_string);
        
        if ($sql_string == false) {
            return false;
        }
        
        $query = $this->db->query($sql_string);
        if (!$query) {
            $err = $this->db->error();
            $ret = ['error' => true, 'errmsg' => $err['message'], 'errsql' => $err['sqltext']];
            return $ret;
        } else {
            $query_result = $query->result_array();
            $header = $this->make_header_row($incoming, $query_result);
            $flat_results = $this->flatten_result_array($header, $query_result);
            return ['error' => false, 'rows' => $flat_results];
        }
    }
}
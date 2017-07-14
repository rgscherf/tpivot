<?php

class Datasource extends CI_Model {
    // $data is a map from data-source-title => data-path, column-titles, and csv-or-sql-flag.
    // initially used to populate the list of possible data sources,
    // once the user makes a selection of source/fields we come back to the map
    // to pull rows for the pivot table.
    
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
    
    
    public function process_query($incoming) {
        // Take a client model object, parse it into an SQL query,
        // then execute that SQL query and return the results as an array of flat arrays
        // representing result rows.
        // An SQL error will return an object with the `error` flag set to true, and fields for the error code
        // and the SQL string that was executed.
        
        set_time_limit(300);
        
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
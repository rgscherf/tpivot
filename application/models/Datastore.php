<?php

require_once(dirname(__FILE__).'/LoadCSV.php');

class Datastore extends CI_Model {
    // $data is a map from data-source-title => data-path, column-titles, and csv-or-sql-flag.
    // initially used to populate the list of possible data sources,
    // once the user makes a selection of source/fields we come back to the map
    // to pull rows for the pivot table.
    
    private function get_csv_headers($path_to_csv) {
        // get column names from a CSV file
        // assumes the first line contains col names,
        // and is comma delimited.
        $line = [];
        if ($f = fopen($path_to_csv, 'r')) {
            $line_string = fgets($f);
            $line = explode(',', $line_string);
            $line = array_map(function($elem){
                // if we don't do this, we'll capture
                // the \n at the end of header line
                return trim($elem);
            }, $line);
            fclose($f);
        }
        return $line;
    }
    
    public function __construct() {
        parent::__construct();
    }
    
    public function get_sources() {
        // given entries in $CSV_sources (and others?), makes
        // the $data map that will be used to populate pivot table.
        $data = [];
        
        // this is where we define data sources for the pivot table.
        $CSV_sources = ['Canadian MPs' => APPPATH.'models/data/mps.csv', 'NYC Social Media' => APPPATH.'models/data/NYC_Social_Media_Usage.csv'];
        
        foreach ($CSV_sources as $key => $val) {
            $data[$key] = ['path' => $val,
            'headers' => $this->get_csv_headers($val),
            'type' => 'csv'];
        }
        
        // ...and then link SQL and other datasets in whichever way is practical
        
        return $data;
    }
    
    private function get_field_names($obj_array) {
        return array_map(function($elem) {
            return $elem['name'];
        }, $obj_array);
    }
    
    private function remove_unused_columns($noFields, $table_rows) {
        // shouldn't we filter out unwanted columns when we retrieve the table??
        foreach($table_rows as $row) {
            $hiddenFields = $noFields;
            foreach($hiddenFields as $f) {
                unset($row[$f]);
            }
        }
    }
    private function shape_payload($table_rows, $config) {
        $pivot_rows = $this->get_field_names($config['Rows']);
        $pivot_cols = $this->get_field_names($config['Columns']);
        $pivot_hidden = $this->get_field_names($config['noField']);
        $payload_config = ['rows' => $pivot_rows, 'cols' => $pivot_cols, 'hiddenAttributes' => $pivot_hidden];
        
        return ['data' => $table_rows, 'config' => $payload_config, 'reducers' => $config['Values']];
    }
    
    private function get_filter_preds($filters_input) {
        // make the array of filter predicates that will be applied to
        // every row of the data source.
        // the mapping from string input value to lambda is stored in
        // $predicate_operations, but could be moved to a separate namespace.
        
        $predicate_operations = ['lt' => function($a, $b) {
            return $a < $b;
        }, 'eq' => function($a, $b) {
            return $a == $b;
        }, 'gt' => function($a, $b) {
            return $a > $b;
        }, 'has' => function($a, $b) {
            return strpos(strtolower($a), strtolower($b)) !== false;
        }];
        
        $filters_as_fns = [];
        foreach ($filters_input as $fi) {
            // Given the filter object
            // {name: 'Age', filterOp: 'lt', filterVal: 60, filterExistence: true}
            $row_field = $fi['name']; // Age
            $comparator = $fi['filterVal']; // 60
            $return_positive_case = $fi['filterExistence']; // true
            $comparison = $predicate_operations[$fi['filterOp']]; // (a) -> a < 60
            
            $filters_as_fns[] = function($table_row) use ($row_field, $comparator, $comparison, $return_positive_case) {
                $incoming_value = $table_row[$row_field];
                $positive_return = $comparison($incoming_value, $comparator);
                if ($return_positive_case) {
                    return $positive_return;
                }
                return !$positive_return;
            };
        }
        return $filters_as_fns;
    }
    
    public function retrieve_data($incoming) {
        $selected_source_name = $incoming['config']['dataset'];
        $selected_table_info = $incoming['datasources'][$selected_source_name];
        
        $retriever;
        if ($selected_table_info['type'] === 'csv') {
            $retriever = new LoadCSV();
        }
        // ...etc for other data sources.
        
        // we're doing data filter/clean here but it should probably be in another class?
        $filters = $this->get_filter_preds($incoming['config']['fields']['Filters']);
        $rows = $retriever->get_rows_from_path($selected_table_info['path'], $filters);
        $table_data = $this->shape_payload($rows, $incoming['config']['fields']);
        
        return $table_data;
    }
}
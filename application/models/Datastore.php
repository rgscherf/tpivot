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
    
    public function retrieve_data($incoming) {
        $selected_source_name = $incoming['selectedDataset'];
        $selected_table_info = $incoming['dataSets'][$selected_source_name];
        
        $retriever;
        if ($selected_table_info['type'] === 'csv') {
            $retriever = new LoadCSV();
        }
        // ...etc for other data sources.
        
        // we're doing data filter/clean here but it should probably be in another class?
        $rows = $retriever->get_rows_from_path($selected_table_info['path']);
        
        return $rows;
    }
}
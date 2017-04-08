<?php
ini_set("memory_limit","512M");

class LoadCSV {
    // Parse CSV input for pivot table. CSVs must conform to the following rules:
    // 1. First row must contain column headers. 
    // 2. File must be comma delimited. 

    private $keymap;
    
    private function juxt($fns, $argument) {
        // call the same argument against an array of functions. 
        // returns array of fn results.
        $arg = $argument;
        $preds = [];
        foreach($fns as $fn) {
            $preds[] = $fn($arg);
        }
        return $preds;
    }

    private function evaluate_row($assoc_row, $filterfns) {
        // given a row, run it against the array of filters to determine
        // whether it should be included in the return data set.
        $row_against_predicates = $this->juxt($filterfns, $assoc_row);
        return !in_array(false, $row_against_predicates, true);
    }

    public function get_rows_from_path($path, $filterfns) {
        ini_set('auto_detect_line_endings', true);

        $file = file($path);
        $csv = array_map('str_getcsv', $file);
        $this->keymap = $csv[0];

        if (!$this->keymap) {
            return "CSV did not match naming requirements. See documentation in loadCSV.php";
        }

        $clean_csv = [];

        foreach(array_slice($csv, 1) as $row) {
            $assoc_row = array_combine($this->keymap, $row);
            $row_should_be_included = $this->evaluate_row($assoc_row, $filterfns);
            if($row_should_be_included) {
                $clean_csv[] = $assoc_row;
            }
        }
        return $clean_csv;
    }

}
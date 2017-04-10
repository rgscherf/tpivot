<?php
ini_set("memory_limit","512M");

class LoadCSV {
    // Parse CSV input for pivot table. CSVs must conform to the following rules:
    // 1. First row must contain column headers.
    // 2. File must be comma delimited.
    
    private $keymap;
    
    public function get_rows_from_path($path) {
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
            $clean_csv[] = $assoc_row;
        }
        
        return $clean_csv;
    }
    
}
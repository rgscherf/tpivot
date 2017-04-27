<?php

class Datastore extends CI_Model {
    // $data is a map from data-source-title => data-path, column-titles, and csv-or-sql-flag.
    // initially used to populate the list of possible data sources,
    // once the user makes a selection of source/fields we come back to the map
    // to pull rows for the pivot table.
    
    private $sources = ['Canadian MPs' =>
    ['path' => APPPATH.'models/data/mps.csv',
    'type' => 'csv',
    'headers' => ['Name',
    'Party',
    'Province',
    'Age',
    'Gender']],
    'SF_CASE' => ['path' => "SELECT * FROM CE_CASE_MGMT.SF_CASE",
    'type' => 'oracle',
    'headers' => ['ID',
    'CASENUMBER',
    'CONTACTID',
    'ACCOUNTID',
    'PARENTID',
    'TYPE',
    'STATUS',
    'REASON',
    'ORIGIN',
    'DESCRIPTION',
    'CLOSEDDATE',
    'OWNERID',
    'CREATEDDATE',
    'SYSTEMMODSTAMP',
    'DUE_DATE__C',
    'RESULT__C',
    'RELATED_ORDER_TICKET__C',
    'ISFIELDED__C',
    'DATE_TIME_LAST_MODIFIED__C',
    'ORDER_TICKET_ID__C',
    'LANGUAGE_PREFERENCE__C',
    'NOTIFICATION__C',
    'NOTIFICATION_ID__C',
    'SPOKE_TO__C',
    'DATE_TIMECOMPLETED__C',
    'ISESCALATED__C',
    'PRE_APPOINTMENT_REVIEW__C',
    'OUTCOME_REVIEW__C',
    'CLOSE_REVIEW__C',
    'PREAPPOINTMENT_REVIEW_DUE_DATE',
    'OUTCOME_REVIEW_DUE_DATE__C',
    'CLOSE_REVIEW_DUE_DATE__C',
    'BILL_CYCLE_DAY__C',
    'BILLING_ACCOUNT_NUMBER',
    'SOURCEREFID',
    'CREATEDBYID',
    'FIRSTAGENTASSIGNED',
    'PENDING_CLOSE_DATE',
    'SOURCE_TYPE',
    'SOURCE_STATUS',
    'CLOSING_COMMENTS',
    'CAN_BE_REACHED__C',
    'CAN_BE_REACHED_PHON__C',
    'BRAND',
    'TREATMENT_TYPE',
    'WORKFLOW_TEMPLATE',
    'AGENT_FUNCTION',
    'PENDING_CLOSE_DURATION',
    'CLOSE_CASE_REMINDER_DAYS',
    'LINE_OF_BUSINESS',
    'CUSTOMER_TIME_ZONE',
    'LASTMODIFIEDBYID',
    'L2R_SURVEY_NOTIFICATION__C']],
    'SF_WORKFLOW' =>[
    'type' => 'oracle',
    'path' => "SELECT * FROM CE_CASE_MGMT.SF_WORKFLOW_TEMPLATE",
    'headers' => [
    'ID',
    'OWNERID',
    'ISDELETED',
    'WORKFLOW_TEMPLATE_NAME',
    'CREATEDDATE',
    'CREATEDBYID',
    'LASTMODIFIEDDATE',
    'LASTMODIFIEDBYID',
    'SYSTEMMODSTAMP',
    'LAST_VIEWED_DATE',
    'LAST_REFERENCED_DATE',
    'CLOSE_REMINDER_DAYS',
    'LOB',
    'EXTERNALID',
    'ACCOUNT_REQUIRED',
    'AGE',
    'AGENT_FUNCTION',
    'BRAND',
    'CASE_DESCRIPTION_ENGLISH',
    'CASE_DESCRIPTION_FRENCH',
    'DELIVER_BY',
    'FIELDED',
    'HELP_URL_ENGLISH',
    'HELP_URL_FRENCH',
    'INTRO_NOTIFICATION_TEMPLATE',
    'IS_ACTIVE',
    'IS_VISIBLE',
    'PENDING_CLOSE_DURATION',
    'RELATED_ORDER_TICKET',
    'REQUESTED_OUTCOME',
    'SOURCE_ACTION_CD',
    'SOURCE_STATUS',
    'SOURCE_TYPE',
    'TREATMENTS_COMMAS',
    'TREATMENTS',
    ]]];
    
    public function __construct() {
        parent::__construct();
        $this->load->database();
        $this->load->model('Queryparser');
    }
    
    public function get_sources() {
        // given entries in $CSV_sources (and others?), makes
        // the $data map that will be used to populate pivot table.
        return $this->sources;
    }
    
    private function get_csv_rows_from_path($path) {
        ini_set('auto_detect_line_endings', true);
        
        $file = file($path);
        $csv = array_map('str_getcsv', $file);
        $keymap = $csv[0];
        
        if (!$keymap) {
            return "CSV did not match naming requirements. See documentation in loadCSV.php";
        }
        
        $clean_csv = [];
        foreach(array_slice($csv, 1) as $row) {
            $assoc_row = array_combine($keymap, $row);
            $clean_csv[] = $assoc_row;
        }
        
        return $clean_csv;
    }
    
    private function get_oracle_rows_from_path($path) {
        $ret_query = [];
        $query = $this->db->query($path);
        $count = 0;
        while ($row = $query->unbuffered_row('array')) {
            $count += 1;
            log_message('debug', $count);
            $ret_query[] = $row;
        }
        
        return $ret_query;
    }
    
    public function retrieve_data($incoming) {
        set_time_limit(300);
        $selected_source_name = $incoming['selectedDataset'];
        $selected_table_info = $incoming['dataSets'][$selected_source_name];
        $path = $selected_table_info['path'];
        $selected_table_type = $selected_table_info['type'];
        
        $rows;
        if ($selected_table_type === 'csv') {
            $rows = $this->get_csv_rows_from_path($path);
        } else {
            $rows = $this->get_oracle_rows_from_path($path);
        }
        
        return $rows;
    }
    
    private function unwrap_keys($row) {
        // Remove single-quotes from row array keys.
        // Row keys come from a SELECT DISTINCT call where return values are wrapped in q'[ ]'
        // This causes them to come back like "'this'" (note single-quotes inside the string delimiter).
        // Wrapped keys will cause havoc on the JS pivot table layer.
        $return_row = [];
        foreach ($row as $key=>$value) {
            $unwrapped_key = str_replace("'", "", $key);
            $return_row[$unwrapped_key] = $value;
        }
        return $return_row;
    }
    
    public function process_query($incoming) {
        $result = $this->Queryparser->make_pivot_query($incoming);
        if ($result == false) {
            return $result;
        }
        
        $query = $this->db->query($result);
        
        // SQL QUERY SENT TO ORACLE
        log_message('debug', $result);
        
        // REMOVE SINGLE QUOTES FROM ROW ARRAY KEYS
        $return_result = array_map(array($this, 'unwrap_keys'), $query->result_array());
        
        return $return_result;
    }
    
}
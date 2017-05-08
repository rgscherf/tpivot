<?php

class Datastore extends CI_Model {
    // $data is a map from data-source-title => data-path, column-titles, and csv-or-sql-flag.
    // initially used to populate the list of possible data sources,
    // once the user makes a selection of source/fields we come back to the map
    // to pull rows for the pivot table.
    
    private $sources = [
    'OUTCOME_CASE_PVT' => [
    'path' => "SELECT * FROM CE_CASE_MGMT.OUTCOME_CASE_PVT",
    'type' => 'oracle',
    'headers' => [
    'ID',
    'CASENUMBER',
    'CONTACTID',
    'ACCOUNTID',
    'PARENTID',
    'REQUEST',
    'STATUS',
    'REASON',
    'ORIGIN',
    'DESCRIPTION',
    'WHEN_CLOSED',
    'WHEN_CLOSED_YEAR',
    'WHEN_CLOSED_MONTH',
    'WHEN_CLOSED_DAY',
    'WHEN_CLOSED_TIME_MST',
    'WHEN_CLOSED_HOUR_MST',
    'WHEN_CLOSED_MINUTE_MST',
    'OWNERID',
    'OWNER_NTID',
    'OWNER_ROLE',
    'OWNER_AVAYA_ID',
    'CREATEDBYID',
    'CREATEDBY_NTID',
    'CREATEDBY_ROLE',
    'CREATEDBY_AVAYA_ID',
    'FIRST_AGENT_ASSIGNED',
    'FIRST_AGENT_NTID',
    'FIRST_AGENT_ROLE',
    'FIRST_AGENT_AVAYA_ID',
    'WHEN_CREATED',
    'WHEN_CREATED_YEAR',
    'WHEN_CREATED_MONTH',
    'WHEN_CREATED_DAY',
    'WHEN_CREATED_TIME_MST',
    'WHEN_CREATED_HOUR_MST',
    'WHEN_CREATED_MINUTE_MST',
    'WHEN_MODIFIED',
    'WHEN_MODIFIED_YEAR',
    'WHEN_MODIFIED_MONTH',
    'WHEN_MODIFIED_DAY',
    'WHEN_MODIFIED_TIME_MST',
    'WHEN_MODIFIED_HOUR_MST',
    'WHEN_MODIFIED_MINUTE_MST',
    'PENDING_CLOSE_DATE',
    'PENDING_CLOSE_DATE_YEAR',
    'PENDING_CLOSE_DATE_MONTH',
    'PENDING_CLOSE_DATE_DAY',
    'PENDING_CLOSE_DATE_TIME_MST',
    'PENDING_CLOSE_DATE_HOUR_MST',
    'PENDING_CLOSE_DATE_MINUTE_MST',
    'DUE_DATE',
    'DUE_DATE_YEAR',
    'DUE_DATE_MONTH',
    'DUE_DATE_DAY',
    'RESULT',
    'RELATED_ORDER_TICKET_TYPE',
    'RELATED_ORDER_TICKET_ID',
    'LANGUAGE_PREFERENCE',
    'NOTIFICATION_METHOD',
    'NOTIFICATION_ID',
    'SPOKE_TO',
    'EVENING_PHONE',
    'CAN_BE_REACHED_PHONE',
    'ISFIELDED',
    'ISESCALATED',
    'PRE_APPT_REVIEW_REQUESTED',
    'OUTCOME_REVIEW_REQUESTED',
    'CLOSE_REVIEW_REQUESTED',
    'PRE_APPT_REVIEW_DUE_DATE',
    'OUTCOME_REVIEW_DUE_DATE',
    'OUTCOME_REVIEW_DUE_DATE_YEAR',
    'OUTCOME_REVIEW_DUE_DATE_MONTH',
    'OUTCOME_REVIEW_DUE_DATE_DAY',
    'CLOSE_REVIEW_DUE_DATE',
    'CLOSE_REVIEW_DUE_DATE_YEAR',
    'CLOSE_REVIEW_DUE_DATE_MONTH',
    'CLOSE_REVIEW_DUE_DATE_DAY',
    'BILL_CYCLE_DAY',
    'BILLING_ACCOUNT_NUMBER',
    'SOURCEREFID',
    'SOURCE_TYPE',
    'SOURCE_STATUS',
    'CLOSING_COMMENTS',
    'BRAND',
    'TREATMENT_TYPE',
    'WORKFLOW_TEMPLATE',
    'AGENT_FUNCTION',
    'PENDING_CLOSE_DURATION',
    'CLOSE_CASE_REMINDER_DAYS',
    'LINE_OF_BUSINESS',
    'CUSTOMER_TIME_ZONE',
    'L2R_SURVEY_NOTIFICATION',
    'COUNT'
    ]],
    'OUTCOME_TASK_PVT' => [
    'path' => "SELECT * FROM CE_CASE_MGMT.OUTCOME_TASK_PVT",
    'type' => 'oracle',
    'headers' => [
    'COMPLETION_BY_ID',
    'COMPLETION_DATE',
    'PUSHED_ITEM_ID',
    'PUSHED_ITEM_SUBJECT',
    'CANCELLED_REASON',
    'ID',
    'RECORDTYPEID',
    'RELATED_TO',
    'SUBJECT',
    'STATUS',
    'PRIORITY',
    'OWNERID',
    'OWNER_NTID',
    'OWNER_ROLE',
    'OWNER_AVAYA_ID',
    'DESCRIPTION',
    'TYPE',
    'WHEN_CREATED',
    'WHEN_CREATED_YEAR',
    'WHEN_CREATED_MONTH',
    'WHEN_CREATED_DAY',
    'WHEN_CREATED_TIME_MST',
    'WHEN_CREATED_HOUR_MST',
    'WHEN_CREATED_MINUTE_MST',
    'WHEN_MODIFIED',
    'WHEN_MODIFIED_YEAR',
    'WHEN_MODIFIED_MONTH',
    'WHEN_MODIFIED_DAY',
    'WHEN_MODIFIED_TIME_MST',
    'WHEN_MODIFIED_HOUR_MST',
    'WHEN_MODIFIED_MINUTE_MST',
    'LAST_MODIFIED_DATE',
    'LAST_MODIFIED_DATE_YEAR',
    'LAST_MODIFIED_DATE_MONTH',
    'LAST_MODIFIED_DATE_DAY',
    'LAST_MODIFIED_DATE_TIME_MST',
    'LAST_MODIFIED_DATE_HOUR_MST',
    'LAST_MODIFIED_DATE_MINUTE_MST',
    'LASTMODIFIEDBYID',
    'LAST_MODIFIED_NTID',
    'LAST_MODIFIED_ROLE',
    'LAST_MODIFIED_AVAYA_ID',
    'ISREMINDERSET',
    'REMINDERDATETIME',
    'REMINDERDATETIME_YEAR',
    'REMINDERDATETIME_MONTH',
    'REMINDERDATETIME_DAY',
    'REMINDERDATETIME_TIME_MST',
    'REMINDERDATETIME_HOUR_MST',
    'REMINDERDATETIME_MINUTE_MST',
    'RECURRENCETYPE',
    'RECURRENCEINTERVAL',
    'DUE_DATE',
    'DUE_DATE_YEAR',
    'DUE_DATE_MONTH',
    'DUE_DATE_DAY',
    'DUE_DATE_TIME_MST',
    'DUE_DATE_HOUR_MST',
    'DUE_DATE_MINUTE_MST',
    'ISESCALATED',
    'OBJECT_NAME',
    'OBJECT_DESCRIPTION',
    'OBJECT_TYPE',
    'ESCALATED',
    'ACTIVITY_DATE',
    'CALL_DURATION',
    'CALLING_LINE_ID',
    'CALL_TOPIC',
    'CALL_TOPIC_TYPE',
    'DIRECTION',
    'DISPOSITION',
    'DNIS',
    'GENESYSID',
    'LAST_IVR_MENU',
    'SERVICE_GROUP_AND_CELL',
    'TN_NUMBER',
    'TRANSFER_HISTORY',
    'CONTACT_ID',
    'CREATEDBYID',
    'CREATEDBY_NTID',
    'CREATEDBY_ROLE',
    'CREATEDBY_AVAYA_ID',
    'CALL_TYPE',
    'WHO',
    'DELETED_IND',
    'CALL_DURATION_IN_SECONDS',
    'IWD_ESCALATED',
    'CAN_BE_REACHED',
    'TASK_DESCRIPTION_SUMMARY',
    'LAST_MODIFIED_BY',
    'PROVINCE'
    ]],
    'SF_CASE' => ['path' => 'SELECT * FROM CS_CASE_MGMT.SF_CASE', 'type' => 'oracle', 'headers' =>
    [
    'ID',
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
    'L2R_SURVEY_NOTIFICATION__C'
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
    
    private function make_header_row($incoming, $result_array) {
        // Given client query and array of results, construct the query's header row.
        // First, add the row field(s) specified by the user.
        // Next, add the null column value (if it exists).
        // Finally, sort remaining column entries in ascending order and add them to the header array.
        // This array is the first entry in the JSON result array. All result rows present data in the order of this array.
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
        //set_time_limit(300);
        $result = $this->Queryparser->make_pivot_query($incoming);
        if ($result == false) {
            return $result;
        }
        
        $query = $this->db->query($result);
        $query_result = $query->result_array();
        
        $header = $this->make_header_row($incoming, $query_result);
        $flat_results = $this->flatten_result_array($header, $query_result);
        return $flat_results;
    }
    
}
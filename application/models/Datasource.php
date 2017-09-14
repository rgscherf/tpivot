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

    public function log($msg) {
        log_message('debug', json_encode($msg));
    }

    public function jsonize_coord($coordArray) {
        //return '[' . implode(', ', $coordArray) . ']';
        return implode(',', $coordArray);
    }

    public function express_data($client_query, $db_results) {
        // Transform result data into nested hashmaps where cell values are located by their row->column->aggregate coordinates.
        // Also build the metadata declaring which row/col/aggregate labels exist and the order of those parent fields.
        log_message('debug', '---- META OBJECT DEBUG START ----');

        // this is the front-end query model.
        $query_model = $client_query['model'];

        // $name_map is the mapping of mangled alias names to human-friendly 
        // names of column and aggregator values. E.g. ['KHSBX' => '2017 Sales']
        $name_map = $this->Queryparser->get_name_map();

        // $meta_output['rows'] and $meta_output['columns'] are arrays of arrays. 
        // The top level arrays describe the order of row/column fields requested in the query model.
        // The bottom level arrays describe the VALUES of selected row/column fields found in the pivot query.
        // $meta_output['aggregators'] is always an array with the aggregators for each row/column intersection.
        $meta_output = [];

        // Get the names of row fields from the query model. 
        // These are keys for result row arrays, and their values are labels inserted at the appropriate place in $meta_output['rows'].
        // You can picture the shape of $meta_output['rows'] as the first level of arrays tied to the values of $selected_row_names,
        // And the second level of arrays being the result of using those values as keys in the query result rows.
        $selected_row_names = array_map(function($elem) {
            return $elem['name'];
        }, $query_model['Rows']);

        // Get the names of column fields from the query model.
        $selected_col_names = array_map(function($elem) {
            return $elem['name'];
        }, $query_model['Columns']);

        // $metaRows will become the 'rows' key for $meta_output.
        $meta_rows = array_map(function($elem) { return []; }, $query_model['Rows']);
        $meta_cols = array_map(function($elem) { return []; }, $query_model['Columns']);
        $meta_aggs = [];

        // $expr_results, 'expressive results', is a nested hashmap where each 'cell' in the pivot table is indexed by its row/column/aggregate coordinates.
        // A coordinate might be indexed by $expr_results["['2017', '12']"]["['Open', 'True']"]["count"].
        // Note that because PHP does not allow array keys, keys must be stringified before they are added to the map.
        // This is fine on the client side, as we will ask the map for array keys which the browser will stringify before lookup.
        $expr_results = [];

        foreach($db_results as $result_row) {
            $row_coord = [];
            foreach ($selected_row_names as $idx=>$rowName) {
                $row_label = $result_row[$rowName];
                $row_label = $row_label === null ? 'null' : $row_label;
                $row_coord[] = $row_label;

                // If $meta_rows doesn't have this label in the given row field yet, add it.
                if (!in_array($row_label, $meta_rows[$idx])) {
                     $meta_rows[$idx][] = $row_label;
                }
            }
            $jsonized_row_coord = $this->jsonize_coord($row_coord);

            // Now we want to iterate through the [colcoord/aggregatecoord=>cell value] properties of the row,
            // So we'll chop off the [row name=>row label] properties.
            $row_without_labels = array_slice($result_row, count($selected_row_names));

            foreach ($row_without_labels as $combined_coords=>$cellValue) {
                // $combined_coords is a string of concatenated aliases in mangled form.
                // Oracle separates the row values from the aggregator values with '_'.
                $split_coords = explode('_', $combined_coords);

                // In Queryparser, we use the '#$#' sequence to delimit column value aliases.
                $col_coord = explode('#$#', $split_coords[0]);

                // Now, look up all individual aliases in $name_map.
                $col_coord = array_map(function($elem) use ($name_map) {
                    if ( $name_map[$elem] === null  ) {
                        return 'null';
                    } else {
                        return $name_map[$elem];
                    }
                }, $col_coord);

                // Now take the elements of the column coords and add those values 
                // to $meta_cols if they don't already exist in their respective columns.
                for($idx = 0; $idx<count($col_coord); $idx++) {
                    $col_val = $col_coord[$idx];
                    $meta_col_arr = $meta_cols[$idx];
                    if (!in_array($col_val, $meta_col_arr)) {
                        $meta_cols[$idx][] = $col_val;
                    }
                }

                // ...finally, unmangle the aggregator name at this location.
                $agg_coord = $name_map[$split_coords[1]];

                // And update the meta information for aggregators. Remember that
                // meta for aggregators is a 1D array.
                if (!in_array($agg_coord, $meta_aggs)) {
                    $meta_aggs[] = $agg_coord;
                }

                // Now we have row, col, and aggregate coords. Insert this cell into $expr_results.
                // Note that the final key is 'value'. Table cells are themselves objects (with one key for now)
                // To facilitiate future expansion.
                $jsonized_col_coord = $this->jsonize_coord($col_coord);
                $expr_results[$jsonized_row_coord][$jsonized_col_coord][$agg_coord]['value'] = $cellValue;
            }
        }

        // package all the $meta vars into one array.
        $meta_output['rows'] = $meta_rows;
        $meta_output['columns'] = $meta_cols;
        $meta_output['aggregators'] = $meta_aggs;

        // ...and combine $meta_output with $expr_results.
        $ret = ['meta' => $meta_output,
                'results' => $expr_results];

        log_message('debug', '---- META OBJECT DEBUG END ----');
        return $ret;
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
            $expr_results = $this->express_data($incoming, $query_result);
            // $header = $this->make_header_row($incoming, $query_result);
            // $flat_results = $this->flatten_result_array($header, $query_result);

            return ['error' => false, 'rows' => $expr_results];
        }
    }
}
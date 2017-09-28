<?php

class Pivot extends CI_Controller {
    public function __construct() {
        parent::__construct();
        $this->load->model('Datasource');
    }
    
    
    public function index() {
        $data['availableData'] = $this->Datasource->get_sources();
        $this->load->view('templates/header');
        $this->load->view('templates/selectionPane', $data);
        $this->load->view('templates/footer');
    }

    
    public function process_client_query() {
        $goods = $this->input->raw_input_stream;
        $cleangoods = json_decode(trim($goods), true);
        $pivot_results = $this->Datasource->process_query($cleangoods);
        $pivot_results['model'] = $cleangoods['model'];
        $return_payload = $pivot_results;
        $this->output->set_status_header(200)
        ->set_content_type('application/json')
        ->set_output(json_encode($return_payload, JSON_NUMERIC_CHECK));
    }


    public function get_distinct_entries() {
        $goods = $this->input->raw_input_stream;
        $cleangoods = json_decode(trim($goods), true);
        $distinct_entries = $this->Datasource->distinct($cleangoods);
        $this->output->set_status_header(200)
        ->set_content_type('application/json')
        ->set_output(json_encode($distinct_entries, JSON_NUMERIC_CHECK));
    }
}
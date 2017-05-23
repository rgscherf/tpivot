<?php

class Pivot extends CI_Controller {
    public function __construct() {
        parent::__construct();
        $this->load->model('Datasource');
    }
    
    
    public function index() {
        $data['availableData'] = $this->Datasource->get_sources();
        $this->load->view('templates/header');
        $this->load->view('templates/dataSelectionPane', $data);
        $this->load->view('templates/footer');
    }
    
    
    public function process_client_query() {
        $goods = $this->input->raw_input_stream;
        $cleangoods = json_decode(trim($goods), true);
        $pivot_results = $this->Datasource->process_query($cleangoods);
        $return_payload = ['model' => $cleangoods['model'], 'results' => $pivot_results];
        $this->output->set_status_header(200)
        ->set_content_type('application/json')
        ->set_output(json_encode($return_payload, JSON_NUMERIC_CHECK));
    }
}
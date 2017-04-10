<?php

class Pivot extends CI_Controller {
    public function __construct() {
        parent::__construct();
        $this->load->model('Datastore');
    }
    
    public function index() {
        $data['availableData'] = $this->Datastore->get_sources();
        
        $this->load->view('templates/header', $data);
        //$this->load->view('templates/preamble', $data);
        $this->load->view('templates/dataSelectionPane', $data);
        $this->load->view('templates/pivotTemplate', $data);
        $this->load->view('templates/footer', $data);
    }
    
    public function process_config() {
        $goods = $this->input->raw_input_stream;
        $cleangoods = json_decode(trim($goods), true);
        
        // get pivot data
        $pivot_data = $this->Datastore->retrieve_data($cleangoods);
        $this->output->set_content_type('application/json')->set_output(json_encode($pivot_data, JSON_NUMERIC_CHECK));
        
    }
}
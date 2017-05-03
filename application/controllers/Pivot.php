<?php

class Pivot extends CI_Controller {
    public function __construct() {
        parent::__construct();
        $this->load->model('Datastore');
    }
    
    public function render_index_page() {
        $data['availableData'] = $this->Datastore->get_sources();
        $this->load->view('templates/header', $data);
        // $this->load->view('templates/title', $data);
        $this->load->view('templates/dataSelectionPane', $data);
        // $this->load->view('templates/preamble', $data);
        $this->load->view('templates/footer', $data);
    }
    
    public function index() {
        ////////////////////////////////
        // PASSWORD PROTECTING THIS PAGE
        ////////////////////////////////
        
        $user = "";
        $pass = "";
        if (isset($_POST['user'])) {
            $user = $_POST['user'];
        }
        if (isset($_POST['pass'])) {
            $pass = $_POST['pass'];
        }
        
        $useroptions = ['cost' => 8,];
        $pwoptions   = ['cost' => 8,];
        $userhash    = password_hash($user, PASSWORD_BCRYPT, $useroptions);
        $passhash    = password_hash($pass, PASSWORD_BCRYPT, $pwoptions);
        $hasheduser  = getenv('TPIVOT_LOGIN_USERNAME_HASH');
        $hashedpass  = getenv('TPIVOT_LOGIN_PASSWORD_HASH');
        
        if ((password_verify($user, $hasheduser)) && (password_verify($pass,$hashedpass))) {
            // if (true) {
            $this->render_index_page();
        } else {
            $this->load->view('templates/login');
        }
        
    }
    
    public function process_client_query() {
        $goods = $this->input->raw_input_stream;
        $cleangoods = json_decode(trim($goods), true);
        $pivot_results = $this->Datastore->process_query($cleangoods);
        $results_and_model = ['model' => $cleangoods['model'], 'results' => $pivot_results];
        $this->output->set_content_type('application/json')->set_output(json_encode($results_and_model, JSON_NUMERIC_CHECK));
    }
    
    
}
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
            log_message('debug', 'login accepted!');
            $this->render_index_page();
        } else {
            log_message('debug', 'login required!');
            $this->load->view('templates/login');
        }
        
    }
    
    public function process_config() {
        $goods = $this->input->raw_input_stream;
        $cleangoods = json_decode(trim($goods), true);
        
        // get pivot data
        $pivot_data = $this->Datastore->retrieve_data($cleangoods);
        $this->output->set_content_type('application/json')->set_output(json_encode($pivot_data, JSON_NUMERIC_CHECK));
        
    }
}
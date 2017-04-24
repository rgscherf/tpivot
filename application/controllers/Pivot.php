<?php

class Pivot extends CI_Controller {
    public function __construct() {
        parent::__construct();
        $this->load->model('Datastore');
    }
    
    public function index() {
        $user = ""; //prevent the "no index" error from $_POST
        $pass = "";
        if (isset($_POST['user'])) { // check for them and set them so
            $user = $_POST['user'];
        }
        if (isset($_POST['pass'])) { // so that they don't return errors
            $pass = $_POST['pass'];
        }
        
        $useroptions = ['cost' => 8,]; // all up to you
        $pwoptions   = ['cost' => 8,]; // all up to you
        $userhash    = password_hash($user, PASSWORD_BCRYPT, $useroptions); // hash entered user
        $passhash    = password_hash($pass, PASSWORD_BCRYPT, $pwoptions);  // hash entered pw
        $hasheduser  = getenv('TPIVOT_LOGIN_USERNAME_HASH');
        $hashedpass  = getenv('TPIVOT_LOGIN_PASSWORD_HASH');
        
        
        if ((password_verify($user, $hasheduser)) && (password_verify($pass,$hashedpass))) {
            
            // the password verify is how we actually login here
            // the $userhash and $passhash are the hashed user-entered credentials
            // password verify now compares our stored user and pw with entered user and pw
            
            $data['availableData'] = $this->Datastore->get_sources();
            $this->load->view('templates/header', $data);
            // $this->load->view('templates/title', $data);
            $this->load->view('templates/dataSelectionPane', $data);
            // $this->load->view('templates/preamble', $data);
            $this->load->view('templates/footer', $data);
            
        } else {
            // if it was invalid it'll just display the form, if there was never a $_POST
            // then it'll also display the form. that's why I set $user to "" instead of a $_POST
            // this is the right place for comments, not inside html
            echo '
            <form method="POST" action="index.php">
            User
            <input type="text" name="user"></input>
            <br/> Pass
            <input type="password" name="pass"></input>
            <br/>
            <input type="submit" name="submit" value="Go"></input>
            </form>';
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
<head>
  <link rel="stylesheet" type="text/css" href="<?php echo base_url('public/css/loginstyle.css') ?>" />
</head>

<body>
  <div id="pageContainer">
    <div id="loginContainer">
      <form method="POST" action="index.php">
        <div id="topContainer">
          <div class="subContainer">
            <div class="textContainer">
              Username
            </div>
            <div class="textContainer">
              Password
            </div>
          </div>
          <div class="subContainer">
            <div class="inputContainer">
              <input type="text" name="user"></input>
            </div>
            <div class="inputContainer">
              <input type="password" name="pass"></input>
            </div>
            <div class="submitContainer">
              <input type="submit" name="submit" value="Login"></input>
            </div>
          </div>
        </div>
      </form>
    </div>
  </div>
</body>
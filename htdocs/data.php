<?php
    //******************************************************************************************
    //* generates the data
    //* TODO: prevent SQL injection (maybe)
    //******************************************************************************************
    function getData($article) {
        require("config.php");

        $Conn = mysql_connect($Server, $User, $Passwort);
        mysql_select_db($DB, $Conn);
        mysql_query("set names 'utf8';", $Conn);

        //get eigenvalue and calculate skewness
	    $SQL = "SELECT lambda1, lambda2 FROM eigenvalue WHERE article='$article'";
	    $RS = mysql_query($SQL, $Conn);
	    $crow = mysql_fetch_row($RS);
	    $s = $crow[1]/$crow[0];

	    //get eigenvectors
	    $ev = array();
	    $SQL = "SELECT user, v1, v2 FROM eigenvector WHERE article='$article'";
	    $RS = mysql_query($SQL, $Conn);
	    while ($crow = mysql_fetch_row($RS)) {
	        $user = array();
	        $user['name'] = $crow[0];
	        $user['p1'] = $crow[1];
	        $user['p2'] = $s * $crow[2];
	    
	        //get out-degree and in-degree of author's revisions (argh, so many DB queries... but hey, I'm lazy)
	        $user['out'] = 0;
	        $SQL = "SELECT weight FROM edge WHERE fromuser='$crow[0]'";
	        $RS_1 = mysql_query($SQL, $Conn);
	        while ($crow_1 = mysql_fetch_row($RS_1)) { $user['out'] += $crow_1[0]; }

	        $user['in'] = 0;
	        $SQL = "SELECT weight FROM edge WHERE touser='$crow[0]'";
	        $RS_1 = mysql_query($SQL, $Conn);
	        while ($crow_1 = mysql_fetch_row($RS_1)) { $user['in'] += $crow_1[0]; }

	        $ev[] = $user;
	    }

        echo "{ \"positions\" : ";
        echo json_encode($ev);
        echo ", \"skewness\" : " . $s . "}";
    }

    if ($_POST['article']) {
        getData($_POST['article']);
    }
?>

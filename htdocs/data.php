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

    //******************************************************************************************
    //* gets the first element of an array
    //******************************************************************************************
    function getFirstElement($array) {
        return key(array_slice($array, 0, 1, true));
    }

    //******************************************************************************************
    //* gets the last element of an array
    //******************************************************************************************
    function getLastElement($array) {
        end($array);
        return key($array);
    }

    //******************************************************************************************
    //* gets the timeline data
    //* TODO: prevent SQL injection (maybe)
    //******************************************************************************************
    function getTimelineData($article) {
        require("config.php");

        $Conn = mysql_connect($Server, $User, $Passwort);
        mysql_select_db($DB, $Conn);
        mysql_query("set names 'utf8';", $Conn);

        $SQL = "SELECT year(timestamp) as y, month(timestamp) as m, count(*) as amount FROM entry WHERE article = '$article' GROUP BY year(timestamp), month(timestamp) ORDER BY timestamp";
        $RS = mysql_query($SQL, $Conn);
        $dates = array();

        $first = true;
        $sYear = 0;
        $sMonth = 0;
        $eYear = 0;
        $eMonth = 0;
	    while ($crow = mysql_fetch_row($RS)) {
            $m = str_pad($crow[1], 2, '0', STR_PAD_LEFT);
            $y = $crow[0];
            if ($first) {
                $sYear = $y;
                $sMonth = $m;
                $first = false;
            }

            $key = $y . "_" . $m;
            $dates[$key] = $crow[2];

            $eYear = $y;
            $eMonth = $m;
        }

        $startDate = new DateTime("20-$sMonth-$sYear");
        $endDate = new DateTime("20-$eMonth-$eYear");
        
        $current = $startDate;
        $item = "";
        $max = 0;
        while ($current <= $endDate) {
            $m = $current->format("m");
            $y = $current->format("Y");
            $key = $y . "_" . $m;
            $v = $dates[$key];
            if (!$v) {
                $v = 0;
            } else {
                if ($v > $max)
                    $max = $v;
            }
            
            $item .= "{ \"m\" : \"$m\", \"y\" : $y, \"a\" : $v, \"s\" : true }";
            if ($current < $endDate)
                $item .= ",";
            
            $current->modify("+1 month");
        }
        $start = $startDate->format("mY");
        $end = $endDate->format("mY");
        echo "{ \"start\" : \"$start\", \"end\" : \"$end\", \"max\" : $max, \"items\" : [$item]}";

        /*
        this._data = {
            start       : 012010,
            end         : 062010,
            max         : 7,
            items       : [{
                month   : 1,
                year    : 2010,
                amount  : 2,
                selected: false
            }
        */
    }

    $article = $_POST['article'];
    if ($_POST['load']) {
        getData($article);
    } else if ($_POST['timeline']) {
        getTimelineData($article);
    }
?>

<?php

//******************************************************************************************
//* executes the ev-gen tool to calculate the eigenvalues/eigenvectors
//******************************************************************************************
function execEvGen($page_id, $sid) {
    //if (PHP_OS == 'Linux') {
        $result = shell_exec("evgen-bin/evgen $page_id $sid debug");
    //}
    //else {
    //    $result = shell_exec("evgen-bin\\evgen.exe $page_id $sid");
    //}
    return $result;
}

//******************************************************************************************
//* generates the data
//* TODO: prevent SQL injection (maybe)
//******************************************************************************************
function getData() {
    require("config.php");
    
    $page_id = $_SESSION['page_id'];
    
    $sid = session_id();

    $dbconn = mysql_connect($dbserver, $dbuser, $dbpassword);
    mysql_select_db($dbname, $dbconn);
    mysql_query("set names 'utf8';", $dbconn);

    //calculate weights
    $sd = getDateBy('sd');
    $ed = getDateBy('ed');
    $dmax = $_POST['dmax'];
    
    //call edge calculation function 

    if ($ed == null) {
        mysql_query("call getEdges($page_id, '$sid', $dmax, null, null)", $dbconn);
    } else {
        //2006-03-31T22:00:00.000Z
        $sdf = $sd->format('Y-m-d');
        $edf = $ed->format('Y-m-d');
        mysql_query("call getEdges($page_id, '$sid', $dmax, '$sdf', '$edf')", $dbconn);
    }
    
    //error_log("finished edge calculation");

    $result = false;
    
    //calculate eigenvectors
    $result = execEvGen($page_id, $sid);


    //this part checks if the evgen tool has finished inserting the data
    //todo: check if an error occured
    /*if ($result) {
        while (true) {
            $sql = "SELECT finished FROM evgen WHERE sid = '$sid'";
            $rs = mysql_query($sql, $dbconn);
            $crow = mysql_fetch_row($rs);

            if ($crow[0] == 0) {
                usleep(250000);
            } else {
                error_log("finished evgen");
                break;
            }
        }
    }*/

    $positions = array();
    $s = 0;
    $rsdmin = PHP_INT_MAX;
    $rsdmax = 0;

    //check if edges are available
    $sql = "SELECT count(*) FROM edge WHERE article=$page_id and sid = '$sid'";
    $rs = mysql_query($sql, $dbconn);
    $crow = mysql_fetch_row($rs);
    if ($crow[0] > 0) {
        //get eigenvalue and calculate skewness
        $sql = "SELECT lambda1, lambda2 FROM eigenvalue WHERE article=$page_id and sid = '$sid'";
        $rs = mysql_query($sql, $dbconn);
        $crow = mysql_fetch_row($rs);
        $s = ($crow[0] == 0) ? 0 : $crow[1]/$crow[0];

        //get author's positions and extra data
        $sql = "SELECT user, v1, v2 FROM eigenvector WHERE article=$page_id and sid = '$sid'";
        $rs = mysql_query($sql, $dbconn);
        while ($crow = mysql_fetch_row($rs)) {
            $user = array();
            $user['name'] = $crow[0];
            $user['p1'] = (float) $crow[1];
            $user['p2'] = $s * $crow[2];
        
            //get out-degree and in-degree of author's revisions and edge data
            $user['out'] = 0;
            $user['in'] = 0;
            $user['revised'] = array();
        
            $sql = "SELECT weight, touser FROM edge WHERE fromuser='$crow[0]' and sid = '$sid'";
            $rs_1 = mysql_query($sql, $dbconn);
            while ($crow_1 = mysql_fetch_row($rs_1)) {
                $user['out'] += $crow_1[0];
                $user['revised'][$crow_1[1]] = (float) $crow_1[0];
            }

            $sql = "SELECT weight FROM edge WHERE touser='$crow[0]' and sid = '$sid'";
            $rs_1 = mysql_query($sql, $dbconn);
            while ($crow_1 = mysql_fetch_row($rs_1)) {
                $user['in'] += $crow_1[0];
            }
            
            //get relative standard deviation
            $user['rsd'] = 0;
            $sql = "SELECT rsd FROM weeklyedits WHERE article=$page_id AND user='$crow[0]'";
            $rs_1 = mysql_query($sql, $dbconn);
            while ($crow_1 = mysql_fetch_row($rs_1)) {
                $user['rsd'] = $crow_1[0];
            }
                $rsdmin = $user['rsd'] < $rsdmin ? $user['rsd'] : $rsdmin;
                $rsdmax = $user['rsd'] > $rsdmax ? $user['rsd'] : $rsdmax;

            if ($user['p1'] != 0 || $user['p2'] != 0) {
                $positions[] = $user;
            }
        }
    }
    /* { "positions" : [
            { "name": "61.224.89.221",
              "p1": 1,
              "p2": 0,
              "out": 0.924792,
              "in": 0,
              "revised": {
                "67.71.3.90": 0.924792
              }
            },
            ...
         ],
         "skewness" : 0.24614068942402
       }
         */

    echo "{ \"positions\" : ";
    echo json_encode($positions);
    echo ", \"skewness\" : \"$s\"";
    echo ", \"rsdmin\" : \"$rsdmin\"";
    echo ", \"rsdmax\" : \"$rsdmax\"}";
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
function getTimelineData() {
    require("config.php");
    
    $page_id = $_SESSION['page_id'];
    
    $dbconn = mysql_connect($dbserver, $dbuser, $dbpassword);
    mysql_select_db($dbname, $dbconn);
    mysql_query("set names 'utf8';", $dbconn);

    $sql = "SELECT year(timestamp) as y, month(timestamp) as m, count(*) as amount FROM entry WHERE article = $page_id GROUP BY year(timestamp), month(timestamp) ORDER BY timestamp";
    $rs = mysql_query($sql, $dbconn);
    $dates = array();

    $first = true;
    $sYear = 0;
    $sMonth = 0;
    $eYear = 0;
    $eMonth = 0;
    while ($crow = mysql_fetch_row($rs)) {
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
    $sd = getDateBy('sd');
    $ed = getDateBy('ed');
    
    while ($current <= $endDate) {
        $m = $current->format("m");
        $y = $current->format("Y");
        $key = $y . "_" . $m;
        $v = 0;
        if (array_key_exists($key, $dates)) {
            $v = $dates[$key];
        }
        
        if ($v > $max) {
            $max = $v;
        }
        
        $sel = "true";
        if ($sd != null && $ed != null) {
            if ($current < $sd || $current > $ed)
                $sel = "false";
        }

        $item .= "{ \"m\" : \"$m\", \"y\" : $y, \"a\" : $v, \"s\" : $sel }";
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

//******************************************************************************************
// returns a date for a given name (post) or null
//******************************************************************************************
function getDateBy($name) {
    if ($_POST[$name] == null) {
        return null;
    } else {
        return new DateTime(date('d-m-Y', strtotime($_POST[$name])));
    }
}

function get_page_id($wiki, $article) {
    require("config.php");
    
    $dbconn = mysql_connect($dbserver, $dbuser, $dbpassword);
    mysql_query("set names 'utf8';", $dbconn);
    
    mysql_select_db($dbname, $dbconn);
    
    $article = mysql_real_escape_string($article);
    $article = str_replace(' ', '_', $article);

    $sql = "SELECT * FROM page WHERE title = '$article' AND wiki = '$wiki'";
    $rs = mysql_query($sql, $dbconn);
    
    if ($crow = mysql_fetch_row($rs)) {
        $page_id = $crow[0];
        //error_log("not querying wp");
    }
    else {
        //read revision data from the wikipedia database
        $dbserver = str_replace('_', '-', $wiki) . 
".rrdb.toolserver.org";
        
        $dbconn = mysql_connect($dbserver, $dbuser, $dbpassword);
        mysql_query("set names 'utf8';", $dbconn);
        
        mysql_select_db($wiki, $dbconn);
        
        $data = array();
        
        $sql = "SELECT rev_user_text, rev_timestamp, page_title from revision r
                JOIN page p ON r.rev_page = p.page_id 
                WHERE p.page_title = '$article'";
        $rs = mysql_query($sql, $dbconn);
        while ($crow = mysql_fetch_row($rs)) {
            $data[] = $crow;
        }

        mysql_close($dbconn);

        require("config.php");
        $dbconn = mysql_connect($dbserver, $dbuser, $dbpassword);
        mysql_query("set names 'utf8';", $dbconn);

        mysql_select_db($dbname, $dbconn);
        
        $sql = "INSERT INTO page VALUES (DEFAULT, '" . $data[0][2]. "', '$wiki', '" . date('Y-m-d H:i:s') . "')";
        mysql_query($sql, $dbconn);
        
        $page_id = mysql_insert_id();
        
        foreach ($data as $field) {
            $sql = "INSERT INTO entry VALUES ('$field[0]', $field[1], $page_id)";
            mysql_query($sql, $dbconn);
        }
    }
    
    //error_log("finished reading wp");
    
    $_SESSION['page_id'] = $page_id;
}

//******************************************************************************************
// main function
//******************************************************************************************
function main() {
    session_start();

    //error_log("starting session " . session_id());

    if (isset($_POST['load'])) {
        $article = $_POST['article'];
        $wiki = $_POST['wiki'];
        
        get_page_id($wiki, $article);
        
        getData();
    }
    else if (isset($_POST['timeline'])) {
        getTimelineData();
    }
}

main();

?>

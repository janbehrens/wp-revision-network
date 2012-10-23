<?php
require("config.php");

if ($dbconn = mysql_connect($dbserver, $dbuser, $dbpassword)) {
    echo "Established connection to $dbserver<br/>";
}
else {
    echo "Could not connect to $dbserver<br/>";
    die;
}
//mysql_query("set names 'utf8';", $dbconn);

if (mysql_select_db($dbname, $dbconn)) {
    echo "Selected database $dbname<br/>";
}
else {
    echo "Could not select database $dbname<br/>";
    die;
}

$wiki = 'enwiki_p';
$article = 'AMF Bowling World Lanes';

$article = mysql_real_escape_string($article);
$article = str_replace(' ', '_', $article);

$sql = "SELECT * FROM page WHERE title = '$article' AND wiki = '$wiki'";
if ($rs = mysql_query($sql, $dbconn)) {
    echo "Query successful<br/>";
}
else {
    echo "Query failed<br/>";
}

if ($crow = mysql_fetch_row($rs)) {
    $page_id = $crow[0];
    echo "fetch row: $page_id<br/>";
}
else {
    //read revision data from the wikipedia database
    echo "no rows to fetch<br/>";
    
    $dbserver = str_replace('_', '-', $wiki) . ".rrdb.toolserver.org";

    if ($dbconn = mysql_connect($dbserver, $dbuser, $dbpassword)) {
        echo "Established connection to $dbserver<br/>";
    }
    else {
        echo "Could not connect to $dbserver<br/>";
        die;
    }

    //mysql_query("set names 'utf8';", $dbconn);
    
    if (mysql_select_db($wiki, $dbconn)) {
        echo "Selected database $wiki<br/>";
    }
    else {
        echo "Could not select database $wiki<br/>";
        die;
    }
    
    $data = array();
    
    $sql = "SELECT rev_user_text, rev_timestamp, page_title from revision r
            JOIN page p ON r.rev_page = p.page_id 
            WHERE p.page_title = '$article'";
    if ($rs = mysql_query($sql, $dbconn)) {
        echo "Query successful<br/>";
    }
    else {
        echo "Query failed<br/>";
    }
    
    while ($crow = mysql_fetch_row($rs)) {
        $data[] = $crow;
        //echo "$crow[0]<br/>";
    }
    
    require("config.php");

    if ($dbconn = mysql_connect($dbserver, $dbuser, $dbpassword)) {
        echo "Established connection to $dbserver<br/>";
    }
    else {
        echo "Could not connect to $dbserver<br/>";
        die;
    }

    if (mysql_select_db($dbname, $dbconn)) {
        echo "Selected database $dbname<br/>";
    }
    else {
        echo "Could not select database $dbname<br/>";
        die;
    }
    
    $sql = "INSERT INTO page VALUES (DEFAULT, 'Main_Page', 'enwiki:p', '".date('Y-m-d H:i:s')."')";
    $sql = "INSERT INTO entry VALUES ('Foo', '".date('Y-m-d H:i:s')."', 1)";
    if (mysql_query($sql, $dbconn)) {
        echo "Query successful<br/>";
    }
    else {
        echo "Query failed<br/>";
    }

    /*$sql = "INSERT INTO page VALUES (DEFAULT, '" . $data[0][2]. "', '$wiki', '" . date('Y-m-d H:i:s') . "')";
    if (mysql_query($sql, $dbconn)) {
        echo "Query successful<br/>";
    }
    else {
        echo "Query failed<br/>";
    }
    
    $page_id = mysql_insert_id();
    echo "$page_id<br/>";*/
}

mysql_close($dbconn);

?>

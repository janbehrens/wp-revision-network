<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">

<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <title>Vis2</title>
    <script src="scripts/glMatrix-0.9.5.min.js" type="text/javascript"></script>
    <script src="scripts/prototype.js" type="text/javascript"></script>
    <script src="scripts/main.js" type="text/javascript"></script>
    <link href="styles/site.css" rel="stylesheet" type="text/css" />

    <script id="basic-shader-fs" type="x-shader/x-fragment">
        //Basic fragment shader program
        precision mediump float;
		
		varying vec4 vColor;

        void main(void) {
            gl_FragColor = vColor;
        }
    </script>

    <script id="basic-shader-vs" type="x-shader/x-vertex">
        //Basic vertex shader program 
        attribute vec3 aVertexPosition;
		attribute vec4 aVertexColor;

        uniform mat4 uMVMatrix;
        uniform mat4 uPMatrix;
		
		varying vec4 vColor;

        void main(void) {
            gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
			vColor = aVertexColor;
        }
    </script>
</head>
<body onload="startWebGL()">
    <div class="page">
        <div class="header">
            <div class="title">
                <h1>
                    Visualisierung 2
                </h1>
            </div>
            <div class="loginDisplay"></div>
            <div class="clear hideSkiplink">
                <div class="menu">
                </div>
            </div>
        </div>
        <div class="main">
            <div>
            <form action="" method="post">
            <select name='article'>
<?php
require("config.php");
$Conn = mysql_connect($Server, $User, $Passwort);
mysql_select_db($DB, $Conn);
mysql_query("set names 'utf8';", $Conn);

$SQL = "SELECT article FROM eigenvalue";
$RS = mysql_query($SQL, $Conn);
while ($crow = mysql_fetch_row($RS)) {
    echo "                <option value=\"$crow[0]\"";
    if ($crow[0] == $_POST['article']) echo " selected=\"selected\"";
    echo ">$crow[0]</option>\n";
}
?>
            </select>
            <input type="submit" name="submit"/>
            </form>
            </div>
<?php
if ($article = $_POST['article']) {
	//edge table for output
	$SQL = "SELECT * FROM edge WHERE article='$article'";
	$RS = mysql_query($SQL, $Conn);
    echo "			<div style=\"margin:1em 0 1em 0\">\n";
    echo "			<table border=\"1\"><tr><th>u</th><th>v</th><th>weight</th></tr>\n";
	while ($crow = mysql_fetch_row($RS)) {
		echo "            <tr><td>$crow[0]</td><td>$crow[1]</td><td>$crow[2]</td></tr>\n";
	}
    echo "			</table>\n";
    echo "			</div>\n";
}
?>

<script type="text/javascript">
function startWebGL() {
<?php
if ($article) {
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
	
	//call WebGL
	echo "Vis.WebGL.Init(" . json_encode($ev) . ", $s);\n";
}
?>
}
</script>

            <canvas id="vis-canvas" width="920" height="500"></canvas>
        </div>
        <div class="clear">
        </div>
    </div>
    <div class="footer">
    </div>
</body>
</html>

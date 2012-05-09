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
<?php
    //database connection details
	$Server = "localhost";
	$User = "root"; 
	$Passwort = "pw";
	$DB = "wpdump";

	$Conn = mysql_connect($Server, $User, $Passwort);
	mysql_select_db($DB, $Conn);
	mysql_query("set names 'utf8';", $Conn);
	
	//onload: various parameters can go here
	echo '<body onload="Vis.WebGL.Init(' . 1.6 . ')">';
?>
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
			<p>Revision edges with weight not equal zero</p>
			<table border="1"><tr><th>u</th><th>v</th><th>weight</th></tr>
<?php
	$adjmatrix = array();
	$SQL = "SELECT u.name as fromuser, v.name as touser, e.weight 
	        FROM edge e 
	        JOIN user u ON e.fromuser = u.id 
	        JOIN user v ON e.touser = v.id 
	        WHERE weight > 0";
	$RS = mysql_query($SQL, $Conn);
	while ($crow = mysql_fetch_row($RS)) {
		echo "<tr><td>$crow[0]</td><td>$crow[1]</td><td>$crow[2]</td></tr>";
		
		//store values in the adjacency matrix
		if (!array_key_exists($crow[0], $adjmatrix)) {
			$adjmatrix[$crow[0]] = array();
		}
		if (!array_key_exists($crow[1], $adjmatrix[$crow[0]])) {
			$adjmatrix[$crow[0]][$crow[1]] = 0;
		}
		if (!array_key_exists($crow[1], $adjmatrix)) {
			$adjmatrix[$crow[1]] = array();
		}
		if (!array_key_exists($crow[0], $adjmatrix[$crow[1]])) {
			$adjmatrix[$crow[1]][$crow[0]] = 0;
		}
		$adjmatrix[$crow[0]][$crow[1]] += $crow[2];
		$adjmatrix[$crow[1]][$crow[0]] += $crow[2];
	}
?>
			</table>
			<p>Adjacency matrix</p>
<?php
    //output the matrix and simultaneously store its values in a numerical array (for eigenvalue calculation)
	echo '<table border="1"><tr><td></td><td>' . implode('</td><td>', array_keys($adjmatrix)) . '</td></tr>';
	$adjarr = array();
	$i = 0;
	foreach (array_keys($adjmatrix) as $row_key) {
		echo "<tr><td>$row_key</td>";
		$j = 0;
		foreach (array_keys($adjmatrix) as $col_key) {
			if (array_key_exists($row_key, $adjmatrix) && array_key_exists($col_key, $adjmatrix[$row_key])) {
				echo "<td>".$adjmatrix[$row_key][$col_key]."</td>";
				$adjarr[$i][$j] = $adjmatrix[$row_key][$col_key];
			}
			else {
				echo "<td>0</td>";
				$adjarr[$i][$j] = 0;
			}
			$j++;
		}
		echo "</tr>";
		$i++;
	}
?>
			</table>
			<!--eigenvalue calculation-->
			<p><?php echo var_dump(Lapack::eigenValues($adjarr));?></p>

            <canvas id="vis-canvas" width="920" height="500"></canvas>
        </div>
        <div class="clear">
        </div>
    </div>
    <div class="footer">
        
    </div>
</body>
</html>

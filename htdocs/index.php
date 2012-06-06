<?php
    //******************************************************************************************
    //* Draws the article dropdown
    //******************************************************************************************
    function drawArticleDD() {
        require("config.php");

        echo "<select name='article' id='article'>";
        echo "<option>Please select ...</option>";

        $Conn = mysql_connect($Server, $User, $Passwort);
        mysql_select_db($DB, $Conn);
        mysql_query("set names 'utf8';", $Conn);

        $SQL = "SELECT article FROM eigenvalue";
        $RS = mysql_query($SQL, $Conn);
        while ($crow = mysql_fetch_row($RS)) {
            echo "<option value=\"$crow[0]\">$crow[0]</option>\n";
        }
        echo "</select>";
    }
?>

<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">

<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <title>Vis2</title>
    <script src="scripts/glMatrix-0.9.5.min.js" type="text/javascript"></script>
    <script src="scripts/prototype.js" type="text/javascript"></script>
    <script src="scripts/main.js" type="text/javascript"></script>
	<script src="scripts/drawing.js" type="text/javascript"></script>
	<script src="scripts/timeline.js" type="text/javascript"></script>
    <link href="styles/site.css" rel="stylesheet" type="text/css" />

    <!-- BASIC SHADER //-->
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
        attribute vec2 aVertexPosition;
		attribute vec4 aVertexColor;

		varying vec4 vColor;

        void main(void) {
            gl_Position = vec4(aVertexPosition, 0, 1);
			vColor = aVertexColor;
        }
    </script>

    <!-- TIMELINE SHADER //-->
	<script id="tl-shader-vs" type="x-shader/x-vertex">
		attribute vec2 aVertexPosition;

		void main() {
		  gl_Position = vec4(aVertexPosition, 0, 1);
		}
	</script>

	<script id="tl-shader-fs" type="x-shader/x-fragment">
		precision mediump float;
		uniform vec4 uColor;

		void main() {
			gl_FragColor = uColor;
		}
	</script>
</head>
<body>
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
        <div class="main" id="main">
            <div>
                <?php drawArticleDD() ?>
                <button type="button" onclick="Vis.Load()">Load</button>
            </div>

			<div id="welcome-screen">
                <div style="text-align:center; padding:10px;margin-bottom:50px;">
                    Choose an article and press the load button to visualize the reviewing history of the selected article.
                </div>
                <div style="text-align:center"><img src="img.gif" alt="" /></div>
            </div>

            <canvas id="vis-canvas" style="display:none;"></canvas>
        </div>
        <div class="clear">
        </div>
    </div>
    <div class="footer">
    </div>
</body>
</html>

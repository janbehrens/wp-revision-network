<?php
    //******************************************************************************************
    //* Draws the article dropdown (deprecated)
    //******************************************************************************************
    function drawArticleDD() {
        require("config.php");

        echo "<select name='article' id='article'>";
        echo "<option value=''>Please select ...</option>";

        $dbconn = mysql_connect($dbserver, $dbuser, $dbpassword);
        mysql_select_db($dbname, $dbconn);
        mysql_query("set names 'utf8';", $dbconn);

        $sql = "SELECT DISTINCT article FROM entry ORDER BY article";
        $rs = mysql_query($sql, $dbconn);
        while ($crow = mysql_fetch_row($rs)) {
            echo "<option value=\"$crow[0]\">$crow[0]</option>\n";
        }
        echo "</select>";
    }
    
    //******************************************************************************************
    //* Draws the WP dropdown
    //******************************************************************************************
    function drawWpDD() {
        require("config.php");

        echo "<select name='wiki' id='wiki'>";
        echo "<option value=''>Please select ...</option>";

	    //$dbserver = $dbnametoolserver . ".userdb.toolserver.org";

        /*$dbconn = mysql_connect($dbserver, $dbuser, $dbpassword);
        mysql_select_db($dbnametoolserver, $dbconn);
        
        //$sql = "SELECT w.dbname, l.english_name FROM wiki w JOIN language l ON w.lang = l.lang WHERE family = 'wikipedia' ORDER BY l.english_name";
        $sql = "SELECT dbname FROM wiki WHERE family = 'wikipedia' ORDER BY dbname";
        $rs = mysql_query($sql, $dbconn);
        while ($crow = mysql_fetch_row($rs)) {
            echo "<option value=\"$crow[0]\">" . substr($crow[0], 0, count($crow[0]) - 3) . "</option>\n";
        }*/
        echo "</select>";
    }
?>

<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">

<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <title>Wikipedia revision networks</title>
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
	
	<script type="text/javascript">
	    function showHideHelp() {
	        if ($('help').style.display == 'none') {
	            $('help').show();
	            //$('welcome-screen').hide();
	            //$('loading').hide();
	            $('helplink').innerHTML = 'Hide';
	        }
	        else {
	            $('help').hide();
	            $('helplink').innerHTML = 'Quick help';
	        }
	    }
	</script>
</head>
<body>
    <div class="page">
        <div class="header">
            <div class="title">
                <h1>
                    Wikipedia revision networks <small><em>beta</em></small>
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
                <div style="float:right; position:relative; top:10px;">
                    <a id="helplink" href="javascript:showHideHelp();" style="text-decoration:none;">Quick help</a>
                </div>
                <table border="0" cellspacing="4" cellpadding="0">
                    <tr>
                        <td>Wiki: <?php drawWpDD() ?></td>
                        <td>Article: <input name='article' id='article' /></td>
                        <td>Max. time diff. between edits:</td>
                        <td>
                            <select name="dmax" id="dmax">
                                <option value="300">5 minutes</option>
                                <option value="600" selected>10 minutes</option>
                                <option value="1800">30 minutes</option>
                                <option value="3600">1 hour</option>
                            </select>
                        </td>
                        <td><button type="button" onclick="Vis.Load()" class="button" id="btnLoad">Load</button></td>
                    </tr>
                </table>
            </div>
            
            <div id="help" style="display:none">
            <p>The <i>"Wikipedia revision networks"</i> program visualizes controversies between editing users in Wikipedia based on page revision data.</p>
            <h3>Usage:</h3>
            <p>Choose a wiki from the drop-down list (e.g., 'enwiki' for the English Wikipedia) and type in the name of an article that you are interested in (redirects don't work).</p>
            <p>Using the menu labeled "Max. time diff. between edits" you can control which particular edits are taken into account. For instance, if you choose "10 minutes", any edit that has been made less than 10 minutes after the previous one (of another user) will be considered in the calculation. For articles with large revision histories a small time difference may be sufficient; whereas for such articles with lower edit frequency a higher value is appropriate.</p>
            <p>When you click the "Load" button, the image will be generated. <b>Attention:</b> Loading may take several minutes, depending on the size of the revision history!</p>
            <p>In the image the involved authors (represented by ellipses) will be arranged in resemblance of the positions they take in the actual conflict. Their involvement in the controversy is shown as the size of the respective ellipses. The ellipses' shapes show whether each author is a revising author (correcting others) or being revised. Lines between authors show in more detail who revises whom. Authors' steadiness of contribution is coded by color.</p>
            <p>In order to examine controversies over a limited time scale, click on the timeline at the bottom of the window. Use a left click to set the start date of the desired date range, and Shift + left click to set its end date. Press the "Rearrange" button and see the image calculated from the given range of edits.</p>
            </div>
            
            <div id="vis-container" style="display:none;">
                <canvas id="vis-canvas"></canvas>
                <div id="textlayer"></div>
            
                <div id="rearrange" style="display:none">
                    <div class="ra-title">Rearrange time period</div>
                    <div class="ra-content">
                        You have clicked on a bar in the timeline.<br>
                        You can rearrange the visualisation of the conflicts by picking a second bar in the timeline.<br>
                        <br>
                        <table>
                            <tr>
                                <td align="right">First item: </td>
                                <td id="ra-first">08-2010</td>
                            </tr>
                            <tr>
                                <td align="right" valign="top" nowrap>Second item: </td>
                                <td id="ra-second">Hold the [SHIFT]-Key and pick a second item in the timeline. Then press "Rearrange" or click "Cancel" to restore the default view</td>
                            </tr>
                        </table>
                        <br>
                        <button class="button" type="button" id="btnRearrange" onclick="Vis.Timeline.Events.OnButtonRearrangeClick()" disabled>Rearrange</button>
                        <button class="button" type="button"  onclick="Vis.Timeline.Events.OnButtonCancelClick()">Cancel</button>
                    </div>
                </div>

                <div id="tl-status"><!-- Month: 02-2012, Number of revisions: 200 //--></div>

                <div id="error-screen" style="display:none">
                    <div class="error-hl">Sorry</div>
                    <div class="error-content">
                        No data can be displayed for the selected date range. It seems there were no conflicts at all ;)<br>
                        <br>
                        Choose another date range and try it again.
                    </div>
                </div>
            </div>

			<div id="welcome-screen">
                <div style="text-align:center; padding:10px;margin-bottom:50px;">
                    Type in an article name and press the 'Load' button to visualize the revision history of the selected article.
                </div>
                <div style="text-align:center"><img src="img.gif" alt="" /></div>
            </div>
            
            <div id="loading" style="display:none">
                <div id="loading-indicator"></div>
            </div>
        </div>
        <div class="clear">
        </div>
    </div>
    <div class="footer">
    </div>
</body>
</html>

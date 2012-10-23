<?php
//database connection details
$ts_pw = posix_getpwuid(posix_getuid());
$ts_mycnf = parse_ini_file($ts_pw['dir'] . "/.my.cnf");
$dbuser = $ts_mycnf['user']; 
$dbpassword = $ts_mycnf['password'];
$dbname = "u_ant_revnet";
$dbnametoolserver = "toolserver";
//$dbserver = "sql-user-a.toolserver.org";
$dbserver = "sql-s1-user.toolserver.org";
?>

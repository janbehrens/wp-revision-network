CREATE TABLE `edge` (
  `fromuser` varchar(255) NOT NULL,
  `touser` varchar(255) NOT NULL,
  `weight` float NOT NULL,
  `timestamp` datetime NOT NULL,
  `article` integer NOT NULL,
  `wiki` char(50) NOT NULL,
  `dmax` int NOT NULL,
  `lastupdate` timestamp NOT NULL
);

CREATE TABLE `weeklyedits` (
  `user` varchar(255) NOT NULL,
  `rsd` float NOT NULL COMMENT 'relative standard deviation of weekly edits',
  `article` integer NOT NULL,
  `wiki` char(50) NOT NULL,
  `lastupdate` timestamp NOT NULL
);

CREATE TABLE `eigenvalue` (
  `lambda1` double NOT NULL COMMENT 'smallest eigenvalue',
  `lambda2` double NOT NULL COMMENT 'second smallest eigenvalue',
  `article` integer NOT NULL,
  `wiki` char(50) NOT NULL,
  `sid` varchar(255) NOT NULL
);

CREATE TABLE `eigenvector` (
  `user` varchar(255) NOT NULL,
  `v1` double NOT NULL COMMENT 'vectorelement to the smallest eigenvalue',
  `v2` double NOT NULL COMMENT 'vectorelement to the 2nd smallest eigenvalue',
  `article` integer NOT NULL,
  `wiki` char(50) NOT NULL,
  `sid` varchar(255) NOT NULL
);

CREATE TABLE `evgen` (
  `sid` varchar(255) NOT NULL,
  `finished` tinyint NOT NULL,
  PRIMARY KEY (`sid`)
);

-- --------------------------------------------------------------------------------
-- Routine DDL
-- Note: comments before and after the routine body will not be stored by the server
-- --------------------------------------------------------------------------------

-- thanks to http://stackoverflow.com/questions/1680850/mysql-stored-procedures-use-a-variable-as-the-database-name-in-a-cursor-declar

DELIMITER $$

CREATE PROCEDURE `proc1`(wiki char(50), art integer)
BEGIN
  DECLARE SQLStmt TEXT;

  SET @SQLStmt = CONCAT('DROP TEMPORARY TABLE IF EXISTS tmp_revision');
  PREPARE Stmt FROM @SQLStmt;
  EXECUTE Stmt;
  DEALLOCATE PREPARE Stmt;
  
  SET @myart = art;
  SET @SQLStmt = CONCAT('CREATE TEMPORARY TABLE tmp_revision SELECT rev_user_text, rev_timestamp FROM ', wiki, '.revision WHERE rev_page = ? ORDER BY rev_timestamp');
  PREPARE Stmt FROM @SQLStmt;
  EXECUTE Stmt USING @myart;
  DEALLOCATE PREPARE Stmt;
END$$

CREATE PROCEDURE `proc2`(wiki char(50), art integer, dmax int)
BEGIN
    DECLARE currentUser varchar(255);
    DECLARE lastUser varchar(255);
    DECLARE currentTimestamp datetime;
    DECLARE lastTimestamp datetime;
    DECLARE lastWeekTimestamp datetime;
    DECLARE weekCount int;
    DECLARE currentSum int;
    DECLARE currentSumSqr int;
    DECLARE weeklyMean float;
    DECLARE weeklyVariance float;
    DECLARE dt int;
    DECLARE w float;
    DECLARE wdt float;
    DECLARE done INT DEFAULT FALSE;
    
    DECLARE cur CURSOR FOR SELECT rev_user_text, rev_timestamp FROM tmp_revision;
    DECLARE cur1 CURSOR FOR SELECT user, sum, sumsqr FROM sigma;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    SET lastUser = '';
    SET w = 0;
    SET weekCount = 0;
    SET lastWeekTimestamp = 0;
    
    SET SQL_SAFE_UPDATES = 0;
    
    DELETE FROM edge WHERE DATEDIFF(NOW(), lastupdate) >= 7;
    DELETE FROM weeklyedits WHERE DATEDIFF(NOW(), lastupdate) >= 7;
    
    CREATE TEMPORARY TABLE IF NOT EXISTS sigma (user varchar(255), edits int, sum int, sumsqr int, PRIMARY KEY (`user`));
    
    OPEN cur;
    read_loop: LOOP
        FETCH cur INTO currentUser, currentTimestamp;
        
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        IF currentUser <> lastUser AND lastUser <> '' THEN
            IF lastWeekTimestamp = 0 THEN
                SET lastWeekTimestamp = currentTimestamp;
            END IF;
            SELECT count(*) INTO @w FROM sigma WHERE user = currentUser;
            IF @w = 0 THEN
                INSERT INTO sigma VALUES (currentUser, 0, 0, 0);
            END IF;
            
            SET dt = timestampdiff(second, lastTimestamp, currentTimestamp);
            IF dt < dmax THEN
                SET wdt = 1 - (dt / dmax);
            ELSE
                SET wdt = 0;
            END IF;
            
            IF wdt <> 0 THEN
                INSERT INTO edge VALUES (currentUser, lastUser, wdt, currentTimestamp, art, wiki, dmax, NOW());
            END IF;
        END IF;
        
        UPDATE sigma SET edits = edits + 1 WHERE user = currentUser;
        
        IF timestampdiff(day, lastWeekTimestamp, currentTimestamp) >= 7 THEN
            SET weekCount = weekCount + 1;
            
            UPDATE sigma SET sum = sum + edits WHERE user = currentUser;
            UPDATE sigma SET sumsqr = sumsqr + edits*edits WHERE user = currentUser;
            UPDATE sigma SET edits = 0 WHERE user = currentUser;
            
            SET lastWeekTimestamp = currentTimestamp;
        END IF;
        
        SET lastUser = currentUser;
        SET lastTimestamp = currentTimestamp;
    END LOOP;
    CLOSE cur;
    
    SET done = FALSE;
    
    CREATE TEMPORARY TABLE IF NOT EXISTS weekcount (count int);
    INSERT INTO weekcount VALUES (weekCount);
    
    OPEN cur1;
    read_loop: LOOP
        FETCH cur1 INTO currentUser, currentSum, currentSumSqr;
        
        IF done THEN
          LEAVE read_loop;
        END IF;

        IF weekCount > 0 THEN
            SET weeklyMean = currentSum / weekCount;
            SET weeklyVariance = (currentSumSqr - currentSum * weeklyMean) / weekCount;
            
            IF weeklyMean > 0 THEN
                INSERT INTO weeklyedits VALUES (currentUser, SQRT(weeklyVariance)/weeklyMean, art, wiki, NOW());
            END IF;
        END IF;
    END LOOP;
    CLOSE cur1;
    
    SET SQL_SAFE_UPDATES = 1;
END$$

CREATE PROCEDURE `getEdges`(wiki char(50), art integer, dmax int)
BEGIN
  CALL proc1(wiki, art);
  CALL proc2(wiki, art, dmax);
END$$


CREATE TABLE `page` (
  `id` serial NOT NULL,
  `title` text NOT NULL,
  `wiki` varchar(255) NOT NULL,
  `lastupdate` datetime NOT NULL
);

CREATE TABLE `entry` (
  `userid` varchar(255) NOT NULL,
  `timestamp` datetime NOT NULL,
  `article` integer NOT NULL
);

CREATE TABLE `edge` (
  `fromuser` varchar(255) NOT NULL,
  `touser` varchar(255) NOT NULL,
  `weight` float NOT NULL,
  `article` integer NOT NULL,
  `sid` varchar(255) NOT NULL
);

CREATE TABLE `weeklyedits` (
  `user` varchar(255) NOT NULL,
  `article` integer NOT NULL,
  `rsd` float NOT NULL COMMENT 'relative standard deviation of weekly edits'
);

CREATE TABLE `eigenvalue` (
  `article` integer NOT NULL,
  `lambda1` double NOT NULL COMMENT 'smallest eigenvalue',
  `lambda2` double NOT NULL COMMENT 'second smallest eigenvalue',
  `sid` varchar(255) NOT NULL,
  PRIMARY KEY (`article`,`sid`)
);

CREATE TABLE `eigenvector` (
  `user` varchar(255) NOT NULL,
  `article` integer NOT NULL,
  `v1` double NOT NULL COMMENT 'vectorelement to the smallest eigenvalue',
  `v2` double NOT NULL COMMENT 'vectorelement to the 2nd smallest eigenvalue',
  `sid` varchar(255) NOT NULL,
  PRIMARY KEY (`user`,`article`,`sid`)
);

CREATE TABLE `evgen` (
  `sid` varchar(255) NOT NULL,
  `finished` bit(1) NOT NULL,
  PRIMARY KEY (`sid`)
);

-- --------------------------------------------------------------------------------
-- Routine DDL
-- Note: comments before and after the routine body will not be stored by the server
-- --------------------------------------------------------------------------------

DELIMITER $$

CREATE PROCEDURE `getEdges`(art integer, sid varchar(255), dmax int, sd varchar(25), ed varchar(25))
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
    
    DECLARE cur1 CURSOR FOR SELECT user, sum, sumsqr FROM sigma;
    DECLARE cur CURSOR FOR SELECT userid, timestamp FROM entry
    WHERE article = art
    AND timestamp >= COALESCE(STR_TO_DATE(sd, '%Y-%m-%d'), (SELECT min(timestamp) FROM entry WHERE article = art))
    AND timestamp <= COALESCE(STR_TO_DATE(ed, '%Y-%m-%d'), (SELECT max(timestamp) FROM entry WHERE article = art))
    ORDER BY timestamp;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    SET lastUser = '';
    SET w = 0;
    SET weekCount = 0;
    SET lastWeekTimestamp = 0;
    
    SET SQL_SAFE_UPDATES = 0;
    
    DELETE FROM edge WHERE edge.sid = sid AND article = art;
    
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
            
            SELECT count(*) INTO @w FROM edge WHERE fromuser = currentUser AND touser = lastUser
            AND article = art AND edge.sid = sid;
            IF @w > 0 THEN
                UPDATE edge
                SET weight = (weight + wdt)
                WHERE fromuser = currentUser AND touser = lastUser
                AND article = art AND edge.sid = sid;
            ELSE
                IF wdt <> 0 THEN
                    INSERT INTO edge VALUES (currentUser, lastUser, wdt, art, sid);
                END IF;
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
                INSERT INTO weeklyedits VALUES (currentUser, art, SQRT(weeklyVariance)/weeklyMean);
            END IF;
        END IF;
    END LOOP;
    CLOSE cur1;
    
    SET SQL_SAFE_UPDATES = 1;
END


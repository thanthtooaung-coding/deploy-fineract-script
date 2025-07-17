CREATE PROCEDURE `ApplyCascadeDeleteToAllForeignKeys`()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE drop_statement TEXT;
    DECLARE add_statement TEXT;

    DECLARE cur_constraints CURSOR FOR
        SELECT
            CONCAT('ALTER TABLE `', TABLE_NAME, '` DROP FOREIGN KEY `', CONSTRAINT_NAME, '`;') AS drop_sql,
            CONCAT('ALTER TABLE `', TABLE_NAME, '` ADD CONSTRAINT `', CONSTRAINT_NAME,
                   '` FOREIGN KEY (`', GROUP_CONCAT(COLUMN_NAME ORDER BY ORDINAL_POSITION),
                   '`) REFERENCES `', REFERENCED_TABLE_NAME,
                   '` (`', GROUP_CONCAT(REFERENCED_COLUMN_NAME ORDER BY ORDINAL_POSITION),
                   '`) ON DELETE CASCADE ON UPDATE CASCADE;') AS add_sql
        FROM
            INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE
            CONSTRAINT_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL
        GROUP BY
            CONSTRAINT_SCHEMA, TABLE_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    OPEN cur_constraints;

    read_loop: LOOP
        FETCH cur_constraints INTO drop_statement, add_statement;
        IF done THEN
            LEAVE read_loop;
        END IF;

        -- Prepare and execute the DROP statement
        SET @sql = drop_statement;
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;

        -- Prepare and execute the ADD statement
        SET @sql = add_statement;
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;

    END LOOP;

    CLOSE cur_constraints;
END

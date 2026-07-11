-- Verify this returns no rows before applying:
-- SELECT prescription_id, COUNT(*) FROM dispense_record GROUP BY prescription_id HAVING COUNT(*) > 1;
SET @has_unique = (
    SELECT COUNT(*)
    FROM information_schema.table_constraints
    WHERE table_schema = DATABASE()
      AND table_name = 'dispense_record'
      AND constraint_type = 'UNIQUE'
      AND constraint_name IN ('prescription_id', 'uk_dispense_record_prescription')
);
SET @sql = IF(@has_unique = 0,
    'ALTER TABLE dispense_record ADD CONSTRAINT uk_dispense_record_prescription UNIQUE (prescription_id)',
    'SELECT 1');
PREPARE migration_statement FROM @sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

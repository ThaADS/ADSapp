-- Check job_schedules columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'job_schedules'
ORDER BY ordinal_position;

# Cron Job Automation for Game Sessions

This document outlines the complete process to set up, manage, and troubleshoot the automated daily session creation for the Matka Game platform.

**Goal:** Automatically create 'morning' and 'night' game sessions every day at 00:05 AM IST to ensure a continuous result timeline.

---

## 1. Prerequisites

The database must have the `pg_cron` extension enabled to support scheduling.

### Enable Extension and Create Function

Run this in SQL Editor:

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION auto_create_daily_sessions()
RETURNS void AS $$
DECLARE
    target_date DATE;
BEGIN
    -- 1. Get Today's Date in India Time (IST)
    -- Server time is usually UTC, so we strictly cast to IST.
    target_date := (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE;

    -- 2. Create MORNING Session (Always)
    INSERT INTO game_sessions (game_date, session_name)
    VALUES (target_date, 'morning')
    ON CONFLICT (game_date, session_name) DO NOTHING;

    -- 3. Create NIGHT Session (Always)
    INSERT INTO game_sessions (game_date, session_name)
    VALUES (target_date, 'night')
    ON CONFLICT (game_date, session_name) DO NOTHING;

    RAISE NOTICE 'Sessions created for %', target_date;
END;
$$ LANGUAGE plpgsql;
```

---

## 2. Scheduling the Job

We schedule the job to run at **00:05 AM IST**. Since `pg_cron` operates on UTC, we convert the time:

| Timezone | Time |
|----------|------|
| IST | 00:05 AM (Next Day) |
| UTC | 18:35 PM (Current Day) |

### Schedule the Cron Job

Run this in SQL Editor:

```sql
-- 1. Safely remove the old job (Prevent Duplicates)
-- This query checks if the job exists before trying to delete it, avoiding errors.
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'daily_session_maker';

-- 2. Schedule the new job
SELECT cron.schedule(
    'daily_session_maker',  -- Job Name
    '35 18 * * *',          -- Schedule: 18:35 UTC (Daily)
    $$SELECT auto_create_daily_sessions()$$
);
```

---

## 3. Maintenance & Troubleshooting

Use these snippets to manage the job in the future.

### Check if Job is Active

```sql
SELECT * FROM cron.job;
```

### Check Execution History (Logs)

Use this to see if the job ran successfully or failed.

```sql
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 10;
```

### Manual Trigger (Emergency)

If the cron job fails or you need sessions immediately for testing:

```sql
SELECT auto_create_daily_sessions();
```

### Delete the Job

To stop automation permanently:

```sql
SELECT cron.unschedule(jobid) 
FROM cron.job 
WHERE jobname = 'daily_session_maker';
```

---

## 4. Migration Notes (Moving to New DB)

If you migrate this project to a new Supabase project or another PostgreSQL provider:

1. **Re-enable Extension:** `pg_cron` is not on by default. Run step 1 again.

2. **Timezones:** Verify the server's base timezone. The script assumes the server is UTC. If the new server is already in IST, change the schedule from `'35 18 * * *'` to `'05 00 * * *'`.

3. **Permissions:** Ensure the user running the migration has superuser or admin rights, as `pg_cron` requires elevated privileges.
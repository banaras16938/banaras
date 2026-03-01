-- ==========================================
-- STEP 1 of 2: Add enum values (run this FIRST, then run step 2)
-- ==========================================
-- PostgreSQL requires new enum values to be committed
-- before they can be used in constraints/functions.
-- ==========================================

ALTER TYPE bet_category ADD VALUE IF NOT EXISTS 'single_patti';
ALTER TYPE bet_category ADD VALUE IF NOT EXISTS 'double_patti';
ALTER TYPE bet_category ADD VALUE IF NOT EXISTS 'triple_patti';

-- ==========================================
-- NOW: Click "Run" on this query, then open step 2 file.
-- ==========================================

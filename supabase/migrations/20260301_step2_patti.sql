-- ==========================================
-- STEP 2 of 2: Everything else (run AFTER step 1 is committed)
-- ==========================================
-- IMPORTANT: Only run this after step 1 has been executed and committed.
-- ==========================================

-- ==========================================
-- 2. UPDATE game_config (Add payout columns)
-- ==========================================
ALTER TABLE game_config ADD COLUMN IF NOT EXISTS payout_single_patti NUMERIC DEFAULT 1400.0;
ALTER TABLE game_config ADD COLUMN IF NOT EXISTS payout_double_patti NUMERIC DEFAULT 2800.0;
ALTER TABLE game_config ADD COLUMN IF NOT EXISTS payout_triple_patti NUMERIC DEFAULT 8000.0;

-- ==========================================
-- 3. CREATE patti_master TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS patti_master (
    patti_number VARCHAR(3) PRIMARY KEY,
    patti_type TEXT NOT NULL CHECK (patti_type IN ('single_patti', 'double_patti', 'triple_patti')),
    single_digit VARCHAR(1) NOT NULL CHECK (single_digit ~ '^[0-9]$')
);

-- Enable RLS
ALTER TABLE patti_master ENABLE ROW LEVEL SECURITY;

-- Public read access
DO $$ BEGIN
    CREATE POLICY "Read patti_master" ON patti_master FOR SELECT TO authenticated, anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
-- Admin write
DO $$ BEGIN
    CREATE POLICY "Admin full patti_master" ON patti_master FOR ALL TO authenticated USING (is_admin());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ==========================================
-- 3.1 POPULATE patti_master — Single Patti (120 numbers)
-- ==========================================
INSERT INTO patti_master (patti_number, patti_type, single_digit) VALUES
-- Group 1
('128', 'single_patti', '1'), ('137', 'single_patti', '1'), ('146', 'single_patti', '1'),
('236', 'single_patti', '1'), ('245', 'single_patti', '1'), ('290', 'single_patti', '1'),
('380', 'single_patti', '1'), ('470', 'single_patti', '1'), ('489', 'single_patti', '1'),
('560', 'single_patti', '1'), ('678', 'single_patti', '1'), ('579', 'single_patti', '1'),
-- Group 2
('129', 'single_patti', '2'), ('138', 'single_patti', '2'), ('147', 'single_patti', '2'),
('156', 'single_patti', '2'), ('237', 'single_patti', '2'), ('246', 'single_patti', '2'),
('345', 'single_patti', '2'), ('390', 'single_patti', '2'), ('480', 'single_patti', '2'),
('570', 'single_patti', '2'), ('679', 'single_patti', '2'), ('589', 'single_patti', '2'),
-- Group 3
('120', 'single_patti', '3'), ('139', 'single_patti', '3'), ('148', 'single_patti', '3'),
('157', 'single_patti', '3'), ('238', 'single_patti', '3'), ('247', 'single_patti', '3'),
('256', 'single_patti', '3'), ('346', 'single_patti', '3'), ('490', 'single_patti', '3'),
('580', 'single_patti', '3'), ('670', 'single_patti', '3'), ('689', 'single_patti', '3'),
-- Group 4
('130', 'single_patti', '4'), ('149', 'single_patti', '4'), ('158', 'single_patti', '4'),
('167', 'single_patti', '4'), ('239', 'single_patti', '4'), ('248', 'single_patti', '4'),
('257', 'single_patti', '4'), ('347', 'single_patti', '4'), ('356', 'single_patti', '4'),
('590', 'single_patti', '4'), ('680', 'single_patti', '4'), ('789', 'single_patti', '4'),
-- Group 5
('140', 'single_patti', '5'), ('159', 'single_patti', '5'), ('168', 'single_patti', '5'),
('230', 'single_patti', '5'), ('249', 'single_patti', '5'), ('258', 'single_patti', '5'),
('267', 'single_patti', '5'), ('348', 'single_patti', '5'), ('357', 'single_patti', '5'),
('456', 'single_patti', '5'), ('690', 'single_patti', '5'), ('780', 'single_patti', '5'),
-- Group 6
('123', 'single_patti', '6'), ('150', 'single_patti', '6'), ('169', 'single_patti', '6'),
('178', 'single_patti', '6'), ('240', 'single_patti', '6'), ('259', 'single_patti', '6'),
('268', 'single_patti', '6'), ('349', 'single_patti', '6'), ('358', 'single_patti', '6'),
('457', 'single_patti', '6'), ('367', 'single_patti', '6'), ('790', 'single_patti', '6'),
-- Group 7
('124', 'single_patti', '7'), ('160', 'single_patti', '7'), ('179', 'single_patti', '7'),
('250', 'single_patti', '7'), ('269', 'single_patti', '7'), ('278', 'single_patti', '7'),
('340', 'single_patti', '7'), ('359', 'single_patti', '7'), ('368', 'single_patti', '7'),
('458', 'single_patti', '7'), ('467', 'single_patti', '7'), ('890', 'single_patti', '7'),
-- Group 8
('125', 'single_patti', '8'), ('134', 'single_patti', '8'), ('170', 'single_patti', '8'),
('189', 'single_patti', '8'), ('260', 'single_patti', '8'), ('279', 'single_patti', '8'),
('350', 'single_patti', '8'), ('369', 'single_patti', '8'), ('378', 'single_patti', '8'),
('459', 'single_patti', '8'), ('567', 'single_patti', '8'), ('468', 'single_patti', '8'),
-- Group 9
('126', 'single_patti', '9'), ('135', 'single_patti', '9'), ('180', 'single_patti', '9'),
('234', 'single_patti', '9'), ('270', 'single_patti', '9'), ('289', 'single_patti', '9'),
('360', 'single_patti', '9'), ('379', 'single_patti', '9'), ('450', 'single_patti', '9'),
('469', 'single_patti', '9'), ('478', 'single_patti', '9'), ('568', 'single_patti', '9'),
-- Group 0
('127', 'single_patti', '0'), ('136', 'single_patti', '0'), ('145', 'single_patti', '0'),
('190', 'single_patti', '0'), ('235', 'single_patti', '0'), ('280', 'single_patti', '0'),
('370', 'single_patti', '0'), ('479', 'single_patti', '0'), ('460', 'single_patti', '0'),
('569', 'single_patti', '0'), ('389', 'single_patti', '0'), ('578', 'single_patti', '0')
ON CONFLICT DO NOTHING;

-- ==========================================
-- 3.2 POPULATE patti_master — Double Patti (90 numbers)
-- ==========================================
INSERT INTO patti_master (patti_number, patti_type, single_digit) VALUES
-- Group 1
('100', 'double_patti', '1'), ('119', 'double_patti', '1'), ('155', 'double_patti', '1'),
('227', 'double_patti', '1'), ('335', 'double_patti', '1'), ('344', 'double_patti', '1'),
('399', 'double_patti', '1'), ('588', 'double_patti', '1'), ('669', 'double_patti', '1'),
-- Group 2
('200', 'double_patti', '2'), ('110', 'double_patti', '2'), ('228', 'double_patti', '2'),
('255', 'double_patti', '2'), ('336', 'double_patti', '2'), ('499', 'double_patti', '2'),
('660', 'double_patti', '2'), ('688', 'double_patti', '2'), ('778', 'double_patti', '2'),
-- Group 3
('300', 'double_patti', '3'), ('166', 'double_patti', '3'), ('229', 'double_patti', '3'),
('337', 'double_patti', '3'), ('355', 'double_patti', '3'), ('445', 'double_patti', '3'),
('599', 'double_patti', '3'), ('779', 'double_patti', '3'), ('788', 'double_patti', '3'),
-- Group 4
('400', 'double_patti', '4'), ('112', 'double_patti', '4'), ('220', 'double_patti', '4'),
('266', 'double_patti', '4'), ('338', 'double_patti', '4'), ('446', 'double_patti', '4'),
('455', 'double_patti', '4'), ('699', 'double_patti', '4'), ('770', 'double_patti', '4'),
-- Group 5
('500', 'double_patti', '5'), ('113', 'double_patti', '5'), ('122', 'double_patti', '5'),
('177', 'double_patti', '5'), ('339', 'double_patti', '5'), ('366', 'double_patti', '5'),
('447', 'double_patti', '5'), ('799', 'double_patti', '5'), ('889', 'double_patti', '5'),
-- Group 6
('600', 'double_patti', '6'), ('114', 'double_patti', '6'), ('277', 'double_patti', '6'),
('330', 'double_patti', '6'), ('448', 'double_patti', '6'), ('466', 'double_patti', '6'),
('556', 'double_patti', '6'), ('880', 'double_patti', '6'), ('899', 'double_patti', '6'),
-- Group 7
('700', 'double_patti', '7'), ('115', 'double_patti', '7'), ('133', 'double_patti', '7'),
('188', 'double_patti', '7'), ('223', 'double_patti', '7'), ('377', 'double_patti', '7'),
('449', 'double_patti', '7'), ('557', 'double_patti', '7'), ('566', 'double_patti', '7'),
-- Group 8
('800', 'double_patti', '8'), ('116', 'double_patti', '8'), ('224', 'double_patti', '8'),
('233', 'double_patti', '8'), ('288', 'double_patti', '8'), ('440', 'double_patti', '8'),
('477', 'double_patti', '8'), ('558', 'double_patti', '8'), ('990', 'double_patti', '8'),
-- Group 9
('900', 'double_patti', '9'), ('117', 'double_patti', '9'), ('144', 'double_patti', '9'),
('199', 'double_patti', '9'), ('225', 'double_patti', '9'), ('388', 'double_patti', '9'),
('559', 'double_patti', '9'), ('577', 'double_patti', '9'), ('667', 'double_patti', '9'),
-- Group 0
('550', 'double_patti', '0'), ('668', 'double_patti', '0'), ('244', 'double_patti', '0'),
('299', 'double_patti', '0'), ('226', 'double_patti', '0'), ('488', 'double_patti', '0'),
('677', 'double_patti', '0'), ('118', 'double_patti', '0'), ('334', 'double_patti', '0')
ON CONFLICT DO NOTHING;

-- ==========================================
-- 3.3 POPULATE patti_master — Triple Patti (10 numbers)
-- ==========================================
INSERT INTO patti_master (patti_number, patti_type, single_digit) VALUES
('777', 'triple_patti', '1'),
('444', 'triple_patti', '2'),
('111', 'triple_patti', '3'),
('888', 'triple_patti', '4'),
('555', 'triple_patti', '5'),
('222', 'triple_patti', '6'),
('999', 'triple_patti', '7'),
('666', 'triple_patti', '8'),
('333', 'triple_patti', '9'),
('000', 'triple_patti', '0')
ON CONFLICT DO NOTHING;

-- ==========================================
-- 4. UPDATE check_number_format CONSTRAINT
-- ==========================================
ALTER TABLE bets DROP CONSTRAINT IF EXISTS check_number_format;
ALTER TABLE bets ADD CONSTRAINT check_number_format CHECK (
    (category = 'single' AND LENGTH(selected_number) = 1 AND selected_number ~ '^[0-9]$') OR
    (category = 'jodi' AND LENGTH(selected_number) = 2 AND selected_number ~ '^[0-9]{2}$') OR
    (category IN ('single_patti', 'double_patti', 'triple_patti') AND LENGTH(selected_number) = 3 AND selected_number ~ '^[0-9]{3}$')
);

-- ==========================================
-- 5. REPLACE process_winners FUNCTION
-- ==========================================
CREATE OR REPLACE FUNCTION process_winners(
    p_session_id UUID,
    p_target bet_target
)
RETURNS TABLE(updated_count INTEGER, total_payout NUMERIC) AS $$
DECLARE
    v_session game_sessions%ROWTYPE;
    v_config game_config%ROWTYPE;
    v_updated INTEGER := 0;
    v_payout NUMERIC := 0;
    v_temp_count INTEGER;
    v_patti_type TEXT;
    v_patti_multiplier NUMERIC;
BEGIN
    -- Get session and config
    SELECT * INTO v_session FROM game_sessions WHERE id = p_session_id;
    SELECT * INTO v_config FROM game_config WHERE id = 1;
    
    IF v_session IS NULL THEN
        RAISE EXCEPTION 'Game session not found';
    END IF;
    
    -- Process OPEN bets
    IF p_target = 'open' AND v_session.open_triple IS NOT NULL THEN

        -- Single Patti winners (open)
        UPDATE bets SET 
            status = 'won',
            winning_amount = amount * v_config.payout_single_patti
        WHERE game_session_id = p_session_id 
            AND target = 'open' 
            AND category = 'single_patti'
            AND selected_number = v_session.open_triple
            AND status = 'pending';
        GET DIAGNOSTICS v_temp_count = ROW_COUNT;
        v_updated := v_updated + v_temp_count;

        -- Double Patti winners (open)
        UPDATE bets SET 
            status = 'won',
            winning_amount = amount * v_config.payout_double_patti
        WHERE game_session_id = p_session_id 
            AND target = 'open' 
            AND category = 'double_patti'
            AND selected_number = v_session.open_triple
            AND status = 'pending';
        GET DIAGNOSTICS v_temp_count = ROW_COUNT;
        v_updated := v_updated + v_temp_count;

        -- Triple Patti winners (open)
        UPDATE bets SET 
            status = 'won',
            winning_amount = amount * v_config.payout_triple_patti
        WHERE game_session_id = p_session_id 
            AND target = 'open' 
            AND category = 'triple_patti'
            AND selected_number = v_session.open_triple
            AND status = 'pending';
        GET DIAGNOSTICS v_temp_count = ROW_COUNT;
        v_updated := v_updated + v_temp_count;

        -- Single winners (open)
        UPDATE bets SET 
            status = 'won',
            winning_amount = amount * v_config.payout_single
        WHERE game_session_id = p_session_id 
            AND target = 'open' 
            AND category = 'single'
            AND selected_number = v_session.open_single
            AND status = 'pending';
        GET DIAGNOSTICS v_temp_count = ROW_COUNT;
        v_updated := v_updated + v_temp_count;
        
        -- Mark losers (open)
        UPDATE bets SET status = 'lost'
        WHERE game_session_id = p_session_id 
            AND target = 'open' 
            AND status = 'pending';
    END IF;
    
    -- Process CLOSE bets
    IF p_target = 'close' AND v_session.close_triple IS NOT NULL THEN

        -- Single Patti winners (close)
        UPDATE bets SET 
            status = 'won',
            winning_amount = amount * v_config.payout_single_patti
        WHERE game_session_id = p_session_id 
            AND target = 'close' 
            AND category = 'single_patti'
            AND selected_number = v_session.close_triple
            AND status = 'pending';
        GET DIAGNOSTICS v_temp_count = ROW_COUNT;
        v_updated := v_updated + v_temp_count;

        -- Double Patti winners (close)
        UPDATE bets SET 
            status = 'won',
            winning_amount = amount * v_config.payout_double_patti
        WHERE game_session_id = p_session_id 
            AND target = 'close' 
            AND category = 'double_patti'
            AND selected_number = v_session.close_triple
            AND status = 'pending';
        GET DIAGNOSTICS v_temp_count = ROW_COUNT;
        v_updated := v_updated + v_temp_count;

        -- Triple Patti winners (close)
        UPDATE bets SET 
            status = 'won',
            winning_amount = amount * v_config.payout_triple_patti
        WHERE game_session_id = p_session_id 
            AND target = 'close' 
            AND category = 'triple_patti'
            AND selected_number = v_session.close_triple
            AND status = 'pending';
        GET DIAGNOSTICS v_temp_count = ROW_COUNT;
        v_updated := v_updated + v_temp_count;

        -- Single winners (close)
        UPDATE bets SET 
            status = 'won',
            winning_amount = amount * v_config.payout_single
        WHERE game_session_id = p_session_id 
            AND target = 'close' 
            AND category = 'single'
            AND selected_number = v_session.close_single
            AND status = 'pending';
        GET DIAGNOSTICS v_temp_count = ROW_COUNT;
        v_updated := v_updated + v_temp_count;
        
        -- Jodi winners (only on close, applies to jodi_full target)
        IF v_session.jodi_result IS NOT NULL THEN
            UPDATE bets SET 
                status = 'won',
                winning_amount = amount * v_config.payout_jodi
            WHERE game_session_id = p_session_id 
                AND target = 'jodi_full' 
                AND category = 'jodi'
                AND selected_number = v_session.jodi_result
                AND status = 'pending';
            GET DIAGNOSTICS v_temp_count = ROW_COUNT;
            v_updated := v_updated + v_temp_count;
            
            -- Mark jodi losers
            UPDATE bets SET status = 'lost'
            WHERE game_session_id = p_session_id 
                AND target = 'jodi_full' 
                AND status = 'pending';
        END IF;
        
        -- Mark close losers
        UPDATE bets SET status = 'lost'
        WHERE game_session_id = p_session_id 
            AND target = 'close' 
            AND status = 'pending';
    END IF;
    
    -- Calculate total payout
    SELECT COALESCE(SUM(winning_amount), 0) INTO v_payout
    FROM bets
    WHERE game_session_id = p_session_id AND status = 'won';
    
    RETURN QUERY SELECT v_updated, v_payout;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 6. REPLACE view_liability_report VIEW
-- ==========================================
DROP VIEW IF EXISTS view_liability_report;
CREATE OR REPLACE VIEW view_liability_report AS
SELECT 
    gs.id as game_session_id,
    gs.game_date,
    gs.session_name,
    b.category,
    b.target,
    b.selected_number,
    COUNT(b.id) as bet_count,
    SUM(b.amount) as total_bet_amount,
    gc.payout_single,
    gc.payout_jodi,
    gc.payout_single_patti,
    gc.payout_double_patti,
    gc.payout_triple_patti,
    CASE 
        WHEN b.category = 'single' THEN SUM(b.amount) * gc.payout_single
        WHEN b.category = 'jodi' THEN SUM(b.amount) * gc.payout_jodi
        WHEN b.category = 'single_patti' THEN SUM(b.amount) * gc.payout_single_patti
        WHEN b.category = 'double_patti' THEN SUM(b.amount) * gc.payout_double_patti
        WHEN b.category = 'triple_patti' THEN SUM(b.amount) * gc.payout_triple_patti
    END as potential_liability
FROM bets b
JOIN game_sessions gs ON b.game_session_id = gs.id
CROSS JOIN game_config gc
WHERE b.status = 'pending'
GROUP BY gs.id, gs.game_date, gs.session_name, b.category, b.target, b.selected_number, 
         gc.payout_single, gc.payout_jodi,
         gc.payout_single_patti, gc.payout_double_patti, gc.payout_triple_patti;

-- ==========================================
-- 7. CREATE INDEX on patti_master
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_patti_master_type ON patti_master(patti_type);
CREATE INDEX IF NOT EXISTS idx_patti_master_single ON patti_master(single_digit);

-- ==========================================
-- DONE!
-- Verify: SELECT COUNT(*) FROM patti_master; -- Should return 220
-- Verify: SELECT * FROM game_config; -- Should show new payout columns
-- ==========================================

-- ==========================================
-- MATKA GAME - SUPABASE SCHEMA (PRODUCTION)
-- ==========================================
-- Run this in Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- This is a FINANCIAL APPLICATION - handle with care!
-- ==========================================

-- ==========================================
-- 1. CLEANUP (Reset)
-- ==========================================
DROP VIEW IF EXISTS view_staff_performance;
DROP VIEW IF EXISTS view_liability_report;
DROP TABLE IF EXISTS bets CASCADE;
DROP TABLE IF EXISTS holidays CASCADE;
DROP TABLE IF EXISTS game_sessions CASCADE;
DROP TABLE IF EXISTS game_schedules CASCADE;
DROP TABLE IF EXISTS players CASCADE;
DROP TABLE IF EXISTS game_config CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TYPE IF EXISTS bet_status CASCADE;
DROP TYPE IF EXISTS bet_target CASCADE;
DROP TYPE IF EXISTS bet_category CASCADE;
DROP TYPE IF EXISTS session_type CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- ==========================================
-- 2. ENUMS
-- ==========================================
CREATE TYPE user_role AS ENUM ('admin', 'staff');
CREATE TYPE session_type AS ENUM ('morning', 'night');
CREATE TYPE bet_category AS ENUM ('single', 'jodi', 'triple');
CREATE TYPE bet_target AS ENUM ('open', 'close', 'jodi_full'); 
CREATE TYPE bet_status AS ENUM ('pending', 'won', 'lost', 'refunded');

-- ==========================================
-- 3. CORE TABLES
-- ==========================================

-- 3.1 GAME SCHEDULES (Dynamic Timing Control)
-- Admin can edit this table to change lock times instantly.
CREATE TABLE game_schedules (
    session_name session_type PRIMARY KEY, -- 'morning' or 'night'
    
    -- When does the market open?
    start_time TIME NOT NULL DEFAULT '09:00:00',
    
    -- OPEN & JODI Timing
    open_bet_freeze_time TIME NOT NULL, -- e.g., 12:30 PM
    open_result_time TIME NOT NULL,     -- e.g., 01:00 PM
    
    -- CLOSE Timing
    close_bet_resume_time TIME,         -- Optional: If you want a break between Open Result and Close Betting
    close_bet_freeze_time TIME NOT NULL,-- e.g., 02:30 PM
    close_result_time TIME NOT NULL     -- e.g., 03:00 PM
);

-- Insert Default Schedules based on SRS
INSERT INTO game_schedules (session_name, start_time, open_bet_freeze_time, open_result_time, close_bet_freeze_time, close_result_time)
VALUES 
('morning', '09:00:00', '12:30:00', '13:00:00', '14:30:00', '15:00:00'),
('night',   '09:00:00', '17:30:00', '18:00:00', '19:30:00', '20:00:00');

-- 3.2 HOLIDAYS
CREATE TABLE holidays (
    holiday_date DATE PRIMARY KEY,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.3 PROFILES (Staff/Admin Users)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    name TEXT,
    phone TEXT,
    role user_role DEFAULT 'staff',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ
);

-- 3.4 PLAYERS (End users who place bets through staff)
CREATE TABLE players (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT, 
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster player lookups
CREATE INDEX idx_players_created_by ON players(created_by);
CREATE INDEX idx_players_phone ON players(phone);

-- 3.5 GAME CONFIG (Payouts)
CREATE TABLE game_config (
    id INT PRIMARY KEY DEFAULT 1,
    payout_single NUMERIC DEFAULT 9.0,
    payout_jodi NUMERIC DEFAULT 90.0,
    payout_triple NUMERIC DEFAULT 800.0
);
INSERT INTO game_config (id) VALUES (1) ON CONFLICT DO NOTHING;

-- 3.6 GAME SESSIONS (Daily Instances)
CREATE TABLE game_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    game_date DATE NOT NULL,
    session_name session_type NOT NULL,
    open_triple VARCHAR(3),
    open_single VARCHAR(1),
    close_triple VARCHAR(3),
    close_single VARCHAR(1),
    jodi_result VARCHAR(2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(game_date, session_name)
);

-- Create indexes for faster lookups
CREATE INDEX idx_game_sessions_date ON game_sessions(game_date);
CREATE INDEX idx_game_sessions_session ON game_sessions(session_name);

-- 3.7 BETS
CREATE TABLE bets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    game_session_id UUID REFERENCES game_sessions(id) NOT NULL,
    player_id UUID REFERENCES players(id) NOT NULL,
    staff_id UUID REFERENCES profiles(id) NOT NULL, 
    category bet_category NOT NULL, 
    target bet_target NOT NULL, 
    selected_number VARCHAR(3) NOT NULL, 
    amount NUMERIC NOT NULL CHECK (amount > 0),
    status bet_status DEFAULT 'pending',
    winning_amount NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Strict validation on number format
    CONSTRAINT check_number_format CHECK (
        (category = 'single' AND LENGTH(selected_number) = 1 AND selected_number ~ '^[0-9]$') OR
        (category = 'jodi' AND LENGTH(selected_number) = 2 AND selected_number ~ '^[0-9]{2}$') OR
        (category = 'triple' AND LENGTH(selected_number) = 3 AND selected_number ~ '^[0-9]{3}$')
    )
);

-- Create indexes for faster lookups
CREATE INDEX idx_bets_game_session ON bets(game_session_id);
CREATE INDEX idx_bets_staff ON bets(staff_id);
CREATE INDEX idx_bets_player ON bets(player_id);
CREATE INDEX idx_bets_status ON bets(status);
CREATE INDEX idx_bets_created_at ON bets(created_at);

-- ==========================================
-- 4. DYNAMIC VALIDATION LOGIC
-- ==========================================

-- Trigger: Checks Staff Active, Holiday, AND Dynamic Timings
CREATE OR REPLACE FUNCTION check_betting_eligibility()
RETURNS TRIGGER AS $$
DECLARE
    is_staff_active BOOLEAN;
    game_date_val DATE;
    session_val session_type;
    schedule_row game_schedules%ROWTYPE;
    current_time_val TIME;
    server_now TIMESTAMPTZ := NOW() AT TIME ZONE 'Asia/Kolkata';
BEGIN
    -- 1. Check Staff Active
    SELECT is_active INTO is_staff_active FROM profiles WHERE id = NEW.staff_id;
    IF is_staff_active IS NULL THEN
        RAISE EXCEPTION 'Staff account not found.';
    END IF;
    IF is_staff_active = FALSE THEN
        RAISE EXCEPTION 'Your account is deactivated.';
    END IF;

    -- 2. Get Game Details
    SELECT game_date, session_name INTO game_date_val, session_val 
    FROM game_sessions WHERE id = NEW.game_session_id;
    
    IF game_date_val IS NULL THEN
        RAISE EXCEPTION 'Game session not found.';
    END IF;

    -- 3. Check Holiday
    IF EXISTS (SELECT 1 FROM holidays WHERE holiday_date = game_date_val) THEN
        RAISE EXCEPTION 'Betting closed. Today is a Holiday.';
    END IF;

    -- 4. Get Dynamic Schedule for this Session (Morning/Night)
    SELECT * INTO schedule_row FROM game_schedules WHERE session_name = session_val;
    
    -- Extract just the time part from current timestamp
    current_time_val := server_now::TIME;

    -- 5. VALIDATE TIME WINDOWS based on Target (Open/Close)
    
    -- Case A: Bet is for OPEN or JODI (e.g., Morning Open)
    IF NEW.target IN ('open', 'jodi_full') THEN
        IF current_time_val < schedule_row.start_time OR current_time_val >= schedule_row.open_bet_freeze_time THEN
            RAISE EXCEPTION '% Open/Jodi betting is closed. (Open: % - %)', 
                session_val, schedule_row.start_time, schedule_row.open_bet_freeze_time;
        END IF;
    END IF;

    -- Case B: Bet is for CLOSE (e.g., Morning Close)
    -- Close betting is allowed from start_time until close_bet_freeze_time (no pause)
    IF NEW.target = 'close' THEN
        IF current_time_val < schedule_row.start_time OR current_time_val >= schedule_row.close_bet_freeze_time THEN
            RAISE EXCEPTION '% Close betting is closed. (Ends: %)', 
                session_val, schedule_row.close_bet_freeze_time;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_betting_rules
BEFORE INSERT ON bets
FOR EACH ROW
EXECUTE FUNCTION check_betting_eligibility();

-- ==========================================
-- 5. ANALYTICS & RESULT AUTOMATION
-- ==========================================

-- 5.1 Staff Performance View
CREATE OR REPLACE VIEW view_staff_performance AS
SELECT 
    p.email as staff_email, 
    b.staff_id, 
    gs.game_date,
    gs.session_name,
    COUNT(b.id) as total_bets_placed,
    SUM(b.amount) as total_collection,
    SUM(CASE WHEN b.status = 'won' THEN b.winning_amount ELSE 0 END) as total_payouts_given,
    SUM(b.amount) - SUM(CASE WHEN b.status = 'won' THEN b.winning_amount ELSE 0 END) as profit
FROM bets b
JOIN profiles p ON b.staff_id = p.id
JOIN game_sessions gs ON b.game_session_id = gs.id
GROUP BY p.email, b.staff_id, gs.game_date, gs.session_name;

-- 5.2 Liability Report View (For Admin Result Selection)
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
    gc.payout_triple,
    CASE 
        WHEN b.category = 'single' THEN SUM(b.amount) * gc.payout_single
        WHEN b.category = 'jodi' THEN SUM(b.amount) * gc.payout_jodi
        WHEN b.category = 'triple' THEN SUM(b.amount) * gc.payout_triple
    END as potential_liability
FROM bets b
JOIN game_sessions gs ON b.game_session_id = gs.id
CROSS JOIN game_config gc
WHERE b.status = 'pending'
GROUP BY gs.id, gs.game_date, gs.session_name, b.category, b.target, b.selected_number, 
         gc.payout_single, gc.payout_jodi, gc.payout_triple;

-- 5.3 Auto-Calculate Results
CREATE OR REPLACE FUNCTION calculate_game_results()
RETURNS TRIGGER AS $$
DECLARE 
    sum_open INTEGER; 
    sum_close INTEGER;
BEGIN
    -- Calculate Open Single from Open Triple
    IF NEW.open_triple IS NOT NULL AND NEW.open_triple ~ '^[0-9]{3}$' THEN
        sum_open := (
            SUBSTRING(NEW.open_triple FROM 1 FOR 1)::INT + 
            SUBSTRING(NEW.open_triple FROM 2 FOR 1)::INT + 
            SUBSTRING(NEW.open_triple FROM 3 FOR 1)::INT
        );
        NEW.open_single := RIGHT(sum_open::TEXT, 1);
    END IF;
    
    -- Calculate Close Single from Close Triple
    IF NEW.close_triple IS NOT NULL AND NEW.close_triple ~ '^[0-9]{3}$' THEN
        sum_close := (
            SUBSTRING(NEW.close_triple FROM 1 FOR 1)::INT + 
            SUBSTRING(NEW.close_triple FROM 2 FOR 1)::INT + 
            SUBSTRING(NEW.close_triple FROM 3 FOR 1)::INT
        );
        NEW.close_single := RIGHT(sum_close::TEXT, 1);
    END IF;
    
    -- Calculate Jodi from Open and Close Singles
    IF NEW.open_single IS NOT NULL AND NEW.close_single IS NOT NULL THEN
        NEW.jodi_result := NEW.open_single || NEW.close_single;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_results
BEFORE INSERT OR UPDATE ON game_sessions
FOR EACH ROW EXECUTE FUNCTION calculate_game_results();

-- 5.4 Calculate Winners Function
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
BEGIN
    -- Get session and config
    SELECT * INTO v_session FROM game_sessions WHERE id = p_session_id;
    SELECT * INTO v_config FROM game_config WHERE id = 1;
    
    IF v_session IS NULL THEN
        RAISE EXCEPTION 'Game session not found';
    END IF;
    
    -- Process OPEN bets
    IF p_target = 'open' AND v_session.open_triple IS NOT NULL THEN
        -- Triple winners (open)
        UPDATE bets SET 
            status = 'won',
            winning_amount = amount * v_config.payout_triple
        WHERE game_session_id = p_session_id 
            AND target = 'open' 
            AND category = 'triple'
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
        -- Triple winners (close)
        UPDATE bets SET 
            status = 'won',
            winning_amount = amount * v_config.payout_triple
        WHERE game_session_id = p_session_id 
            AND target = 'close' 
            AND category = 'triple'
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
-- 6. SECURITY (RLS)
-- ==========================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_config ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is admin (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PROFILES POLICIES (Fixed - no circular dependency)
-- All authenticated users can read their own profile
CREATE POLICY "Users read own profile" ON profiles 
FOR SELECT TO authenticated 
USING (id = auth.uid());

-- Admins can read all profiles (uses security definer function)
CREATE POLICY "Admin read all profiles" ON profiles 
FOR SELECT TO authenticated 
USING (is_admin());

-- Admins can modify profiles
CREATE POLICY "Admin manage profiles" ON profiles 
FOR ALL TO authenticated 
USING (is_admin())
WITH CHECK (is_admin());

-- BETS POLICIES
CREATE POLICY "Staff insert bets" ON bets FOR INSERT TO authenticated WITH CHECK (auth.uid() = staff_id);
CREATE POLICY "Staff read own bets" ON bets FOR SELECT TO authenticated USING (staff_id = auth.uid());
CREATE POLICY "Admin full bets" ON bets FOR ALL TO authenticated USING (is_admin());

-- PUBLIC READ POLICIES
CREATE POLICY "Read holidays" ON holidays FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Read schedules" ON game_schedules FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Read game config" ON game_config FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Read game sessions" ON game_sessions FOR SELECT TO authenticated, anon USING (true);

-- ADMIN WRITE POLICIES
CREATE POLICY "Admin full holidays" ON holidays FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "Admin full sessions" ON game_sessions FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "Admin update schedules" ON game_schedules FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "Admin full game config" ON game_config FOR ALL TO authenticated USING (is_admin());

-- PLAYERS POLICIES
CREATE POLICY "Staff manage own players" ON players FOR ALL TO authenticated 
USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "Admin full players" ON players FOR ALL TO authenticated USING (is_admin());

-- ==========================================
-- 7. SETUP HELPER (Auto Profile Creation)
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, is_active)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'name', NULL),
    'staff', 
    TRUE
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==========================================
-- 8. HELPER FUNCTIONS
-- ==========================================

-- Get or create today's game session (SECURITY DEFINER allows staff to create sessions)
CREATE OR REPLACE FUNCTION get_or_create_session(
    p_date DATE,
    p_session session_type
)
RETURNS UUID AS $$
DECLARE
    v_session_id UUID;
BEGIN
    -- Try to get existing session
    SELECT id INTO v_session_id 
    FROM game_sessions 
    WHERE game_date = p_date AND session_name = p_session;
    
    -- Create if not exists
    IF v_session_id IS NULL THEN
        INSERT INTO game_sessions (game_date, session_name)
        VALUES (p_date, p_session)
        RETURNING id INTO v_session_id;
    END IF;
    
    RETURN v_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- IMPORTANT: MANUAL ADMIN SETUP
-- ==========================================
-- After creating your first user in Supabase Auth,
-- update their role to 'admin' manually:
--
-- UPDATE profiles 
-- SET role = 'admin' 
-- WHERE email = 'your-admin-email@example.com';
-- ==========================================

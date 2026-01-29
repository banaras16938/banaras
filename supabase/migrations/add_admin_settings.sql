-- ==========================================
-- ADMIN SETTINGS TABLE (for PIN and other admin configs)
-- ==========================================
-- Run this in Supabase SQL Editor

-- Create admin_settings table
CREATE TABLE IF NOT EXISTS admin_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default PIN
INSERT INTO admin_settings (key, value) 
VALUES ('hisab_kitab_pin', '6747')
ON CONFLICT (key) DO NOTHING;

-- Enable RLS
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Only admin can read/write admin_settings
CREATE POLICY "Admin read admin_settings" ON admin_settings 
FOR SELECT TO authenticated 
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin write admin_settings" ON admin_settings 
FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

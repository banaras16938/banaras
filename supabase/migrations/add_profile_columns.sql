-- Migration: Add missing columns to profiles table
-- Run this in Supabase SQL Editor if you have existing data

-- Add name column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS name TEXT;

-- Add phone column  
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- Add last_login column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- Update the handle_new_user trigger to capture name from user metadata
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

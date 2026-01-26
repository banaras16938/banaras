-- Migration: Add address column to profiles table
-- Date: 2026-01-26
-- Description: Adds an optional address field for staff members

-- Add address column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS address TEXT NULL;

-- Add comment for documentation
COMMENT ON COLUMN profiles.address IS 'Physical address of the staff member';

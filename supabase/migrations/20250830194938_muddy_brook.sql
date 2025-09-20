/*
  # Add Period Flexibility to Properties and Leases

  1. Schema Changes
    - Add `period_type` column to properties table (minutes, hourly, daily, weekly, monthly, yearly)
    - Add `period_count` column to leases table for number of periods
    - Add `auto_calculate_end_date` column to leases table for calculation preference

  2. Data Migration
    - Set default period_type to 'monthly' for existing properties
    - Maintain backward compatibility with existing lease data

  3. Security
    - No changes to existing RLS policies needed
*/

-- Add period_type to properties table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'period_type'
  ) THEN
    ALTER TABLE properties ADD COLUMN period_type text DEFAULT 'monthly';
    ALTER TABLE properties ADD CONSTRAINT properties_period_type_check 
      CHECK (period_type IN ('minutes', 'hourly', 'daily', 'weekly', 'monthly', 'yearly'));
  END IF;
END $$;

-- Add period_count and auto_calculate_end_date to leases table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leases' AND column_name = 'period_count'
  ) THEN
    ALTER TABLE leases ADD COLUMN period_count integer;
    ALTER TABLE leases ADD COLUMN auto_calculate_end_date boolean DEFAULT false;
  END IF;
END $$;

-- Update existing properties to have monthly period type
UPDATE properties SET period_type = 'monthly' WHERE period_type IS NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_properties_period_type ON properties(period_type);
-- Alter existing distributor_intakes table to fix VARCHAR constraints
-- Run this script to update the existing database schema

-- Drop dependent views first
DROP VIEW IF EXISTS high_value_distributors CASCADE;
DROP VIEW IF EXISTS distributor_summary CASCADE;

-- Increase submission_status field size
ALTER TABLE distributor_intakes 
ALTER COLUMN submission_status TYPE VARCHAR(20);

-- Increase province_state field size
ALTER TABLE distributor_intakes 
ALTER COLUMN province_state TYPE VARCHAR(50);

-- Add any missing columns if they don't exist
-- Note: These will fail silently if columns already exist

-- Check if computed_score column exists, add if missing
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='distributor_intakes' AND column_name='computed_score') THEN
        ALTER TABLE distributor_intakes ADD COLUMN computed_score INTEGER;
    END IF;
END $$;

-- Check if computed_tier column exists, add if missing
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='distributor_intakes' AND column_name='computed_tier') THEN
        ALTER TABLE distributor_intakes ADD COLUMN computed_tier VARCHAR(50);
    END IF;
END $$;

-- Check if submitted_at column exists, add if missing
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='distributor_intakes' AND column_name='submitted_at') THEN
        ALTER TABLE distributor_intakes ADD COLUMN submitted_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Recreate the views after column alterations
CREATE VIEW distributor_summary AS
SELECT 
  id,
  company,
  first_name,
  last_name,
  email,
  country,
  city,
  province_state,
  role,
  submission_status,
  computed_score,
  computed_tier,
  -- Total network reach
  (network_independents + network_chains + network_convenience + 
   network_beauty_supply + network_pharmacies + network_food_service + 
   network_wholesalers + network_marketplaces + network_specialty) AS total_network_reach,
  -- Service requests count
  (CASE WHEN service_starter_brand_kit THEN 1 ELSE 0 END +
   CASE WHEN service_retail_ready THEN 1 ELSE 0 END +
   CASE WHEN service_ecom_launch THEN 1 ELSE 0 END +
   CASE WHEN service_photo_video THEN 1 ELSE 0 END +
   CASE WHEN service_social_media THEN 1 ELSE 0 END +
   CASE WHEN service_trade_readiness THEN 1 ELSE 0 END) AS services_requested,
  created_at,
  submitted_at
FROM distributor_intakes;

-- Recreate high-value distributors view
CREATE VIEW high_value_distributors AS
SELECT *
FROM distributor_summary
WHERE computed_score >= 75
  AND submission_status = 'final'
ORDER BY computed_score DESC, submitted_at DESC;

COMMIT;
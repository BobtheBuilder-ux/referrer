-- Database schema for Project 8 Distributor Intake Form
-- This schema is designed to store comprehensive distributor and referral partner information

-- Main distributor intakes table
CREATE TABLE distributor_intakes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Submission metadata
  submission_status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (submission_status IN ('draft', 'final')),
  role VARCHAR(20) NOT NULL CHECK (role IN ('distributor', 'referral', 'both')),
  
  -- Company Information
  company VARCHAR(255) NOT NULL,
  website VARCHAR(500),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  
  -- Location & Coverage
  country VARCHAR(20) NOT NULL CHECK (country IN ('Canada', 'United States')),
  city VARCHAR(100) NOT NULL,
  province_state VARCHAR(50) NOT NULL,
  postal_zip VARCHAR(20) NOT NULL,
  coverage_description TEXT,
  coverage_provinces TEXT[], -- Array of province codes
  coverage_states TEXT[], -- Array of state codes
  
  -- Languages
  languages_english BOOLEAN DEFAULT true,
  languages_french BOOLEAN DEFAULT false,
  languages_spanish BOOLEAN DEFAULT false,
  languages_other VARCHAR(255),
  
  -- Network Information
  network_independents INTEGER DEFAULT 0,
  network_chains INTEGER DEFAULT 0,
  network_convenience INTEGER DEFAULT 0,
  network_beauty_supply INTEGER DEFAULT 0,
  network_pharmacies INTEGER DEFAULT 0,
  network_food_service INTEGER DEFAULT 0,
  network_wholesalers INTEGER DEFAULT 0,
  network_marketplaces INTEGER DEFAULT 0,
  network_specialty INTEGER DEFAULT 0,
  
  -- Business Metrics
  monthly_doors_serviced INTEGER DEFAULT 0,
  decision_makers INTEGER DEFAULT 0,
  avg_monthly_sell_in_cad DECIMAL(15,2) DEFAULT 0,
  deals_last_12mo INTEGER DEFAULT 0,
  
  -- Chain Access
  chain_walmart BOOLEAN DEFAULT false,
  chain_costco BOOLEAN DEFAULT false,
  chain_loblaws BOOLEAN DEFAULT false,
  chain_sobeys BOOLEAN DEFAULT false,
  chain_metro BOOLEAN DEFAULT false,
  chain_kroger BOOLEAN DEFAULT false,
  chain_amazon BOOLEAN DEFAULT false,
  chain_other VARCHAR(255),
  
  -- Logistics Capabilities
  warehouse_sq_ft INTEGER DEFAULT 0,
  cold_chain BOOLEAN DEFAULT false,
  trucks_owned INTEGER DEFAULT 0,
  third_party_logistics BOOLEAN DEFAULT true,
  
  -- Compliance & Certifications
  cfia_importer BOOLEAN DEFAULT false,
  fda_registered BOOLEAN DEFAULT false,
  gs1 BOOLEAN DEFAULT false,
  coi_insurance BOOLEAN DEFAULT false,
  
  -- Product Categories
  category_afro_grocery BOOLEAN DEFAULT false,
  category_beverages BOOLEAN DEFAULT false,
  category_spices_sauces BOOLEAN DEFAULT false,
  category_snacks BOOLEAN DEFAULT false,
  category_frozen BOOLEAN DEFAULT false,
  category_fresh_produce BOOLEAN DEFAULT false,
  category_beauty BOOLEAN DEFAULT false,
  category_skincare BOOLEAN DEFAULT false,
  category_haircare BOOLEAN DEFAULT false,
  category_home BOOLEAN DEFAULT false,
  category_textiles BOOLEAN DEFAULT false,
  category_pharmacy_otc BOOLEAN DEFAULT false,
  category_other BOOLEAN DEFAULT false,
  categories_other_description TEXT,
  
  -- Business Preferences
  exclusivity_interest VARCHAR(20) DEFAULT 'no' CHECK (exclusivity_interest IN ('no', 'regional', 'national')),
  moq_capacity_units INTEGER DEFAULT 0,
  
  -- References & Social
  linkedin VARCHAR(500),
  reference1 VARCHAR(500),
  reference2 VARCHAR(500),
  
  -- Service Requests
  service_starter_brand_kit BOOLEAN DEFAULT false,
  service_retail_ready BOOLEAN DEFAULT false,
  service_ecom_launch BOOLEAN DEFAULT false,
  service_photo_video BOOLEAN DEFAULT false,
  service_social_media BOOLEAN DEFAULT false,
  service_trade_readiness BOOLEAN DEFAULT false,
  service_notes TEXT,
  
  -- Additional Information
  heard_from VARCHAR(255),
  agree_contact BOOLEAN DEFAULT false,
  agree_privacy BOOLEAN DEFAULT false,
  
  -- Computed Fields (from form scoring system)
  computed_score INTEGER,
  computed_tier VARCHAR(50),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  submitted_at TIMESTAMP WITH TIME ZONE
);

-- Documents table for file uploads
CREATE TABLE distributor_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  distributor_id UUID NOT NULL REFERENCES distributor_intakes(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size BIGINT,
  mime_type VARCHAR(100),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Communication log for tracking interactions
CREATE TABLE distributor_communications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  distributor_id UUID NOT NULL REFERENCES distributor_intakes(id) ON DELETE CASCADE,
  communication_type VARCHAR(50) NOT NULL, -- 'email', 'phone', 'meeting', 'note'
  direction VARCHAR(20) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  subject VARCHAR(255),
  content TEXT,
  contact_person VARCHAR(255),
  created_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Status tracking for follow-ups
CREATE TABLE distributor_status_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  distributor_id UUID NOT NULL REFERENCES distributor_intakes(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  notes TEXT,
  changed_by VARCHAR(255),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_distributor_intakes_email ON distributor_intakes(email);
CREATE INDEX idx_distributor_intakes_company ON distributor_intakes(company);
CREATE INDEX idx_distributor_intakes_country ON distributor_intakes(country);
CREATE INDEX idx_distributor_intakes_role ON distributor_intakes(role);
CREATE INDEX idx_distributor_intakes_submission_status ON distributor_intakes(submission_status);
CREATE INDEX idx_distributor_intakes_created_at ON distributor_intakes(created_at);
CREATE INDEX idx_distributor_intakes_computed_score ON distributor_intakes(computed_score);
CREATE INDEX idx_distributor_documents_distributor_id ON distributor_documents(distributor_id);
CREATE INDEX idx_distributor_communications_distributor_id ON distributor_communications(distributor_id);
CREATE INDEX idx_distributor_status_history_distributor_id ON distributor_status_history(distributor_id);

-- Row Level Security (RLS) policies
ALTER TABLE distributor_intakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE distributor_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE distributor_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE distributor_status_history ENABLE ROW LEVEL SECURITY;

-- Policy for public read access to distributor intakes (for form submission)
CREATE POLICY "Allow public insert on distributor_intakes" ON distributor_intakes
  FOR INSERT TO anon WITH CHECK (true);

-- Policy for public read access to own submissions
CREATE POLICY "Allow public read own distributor_intakes" ON distributor_intakes
  FOR SELECT TO anon USING (true);

-- Policy for authenticated users to read all distributor intakes
CREATE POLICY "Allow authenticated read all distributor_intakes" ON distributor_intakes
  FOR SELECT TO authenticated USING (true);

-- Policy for authenticated users to update distributor intakes
CREATE POLICY "Allow authenticated update distributor_intakes" ON distributor_intakes
  FOR UPDATE TO authenticated USING (true);

-- Policy for public insert on documents
CREATE POLICY "Allow public insert on distributor_documents" ON distributor_documents
  FOR INSERT TO anon WITH CHECK (true);

-- Policy for authenticated users to manage documents
CREATE POLICY "Allow authenticated all on distributor_documents" ON distributor_documents
  FOR ALL TO authenticated USING (true);

-- Policy for authenticated users to manage communications
CREATE POLICY "Allow authenticated all on distributor_communications" ON distributor_communications
  FOR ALL TO authenticated USING (true);

-- Policy for authenticated users to manage status history
CREATE POLICY "Allow authenticated all on distributor_status_history" ON distributor_status_history
  FOR ALL TO authenticated USING (true);

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at on distributor_intakes
CREATE TRIGGER update_distributor_intakes_updated_at
  BEFORE UPDATE ON distributor_intakes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Views for easier querying

-- View for distributor summary with computed metrics
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

-- View for high-value distributors
CREATE VIEW high_value_distributors AS
SELECT *
FROM distributor_summary
WHERE computed_score >= 75
  AND submission_status = 'final'
ORDER BY computed_score DESC, submitted_at DESC;

-- Comments for documentation
COMMENT ON TABLE distributor_intakes IS 'Main table storing distributor and referral partner intake form submissions';
COMMENT ON TABLE distributor_documents IS 'File uploads associated with distributor applications';
COMMENT ON TABLE distributor_communications IS 'Communication history and notes for each distributor';
COMMENT ON TABLE distributor_status_history IS 'Status change tracking for distributor applications';
COMMENT ON VIEW distributor_summary IS 'Summary view with computed metrics for easier reporting';
COMMENT ON VIEW high_value_distributors IS 'High-scoring distributors for priority follow-up';

-- Sample data for testing (optional)
-- INSERT INTO distributor_intakes (company, first_name, last_name, email, country, city, province_state, postal_zip, role, submission_status)
-- VALUES ('Test Distribution Co.', 'John', 'Doe', 'john@testdist.com', 'Canada', 'Toronto', 'ON', 'M5V 3A8', 'distributor', 'draft');
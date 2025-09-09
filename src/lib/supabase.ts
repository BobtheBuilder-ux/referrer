import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database schema interfaces
export interface DistributorIntake {
  id?: string;
  submission_status: 'draft' | 'final';
  role: 'distributor' | 'referral' | 'both';
  company: string;
  website?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  country: 'Canada' | 'United States';
  city: string;
  province_state: string;
  postal_zip: string;
  coverage_description?: string;
  coverage_provinces?: string[];
  coverage_states?: string[];
  languages_english?: boolean;
  languages_french?: boolean;
  languages_spanish?: boolean;
  languages_other?: string;
  network_independents?: number;
  network_chains?: number;
  network_convenience?: number;
  network_beauty_supply?: number;
  network_pharmacies?: number;
  network_food_service?: number;
  network_wholesalers?: number;
  network_marketplaces?: number;
  network_specialty?: number;
  monthly_doors_serviced?: number;
  decision_makers?: number;
  avg_monthly_sell_in_cad?: number;
  deals_last_12mo?: number;
  chain_walmart?: boolean;
  chain_costco?: boolean;
  chain_loblaws?: boolean;
  chain_sobeys?: boolean;
  chain_metro?: boolean;
  chain_kroger?: boolean;
  chain_amazon?: boolean;
  chain_other?: string;
  warehouse_sq_ft?: number;
  cold_chain?: boolean;
  trucks_owned?: number;
  third_party_logistics?: boolean;
  cfia_importer?: boolean;
  fda_registered?: boolean;
  gs1?: boolean;
  coi_insurance?: boolean;
  category_afro_grocery?: boolean;
  category_beverages?: boolean;
  category_spices_sauces?: boolean;
  category_snacks?: boolean;
  category_frozen?: boolean;
  category_fresh_produce?: boolean;
  category_beauty?: boolean;
  category_skincare?: boolean;
  category_haircare?: boolean;
  category_home?: boolean;
  category_textiles?: boolean;
  category_pharmacy_otc?: boolean;
  category_other?: boolean;
  categories_other_description?: string;
  exclusivity_interest?: 'no' | 'regional' | 'national';
  moq_capacity_units?: number;
  linkedin?: string;
  reference1?: string;
  reference2?: string;
  service_starter_brand_kit?: boolean;
  service_retail_ready?: boolean;
  service_ecom_launch?: boolean;
  service_photo_video?: boolean;
  service_social_media?: boolean;
  service_trade_readiness?: boolean;
  service_notes?: string;
  heard_from?: string;
  agree_contact?: boolean;
  agree_privacy?: boolean;
  computed_score?: number;
  computed_tier?: string;
  created_at?: string;
  updated_at?: string;
  submitted_at?: string;
}

// Submit distributor intake form
export async function submitDistributorIntake(data: Omit<DistributorIntake, 'id' | 'created_at' | 'updated_at'>) {
  try {
    const { data: result, error } = await supabase
      .from('distributor_intakes')
      .insert([data])
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return { data: null, error };
    }

    return { data: result, error: null };
  } catch (error) {
    console.error('Submit error:', error);
    return { data: null, error };
  }
}

// Get distributor intake by ID
export async function getDistributorIntake(id: string) {
  try {
    const { data, error } = await supabase
      .from('distributor_intakes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Get error:', error);
    return { data: null, error };
  }
}

// Get all distributor intakes with optional filtering
export async function getDistributorIntakes(filters?: {
  role?: string;
  country?: string;
  submission_status?: string;
  min_score?: number;
}) {
  try {
    let query = supabase
      .from('distributor_intakes')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.role) {
      query = query.eq('role', filters.role);
    }
    if (filters?.country) {
      query = query.eq('country', filters.country);
    }
    if (filters?.submission_status) {
      query = query.eq('submission_status', filters.submission_status);
    }
    if (filters?.min_score) {
      query = query.gte('computed_score', filters.min_score);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Get intakes error:', error);
    return { data: null, error };
  }
}

// Storage utilities for file uploads
export async function uploadFile(file: File, path: string) {
  try {
    const { data, error } = await supabase.storage
      .from('distributor-documents')
      .upload(path, file);

    if (error) {
      console.error('Upload error:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Upload error:', error);
    return { data: null, error };
  }
}

export async function deleteFile(path: string) {
  try {
    const { data, error } = await supabase.storage
      .from('distributor-documents')
      .remove([path]);

    if (error) {
      console.error('Delete error:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Delete error:', error);
    return { data: null, error };
  }
}

export function generateStoragePath(distributorId: string, fileName: string): string {
  const timestamp = Date.now();
  const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${distributorId}/${timestamp}_${cleanFileName}`;
}
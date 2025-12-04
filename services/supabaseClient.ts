
import { createClient } from '@supabase/supabase-js';

// Use provided credentials or fallback to environment variables
const supabaseUrl = 
  process.env.SUPABASE_URL || 
  process.env.REACT_APP_SUPABASE_URL || 
  'https://yycwzteodqocdazjqcuq.supabase.co';

const supabaseKey = 
  process.env.SUPABASE_ANON_KEY || 
  process.env.REACT_APP_SUPABASE_ANON_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5Y3d6dGVvZHFvY2RhempxY3VxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NTc4ODEsImV4cCI6MjA4MDQzMzg4MX0.BDF1RKJtKBaJDk7O_ZELoe-Y95hJR1roiRedDx_eL5w';

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase credentials are missing. Backend features may not work.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

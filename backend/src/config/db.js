import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('[BACKEND DB WARNING] Supabase URL or Key is missing from .env');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
console.log('[BACKEND DB] Supabase PostgreSQL Client initialized.');

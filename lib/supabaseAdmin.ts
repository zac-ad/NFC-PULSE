// SERVER-ONLY — never import from 'use client' components.
import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!serviceRoleKey && process.env.NODE_ENV === 'production') {
  console.error('SUPABASE_SERVICE_ROLE_KEY is not set.');
}
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey || 'placeholder');

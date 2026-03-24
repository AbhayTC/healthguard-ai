import { createClient } from '@supabase/supabase-js';

// We use the Service Role Key here because this is a server-side admin client.
// This allows the AI to bypass RLS and insert predictions/alerts directly.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn("⚠️ Missing Supabase environment variables in supabase-server.ts");
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase client configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create clients only if environment variables are available
// This prevents build-time errors when env vars aren't set
let supabase: SupabaseClient;
let supabaseAdmin: SupabaseClient;

if (supabaseUrl && supabaseAnonKey) {
  // Client-side Supabase client
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  // Server-side Supabase client (for API routes)
  supabaseAdmin = createClient(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
} else {
  // Placeholder for build time - will be properly initialized at runtime
  const placeholder = {} as SupabaseClient;
  supabase = placeholder;
  supabaseAdmin = placeholder;
}

export { supabase, supabaseAdmin };

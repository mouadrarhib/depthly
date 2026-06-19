import { createClient } from '@supabase/supabase-js'

import type { Database } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables.\n' +
    'Copy .env.example → .env.local and fill in your project URL and anon key.'
  )
}

/**
 * The single Supabase client for the entire app.
 * Import this wherever you need DB, Auth, or Storage access.
 *
 * Generic <Database> gives you full type-safety on all queries —
 * column names, return types, and insert shapes are all inferred.
 *
 * Regenerate types after schema changes:
 *   npx supabase gen types typescript --project-id <id> > src/types/database.ts
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession:    true,  // keeps the user logged in across page refreshes
    autoRefreshToken:  true,  // silently renews the JWT before it expires
    detectSessionInUrl: true, // handles email confirmation / OAuth redirect
  },
})

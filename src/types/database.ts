/**
 * AUTO-GENERATED — do not edit by hand.
 *
 * Regenerate after every schema migration:
 *   npx supabase gen types typescript --project-id <your-project-id> > src/types/database.ts
 *
 * This file is the single source of type truth for all Supabase queries.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      // Tables are populated here after running the gen command.
      // Until then, this empty shell keeps TypeScript happy.
    }
    Views:     Record<string, never>
    Functions: Record<string, never>
    Enums:     Record<string, never>
  }
}

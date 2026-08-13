import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseConfigStatus } from './config';

let clientInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (clientInstance) return clientInstance;

  const status = getSupabaseConfigStatus();

  if (!status.isConfigured) {
    throw new Error(
      `Supabase is not configured properly. Missing environment variables: ${status.missingVars.join(
        ', '
      )}. Please set them in your .env.local file.`
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  clientInstance = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  return clientInstance;
}

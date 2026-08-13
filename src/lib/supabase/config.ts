import { SupabaseConfigStatus } from '@/types';

export function getSupabaseConfigStatus(): SupabaseConfigStatus {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const missingVars: string[] = [];

  if (!url || url.includes('your-supabase-project')) {
    missingVars.push('NEXT_PUBLIC_SUPABASE_URL');
  }

  if (!anonKey || anonKey.includes('your-supabase-anon-key')) {
    missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  return {
    isConfigured: missingVars.length === 0,
    missingVars,
  };
}

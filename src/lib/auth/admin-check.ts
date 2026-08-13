import { User } from '@supabase/supabase-js';

export function isUserAdmin(user: User | null): boolean {
  if (!user) return false;

  // 1. Check if user metadata specifies admin role
  if (
    user.app_metadata?.role === 'admin' ||
    user.user_metadata?.is_admin === true ||
    user.user_metadata?.role === 'admin'
  ) {
    return true;
  }

  // 2. Check if environment variable specifies restricted admin emails
  const adminEmailsEnv = process.env.NEXT_PUBLIC_ADMIN_EMAILS;
  if (adminEmailsEnv) {
    const allowedEmails = adminEmailsEnv
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    if (allowedEmails.length > 0) {
      return user.email ? allowedEmails.includes(user.email.toLowerCase()) : false;
    }
  }

  // 3. Default: Any authenticated Supabase user is granted admin access if no explicit email filter is configured
  return true;
}

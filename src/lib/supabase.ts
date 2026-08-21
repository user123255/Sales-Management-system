import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase credentials are missing. Check your .env.local file.'
  );
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

export function getFriendlyError(error: unknown): string {
  if (!error) return 'An unexpected error occurred.';

  if (typeof error === 'string') return error;

  if (error instanceof Error) {
    const msg = error.message;

    if (msg.includes('23505')) return 'This record already exists.';
    if (msg.includes('23503')) return 'Referenced record not found.';
    if (msg.includes('Invalid login credentials')) {
      return 'Invalid email or password.';
    }
    if (msg.includes('Email not confirmed')) {
      return 'Please confirm your email address.';
    }
    if (msg.includes('JWT')) {
      return 'Your session has expired. Please log in again.';
    }

    return msg;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: string }).message);
  }

  return 'Unable to complete the request. Please try again.';
}

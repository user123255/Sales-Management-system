import {
  createClient,
  type PostgrestError,
} from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL?.trim();

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

/**
 * Check whether the Supabase environment variables exist.
 */
export const isSupabaseConfigured =
  Boolean(
    supabaseUrl &&
      supabaseAnonKey
  );

if (!isSupabaseConfigured) {
  console.error(
    '[SOMS] Supabase configuration is missing. ' +
      'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local.'
  );
}

/**
 * Supabase client.
 *
 * Keep the authentication configuration standard so that
 * Supabase can reliably persist and refresh the authenticated
 * user's access token.
 */
export const supabase =
  createClient(
    supabaseUrl ||
      'https://placeholder.supabase.co',
    supabaseAnonKey ||
      'placeholder-anon-key',
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

      global: {
        headers: {
          'X-Client-Info': 'SOMS',
        },
      },
    }
  );

/**
 * Standard SOMS error structure.
 */
export interface SOMSError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
  status?: number;
}

/**
 * Convert unknown errors into a predictable structure.
 */
export function normalizeError(
  error: unknown
): SOMSError {
  if (!error) {
    return {
      message:
        'An unexpected error occurred.',
    };
  }

  if (typeof error === 'string') {
    return {
      message: error,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
    };
  }

  if (
    typeof error === 'object' &&
    error !== null
  ) {
    const value =
      error as Record<
        string,
        unknown
      >;

    return {
      message:
        typeof value.message ===
        'string'
          ? value.message
          : 'Unable to complete the request.',

      code:
        typeof value.code ===
        'string'
          ? value.code
          : undefined,

      details:
        typeof value.details ===
        'string'
          ? value.details
          : undefined,

      hint:
        typeof value.hint ===
        'string'
          ? value.hint
          : undefined,

      status:
        typeof value.status ===
        'number'
          ? value.status
          : undefined,
    };
  }

  return {
    message:
      'Unable to complete the request.',
  };
}

/**
 * Convert Supabase errors into messages that
 * can safely be displayed in SOMS.
 */
export function getFriendlyError(
  error: unknown
): string {
  const normalized =
    normalizeError(error);

  const message =
    normalized.message || '';

  const code =
    normalized.code || '';

  const lowerMessage =
    message.toLowerCase();

  /*
   * PostgreSQL errors.
   */
  if (
    code === '23505' ||
    lowerMessage.includes('23505')
  ) {
    return 'This record already exists.';
  }

  if (
    code === '23503' ||
    lowerMessage.includes('23503')
  ) {
    return (
      'This record cannot be changed because it is being used elsewhere.'
    );
  }

  if (
    code === '23502' ||
    lowerMessage.includes('23502')
  ) {
    return 'A required field is missing.';
  }

  if (
    code === '23514' ||
    lowerMessage.includes('23514')
  ) {
    return 'The information provided is not valid.';
  }

  if (
    code === '42501' ||
    lowerMessage.includes(
      'row-level security'
    )
  ) {
    return (
      'You do not have permission to perform this action.'
    );
  }

  /*
   * Authentication errors.
   */
  if (
    lowerMessage.includes(
      'invalid login credentials'
    ) ||
    lowerMessage.includes(
      'invalid email or password'
    )
  ) {
    return 'Invalid email or password.';
  }



  if (
    lowerMessage.includes('jwt') ||
    (
      lowerMessage.includes(
        'session'
      ) &&
      lowerMessage.includes(
        'expired'
      )
    )
  ) {
    return (
      'Your session has expired. Please log in again.'
    );
  }

  if (
    lowerMessage.includes(
      'refresh token'
    )
  ) {
    return (
      'Your login session is no longer valid. Please log in again.'
    );
  }

  /*
   * Network errors.
   */
  if (
    lowerMessage.includes(
      'failed to fetch'
    ) ||
    lowerMessage.includes(
      'networkerror'
    ) ||
    lowerMessage.includes(
      'network error'
    ) ||
    lowerMessage.includes(
      'fetch failed'
    ) ||
    lowerMessage.includes(
      'connection refused'
    ) ||
    lowerMessage.includes(
      'offline'
    )
  ) {
    return (
      'Unable to connect to SOMS. Please check your internet connection and try again.'
    );
  }

  if (
    lowerMessage.includes(
      'timeout'
    ) ||
    lowerMessage.includes(
      'timed out'
    )
  ) {
    return (
      'The request took too long. Please check your connection and try again.'
    );
  }

  /*
   * HTTP/API errors.
   */
  if (
    lowerMessage.includes('401') ||
    lowerMessage.includes(
      'unauthorized'
    )
  ) {
    return (
      'Your authentication session could not be verified. Please log in again.'
    );
  }

  if (
    lowerMessage.includes('403') ||
    lowerMessage.includes(
      'forbidden'
    )
  ) {
    return (
      'You do not have permission to perform this action.'
    );
  }

  if (
    lowerMessage.includes('404') ||
    lowerMessage.includes(
      'not found'
    )
  ) {
    return (
      'The requested record could not be found.'
    );
  }

  if (
    lowerMessage.includes('500') ||
    lowerMessage.includes(
      'internal server error'
    )
  ) {
    return (
      'The SOMS server encountered an error. Please try again shortly.'
    );
  }

  return (
    message ||
    'Unable to complete the request. Please try again.'
  );
}

/**
 * Check whether an object looks like a
 * Supabase/PostgREST error.
 */
export function isPostgrestError(
  error: unknown
): error is PostgrestError {
  if (
    !error ||
    typeof error !== 'object'
  ) {
    return false;
  }

  const value =
    error as Record<
      string,
      unknown
    >;

  return (
    typeof value.message ===
      'string' &&
    (
      typeof value.code ===
        'string' ||
      typeof value.details ===
        'string' ||
      typeof value.hint ===
        'string'
    )
  );
}

/**
 * Consistent SOMS error logging.
 */
export function logSupabaseError(
  context: string,
  error: unknown
): void {
  const normalized =
    normalizeError(error);

  console.error(
    `[SOMS] ${context}`,
    {
      message:
        normalized.message,

      code:
        normalized.code,

      details:
        normalized.details,

      hint:
        normalized.hint,

      status:
        normalized.status,
    }
  );
}

/**
 * Check browser connectivity.
 */
export function isOnline(): boolean {
  return typeof navigator ===
    'undefined'
    ? true
    : navigator.onLine;
}

/**
 * Return a consistent offline error.
 */
export function getOfflineError():
  SOMSError | null {
  if (isOnline()) {
    return null;
  }

  return {
    message:
      'No internet connection. Please reconnect and try again.',
  };
}
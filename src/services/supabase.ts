import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Base URL resolver for production Android APK and remote web testing
export function getApiBaseUrl(): string {
  const configured = 
    (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_API_URL || import.meta.env?.VITE_BACKEND_URL || import.meta.env?.APP_URL)) ||
    (typeof process !== 'undefined' && (process.env?.VITE_API_URL || process.env?.VITE_BACKEND_URL || process.env?.APP_URL)) ||
    '';
  return configured ? configured.replace(/\/+$/, '') : '';
}

export function getApiUrl(path: string): string {
  const base = getApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${cleanPath}` : cleanPath;
}

// Retrieve environment variables exposed via Vite or Node environment
const rawSupabaseUrl: string = 
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) || 
  '';

export const supabaseUrl: string = rawSupabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');

export const supabaseAnonKey: string = 
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) || 
  '';

// Supabase is configured if URL is present.
// In our architecture, the backend proxies all privileged and business operations.
export const isSupabaseConfigured = Boolean(supabaseUrl);
export const DEFAULT_VENUE_ID = 'venue-default';

// Only create a client-side Supabase instance if a public anon key is provided.
// Secret keys are never handled client-side.
const isPublicAnonKey = Boolean(
  supabaseAnonKey && 
  (supabaseAnonKey.startsWith('ey') || supabaseAnonKey.startsWith('sb_publishable_'))
);

export const supabase: SupabaseClient | null = (isSupabaseConfigured && isPublicAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;

export interface SupabaseConnectionStatus {
  configured: boolean;
  connected: boolean;
  urlHost?: string;
  error?: string;
}

/**
 * Connection test.
 * Pings /api/supabase/status on the server to verify cloud connectivity.
 */
export async function testSupabaseConnection(): Promise<SupabaseConnectionStatus> {
  try {
    const res = await fetch(getApiUrl('/api/supabase/status'));
    if (res.ok) {
      const data = await res.json();
      const host = supabaseUrl ? new URL(supabaseUrl).host : 'supabase.co';
      return {
        configured: data.configured,
        connected: data.connected,
        urlHost: host,
        error: data.error || undefined,
      };
    }
  } catch (err: unknown) {
    // Network or server fetch failed
    const message = err instanceof Error ? err.message : 'Server connection failed';
    return {
      configured: isSupabaseConfigured,
      connected: false,
      error: message,
    };
  }

  return {
    configured: isSupabaseConfigured,
    connected: false,
    error: 'Backend API unavailable',
  };
}


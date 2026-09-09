import { supabase, isSupabaseConfigured } from './supabase';

export interface AccessibleVenueRecord {
  id: string;
  name: string;
  code: string;
}

export interface DeviceAuthTestResult {
  authenticated: boolean;
  userId: string | null;
  venueId: string | null;
  deviceRole: string | null;
  accessibleVenues: AccessibleVenueRecord[] | null;
  error: string | null;
}

/**
 * Temporary / Development-only test function for Supabase Device Authentication.
 * 
 * Verifies:
 * 1. Supabase email/password device sign-in.
 * 2. Session retrieval and app_metadata claims (venue_id, device_role).
 * 3. RLS-protected SELECT query on public.venues.
 * 
 * Note: Password is never hardcoded; must be passed as an argument.
 */
export async function testSupabaseDeviceAuth(
  email: string,
  password: string
): Promise<DeviceAuthTestResult> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      authenticated: false,
      userId: null,
      venueId: null,
      deviceRole: null,
      accessibleVenues: null,
      error: 'Supabase client is not configured in environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY).',
    };
  }

  try {
    // 1. Sign in with provided credentials
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.session || !authData.user) {
      return {
        authenticated: false,
        userId: null,
        venueId: null,
        deviceRole: null,
        accessibleVenues: null,
        error: authError?.message || 'Failed to authenticate device user.',
      };
    }

    const session = authData.session;
    const user = authData.user;
    const appMetadata = (user.app_metadata || {}) as Record<string, unknown>;

    const venueId = typeof appMetadata.venue_id === 'string' ? appMetadata.venue_id : null;
    const deviceRole = typeof appMetadata.device_role === 'string' ? appMetadata.device_role : null;

    // 2. Query public.venues under RLS policy
    const { data: venuesData, error: venuesError } = await supabase
      .from('venues')
      .select('id, name, code');

    if (venuesError) {
      return {
        authenticated: true,
        userId: user.id,
        venueId,
        deviceRole,
        accessibleVenues: null,
        error: `Authentication succeeded but venue query failed RLS: ${venuesError.message}`,
      };
    }

    return {
      authenticated: true,
      userId: user.id,
      venueId,
      deviceRole,
      accessibleVenues: (venuesData as AccessibleVenueRecord[]) || [],
      error: null,
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error during device auth test.';
    return {
      authenticated: false,
      userId: null,
      venueId: null,
      deviceRole: null,
      accessibleVenues: null,
      error: errorMessage,
    };
  }
}

// Development helper: attach to window for developer console testing in dev mode
if (typeof window !== 'undefined') {
  (window as unknown as { testHndvrDeviceAuth?: typeof testSupabaseDeviceAuth }).testHndvrDeviceAuth = testSupabaseDeviceAuth;
}

import { supabase } from './supabase';

export interface DeviceSession {
  authenticated: boolean;
  userId: string | null;
  venueId: string | null;
  deviceRole: string | null;
  error: string | null;
}

/**
 * Reads the current Supabase Auth session and extracts
 * HNDVR device identity from app_metadata.
 *
 * This does NOT perform local PIN authentication.
 * Local PIN authentication remains handled by AuthContext.
 */
export async function getDeviceSession(): Promise<DeviceSession> {
  if (!supabase) {
    return {
      authenticated: false,
      userId: null,
      venueId: null,
      deviceRole: null,
      error: 'Supabase is not configured.',
    };
  }

  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      return {
        authenticated: false,
        userId: null,
        venueId: null,
        deviceRole: null,
        error: error.message,
      };
    }

    const session = data.session;

    if (!session) {
      return {
        authenticated: false,
        userId: null,
        venueId: null,
        deviceRole: null,
        error: null,
      };
    }

    const appMetadata = session.user.app_metadata ?? {};

    return {
      authenticated: true,
      userId: session.user.id,
      venueId:
        typeof appMetadata.venue_id === 'string'
          ? appMetadata.venue_id
          : null,
      deviceRole:
        typeof appMetadata.device_role === 'string'
          ? appMetadata.device_role
          : null,
      error: null,
    };
  } catch (err: unknown) {
    return {
      authenticated: false,
      userId: null,
      venueId: null,
      deviceRole: null,
      error: err instanceof Error ? err.message : 'Unknown authentication error',
    };
  }
}

/**
 * Signs the HNDVR device into Supabase.
 *
 * This is Tier 1 device authentication.
 * It does NOT replace the local PIN login.
 */
export async function signInDevice(
  email: string,
  password: string
): Promise<DeviceSession> {
  if (!supabase) {
    return {
      authenticated: false,
      userId: null,
      venueId: null,
      deviceRole: null,
      error: 'Supabase is not configured.',
    };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      return {
        authenticated: false,
        userId: null,
        venueId: null,
        deviceRole: null,
        error: error?.message ?? 'Authentication failed.',
      };
    }

    const appMetadata = data.session.user.app_metadata ?? {};

    return {
      authenticated: true,
      userId: data.session.user.id,
      venueId:
        typeof appMetadata.venue_id === 'string'
          ? appMetadata.venue_id
          : null,
      deviceRole:
        typeof appMetadata.device_role === 'string'
          ? appMetadata.device_role
          : null,
      error: null,
    };
  } catch (err: unknown) {
    return {
      authenticated: false,
      userId: null,
      venueId: null,
      deviceRole: null,
      error: err instanceof Error ? err.message : 'Unknown authentication error',
    };
  }
}

/**
 * Signs the Tier 1 device session out.
 *
 * This does NOT affect the local IndexedDB users or PIN system.
 */
export async function signOutDevice(): Promise<{ success: boolean; error: string | null }> {
  if (!supabase) {
    return {
      success: false,
      error: 'Supabase is not configured.',
    };
  }

  const { error } = await supabase.auth.signOut();

  return {
    success: !error,
    error: error?.message ?? null,
  };
}
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const app = express();
const PORT = 3000;

// Allow large payloads for base64 photo syncs
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ----------------------------------------------------
// PRODUCTION CORS CONFIGURATION
// ----------------------------------------------------
// Supports deployed web app, local dev, and Capacitor Android WebView
const ALLOWED_EXACT_ORIGINS = new Set([
  'capacitor://localhost',
  'http://localhost',
  'https://localhost',
  'http://localhost:3000',
  'ionic://localhost',
]);

if (process.env.APP_URL) ALLOWED_EXACT_ORIGINS.add(process.env.APP_URL.replace(/\/+$/, ''));
if (process.env.VITE_API_URL) ALLOWED_EXACT_ORIGINS.add(process.env.VITE_API_URL.replace(/\/+$/, ''));
if (process.env.ALLOWED_ORIGINS) {
  process.env.ALLOWED_ORIGINS.split(',').forEach(o => ALLOWED_EXACT_ORIGINS.add(o.trim().replace(/\/+$/, '')));
}

app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  if (origin) {
    const cleanOrigin = origin.replace(/\/+$/, '');
    const isAllowed = ALLOWED_EXACT_ORIGINS.has(cleanOrigin);

    if (isAllowed) {
      res.header('Access-Control-Allow-Origin', origin);
    }
  }

  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// ----------------------------------------------------
// SUPABASE CLIENT (SERVER-SIDE PRIVILEGED)
// ----------------------------------------------------
const rawUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

let supabaseClient: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (!supabaseClient && supabaseUrl && supabaseKey) {
    supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });
  }
  return supabaseClient;
}

const DEFAULT_VENUE_ID = 'venue-default';

// ----------------------------------------------------
// CRYPTOGRAPHIC AUTHENTICATION TOKEN SERVICE
// ----------------------------------------------------
// This must be a dedicated secret.  Never reuse the Supabase service-role key as
// a session-signing key and never ship a fallback secret in a production build.
const AUTH_SECRET = process.env.AUTH_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'local-development-only-change-me');
if (process.env.NODE_ENV === 'production' && !AUTH_SECRET) {
  throw new Error('AUTH_SECRET is required in production');
}

export interface AuthenticatedUser {
  userId: string;
  name: string;
  role: 'MANAGER' | 'ASSISTANT_MANAGER' | 'STAFF';
  venueId: string;
  venueIds?: string[];
  areaIds?: string[];
  hasAllVenueAccess?: boolean;
  company?: string;
  tokenVersion?: number;
  iat: number;
  exp: number;
}

export function signAuthToken(payload: Omit<AuthenticatedUser, 'iat' | 'exp'>, expiresInMs = 7 * 24 * 60 * 60 * 1000): string {
  const now = Date.now();
  const fullPayload: AuthenticatedUser = {
    ...payload,
    iat: now,
    exp: now + expiresInMs,
  };
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const sig = crypto.createHmac('sha256', AUTH_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

export function verifyAuthToken(token: string): AuthenticatedUser | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [h, b, s] = parts;
    const expectedSig = crypto.createHmac('sha256', AUTH_SECRET).update(`${h}.${b}`).digest('base64url');
    const given = Buffer.from(s);
    const expected = Buffer.from(expectedSig);
    if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
    const payload = JSON.parse(Buffer.from(b, 'base64url').toString('utf8')) as AuthenticatedUser;
    if (payload.exp && payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// ----------------------------------------------------
// AUTHENTICATION & AUTHORIZATION MIDDLEWARE
// ----------------------------------------------------
// Strict server-side verification: Ignores and overwrites any client-provided x-user-role / x-user-id / x-venue-id headers.
function authenticateUser(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  let token = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else if (req.query.token && typeof req.query.token === 'string') {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid authentication token' });
  }

  const user = verifyAuthToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired authentication token' });
  }

  (req as any).user = user;

  // A manager always has global scope. Other roles may be assigned to one or
  // more venues; the client never gets to broaden that scope.
  const requestedVenue = (req.query.venueId as string) || (req.body && req.body.venueId);
  const allowedVenues = user.venueIds || [user.venueId];
  const canUseVenue = user.role === 'MANAGER' || user.hasAllVenueAccess || allowedVenues.includes(String(requestedVenue));
  if (requestedVenue && !canUseVenue) {
    return res.status(403).json({ error: 'Forbidden: You do not have permission to access another venue' });
  }

  next();
}

// ----------------------------------------------------
// REALTIME MULTI-DEVICE SYNCHRONIZATION (SSE)
// ----------------------------------------------------
const sseClients = new Map<Response, AuthenticatedUser>();

function permittedVenueIds(user: AuthenticatedUser): string[] | null {
  if (user.role === 'MANAGER' || user.hasAllVenueAccess) return null;
  return user.venueIds?.length ? user.venueIds : [user.venueId];
}

function broadcastSse(event: string, data: any) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  const venueId = data?.venueId || data?.venue_id;
  const assignedUserId = data?.assignedUserId || data?.assigned_to_user_id;
  for (const [client, recipient] of sseClients) {
    if (venueId && recipient.role !== 'MANAGER' && !recipient.hasAllVenueAccess && !(recipient.venueIds || [recipient.venueId]).includes(venueId)) continue;
    if (assignedUserId && recipient.role === 'STAFF' && recipient.userId !== assignedUserId) continue;
    try {
      client.write(message);
    } catch {
      sseClients.delete(client);
    }
  }
}

let realtimeChannel: any = null;

function initServerRealtime() {
  const sb = getSupabase();
  if (!sb || realtimeChannel) return;

  try {
    realtimeChannel = sb.channel(`hndvr-sync-${DEFAULT_VENUE_ID}`)
      .on('broadcast', { event: 'hndvr_event' }, (payload: any) => {
        const evt = payload.payload?.eventType || 'SYNC_NEEDED';
        broadcastSse(evt, payload.payload?.data || {});
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hndvr_templates' }, () => {
        broadcastSse('TEMPLATE_UPDATED', { timestamp: new Date().toISOString() });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_tasks' }, () => {
        broadcastSse('TASKS_UPDATED', { timestamp: new Date().toISOString() });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inspections' }, () => {
        broadcastSse('INSPECTIONS_UPDATED', { timestamp: new Date().toISOString() });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'issues' }, () => {
        broadcastSse('ISSUES_UPDATED', { timestamp: new Date().toISOString() });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shift_notes' }, () => {
        broadcastSse('SHIFT_NOTES_UPDATED', { timestamp: new Date().toISOString() });
      })
      .subscribe((status: string) => {
        console.log(`[Server Realtime] Channel status: ${status}`);
      });
  } catch (err) {
    console.error('[Server Realtime] Error initializing subscription:', err);
  }
}

// ----------------------------------------------------
// HEALTH & AUTHENTICATION ROUTES
// ----------------------------------------------------

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    hasSupabase: Boolean(supabaseUrl && supabaseKey),
    supabaseHost: supabaseUrl ? new URL(supabaseUrl).host : null
  });
});

app.get('/api/supabase/status', async (req: Request, res: Response) => {
  const sb = getSupabase();
  if (!sb) {
    return res.json({ configured: false, connected: false, error: 'Supabase credentials missing' });
  }
  try {
    const { error } = await sb.from('hndvr_templates').select('id').limit(1);
    res.json({ configured: true, connected: !error, error: error?.message || null });
  } catch (err: any) {
    res.json({ configured: true, connected: false, error: err.message });
  }
});

// Public directory of active users for login selection (Stripped of PIN hashes and secrets, enriched with profile details)
app.get('/api/auth/users', async (req: Request, res: Response) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'Supabase not configured' });

  const venueId = (req.query.venueId as string) || DEFAULT_VENUE_ID;
  try {
    const { data: dbUsers, error } = await sb
      .from('users')
      .select('id, venue_id, name, role, status')
      .eq('venue_id', venueId);

    if (error) return res.status(500).json({ error: error.message });

    // Retrieve staff profiles document to enrich with photo, company, and division
    const docId = `staff-profiles-${venueId}`;
    const { data: profileDoc } = await sb
      .from('hndvr_templates')
      .select('template')
      .eq('id', docId)
      .eq('venue_id', venueId)
      .single();

    const profiles: any[] = (profileDoc?.template?.profiles || []).filter(
      (p: any) => !p.name?.toLowerCase().includes('test device')
    );
    const profileMap = new Map<string, any>(profiles.map(p => [p.id, p]));

    const mergedList: any[] = (dbUsers || [])
      .filter(u => !u.name?.toLowerCase().includes('test device'))
      .map(u => {
        const p = profileMap.get(u.id);
        return {
          id: u.id,
          venueId: u.venue_id,
          name: u.name,
          role: u.role,
          status: u.status,
          photo: p?.photo || undefined,
          company: p?.company || (u.role === 'STAFF' ? 'luckycat' : 'JPE KTV'),
          division: p?.division || (u.role === 'MANAGER' ? 'Management' : 'Floor Operations'),
          hasPin: true
        };
      });

    // Also include any profiles from staff-profiles template not yet in dbUsers
    for (const p of profiles) {
      if (!mergedList.some(m => m.id === p.id)) {
        mergedList.push({
          id: p.id,
          venueId: p.venueId || venueId,
          name: p.name,
          role: p.role || 'STAFF',
          status: p.status || 'ACTIVE',
          photo: p.photo || undefined,
          company: p.company || 'luckycat',
          division: p.division || 'Floor Operations',
          hasPin: p.hasPin ?? true
        });
      }
    }

    res.json(mergedList);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Self-registration for staff members: Creates individual profile with photo, company (luckycat / JPE KTV), division, role & 4-digit PIN
app.post('/api/auth/register-staff', authenticateUser, async (req: Request, res: Response) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'Supabase not configured' });

  const creator = (req as any).user as AuthenticatedUser;
  if (creator.role !== 'MANAGER') return res.status(403).json({ error: 'Only a manager can create or change staff accounts.' });
  const { name, photo, company, division, role, pin, venueId, assignedVenueIds, assignedAreaIds, hasAllVenueAccess } = req.body;
  const cleanName = String(name || '').trim();
  const cleanPin = String(pin || '').trim();
  const cleanCompany = String(company || 'luckycat').trim();
  const cleanDivision = String(division || 'Floor Operations').trim();
  const cleanRole = (role === 'MANAGER' || role === 'ASSISTANT_MANAGER' || role === 'STAFF') ? role : 'STAFF';
  const requestedVenues = Array.isArray(assignedVenueIds) ? assignedVenueIds.map(String).filter(Boolean) : [String(venueId || DEFAULT_VENUE_ID)];
  const targetVenueId = requestedVenues[0] || DEFAULT_VENUE_ID;

  if (!cleanName) {
    return res.status(400).json({ error: 'Full name is required to create a profile.' });
  }
  if (!cleanPin || cleanPin.length < 4) {
    return res.status(400).json({ error: 'A 4-digit numeric PIN is strictly required.' });
  }

  try {
    // Check if PIN is already in use by another user in this venue
    const { data: existingUsers } = await sb.from('users').select('id, name, pin_hash, salt, pin_algorithm').eq('venue_id', targetVenueId);
    if (existingUsers && existingUsers.length > 0) {
      for (const eu of existingUsers) {
        const testSalt = eu.salt || 'DAILY_OPS_SALT_';
        const testHash = eu.pin_algorithm === 'scrypt'
          ? crypto.scryptSync(cleanPin, testSalt, 64).toString('hex')
          : crypto.createHash('sha256').update(`${testSalt}${cleanPin}`).digest('hex');
        if (testHash.toLowerCase() === (eu.pin_hash || '').toLowerCase()) {
          return res.status(400).json({ error: 'This PIN is already in use by another staff member. Please choose a unique 4-digit PIN.' });
        }
      }
    }

    const id = `user-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const salt = crypto.randomBytes(16).toString('hex');
    const pinHash = crypto.scryptSync(cleanPin, salt, 64).toString('hex');

    // 1. Insert into users table
    const { error: userError } = await sb.from('users').upsert({
      id,
      venue_id: targetVenueId,
      name: cleanName,
      role: cleanRole,
      status: 'ACTIVE',
      pin_hash: pinHash,
      salt,
      pin_algorithm: 'scrypt',
      company: cleanCompany,
      division: cleanDivision,
      photo_url: photo || null,
      assigned_venue_ids: requestedVenues,
      assigned_area_ids: Array.isArray(assignedAreaIds) ? assignedAreaIds.map(String).filter(Boolean) : [],
      has_all_venue_access: cleanRole === 'MANAGER' ? true : Boolean(hasAllVenueAccess),
      created_at: now,
      updated_at: now
    });

    if (userError) {
      return res.status(500).json({ error: userError.message });
    }

    // 2. Append/update into staff-profiles template
    const docId = `staff-profiles-${targetVenueId}`;
    const { data: currentDoc } = await sb
      .from('hndvr_templates')
      .select('template')
      .eq('id', docId)
      .eq('venue_id', targetVenueId)
      .single();

    let profiles: any[] = currentDoc?.template?.profiles;
    if (!Array.isArray(profiles) || profiles.length === 0) {
      profiles = INITIAL_STAFF_PROFILES(targetVenueId);
    }

    const newProfile = {
      id,
      name: cleanName,
      photo: photo || undefined,
      company: cleanCompany,
      division: cleanDivision,
      role: cleanRole,
      status: 'ACTIVE',
      venueId: targetVenueId,
      assignedVenueIds: requestedVenues,
      assignedAreaIds: Array.isArray(assignedAreaIds) ? assignedAreaIds.map(String).filter(Boolean) : [],
      hasAllVenueAccess: cleanRole === 'MANAGER' ? true : Boolean(hasAllVenueAccess),
      hasPin: true,
      createdAt: now,
      updatedAt: now
    };

    // Replace if exists, else append
    const existingIndex = profiles.findIndex(p => p.id === id);
    if (existingIndex >= 0) {
      profiles[existingIndex] = newProfile;
    } else {
      profiles.push(newProfile);
    }

    await sb.from('hndvr_templates').upsert({
      id: docId,
      venue_id: targetVenueId,
      template: { profiles, updatedAt: now },
      version: 1,
      updated_at: now
    });

    broadcastSse('USERS_UPDATED', { staffId: id });

    // Issue auth token so client can immediately sign in or use
    const token = signAuthToken({
      userId: id,
      name: cleanName,
      role: cleanRole,
      venueId: targetVenueId,
      venueIds: requestedVenues,
      areaIds: Array.isArray(assignedAreaIds) ? assignedAreaIds.map(String).filter(Boolean) : [],
      hasAllVenueAccess: cleanRole === 'MANAGER' ? true : Boolean(hasAllVenueAccess),
    });

    res.json({
      ok: true,
      token,
      profile: newProfile,
      user: {
        id,
        name: cleanName,
        role: cleanRole,
        venueId: targetVenueId,
        photo: photo || undefined,
        company: cleanCompany,
        division: cleanDivision,
        status: 'ACTIVE',
        assignedVenueIds: requestedVenues,
        assignedAreaIds: Array.isArray(assignedAreaIds) ? assignedAreaIds.map(String).filter(Boolean) : [],
        hasAllVenueAccess: cleanRole === 'MANAGER' ? true : Boolean(hasAllVenueAccess)
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Server-side PIN authentication bridge: Validates PIN on server and issues signed token
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
app.post('/api/auth/login', async (req: Request, res: Response) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'Supabase not configured' });

  const { userId, role, pin, venueId } = req.body;
  const cleanPin = String(pin || '').trim();
  const targetVenueId = venueId || DEFAULT_VENUE_ID;
  const attemptKey = `${req.ip}:${String(userId || role || '').slice(0, 100)}`;
  const attempt = loginAttempts.get(attemptKey);
  if (attempt && attempt.resetAt > Date.now() && attempt.count >= 5) {
    return res.status(429).json({ error: 'Too many PIN attempts. Try again in 15 minutes.' });
  }

  if (!cleanPin) {
    return res.status(400).json({ error: 'PIN is required' });
  }

  try {
    let query = sb.from('users').select('*').eq('venue_id', targetVenueId);
    if (userId) {
      query = query.eq('id', userId);
    } else if (role) {
      query = query.eq('role', role);
    } else {
      return res.status(400).json({ error: 'userId or role is required' });
    }

    const { data: candidateUsers, error } = await query;
    if (error || !candidateUsers || candidateUsers.length === 0) {
      return res.status(401).json({ error: 'No matching user account found.' });
    }

    // Filter out any automated test devices
    const validUsers = candidateUsers.filter(u => !u.name?.toLowerCase().includes('test device'));

    // Iterate through candidates to find the specific user matching the entered PIN
    let matchedUser: any = null;
    for (const u of validUsers) {
      const salt = u.salt || 'DAILY_OPS_SALT_';
      const computedHash = u.pin_algorithm === 'scrypt'
        ? crypto.scryptSync(cleanPin, salt, 64).toString('hex')
        : crypto.createHash('sha256').update(`${salt}${cleanPin}`).digest('hex');
      if (computedHash.toLowerCase() === (u.pin_hash || '').toLowerCase()) {
        matchedUser = u;
        break;
      }
    }

    if (!matchedUser) {
      loginAttempts.set(attemptKey, { count: (attempt?.count || 0) + 1, resetAt: Date.now() + 15 * 60 * 1000 });
      return res.status(401).json({ error: 'Invalid PIN. Access denied.' });
    }
    loginAttempts.delete(attemptKey);

    // Retrieve staff profile info (photo, company, division) if available
    const docId = `staff-profiles-${targetVenueId}`;
    const { data: profileDoc } = await sb
      .from('hndvr_templates')
      .select('template')
      .eq('id', docId)
      .eq('venue_id', targetVenueId)
      .single();

    const profiles: any[] = profileDoc?.template?.profiles || [];
    const prof = profiles.find(p => p.id === matchedUser.id);

    const token = signAuthToken({
      userId: matchedUser.id,
      name: matchedUser.name,
      role: matchedUser.role,
      venueId: matchedUser.venue_id,
      venueIds: Array.isArray(matchedUser.assigned_venue_ids) && matchedUser.assigned_venue_ids.length ? matchedUser.assigned_venue_ids : [matchedUser.venue_id],
      areaIds: Array.isArray(matchedUser.assigned_area_ids) ? matchedUser.assigned_area_ids : [],
      hasAllVenueAccess: matchedUser.role === 'MANAGER' || Boolean(matchedUser.has_all_venue_access),
      company: prof?.company || (matchedUser.role === 'STAFF' ? 'luckycat' : 'JPE KTV'),
    });

    res.json({
      ok: true,
      token,
      user: {
        id: matchedUser.id,
        name: matchedUser.name,
        role: matchedUser.role,
        venueId: matchedUser.venue_id,
        photo: prof?.photo || undefined,
        company: prof?.company || (matchedUser.role === 'STAFF' ? 'luckycat' : 'JPE KTV'),
        division: prof?.division || (matchedUser.role === 'MANAGER' ? 'Management' : 'Floor Operations')
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Verify current session / token
app.get('/api/auth/me', authenticateUser, (req: Request, res: Response) => {
  res.json({ ok: true, user: (req as any).user });
});

// Realtime SSE stream for connected clients (Authenticated)
app.get('/api/supabase/events', authenticateUser, (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const user = (req as any).user as AuthenticatedUser;
  sseClients.set(res, user);
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED' })}\n\n`);

  const intervalId = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(intervalId);
      sseClients.delete(res);
    }
  }, 20000);

  req.on('close', () => {
    clearInterval(intervalId);
    sseClients.delete(res);
  });
});

// Broadcast event endpoint (Authenticated)
app.post('/api/supabase/broadcast', authenticateUser, async (req: Request, res: Response) => {
  const { event, data } = req.body;
  broadcastSse(event || 'SYNC_NEEDED', { ...(data || {}), venueId: data?.venueId || (req as any).user?.venueId });

  const sb = getSupabase();
  if (sb && realtimeChannel) {
    try {
      await realtimeChannel.send({
        type: 'broadcast',
        event: 'hndvr_event',
        payload: { eventType: event, data, timestamp: new Date().toISOString() }
      });
    } catch (e) {
      // Ignore broadcast failure
    }
  }

  res.json({ ok: true });
});

// ----------------------------------------------------
// AUTHORITATIVE BUSINESS DATA ROUTES
// ----------------------------------------------------

// 1. Template Master
app.get('/api/supabase/template', authenticateUser, async (req: Request, res: Response) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'Supabase not configured' });

  const user = (req as any).user as AuthenticatedUser;
  try {
    let { data, error } = await sb
      .from('hndvr_templates')
      .select('*')
      .eq('venue_id', user.venueId)
      .eq('id', 'hndvr-template-default')
      .order('updated_at', { ascending: false })
      .limit(1);

    if (!data || data.length === 0) {
      const fallbackQuery = await sb
        .from('hndvr_templates')
        .select('*')
        .eq('venue_id', user.venueId)
        .not('id', 'like', 'staff-%')
        .not('id', 'like', 'accountability-%')
        .order('updated_at', { ascending: false })
        .limit(1);
      data = fallbackQuery.data;
      error = fallbackQuery.error;
    }

    if (error) {
      const { data: fallback, error: fbError } = await sb
        .from('templates')
        .select('*')
        .eq('venue_id', user.venueId)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (fbError || !fallback || fallback.length === 0) {
        return res.status(404).json({ error: 'Template not found' });
      }
      return res.json(fallback[0]);
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(data[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/supabase/template', authenticateUser, async (req: Request, res: Response) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'Supabase not configured' });

  const user = (req as any).user as AuthenticatedUser;
  // Strictly enforce Manager role from cryptographic token
  if (user.role !== 'MANAGER') {
    return res.status(403).json({ error: 'Only Managers can modify the checklist master template' });
  }

  const { template } = req.body;
  if (!template) return res.status(400).json({ error: 'Template payload required' });

  try {
    const now = new Date().toISOString();
    const version = (template.version || 1) + 1;
    const updatedTemplate = { ...template, version, lastModified: now };

    const { error: hndvrError } = await sb
      .from('hndvr_templates')
      .upsert({
        id: 'hndvr-template-default',
        venue_id: user.venueId,
        template: updatedTemplate,
        version,
        updated_at: now
      });

    // Older installations may only have `templates`; keep both stores in sync.
    // A missing hndvr_templates table must not make the manager screen unusable.

    const { error: templateError } = await sb
      .from('templates')
      .upsert({
        id: 'template-default',
        venue_id: user.venueId,
        name: 'Checklist Master Template',
        version,
        is_active: true,
        areas: updatedTemplate.areas,
        updated_at: now
      });

    if (hndvrError && templateError) return res.status(500).json({ error: templateError.message || hndvrError.message });

    broadcastSse('TEMPLATE_UPDATED', { version, lastModified: now });
    res.json({ ok: true, version, lastModified: now });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Daily Tasks
app.get('/api/supabase/daily-tasks', authenticateUser, async (req: Request, res: Response) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'Supabase not configured' });

  const user = (req as any).user as AuthenticatedUser;
  try {
    let query: any = sb.from('daily_tasks').select('*').order('created_at', { ascending: false });
    const scope = permittedVenueIds(user);
    if (scope) query = query.in('venue_id', scope);
    const { data, error } = await query;

    if (error) return res.status(500).json({ error: error.message });
    // Staff receive only tasks explicitly assigned to their account or role;
    // managers retain the complete operational view.
    const normalizedCompany = String(user.company || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const companyVisible = (task: any) => {
      if (!normalizedCompany || user.role !== 'STAFF') return true;
      const taskCompany = String(task.company || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const venueName = String(task.venue_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!taskCompany && !venueName) return true;
      if (taskCompany) return taskCompany === normalizedCompany || (normalizedCompany.includes('luckycat') && taskCompany.includes('lucky')) || (normalizedCompany.includes('jpe') && taskCompany.includes('jpe'));
      if (normalizedCompany.includes('luckycat')) return venueName.includes('lucky');
      if (normalizedCompany.includes('jpe')) return !venueName.includes('lucky');
      return true;
    };
    const visible = user.role === 'STAFF'
      ? (data || []).filter((task: any) => (task.assigned_to_user_id === user.userId || task.assigned_to_role === user.role) && companyVisible(task))
      : (data || []);
    res.json(visible);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/supabase/daily-tasks', authenticateUser, async (req: Request, res: Response) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'Supabase not configured' });

  const user = (req as any).user as AuthenticatedUser;
  const task = req.body;
  if (!task || !task.id) return res.status(400).json({ error: 'Task object with id required' });
  const taskVenueId = String(task.venueId || user.venueId);
  const scope = permittedVenueIds(user);
  if (scope && !scope.includes(taskVenueId)) return res.status(403).json({ error: 'Forbidden: task venue is outside your assignment.' });
  if (!['MANAGER', 'ASSISTANT_MANAGER'].includes(user.role) && !task.createdAt) {
    return res.status(403).json({ error: 'Only managers can assign a new task.' });
  }

  try {
    const now = new Date().toISOString();

    // Mandatory skip reason check
    if (task.status === 'SKIPPED') {
      const skipReason = (task.skipReason || task.completionReason || task.notDoneReason || task.completionNote || '').trim();
      if (!skipReason) {
        return res.status(400).json({ error: 'A skip reason is strictly mandatory when marking a task as SKIPPED' });
      }
    }

    // Normalize task priority to PostgreSQL enum ('LOW' | 'MEDIUM' | 'HIGH')
    let dbPriority = 'MEDIUM';
    const rawPrio = String(task.priority || '').toUpperCase();
    if (rawPrio === 'HIGH' || rawPrio === 'URGENT') dbPriority = 'HIGH';
    else if (rawPrio === 'LOW') dbPriority = 'LOW';
    else dbPriority = 'MEDIUM';

  const isTaskCompleted = task.status === 'DONE' || task.status === 'COMPLETED' || Boolean(task.isDone);
  const isTaskStarted = task.status === 'IN_PROGRESS' || Boolean(task.startedAt);
    if (isTaskCompleted && user.role === 'STAFF' && !task.completionPhotoUrl) {
      return res.status(400).json({ error: 'Staff task completion requires a proof photo.' });
    }

    const payload = {
      id: task.id,
      venue_id: taskVenueId,
      date: task.date || now.split('T')[0],
      title: task.title,
      notes: task.notes || task.description || task.instructions || null,
      priority: dbPriority,
      status: task.status || (task.isDone ? 'DONE' : 'PENDING'),
      is_done: isTaskCompleted,
      department_id: task.departmentId || 'dept-server',
      area_id: task.areaId || null,
      area_name: task.areaName || null,
      venue_name: task.venueName || null,
      company: task.company || null,
      assigned_to_name: task.assignedUserName || task.assignedToName || null,
      assigned_to_user_id: task.assignedUserId || task.assignedToUserId || null,
      assigned_to_role: task.assignedRole || null,
      created_by_user_id: task.createdByUserId || user.userId,
      created_by_name: task.createdByName || user.name,
      started_at: isTaskStarted ? (task.startedAt || now) : (task.startedAt || null),
      started_by_user_id: isTaskStarted ? (task.startedByUserId || user.userId) : null,
      started_by_name: isTaskStarted ? (task.startedByName || user.name) : null,
      completed_at: isTaskCompleted ? (task.completedAt || now) : (task.completedAt || null),
      completed_by_id: isTaskCompleted ? (task.completedByUserId || user.userId) : null,
      completed_by_name: isTaskCompleted ? (task.completedByName || user.name) : null,
      completion_reason: task.skipReason || task.notDoneReason || task.completionReason || null,
      completion_note: task.completionNote || task.completionNotes || null,
      completion_photo_url: task.completionPhotoUrl || null,
      history: Array.isArray(task.history) ? task.history : [],
      created_at: task.createdAt || now,
      updated_at: now
    };

    const { error } = await sb.from('daily_tasks').upsert(payload);
    if (error) return res.status(500).json({ error: error.message });

    await sb.from('task_events').insert({ task_id: task.id, venue_id: taskVenueId, actor_user_id: user.userId, event_type: isTaskCompleted ? 'COMPLETED' : isTaskStarted ? 'STARTED' : 'UPSERT', details: { status: payload.status } });
    broadcastSse('TASKS_UPDATED', { taskId: task.id, venueId: taskVenueId, assignedUserId: payload.assigned_to_user_id });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/supabase/daily-tasks/:id', authenticateUser, async (req: Request, res: Response) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'Supabase not configured' });

  const user = (req as any).user as AuthenticatedUser;
  // Strictly enforce Manager or Assistant Manager role from token
  if (user.role === 'STAFF') {
    return res.status(403).json({ error: 'Staff cannot delete daily tasks' });
  }

  const { id } = req.params;
  try {
    let query: any = sb.from('daily_tasks').delete().eq('id', id);
    const scope = permittedVenueIds(user);
    if (scope) query = query.in('venue_id', scope);
    const { error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    broadcastSse('TASKS_UPDATED', { taskId: id, deleted: true });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2b. Attendance is accepted only from an authenticated individual account.
// The server owns the identity and receipt time; clients cannot forge either.
app.get('/api/supabase/attendance', authenticateUser, async (req: Request, res: Response) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'Supabase not configured' });
  const user = (req as any).user as AuthenticatedUser;
  let query: any = sb.from('attendance_records').select('*').order('captured_at', { ascending: false }).limit(500);
  if (user.role === 'STAFF') query = query.eq('staff_user_id', user.userId);
  const scope = permittedVenueIds(user);
  if (scope) query = query.in('venue_id', scope);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

app.post('/api/supabase/attendance', authenticateUser, async (req: Request, res: Response) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'Supabase not configured' });
  const user = (req as any).user as AuthenticatedUser;
  const record = req.body || {};
  const venueId = String(record.venueId || user.venueId);
  const scope = permittedVenueIds(user);
  if (scope && !scope.includes(venueId)) return res.status(403).json({ error: 'Forbidden: attendance venue is outside your assignment.' });
  if (!record.id || !record.type || !record.selfieUrl || !record.wifiVerified || !record.deviceId) {
    return res.status(400).json({ error: 'Live selfie, approved Wi-Fi, device identifier and attendance type are required.' });
  }
  const now = new Date().toISOString();
  const { error } = await sb.from('attendance_records').upsert({
    id: record.id, attendance_type: record.type, staff_user_id: user.userId, staff_name: user.name,
    staff_role: user.role, venue_id: venueId, venue_name: record.venueName || null,
    area_ids: Array.isArray(record.areaIds) ? record.areaIds : [], checklist_inspection_id: record.checklistInspectionId || null,
    checklist_completed_at: record.checklistCompletedAt || null, captured_at: record.capturedAt || now,
    server_received_at: now, wifi_ssid: record.wifiSsid || null, wifi_verified: true,
    device_id: record.deviceId, selfie_url: record.selfieUrl, sync_status: 'VERIFIED_CLOUD'
  });
  if (error) return res.status(500).json({ error: error.message });
  broadcastSse('ATTENDANCE_UPDATED', { venueId, staffUserId: user.userId, recordId: record.id });
  res.json({ ok: true, serverReceivedAt: now });
});

// 3. Inspections
app.get('/api/supabase/inspections', authenticateUser, async (req: Request, res: Response) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'Supabase not configured' });

  const user = (req as any).user as AuthenticatedUser;
  try {
    const { data, error } = await sb
      .from('inspections')
      .select('*')
      .eq('venue_id', user.venueId)
      .order('date', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/supabase/inspections', authenticateUser, async (req: Request, res: Response) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'Supabase not configured' });

  const user = (req as any).user as AuthenticatedUser;
  const inspection = req.body;
  if (!inspection || !inspection.id) return res.status(400).json({ error: 'Inspection object with id required' });

  try {
    const now = new Date().toISOString();
    const payload = {
      id: inspection.id,
      venue_id: user.venueId,
      template_id: inspection.templateId || 'hndvr-template-default',
      date: inspection.date || now.split('T')[0],
      is_completed: Boolean(inspection.isCompleted || inspection.isHandedOver || inspection.status === 'COMPLETED'),
      item_results: inspection.itemResults || {},
      started_at: inspection.startedAt || now,
      started_by_name: inspection.startedByName || user.name,
      started_by_role: inspection.startedByRole || user.role,
      completed_at: inspection.completedAt || null,
      completed_by_id: inspection.completedByUserId || null,
      completed_by_name: inspection.completedByName || null,
      handed_over_at: inspection.handedOverAt || null,
      handed_over_by_name: inspection.handedOverByName || null,
      is_handed_over: Boolean(inspection.isHandedOver),
      total_items: inspection.totalItems || 0,
      ready_items: inspection.readyItems || 0,
      not_ready_items: inspection.notReadyItems || 0,
      na_items: inspection.naItems || 0,
      total_issues_count: inspection.totalIssuesCount || 0,
      notes: inspection.notes || null,
      created_at: inspection.startedAt || now,
      updated_at: now
    };

    const { error } = await sb.from('inspections').upsert(payload);
    if (error) return res.status(500).json({ error: error.message });

    broadcastSse('INSPECTIONS_UPDATED', { inspectionId: inspection.id });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Issues
app.get('/api/supabase/issues', authenticateUser, async (req: Request, res: Response) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'Supabase not configured' });

  const user = (req as any).user as AuthenticatedUser;
  try {
    const { data, error } = await sb
      .from('issues')
      .select('*')
      .eq('venue_id', user.venueId)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/supabase/issues', authenticateUser, async (req: Request, res: Response) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'Supabase not configured' });

  const user = (req as any).user as AuthenticatedUser;
  const issue = req.body;
  if (!issue || !issue.id) return res.status(400).json({ error: 'Issue object with id required' });

  try {
    const now = new Date().toISOString();
    const payload = {
      id: issue.id,
      venue_id: user.venueId,
      inspection_id: issue.inspectionId || null,
      inspection_date: issue.inspectionDate || now.split('T')[0],
      area_id: issue.areaId || 'area-default',
      area_name: issue.areaName || 'General Area',
      item_id: issue.itemId || 'item-default',
      item_name: issue.itemName || 'General Item',
      criterion_id: issue.criterionId || null,
      criterion_name: issue.criterionName || null,
      department_id: issue.departmentId || 'dept-server',
      current_status: issue.currentStatus || 'NOT_READY',
      specific_problems: issue.specificProblems || [],
      custom_note: issue.customNote || null,
      photos: issue.photos || [],
      resolution_photos: issue.resolutionPhotos || [],
      discovered_at: issue.discoveredAt || now,
      discovered_by_id: issue.discoveredById || user.userId,
      discovered_by_name: issue.discoveredByName || user.name,
      discovered_by_role: issue.discoveredByRole || user.role,
      resolved_at: issue.resolvedAt || null,
      resolved_by_id: issue.resolvedById || null,
      resolved_by_name: issue.resolvedByName || null,
      resolved_by_role: issue.resolvedByRole || null,
      resolution_notes: issue.resolutionNotes || null,
      verified_at: issue.verifiedAt || null,
      verified_by_id: issue.verifiedById || null,
      verified_by_name: issue.verifiedByName || null,
      verified_by_role: issue.verifiedByRole || null,
      verification_notes: issue.verificationNotes || null,
      status_updated_at: issue.statusUpdatedAt || now,
      created_at: issue.createdAt || now,
      updated_at: now
    };

    const { error } = await sb.from('issues').upsert(payload);
    if (error) return res.status(500).json({ error: error.message });

    broadcastSse('ISSUES_UPDATED', { issueId: issue.id });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Shift Notes
app.get('/api/supabase/shift-notes', authenticateUser, async (req: Request, res: Response) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'Supabase not configured' });

  const user = (req as any).user as AuthenticatedUser;
  try {
    const { data, error } = await sb
      .from('shift_notes')
      .select('*')
      .eq('venue_id', user.venueId)
      .order('date', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/supabase/shift-notes', authenticateUser, async (req: Request, res: Response) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'Supabase not configured' });

  const user = (req as any).user as AuthenticatedUser;
  const note = req.body;
  if (!note || !note.id) return res.status(400).json({ error: 'Shift note object with id required' });

  try {
    const now = new Date().toISOString();
    const payload = {
      id: note.id,
      venue_id: user.venueId,
      date: note.date || now.split('T')[0],
      content: note.content || note.title || '',
      author_id: user.userId,
      author_name: user.name,
      author_role: user.role,
      category: note.category || 'HANDOVER',
      status: note.status || 'OPEN',
      venue_name: note.venueName || null,
      area_id: note.areaId || null,
      area_name: note.areaName || null,
      completed_at: note.completedAt || null,
      completed_by_name: note.completedByName || null,
      timestamp: note.createdAt || now,
      created_at: note.createdAt || now,
      updated_at: now
    };

    const { error } = await sb.from('shift_notes').upsert(payload);
    if (error) return res.status(500).json({ error: error.message });

    broadcastSse('SHIFT_NOTES_UPDATED', { noteId: note.id });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/supabase/shift-notes/:id', authenticateUser, async (req: Request, res: Response) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'Supabase not configured' });

  const user = (req as any).user as AuthenticatedUser;
  if (user.role === 'STAFF') {
    return res.status(403).json({ error: 'Staff cannot delete shift notes' });
  }

  const { id } = req.params;
  try {
    const { error } = await sb.from('shift_notes').delete().eq('id', id).eq('venue_id', user.venueId);
    if (error) return res.status(500).json({ error: error.message });

    broadcastSse('SHIFT_NOTES_UPDATED', { noteId: id, deleted: true });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Users Management (Protected)
app.get('/api/supabase/users', authenticateUser, async (req: Request, res: Response) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'Supabase not configured' });

  const user = (req as any).user as AuthenticatedUser;
  try {
    // Never expose pin_hash or salt over the wire
    const { data, error } = await sb
      .from('users')
      .select('id, venue_id, name, role, status, created_at, updated_at')
      .eq('venue_id', user.venueId);

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/supabase/users', authenticateUser, async (req: Request, res: Response) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'Supabase not configured' });

  const currentUser = (req as any).user as AuthenticatedUser;
  if (currentUser.role !== 'MANAGER') {
    return res.status(403).json({ error: 'Only Managers can manage user profiles' });
  }

  const user = req.body;
  if (!user || !user.id) return res.status(400).json({ error: 'User object with id required' });

  try {
    const now = new Date().toISOString();
    const payload: any = {
      id: user.id,
      venue_id: currentUser.venueId,
      name: user.name,
      role: user.role,
      status: user.status || 'ACTIVE',
      created_at: user.createdAt || now,
      updated_at: now
    };

    if (user.pinHash) {
      payload.pin_hash = user.pinHash;
      payload.salt = 'DAILY_OPS_SALT_';
    }

    const { error } = await sb.from('users').upsert(payload);
    if (error) return res.status(500).json({ error: error.message });
    broadcastSse('USERS_UPDATED', { userId: user.id });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 6.2 STAFF PROFILES & CREDENTIAL MANAGEMENT
// ----------------------------------------------------

const INITIAL_STAFF_PROFILES = (venueId: string) => [
  {
    id: 'user-manager',
    name: 'General Manager',
    company: 'Lucky Cat',
    division: 'Management',
    role: 'MANAGER',
    status: 'ACTIVE',
    venueId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    hasPin: true
  },
  {
    id: 'user-asst-manager',
    name: 'Assistant Manager',
    company: 'Lucky Cat',
    division: 'Floor',
    role: 'ASSISTANT_MANAGER',
    status: 'ACTIVE',
    venueId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    hasPin: true
  },
  {
    id: 'user-staff',
    name: 'Floor Staff',
    company: 'Lucky Cat',
    division: 'Floor',
    role: 'STAFF',
    status: 'ACTIVE',
    venueId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    hasPin: true
  }
];

app.get('/api/supabase/staff-profiles', authenticateUser, async (req: Request, res: Response) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'Supabase not configured' });

  const currentUser = (req as any).user as AuthenticatedUser;
  try {
    const docId = `staff-profiles-${currentUser.venueId}`;
    const { data, error } = await sb
      .from('hndvr_templates')
      .select('template')
      .eq('id', docId)
      .eq('venue_id', currentUser.venueId)
      .single();

    if (error || !data?.template?.profiles || !Array.isArray(data.template.profiles)) {
      const initial = INITIAL_STAFF_PROFILES(currentUser.venueId);
      return res.json(initial);
    }

    res.json(data.template.profiles);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/supabase/staff-profiles', authenticateUser, async (req: Request, res: Response) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'Supabase not configured' });

  const currentUser = (req as any).user as AuthenticatedUser;
  if (currentUser.role !== 'MANAGER') {
    return res.status(403).json({ error: 'Only Managers can create or edit staff profiles' });
  }

  const { profile, pin } = req.body;
  if (!profile || !profile.id || !profile.name) {
    return res.status(400).json({ error: 'Staff profile with id and name is required' });
  }

  try {
    const now = new Date().toISOString();
    const docId = `staff-profiles-${currentUser.venueId}`;
    const { data: currentDoc } = await sb
      .from('hndvr_templates')
      .select('template')
      .eq('id', docId)
      .eq('venue_id', currentUser.venueId)
      .single();

    let profiles: any[] = currentDoc?.template?.profiles;
    if (!Array.isArray(profiles) || profiles.length === 0) {
      profiles = INITIAL_STAFF_PROFILES(currentUser.venueId);
    }

    const cleanPin = pin ? String(pin).trim() : '';
    const updatedProfile = {
      ...profile,
      venueId: currentUser.venueId,
      status: profile.status || 'ACTIVE',
      updatedAt: now,
      createdAt: profile.createdAt || now,
      hasPin: cleanPin ? true : (profile.hasPin ?? false)
    };

    const existingIdx = profiles.findIndex(p => p.id === profile.id);
    if (existingIdx >= 0) {
      profiles[existingIdx] = updatedProfile;
    } else {
      profiles.push(updatedProfile);
    }

    await sb.from('hndvr_templates').upsert({
      id: docId,
      venue_id: currentUser.venueId,
      template: { profiles, updatedAt: now },
      version: 1,
      updated_at: now
    });

    // If PIN is provided, synchronize login credentials into users table
    if (cleanPin && cleanPin.length >= 4) {
      const salt = 'DAILY_OPS_SALT_';
      const pinHash = crypto.createHash('sha256').update(`${salt}${cleanPin}`).digest('hex');
      await sb.from('users').upsert({
        id: profile.id,
        venue_id: currentUser.venueId,
        name: profile.name,
        role: profile.role || 'STAFF',
        status: profile.status || 'ACTIVE',
        pin_hash: pinHash,
        salt,
        created_at: profile.createdAt || now,
        updated_at: now
      });
    } else {
      // Keep name/role/status in sync in users table
      const { data: existingUser } = await sb.from('users').select('pin_hash, salt').eq('id', profile.id).single();
      await sb.from('users').upsert({
        id: profile.id,
        venue_id: currentUser.venueId,
        name: profile.name,
        role: profile.role || 'STAFF',
        status: profile.status || 'ACTIVE',
        pin_hash: existingUser?.pin_hash || 'DAILY_OPS_SALT_NO_PIN',
        salt: existingUser?.salt || 'DAILY_OPS_SALT_',
        created_at: profile.createdAt || now,
        updated_at: now
      });
    }

    broadcastSse('USERS_UPDATED', { staffId: profile.id });
    res.json({ ok: true, profile: updatedProfile });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/supabase/staff-profiles/:id', authenticateUser, async (req: Request, res: Response) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'Supabase not configured' });

  const currentUser = (req as any).user as AuthenticatedUser;
  if (currentUser.role !== 'MANAGER') {
    return res.status(403).json({ error: 'Only Managers can remove staff profiles' });
  }

  const staffId = req.params.id;
  try {
    const docId = `staff-profiles-${currentUser.venueId}`;
    const { data: currentDoc } = await sb
      .from('hndvr_templates')
      .select('template')
      .eq('id', docId)
      .eq('venue_id', currentUser.venueId)
      .single();

    if (currentDoc?.template?.profiles) {
      const updatedProfiles = currentDoc.template.profiles.filter((p: any) => p.id !== staffId);
      await sb.from('hndvr_templates').upsert({
        id: docId,
        venue_id: currentUser.venueId,
        template: { profiles: updatedProfiles, updatedAt: new Date().toISOString() },
        version: 1,
        updated_at: new Date().toISOString()
      });
    }

    // Deactivate user in users table
    await sb.from('users').update({ status: 'INACTIVE' }).eq('id', staffId);

    broadcastSse('USERS_UPDATED', { staffId, deleted: true });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 6.3 ACCOUNTABILITY POINTS SYSTEM
// ----------------------------------------------------

app.get('/api/supabase/accountability-points', authenticateUser, async (req: Request, res: Response) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'Supabase not configured' });

  const currentUser = (req as any).user as AuthenticatedUser;
  try {
    const docId = `accountability-points-${currentUser.venueId}`;
    const { data } = await sb
      .from('hndvr_templates')
      .select('template')
      .eq('id', docId)
      .eq('venue_id', currentUser.venueId)
      .single();

    let points: any[] = data?.template?.points || [];

    // Privacy isolation: Non-managers (Staff / Asst Managers) can strictly ONLY receive their own point entries
    if (currentUser.role !== 'MANAGER') {
      points = points.filter(p => p.staffId === currentUser.userId);
    }

    res.json(points);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/supabase/accountability-points', authenticateUser, async (req: Request, res: Response) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'Supabase not configured' });

  const currentUser = (req as any).user as AuthenticatedUser;
  // Strict Manager RBAC: Staff or Assistant Manager cannot manipulate accountability points
  if (currentUser.role !== 'MANAGER') {
    return res.status(403).json({ error: 'Only Managers can assign or deduct accountability points' });
  }

  const { staffId, staffName, amount, actionType, reason, relatedTaskId, relatedTaskName } = req.body;

  // STRICTLY MANDATORY REASON VALIDATION
  if (!reason || !String(reason).trim()) {
    return res.status(400).json({ error: 'Point reason is strictly mandatory. A reason must be provided.' });
  }

  const numAmount = Number(amount);
  if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: 'Point amount must be a positive number greater than 0.' });
  }

  if (actionType !== 'ADD' && actionType !== 'REMOVE') {
    return res.status(400).json({ error: 'actionType must be either ADD or REMOVE.' });
  }

  if (!staffId || !staffName) {
    return res.status(400).json({ error: 'staffId and staffName are required.' });
  }

  try {
    const docId = `accountability-points-${currentUser.venueId}`;
    const { data } = await sb
      .from('hndvr_templates')
      .select('template')
      .eq('id', docId)
      .eq('venue_id', currentUser.venueId)
      .single();

    const existingPoints: any[] = data?.template?.points || [];
    const now = new Date();
    const accountabilityMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

    const newPoint = {
      id: `point-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      staffId,
      staffName: String(staffName).trim(),
      venueId: currentUser.venueId,
      amount: Math.round(numAmount),
      actionType,
      reason: String(reason).trim(),
      managerId: currentUser.userId,
      managerName: currentUser.name,
      relatedTaskId: relatedTaskId || null,
      relatedTaskName: relatedTaskName || null,
      accountabilityMonth,
      createdAt: now.toISOString()
    };

    const updatedPoints = [newPoint, ...existingPoints];
    await sb.from('hndvr_templates').upsert({
      id: docId,
      venue_id: currentUser.venueId,
      template: { points: updatedPoints, updatedAt: now.toISOString() },
      version: 1,
      updated_at: now.toISOString()
    });

    broadcastSse('POINTS_UPDATED', { staffId, pointId: newPoint.id });
    res.json({ ok: true, point: newPoint });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 6.4 CALL THIS STAFF (URGENT CALL SYSTEM)
// ----------------------------------------------------

app.get('/api/supabase/staff-calls', authenticateUser, async (req: Request, res: Response) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'Supabase not configured' });

  const currentUser = (req as any).user as AuthenticatedUser;
  try {
    const docId = `staff-calls-${currentUser.venueId}`;
    const { data } = await sb
      .from('hndvr_templates')
      .select('template')
      .eq('id', docId)
      .eq('venue_id', currentUser.venueId)
      .single();

    let calls: any[] = data?.template?.calls || [];

    if (currentUser.role === 'STAFF') {
      calls = calls.filter(c => c.staffId === currentUser.userId);
    }

    res.json(calls);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/supabase/staff-calls', authenticateUser, async (req: Request, res: Response) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'Supabase not configured' });

  const currentUser = (req as any).user as AuthenticatedUser;
  if (currentUser.role === 'STAFF') {
    return res.status(403).json({ error: 'Staff members cannot dispatch manager staff calls' });
  }

  const { staffId, staffName, message } = req.body;
  if (!staffId) {
    return res.status(400).json({ error: 'staffId is required' });
  }

  try {
    const docId = `staff-calls-${currentUser.venueId}`;
    const { data } = await sb
      .from('hndvr_templates')
      .select('template')
      .eq('id', docId)
      .eq('venue_id', currentUser.venueId)
      .single();

    const existingCalls: any[] = data?.template?.calls || [];
    const now = new Date().toISOString();

    const newCall = {
      id: `call-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      staffId,
      staffName: staffName || 'Staff Member',
      venueId: currentUser.venueId,
      managerId: currentUser.userId,
      managerName: currentUser.name,
      message: message?.trim() || "Please come to the Manager's office and report ASAP.",
      status: 'SENT',
      sentAt: now,
      deliveredAt: now,
      acknowledgedAt: null
    };

    const updatedCalls = [newCall, ...existingCalls].slice(0, 100);
    await sb.from('hndvr_templates').upsert({
      id: docId,
      venue_id: currentUser.venueId,
      template: { calls: updatedCalls, updatedAt: now },
      version: 1,
      updated_at: now
    });

    broadcastSse('STAFF_CALL', newCall);
    res.json({ ok: true, call: newCall });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/supabase/staff-calls/:id/acknowledge', authenticateUser, async (req: Request, res: Response) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'Supabase not configured' });

  const currentUser = (req as any).user as AuthenticatedUser;
  const callId = req.params.id;

  try {
    const docId = `staff-calls-${currentUser.venueId}`;
    const { data } = await sb
      .from('hndvr_templates')
      .select('template')
      .eq('id', docId)
      .eq('venue_id', currentUser.venueId)
      .single();

    const calls: any[] = data?.template?.calls || [];
    let updatedCall: any = null;
    const now = new Date().toISOString();

    const updatedCalls = calls.map(c => {
      if (c.id === callId) {
        updatedCall = {
          ...c,
          status: 'ACKNOWLEDGED',
          acknowledgedAt: now
        };
        return updatedCall;
      }
      return c;
    });

    if (!updatedCall) {
      return res.status(404).json({ error: 'Staff call not found' });
    }

    await sb.from('hndvr_templates').upsert({
      id: docId,
      venue_id: currentUser.venueId,
      template: { calls: updatedCalls, updatedAt: now },
      version: 1,
      updated_at: now
    });

    broadcastSse('STAFF_CALL_ACKNOWLEDGED', updatedCall);
    res.json({ ok: true, call: updatedCall });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 7. PRIVATE PHOTO STORAGE & RETRIEVAL
// ----------------------------------------------------
// Private Bucket: hndvr-photos
// Uploads require authenticated session and enforce venue prefix.
// Returns short-lived signed URLs (1 hr) and authenticated endpoint references.

app.post('/api/supabase/storage/upload', authenticateUser, async (req: Request, res: Response) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'Supabase not configured' });

  const user = (req as any).user as AuthenticatedUser;
  const { dataUrl, storagePath } = req.body;
  if (!dataUrl || !storagePath) {
    return res.status(400).json({ error: 'dataUrl and storagePath are required' });
  }

  // Prevent directory traversal and enforce venue-scoped storage
  const normalizedPath = path.posix.normalize(storagePath).replace(/^\/+/, '');
  const expectedPrefix = `venues/${user.venueId}/`;
  if (!normalizedPath.startsWith(expectedPrefix) || normalizedPath.includes('..')) {
    return res.status(403).json({ error: 'Forbidden: Storage path does not belong to your venue' });
  }

  try {
    const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+_-]+);base64,(.+)$/);
    if (!match) {
      return res.status(400).json({ error: 'Invalid data URL format. Must be image base64.' });
    }

    let contentType = match[1];
    if (contentType === 'image/jpg') contentType = 'image/jpeg';
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(contentType)) {
      contentType = 'image/jpeg';
    }

    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, 'base64');

    const { error: uploadError } = await sb.storage
      .from('hndvr-photos')
      .upload(normalizedPath, buffer, {
        contentType,
        upsert: true
      });

    if (uploadError) {
      console.error('[Storage Upload Error]', uploadError);
      return res.status(500).json({ error: uploadError.message });
    }

    // Short-lived signed URL (3600 seconds = 1 hour)
    const { data: signedData, error: signError } = await sb.storage
      .from('hndvr-photos')
      .createSignedUrl(normalizedPath, 3600);

    if (signError || !signedData?.signedUrl) {
      return res.status(500).json({ error: signError?.message || 'Failed to generate signed URL' });
    }

    const authenticatedUrl = `/api/supabase/storage/photo?path=${encodeURIComponent(normalizedPath)}`;

    res.json({
      ok: true,
      url: signedData.signedUrl,
      signedUrl: signedData.signedUrl,
      authenticatedUrl,
      path: normalizedPath
    });
  } catch (err: any) {
    console.error('[Storage Upload Exception]', err);
    res.status(500).json({ error: err.message });
  }
});

// Authenticated photo retrieval: Verifies user belongs to venue before granting access
app.get('/api/supabase/storage/photo', authenticateUser, async (req: Request, res: Response) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'Supabase not configured' });

  const user = (req as any).user as AuthenticatedUser;
  const photoPath = req.query.path as string;
  if (!photoPath) return res.status(400).json({ error: 'Path parameter required' });

  const normalizedPath = path.posix.normalize(photoPath).replace(/^\/+/, '');
  const expectedPrefix = `venues/${user.venueId}/`;

  // Venue isolation guard: Reject attempts to access other venues' photos
  if (!normalizedPath.startsWith(expectedPrefix) || normalizedPath.includes('..')) {
    return res.status(403).json({ error: 'Forbidden: You do not have permission to access this photo' });
  }

  try {
    const { data, error } = await sb.storage.from('hndvr-photos').createSignedUrl(normalizedPath, 300);
    if (error || !data?.signedUrl) {
      return res.status(404).json({ error: error?.message || 'Photo not found' });
    }
    return res.redirect(data.signedUrl);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Batch signed URL creation for existing private photo paths
app.post('/api/supabase/storage/sign-urls', authenticateUser, async (req: Request, res: Response) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'Supabase not configured' });

  const user = (req as any).user as AuthenticatedUser;
  const { paths } = req.body;
  if (!Array.isArray(paths)) return res.status(400).json({ error: 'paths array required' });

  try {
    const expectedPrefix = `venues/${user.venueId}/`;
    const validPaths = paths.filter(p => typeof p === 'string' && p.startsWith(expectedPrefix) && !p.includes('..'));

    if (validPaths.length === 0) {
      return res.json({ ok: true, signedUrls: {} });
    }

    const signedUrls: Record<string, string> = {};
    for (const p of validPaths) {
      const { data } = await sb.storage.from('hndvr-photos').createSignedUrl(p, 3600);
      if (data?.signedUrl) {
        signedUrls[p] = data.signedUrl;
      }
    }

    res.json({ ok: true, signedUrls });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// VITE MIDDLEWARE (DEV) & STATIC (PROD)
// ----------------------------------------------------

async function startServer() {
  initServerRealtime();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[HNDVR Server] Running on http://0.0.0.0:${PORT}`);
  });
}

// Netlify loads the Express app through a serverless adapter.  Local/VM
// deployments retain the normal long-running listener.
export { app };
if (!process.env.NETLIFY) startServer();

import { supabase, isSupabaseConfigured, DEFAULT_VENUE_ID } from './supabase';
import { getApiUrl, getAuthHeaders, getAuthToken } from './apiConfig';
import { 
  VenueTemplate, 
  DailyTask, 
  DailyInspection, 
  OperationalIssue, 
  ShiftNote, 
  UserProfile, 
  IssueStatus, 
  UserRole,
  StaffAccount,
  AccountabilityPoint,
  StaffCall,
  AttendanceRecord
} from '../types';
import { uploadPhotoDataUrl, getIssueDefectPhotoStoragePath, getIssueResolutionPhotoStoragePath } from './supabaseStorage';

export type RealtimeChangeEventType = 
  | 'TEMPLATE_UPDATED'
  | 'TASKS_UPDATED'
  | 'INSPECTIONS_UPDATED'
  | 'ISSUES_UPDATED'
  | 'SHIFT_NOTES_UPDATED'
  | 'USERS_UPDATED'
  | 'POINTS_UPDATED'
  | 'STAFF_CALL'
  | 'STAFF_CALL_ACKNOWLEDGED'
  | 'ATTENDANCE_UPDATED';

type RealtimeCallback = (event: RealtimeChangeEventType, payload?: any) => void;

let activeEventSource: EventSource | null = null;
let activeRealtimeChannel: any = null;
let activePollingTimer: number | null = null;
const realtimeListeners: Set<RealtimeCallback> = new Set();

/**
 * Register a listener for realtime cloud synchronization events.
 */
export function subscribeToCloudChanges(callback: RealtimeCallback): () => void {
  realtimeListeners.add(callback);
  ensureRealtimeSubscription();

  return () => {
    realtimeListeners.delete(callback);
    if (realtimeListeners.size === 0) {
      if (activeEventSource) {
        activeEventSource.close();
        activeEventSource = null;
      }
      if (activeRealtimeChannel) {
        activeRealtimeChannel.unsubscribe();
        activeRealtimeChannel = null;
      }
      if (activePollingTimer !== null) {
        window.clearInterval(activePollingTimer);
        activePollingTimer = null;
      }
    }
  };
}

function notifyRealtimeListeners(event: RealtimeChangeEventType, payload?: any) {
  realtimeListeners.forEach(listener => {
    try {
      listener(event, payload);
    } catch (err) {
      console.error(`[Realtime] Listener error on ${event}:`, err);
    }
  });
}

/**
 * Broadcast an event across all connected HNDVR devices.
 */
export async function broadcastCloudEvent(event: RealtimeChangeEventType, payload?: any): Promise<void> {
  // 1. Broadcast via server SSE/realtime proxy
  try {
    const res = await fetch(getApiUrl('/api/supabase/broadcast'), {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ event, data: payload })
    });
    if (res.ok) return;
  } catch (err) {
    // Continue to direct broadcast fallback
  }

  // 2. Fallback to direct client broadcast if available
  if (supabase && activeRealtimeChannel) {
    try {
      await activeRealtimeChannel.send({
        type: 'broadcast',
        event: 'hndvr_event',
        payload: { event, payload, timestamp: Date.now() },
      });
    } catch (err) {
      console.warn(`[Realtime] Direct broadcast fallback failed for ${event}:`, err);
    }
  }
}

/**
 * Initialize persistent real-time subscriptions using Server-Sent Events (SSE)
 * and optional direct Supabase Realtime channel fallback.
 */
function ensureRealtimeSubscription() {
  if (typeof window === 'undefined') return;

  // 1. SSE Connection to full-stack Express server
  if (!activeEventSource) {
    try {
      const token = getAuthToken() || '';
      const sseUrl = getApiUrl(`/api/supabase/events${token ? `?token=${encodeURIComponent(token)}` : ''}`);
      activeEventSource = new EventSource(sseUrl);

      const eventNames: RealtimeChangeEventType[] = [
        'TEMPLATE_UPDATED',
        'TASKS_UPDATED',
        'INSPECTIONS_UPDATED',
        'ISSUES_UPDATED',
        'SHIFT_NOTES_UPDATED',
        'USERS_UPDATED',
        'POINTS_UPDATED',
        'STAFF_CALL',
      'STAFF_CALL_ACKNOWLEDGED'
        , 'ATTENDANCE_UPDATED'
      ];

      eventNames.forEach(evt => {
        activeEventSource?.addEventListener(evt, (e: MessageEvent) => {
          let payload: any = undefined;
          try {
            payload = e.data ? JSON.parse(e.data) : undefined;
          } catch {}
          notifyRealtimeListeners(evt, payload);
        });
      });

      activeEventSource.onopen = () => {
        console.log('[SSE Realtime] Connected to live cloud sync event bus.');
      };

      activeEventSource.onerror = () => {
        // Browser automatically attempts reconnect with exponential backoff
      };
    } catch (err) {
      console.warn('[SSE Realtime] Failed to initialize SSE event source:', err);
    }
  }

  // Netlify/serverless deployments cannot hold a permanent SSE request. A
  // Netlify counts each serverless request against the team allowance. Keep a
  // conservative fallback poll for task synchronization; SSE remains preferred
  // when available and managers can still use the manual sync button.
  if (activePollingTimer === null) {
    activePollingTimer = window.setInterval(() => {
      notifyRealtimeListeners('TASKS_UPDATED');
    }, 60000);
  }

  // Direct database subscriptions deliberately are not used for business data.
  // Every request must pass through the authorization API, including in a WebView.
  if (false && supabase && !activeRealtimeChannel) {
    try {
      activeRealtimeChannel = supabase.channel(`hndvr-sync-${DEFAULT_VENUE_ID}`)
        .on('broadcast', { event: 'hndvr_event' }, (msg: any) => {
          const { event, payload } = msg.payload || {};
          if (event) notifyRealtimeListeners(event, payload);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'hndvr_templates' }, () => {
          notifyRealtimeListeners('TEMPLATE_UPDATED');
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_tasks' }, () => {
          notifyRealtimeListeners('TASKS_UPDATED');
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'inspections' }, () => {
          notifyRealtimeListeners('INSPECTIONS_UPDATED');
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'issues' }, () => {
          notifyRealtimeListeners('ISSUES_UPDATED');
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'shift_notes' }, () => {
          notifyRealtimeListeners('SHIFT_NOTES_UPDATED');
        })
        .subscribe();
    } catch (err) {
      console.warn('[Direct Realtime] Subscription error:', err);
    }
  }
}

// ==========================================
// TEMPLATE CLOUD SERVICES
// ==========================================

export async function fetchTemplateFromCloud(): Promise<VenueTemplate | null> {
  // 1. Fetch via protected server API
  try {
    const res = await fetch(getApiUrl(`/api/supabase/template?venueId=${DEFAULT_VENUE_ID}`), {
      headers: { ...getAuthHeaders() }
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.template) {
        return data.template as VenueTemplate;
      }
      if (data && Array.isArray(data.areas) && data.areas.length > 0) {
        return {
          areas: data.areas,
          departments: [],
          version: data.version || 1,
          lastModified: data.updated_at || new Date().toISOString()
        };
      }
    }
  } catch (err) {
    console.warn('[Cloud] Server API fetch template failed, trying client fallback:', err);
  }

  // 2. Direct client fallback
  if (!isSupabaseConfigured || !supabase) return null;

  try {
    const { data: hndvrData, error: hndvrError } = await supabase
      .from('hndvr_templates')
      .select('template, version, updated_at')
      .eq('venue_id', DEFAULT_VENUE_ID)
      .maybeSingle();

    if (!hndvrError && hndvrData && hndvrData.template) {
      return hndvrData.template as VenueTemplate;
    }

    const { data: tmplData, error: tmplError } = await supabase
      .from('templates')
      .select('areas, version, updated_at')
      .eq('venue_id', DEFAULT_VENUE_ID)
      .maybeSingle();

    if (!tmplError && tmplData && Array.isArray(tmplData.areas) && tmplData.areas.length > 0) {
      return {
        areas: tmplData.areas,
        departments: [],
        version: tmplData.version || 1,
        lastModified: tmplData.updated_at || new Date().toISOString()
      };
    }

    return null;
  } catch (err) {
    console.error('[Cloud] Failed to fetch template:', err);
    return null;
  }
}

export async function saveTemplateToCloud(template: VenueTemplate): Promise<boolean> {
  const now = new Date().toISOString();
  const version = (template.version || 1) + 1;
  const updatedTemplate = { ...template, version, lastModified: now };

  // 1. Save via protected server API route
  try {
    const res = await fetch(getApiUrl('/api/supabase/template'), {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ template: updatedTemplate })
    });

    if (res.ok) {
      return true;
    }
    const errObj = await res.json().catch(() => ({}));
    console.warn('[Cloud] Server API template save error:', errObj);
  } catch (err) {
    console.warn('[Cloud] Server API save template failed, attempting direct fallback:', err);
  }

  // 2. Direct client fallback
  if (!isSupabaseConfigured || !supabase) return false;

  try {
    const { error: hndvrError } = await supabase
      .from('hndvr_templates')
      .upsert({
        id: 'hndvr-template-default',
        venue_id: DEFAULT_VENUE_ID,
        template: updatedTemplate,
        version,
        updated_at: now
      });

    if (hndvrError) {
      console.error('[Cloud] Failed to save hndvr_template:', hndvrError);
    }

    await supabase
      .from('templates')
      .upsert({
        id: 'template-default',
        venue_id: DEFAULT_VENUE_ID,
        name: 'Checklist Master Template',
        version,
        is_active: true,
        areas: updatedTemplate.areas,
        updated_at: now
      });

    await broadcastCloudEvent('TEMPLATE_UPDATED', { version, lastModified: now });
    return true;
  } catch (err) {
    console.error('[Cloud] Exception saving template:', err);
    return false;
  }
}

// ==========================================
// DAILY TASKS CLOUD SERVICES
// ==========================================

export async function fetchDailyTasksFromCloud(): Promise<DailyTask[]> {
  try {
    const res = await fetch(getApiUrl(`/api/supabase/daily-tasks?venueId=${DEFAULT_VENUE_ID}`), {
      headers: { ...getAuthHeaders() }
    });
    if (res.ok) {
      const data = await res.json();
      return (data || []).map((row: any) => ({
        id: row.id,
        date: row.date,
        title: row.title,
        notes: row.notes || row.description || undefined,
        priority: row.priority || 'NORMAL',
        status: row.status || (row.is_done ? 'DONE' : 'PENDING'),
        venueId: row.venue_id,
        venueName: row.venue_name || undefined,
        company: row.company || undefined,
        areaId: row.area_id || undefined,
        areaName: row.area_name || undefined,
        departmentId: row.department_id || 'dept-server',
        departmentName: row.department_name || undefined,
        assignedUserId: row.assigned_to_user_id || undefined,
        assignedUserName: row.assigned_to_name || undefined,
        assignedRole: row.assigned_to_role || undefined,
        createdByUserId: row.created_by_user_id || 'user-manager',
        createdByName: row.created_by_name || 'General Manager',
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        startedAt: row.started_at || undefined,
        startedByUserId: row.started_by_user_id || undefined,
        startedByName: row.started_by_name || undefined,
        completedAt: row.completed_at || undefined,
        completedByUserId: row.completed_by_user_id || undefined,
        completedByName: row.completed_by_name || undefined,
        completionNote: row.completion_note || row.completion_notes || undefined,
        completionPhotoUrl: row.completion_photo_url || undefined,
        history: Array.isArray(row.history) ? row.history : []
      }));
    }
  } catch (err) {
    console.warn('[Cloud] Server API fetch daily-tasks failed:', err);
  }

  // Do not fall back to direct Supabase reads: the anonymous browser key does
  // not carry this application's custom PIN permissions.
  return [];
  /*
  try {
    const { data, error } = await supabase
      .from('daily_tasks')
      .select('*')
      .eq('venue_id', DEFAULT_VENUE_ID)
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map(row => ({
      id: row.id,
      date: row.date,
      title: row.title,
      notes: row.notes || undefined,
      priority: row.priority || 'NORMAL',
      status: row.status || (row.is_done ? 'DONE' : 'PENDING'),
      venueId: row.venue_id,
      venueName: row.venue_name || undefined,
      areaId: row.area_id || undefined,
      areaName: row.area_name || undefined,
      departmentId: row.department_id || 'dept-server',
      departmentName: row.department_name || undefined,
      assignedUserId: row.assigned_to_user_id || undefined,
      assignedUserName: row.assigned_to_name || undefined,
      assignedRole: row.assigned_to_role || undefined,
      createdByUserId: row.created_by_user_id || 'user-manager',
      createdByName: row.created_by_name || 'General Manager',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      startedAt: row.started_at || undefined,
      startedByUserId: row.started_by_user_id || undefined,
      startedByName: row.started_by_name || undefined,
      completedAt: row.completed_at || undefined,
      completedByUserId: row.completed_by_user_id || undefined,
      completedByName: row.completed_by_name || undefined,
      completionNote: row.completion_note || undefined,
      history: Array.isArray(row.history) ? row.history : []
    }));
  } catch (err) {
    console.error('[Cloud] Exception fetching daily_tasks:', err);
    return [];
  } */
}

export async function saveDailyTaskToCloud(task: DailyTask): Promise<boolean> {
  try {
    const res = await fetch(getApiUrl('/api/supabase/daily-tasks'), {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(task)
    });
    if (res.ok) return true;
  } catch (err) {
    console.warn('[Cloud] Server API save daily-task failed:', err);
  }

  return false;
  /*
  if (!isSupabaseConfigured || !supabase) return false;

  try {
    const now = new Date().toISOString();
    const payload = {
      id: task.id,
      venue_id: DEFAULT_VENUE_ID,
      venue_name: task.venueName || null,
      date: task.date,
      title: task.title,
      notes: task.notes || null,
      priority: task.priority || 'NORMAL',
      status: task.status || (task.status === 'DONE' ? 'DONE' : 'PENDING'),
      is_done: task.status === 'DONE',
      department_id: (task as any).departmentId || 'dept-server',
      department_name: (task as any).departmentName || null,
      area_id: task.areaId || null,
      area_name: task.areaName || null,
      assigned_to_user_id: (task as any).assignedUserId || null,
      assigned_to_name: (task as any).assignedUserName || null,
      assigned_to_role: (task as any).assignedRole || null,
      created_by_user_id: task.createdByUserId || 'user-manager',
      created_by_name: task.createdByName || 'General Manager',
      started_at: task.startedAt || null,
      started_by_user_id: task.startedByUserId || null,
      started_by_name: task.startedByName || null,
      completed_at: task.completedAt || null,
      completed_by_user_id: task.completedByUserId || null,
      completed_by_name: task.completedByName || null,
      completion_note: task.completionNote || null,
      history: task.history || [],
      created_at: task.createdAt || now,
      updated_at: now
    };

    const { error } = await supabase.from('daily_tasks').upsert(payload);
    if (!error) {
      await broadcastCloudEvent('TASKS_UPDATED', { taskId: task.id });
      return true;
    }
    return false;
  } catch (err) {
    console.error('[Cloud] Exception saving daily_task:', err);
    return false;
  } */
}

// ==========================================
// ATTENDANCE CLOUD SERVICES
// ==========================================

function mapAttendance(row: any): AttendanceRecord {
  return {
    id: String(row.id), type: row.attendance_type === 'CHECK_OUT' ? 'CHECK_OUT' : 'CHECK_IN',
    staffUserId: String(row.staff_user_id), staffName: String(row.staff_name), staffRole: row.staff_role,
    venueId: String(row.venue_id), venueName: row.venue_name || '', areaIds: Array.isArray(row.area_ids) ? row.area_ids : [],
    checklistInspectionId: row.checklist_inspection_id || '', checklistCompletedAt: row.checklist_completed_at || '',
    capturedAt: row.captured_at, serverReceivedAt: row.server_received_at || undefined,
    wifiSsid: row.wifi_ssid || undefined, wifiVerified: Boolean(row.wifi_verified), deviceId: row.device_id,
    selfieUrl: row.selfie_url, syncStatus: row.sync_status === 'REJECTED' ? 'REJECTED' : 'VERIFIED_CLOUD',
    rejectionReason: row.rejection_reason || undefined
  };
}

export async function fetchAttendanceRecordsFromCloud(): Promise<AttendanceRecord[]> {
  try {
    const res = await fetch(getApiUrl('/api/supabase/attendance'), { headers: getAuthHeaders() });
    if (res.ok) return (await res.json()).map(mapAttendance);
  } catch (error) { console.warn('[Cloud] attendance fetch failed:', error); }
  return [];
}

export async function saveAttendanceRecordToCloud(record: AttendanceRecord): Promise<AttendanceRecord | null> {
  try {
    const res = await fetch(getApiUrl('/api/supabase/attendance'), {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }, body: JSON.stringify(record)
    });
    if (!res.ok) return null;
    const result = await res.json();
    return { ...record, serverReceivedAt: result.serverReceivedAt, syncStatus: 'VERIFIED_CLOUD' };
  } catch (error) { console.warn('[Cloud] attendance save failed:', error); return null; }
}

export async function deleteDailyTaskFromCloud(taskId: string): Promise<boolean> {
  try {
    const res = await fetch(getApiUrl(`/api/supabase/daily-tasks/${taskId}`), {
      method: 'DELETE',
      headers: { ...getAuthHeaders() }
    });
    if (res.ok) return true;
  } catch (err) {
    console.warn('[Cloud] Server API delete daily-task failed:', err);
  }

  if (!isSupabaseConfigured || !supabase) return false;

  try {
    const { error } = await supabase.from('daily_tasks').delete().eq('id', taskId);
    if (!error) {
      await broadcastCloudEvent('TASKS_UPDATED', { taskId, deleted: true });
      return true;
    }
    return false;
  } catch (err) {
    console.error('[Cloud] Exception deleting daily_task:', err);
    return false;
  }
}

// ==========================================
// DAILY INSPECTIONS CLOUD SERVICES
// ==========================================

export async function fetchInspectionsFromCloud(): Promise<DailyInspection[]> {
  try {
    const res = await fetch(getApiUrl(`/api/supabase/inspections?venueId=${DEFAULT_VENUE_ID}`), {
      headers: { ...getAuthHeaders() }
    });
    if (res.ok) {
      const data = await res.json();
      return (data || []).map((row: any) => ({
        id: row.id,
        date: row.date,
        venueId: row.venue_id,
        isCompleted: row.status === 'COMPLETED' || row.is_completed || false,
        itemResults: row.item_results || {},
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        startedAt: row.started_at || undefined,
        startedByName: row.started_by_name || undefined,
        startedByRole: row.started_by_role || undefined,
        completedAt: row.completed_at || undefined,
        completedByName: row.completed_by_name || undefined,
        completedByRole: row.completed_by_role || undefined,
        totalItems: row.total_items || 0,
        readyItems: row.ready_items || 0,
        notReadyItems: row.not_ready_items || 0,
        naItems: row.na_items || 0,
        totalIssuesCount: row.total_issues_count || 0,
        isHandedOver: row.is_handed_over || false
      }));
    }
  } catch (err) {
    console.warn('[Cloud] Server API fetch inspections failed:', err);
  }

  if (!isSupabaseConfigured || !supabase) return [];

  try {
    const { data, error } = await supabase
      .from('inspections')
      .select('*')
      .eq('venue_id', DEFAULT_VENUE_ID)
      .order('date', { ascending: false });

    if (error || !data) return [];

    return data.map(row => ({
      id: row.id,
      date: row.date,
      venueId: row.venue_id,
      isCompleted: row.is_completed,
      itemResults: row.item_results || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      startedAt: row.started_at || undefined,
      startedByName: row.started_by_name || undefined,
      startedByRole: row.started_by_role || undefined,
      completedAt: row.completed_at || undefined,
      completedByName: row.completed_by_name || undefined,
      completedByRole: row.completed_by_role || undefined,
      totalItems: row.total_items || 0,
      readyItems: row.ready_items || 0,
      notReadyItems: row.not_ready_items || 0,
      naItems: row.na_items || 0,
      totalIssuesCount: row.total_issues_count || 0,
      isHandedOver: row.is_handed_over || false
    }));
  } catch (err) {
    console.error('[Cloud] Exception fetching inspections:', err);
    return [];
  }
}

export async function saveInspectionToCloud(inspection: DailyInspection): Promise<boolean> {
  try {
    const res = await fetch(getApiUrl('/api/supabase/inspections'), {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(inspection)
    });
    if (res.ok) return true;
  } catch (err) {
    console.warn('[Cloud] Server API save inspection failed:', err);
  }

  if (!isSupabaseConfigured || !supabase) return false;

  try {
    const now = new Date().toISOString();
    const payload = {
      id: inspection.id,
      venue_id: DEFAULT_VENUE_ID,
      template_id: 'template-default',
      date: inspection.date,
      is_completed: inspection.isCompleted,
      item_results: inspection.itemResults || {},
      started_at: inspection.startedAt || now,
      started_by_name: inspection.startedByName || null,
      started_by_role: inspection.startedByRole || null,
      completed_at: inspection.completedAt || null,
      completed_by_name: inspection.completedByName || null,
      completed_by_role: (inspection as any).completedByRole || null,
      total_items: inspection.totalItems || 0,
      ready_items: inspection.readyItems || 0,
      not_ready_items: inspection.notReadyItems || 0,
      na_items: inspection.naItems || 0,
      total_issues_count: inspection.totalIssuesCount || 0,
      is_handed_over: inspection.isHandedOver || false,
      created_at: inspection.startedAt || now,
      updated_at: now
    };

    const { error } = await supabase.from('inspections').upsert(payload);
    if (!error) {
      await broadcastCloudEvent('INSPECTIONS_UPDATED', { date: inspection.date });
      return true;
    }
    return false;
  } catch (err) {
    console.error('[Cloud] Exception saving inspection:', err);
    return false;
  }
}

// ==========================================
// OPERATIONAL ISSUES CLOUD SERVICES
// ==========================================

export async function fetchIssuesFromCloud(): Promise<OperationalIssue[]> {
  try {
    const res = await fetch(getApiUrl(`/api/supabase/issues?venueId=${DEFAULT_VENUE_ID}`), {
      headers: { ...getAuthHeaders() }
    });
    if (res.ok) {
      const data = await res.json();
      return (data || []).map((row: any) => ({
        id: row.id,
        inspectionDate: row.inspection_date,
        inspectionId: row.inspection_id || `INSP-${row.inspection_date}`,
        statusUpdatedAt: row.status_updated_at || row.discovered_at,
        areaId: row.area_id,
        areaName: row.area_name || 'General Area',
        itemId: row.item_id,
        itemName: row.item_name || 'General Item',
        criterionId: row.criterion_id,
        criterionName: row.criterion_name || '',
        departmentId: row.department_id || 'dept-server',
        departmentName: row.department_name || 'General',
        venueId: row.venue_id,
        venueName: row.venue_name || undefined,
        originalInspectionStatus: (row.original_inspection_status || 'NOT_READY') as 'NOT_OK',
        currentStatus: row.current_status as IssueStatus,
        specificProblems: Array.isArray(row.specific_problems) ? row.specific_problems : [],
        customNote: row.custom_note || undefined,
        photoUrl: row.photo_url || (Array.isArray(row.photos) && row.photos[0]) || undefined,
        photos: Array.isArray(row.photos) ? row.photos : [],
        resolutionPhotoUrl: row.resolution_photo_url || (Array.isArray(row.resolution_photos) && row.resolution_photos[0]) || undefined,
        resolutionPhotos: Array.isArray(row.resolution_photos) ? row.resolution_photos : [],
        discoveredAt: row.discovered_at,
        discoveredByName: row.discovered_by_name,
        discoveredByRole: row.discovered_by_role as UserRole,
        resolutionInfo: row.resolution_info || (row.resolved_at ? {
          resolvedAt: row.resolved_at,
          resolvedByName: row.resolved_by_name || 'Assistant Manager',
          notes: row.resolution_notes || undefined,
        } : undefined),
        verificationInfo: row.verification_info || (row.verified_at ? {
          verifiedAt: row.verified_at,
          verifiedByName: row.verified_by_name || 'General Manager',
          verifiedByRole: 'MANAGER' as const,
          notes: row.verification_notes || undefined
        } : undefined),
        reopenCount: row.reopen_count || 0,
        auditTrail: Array.isArray(row.audit_trail) ? row.audit_trail : []
      }));
    }
  } catch (err) {
    console.warn('[Cloud] Server API fetch issues failed:', err);
  }

  if (!isSupabaseConfigured || !supabase) return [];

  try {
    const { data, error } = await supabase
      .from('issues')
      .select('*')
      .eq('venue_id', DEFAULT_VENUE_ID)
      .order('discovered_at', { ascending: false });

    if (error || !data) return [];

    return data.map(row => ({
      id: row.id,
      inspectionDate: row.inspection_date,
      inspectionId: row.inspection_id || `INSP-${row.inspection_date}`,
      statusUpdatedAt: row.status_updated_at || row.discovered_at,
      areaId: row.area_id,
      areaName: row.area_name,
      itemId: row.item_id,
      itemName: row.item_name,
      criterionId: row.criterion_id,
      criterionName: row.criterion_name,
      departmentId: row.department_id || 'dept-server',
      departmentName: row.department_name || '',
      venueId: row.venue_id,
      venueName: row.venue_name || undefined,
      originalInspectionStatus: (row.original_inspection_status || 'NOT_READY') as 'NOT_OK',
      currentStatus: row.current_status as IssueStatus,
      specificProblems: Array.isArray(row.specific_problems) ? row.specific_problems : [],
      customNote: row.custom_note || undefined,
      photoUrl: row.photo_url || (Array.isArray(row.photos) && row.photos[0]) || undefined,
      photos: Array.isArray(row.photos) ? row.photos : [],
      resolutionPhotoUrl: row.resolution_photo_url || (Array.isArray(row.resolution_photos) && row.resolution_photos[0]) || undefined,
      resolutionPhotos: Array.isArray(row.resolution_photos) ? row.resolution_photos : [],
      discoveredAt: row.discovered_at,
      discoveredByName: row.discovered_by_name,
      discoveredByRole: row.discovered_by_role as UserRole,
      resolutionInfo: row.resolution_info || (row.resolved_at ? {
        resolvedAt: row.resolved_at,
        resolvedByName: row.resolved_by_name || 'Assistant Manager',
        notes: row.resolution_notes || undefined,
      } : undefined),
      verificationInfo: row.verification_info || (row.verified_at ? {
        verifiedAt: row.verified_at,
        verifiedByName: row.verified_by_name || 'General Manager',
        verifiedByRole: 'MANAGER' as const,
        notes: row.verification_notes || undefined
      } : undefined),
      reopenCount: row.reopen_count || 0,
      auditTrail: Array.isArray(row.audit_trail) ? row.audit_trail : []
    }));
  } catch (err) {
    console.error('[Cloud] Exception fetching issues:', err);
    return [];
  }
}

export async function saveIssueToCloud(issue: OperationalIssue): Promise<boolean> {
  // 1. Upload defect photos if they are dataUrls
  const cloudPhotos: string[] = [];
  if (Array.isArray(issue.photos)) {
    for (let i = 0; i < issue.photos.length; i++) {
      const p = issue.photos[i];
      if (p.startsWith('data:')) {
        const path = getIssueDefectPhotoStoragePath(DEFAULT_VENUE_ID, issue.id, `defect_${i}_${Date.now()}`);
        const uploadedUrl = await uploadPhotoDataUrl(path, p);
        cloudPhotos.push(uploadedUrl || p);
      } else {
        cloudPhotos.push(p);
      }
    }
  }

  // 2. Upload resolution photos if dataUrls
  const cloudResolutionPhotos: string[] = [];
  if (Array.isArray(issue.resolutionPhotos)) {
    for (let i = 0; i < issue.resolutionPhotos.length; i++) {
      const p = issue.resolutionPhotos[i];
      if (p.startsWith('data:')) {
        const path = getIssueResolutionPhotoStoragePath(DEFAULT_VENUE_ID, issue.id, `resolution_${i}_${Date.now()}`);
        const uploadedUrl = await uploadPhotoDataUrl(path, p);
        cloudResolutionPhotos.push(uploadedUrl || p);
      } else {
        cloudResolutionPhotos.push(p);
      }
    }
  }

  const issueWithPhotos = {
    ...issue,
    photos: cloudPhotos,
    resolutionPhotos: cloudResolutionPhotos,
    photoUrl: cloudPhotos[0] || issue.photoUrl,
    resolutionPhotoUrl: cloudResolutionPhotos[0] || issue.resolutionPhotoUrl
  };

  try {
    const res = await fetch(getApiUrl('/api/supabase/issues'), {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(issueWithPhotos)
    });
    if (res.ok) return true;
  } catch (err) {
    console.warn('[Cloud] Server API save issue failed:', err);
  }

  if (!isSupabaseConfigured || !supabase) return false;

  try {
    const now = new Date().toISOString();
    let dbStatus: 'NOT_READY' | 'WAITING_VERIFICATION' | 'VERIFIED' = 'NOT_READY';
    if (issue.currentStatus === 'VERIFIED') {
      dbStatus = 'VERIFIED';
    } else if ((issue.currentStatus as string) === 'WAITING_VERIFICATION' || (issue.currentStatus as string) === 'RESOLVED_PENDING_VERIFICATION') {
      dbStatus = 'WAITING_VERIFICATION';
    }

    const payload = {
      id: issue.id,
      venue_id: DEFAULT_VENUE_ID,
      venue_name: issue.venueName || null,
      inspection_id: null,
      inspection_date: issue.inspectionDate,
      area_id: issue.areaId,
      area_name: issue.areaName,
      item_id: issue.itemId,
      item_name: issue.itemName,
      criterion_id: issue.criterionId,
      criterion_name: issue.criterionName,
      department_id: issue.departmentId || 'dept-server',
      department_name: issue.departmentName || null,
      original_inspection_status: issue.originalInspectionStatus || 'NOT_OK',
      current_status: dbStatus,
      specific_problems: issue.specificProblems || [],
      custom_note: issue.customNote || null,
      photos: cloudPhotos,
      resolution_photos: cloudResolutionPhotos,
      photo_url: cloudPhotos[0] || null,
      resolution_photo_url: cloudResolutionPhotos[0] || null,
      discovered_at: issue.discoveredAt || now,
      discovered_by_id: 'user-manager',
      discovered_by_name: issue.discoveredByName || 'General Manager',
      discovered_by_role: issue.discoveredByRole || 'MANAGER',
      resolved_at: issue.resolutionInfo?.resolvedAt || null,
      resolved_by_id: issue.resolutionInfo ? 'user-asst-manager' : null,
      resolved_by_name: issue.resolutionInfo?.resolvedByName || null,
      resolved_by_role: (issue.resolutionInfo as any)?.resolvedByRole || null,
      resolution_notes: issue.resolutionInfo?.notes || null,
      verified_at: issue.verificationInfo?.verifiedAt || null,
      verified_by_id: issue.verificationInfo ? 'user-manager' : null,
      verified_by_name: issue.verificationInfo?.verifiedByName || null,
      verified_by_role: issue.verificationInfo?.verifiedByRole || null,
      verification_notes: issue.verificationInfo?.notes || null,
      status_updated_at: now,
      resolution_info: issue.resolutionInfo || null,
      verification_info: issue.verificationInfo || null,
      reopen_count: issue.reopenCount || 0,
      audit_trail: issue.auditTrail || [],
      created_at: issue.discoveredAt || now,
      updated_at: now
    };

    const { error } = await supabase.from('issues').upsert(payload);
    if (!error) {
      await broadcastCloudEvent('ISSUES_UPDATED', { issueId: issue.id });
      return true;
    }
    return false;
  } catch (err) {
    console.error('[Cloud] Exception saving issue:', err);
    return false;
  }
}

// ==========================================
// SHIFT NOTES CLOUD SERVICES
// ==========================================

export async function fetchShiftNotesFromCloud(): Promise<ShiftNote[]> {
  try {
    const res = await fetch(getApiUrl(`/api/supabase/shift-notes?venueId=${DEFAULT_VENUE_ID}`), {
      headers: { ...getAuthHeaders() }
    });
    if (res.ok) {
      const data = await res.json();
      return (data || []).map((row: any) => ({
        id: row.id,
        date: row.date,
        content: row.content,
        authorId: row.author_id || 'user-manager',
        authorName: row.author_name,
        authorRole: row.author_role as UserRole,
        category: row.category || 'HANDOVER',
        status: row.status || 'OPEN',
        completedAt: row.completed_at || undefined,
        completedByName: row.completed_by_name || undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at || row.created_at
      }));
    }
  } catch (err) {
    console.warn('[Cloud] Server API fetch shift-notes failed:', err);
  }

  if (!isSupabaseConfigured || !supabase) return [];

  try {
    const { data, error } = await supabase
      .from('shift_notes')
      .select('*')
      .eq('venue_id', DEFAULT_VENUE_ID)
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map(row => ({
      id: row.id,
      date: row.date,
      content: row.content,
      authorId: row.author_id || 'user-manager',
      authorName: row.author_name,
      authorRole: row.author_role as UserRole,
      category: row.category || 'HANDOVER',
      status: row.status || 'OPEN',
      completedAt: row.completed_at || undefined,
      completedByName: row.completed_by_name || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at || row.created_at
    }));
  } catch (err) {
    console.error('[Cloud] Exception fetching shift_notes:', err);
    return [];
  }
}

export async function saveShiftNoteToCloud(note: ShiftNote): Promise<boolean> {
  try {
    const res = await fetch(getApiUrl('/api/supabase/shift-notes'), {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(note)
    });
    if (res.ok) return true;
  } catch (err) {
    console.warn('[Cloud] Server API save shift-note failed:', err);
  }

  if (!isSupabaseConfigured || !supabase) return false;

  try {
    const now = new Date().toISOString();
    const payload = {
      id: note.id,
      venue_id: DEFAULT_VENUE_ID,
      date: note.date,
      content: note.content,
      author_id: note.authorId || 'user-manager',
      author_name: note.authorName || 'General Manager',
      author_role: note.authorRole || 'MANAGER',
      category: note.category || 'HANDOVER',
      status: note.status || 'OPEN',
      completed_at: note.completedAt || null,
      completed_by_name: note.completedByName || null,
      timestamp: note.createdAt || now,
      created_at: note.createdAt || now,
      updated_at: now
    };

    const { error } = await supabase.from('shift_notes').upsert(payload);
    if (!error) {
      await broadcastCloudEvent('SHIFT_NOTES_UPDATED', { noteId: note.id });
      return true;
    }
    return false;
  } catch (err) {
    console.error('[Cloud] Exception saving shift_note:', err);
    return false;
  }
}

export async function deleteShiftNoteFromCloud(noteId: string): Promise<boolean> {
  try {
    const res = await fetch(getApiUrl(`/api/supabase/shift-notes/${noteId}`), {
      method: 'DELETE',
      headers: { ...getAuthHeaders() }
    });
    if (res.ok) return true;
  } catch (err) {
    console.warn('[Cloud] Server API delete shift-note failed:', err);
  }

  if (!isSupabaseConfigured || !supabase) return false;

  try {
    const { error } = await supabase.from('shift_notes').delete().eq('id', noteId);
    if (!error) {
      await broadcastCloudEvent('SHIFT_NOTES_UPDATED', { noteId, deleted: true });
      return true;
    }
    return false;
  } catch (err) {
    console.error('[Cloud] Exception deleting shift_note:', err);
    return false;
  }
}

// ==========================================
// USERS CLOUD SERVICES
// ==========================================

export async function fetchUsersFromCloud(): Promise<UserProfile[]> {
  try {
    const res = await fetch(getApiUrl(`/api/supabase/users?venueId=${DEFAULT_VENUE_ID}`), {
      headers: { ...getAuthHeaders() }
    });
    if (res.ok) {
      const data = await res.json();
      return (data || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        role: row.role as UserRole,
        pinHash: row.pin_hash,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    }
  } catch (err) {
    console.warn('[Cloud] Server API fetch users failed:', err);
  }

  if (!isSupabaseConfigured || !supabase) return [];

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('venue_id', DEFAULT_VENUE_ID)
      .eq('status', 'ACTIVE');

    if (error || !data || data.length === 0) return [];

    return data.map(row => ({
      id: row.id,
      name: row.name,
      role: row.role as UserRole,
      pinHash: row.pin_hash,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  } catch (err) {
    console.error('[Cloud] Exception fetching users:', err);
    return [];
  }
}

export async function saveUserToCloud(user: UserProfile): Promise<boolean> {
  try {
    const res = await fetch(getApiUrl('/api/supabase/users'), {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(user)
    });
    if (res.ok) return true;
  } catch (err) {
    console.warn('[Cloud] Server API save user failed:', err);
  }

  if (!isSupabaseConfigured || !supabase) return false;

  try {
    const now = new Date().toISOString();
    const payload = {
      id: user.id,
      venue_id: DEFAULT_VENUE_ID,
      name: user.name,
      role: user.role,
      pin_hash: user.pinHash,
      salt: 'DAILY_OPS_SALT_',
      status: 'ACTIVE',
      created_at: user.createdAt || now,
      updated_at: now
    };

    const { error } = await supabase.from('users').upsert(payload);
    if (!error) {
      await broadcastCloudEvent('USERS_UPDATED', { userId: user.id });
      return true;
    }
    return false;
  } catch (err) {
    console.error('[Cloud] Exception saving user:', err);
    return false;
  }
}

// ----------------------------------------------------
// 8. STAFF PROFILES & CREDENTIALS SERVICE
// ----------------------------------------------------

export async function fetchStaffProfilesFromCloud(): Promise<StaffAccount[]> {
  try {
    const res = await fetch(getApiUrl('/api/supabase/staff-profiles'), {
      headers: { ...getAuthHeaders() }
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch (err) {
    console.warn('[Cloud] Failed to fetch staff profiles from server:', err);
  }
  return [];
}

export async function saveStaffProfileToCloud(profile: StaffAccount, pin?: string): Promise<{ ok: boolean; profile?: StaffAccount; error?: string }> {
  try {
    const res = await fetch(getApiUrl('/api/supabase/staff-profiles'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ profile, pin })
    });
    const json = await res.json();
    if (res.ok && json.ok) {
      return { ok: true, profile: json.profile };
    }
    return { ok: false, error: json.error || 'Failed to save staff profile' };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Network error' };
  }
}

export async function deleteStaffProfileFromCloud(id: string): Promise<boolean> {
  try {
    const res = await fetch(getApiUrl(`/api/supabase/staff-profiles/${id}`), {
      method: 'DELETE',
      headers: { ...getAuthHeaders() }
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ----------------------------------------------------
// 9. ACCOUNTABILITY POINTS SYSTEM SERVICE
// ----------------------------------------------------

export async function fetchAccountabilityPointsFromCloud(): Promise<AccountabilityPoint[]> {
  try {
    const res = await fetch(getApiUrl('/api/supabase/accountability-points'), {
      headers: { ...getAuthHeaders() }
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch (err) {
    console.warn('[Cloud] Failed to fetch accountability points:', err);
  }
  return [];
}

export async function addAccountabilityPointToCloud(pointData: {
  staffId: string;
  staffName: string;
  amount: number;
  actionType: 'ADD' | 'REMOVE';
  reason: string;
  relatedTaskId?: string;
  relatedTaskName?: string;
}): Promise<{ ok: boolean; point?: AccountabilityPoint; error?: string }> {
  try {
    const res = await fetch(getApiUrl('/api/supabase/accountability-points'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(pointData)
    });
    const json = await res.json();
    if (res.ok && json.ok) {
      return { ok: true, point: json.point };
    }
    return { ok: false, error: json.error || 'Failed to record point adjustment' };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Network error' };
  }
}

// ----------------------------------------------------
// 10. CALL THIS STAFF (URGENT CALL SERVICE)
// ----------------------------------------------------

export async function fetchStaffCallsFromCloud(): Promise<StaffCall[]> {
  try {
    const res = await fetch(getApiUrl('/api/supabase/staff-calls'), {
      headers: { ...getAuthHeaders() }
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch (err) {
    console.warn('[Cloud] Failed to fetch staff calls:', err);
  }
  return [];
}

export async function sendStaffCallToCloud(callData: {
  staffId: string;
  staffName: string;
  message?: string;
}): Promise<{ ok: boolean; call?: StaffCall; error?: string }> {
  try {
    const res = await fetch(getApiUrl('/api/supabase/staff-calls'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(callData)
    });
    const json = await res.json();
    if (res.ok && json.ok) {
      return { ok: true, call: json.call };
    }
    return { ok: false, error: json.error || 'Failed to dispatch call to staff' };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Network error' };
  }
}

export async function acknowledgeStaffCallInCloud(callId: string): Promise<{ ok: boolean; call?: StaffCall; error?: string }> {
  try {
    const res = await fetch(getApiUrl(`/api/supabase/staff-calls/${callId}/acknowledge`), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      }
    });
    const json = await res.json();
    if (res.ok && json.ok) {
      return { ok: true, call: json.call };
    }
    return { ok: false, error: json.error || 'Failed to acknowledge call' };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Network error' };
  }
}

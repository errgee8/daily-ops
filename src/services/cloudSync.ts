import { supabase } from './supabase';
import type {
  DailyInspection,
  OperationalIssue,
  DailyTask,
  ShiftNote,
  AttendanceRecord,
} from '../types';

import {
  saveMultipleInspections,
  saveMultipleIssues,
  saveMultipleDailyTasks,
  saveShiftNote,
} from '../db/indexedDb';

export interface CloudSyncResult {
  success: boolean;
  error?: string;
}

export interface CloudPullResult {
  success: boolean;
  pulled: {
    inspections: number;
    issues: number;
    tasks: number;
    notes: number;
  };
  errors: string[];
}

/**
 * HNDVR 1.1 — Cloud Sync Service
 *
 * Architecture:
 *
 * Supabase
 *    ↓
 * cloudSync.ts
 *    ↓
 * IndexedDB / localStorage
 *
 * IndexedDB remains the local/offline source.
 * Supabase is the shared cloud layer.
 *
 * Local PIN authentication remains completely separate
 * from Supabase device authentication.
 */

/* ============================================================
   CLOUD AUTHENTICATION
   ============================================================ */

export async function isCloudAuthenticated(): Promise<boolean> {
  if (!supabase) {
    return false;
  }

  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.warn(
        'HNDVR cloud session check failed:',
        error.message
      );

      return false;
    }

    return !!data.session;
  } catch (err) {
    console.warn(
      'HNDVR cloud session check failed:',
      err
    );

    return false;
  }
}

/* ============================================================
   GENERIC CLOUD UPLOAD
   ============================================================ */

export async function uploadCloudRecord(
  table: string,
  record: Record<string, unknown>
): Promise<CloudSyncResult> {
  if (!supabase) {
    return {
      success: false,
      error: 'Supabase is not configured.',
    };
  }

  try {
    const authenticated = await isCloudAuthenticated();

    if (!authenticated) {
      return {
        success: false,
        error: 'No authenticated HNDVR cloud session.',
      };
    }

    const { error } = await supabase
      .from(table)
      .upsert(record);

    if (error) {
      console.error(
        `HNDVR cloud upload failed (${table}):`,
        error
      );

      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Unknown cloud upload error';

    console.error(
      `HNDVR cloud upload exception (${table}):`,
      err
    );

    return {
      success: false,
      error: message,
    };
  }
}

/* ============================================================
   GENERIC CLOUD DOWNLOAD
   ============================================================ */

export async function downloadCloudRecords(
  table: string
): Promise<{
  success: boolean;
  data: Record<string, unknown>[];
  error?: string;
}> {
  if (!supabase) {
    return {
      success: false,
      data: [],
      error: 'Supabase is not configured.',
    };
  }

  try {
    const authenticated = await isCloudAuthenticated();

    if (!authenticated) {
      return {
        success: false,
        data: [],
        error: 'No authenticated HNDVR cloud session.',
      };
    }

    const { data, error } = await supabase
      .from(table)
      .select('*');

    if (error) {
      console.error(
        `HNDVR cloud download failed (${table}):`,
        error
      );

      return {
        success: false,
        data: [],
        error: error.message,
      };
    }

    return {
      success: true,
      data: (data ?? []) as Record<string, unknown>[],
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Unknown cloud download error';

    console.error(
      `HNDVR cloud download exception (${table}):`,
      err
    );

    return {
      success: false,
      data: [],
      error: message,
    };
  }
}

/* ============================================================
   INSPECTIONS
   ============================================================ */

export async function uploadInspection(
  inspection: DailyInspection
): Promise<CloudSyncResult> {
  return uploadCloudRecord('inspections', {
    id: inspection.id,
    date: inspection.date,
    venue_id: inspection.venueId ?? null,

    started_at: inspection.startedAt,
    started_by_name: inspection.startedByName,
    started_by_role: inspection.startedByRole,

    completed_at: inspection.completedAt ?? null,
    completed_by_name: inspection.completedByName ?? null,
    is_completed: inspection.isCompleted,

    handed_over_at: inspection.handedOverAt ?? null,
    handed_over_by_name:
      inspection.handedOverByName ?? null,
    is_handed_over: inspection.isHandedOver,

    total_items: inspection.totalItems,
    ready_items: inspection.readyItems,
    not_ready_items: inspection.notReadyItems,
    na_items: inspection.naItems,
    total_issues_count: inspection.totalIssuesCount,

    item_results: inspection.itemResults,
    notes: inspection.notes ?? null,

    updated_at: new Date().toISOString(),
  });
}

function mapCloudInspection(
  row: Record<string, unknown>
): DailyInspection {
  return {
    id: String(row.id ?? ''),
    date: String(row.date ?? ''),

    venueId:
      typeof row.venue_id === 'string'
        ? row.venue_id
        : undefined,

    startedAt: String(
      row.started_at ?? new Date().toISOString()
    ),

    startedByName: String(
      row.started_by_name ?? ''
    ),

    startedByRole:
      row.started_by_role === 'MANAGER' ||
      row.started_by_role === 'ASSISTANT_MANAGER' ||
      row.started_by_role === 'STAFF'
        ? row.started_by_role
        : 'MANAGER',

    completedAt:
      typeof row.completed_at === 'string'
        ? row.completed_at
        : undefined,

    completedByName:
      typeof row.completed_by_name === 'string'
        ? row.completed_by_name
        : undefined,

    isCompleted: Boolean(row.is_completed),

    handedOverAt:
      typeof row.handed_over_at === 'string'
        ? row.handed_over_at
        : undefined,

    handedOverByName:
      typeof row.handed_over_by_name === 'string'
        ? row.handed_over_by_name
        : undefined,

    isHandedOver: Boolean(row.is_handed_over),

    totalItems: Number(row.total_items ?? 0),
    readyItems: Number(row.ready_items ?? 0),
    notReadyItems: Number(row.not_ready_items ?? 0),
    naItems: Number(row.na_items ?? 0),
    totalIssuesCount: Number(
      row.total_issues_count ?? 0
    ),

    itemResults:
      row.item_results &&
      typeof row.item_results === 'object'
        ? (row.item_results as DailyInspection['itemResults'])
        : {},

    notes:
      typeof row.notes === 'string'
        ? row.notes
        : undefined,
  };
}

/* ============================================================
   ISSUES
   ============================================================ */

export async function uploadIssue(
  issue: OperationalIssue
): Promise<CloudSyncResult> {
  return uploadCloudRecord('issues', {
    id: issue.id,
    inspection_date: issue.inspectionDate,
    inspection_id: issue.inspectionId,

    venue_id: issue.venueId ?? null,
    venue_name: issue.venueName ?? null,

    area_id: issue.areaId,
    area_name: issue.areaName,

    item_id: issue.itemId,
    item_name: issue.itemName,

    criterion_id: issue.criterionId,
    criterion_name: issue.criterionName,

    specific_problems: issue.specificProblems,
    custom_note: issue.customNote ?? null,

    photo_url: issue.photoUrl ?? null,
    photos: issue.photos ?? [],

    resolution_photo_url:
      issue.resolutionPhotoUrl ?? null,
    resolution_photos:
      issue.resolutionPhotos ?? [],

    discovered_at: issue.discoveredAt,
    discovered_by_role: issue.discoveredByRole,
    discovered_by_name: issue.discoveredByName,

    original_inspection_status:
      issue.originalInspectionStatus,

    department_id: issue.departmentId,
    department_name: issue.departmentName,

    current_status: issue.currentStatus,
    status_updated_at: issue.statusUpdatedAt,

    resolution_info:
      issue.resolutionInfo ?? null,

    verification_info:
      issue.verificationInfo ?? null,

    reopen_count: issue.reopenCount,
    audit_trail: issue.auditTrail,

    updated_at: new Date().toISOString(),
  });
}

function mapCloudIssue(
  row: Record<string, unknown>
): OperationalIssue {
  return {
    id: String(row.id ?? ''),

    inspectionDate: String(
      row.inspection_date ?? ''
    ),

    inspectionId: String(
      row.inspection_id ?? ''
    ),

    venueId:
      typeof row.venue_id === 'string'
        ? row.venue_id
        : undefined,

    venueName:
      typeof row.venue_name === 'string'
        ? row.venue_name
        : undefined,

    areaId: String(row.area_id ?? ''),
    areaName: String(row.area_name ?? ''),

    itemId: String(row.item_id ?? ''),
    itemName: String(row.item_name ?? ''),

    criterionId: String(
      row.criterion_id ?? ''
    ),

    criterionName: String(
      row.criterion_name ?? ''
    ),

    specificProblems:
      Array.isArray(row.specific_problems)
        ? row.specific_problems.map(String)
        : [],

    customNote:
      typeof row.custom_note === 'string'
        ? row.custom_note
        : undefined,

    photoUrl:
      typeof row.photo_url === 'string'
        ? row.photo_url
        : undefined,

    photos:
      Array.isArray(row.photos)
        ? row.photos.map(String)
        : undefined,

    resolutionPhotoUrl:
      typeof row.resolution_photo_url === 'string'
        ? row.resolution_photo_url
        : undefined,

    resolutionPhotos:
      Array.isArray(row.resolution_photos)
        ? row.resolution_photos.map(String)
        : undefined,

    discoveredAt: String(
      row.discovered_at ??
        new Date().toISOString()
    ),

    discoveredByRole:
      row.discovered_by_role === 'MANAGER' ||
      row.discovered_by_role === 'ASSISTANT_MANAGER' ||
      row.discovered_by_role === 'STAFF'
        ? row.discovered_by_role
        : 'MANAGER',

    discoveredByName: String(
      row.discovered_by_name ?? ''
    ),

    originalInspectionStatus: 'NOT_OK',

    departmentId: String(
      row.department_id ?? ''
    ),

    departmentName: String(
      row.department_name ?? ''
    ),

    currentStatus:
      row.current_status === 'NOT_READY' ||
      row.current_status === 'IN_PROCESS' ||
      row.current_status ===
        'WAITING_VERIFICATION' ||
      row.current_status === 'VERIFIED'
        ? row.current_status
        : 'NOT_READY',

    statusUpdatedAt: String(
      row.status_updated_at ??
        row.discovered_at ??
        new Date().toISOString()
    ),

    resolutionInfo:
      row.resolution_info &&
      typeof row.resolution_info === 'object'
        ? (row.resolution_info as OperationalIssue['resolutionInfo'])
        : undefined,

    verificationInfo:
      row.verification_info &&
      typeof row.verification_info === 'object'
        ? (row.verification_info as OperationalIssue['verificationInfo'])
        : undefined,

    reopenCount: Number(
      row.reopen_count ?? 0
    ),

    auditTrail:
      Array.isArray(row.audit_trail)
        ? (row.audit_trail as OperationalIssue['auditTrail'])
        : [],
  };
}

/* ============================================================
   TASKS
   ============================================================ */

export async function uploadDailyTask(
  task: DailyTask
): Promise<CloudSyncResult> {
  return uploadCloudRecord('daily_tasks', {
    id: task.id,
    date: task.date,

    venue_id: task.venueId ?? null,
    venue_name: task.venueName ?? null,

    area_id: task.areaId ?? null,
    area_name: task.areaName ?? null,

    title: task.title,
    notes: task.notes ?? null,

    priority: task.priority,
    status: task.status,

    created_by_user_id:
      task.createdByUserId,

    created_by_name:
      task.createdByName,

    created_at: task.createdAt,
    updated_at: task.updatedAt,

    started_at: task.startedAt ?? null,
    started_by_user_id:
      task.startedByUserId ?? null,
    started_by_name:
      task.startedByName ?? null,

    completed_at:
      task.completedAt ?? null,

    completed_by_user_id:
      task.completedByUserId ?? null,

    completed_by_name:
      task.completedByName ?? null,

    completion_reason:
      task.completionReason ?? null,

    completion_note:
      task.completionNote ?? null,

    history: task.history ?? [],

    cloud_updated_at:
      new Date().toISOString(),
  });
}

function mapCloudTask(
  row: Record<string, unknown>
): DailyTask {
  const priority =
    row.priority === 'LOW' ||
    row.priority === 'NORMAL' ||
    row.priority === 'IMPORTANT' ||
    row.priority === 'HIGH' ||
    row.priority === 'URGENT'
      ? row.priority
      : 'NORMAL';

  const status =
    row.status === 'PENDING' ||
    row.status === 'IN_PROGRESS' ||
    row.status === 'DONE' ||
    row.status === 'NOT_DONE'
      ? row.status
      : 'PENDING';

  return {
    id: String(row.id ?? ''),
    date: String(row.date ?? ''),

    venueId:
      typeof row.venue_id === 'string'
        ? row.venue_id
        : undefined,

    venueName:
      typeof row.venue_name === 'string'
        ? row.venue_name
        : undefined,

    areaId:
      typeof row.area_id === 'string'
        ? row.area_id
        : undefined,

    areaName:
      typeof row.area_name === 'string'
        ? row.area_name
        : undefined,

    title: String(row.title ?? ''),
    
    notes:
      typeof row.notes === 'string'
        ? row.notes
        : undefined,

    priority,
    status,

    createdByUserId: String(
      row.created_by_user_id ?? ''
    ),

    createdByName: String(
      row.created_by_name ?? ''
    ),

    createdAt: String(
      row.created_at ??
        new Date().toISOString()
    ),

    updatedAt: String(
      row.updated_at ??
        new Date().toISOString()
    ),

    startedAt:
      typeof row.started_at === 'string'
        ? row.started_at
        : undefined,

    startedByUserId:
      typeof row.started_by_user_id === 'string'
        ? row.started_by_user_id
        : undefined,

    startedByName:
      typeof row.started_by_name === 'string'
        ? row.started_by_name
        : undefined,

    completedAt:
      typeof row.completed_at === 'string'
        ? row.completed_at
        : undefined,

    completedByUserId:
      typeof row.completed_by_user_id === 'string'
        ? row.completed_by_user_id
        : undefined,

    completedByName:
      typeof row.completed_by_name === 'string'
        ? row.completed_by_name
        : undefined,

    completionReason:
      typeof row.completion_reason === 'string'
        ? row.completion_reason
        : undefined,

    completionNote:
      typeof row.completion_note === 'string'
        ? row.completion_note
        : undefined,

    history:
      Array.isArray(row.history)
        ? (row.history as DailyTask['history'])
        : [],
  };
}

/* ============================================================
   SHIFT NOTES
   ============================================================ */

export async function uploadShiftNote(
  note: ShiftNote
): Promise<CloudSyncResult> {
  return uploadCloudRecord('shift_notes', {
    id: note.id,
    date: note.date,

    venue_id: note.venueId ?? null,
    venue_name: note.venueName ?? null,

    area_id: note.areaId ?? null,
    area_name: note.areaName ?? null,

    author_id: note.authorId,
    author_name: note.authorName,
    author_role: note.authorRole,

    content: note.content,
    category: note.category ?? null,
    status: note.status,

    created_at: note.createdAt,
    updated_at: note.updatedAt,

    completed_at:
      note.completedAt ?? null,

    completed_by_name:
      note.completedByName ?? null,

    cloud_updated_at:
      new Date().toISOString(),
  });
}

function mapCloudShiftNote(
  row: Record<string, unknown>
): ShiftNote {
  const authorRole =
    row.author_role === 'MANAGER' ||
    row.author_role === 'ASSISTANT_MANAGER' ||
    row.author_role === 'STAFF'
      ? row.author_role
      : 'MANAGER';

  const category =
    row.category === 'GENERAL' ||
    row.category === 'MAINTENANCE' ||
    row.category === 'HANDOVER' ||
    row.category === 'URGENT'
      ? row.category
      : undefined;

  const status =
    row.status === 'OPEN' ||
    row.status === 'IN_PROGRESS' ||
    row.status === 'DONE'
      ? row.status
      : 'OPEN';

  return {
    id: String(row.id ?? ''),
    date: String(row.date ?? ''),

    venueId:
      typeof row.venue_id === 'string'
        ? row.venue_id
        : undefined,

    venueName:
      typeof row.venue_name === 'string'
        ? row.venue_name
        : undefined,

    areaId:
      typeof row.area_id === 'string'
        ? row.area_id
        : undefined,

    areaName:
      typeof row.area_name === 'string'
        ? row.area_name
        : undefined,

    authorId: String(
      row.author_id ?? ''
    ),

    authorName: String(
      row.author_name ?? ''
    ),

    authorRole,

    content: String(
      row.content ?? ''
    ),

    category,
    status,

    createdAt: String(
      row.created_at ??
        new Date().toISOString()
    ),

    updatedAt: String(
      row.updated_at ??
        new Date().toISOString()
    ),

    completedAt:
      typeof row.completed_at === 'string'
        ? row.completed_at
        : undefined,

    completedByName:
      typeof row.completed_by_name === 'string'
        ? row.completed_by_name
        : undefined,
  };
}

/* ============================================================
   PULL ALL CLOUD DATA
   ============================================================ */

/**
 * Pull shared cloud records into the local database.
 *
 * This function is intentionally safe:
 *
 * - No cloud session → no pull
 * - One table failing does not destroy local data
 * - Successfully downloaded records are saved locally
 * - Offline operation continues normally
 */
export async function pullAllCloudData(): Promise<CloudPullResult> {
  const result: CloudPullResult = {
    success: true,
    pulled: {
      inspections: 0,
      issues: 0,
      tasks: 0,
      notes: 0,
    },
    errors: [],
  };

  if (!supabase) {
    result.success = false;
    result.errors.push(
      'Supabase is not configured.'
    );

    return result;
  }

  const authenticated =
    await isCloudAuthenticated();

  if (!authenticated) {
    result.success = false;
    result.errors.push(
      'No authenticated HNDVR cloud session.'
    );

    return result;
  }

  /* ----------------------------------------------------------
     INSPECTIONS
     ---------------------------------------------------------- */

  try {
    const response =
      await downloadCloudRecords('inspections');

    if (!response.success) {
      throw new Error(
        response.error ??
          'Failed to download inspections.'
      );
    }

    const inspections =
      response.data.map(mapCloudInspection);

    if (inspections.length > 0) {
      await saveMultipleInspections(
        inspections
      );
    }

    result.pulled.inspections =
      inspections.length;
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Unknown inspections sync error';

    result.success = false;
    result.errors.push(
      `Inspections: ${message}`
    );

    console.warn(
      'HNDVR inspection cloud pull failed:',
      err
    );
  }

  /* ----------------------------------------------------------
     ISSUES
     ---------------------------------------------------------- */

  try {
    const response =
      await downloadCloudRecords('issues');

    if (!response.success) {
      throw new Error(
        response.error ??
          'Failed to download issues.'
      );
    }

    const issues =
      response.data.map(mapCloudIssue);

    if (issues.length > 0) {
      await saveMultipleIssues(issues);
    }

    result.pulled.issues =
      issues.length;
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Unknown issues sync error';

    result.success = false;
    result.errors.push(
      `Issues: ${message}`
    );

    console.warn(
      'HNDVR issue cloud pull failed:',
      err
    );
  }

  /* ----------------------------------------------------------
     DAILY TASKS
     ---------------------------------------------------------- */

  try {
    const response =
      await downloadCloudRecords(
        'daily_tasks'
      );

    if (!response.success) {
      throw new Error(
        response.error ??
          'Failed to download daily tasks.'
      );
    }

    const tasks =
      response.data.map(mapCloudTask);

    if (tasks.length > 0) {
      await saveMultipleDailyTasks(
        tasks
      );
    }

    result.pulled.tasks =
      tasks.length;
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Unknown task sync error';

    result.success = false;
    result.errors.push(
      `Tasks: ${message}`
    );

    console.warn(
      'HNDVR task cloud pull failed:',
      err
    );
  }

  /* ----------------------------------------------------------
     SHIFT NOTES
     ---------------------------------------------------------- */

  try {
    const response =
      await downloadCloudRecords(
        'shift_notes'
      );

    if (!response.success) {
      throw new Error(
        response.error ??
          'Failed to download shift notes.'
      );
    }

    const notes =
      response.data.map(
        mapCloudShiftNote
      );

    for (const note of notes) {
      await saveShiftNote(note);
    }

    result.pulled.notes =
      notes.length;
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Unknown shift note sync error';

    result.success = false;
    result.errors.push(
      `Shift notes: ${message}`
    );

    console.warn(
      'HNDVR shift note cloud pull failed:',
      err
    );
  }

  console.log(
    'HNDVR cloud pull summary:',
    result
  );

  return result;
}

/* ============================================================
   PUSH HELPERS
   ============================================================ */

export async function pushInspection(
  inspection: DailyInspection
): Promise<CloudSyncResult> {
  return uploadInspection(inspection);
}

export async function pushIssue(
  issue: OperationalIssue
): Promise<CloudSyncResult> {
  return uploadIssue(issue);
}

export async function pushDailyTask(
  task: DailyTask
): Promise<CloudSyncResult> {
  return uploadDailyTask(task);
}

export async function pushShiftNote(
  note: ShiftNote
): Promise<CloudSyncResult> {
  return uploadShiftNote(note);
}

export async function uploadAttendanceRecord(record: AttendanceRecord): Promise<CloudSyncResult> {
  return uploadCloudRecord('attendance_records', {
    id: record.id,
    attendance_type: record.type,
    staff_user_id: record.staffUserId,
    staff_name: record.staffName,
    staff_role: record.staffRole,
    venue_id: record.venueId,
    venue_name: record.venueName,
    area_ids: record.areaIds,
    checklist_inspection_id: record.checklistInspectionId,
    checklist_completed_at: record.checklistCompletedAt,
    captured_at: record.capturedAt,
    wifi_ssid: record.wifiSsid ?? null,
    wifi_verified: record.wifiVerified,
    device_id: record.deviceId,
    selfie_url: record.selfieUrl,
    sync_status: 'VERIFIED_CLOUD',
  });
}

type QueuedEntity = 'inspection' | 'issue' | 'task' | 'note' | 'attendance';
type QueuedMutation = { entity: QueuedEntity; id: string; payload: unknown; queuedAt: string };
const OUTBOX_KEY = 'daily_ops_cloud_outbox_v1';

function readOutbox(): QueuedMutation[] {
  try { return JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]') as QueuedMutation[]; }
  catch { return []; }
}

function writeOutbox(outbox: QueuedMutation[]) {
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(outbox));
}

/** Saves the latest version of each record while offline, then retries on reconnect. */
async function queueAndPush(entity: QueuedEntity, payload: DailyInspection | OperationalIssue | DailyTask | ShiftNote | AttendanceRecord): Promise<void> {
  const id = payload.id;
  const send = async () => {
    if (entity === 'inspection') return pushInspection(payload as DailyInspection);
    if (entity === 'issue') return pushIssue(payload as OperationalIssue);
    if (entity === 'task') return pushDailyTask(payload as DailyTask);
    if (entity === 'note') return pushShiftNote(payload as ShiftNote);
    return uploadAttendanceRecord(payload as AttendanceRecord);
  };
  const result = await send();
  if (result.success) {
    const outbox = readOutbox().filter(item => !(item.entity === entity && item.id === id));
    writeOutbox(outbox);
    return;
  }

  const outbox = readOutbox().filter(item => !(item.entity === entity && item.id === id));
  outbox.push({ entity, id, payload, queuedAt: new Date().toISOString() });
  writeOutbox(outbox);
}

export const syncInspection = (record: DailyInspection) => queueAndPush('inspection', record);
export const syncIssue = (record: OperationalIssue) => queueAndPush('issue', record);
export const syncDailyTask = (record: DailyTask) => queueAndPush('task', record);
export const syncShiftNote = (record: ShiftNote) => queueAndPush('note', record);
export const syncAttendanceRecord = (record: AttendanceRecord) => queueAndPush('attendance', record);

export async function flushCloudOutbox(): Promise<number> {
  const outbox = readOutbox();
  const remaining: QueuedMutation[] = [];
  let sent = 0;
  for (const item of outbox) {
    try {
      await queueAndPush(item.entity, item.payload as DailyInspection | OperationalIssue | DailyTask | ShiftNote | AttendanceRecord);
      // queueAndPush only leaves a record in localStorage after an error. A successful
      // record is intentionally removed by this final rewrite.
      const stillQueued = readOutbox().some(entry => entry.entity === item.entity && entry.id === item.id);
      if (stillQueued) remaining.push(item); else sent++;
    } catch { remaining.push(item); }
  }
  writeOutbox(remaining);
  return sent;
}

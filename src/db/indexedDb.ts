import { openDB, IDBPDatabase } from 'idb';
import { 
  AppSettings, 
  UserProfile, 
  VenueTemplate, 
  DailyInspection, 
  OperationalIssue, 
  DailyTask,
  DatabaseBackup,
  ShiftNote,
  AttendanceRecord
} from '../types';
import { 
  INITIAL_SETTINGS, 
  INITIAL_USERS, 
  DEFAULT_VENUES,
  getInitialVenueTemplate, 
  getSampleHistoryData 
} from './initialData';

const DB_NAME = 'DAILY_OPS_LOCAL_DB';
const DB_VERSION = 4;

let dbPromise: Promise<IDBPDatabase> | null = null;

export async function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
        if (!db.objectStoreNames.contains('users')) {
          db.createObjectStore('users', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('template')) {
          db.createObjectStore('template');
        }
        if (!db.objectStoreNames.contains('inspections')) {
          const inspStore = db.createObjectStore('inspections', { keyPath: 'id' });
          inspStore.createIndex('by_date', 'date');
        }
        if (!db.objectStoreNames.contains('issues')) {
          const issueStore = db.createObjectStore('issues', { keyPath: 'id' });
          issueStore.createIndex('by_date', 'inspectionDate');
          issueStore.createIndex('by_status', 'currentStatus');
          issueStore.createIndex('by_area', 'areaId');
          issueStore.createIndex('by_item', 'itemId');
          issueStore.createIndex('by_department', 'departmentId');
        }
        if (!db.objectStoreNames.contains('dailyTasks')) {
          const taskStore = db.createObjectStore('dailyTasks', { keyPath: 'id' });
          taskStore.createIndex('by_date', 'date');
          taskStore.createIndex('by_status', 'status');
          taskStore.createIndex('by_priority', 'priority');
        }
        if (!db.objectStoreNames.contains('shiftNotes')) {
          const noteStore = db.createObjectStore('shiftNotes', { keyPath: 'id' });
          noteStore.createIndex('by_date', 'date');
        }
        if (!db.objectStoreNames.contains('photos')) {
          db.createObjectStore('photos', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('attendance')) {
          const attendance = db.createObjectStore('attendance', { keyPath: 'id' });
          attendance.createIndex('by_staff', 'staffUserId');
          attendance.createIndex('by_time', 'capturedAt');
        }
      }
    });
  }
  return dbPromise;
}

// Ensure initial users are initialized and migrated safely
export async function getOrInitializeUsers(): Promise<UserProfile[]> {
  try {
    const db = await getDb();
    let users = (await db.getAll('users')) as UserProfile[];
    
    // Check if both required roles exist with valid hashes
    const managerUser = users?.find(u => u.role === 'MANAGER');
    const asstUser = users?.find(u => u.role === 'ASSISTANT_MANAGER');

    const legacyManagerHash = '0c7ca5fc3c3b0185aa882c589b4f0b8303f8373f15c7e5bf0d4d29f8f2b7fef5';
    const legacyAsstHash = '4396b27bb8f1ee749f758778f619582d96c9e0ff9df515e378c2e6840742f36f';
    const officialManagerHash = 'd1145c591d8b23e580854e7c46e0faceb14abed2e1d78f5b8da860fd4403e2ec'; // 8888
    const officialAsstHash = '1440f0bcfbaa01244a7e3d47bff16825e6a13c973171401867c686bc194286b0'; // 1234

    if (!users || users.length === 0 || !managerUser || !asstUser) {
      const defaultManager: UserProfile = {
        id: managerUser?.id || 'user-manager',
        role: 'MANAGER',
        name: managerUser?.name || 'General Manager',
        pinHash: managerUser?.pinHash && managerUser.pinHash !== legacyManagerHash ? managerUser.pinHash : officialManagerHash,
        createdAt: managerUser?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const defaultAsst: UserProfile = {
        id: asstUser?.id || 'user-asst-manager',
        role: 'ASSISTANT_MANAGER',
        name: asstUser?.name || 'Assistant Manager',
        pinHash: asstUser?.pinHash && asstUser.pinHash !== legacyAsstHash ? asstUser.pinHash : officialAsstHash,
        createdAt: asstUser?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const otherUsers = (users || []).filter(u => u.id !== defaultManager.id && u.id !== defaultAsst.id && u.role !== 'MANAGER' && u.role !== 'ASSISTANT_MANAGER');
      users = [defaultManager, defaultAsst, ...otherUsers];

      const tx = db.transaction('users', 'readwrite');
      for (const u of users) {
        await tx.store.put(u);
      }
      await tx.done;
      localStorage.setItem('daily_ops_users', JSON.stringify(users));
      return users;
    }

    // Perform migration if legacy default hashes were present
    let needsUpdate = false;
    const updatedUsers = users.map(u => {
      if (u.role === 'MANAGER' && (u.pinHash === legacyManagerHash || !u.pinHash)) {
        needsUpdate = true;
        return { ...u, pinHash: officialManagerHash, updatedAt: new Date().toISOString() };
      }
      if (u.role === 'ASSISTANT_MANAGER' && (u.pinHash === legacyAsstHash || !u.pinHash)) {
        needsUpdate = true;
        return { ...u, pinHash: officialAsstHash, updatedAt: new Date().toISOString() };
      }
      return u;
    });

    if (needsUpdate) {
      users = updatedUsers;
      const tx = db.transaction('users', 'readwrite');
      for (const u of users) {
        await tx.store.put(u);
      }
      await tx.done;
      localStorage.setItem('daily_ops_users', JSON.stringify(users));
    }

    return users;
  } catch (err) {
    console.error('Failed to get/init users from IndexedDB, checking local storage', err);
    try {
      const stored = localStorage.getItem('daily_ops_users');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // ignore
    }
    return INITIAL_USERS;
  }
}

// Ensure initial database seeding on first launch
export async function initializeDatabase(): Promise<{
  settings: AppSettings;
  users: UserProfile[];
  template: VenueTemplate;
  inspections: DailyInspection[];
  issues: OperationalIssue[];
  tasks: DailyTask[];
  notes: ShiftNote[];
}> {
  try {
    const db = await getDb();
    
    // Check settings
    let settings = await db.get('settings', 'app_settings') as AppSettings | undefined;
    if (!settings) {
      settings = INITIAL_SETTINGS;
      await db.put('settings', settings, 'app_settings');
    }

    // Check users with getOrInitializeUsers
    const users = await getOrInitializeUsers();

    // Check template
    let template = await db.get('template', 'venue_template') as VenueTemplate | undefined;
    if (!template || !template.version || template.version < 2 || !template.areas.some(a => a.id === 'area-ground-lobby' || a.id === 'area-lucky-cat')) {
      template = getInitialVenueTemplate();
      await db.put('template', template, 'venue_template');
    } else {
      // Safe non-destructive migration: Ensure venues and blueprints exist
      let updated = false;
      if (!template.venues || template.venues.length === 0) {
        template.venues = DEFAULT_VENUES;
        updated = true;
      }
      if (!template.blueprints || template.blueprints.length === 0) {
        const initial = getInitialVenueTemplate();
        template.blueprints = initial.blueprints || [];
        updated = true;
      }
      // Ensure area and item venue attachments
      template.areas.forEach(area => {
        if (!area.venueId) {
          if (area.name.toUpperCase().includes('LUCKY') || area.id.includes('lucky-cat')) {
            area.venueId = 'venue-lucky-cat';
            area.venueName = 'LUCKY CAT';
          } else if (area.name.toUpperCase().includes('JPE') || area.id.includes('jpe-ktv') || area.name.toUpperCase().includes('KTV')) {
            area.venueId = 'venue-jpe-ktv';
            area.venueName = 'JPE KTV';
          } else if (area.name.toUpperCase().includes('LOBBY') || area.id.includes('ground-lobby')) {
            area.venueId = 'venue-ground-lobby';
            area.venueName = 'GROUND LOBBY';
          } else {
            area.venueId = template.venues?.[0]?.id || 'venue-lucky-cat';
            area.venueName = template.venues?.[0]?.name || 'LUCKY CAT';
          }
          updated = true;
        }
        area.items.forEach(item => {
          if (!item.venueId) {
            item.venueId = area.venueId;
            item.venueName = area.venueName;
            updated = true;
          }
        });
      });

      if (updated) {
        await db.put('template', template, 'venue_template');
      }
    }

    // Check inspections & issues
    let inspections = await db.getAll('inspections') as DailyInspection[];
    let issues = await db.getAll('issues') as OperationalIssue[];
    let tasks: DailyTask[] = [];
    let notes: ShiftNote[] = [];

    if (db.objectStoreNames.contains('dailyTasks')) {
      tasks = (await db.getAll('dailyTasks')) as DailyTask[];
    }
    if (db.objectStoreNames.contains('shiftNotes')) {
      notes = (await db.getAll('shiftNotes')) as ShiftNote[];
    }

    if ((!inspections || inspections.length === 0) && (!issues || issues.length === 0)) {
      const sample = getSampleHistoryData();
      inspections = sample.inspections;
      issues = sample.issues;
      tasks = sample.tasks || [];
      notes = sample.notes || [];

      const inspTx = db.transaction('inspections', 'readwrite');
      for (const insp of inspections) {
        await inspTx.store.put(insp);
      }
      await inspTx.done;

      const issTx = db.transaction('issues', 'readwrite');
      for (const iss of issues) {
        await issTx.store.put(iss);
      }
      await issTx.done;

      if (db.objectStoreNames.contains('dailyTasks')) {
        const taskTx = db.transaction('dailyTasks', 'readwrite');
        for (const t of tasks) {
          await taskTx.store.put(t);
        }
        await taskTx.done;
      }
      if (db.objectStoreNames.contains('shiftNotes')) {
        const noteTx = db.transaction('shiftNotes', 'readwrite');
        for (const n of notes) {
          await noteTx.store.put(n);
        }
        await noteTx.done;
      }
      localStorage.setItem('daily_ops_tasks', JSON.stringify(tasks));
      localStorage.setItem('daily_ops_shift_notes', JSON.stringify(notes));
    } else {
      if (tasks.length === 0 && db.objectStoreNames.contains('dailyTasks')) {
        const sample = getSampleHistoryData();
        tasks = sample.tasks || [];
        const taskTx = db.transaction('dailyTasks', 'readwrite');
        for (const t of tasks) {
          await taskTx.store.put(t);
        }
        await taskTx.done;
        localStorage.setItem('daily_ops_tasks', JSON.stringify(tasks));
      }
      if (notes.length === 0 && db.objectStoreNames.contains('shiftNotes')) {
        const sample = getSampleHistoryData();
        notes = sample.notes || [];
        const noteTx = db.transaction('shiftNotes', 'readwrite');
        for (const n of notes) {
          await noteTx.store.put(n);
        }
        await noteTx.done;
        localStorage.setItem('daily_ops_shift_notes', JSON.stringify(notes));
      }
    }

    return { settings, users, template, inspections, issues, tasks, notes };
  } catch (err) {
    console.error('IndexedDB initialization failed, falling back to LocalStorage', err);
    return getFallbackLocalStorageData();
  }
}

// Fallback if IndexedDB is blocked
function getFallbackLocalStorageData() {
  const settingsStr = localStorage.getItem('daily_ops_settings');
  const usersStr = localStorage.getItem('daily_ops_users');
  const templateStr = localStorage.getItem('daily_ops_template');
  const inspectionsStr = localStorage.getItem('daily_ops_inspections');
  const issuesStr = localStorage.getItem('daily_ops_issues');
  const tasksStr = localStorage.getItem('daily_ops_tasks');
  const notesStr = localStorage.getItem('daily_ops_shift_notes');

  const settings: AppSettings = settingsStr ? JSON.parse(settingsStr) : INITIAL_SETTINGS;
  const users: UserProfile[] = usersStr ? JSON.parse(usersStr) : INITIAL_USERS;
  const template: VenueTemplate = templateStr ? JSON.parse(templateStr) : getInitialVenueTemplate();
  const sample = getSampleHistoryData();
  const inspections: DailyInspection[] = inspectionsStr ? JSON.parse(inspectionsStr) : sample.inspections;
  const issues: OperationalIssue[] = issuesStr ? JSON.parse(issuesStr) : sample.issues;
  const tasks: DailyTask[] = tasksStr ? JSON.parse(tasksStr) : (sample.tasks || []);
  const notes: ShiftNote[] = notesStr ? JSON.parse(notesStr) : (sample.notes || []);

  return { settings, users, template, inspections, issues, tasks, notes };
}

// Save functions with multi-tier persistence (IndexedDB + LocalStorage sync)
export async function saveSettings(settings: AppSettings): Promise<void> {
  try {
    const db = await getDb();
    await db.put('settings', settings, 'app_settings');
  } catch {
    // ignore
  }
  localStorage.setItem('daily_ops_settings', JSON.stringify(settings));
}

export async function saveUsers(users: UserProfile[]): Promise<void> {
  try {
    const db = await getDb();
    const tx = db.transaction('users', 'readwrite');
    await tx.store.clear();
    for (const u of users) {
      await tx.store.put(u);
    }
    await tx.done;
  } catch {
    // ignore
  }
  localStorage.setItem('daily_ops_users', JSON.stringify(users));
}

export async function saveVenueTemplate(template: VenueTemplate): Promise<void> {
  try {
    const db = await getDb();
    await db.put('template', template, 'venue_template');
  } catch {
    // ignore
  }
  localStorage.setItem('daily_ops_template', JSON.stringify(template));
}

export async function saveInspection(inspection: DailyInspection): Promise<void> {
  try {
    const db = await getDb();
    await db.put('inspections', inspection);
  } catch {
    // ignore
  }
  // Also keep snapshot in localStorage for emergency recovery
  const existing = localStorage.getItem('daily_ops_inspections');
  let list: DailyInspection[] = existing ? JSON.parse(existing) : [];
  const idx = list.findIndex(i => i.id === inspection.id);
  if (idx >= 0) list[idx] = inspection;
  else list.unshift(inspection);
  localStorage.setItem('daily_ops_inspections', JSON.stringify(list));
}

export async function saveMultipleInspections(inspectionsToSave: DailyInspection[]): Promise<void> {
  try {
    const db = await getDb();
    const tx = db.transaction('inspections', 'readwrite');
    for (const insp of inspectionsToSave) {
      await tx.store.put(insp);
    }
    await tx.done;
  } catch {
    // ignore
  }
  const existing = localStorage.getItem('daily_ops_inspections');
  let list: DailyInspection[] = existing ? JSON.parse(existing) : [];
  for (const insp of inspectionsToSave) {
    const idx = list.findIndex(i => i.id === insp.id);
    if (idx >= 0) list[idx] = insp;
    else list.unshift(insp);
  }
  localStorage.setItem('daily_ops_inspections', JSON.stringify(list));
}

export async function saveIssue(issue: OperationalIssue): Promise<void> {
  try {
    const db = await getDb();
    await db.put('issues', issue);
  } catch {
    // ignore
  }
  const existing = localStorage.getItem('daily_ops_issues');
  let list: OperationalIssue[] = existing ? JSON.parse(existing) : [];
  const idx = list.findIndex(i => i.id === issue.id);
  if (idx >= 0) list[idx] = issue;
  else list.unshift(issue);
  localStorage.setItem('daily_ops_issues', JSON.stringify(list));
}

export async function saveMultipleIssues(issuesToSave: OperationalIssue[]): Promise<void> {
  try {
    const db = await getDb();
    const tx = db.transaction('issues', 'readwrite');
    for (const iss of issuesToSave) {
      await tx.store.put(iss);
    }
    await tx.done;
  } catch {
    // ignore
  }
  // LocalStorage update
  const existing = localStorage.getItem('daily_ops_issues');
  let list: OperationalIssue[] = existing ? JSON.parse(existing) : [];
  for (const iss of issuesToSave) {
    const idx = list.findIndex(i => i.id === iss.id);
    if (idx >= 0) list[idx] = iss;
    else list.unshift(iss);
  }
  localStorage.setItem('daily_ops_issues', JSON.stringify(list));
}

// Daily Manager -> AM Tasks persistence
export async function saveDailyTask(task: DailyTask): Promise<void> {
  try {
    const db = await getDb();
    if (db.objectStoreNames.contains('dailyTasks')) {
      await db.put('dailyTasks', task);
    }
  } catch (err) {
    console.warn('Failed to save task to IndexedDB', err);
  }
  const existing = localStorage.getItem('daily_ops_tasks');
  let list: DailyTask[] = existing ? JSON.parse(existing) : [];
  const idx = list.findIndex(t => t.id === task.id);
  if (idx >= 0) list[idx] = task;
  else list.unshift(task);
  localStorage.setItem('daily_ops_tasks', JSON.stringify(list));
}

export async function deleteDailyTask(taskId: string): Promise<void> {
  try {
    const db = await getDb();
    if (db.objectStoreNames.contains('dailyTasks')) {
      await db.delete('dailyTasks', taskId);
    }
  } catch (err) {
    console.warn('Failed to delete task from IndexedDB', err);
  }
  const existing = localStorage.getItem('daily_ops_tasks');
  if (existing) {
    let list: DailyTask[] = JSON.parse(existing);
    list = list.filter(t => t.id !== taskId);
    localStorage.setItem('daily_ops_tasks', JSON.stringify(list));
  }
}

export async function saveMultipleDailyTasks(tasksToSave: DailyTask[]): Promise<void> {
  try {
    const db = await getDb();
    if (db.objectStoreNames.contains('dailyTasks')) {
      const tx = db.transaction('dailyTasks', 'readwrite');
      for (const t of tasksToSave) {
        await tx.store.put(t);
      }
      await tx.done;
    }
  } catch (err) {
    console.warn('Failed to batch save tasks to IndexedDB', err);
  }
  const existing = localStorage.getItem('daily_ops_tasks');
  let list: DailyTask[] = existing ? JSON.parse(existing) : [];
  for (const t of tasksToSave) {
    const idx = list.findIndex(item => item.id === t.id);
    if (idx >= 0) list[idx] = t;
    else list.unshift(t);
  }
  localStorage.setItem('daily_ops_tasks', JSON.stringify(list));
}

export async function saveShiftNote(note: ShiftNote): Promise<void> {
  try {
    const db = await getDb();
    if (db.objectStoreNames.contains('shiftNotes')) {
      await db.put('shiftNotes', note);
    }
  } catch (err) {
    console.warn('Failed to save shift note to IndexedDB', err);
  }
  const existing = localStorage.getItem('daily_ops_shift_notes');
  let list: ShiftNote[] = existing ? JSON.parse(existing) : [];
  const idx = list.findIndex(n => n.id === note.id);
  if (idx >= 0) list[idx] = note;
  else list.unshift(note);
  localStorage.setItem('daily_ops_shift_notes', JSON.stringify(list));
}

export async function deleteShiftNote(noteId: string): Promise<void> {
  try {
    const db = await getDb();
    if (db.objectStoreNames.contains('shiftNotes')) {
      await db.delete('shiftNotes', noteId);
    }
  } catch (err) {
    console.warn('Failed to delete shift note from IndexedDB', err);
  }
  const existing = localStorage.getItem('daily_ops_shift_notes');
  if (existing) {
    let list: ShiftNote[] = JSON.parse(existing);
    list = list.filter(n => n.id !== noteId);
    localStorage.setItem('daily_ops_shift_notes', JSON.stringify(list));
  }
}

export async function saveAttendanceRecord(record: AttendanceRecord): Promise<void> {
  try {
    const db = await getDb();
    if (db.objectStoreNames.contains('attendance')) await db.put('attendance', record);
  } catch (err) {
    console.warn('Failed to save attendance locally', err);
  }
  const key = 'daily_ops_attendance';
  const records = JSON.parse(localStorage.getItem(key) || '[]') as AttendanceRecord[];
  const index = records.findIndex(item => item.id === record.id);
  if (index >= 0) records[index] = record; else records.unshift(record);
  localStorage.setItem(key, JSON.stringify(records));
}

export async function getAttendanceRecords(): Promise<AttendanceRecord[]> {
  try {
    const db = await getDb();
    if (db.objectStoreNames.contains('attendance')) return (await db.getAll('attendance')) as AttendanceRecord[];
  } catch (err) {
    console.warn('Failed to read attendance locally', err);
  }
  try { return JSON.parse(localStorage.getItem('daily_ops_attendance') || '[]') as AttendanceRecord[]; }
  catch { return []; }
}

export async function savePhotoBlob(photoId: string, base64Data: string): Promise<void> {
  try {
    const db = await getDb();
    await db.put('photos', { id: photoId, data: base64Data, timestamp: new Date().toISOString() });
  } catch {
    // Photos may exceed single localStorage key, so try-catch
    try {
      localStorage.setItem(`daily_ops_photo_${photoId}`, base64Data);
    } catch {
      console.warn('Storage limit reached for photo');
    }
  }
}

export async function getPhotoBlob(photoId: string): Promise<string | null> {
  try {
    const db = await getDb();
    const record = await db.get('photos', photoId);
    if (record?.data) return record.data;
  } catch {
    // ignore
  }
  return localStorage.getItem(`daily_ops_photo_${photoId}`) || null;
}

export async function deletePhotoBlob(photoId: string): Promise<void> {
  try {
    const db = await getDb();
    if (db.objectStoreNames.contains('photos')) {
      await db.delete('photos', photoId);
    }
  } catch {
    // ignore
  }
  try {
    localStorage.removeItem(`daily_ops_photo_${photoId}`);
  } catch {
    // ignore
  }
}

// Database Export (Backup to JSON)
export async function exportDatabaseBackup(): Promise<string> {
  const data = await initializeDatabase();
  const backup: DatabaseBackup = {
    app: 'HANDOVER.',
    version: 3,
    exportedAt: new Date().toISOString(),
    settings: data.settings,
    users: data.users,
    template: data.template,
    inspections: data.inspections,
    issues: data.issues,
    tasks: data.tasks,
    notes: data.notes
  };
  return JSON.stringify(backup, null, 2);
}

// Database Restore from JSON
export async function restoreDatabaseFromBackup(jsonContent: string): Promise<{
  settings: AppSettings;
  users: UserProfile[];
  template: VenueTemplate;
  inspections: DailyInspection[];
  issues: OperationalIssue[];
  tasks: DailyTask[];
  notes: ShiftNote[];
}> {
  const parsed = JSON.parse(jsonContent) as DatabaseBackup;
  if (!parsed || (parsed.app !== 'HANDOVER.' && parsed.app !== 'DAILY_OPS_TABLET') || !parsed.template) {
    throw new Error('Invalid backup file format. Must be a valid HANDOVER. or DAILY OPS backup JSON.');
  }

  const db = await getDb();

  // Clear and rewrite all stores in atomic transactions
  await db.put('settings', parsed.settings, 'app_settings');
  await db.put('template', parsed.template, 'venue_template');

  const uTx = db.transaction('users', 'readwrite');
  await uTx.store.clear();
  for (const u of parsed.users) {
    await uTx.store.put(u);
  }
  await uTx.done;

  const inspTx = db.transaction('inspections', 'readwrite');
  await inspTx.store.clear();
  for (const i of parsed.inspections) {
    await inspTx.store.put(i);
  }
  await inspTx.done;

  const issTx = db.transaction('issues', 'readwrite');
  await issTx.store.clear();
  for (const iss of parsed.issues) {
    await issTx.store.put(iss);
  }
  await issTx.done;

  const tasks = parsed.tasks || [];
  if (db.objectStoreNames.contains('dailyTasks')) {
    const taskTx = db.transaction('dailyTasks', 'readwrite');
    await taskTx.store.clear();
    for (const t of tasks) {
      await taskTx.store.put(t);
    }
    await taskTx.done;
  }

  const notes = parsed.notes || [];
  if (db.objectStoreNames.contains('shiftNotes')) {
    const noteTx = db.transaction('shiftNotes', 'readwrite');
    await noteTx.store.clear();
    for (const n of notes) {
      await noteTx.store.put(n);
    }
    await noteTx.done;
  }

  // Local storage mirror
  localStorage.setItem('daily_ops_settings', JSON.stringify(parsed.settings));
  localStorage.setItem('daily_ops_users', JSON.stringify(parsed.users));
  localStorage.setItem('daily_ops_template', JSON.stringify(parsed.template));
  localStorage.setItem('daily_ops_inspections', JSON.stringify(parsed.inspections));
  localStorage.setItem('daily_ops_issues', JSON.stringify(parsed.issues));
  localStorage.setItem('daily_ops_tasks', JSON.stringify(tasks));
  localStorage.setItem('daily_ops_shift_notes', JSON.stringify(notes));

  return {
    settings: parsed.settings,
    users: parsed.users,
    template: parsed.template,
    inspections: parsed.inspections,
    issues: parsed.issues,
    tasks,
    notes
  };
}

// Clear all demo data / Factory reset
export async function resetAllData(keepTemplate = true): Promise<{
  settings: AppSettings;
  users: UserProfile[];
  template: VenueTemplate;
  inspections: DailyInspection[];
  issues: OperationalIssue[];
  tasks: DailyTask[];
  notes: ShiftNote[];
}> {
  const db = await getDb();
  
  const template = keepTemplate 
    ? (await db.get('template', 'venue_template') as VenueTemplate || getInitialVenueTemplate())
    : getInitialVenueTemplate();

  const settings: AppSettings = { ...INITIAL_SETTINGS, isFirstTimeSetupDone: true };
  const users = INITIAL_USERS;
  const inspections: DailyInspection[] = [];
  const issues: OperationalIssue[] = [];
  const tasks: DailyTask[] = [];
  const notes: ShiftNote[] = [];

  const inspTx = db.transaction('inspections', 'readwrite');
  await inspTx.store.clear();
  await inspTx.done;

  const issTx = db.transaction('issues', 'readwrite');
  await issTx.store.clear();
  await issTx.done;

  if (db.objectStoreNames.contains('dailyTasks')) {
    const taskTx = db.transaction('dailyTasks', 'readwrite');
    await taskTx.store.clear();
    await taskTx.done;
  }

  if (db.objectStoreNames.contains('shiftNotes')) {
    const noteTx = db.transaction('shiftNotes', 'readwrite');
    await noteTx.store.clear();
    await noteTx.done;
  }

  await db.put('settings', settings, 'app_settings');
  await db.put('template', template, 'venue_template');

  const uTx = db.transaction('users', 'readwrite');
  await uTx.store.clear();
  for (const u of users) {
    await uTx.store.put(u);
  }
  await uTx.done;

  localStorage.clear();
  localStorage.setItem('daily_ops_settings', JSON.stringify(settings));
  localStorage.setItem('daily_ops_users', JSON.stringify(users));
  localStorage.setItem('daily_ops_template', JSON.stringify(template));
  localStorage.setItem('daily_ops_inspections', JSON.stringify([]));
  localStorage.setItem('daily_ops_issues', JSON.stringify([]));
  localStorage.setItem('daily_ops_tasks', JSON.stringify([]));
  localStorage.setItem('daily_ops_shift_notes', JSON.stringify([]));

  return { settings, users, template, inspections, issues, tasks, notes };
}

// Load Demo Data
export async function loadDemoData(): Promise<{
  settings: AppSettings;
  users: UserProfile[];
  template: VenueTemplate;
  inspections: DailyInspection[];
  issues: OperationalIssue[];
  tasks: DailyTask[];
  notes: ShiftNote[];
}> {
  const template = getInitialVenueTemplate();
  const sample = getSampleHistoryData();
  const settings = { ...INITIAL_SETTINGS, isFirstTimeSetupDone: true };
  const users = INITIAL_USERS;
  const tasks = sample.tasks || [];
  const notes = sample.notes || [];

  const db = await getDb();
  await db.put('settings', settings, 'app_settings');
  await db.put('template', template, 'venue_template');

  const uTx = db.transaction('users', 'readwrite');
  await uTx.store.clear();
  for (const u of users) {
    await uTx.store.put(u);
  }
  await uTx.done;

  const inspTx = db.transaction('inspections', 'readwrite');
  await inspTx.store.clear();
  for (const i of sample.inspections) {
    await inspTx.store.put(i);
  }
  await inspTx.done;

  const issTx = db.transaction('issues', 'readwrite');
  await issTx.store.clear();
  for (const iss of sample.issues) {
    await issTx.store.put(iss);
  }
  await issTx.done;

  if (db.objectStoreNames.contains('dailyTasks')) {
    const taskTx = db.transaction('dailyTasks', 'readwrite');
    await taskTx.store.clear();
    for (const t of tasks) {
      await taskTx.store.put(t);
    }
    await taskTx.done;
  }

  if (db.objectStoreNames.contains('shiftNotes')) {
    const noteTx = db.transaction('shiftNotes', 'readwrite');
    await noteTx.store.clear();
    for (const n of notes) {
      await noteTx.store.put(n);
    }
    await noteTx.done;
  }

  localStorage.setItem('daily_ops_settings', JSON.stringify(settings));
  localStorage.setItem('daily_ops_users', JSON.stringify(users));
  localStorage.setItem('daily_ops_template', JSON.stringify(template));
  localStorage.setItem('daily_ops_inspections', JSON.stringify(sample.inspections));
  localStorage.setItem('daily_ops_issues', JSON.stringify(sample.issues));
  localStorage.setItem('daily_ops_tasks', JSON.stringify(tasks));
  localStorage.setItem('daily_ops_shift_notes', JSON.stringify(notes));

  return { settings, users, template, inspections: sample.inspections, issues: sample.issues, tasks, notes };
}

export const dbService = {
  exportFullBackup: exportDatabaseBackup,
  importBackup: async (jsonContent: string) => {
    try {
      await restoreDatabaseFromBackup(jsonContent);
      return true;
    } catch {
      return false;
    }
  },
  resetToDemoData: loadDemoData,
  clearAll: resetAllData
};

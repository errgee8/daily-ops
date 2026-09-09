import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  AppSettings, 
  VenueTemplate, 
  DailyInspection, 
  OperationalIssue, 
  UserProfile, 
  InspectionStatusType, 
  IssueStatus, 
  AreaTemplate, 
  ItemTemplate, 
  Department, 
  InspectionItemResult, 
  CriterionResult,
  CriterionTemplate,
  DailyTask,
  TaskPriority,
  TaskStatus,
  TaskAuditLog,
  ShiftNote,
  VenueDefinition,
  BlueprintTemplate,
  StaffAccount,
  AccountabilityPoint,
  StaffCall
} from '../types';
import { 
  initializeDatabase, 
  saveSettings, 
  saveVenueTemplate, 
  saveInspection, 
  saveIssue, 
  saveMultipleIssues, 
  saveMultipleInspections,
  saveDailyTask,
  deleteDailyTask,
  saveMultipleDailyTasks,
  saveShiftNote,
  deleteShiftNote as dbDeleteShiftNote,
  exportDatabaseBackup, 
  restoreDatabaseFromBackup, 
  resetAllData, 
  loadDemoData,
  savePhotoBlob,
  deletePhotoBlob
} from '../db/indexedDb';
import { DEFAULT_VENUES } from '../db/initialData';
import { getTodayDateString } from '../utils/crypto';
import { 
  ActionableReminder, 
  evaluateOperationalReminders, 
  triggerReminderFeedback,
  clearReminderForId 
} from '../utils/reminderEngine';
import { executeAutoPhotoCleanup } from '../utils/photoCleanup';
import { 
  fetchTemplateFromCloud, 
  saveTemplateToCloud, 
  fetchDailyTasksFromCloud, 
  saveDailyTaskToCloud, 
  deleteDailyTaskFromCloud, 
  fetchInspectionsFromCloud, 
  saveInspectionToCloud, 
  fetchIssuesFromCloud, 
  saveIssueToCloud, 
  fetchShiftNotesFromCloud, 
  saveShiftNoteToCloud, 
  deleteShiftNoteFromCloud, 
  subscribeToCloudChanges,
  fetchStaffProfilesFromCloud,
  saveStaffProfileToCloud,
  deleteStaffProfileFromCloud,
  fetchAccountabilityPointsFromCloud,
  addAccountabilityPointToCloud,
  fetchStaffCallsFromCloud,
  sendStaffCallToCloud,
  acknowledgeStaffCallInCloud
} from '../services/supabaseDataService';
import { useAuth } from './AuthContext';
import { getAuthToken } from '../services/apiConfig';

export function normalizeIssuePhotos(issue: OperationalIssue): OperationalIssue {
  const photos = Array.isArray(issue.photos) && issue.photos.length > 0
    ? issue.photos
    : issue.photoUrl
      ? [issue.photoUrl]
      : [];

  const resolutionPhotos = Array.isArray(issue.resolutionPhotos) && issue.resolutionPhotos.length > 0
    ? issue.resolutionPhotos
    : issue.resolutionPhotoUrl
      ? [issue.resolutionPhotoUrl]
      : [];

  return {
    ...issue,
    photos,
    resolutionPhotos,
    photoUrl: photos[0] || undefined,
    resolutionPhotoUrl: resolutionPhotos[0] || undefined
  };
}

export function generateNamesFromPattern(pattern: string, quantity: number, startNum = 1): string[] {
  const names: string[] = [];
  const rangeMatch = pattern.match(/\{(\d+)-(\d+|N)\}/i);
  
  if (rangeMatch) {
    const rawStart = rangeMatch[1];
    const padLen = rawStart.length;
    const start = parseInt(rawStart, 10);
    const prefix = pattern.substring(0, rangeMatch.index);
    const suffix = pattern.substring((rangeMatch.index || 0) + rangeMatch[0].length);

    for (let i = 0; i < quantity; i++) {
      const num = start + i;
      const numStr = padLen > 1 ? String(num).padStart(padLen, '0') : String(num);
      names.push(`${prefix}${numStr}${suffix}`.trim());
    }
  } else if (pattern.includes('{n}') || pattern.includes('{N}')) {
    for (let i = 0; i < quantity; i++) {
      const num = startNum + i;
      const numStr = String(num).padStart(2, '0');
      names.push(pattern.replace(/\{n\}/gi, numStr).trim());
    }
  } else {
    const base = pattern.trim();
    for (let i = 0; i < quantity; i++) {
      const num = startNum + i;
      const numStr = String(num).padStart(2, '0');
      names.push(`${base} ${numStr}`.trim());
    }
  }
  return names;
}

interface DataContextType {
  isLoading: boolean;
  settings: AppSettings;
  template: VenueTemplate;
  venues: VenueDefinition[];
  blueprints: BlueprintTemplate[];
  selectedVenueFilter: string; // 'ALL' or venueId
  setSelectedVenueFilter: (venueId: string) => void;

  inspections: DailyInspection[];
  issues: OperationalIssue[];
  dailyTasks: DailyTask[];
  shiftNotes: ShiftNote[];
  todayDate: string;
  todayInspection: DailyInspection | null;
  todayIssues: OperationalIssue[];
  outstandingIssues: OperationalIssue[];
  allWaitingVerificationIssues: OperationalIssue[];

  // Task Stats & Collections
  todayTasks: DailyTask[];
  todayOpenTasksCount: number;
  todayDoneTasksCount: number;
  todayNotDoneTasksCount: number;
  todayPendingTasksCount: number;
  todayInProgressTasksCount: number;

  // Shift Notes Actions
  addShiftNote: (noteData: Omit<ShiftNote, 'id' | 'createdAt' | 'updatedAt' | 'date'>) => Promise<ShiftNote>;
  updateShiftNoteStatus: (noteId: string, status: 'OPEN' | 'IN_PROGRESS' | 'DONE', userName: string) => Promise<void>;
  deleteShiftNote: (noteId: string) => Promise<void>;

  // Reminder System
  activeReminders: ActionableReminder[];
  overdueRemindersCount: number;
  dueSoonRemindersCount: number;
  dismissReminder: (reminderId: string) => void;

  // Task Actions
  createDailyTask: (taskData: { 
    title: string; 
    notes?: string; 
    priority: TaskPriority; 
    date?: string; 
    venueId?: string; 
    venueName?: string; 
    areaId?: string; 
    areaName?: string;
    dueTime?: string;
    instructions?: string;
    assignedToUserId?: string;
    assignedToName?: string;
  }, user: UserProfile) => Promise<DailyTask>;
  updateDailyTask: (taskId: string, taskData: { title?: string; notes?: string; priority?: TaskPriority; venueId?: string; venueName?: string; assignedToUserId?: string; assignedToName?: string }, user: UserProfile) => Promise<boolean>;
  deleteDailyTaskById: (taskId: string, user: UserProfile) => Promise<boolean>;
  startDailyTask: (taskId: string, user: UserProfile) => Promise<void>;
  markDailyTaskDone: (taskId: string, user: UserProfile, note?: string, proofPhoto?: string) => Promise<void>;
  markDailyTaskNotDone: (taskId: string, reason: string, note?: string, user?: UserProfile) => Promise<void>;
  markDailyTaskSkipped: (taskId: string, skipReason: string, user: UserProfile) => Promise<void>;
  
  // Inspection Actions
  startTodayInspection: (user: UserProfile) => Promise<DailyInspection>;
  setItemCriterionStatus: (
    date: string,
    areaId: string,
    areaName: string,
    itemId: string,
    itemName: string,
    criterionId: string,
    criterionName: string,
    status: InspectionStatusType,
    reasons: string[],
    customReason?: string,
    photosParam?: string | string[],
    user?: UserProfile
  ) => Promise<void>;
  quickMarkItemAllGood: (date: string, item: ItemTemplate, areaName: string, user: UserProfile) => Promise<void>;
  quickMarkAreaAllGood: (date: string, area: AreaTemplate, user: UserProfile) => Promise<void>;
  completeAndHandover: (date: string, user: UserProfile) => Promise<void>;
  
  // Issue Actions
  startWorkOnIssue: (issueId: string, user: UserProfile, notes?: string) => Promise<void>;
  changeIssueDepartment: (issueId: string, departmentId: string, user: UserProfile) => Promise<void>;
  addIssueNote: (issueId: string, note: string, user: UserProfile) => Promise<void>;
  attachPhotoToIssue: (issueId: string, photoDataUrl: string, isResolution: boolean, user: UserProfile) => Promise<void>;
  removePhotoFromIssue: (issueId: string, photoDataUrl: string, isResolution: boolean, user: UserProfile) => Promise<void>;
  markIssueResolved: (issueId: string, user: UserProfile, resolutionNotes?: string, proofPhotos?: string[]) => Promise<void>;
  verifyIssue: (issueId: string, user: UserProfile, verificationNotes?: string) => Promise<void>;
  reopenIssue: (issueId: string, user: UserProfile, reopenReason: string) => Promise<void>;
  
  // Venue Management (Manager only)
  addVenue: (paramOrName: string | Omit<VenueDefinition, 'id'>, code?: string, icon?: string, description?: string) => Promise<VenueDefinition>;
  updateVenue: (venueId: string, updates: Partial<VenueDefinition>) => Promise<void>;
  editVenue: (venueId: string, updates: Partial<VenueDefinition>) => Promise<void>;
  deleteVenue: (venueId: string) => Promise<void>;

  // Blueprint Library Management (Manager only)
  addBlueprint: (blueprintData: Omit<BlueprintTemplate, 'id' | 'createdAt' | 'updatedAt'>) => Promise<BlueprintTemplate>;
  updateBlueprint: (blueprintId: string, updates: Partial<BlueprintTemplate>) => Promise<void>;
  editBlueprint: (blueprintId: string, updates: Partial<BlueprintTemplate>) => Promise<void>;
  deleteBlueprint: (blueprintId: string) => Promise<void>;
  duplicateBlueprint: (blueprintId: string) => Promise<BlueprintTemplate | null>;
  saveItemAsBlueprint: (item: ItemTemplate, blueprintName: string, description?: string, venueCompatibility?: string[]) => Promise<BlueprintTemplate>;

  // Bulk Operations & Template Management (Manager only)
  bulkCreateFromBlueprint: (areaId: string, blueprintId: string, quantity: number, namePattern: string, startNumber?: number) => Promise<ItemTemplate[]>;
  duplicateItem: (areaId: string, itemId: string, newName?: string) => Promise<ItemTemplate | null>;
  duplicateMultipleItems: (areaId: string, itemId: string, quantity: number, namePattern: string, startNumber?: number) => Promise<ItemTemplate[]>;
  bulkEditItems: (areaId: string, itemIds: string[], updates: { departmentId?: string; appendCriterion?: CriterionTemplate }) => Promise<void>;

  updateVenueTemplate: (updated: VenueTemplate) => Promise<boolean>;
  updateTemplate: (updated: VenueTemplate) => Promise<boolean>;
  addArea: (name: string, icon?: string, venueId?: string) => Promise<void>;
  editArea: (areaId: string, name: string, venueId?: string) => Promise<void>;
  deleteArea: (areaId: string) => Promise<void>;
  addItemToArea: (areaId: string, name: string, criteriaPreset?: string) => Promise<void>;
  editItem: (itemId: string, name: string) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
  addDepartment: (name: string, color?: string) => Promise<void>;
  deleteDepartment: (deptId: string) => Promise<void>;
  
  // Settings & Backups
  updateAppSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  exportBackupJson: () => Promise<string>;
  restoreBackupJson: (json: string) => Promise<boolean>;
  resetToFactory: (keepTemplate?: boolean) => Promise<void>;
  loadSampleDemo: () => Promise<void>;

  // Cloud & Multi-Device Synchronization
  cloudSyncStatus: 'CONNECTED' | 'SYNCING' | 'OFFLINE';
  lastCloudSyncTime: string | null;
  syncWithCloud: () => Promise<void>;

  // Staff Profiles & Team Management
  staffProfiles: StaffAccount[];
  accountabilityPoints: AccountabilityPoint[];
  staffCalls: StaffCall[];
  activeStaffCall: StaffCall | null;
  createStaffProfile: (profile: Omit<StaffAccount, 'id' | 'createdAt' | 'updatedAt'>, pin?: string) => Promise<{ ok: boolean; profile?: StaffAccount; error?: string }>;
  updateStaffProfile: (profile: StaffAccount, pin?: string) => Promise<{ ok: boolean; error?: string }>;
  deleteStaffProfile: (id: string) => Promise<boolean>;
  addAccountabilityPoint: (params: { staffId: string; staffName: string; amount: number; actionType: 'ADD' | 'REMOVE'; reason: string; relatedTaskId?: string; relatedTaskName?: string }) => Promise<{ ok: boolean; error?: string }>;
  sendStaffCall: (params: { staffId: string; staffName: string; message?: string }) => Promise<{ ok: boolean; error?: string }>;
  acknowledgeStaffCall: (callId: string) => Promise<boolean>;
  dismissActiveStaffCallModal: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{
  initialData?: any;
  children: React.ReactNode;
}> = ({ initialData, children }) => {
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(!initialData);
  const [settings, setSettings] = useState<AppSettings>(initialData?.settings || ({} as AppSettings));
  const [template, setTemplate] = useState<VenueTemplate>(initialData?.template || ({ areas: [], departments: [], lastModified: '', version: 1 }));
  const [inspections, setInspections] = useState<DailyInspection[]>(initialData?.inspections || []);
  const [issues, setIssues] = useState<OperationalIssue[]>(initialData?.issues || []);
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>(initialData?.tasks || []);
  const [shiftNotes, setShiftNotes] = useState<ShiftNote[]>(initialData?.notes || []);

  // Cloud Synchronization State
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'CONNECTED' | 'SYNCING' | 'OFFLINE'>('SYNCING');
  const [lastCloudSyncTime, setLastCloudSyncTime] = useState<string | null>(null);

  // Staff, Points & Urgent Calls State
  const [staffProfiles, setStaffProfiles] = useState<StaffAccount[]>([]);
  const [accountabilityPoints, setAccountabilityPoints] = useState<AccountabilityPoint[]>([]);
  const [staffCalls, setStaffCalls] = useState<StaffCall[]>([]);
  const [activeStaffCall, setActiveStaffCall] = useState<StaffCall | null>(null);

  // Reminders state
  const [activeReminders, setActiveReminders] = useState<ActionableReminder[]>([]);
  const [overdueRemindersCount, setOverdueRemindersCount] = useState<number>(0);
  const [dueSoonRemindersCount, setDueSoonRemindersCount] = useState<number>(0);
  const [dismissedReminderIds, setDismissedReminderIds] = useState<Record<string, boolean>>({});

  // Active Venue Filter
  const [selectedVenueFilter, setSelectedVenueFilter] = useState<string>('ALL');

  const venues: VenueDefinition[] = useMemo(() => {
    return template.venues && template.venues.length > 0 ? template.venues : DEFAULT_VENUES;
  }, [template.venues]);

  const blueprints: BlueprintTemplate[] = useMemo(() => {
    return template.blueprints || [];
  }, [template.blueprints]);

  const todayDate = useMemo(() => getTodayDateString(), []);

  // Load from database on startup if not provided
  useEffect(() => {
    if (!initialData) {
      (async () => {
        setIsLoading(true);
        try {
          const dbData = await initializeDatabase();
          setSettings(dbData.settings);
          setTemplate(dbData.template);
          
          const normalizedIssues = (dbData.issues || []).map(normalizeIssuePhotos);
          const normalizedInspections = (dbData.inspections || []).map(insp => {
            if (!insp.itemResults) return insp;
            const updatedItemResults = { ...insp.itemResults };
            Object.keys(updatedItemResults).forEach(itemId => {
              const item = updatedItemResults[itemId];
              if (item.criterionResults) {
                item.criterionResults = item.criterionResults.map(cr => ({
                  ...cr,
                  photos: Array.isArray(cr.photos) && cr.photos.length > 0 ? cr.photos : (cr.photoUrl ? [cr.photoUrl] : []),
                  photoUrl: cr.photoUrl || (cr.photos && cr.photos.length > 0 ? cr.photos[0] : undefined)
                }));
              }
            });
            return { ...insp, itemResults: updatedItemResults };
          });

          setDailyTasks(dbData.tasks || []);
          setShiftNotes(dbData.notes || []);

          // Safe, automatic photo retention cleanup on startup
          const cleanup = await executeAutoPhotoCleanup(normalizedIssues, normalizedInspections);
          setInspections(cleanup.inspections);
          setIssues(cleanup.issues);

          if (cleanup.hasCleaned) {
            await saveMultipleIssues(cleanup.issues);
            await saveMultipleInspections(cleanup.inspections);
          }
        } catch (err) {
          console.error('Failed to load local database', err);
        } finally {
          setIsLoading(false);
        }
      })();
    }
  }, [initialData]);

  // Synchronize with Supabase Cloud as Single Source of Truth
  const syncWithCloud = useCallback(async () => {
    if (!getAuthToken()) {
      setCloudSyncStatus('OFFLINE');
      return;
    }

    setCloudSyncStatus('SYNCING');
    try {
      // 1. Authoritative Template
      const cloudTemplate = await fetchTemplateFromCloud();
      if (cloudTemplate && Array.isArray(cloudTemplate.areas) && cloudTemplate.areas.length > 0) {
        setTemplate(cloudTemplate);
        await saveVenueTemplate(cloudTemplate);
      } else if (template?.areas?.length > 0) {
        await saveTemplateToCloud(template);
      }

      // 2. Authoritative Daily Tasks
      const cloudTasks = await fetchDailyTasksFromCloud();
      if (cloudTasks && cloudTasks.length > 0) {
        setDailyTasks(cloudTasks);
        await saveMultipleDailyTasks(cloudTasks);
      }

      // 3. Authoritative Daily Inspections
      const cloudInspections = await fetchInspectionsFromCloud();
      if (cloudInspections && cloudInspections.length > 0) {
        setInspections(cloudInspections);
        await saveMultipleInspections(cloudInspections);
      }

      // 4. Authoritative Operational Issues
      const cloudIssues = await fetchIssuesFromCloud();
      if (cloudIssues && cloudIssues.length > 0) {
        const normalized = cloudIssues.map(normalizeIssuePhotos);
        setIssues(normalized);
        await saveMultipleIssues(normalized);
      }

      // 5. Authoritative Shift Notes
      const cloudNotes = await fetchShiftNotesFromCloud();
      if (cloudNotes && cloudNotes.length > 0) {
        setShiftNotes(cloudNotes);
      }

      // 6. Authoritative Staff Profiles
      const cloudProfiles = await fetchStaffProfilesFromCloud();
      if (cloudProfiles && cloudProfiles.length > 0) {
        setStaffProfiles(cloudProfiles);
      }

      // 7. Authoritative Accountability Points
      const cloudPoints = await fetchAccountabilityPointsFromCloud();
      setAccountabilityPoints(cloudPoints || []);

      // 8. Authoritative Staff Calls
      const cloudCalls = await fetchStaffCallsFromCloud();
      setStaffCalls(cloudCalls || []);

      // Check if there is an unacknowledged call directed to currentUser
      if (currentUser) {
        const pendingCall = (cloudCalls || []).find(c => c.staffId === currentUser.id && c.status !== 'ACKNOWLEDGED');
        if (pendingCall) {
          setActiveStaffCall(pendingCall);
        }
      }

      setCloudSyncStatus('CONNECTED');
      setLastCloudSyncTime(new Date().toLocaleTimeString());
    } catch (err) {
      console.warn('[DataContext] Cloud sync error:', err);
      setCloudSyncStatus('OFFLINE');
    }
  }, [template, currentUser]);

  // Re-synchronize when user logs in with new credentials
  useEffect(() => {
    if (currentUser) {
      syncWithCloud();
    }
  }, [currentUser, syncWithCloud]);

  // Subscribe to Realtime multi-device cloud changes
  useEffect(() => {
    syncWithCloud();

    const unsubscribe = subscribeToCloudChanges(async (event) => {
      try {
        if (event === 'TEMPLATE_UPDATED') {
          const fresh = await fetchTemplateFromCloud();
          if (fresh) {
            setTemplate(fresh);
            await saveVenueTemplate(fresh);
          }
        } else if (event === 'TASKS_UPDATED') {
          const freshTasks = await fetchDailyTasksFromCloud();
          setDailyTasks(freshTasks);
          await saveMultipleDailyTasks(freshTasks);
        } else if (event === 'INSPECTIONS_UPDATED') {
          const freshInspections = await fetchInspectionsFromCloud();
          setInspections(freshInspections);
          await saveMultipleInspections(freshInspections);
        } else if (event === 'ISSUES_UPDATED') {
          const freshIssues = await fetchIssuesFromCloud();
          const normalized = freshIssues.map(normalizeIssuePhotos);
          setIssues(normalized);
          await saveMultipleIssues(normalized);
        } else if (event === 'SHIFT_NOTES_UPDATED') {
          const freshNotes = await fetchShiftNotesFromCloud();
          setShiftNotes(freshNotes);
        } else if (event === 'USERS_UPDATED') {
          const freshProfiles = await fetchStaffProfilesFromCloud();
          if (freshProfiles) setStaffProfiles(freshProfiles);
        } else if (event === 'POINTS_UPDATED') {
          const freshPoints = await fetchAccountabilityPointsFromCloud();
          setAccountabilityPoints(freshPoints || []);
        } else if (event === 'STAFF_CALL') {
          const freshCalls = await fetchStaffCallsFromCloud();
          setStaffCalls(freshCalls || []);
          if (currentUser) {
            const pendingCall = (freshCalls || []).find(c => c.staffId === currentUser.id && c.status !== 'ACKNOWLEDGED');
            if (pendingCall) setActiveStaffCall(pendingCall);
          }
        } else if (event === 'STAFF_CALL_ACKNOWLEDGED') {
          const freshCalls = await fetchStaffCallsFromCloud();
          setStaffCalls(freshCalls || []);
          if (activeStaffCall && (freshCalls || []).some(c => c.id === activeStaffCall.id && c.status === 'ACKNOWLEDGED')) {
            setActiveStaffCall(null);
          }
        }
        setLastCloudSyncTime(new Date().toLocaleTimeString());
        setCloudSyncStatus('CONNECTED');
      } catch (err) {
        console.warn(`[DataContext] Realtime event handling error for ${event}:`, err);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [syncWithCloud, currentUser, activeStaffCall]);

  // Keep references for background/foreground lifecycle cleanup
  const issuesRef = useRef<OperationalIssue[]>(issues);
  const inspectionsRef = useRef<DailyInspection[]>(inspections);
  useEffect(() => {
    issuesRef.current = issues;
  }, [issues]);
  useEffect(() => {
    inspectionsRef.current = inspections;
  }, [inspections]);

  // Automatic photo retention cleanup on foreground resume and periodic timer
  useEffect(() => {
    let isCleaning = false;

    const runCleanup = async () => {
      if (isCleaning) return;
      isCleaning = true;
      try {
        const cleanup = await executeAutoPhotoCleanup(issuesRef.current, inspectionsRef.current);
        if (cleanup.hasCleaned) {
          setIssues(cleanup.issues);
          setInspections(cleanup.inspections);
          await saveMultipleIssues(cleanup.issues);
          await saveMultipleInspections(cleanup.inspections);
        }
      } catch (err) {
        console.warn('Auto photo retention cleanup error', err);
      } finally {
        isCleaning = false;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        runCleanup();
      }
    };

    const handleWindowFocus = () => {
      runCleanup();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);

    // Periodic cleanup check every 60 seconds
    const interval = setInterval(runCleanup, 60000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      clearInterval(interval);
    };
  }, []);

  // Periodic Reminder Loop (evaluates overdue/due soon issues & tasks and plays audio alert)
  useEffect(() => {
    const runEvaluation = () => {
      const evalResult = evaluateOperationalReminders(issues, dailyTasks, settings.reminderSettings);
      
      // Filter out manually dismissed reminders from active banner
      const filtered = evalResult.reminders.filter(r => !dismissedReminderIds[r.id]);
      setActiveReminders(filtered);
      setOverdueRemindersCount(evalResult.overdueCount);
      setDueSoonRemindersCount(evalResult.dueSoonCount);

      // Trigger audio / vibration feedback for the top reminder if due
      if (filtered.length > 0) {
        triggerReminderFeedback(filtered[0], settings.reminderSettings);
      }
    };

    // Run immediately on change
    runEvaluation();

    // Check periodically every 30 seconds
    const interval = setInterval(runEvaluation, 30000);
    return () => clearInterval(interval);
  }, [issues, dailyTasks, settings.reminderSettings, dismissedReminderIds]);

  const dismissReminder = useCallback((reminderId: string) => {
    setDismissedReminderIds(prev => ({ ...prev, [reminderId]: true }));
  }, []);

  // Derived queries
  const todayInspection = useMemo(() => {
    return inspections.find(i => i.date === todayDate) || null;
  }, [inspections, todayDate]);

  const todayIssues = useMemo(() => {
    return issues.filter(i => i.inspectionDate === todayDate);
  }, [issues, todayDate]);

  const outstandingIssues = useMemo(() => {
    // Issues that are NOT VERIFIED
    return issues.filter(i => i.currentStatus !== 'VERIFIED');
  }, [issues]);

  const allWaitingVerificationIssues = useMemo(() => {
    return issues.filter(i => i.currentStatus === 'WAITING_VERIFICATION');
  }, [issues]);

  // Derived Task queries
  const todayTasks = useMemo(() => {
    return dailyTasks.filter(t => t.date === todayDate);
  }, [dailyTasks, todayDate]);

  const todayOpenTasksCount = useMemo(() => {
    return todayTasks.filter(t => t.status === 'PENDING' || t.status === 'IN_PROGRESS').length;
  }, [todayTasks]);

  const todayDoneTasksCount = useMemo(() => {
    return todayTasks.filter(t => t.status === 'DONE').length;
  }, [todayTasks]);

  const todayNotDoneTasksCount = useMemo(() => {
    return todayTasks.filter(t => t.status === 'NOT_DONE').length;
  }, [todayTasks]);

  const todayPendingTasksCount = useMemo(() => {
    return todayTasks.filter(t => t.status === 'PENDING').length;
  }, [todayTasks]);

  const todayInProgressTasksCount = useMemo(() => {
    return todayTasks.filter(t => t.status === 'IN_PROGRESS').length;
  }, [todayTasks]);

  // Start today's inspection
  const startTodayInspection = useCallback(async (user: UserProfile): Promise<DailyInspection> => {
    const existing = inspections.find(i => i.date === todayDate);
    if (existing) return existing;

    // Calculate total items from template
    let totalItems = 0;
    const initialItemResults: Record<string, InspectionItemResult> = {};

    template.areas.forEach(area => {
      area.items.forEach(item => {
        totalItems++;
        initialItemResults[item.id] = {
          itemId: item.id,
          itemName: item.name,
          areaId: area.id,
          areaName: area.name,
          overallStatus: 'NA',
          criterionResults: item.criteria.map(c => ({
            criterionId: c.id,
            criterionName: c.name,
            status: 'NA',
            selectedReasons: []
          }))
        };
      });
    });

    const newInsp: DailyInspection = {
      id: `INSP-${todayDate}`,
      date: todayDate,
      startedAt: new Date().toISOString(),
      startedByName: user.name,
      startedByRole: user.role,
      isCompleted: false,
      isHandedOver: false,
      totalItems,
      readyItems: 0,
      notReadyItems: 0,
      naItems: totalItems,
      totalIssuesCount: 0,
      itemResults: initialItemResults
    };

    const updatedInspections = [newInsp, ...inspections.filter(i => i.id !== newInsp.id)];
    setInspections(updatedInspections);
    await saveInspection(newInsp);
    await saveInspectionToCloud(newInsp);
    return newInsp;
  }, [inspections, template, todayDate]);

  // Set criterion status for an item and auto-sync issue
  const setItemCriterionStatus = useCallback(async (
    date: string,
    areaId: string,
    areaName: string,
    itemId: string,
    itemName: string,
    criterionId: string,
    criterionName: string,
    status: InspectionStatusType,
    reasons: string[],
    customReason?: string,
    photosParam?: string | string[],
    user?: UserProfile
  ) => {
    const targetInsp = inspections.find(i => i.date === date);
    if (!targetInsp) return;

    let itemResult = targetInsp.itemResults[itemId];
    if (!itemResult) {
      itemResult = {
        itemId,
        itemName,
        areaId,
        areaName,
        overallStatus: 'NA',
        criterionResults: []
      };
    }

    const critIndex = itemResult.criterionResults.findIndex(c => c.criterionId === criterionId);
    let existingCriterionResult = critIndex >= 0 ? itemResult.criterionResults[critIndex] : null;

    let issueId = existingCriterionResult?.issueId;
    let newIssuesList = [...issues];

    // Find default department for this criterion from template
    const areaTemplate = template.areas.find(a => a.id === areaId);
    const itemTemplate = areaTemplate?.items.find(it => it.id === itemId);
    const critTemplate = itemTemplate?.criteria.find(c => c.id === criterionId);
    const defaultDeptId = critTemplate?.defaultDepartmentId || template.departments[0]?.id || 'dept-hk';
    const defaultDept = template.departments.find(d => d.id === defaultDeptId) || template.departments[0];

    let assignedPhotos: string[] = [];

    if (status === 'NOT_OK') {
      // Need an issue record
      if (!issueId) {
        issueId = `ISS-${date}-${itemId}-${criterionId}-${Date.now().toString(36)}`;
      }

      const existingIssue = newIssuesList.find(i => i.id === issueId);
      const isNew = !existingIssue;

      if (Array.isArray(photosParam)) {
        assignedPhotos = photosParam;
      } else if (typeof photosParam === 'string' && photosParam) {
        const existingList = existingIssue?.photos || (existingIssue?.photoUrl ? [existingIssue.photoUrl] : []);
        assignedPhotos = existingList.includes(photosParam) ? existingList : [...existingList, photosParam];
      } else if (existingIssue?.photos && existingIssue.photos.length > 0) {
        assignedPhotos = existingIssue.photos;
      } else if (existingIssue?.photoUrl) {
        assignedPhotos = [existingIssue.photoUrl];
      } else if (existingCriterionResult?.photos && existingCriterionResult.photos.length > 0) {
        assignedPhotos = existingCriterionResult.photos;
      } else if (existingCriterionResult?.photoUrl) {
        assignedPhotos = [existingCriterionResult.photoUrl];
      }

      const issueRecord: OperationalIssue = {
        id: issueId,
        inspectionDate: date,
        inspectionId: targetInsp.id,
        areaId,
        areaName,
        itemId,
        itemName,
        criterionId,
        criterionName,
        specificProblems: reasons.length > 0 ? reasons : ['NOT SPECIFIED'],
        customNote: customReason !== undefined ? customReason : (existingIssue?.customNote || ''),
        photos: assignedPhotos,
        photoUrl: assignedPhotos[0] || undefined,
        resolutionPhotos: existingIssue?.resolutionPhotos || (existingIssue?.resolutionPhotoUrl ? [existingIssue.resolutionPhotoUrl] : []),
        resolutionPhotoUrl: existingIssue?.resolutionPhotoUrl || (existingIssue?.resolutionPhotos ? existingIssue.resolutionPhotos[0] : undefined),
        discoveredAt: existingIssue?.discoveredAt || new Date().toISOString(),
        discoveredByRole: existingIssue?.discoveredByRole || user?.role || 'MANAGER',
        discoveredByName: existingIssue?.discoveredByName || user?.name || 'Manager',
        originalInspectionStatus: 'NOT_OK',
        departmentId: existingIssue?.departmentId || defaultDept?.id || 'dept-hk',
        departmentName: existingIssue?.departmentName || defaultDept?.name || 'Housekeeping',
        currentStatus: existingIssue?.currentStatus || 'NOT_READY',
        statusUpdatedAt: new Date().toISOString(),
        reopenCount: existingIssue?.reopenCount || 0,
        auditTrail: existingIssue ? existingIssue.auditTrail : [
          {
            id: `aud-${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: 'CREATED',
            newStatus: 'NOT_READY',
            performedByRole: user?.role || 'MANAGER',
            performedByName: user?.name || 'Manager',
            notes: reasons.join(', ') + (customReason ? ` (${customReason})` : ''),
            departmentName: defaultDept?.name || 'Housekeeping'
          }
        ]
      };

      if (isNew) {
        newIssuesList.push(issueRecord);
      } else {
        const idx = newIssuesList.findIndex(i => i.id === issueId);
        newIssuesList[idx] = issueRecord;
      }
      await saveIssue(issueRecord);
      await saveIssueToCloud(issueRecord);
    } else {
      // If was NOT_OK and now changed back to GOOD/NA, remove or resolve the issue
      if (issueId) {
        newIssuesList = newIssuesList.filter(i => i.id !== issueId);
      }
      issueId = undefined;
    }

    const updatedCriterionResult: CriterionResult = {
      criterionId,
      criterionName,
      status,
      selectedReasons: reasons,
      customReason,
      photos: status === 'NOT_OK' ? assignedPhotos : [],
      photoUrl: status === 'NOT_OK' ? (assignedPhotos[0] || undefined) : undefined,
      issueId
    };

    let newCritResults = [...itemResult.criterionResults];
    if (critIndex >= 0) {
      newCritResults[critIndex] = updatedCriterionResult;
    } else {
      newCritResults.push(updatedCriterionResult);
    }

    // Determine overall status
    const hasNotOk = newCritResults.some(c => c.status === 'NOT_OK');
    const allNa = newCritResults.length > 0 && newCritResults.every(c => c.status === 'NA');
    const overallStatus = hasNotOk ? 'NOT_READY' : allNa ? 'NA' : 'READY';

    const updatedItemResult: InspectionItemResult = {
      ...itemResult,
      overallStatus,
      criterionResults: newCritResults,
      inspectedAt: new Date().toISOString(),
      inspectedByName: user?.name || 'Manager'
    };

    const newItemResults = {
      ...targetInsp.itemResults,
      [itemId]: updatedItemResult
    };

    // Recompute summary totals
    let readyCount = 0;
    let notReadyCount = 0;
    let naCount = 0;

    (Object.values(newItemResults) as InspectionItemResult[]).forEach(res => {
      if (res.overallStatus === 'READY') readyCount++;
      else if (res.overallStatus === 'NOT_READY') notReadyCount++;
      else naCount++;
    });

    const issuesForThisDate = newIssuesList.filter(i => i.inspectionDate === date);

    const updatedInsp: DailyInspection = {
      ...targetInsp,
      itemResults: newItemResults,
      readyItems: readyCount,
      notReadyItems: notReadyCount,
      naItems: naCount,
      totalIssuesCount: issuesForThisDate.length
    };

    const updatedInspectionsList = inspections.map(i => i.id === updatedInsp.id ? updatedInsp : i);

    setInspections(updatedInspectionsList);
    setIssues(newIssuesList);

    await saveInspection(updatedInsp);
    await saveInspectionToCloud(updatedInsp);
  }, [inspections, issues, template]);

  // Quick mark item all good
  const quickMarkItemAllGood = useCallback(async (
    date: string,
    item: ItemTemplate,
    areaName: string,
    user: UserProfile
  ) => {
    const targetInsp = inspections.find(i => i.date === date);
    if (!targetInsp) return;

    const criterionResults: CriterionResult[] = item.criteria.map(c => ({
      criterionId: c.id,
      criterionName: c.name,
      status: 'GOOD',
      selectedReasons: []
    }));

    const updatedItemResult: InspectionItemResult = {
      itemId: item.id,
      itemName: item.name,
      areaId: item.areaId,
      areaName,
      overallStatus: 'READY',
      criterionResults,
      inspectedAt: new Date().toISOString(),
      inspectedByName: user.name
    };

    const newItemResults = {
      ...targetInsp.itemResults,
      [item.id]: updatedItemResult
    };

    let readyCount = 0;
    let notReadyCount = 0;
    let naCount = 0;

    (Object.values(newItemResults) as InspectionItemResult[]).forEach(res => {
      if (res.overallStatus === 'READY') readyCount++;
      else if (res.overallStatus === 'NOT_READY') notReadyCount++;
      else naCount++;
    });

    const updatedInsp: DailyInspection = {
      ...targetInsp,
      itemResults: newItemResults,
      readyItems: readyCount,
      notReadyItems: notReadyCount,
      naItems: naCount
    };

    setInspections(prev => prev.map(i => i.id === updatedInsp.id ? updatedInsp : i));
    await saveInspection(updatedInsp);
    await saveInspectionToCloud(updatedInsp);
  }, [inspections]);

  // Quick mark entire area all good
  const quickMarkAreaAllGood = useCallback(async (
    date: string,
    area: AreaTemplate,
    user: UserProfile
  ) => {
    const targetInsp = inspections.find(i => i.date === date);
    if (!targetInsp) return;

    const newItemResults = { ...targetInsp.itemResults };

    area.items.forEach(item => {
      newItemResults[item.id] = {
        itemId: item.id,
        itemName: item.name,
        areaId: area.id,
        areaName: area.name,
        overallStatus: 'READY',
        criterionResults: item.criteria.map(c => ({
          criterionId: c.id,
          criterionName: c.name,
          status: 'GOOD',
          selectedReasons: []
        })),
        inspectedAt: new Date().toISOString(),
        inspectedByName: user.name
      };
    });

    let readyCount = 0;
    let notReadyCount = 0;
    let naCount = 0;

    (Object.values(newItemResults) as InspectionItemResult[]).forEach(res => {
      if (res.overallStatus === 'READY') readyCount++;
      else if (res.overallStatus === 'NOT_READY') notReadyCount++;
      else naCount++;
    });

    const updatedInsp: DailyInspection = {
      ...targetInsp,
      itemResults: newItemResults,
      readyItems: readyCount,
      notReadyItems: notReadyCount,
      naItems: naCount
    };

    setInspections(prev => prev.map(i => i.id === updatedInsp.id ? updatedInsp : i));
    await saveInspection(updatedInsp);
    await saveInspectionToCloud(updatedInsp);
  }, [inspections]);

  // Complete and Handover to Assistant Manager
  const completeAndHandover = useCallback(async (date: string, user: UserProfile) => {
    const targetInsp = inspections.find(i => i.date === date);
    if (!targetInsp) return;

    const now = new Date().toISOString();
    const updatedInsp: DailyInspection = {
      ...targetInsp,
      isCompleted: true,
      completedAt: now,
      completedByName: user.name,
      isHandedOver: true,
      handedOverAt: now,
      handedOverByName: user.name
    };

    setInspections(prev => prev.map(i => i.id === updatedInsp.id ? updatedInsp : i));
    await saveInspection(updatedInsp);
    await saveInspectionToCloud(updatedInsp);
  }, [inspections]);

  // ISSUE WORKFLOW: Assistant Manager -> Start Work
  const startWorkOnIssue = useCallback(async (issueId: string, user: UserProfile, notes?: string) => {
    const issue = issues.find(i => i.id === issueId);
    if (!issue) return;

    const now = new Date().toISOString();
    const updatedIssue: OperationalIssue = {
      ...issue,
      currentStatus: 'IN_PROCESS',
      statusUpdatedAt: now,
      auditTrail: [
        ...issue.auditTrail,
        {
          id: `aud-${Date.now()}`,
          timestamp: now,
          action: 'STATUS_CHANGED',
          previousStatus: issue.currentStatus,
          newStatus: 'IN_PROCESS',
          performedByRole: user.role,
          performedByName: user.name,
          notes: notes || 'Started operational follow-up'
        }
      ]
    };

    setIssues(prev => prev.map(i => i.id === issueId ? updatedIssue : i));
    await saveIssue(updatedIssue);
    await saveIssueToCloud(updatedIssue);
  }, [issues]);

  // Change Issue Department
  const changeIssueDepartment = useCallback(async (issueId: string, departmentId: string, user: UserProfile) => {
    const issue = issues.find(i => i.id === issueId);
    if (!issue) return;

    const dept = template.departments.find(d => d.id === departmentId);
    if (!dept) return;

    const now = new Date().toISOString();
    const updatedIssue: OperationalIssue = {
      ...issue,
      departmentId: dept.id,
      departmentName: dept.name,
      auditTrail: [
        ...issue.auditTrail,
        {
          id: `aud-${Date.now()}`,
          timestamp: now,
          action: 'DEPARTMENT_CHANGED',
          performedByRole: user.role,
          performedByName: user.name,
          notes: `Reassigned from ${issue.departmentName} to ${dept.name}`,
          departmentName: dept.name
        }
      ]
    };

    setIssues(prev => prev.map(i => i.id === issueId ? updatedIssue : i));
    await saveIssue(updatedIssue);
    await saveIssueToCloud(updatedIssue);
  }, [issues, template]);

  // Add Note to Issue
  const addIssueNote = useCallback(async (issueId: string, note: string, user: UserProfile) => {
    const issue = issues.find(i => i.id === issueId);
    if (!issue) return;

    const now = new Date().toISOString();
    const updatedIssue: OperationalIssue = {
      ...issue,
      customNote: issue.customNote ? `${issue.customNote}\n[${user.name}]: ${note}` : `[${user.name}]: ${note}`,
      auditTrail: [
        ...issue.auditTrail,
        {
          id: `aud-${Date.now()}`,
          timestamp: now,
          action: 'NOTE_ADDED',
          performedByRole: user.role,
          performedByName: user.name,
          notes: note
        }
      ]
    };

    setIssues(prev => prev.map(i => i.id === issueId ? updatedIssue : i));
    await saveIssue(updatedIssue);
    await saveIssueToCloud(updatedIssue);
  }, [issues]);

  // Attach Photo to Issue
  const attachPhotoToIssue = useCallback(async (
    issueId: string,
    photoDataUrl: string,
    isResolution: boolean,
    user: UserProfile
  ) => {
    const issue = issues.find(i => i.id === issueId);
    if (!issue) return;

    const photoId = `photo-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    await savePhotoBlob(photoId, photoDataUrl);

    const now = new Date().toISOString();
    const existingPhotos = Array.isArray(issue.photos) && issue.photos.length > 0
      ? issue.photos
      : (issue.photoUrl ? [issue.photoUrl] : []);
    const existingResPhotos = Array.isArray(issue.resolutionPhotos) && issue.resolutionPhotos.length > 0
      ? issue.resolutionPhotos
      : (issue.resolutionPhotoUrl ? [issue.resolutionPhotoUrl] : []);

    const updatedPhotos = !isResolution
      ? (!existingPhotos.includes(photoDataUrl) ? [...existingPhotos, photoDataUrl] : existingPhotos)
      : existingPhotos;
    const updatedResPhotos = isResolution
      ? (!existingResPhotos.includes(photoDataUrl) ? [...existingResPhotos, photoDataUrl] : existingResPhotos)
      : existingResPhotos;

    const updatedIssue: OperationalIssue = {
      ...issue,
      photos: updatedPhotos,
      resolutionPhotos: updatedResPhotos,
      photoUrl: updatedPhotos[0] || undefined,
      resolutionPhotoUrl: updatedResPhotos[0] || undefined,
      auditTrail: [
        ...issue.auditTrail,
        {
          id: `aud-${Date.now()}`,
          timestamp: now,
          action: 'PHOTO_ADDED',
          performedByRole: user.role,
          performedByName: user.name,
          notes: isResolution ? 'Resolution proof photo attached' : 'Issue condition photo attached'
        }
      ]
    };

    setIssues(prev => prev.map(i => i.id === issueId ? updatedIssue : i));
    await saveIssue(updatedIssue);
    await saveIssueToCloud(updatedIssue);
  }, [issues]);

  // Remove Photo from Issue
  const removePhotoFromIssue = useCallback(async (
    issueId: string,
    photoDataUrl: string,
    isResolution: boolean,
    user: UserProfile
  ) => {
    const issue = issues.find(i => i.id === issueId);
    if (!issue) return;

    const now = new Date().toISOString();
    const existingPhotos = Array.isArray(issue.photos) && issue.photos.length > 0
      ? issue.photos
      : (issue.photoUrl ? [issue.photoUrl] : []);
    const existingResPhotos = Array.isArray(issue.resolutionPhotos) && issue.resolutionPhotos.length > 0
      ? issue.resolutionPhotos
      : (issue.resolutionPhotoUrl ? [issue.resolutionPhotoUrl] : []);

    const updatedPhotos = !isResolution
      ? existingPhotos.filter(p => p !== photoDataUrl)
      : existingPhotos;
    const updatedResPhotos = isResolution
      ? existingResPhotos.filter(p => p !== photoDataUrl)
      : existingResPhotos;

    const updatedIssue: OperationalIssue = {
      ...issue,
      photos: updatedPhotos,
      resolutionPhotos: updatedResPhotos,
      photoUrl: updatedPhotos[0] || undefined,
      resolutionPhotoUrl: updatedResPhotos[0] || undefined,
      auditTrail: [
        ...issue.auditTrail,
        {
          id: `aud-${Date.now()}`,
          timestamp: now,
          action: 'PHOTO_REMOVED',
          performedByRole: user.role,
          performedByName: user.name,
          notes: isResolution ? 'Resolution proof photo removed' : 'Issue condition photo removed'
        }
      ]
    };

    setIssues(prev => prev.map(i => i.id === issueId ? updatedIssue : i));
    await saveIssue(updatedIssue);
    await saveIssueToCloud(updatedIssue);
  }, [issues]);

  // Mark Issue Resolved -> Becomes WAITING_VERIFICATION (Assistant Manager action)
  const markIssueResolved = useCallback(async (
    issueId: string, 
    user: UserProfile, 
    resolutionNotes?: string,
    proofPhotos?: string[]
  ) => {
    const issue = issues.find(i => i.id === issueId);
    if (!issue) return;

    const now = new Date().toISOString();
    let existingResPhotos = Array.isArray(issue.resolutionPhotos) && issue.resolutionPhotos.length > 0
      ? [...issue.resolutionPhotos]
      : (issue.resolutionPhotoUrl ? [issue.resolutionPhotoUrl] : []);

    if (proofPhotos && proofPhotos.length > 0) {
      for (const p of proofPhotos) {
        const photoId = `photo-res-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        await savePhotoBlob(photoId, p);
        if (!existingResPhotos.includes(p)) {
          existingResPhotos.push(p);
        }
      }
    }

    const updatedIssue: OperationalIssue = {
      ...issue,
      currentStatus: 'WAITING_VERIFICATION',
      statusUpdatedAt: now,
      resolutionPhotos: existingResPhotos,
      resolutionPhotoUrl: existingResPhotos[0] || undefined,
      resolutionInfo: {
        resolvedAt: now,
        resolvedByName: user.name,
        notes: resolutionNotes
      },
      auditTrail: [
        ...issue.auditTrail,
        {
          id: `aud-${Date.now()}`,
          timestamp: now,
          action: 'STATUS_CHANGED',
          previousStatus: issue.currentStatus,
          newStatus: 'WAITING_VERIFICATION',
          performedByRole: user.role,
          performedByName: user.name,
          notes: resolutionNotes ? `Marked resolved: ${resolutionNotes}` : 'Marked resolved, awaiting Manager verification'
        }
      ]
    };

    setIssues(prev => prev.map(i => i.id === issueId ? updatedIssue : i));
    await saveIssue(updatedIssue);
    await saveIssueToCloud(updatedIssue);
  }, [issues]);

  // Verify Issue -> Becomes VERIFIED (Manager only)
  const verifyIssue = useCallback(async (issueId: string, user: UserProfile, verificationNotes?: string) => {
    const issue = issues.find(i => i.id === issueId);
    if (!issue) return;

    const now = new Date().toISOString();
    const updatedIssue: OperationalIssue = {
      ...issue,
      currentStatus: 'VERIFIED',
      statusUpdatedAt: now,
      verificationInfo: {
        verifiedAt: now,
        verifiedByName: user.name,
        verifiedByRole: 'MANAGER',
        notes: verificationNotes
      },
      auditTrail: [
        ...issue.auditTrail,
        {
          id: `aud-${Date.now()}`,
          timestamp: now,
          action: 'VERIFIED',
          previousStatus: issue.currentStatus,
          newStatus: 'VERIFIED',
          performedByRole: 'MANAGER',
          performedByName: user.name,
          notes: verificationNotes || 'Manager physically inspected & verified resolution'
        }
      ]
    };

    setIssues(prev => prev.map(i => i.id === issueId ? updatedIssue : i));
    await saveIssue(updatedIssue);
    await saveIssueToCloud(updatedIssue);
  }, [issues]);

  // Reopen Issue -> Becomes NOT_READY with incremental cycle counter (Manager only)
  const reopenIssue = useCallback(async (issueId: string, user: UserProfile, reopenReason: string) => {
    const issue = issues.find(i => i.id === issueId);
    if (!issue) return;

    const now = new Date().toISOString();
    const updatedIssue: OperationalIssue = {
      ...issue,
      currentStatus: 'NOT_READY',
      statusUpdatedAt: now,
      reopenCount: (issue.reopenCount || 0) + 1,
      auditTrail: [
        ...issue.auditTrail,
        {
          id: `aud-${Date.now()}`,
          timestamp: now,
          action: 'REOPENED',
          previousStatus: issue.currentStatus,
          newStatus: 'NOT_READY',
          performedByRole: 'MANAGER',
          performedByName: user.name,
          notes: `Reopened (Cycle ${issue.reopenCount + 1}): ${reopenReason}`
        }
      ]
    };

    setIssues(prev => prev.map(i => i.id === issueId ? updatedIssue : i));
    await saveIssue(updatedIssue);
    await saveIssueToCloud(updatedIssue);
  }, [issues]);

  // TEMPLATE MANAGEMENT
  const updateVenueTemplate = useCallback(async (updated: VenueTemplate): Promise<boolean> => {
    try {
      if (!updated || !updated.areas || updated.areas.length === 0) {
        throw new Error('Template must contain at least one area.');
      }
      const updatedWithTime: VenueTemplate = {
        ...updated,
        lastModified: new Date().toISOString(),
        version: (updated.version || 1) + 1
      };
      setTemplate(updatedWithTime);
      await saveVenueTemplate(updatedWithTime);
      await saveTemplateToCloud(updatedWithTime);
      return true;
    } catch (err) {
      console.error('Failed to save venue template:', err);
      throw err;
    }
  }, []);

  const updateTemplate = updateVenueTemplate;

  // VENUE MANAGEMENT
  const addVenue = useCallback(async (
    paramOrName: string | Omit<VenueDefinition, 'id'>, 
    code?: string, 
    icon = 'Building2', 
    description?: string
  ): Promise<VenueDefinition> => {
    let newVenue: VenueDefinition;
    if (typeof paramOrName === 'object') {
      newVenue = {
        id: `venue-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
        name: paramOrName.name?.trim() || 'New Venue',
        code: (paramOrName.code || paramOrName.name?.substring(0, 3) || 'LOC').toUpperCase().trim(),
        icon: paramOrName.icon || 'Building2',
        address: paramOrName.address?.trim() || undefined,
        description: paramOrName.description?.trim() || undefined,
        order: (template.venues?.length || 0) + 1,
        isActive: paramOrName.isActive !== undefined ? paramOrName.isActive : true
      };
    } else {
      newVenue = {
        id: `venue-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
        name: paramOrName.trim(),
        code: (code || paramOrName.substring(0, 3)).toUpperCase().trim(),
        icon,
        description: description?.trim() || undefined,
        order: (template.venues?.length || 0) + 1,
        isActive: true
      };
    }

    const updatedVenues = [...(template.venues || DEFAULT_VENUES), newVenue];
    await updateTemplate({
      ...template,
      venues: updatedVenues
    });
    return newVenue;
  }, [template, updateTemplate]);

  const updateVenue = useCallback(async (venueId: string, updates: Partial<VenueDefinition>): Promise<void> => {
    const currentVenues = template.venues || DEFAULT_VENUES;
    const updatedVenues = currentVenues.map(v => v.id === venueId ? { ...v, ...updates } : v);
    
    // Also update any area referencing this venue if name changed
    let updatedAreas = template.areas;
    if (updates.name) {
      updatedAreas = template.areas.map(a => {
        if (a.venueId === venueId) {
          return {
            ...a,
            venueName: updates.name,
            items: a.items.map(it => ({ ...it, venueName: updates.name }))
          };
        }
        return a;
      });
    }

    await updateTemplate({
      ...template,
      venues: updatedVenues,
      areas: updatedAreas
    });
  }, [template, updateTemplate]);

  const deleteVenue = useCallback(async (venueId: string): Promise<void> => {
    const currentVenues = template.venues || DEFAULT_VENUES;
    const updatedVenues = currentVenues.filter(v => v.id !== venueId);
    await updateTemplate({
      ...template,
      venues: updatedVenues
    });
  }, [template, updateTemplate]);

  // BLUEPRINT MANAGEMENT (Manager only)
  const addBlueprint = useCallback(async (blueprintData: Omit<BlueprintTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<BlueprintTemplate> => {
    const now = new Date().toISOString();
    const newBp: BlueprintTemplate = {
      ...blueprintData,
      id: `bp-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: now,
      updatedAt: now
    };

    const currentBlueprints = template.blueprints || [];
    await updateTemplate({
      ...template,
      blueprints: [...currentBlueprints, newBp]
    });
    return newBp;
  }, [template, updateTemplate]);

  const updateBlueprint = useCallback(async (blueprintId: string, updates: Partial<BlueprintTemplate>): Promise<void> => {
    const currentBlueprints = template.blueprints || [];
    const now = new Date().toISOString();
    const updatedBlueprints = currentBlueprints.map(bp => 
      bp.id === blueprintId ? { ...bp, ...updates, updatedAt: now } : bp
    );
    await updateTemplate({
      ...template,
      blueprints: updatedBlueprints
    });
  }, [template, updateTemplate]);

  const deleteBlueprint = useCallback(async (blueprintId: string): Promise<void> => {
    const currentBlueprints = template.blueprints || [];
    await updateTemplate({
      ...template,
      blueprints: currentBlueprints.filter(bp => bp.id !== blueprintId)
    });
  }, [template, updateTemplate]);

  const duplicateBlueprint = useCallback(async (blueprintId: string): Promise<BlueprintTemplate | null> => {
    const currentBlueprints = template.blueprints || [];
    const source = currentBlueprints.find(bp => bp.id === blueprintId);
    if (!source) return null;

    const now = new Date().toISOString();
    const clonedCriteria = source.criteria.map(c => ({
      ...c,
      id: `crit-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      predefinedReasons: [...(c.predefinedReasons || [])]
    }));

    const copyBp: BlueprintTemplate = {
      ...source,
      id: `bp-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      name: `${source.name} (Copy)`,
      criteria: clonedCriteria,
      createdAt: now,
      updatedAt: now
    };

    await updateTemplate({
      ...template,
      blueprints: [...currentBlueprints, copyBp]
    });
    return copyBp;
  }, [template, updateTemplate]);

  const saveItemAsBlueprint = useCallback(async (
    item: ItemTemplate, 
    blueprintName: string, 
    description?: string, 
    venueCompatibility: string[] = ['ALL']
  ): Promise<BlueprintTemplate> => {
    const now = new Date().toISOString();
    const clonedCriteria = item.criteria.map(c => ({
      ...c,
      id: `crit-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      predefinedReasons: [...(c.predefinedReasons || [])]
    }));

    const newBp: BlueprintTemplate = {
      id: `bp-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      name: blueprintName.trim() || `${item.name} Blueprint`,
      description: description?.trim() || `Generated from ${item.name}`,
      venueCompatibility,
      defaultDepartmentId: clonedCriteria[0]?.defaultDepartmentId || template.departments[0]?.id || 'dept-server',
      criteria: clonedCriteria,
      isActive: true,
      createdAt: now,
      updatedAt: now
    };

    const currentBlueprints = template.blueprints || [];
    await updateTemplate({
      ...template,
      blueprints: [...currentBlueprints, newBp]
    });
    return newBp;
  }, [template, updateTemplate]);

  // BULK OPERATIONS & CREATION (Manager only)
  const bulkCreateFromBlueprint = useCallback(async (
    areaId: string,
    blueprintId: string,
    quantity: number,
    namePattern: string,
    startNumber = 1
  ): Promise<ItemTemplate[]> => {
    const area = template.areas.find(a => a.id === areaId);
    if (!area) throw new Error('Target area not found');

    const blueprint = (template.blueprints || []).find(bp => bp.id === blueprintId);
    if (!blueprint) throw new Error('Blueprint not found');

    const names = generateNamesFromPattern(namePattern, quantity, startNumber);
    const newItems: ItemTemplate[] = names.map((name, idx) => {
      const freshCriteria = blueprint.criteria.map(crit => ({
        ...crit,
        id: `crit-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
        predefinedReasons: [...(crit.predefinedReasons || [])]
      }));

      return {
        id: `item-${Date.now().toString(36)}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        name,
        areaId,
        venueId: area.venueId,
        venueName: area.venueName || area.name,
        order: area.items.length + idx + 1,
        criteria: freshCriteria
      };
    });

    const updatedAreas = template.areas.map(a => {
      if (a.id === areaId) {
        return {
          ...a,
          items: [...a.items, ...newItems]
        };
      }
      return a;
    });

    await updateTemplate({
      ...template,
      areas: updatedAreas
    });

    return newItems;
  }, [template, updateTemplate]);

  const duplicateItem = useCallback(async (
    areaId: string,
    itemId: string,
    newName?: string
  ): Promise<ItemTemplate | null> => {
    const area = template.areas.find(a => a.id === areaId);
    if (!area) return null;

    const sourceItem = area.items.find(i => i.id === itemId);
    if (!sourceItem) return null;

    const clonedCriteria = sourceItem.criteria.map(c => ({
      ...c,
      id: `crit-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      predefinedReasons: [...(c.predefinedReasons || [])]
    }));

    const copyItem: ItemTemplate = {
      id: `item-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      name: newName ? newName.trim() : `${sourceItem.name} (Copy)`,
      areaId,
      venueId: area.venueId,
      venueName: area.venueName || area.name,
      order: area.items.length + 1,
      criteria: clonedCriteria
    };

    const updatedAreas = template.areas.map(a => {
      if (a.id === areaId) {
        return {
          ...a,
          items: [...a.items, copyItem]
        };
      }
      return a;
    });

    await updateTemplate({
      ...template,
      areas: updatedAreas
    });

    return copyItem;
  }, [template, updateTemplate]);

  const duplicateMultipleItems = useCallback(async (
    areaId: string,
    itemId: string,
    quantity: number,
    namePattern: string,
    startNumber = 1
  ): Promise<ItemTemplate[]> => {
    const area = template.areas.find(a => a.id === areaId);
    if (!area) throw new Error('Target area not found');

    const sourceItem = area.items.find(i => i.id === itemId);
    if (!sourceItem) throw new Error('Source item not found');

    const names = generateNamesFromPattern(namePattern, quantity, startNumber);
    const newItems: ItemTemplate[] = names.map((name, idx) => {
      const clonedCriteria = sourceItem.criteria.map(c => ({
        ...c,
        id: `crit-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
        predefinedReasons: [...(c.predefinedReasons || [])]
      }));

      return {
        id: `item-${Date.now().toString(36)}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        name,
        areaId,
        venueId: area.venueId,
        venueName: area.venueName || area.name,
        order: area.items.length + idx + 1,
        criteria: clonedCriteria
      };
    });

    const updatedAreas = template.areas.map(a => {
      if (a.id === areaId) {
        return {
          ...a,
          items: [...a.items, ...newItems]
        };
      }
      return a;
    });

    await updateTemplate({
      ...template,
      areas: updatedAreas
    });

    return newItems;
  }, [template, updateTemplate]);

  const bulkEditItems = useCallback(async (
    areaId: string,
    itemIds: string[],
    updates: { departmentId?: string; appendCriterion?: CriterionTemplate }
  ): Promise<void> => {
    const updatedAreas = template.areas.map(area => {
      if (area.id !== areaId) return area;

      const updatedItems = area.items.map(item => {
        if (!itemIds.includes(item.id)) return item;

        let newCriteria = [...item.criteria];

        if (updates.departmentId) {
          newCriteria = newCriteria.map(c => ({
            ...c,
            defaultDepartmentId: updates.departmentId
          }));
        }

        if (updates.appendCriterion) {
          const freshCriterion: CriterionTemplate = {
            ...updates.appendCriterion,
            id: `crit-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
            predefinedReasons: [...(updates.appendCriterion.predefinedReasons || [])]
          };
          newCriteria.push(freshCriterion);
        }

        return {
          ...item,
          criteria: newCriteria
        };
      });

      return {
        ...area,
        items: updatedItems
      };
    });

    await updateTemplate({
      ...template,
      areas: updatedAreas
    });
  }, [template, updateTemplate]);

  // AREA & ITEM ACTIONS
  const addArea = useCallback(async (name: string, icon = 'Layers', venueId?: string) => {
    const venue = (template.venues || DEFAULT_VENUES).find(v => v.id === venueId) || (template.venues || DEFAULT_VENUES)[0];
    const newArea: AreaTemplate = {
      id: `area-${Date.now().toString(36)}`,
      name,
      icon,
      venueId: venue?.id,
      venueName: venue?.name,
      order: template.areas.length + 1,
      items: []
    };
    await updateTemplate({
      ...template,
      areas: [...template.areas, newArea]
    });
  }, [template, updateTemplate]);

  const editArea = useCallback(async (areaId: string, name: string, venueId?: string) => {
    const venue = venueId ? (template.venues || DEFAULT_VENUES).find(v => v.id === venueId) : undefined;
    const areas = template.areas.map(a => {
      if (a.id === areaId) {
        return { 
          ...a, 
          name, 
          ...(venueId ? { venueId: venue?.id, venueName: venue?.name } : {}) 
        };
      }
      return a;
    });
    await updateTemplate({ ...template, areas });
  }, [template, updateTemplate]);

  const deleteArea = useCallback(async (areaId: string) => {
    const areas = template.areas.filter(a => a.id !== areaId);
    await updateTemplate({ ...template, areas });
  }, [template, updateTemplate]);

  const addItemToArea = useCallback(async (areaId: string, name: string, criteriaPreset = 'ROOM') => {
    const area = template.areas.find(a => a.id === areaId);
    if (!area) return;

    // Borrow criteria from existing items in this area, or use default
    const existingCriteria = area.items[0]?.criteria || [
      { id: 'crit-gen-clean', name: 'Cleanliness', predefinedReasons: ['DIRTY', 'TRASH', 'ODOR', 'OTHER'] },
      { id: 'crit-gen-cond', name: 'Operational Condition', predefinedReasons: ['BROKEN', 'LIGHT OFF', 'DAMAGED', 'OTHER'] }
    ];

    const newItem: ItemTemplate = {
      id: `item-${Date.now().toString(36)}`,
      name,
      areaId,
      venueId: area.venueId,
      venueName: area.venueName || area.name,
      order: area.items.length + 1,
      criteria: JSON.parse(JSON.stringify(existingCriteria))
    };

    const updatedAreas = template.areas.map(a => {
      if (a.id === areaId) {
        return { ...a, items: [...a.items, newItem] };
      }
      return a;
    });

    await updateTemplate({ ...template, areas: updatedAreas });
  }, [template, updateTemplate]);

  const editItem = useCallback(async (itemId: string, name: string) => {
    const updatedAreas = template.areas.map(a => {
      const itemIdx = a.items.findIndex(i => i.id === itemId);
      if (itemIdx >= 0) {
        const newItems = [...a.items];
        newItems[itemIdx] = { ...newItems[itemIdx], name };
        return { ...a, items: newItems };
      }
      return a;
    });
    await updateTemplate({ ...template, areas: updatedAreas });
  }, [template, updateTemplate]);

  const deleteItem = useCallback(async (itemId: string) => {
    const updatedAreas = template.areas.map(a => ({
      ...a,
      items: a.items.filter(i => i.id !== itemId)
    }));
    await updateTemplate({ ...template, areas: updatedAreas });
  }, [template, updateTemplate]);

  const addDepartment = useCallback(async (name: string, color = '#3b82f6') => {
    const newDept: Department = {
      id: `dept-${Date.now().toString(36)}`,
      name,
      color
    };
    await updateTemplate({
      ...template,
      departments: [...template.departments, newDept]
    });
  }, [template, updateTemplate]);

  const deleteDepartment = useCallback(async (deptId: string) => {
    await updateTemplate({
      ...template,
      departments: template.departments.filter(d => d.id !== deptId)
    });
  }, [template, updateTemplate]);

  // DAILY MANAGER -> AM TASKS ACTIONS (Venue Aware)
  const createDailyTask = useCallback(async (
    taskData: { 
      title: string; 
      notes?: string; 
      priority: TaskPriority; 
      date?: string; 
      venueId?: string; 
      venueName?: string; 
      areaId?: string; 
      areaName?: string;
      dueTime?: string;
      instructions?: string;
      assignedToUserId?: string;
      assignedToName?: string;
    },
    user: UserProfile
  ): Promise<DailyTask> => {
    const now = new Date().toISOString();
    const taskId = 'task-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
    const logId = 'tlog-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);

    const initialAuditLog: TaskAuditLog = {
      id: logId,
      timestamp: now,
      action: 'CREATED',
      performedByUserId: user.id,
      performedByName: user.name,
      performedByRole: user.role,
      notes: `Task created: "${taskData.title.trim()}"`
    };

    const newTask: DailyTask = {
      id: taskId,
      date: taskData.date || todayDate,
      venueId: taskData.venueId,
      venueName: taskData.venueName,
      areaId: taskData.areaId,
      areaName: taskData.areaName,
      title: taskData.title.trim(),
      notes: taskData.notes?.trim() || undefined,
      instructions: taskData.instructions?.trim() || undefined,
      dueTime: taskData.dueTime?.trim() || undefined,
      assignedToUserId: taskData.assignedToUserId || undefined,
      assignedToName: taskData.assignedToName?.trim() || undefined,
      priority: taskData.priority,
      status: 'PENDING',
      createdByUserId: user.id,
      createdByName: user.name,
      createdAt: now,
      updatedAt: now,
      history: [initialAuditLog]
    };

    setDailyTasks(prev => [newTask, ...prev]);
    await saveDailyTask(newTask);
    await saveDailyTaskToCloud(newTask);
    return newTask;
  }, [todayDate]);

  const updateDailyTask = useCallback(async (
    taskId: string,
    taskData: { title?: string; notes?: string; priority?: TaskPriority; venueId?: string; venueName?: string; assignedToUserId?: string; assignedToName?: string },
    user: UserProfile
  ): Promise<boolean> => {
    const task = dailyTasks.find(t => t.id === taskId);
    if (!task) return false;

    const now = new Date().toISOString();
    const logId = 'tlog-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);

    const changes: string[] = [];
    if (taskData.title && taskData.title !== task.title) changes.push(`Title changed to "${taskData.title}"`);
    if (taskData.priority && taskData.priority !== task.priority) changes.push(`Priority changed to ${taskData.priority}`);
    if (taskData.notes !== undefined && taskData.notes !== task.notes) changes.push('Notes updated');
    if (taskData.venueName && taskData.venueName !== task.venueName) changes.push(`Venue set to ${taskData.venueName}`);

    const auditLog: TaskAuditLog = {
      id: logId,
      timestamp: now,
      action: 'EDITED',
      performedByUserId: user.id,
      performedByName: user.name,
      performedByRole: user.role,
      notes: changes.length > 0 ? changes.join(', ') : 'Task details updated'
    };

    const updated: DailyTask = {
      ...task,
      title: taskData.title !== undefined ? taskData.title.trim() : task.title,
      notes: taskData.notes !== undefined ? (taskData.notes.trim() || undefined) : task.notes,
      priority: taskData.priority || task.priority,
      venueId: taskData.venueId !== undefined ? taskData.venueId : task.venueId,
      venueName: taskData.venueName !== undefined ? taskData.venueName : task.venueName,
      assignedToUserId: taskData.assignedToUserId !== undefined ? taskData.assignedToUserId || undefined : task.assignedToUserId,
      assignedToName: taskData.assignedToName !== undefined ? taskData.assignedToName || undefined : task.assignedToName,
      updatedAt: now,
      history: [...(task.history || []), auditLog]
    };

    setDailyTasks(prev => prev.map(t => t.id === taskId ? updated : t));
    await saveDailyTask(updated);
    await saveDailyTaskToCloud(updated);
    return true;
  }, [dailyTasks]);

  const deleteDailyTaskById = useCallback(async (taskId: string, user: UserProfile): Promise<boolean> => {
    const task = dailyTasks.find(t => t.id === taskId);
    if (!task) return false;

    setDailyTasks(prev => prev.filter(t => t.id !== taskId));
    await deleteDailyTask(taskId);
    await deleteDailyTaskFromCloud(taskId);
    return true;
  }, [dailyTasks]);

  const startDailyTask = useCallback(async (taskId: string, user: UserProfile): Promise<void> => {
    const task = dailyTasks.find(t => t.id === taskId);
    if (!task) return;

    const now = new Date().toISOString();
    const logId = 'tlog-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);

    const auditLog: TaskAuditLog = {
      id: logId,
      timestamp: now,
      action: 'STATUS_CHANGED',
      performedByUserId: user.id,
      performedByName: user.name,
      performedByRole: user.role,
      notes: 'Started working on task'
    };

    const updated: DailyTask = {
      ...task,
      status: 'IN_PROGRESS',
      startedAt: task.startedAt || now,
      startedByUserId: task.startedByUserId || user.id,
      startedByName: task.startedByName || user.name,
      updatedAt: now,
      history: [...(task.history || []), auditLog]
    };

    setDailyTasks(prev => prev.map(t => t.id === taskId ? updated : t));
    await saveDailyTask(updated);
    await saveDailyTaskToCloud(updated);
  }, [dailyTasks]);

  const markDailyTaskDone = useCallback(async (taskId: string, user: UserProfile, note?: string, proofPhoto?: string): Promise<void> => {
    const task = dailyTasks.find(t => t.id === taskId);
    if (!task) return;

    const now = new Date().toISOString();
    const logId = 'tlog-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);

    const auditLog: TaskAuditLog = {
      id: logId,
      timestamp: now,
      action: 'COMPLETED',
      performedByUserId: user.id,
      performedByName: user.name,
      performedByRole: user.role,
      notes: note ? `Completed with note: "${note.trim()}"` : 'Marked as Completed'
    };

    const updated: DailyTask = {
      ...task,
      status: 'DONE',
      completedAt: now,
      completedByUserId: user.id,
      completedByName: user.name,
      completionNote: note?.trim() || undefined,
      completionPhotoUrl: proofPhoto || undefined,
      completionReason: undefined, // Clear any previous not-done reason
      updatedAt: now,
      history: [...(task.history || []), auditLog]
    };

    setDailyTasks(prev => prev.map(t => t.id === taskId ? updated : t));
    await saveDailyTask(updated);
    await saveDailyTaskToCloud(updated);
  }, [dailyTasks]);

  const markDailyTaskNotDone = useCallback(async (
    taskId: string,
    reason: string,
    note?: string,
    user?: UserProfile
  ): Promise<void> => {
    const task = dailyTasks.find(t => t.id === taskId);
    if (!task) return;

    const now = new Date().toISOString();
    const logId = 'tlog-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);

    const auditLog: TaskAuditLog = {
      id: logId,
      timestamp: now,
      action: 'STATUS_CHANGED',
      performedByUserId: user?.id || 'unknown',
      performedByName: user?.name || 'Staff',
      performedByRole: user?.role || 'ASSISTANT_MANAGER',
      notes: `Marked as NOT DONE. Reason: "${reason.trim()}". ${note ? `Notes: "${note.trim()}"` : ''}`
    };

    const updated: DailyTask = {
      ...task,
      status: 'NOT_DONE',
      completedAt: now,
      completedByUserId: user?.id,
      completedByName: user?.name,
      completionReason: reason.trim(),
      completionNote: note?.trim() || undefined,
      updatedAt: now,
      history: [...(task.history || []), auditLog]
    };

    setDailyTasks(prev => prev.map(t => t.id === taskId ? updated : t));
    await saveDailyTask(updated);
    await saveDailyTaskToCloud(updated);
  }, [dailyTasks]);

  const markDailyTaskSkipped = useCallback(async (
    taskId: string,
    skipReason: string,
    user: UserProfile
  ): Promise<void> => {
    const trimmed = (skipReason || '').trim();
    if (!trimmed) {
      throw new Error('A skip reason is strictly mandatory when skipping a task.');
    }
    const task = dailyTasks.find(t => t.id === taskId);
    if (!task) return;

    const now = new Date().toISOString();
    const logId = 'tlog-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);

    const auditLog: TaskAuditLog = {
      id: logId,
      timestamp: now,
      action: 'SKIPPED',
      performedByUserId: user.id,
      performedByName: user.name,
      performedByRole: user.role,
      notes: `Skipped task. Mandatory Reason: "${trimmed}"`
    };

    const updated: DailyTask = {
      ...task,
      status: 'SKIPPED',
      completedAt: now,
      completedByUserId: user.id,
      completedByName: user.name,
      skipReason: trimmed,
      completionReason: trimmed,
      updatedAt: now,
      history: [...(task.history || []), auditLog]
    };

    setDailyTasks(prev => prev.map(t => t.id === taskId ? updated : t));
    await saveDailyTask(updated);
    await saveDailyTaskToCloud(updated);
  }, [dailyTasks]);

  // STAFF PROFILES & TEAM OPERATIONS
  const createStaffProfile = useCallback(async (
    profileData: Omit<StaffAccount, 'id' | 'createdAt' | 'updatedAt'>,
    pin?: string
  ): Promise<{ ok: boolean; profile?: StaffAccount; error?: string }> => {
    const id = `user-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const newProfile: StaffAccount = {
      ...profileData,
      id,
      createdAt: now,
      updatedAt: now
    };
    const res = await saveStaffProfileToCloud(newProfile, pin);
    if (res.ok && res.profile) {
      setStaffProfiles(prev => [...prev.filter(p => p.id !== id), res.profile!]);
      return { ok: true, profile: res.profile };
    }
    return { ok: false, error: res.error || 'Failed to create staff profile' };
  }, []);

  const updateStaffProfile = useCallback(async (
    profile: StaffAccount,
    pin?: string
  ): Promise<{ ok: boolean; error?: string }> => {
    const res = await saveStaffProfileToCloud(profile, pin);
    if (res.ok && res.profile) {
      setStaffProfiles(prev => prev.map(p => p.id === profile.id ? res.profile! : p));
      return { ok: true };
    }
    return { ok: false, error: res.error || 'Failed to update staff profile' };
  }, []);

  const deleteStaffProfile = useCallback(async (id: string): Promise<boolean> => {
    const ok = await deleteStaffProfileFromCloud(id);
    if (ok) {
      setStaffProfiles(prev => prev.filter(p => p.id !== id));
    }
    return ok;
  }, []);

  // ACCOUNTABILITY POINTS SYSTEM ACTIONS
  const addAccountabilityPoint = useCallback(async (params: {
    staffId: string;
    staffName: string;
    amount: number;
    actionType: 'ADD' | 'REMOVE';
    reason: string;
    relatedTaskId?: string;
    relatedTaskName?: string;
  }): Promise<{ ok: boolean; error?: string }> => {
    const res = await addAccountabilityPointToCloud(params);
    if (res.ok && res.point) {
      setAccountabilityPoints(prev => [res.point!, ...prev]);
      return { ok: true };
    }
    return { ok: false, error: res.error || 'Failed to assign accountability points' };
  }, []);

  // CALL THIS STAFF (URGENT CALL) ACTIONS
  const sendStaffCall = useCallback(async (params: {
    staffId: string;
    staffName: string;
    message?: string;
  }): Promise<{ ok: boolean; error?: string }> => {
    const res = await sendStaffCallToCloud(params);
    if (res.ok && res.call) {
      setStaffCalls(prev => [res.call!, ...prev]);
      return { ok: true };
    }
    return { ok: false, error: res.error || 'Failed to dispatch staff call' };
  }, []);

  const acknowledgeStaffCall = useCallback(async (callId: string): Promise<boolean> => {
    const res = await acknowledgeStaffCallInCloud(callId);
    if (res.ok && res.call) {
      setStaffCalls(prev => prev.map(c => c.id === callId ? res.call! : c));
      if (activeStaffCall?.id === callId) {
        setActiveStaffCall(null);
      }
      return true;
    }
    return false;
  }, [activeStaffCall]);

  const dismissActiveStaffCallModal = useCallback(() => {
    setActiveStaffCall(null);
  }, []);

  // SHIFT NOTES ACTIONS
  const addShiftNote = useCallback(async (noteData: Omit<ShiftNote, 'id' | 'createdAt' | 'updatedAt' | 'date'>): Promise<ShiftNote> => {
    const now = new Date().toISOString();
    const newNote: ShiftNote = {
      ...noteData,
      id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      date: todayDate,
      createdAt: now,
      updatedAt: now,
    };

    setShiftNotes(prev => [newNote, ...prev]);
    await saveShiftNote(newNote);
    await saveShiftNoteToCloud(newNote);
    return newNote;
  }, [todayDate]);

  const updateShiftNoteStatus = useCallback(async (noteId: string, status: 'OPEN' | 'IN_PROGRESS' | 'DONE', userName: string): Promise<void> => {
    const now = new Date().toISOString();
    setShiftNotes(prev => {
      return prev.map(note => {
        if (note.id !== noteId) return note;
        const updated: ShiftNote = {
          ...note,
          status,
          updatedAt: now,
          ...(status === 'DONE' ? { completedAt: now, completedByName: userName } : {})
        };
        saveShiftNote(updated);
        saveShiftNoteToCloud(updated);
        return updated;
      });
    });
  }, []);

  const deleteShiftNoteAction = useCallback(async (noteId: string): Promise<void> => {
    setShiftNotes(prev => prev.filter(n => n.id !== noteId));
    await dbDeleteShiftNote(noteId);
    await deleteShiftNoteFromCloud(noteId);
  }, []);

  // SETTINGS & BACKUPS
  const updateAppSettings = useCallback(async (newSettings: Partial<AppSettings>) => {
    const updated: AppSettings = { ...settings, ...newSettings };
    setSettings(updated);
    await saveSettings(updated);
  }, [settings]);

  const exportBackupJson = useCallback(async () => {
    const json = await exportDatabaseBackup();
    await updateAppSettings({ lastBackupDate: new Date().toISOString() });
    return json;
  }, [updateAppSettings]);

  const restoreBackupJson = useCallback(async (json: string) => {
    try {
      const restored = await restoreDatabaseFromBackup(json);
      setSettings(restored.settings);
      setTemplate(restored.template);
      setInspections(restored.inspections);
      setIssues(restored.issues);
      setDailyTasks(restored.tasks || []);
      setShiftNotes(restored.notes || []);
      return true;
    } catch (err) {
      console.error('Backup restore failed', err);
      return false;
    }
  }, []);

  const resetToFactory = useCallback(async (keepTemplate = true) => {
    const res = await resetAllData(keepTemplate);
    setSettings(res.settings);
    setTemplate(res.template);
    setInspections(res.inspections);
    setIssues(res.issues);
    setDailyTasks(res.tasks || []);
    setShiftNotes(res.notes || []);
  }, []);

  const loadSampleDemo = useCallback(async () => {
    const res = await loadDemoData();
    setSettings(res.settings);
    setTemplate(res.template);
    setInspections(res.inspections);
    setIssues(res.issues);
    setDailyTasks(res.tasks || []);
    setShiftNotes(res.notes || []);
  }, []);

  return (
    <DataContext.Provider
      value={{
        isLoading,
        settings,
        template,
        venues,
        blueprints,
        selectedVenueFilter,
        setSelectedVenueFilter,
        inspections,
        issues,
        dailyTasks,
        shiftNotes,
        todayDate,
        todayInspection,
        todayIssues,
        outstandingIssues,
        allWaitingVerificationIssues,
        todayTasks,
        todayOpenTasksCount,
        todayDoneTasksCount,
        todayNotDoneTasksCount,
        todayPendingTasksCount,
        todayInProgressTasksCount,
        addShiftNote,
        updateShiftNoteStatus,
        deleteShiftNote: deleteShiftNoteAction,
        activeReminders,
        overdueRemindersCount,
        dueSoonRemindersCount,
        dismissReminder,
        createDailyTask,
        updateDailyTask,
        deleteDailyTaskById,
        startDailyTask,
        markDailyTaskDone,
        markDailyTaskNotDone,
        markDailyTaskSkipped,
        staffProfiles,
        accountabilityPoints,
        staffCalls,
        activeStaffCall,
        createStaffProfile,
        updateStaffProfile,
        deleteStaffProfile,
        addAccountabilityPoint,
        sendStaffCall,
        acknowledgeStaffCall,
        dismissActiveStaffCallModal,
        startTodayInspection,
        setItemCriterionStatus,
        quickMarkItemAllGood,
        quickMarkAreaAllGood,
        completeAndHandover,
        startWorkOnIssue,
        changeIssueDepartment,
        addIssueNote,
        attachPhotoToIssue,
        removePhotoFromIssue,
        markIssueResolved,
        verifyIssue,
        reopenIssue,
        addVenue,
        updateVenue,
        editVenue: updateVenue,
        deleteVenue,
        addBlueprint,
        updateBlueprint,
        editBlueprint: updateBlueprint,
        deleteBlueprint,
        duplicateBlueprint,
        saveItemAsBlueprint,
        bulkCreateFromBlueprint,
        duplicateItem,
        duplicateMultipleItems,
        bulkEditItems,
        updateVenueTemplate,
        updateTemplate,
        addArea,
        editArea,
        deleteArea,
        addItemToArea,
        editItem,
        deleteItem,
        addDepartment,
        deleteDepartment,
        updateAppSettings,
        exportBackupJson,
        restoreBackupJson,
        resetToFactory,
        loadSampleDemo,
        cloudSyncStatus,
        lastCloudSyncTime,
        syncWithCloud
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

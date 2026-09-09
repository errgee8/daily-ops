/**
 * Types & Domain Models for HANDOVER.
 * by Ryan Gerrit
 * Professional Venue Operational Handover & Task Management System
 */

export type UserRole = 'MANAGER' | 'ASSISTANT_MANAGER' | 'STAFF';

export interface UserProfile {
  id: string;
  role: UserRole;
  name: string;
  photo?: string;
  company?: string; // e.g. "luckycat", "JPE KTV"
  division?: string; // e.g. "Floor", "Bar", "Kitchen", "KTV Rooms", etc.
  venueId?: string;
  /** Access is enforced by the server token; empty arrays mean no access. */
  assignedVenueIds?: string[];
  assignedAreaIds?: string[];
  hasAllVenueAccess?: boolean;
  pinHash?: string; // SHA-256 hash of PIN
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type InspectionStatusType = 'GOOD' | 'NOT_OK' | 'NA';
export type OverallItemStatus = 'READY' | 'NOT_READY' | 'NA';

export type IssueStatus = 
  | 'NOT_READY'              // 🔴 Initial discovery
  | 'IN_PROCESS'             // 🟡 Assistant Manager working on it
  | 'WAITING_VERIFICATION'   // 🔵 Assistant Manager resolved, awaiting Manager
  | 'VERIFIED';              // ✅ Manager confirmed fixed

export interface VenueDefinition {
  id: string;
  name: string; // e.g. "LUCKY CAT", "JPE KTV", "GROUND LOBBY"
  code?: string; // e.g. "LC", "JPE", "GL"
  icon?: string;
  description?: string;
  address?: string;
  isActive: boolean;
  order: number;
}

export interface PredefinedReason {
  id: string;
  label: string;
  departmentId?: string; // suggested default department
}

export interface CriterionTemplate {
  id: string;
  name: string;
  defaultDepartmentId?: string;
  predefinedReasons: string[]; // List of common reasons
}

export interface ItemTemplate {
  id: string;
  name: string; // e.g. "Room 301", "Table 01", "Bar Counter"
  areaId: string;
  venueId?: string;
  venueName?: string;
  company?: string;
  order: number;
  criteria: CriterionTemplate[];
}

export interface AreaTemplate {
  id: string;
  name: string; // e.g. "KTV", "BILLIARD", "BAR", "KITCHEN", "PUBLIC AREA"
  venueId?: string;
  venueName?: string;
  icon?: string;
  order: number;
  items: ItemTemplate[];
}

export interface BlueprintTemplate {
  id: string;
  name: string; // e.g. "Standard KTV Room", "VIP KTV Room", "Pool Table", "VIP Pool Room", "Public Toilet", "Bar Counter"
  category?: string;
  defaultNamePrefix?: string;
  description?: string;
  venueCompatibility: string[]; // ['venue-lucky-cat', 'venue-jpe-ktv'] or ['ALL']
  defaultDepartmentId?: string;
  criteria: CriterionTemplate[];
  defaultPriority?: TaskPriority;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Department {
  id: string;
  name: string; // e.g. "Housekeeping", "Engineering", "Kitchen"
  color?: string;
}

export interface IssueAuditLog {
  id: string;
  timestamp: string; // ISO string
  action: 'CREATED' | 'STATUS_CHANGED' | 'DEPARTMENT_CHANGED' | 'NOTE_ADDED' | 'PHOTO_ADDED' | 'PHOTO_REMOVED' | 'REOPENED' | 'VERIFIED';
  previousStatus?: IssueStatus;
  newStatus?: IssueStatus;
  performedByRole: UserRole;
  performedByName: string;
  notes?: string;
  departmentName?: string;
}

export interface OperationalIssue {
  id: string;
  inspectionDate: string; // YYYY-MM-DD
  inspectionId: string;
  venueId?: string;
  venueName?: string;
  areaId: string;
  areaName: string;
  itemId: string;
  itemName: string;
  criterionId: string;
  criterionName: string;
  specificProblems: string[]; // e.g. ["Dirty", "No tissue"]
  customNote?: string;
  photoUrl?: string; // legacy single photo (base64 or blob URL)
  photos?: string[]; // multiple defect photos
  resolutionPhotoUrl?: string; // legacy single resolution photo
  resolutionPhotos?: string[]; // multiple resolution proof photos
  discoveredAt: string; // ISO string
  discoveredByRole: UserRole;
  discoveredByName: string;
  originalInspectionStatus: 'NOT_OK';
  departmentId: string;
  departmentName: string;
  currentStatus: IssueStatus;
  statusUpdatedAt: string;
  resolutionInfo?: {
    resolvedAt: string;
    resolvedByName: string;
    notes?: string;
  };
  verificationInfo?: {
    verifiedAt: string;
    verifiedByName: string;
    verifiedByRole: 'MANAGER';
    notes?: string;
  };
  reopenCount: number;
  auditTrail: IssueAuditLog[];
}

export interface CriterionResult {
  criterionId: string;
  criterionName: string;
  status: InspectionStatusType; // GOOD | NOT_OK | NA
  selectedReasons: string[];
  customReason?: string;
  photoUrl?: string; // legacy single photo
  photos?: string[]; // multiple defect photos
  issueId?: string; // Associated issue ID if NOT_OK
}

export interface InspectionItemResult {
  itemId: string;
  itemName: string;
  areaId: string;
  areaName: string;
  venueId?: string;
  venueName?: string;
  overallStatus: OverallItemStatus; // READY | NOT_READY | NA
  criterionResults: CriterionResult[];
  inspectedAt?: string;
  inspectedByName?: string;
  notes?: string;
}

export interface DailyInspection {
  id: string; // e.g. "INSP-2026-08-28"
  date: string; // YYYY-MM-DD
  venueId?: string; // If inspection is venue-specific or multi-venue
  startedAt: string; // ISO string
  startedByName: string;
  startedByRole: UserRole;
  completedAt?: string;
  completedByName?: string;
  isCompleted: boolean;
  handedOverAt?: string;
  handedOverByName?: string;
  isHandedOver: boolean;
  totalItems: number;
  readyItems: number;
  notReadyItems: number;
  naItems: number;
  totalIssuesCount: number;
  itemResults: Record<string, InspectionItemResult>; // keyed by itemId
  notes?: string;
}

export interface VenueTemplate {
  venues?: VenueDefinition[];
  blueprints?: BlueprintTemplate[];
  areas: AreaTemplate[];
  departments: Department[];
  lastModified: string;
  version: number;
}

export interface ReminderSettings {
  enabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  dueSoonMinutes: number; // e.g. 15 or 30 mins before
  overdueIntervalMinutes: number; // e.g. 30 mins interval
  maxRemindersPerTask: number; // e.g. 3
}

export interface ShiftNote {
  id: string;
  date: string; // YYYY-MM-DD
  venueId?: string;
  venueName?: string;
  areaId?: string;
  areaName?: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  content: string;
  category?: 'GENERAL' | 'MAINTENANCE' | 'HANDOVER' | 'URGENT';
  status: 'OPEN' | 'IN_PROGRESS' | 'DONE';
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  completedAt?: string;
  completedByName?: string;
}

export interface AppSettings {
  venueName: string;
  venues?: VenueDefinition[];
  autoLockMinutes: number; // e.g. 5
  soundFeedback: boolean;
  enableFastQuickGood: boolean;
  tabletMode: 'AUTO' | 'LANDSCAPE_LOCKED';
  isFirstTimeSetupDone: boolean;
  lastBackupDate?: string;
  reminderSettings?: ReminderSettings;
  attendanceWifiByVenue?: Record<string, string[]>;
}

export type TaskPriority = 'LOW' | 'NORMAL' | 'IMPORTANT' | 'HIGH' | 'URGENT';
export type TaskStatus = 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'DONE' | 'COMPLETED' | 'NOT_DONE' | 'SKIPPED' | 'OVERDUE' | 'CANCELLED';

export interface TaskAuditLog {
  id: string;
  timestamp: string; // ISO string
  action: 'CREATED' | 'EDITED' | 'STARTED' | 'MARKED_DONE' | 'MARKED_NOT_DONE' | 'STATUS_CHANGED' | 'COMPLETED' | 'SKIPPED' | 'DELETED';
  performedByUserId: string;
  performedByName: string;
  performedByRole: UserRole;
  notes?: string;
  details?: string;
}

export interface DailyTask {
  id: string;
  date: string; // YYYY-MM-DD
  venueId?: string;
  venueName?: string;
  areaId?: string;
  areaName?: string;
  title: string;
  notes?: string; // Manager's optional instructions / context
  instructions?: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueTime?: string; // e.g. "22:00"
  assignedToUserId?: string;
  assignedToName?: string;
  createdByUserId: string;
  createdByName: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  startedAt?: string; // ISO string
  startedByUserId?: string;
  startedByName?: string;
  completedAt?: string; // ISO string
  completedByUserId?: string;
  completedByName?: string;
  completionReason?: string; // Quick reason for NOT_DONE or SKIPPED
  completionNote?: string;
  completionPhotoUrl?: string;
  skipReason?: string;
  history?: TaskAuditLog[];
}

export interface StaffAccount {
  id: string;
  name: string;
  photo?: string;
  company: string; // e.g. "Lucky Cat", "JPE KTV"
  division: string; // e.g. "Floor", "Bar", "Kitchen", "Cleaning", "Reception", "Cashier", "Security", "Other"
  role: UserRole;
  status: 'ACTIVE' | 'INACTIVE';
  venueId: string;
  venueName?: string;
  createdAt: string;
  updatedAt: string;
  hasPin?: boolean;
}

export interface AccountabilityPoint {
  id: string;
  staffId: string;
  staffName: string;
  venueId: string;
  amount: number; // positive number (e.g. 3)
  actionType: 'ADD' | 'REMOVE';
  reason: string; // STRICTLY MANDATORY
  managerId: string;
  managerName: string;
  relatedTaskId?: string;
  relatedTaskName?: string;
  accountabilityMonth: string; // e.g. "2026-09"
  createdAt: string; // ISO string
}

export interface StaffCall {
  id: string;
  staffId: string;
  staffName: string;
  venueId: string;
  managerId: string;
  managerName: string;
  message: string;
  status: 'SENT' | 'DELIVERED' | 'ACKNOWLEDGED';
  sentAt: string;
  deliveredAt?: string;
  acknowledgedAt?: string;
}

export type AttendanceType = 'CHECK_IN' | 'CHECK_OUT';
export type AttendanceSyncStatus = 'PENDING_CLOUD' | 'VERIFIED_CLOUD' | 'REJECTED';

export interface AttendanceRecord {
  id: string;
  type: AttendanceType;
  staffUserId: string;
  staffName: string;
  staffRole: UserRole;
  venueId: string;
  venueName: string;
  areaIds: string[];
  checklistInspectionId: string;
  checklistCompletedAt: string;
  capturedAt: string;
  serverReceivedAt?: string;
  wifiSsid?: string;
  wifiVerified: boolean;
  deviceId: string;
  selfieUrl: string;
  syncStatus: AttendanceSyncStatus;
  rejectionReason?: string;
}

export interface DatabaseBackup {
  app: string;
  version: number;
  exportedAt: string;
  settings: AppSettings;
  users: UserProfile[];
  template: VenueTemplate;
  inspections: DailyInspection[];
  issues: OperationalIssue[];
  tasks?: DailyTask[];
  notes?: ShiftNote[];
}

import { supabase } from './supabase';
import type {
  AppSettings,
  VenueTemplate,
  DailyInspection,
  OperationalIssue,
  DailyTask,
  ShiftNote,
  UserProfile,
} from '../types';

export interface CloudSyncResult {
  success: boolean;
  error?: string;
}

export async function syncTest(): Promise<CloudSyncResult> {
  if (!supabase) {
    return {
      success: false,
      error: 'Supabase is not configured.',
    };
  }

  try {
    const { error } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Upload the current local HNDVR dataset to the cloud.
 *
 * This is intentionally a controlled sync operation.
 * Local IndexedDB remains untouched.
 */
export async function pushLocalDataToCloud(data: {
  settings: AppSettings;
  users: UserProfile[];
  template: VenueTemplate;
  inspections: DailyInspection[];
  issues: OperationalIssue[];
  tasks: DailyTask[];
  notes: ShiftNote[];
}): Promise<CloudSyncResult> {
  if (!supabase) {
    return {
      success: false,
      error: 'Supabase is not configured.',
    };
  }

  try {
    console.log('HNDVR cloud sync started');

    /*
     * Cloud synchronization will be performed by dataset.
     *
     * IMPORTANT:
     * We are not deleting cloud records here.
     * We are not modifying IndexedDB.
     * We are not replacing local data.
     *
     * The next stage adds the individual table upserts.
     */

    console.log('Local dataset ready for cloud sync:', {
      users: data.users.length,
      inspections: data.inspections.length,
      issues: data.issues.length,
      tasks: data.tasks.length,
      notes: data.notes.length,
      areas: data.template.areas.length,
    });

    return {
      success: true,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Cloud sync failed.',
    };
  }
}

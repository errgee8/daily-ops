import { OperationalIssue, DailyTask, ReminderSettings } from '../types';
import { soundSynth } from './audio';

export interface ActionableReminder {
  id: string;
  sourceType: 'ISSUE' | 'TASK' | 'INSPECTION';
  venueId?: string;
  venueName?: string;
  title: string;
  subtitle: string;
  areaOrCategory?: string;
  priority: 'NORMAL' | 'HIGH' | 'URGENT';
  status: 'DUE_SOON' | 'OVERDUE';
  dueTimeText?: string;
  rawTimestamp: number;
}

// In-memory cooldown tracker to prevent notification spam
const reminderHistory: Record<string, { lastNotifiedAt: number; count: number }> = {};

export function clearReminderForId(id: string) {
  delete reminderHistory[id];
}

export function evaluateOperationalReminders(
  issues: OperationalIssue[],
  tasks: DailyTask[],
  settings?: ReminderSettings
): {
  reminders: ActionableReminder[];
  overdueCount: number;
  dueSoonCount: number;
} {
  const config = settings || {
    enabled: true,
    soundEnabled: true,
    vibrationEnabled: true,
    dueSoonMinutes: 15,
    overdueIntervalMinutes: 30,
    maxRemindersPerTask: 3,
  };

  const now = Date.now();
  const results: ActionableReminder[] = [];

  // 1. Process Actionable Issues (ONLY NOT_READY and IN_PROCESS)
  // (WAITING_VERIFICATION and VERIFIED are strictly skipped and cleared!)
  issues.forEach(issue => {
    if (issue.currentStatus === 'WAITING_VERIFICATION' || issue.currentStatus === 'VERIFIED') {
      clearReminderForId(issue.id);
      return;
    }

    const discoveredTime = new Date(issue.discoveredAt).getTime();
    const ageMinutes = (now - discoveredTime) / (1000 * 60);

    const venuePrefix = issue.venueName ? `${issue.venueName} • ` : (issue.areaName ? `${issue.areaName} • ` : '');
    const locationDesc = issue.areaName && issue.areaName !== issue.venueName ? `${issue.areaName} / ${issue.itemName}` : issue.itemName;
    const problemDesc = issue.specificProblems.join(', ') || 'Unresolved Issue';

    // If an issue was reported and has been unaddressed for more than 45 minutes -> OVERDUE
    // If between 20 and 45 minutes -> DUE SOON
    if (ageMinutes > 45) {
      results.push({
        id: issue.id,
        sourceType: 'ISSUE',
        venueId: issue.venueId,
        venueName: issue.venueName || issue.areaName,
        title: `${venuePrefix}${locationDesc}`,
        subtitle: `${problemDesc} — Assigned: ${issue.departmentName}`,
        areaOrCategory: issue.areaName,
        priority: ageMinutes > 90 ? 'URGENT' : 'HIGH',
        status: 'OVERDUE',
        dueTimeText: `${Math.round(ageMinutes)}m open`,
        rawTimestamp: discoveredTime,
      });
    } else if (ageMinutes >= 20) {
      results.push({
        id: issue.id,
        sourceType: 'ISSUE',
        venueId: issue.venueId,
        venueName: issue.venueName || issue.areaName,
        title: `${venuePrefix}${locationDesc}`,
        subtitle: `${problemDesc} — Assigned: ${issue.departmentName}`,
        areaOrCategory: issue.areaName,
        priority: 'NORMAL',
        status: 'DUE_SOON',
        dueTimeText: `${Math.round(ageMinutes)}m open`,
        rawTimestamp: discoveredTime,
      });
    }
  });

  // 2. Process Daily Tasks (ONLY PENDING and IN_PROGRESS)
  // (DONE and NOT_DONE are strictly cleared!)
  tasks.forEach(task => {
    if (task.status === 'DONE' || task.status === 'NOT_DONE') {
      clearReminderForId(task.id);
      return;
    }

    const createdTime = new Date(task.createdAt).getTime();
    const ageMinutes = (now - createdTime) / (1000 * 60);

    const isHighPriority = task.priority === 'URGENT' || task.priority === 'HIGH';
    const overdueThreshold = isHighPriority ? 30 : 60;
    const dueSoonThreshold = isHighPriority ? 15 : 30;

    const venuePrefix = task.venueName ? `${task.venueName} • ` : (task.areaName ? `${task.areaName} • ` : '');

    if (ageMinutes > overdueThreshold) {
      results.push({
        id: task.id,
        sourceType: 'TASK',
        venueId: task.venueId,
        venueName: task.venueName,
        title: `${venuePrefix}${task.title}`,
        subtitle: `Priority: ${task.priority}${task.notes ? ` • ${task.notes}` : ''}`,
        priority: isHighPriority ? 'URGENT' : 'NORMAL',
        status: 'OVERDUE',
        dueTimeText: `${Math.round(ageMinutes)}m pending`,
        rawTimestamp: createdTime,
      });
    } else if (ageMinutes >= dueSoonThreshold) {
      results.push({
        id: task.id,
        sourceType: 'TASK',
        venueId: task.venueId,
        venueName: task.venueName,
        title: `${venuePrefix}${task.title}`,
        subtitle: `Priority: ${task.priority}${task.notes ? ` • ${task.notes}` : ''}`,
        priority: isHighPriority ? 'HIGH' : 'NORMAL',
        status: 'DUE_SOON',
        dueTimeText: `${Math.round(ageMinutes)}m pending`,
        rawTimestamp: createdTime,
      });
    }
  });

  // Sort reminders: OVERDUE first, then by priority (URGENT -> HIGH -> NORMAL), then oldest
  results.sort((a, b) => {
    if (a.status === 'OVERDUE' && b.status !== 'OVERDUE') return -1;
    if (a.status !== 'OVERDUE' && b.status === 'OVERDUE') return 1;

    const pWeight = { URGENT: 3, HIGH: 2, NORMAL: 1 };
    const pDiff = pWeight[b.priority] - pWeight[a.priority];
    if (pDiff !== 0) return pDiff;

    return a.rawTimestamp - b.rawTimestamp;
  });

  const overdueCount = results.filter(r => r.status === 'OVERDUE').length;
  const dueSoonCount = results.filter(r => r.status === 'DUE_SOON').length;

  return {
    reminders: results,
    overdueCount,
    dueSoonCount,
  };
}

/**
 * Checks if sound/vibration/notification should fire based on anti-spam cooldown rules
 */
export function triggerReminderFeedback(
  topReminder: ActionableReminder,
  settings?: ReminderSettings
) {
  const config = settings || {
    enabled: true,
    soundEnabled: true,
    vibrationEnabled: true,
    dueSoonMinutes: 15,
    overdueIntervalMinutes: 30,
    maxRemindersPerTask: 3,
  };

  if (!config.enabled) return;

  const now = Date.now();
  const hist = reminderHistory[topReminder.id] || { lastNotifiedAt: 0, count: 0 };
  const minIntervalMs = (config.overdueIntervalMinutes || 30) * 60 * 1000;

  // Anti-spam check: has enough time passed since last alert and under max frequency?
  if (now - hist.lastNotifiedAt < minIntervalMs) {
    return;
  }
  if (hist.count >= (config.maxRemindersPerTask || 3)) {
    return;
  }

  // Update history
  reminderHistory[topReminder.id] = {
    lastNotifiedAt: now,
    count: hist.count + 1,
  };

  // Play Sound & Vibration
  if (config.soundEnabled) {
    if (topReminder.status === 'OVERDUE') {
      soundSynth.playOverdueAlert();
    } else {
      soundSynth.playDueSoonChime();
    }
  }

  if (config.vibrationEnabled) {
    if (topReminder.status === 'OVERDUE') {
      soundSynth.vibrate([200, 100, 200, 100, 300]);
    } else {
      soundSynth.vibrate([150, 100, 150]);
    }
  }

  // Local Offline Browser Notification (if permission was granted by user)
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(`HANDOVER. — ${topReminder.status === 'OVERDUE' ? '⚠️ Task Overdue' : '⏰ Due Soon'}`, {
        body: `${topReminder.title}\n${topReminder.subtitle}`,
        icon: '/icons/icon-192.png',
        tag: `reminder-${topReminder.id}`,
      });
    } catch {}
  }
}

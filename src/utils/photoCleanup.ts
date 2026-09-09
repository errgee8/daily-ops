import { OperationalIssue, DailyInspection } from '../types';
import { getDb } from '../db/indexedDb';

export const VERIFIED_RETENTION_MS = 3 * 24 * 60 * 60 * 1000; // 3 full days (259,200,000 ms)
export const UNVERIFIED_RETENTION_MS = 7 * 24 * 60 * 60 * 1000; // 7 full days (604,800,000 ms)

export interface PhotoCleanupSummary {
  cleanedIssuesCount: number;
  cleanedPhotosCount: number;
  cleanedInspectionPhotosCount: number;
  cleanedBlobsCount: number;
}

/**
 * Evaluates whether an issue's photos have exceeded their retention period.
 * 
 * RULE 1 (VERIFIED / RESOLVED):
 * Retention starts from verifiedAt (or resolvedAt).
 * Expires after 3 full days.
 * 
 * RULE 2 (UNVERIFIED / UNRESOLVED):
 * Retention starts from discoveredAt (creation timestamp).
 * Expires after 7 full days.
 * 
 * STATUS TRANSITION RULE:
 * If an issue was created days ago and verified later, the 3-day timer starts from verifiedAt.
 */
export function isIssuePhotoExpired(issue: OperationalIssue, nowMs: number = Date.now()): boolean {
  const hasDefectPhotos = (Array.isArray(issue.photos) && issue.photos.length > 0) || Boolean(issue.photoUrl);
  const hasResolutionPhotos = (Array.isArray(issue.resolutionPhotos) && issue.resolutionPhotos.length > 0) || Boolean(issue.resolutionPhotoUrl);
  
  if (!hasDefectPhotos && !hasResolutionPhotos) {
    return false;
  }

  const isVerified = issue.currentStatus === 'VERIFIED' || Boolean(issue.verificationInfo?.verifiedAt);
  const isResolved = issue.currentStatus === 'WAITING_VERIFICATION' || Boolean(issue.resolutionInfo?.resolvedAt);

  // Rule 1: Verified issue - starts from verifiedAt
  if (isVerified && issue.verificationInfo?.verifiedAt) {
    const verifiedTime = Date.parse(issue.verificationInfo.verifiedAt);
    if (!isNaN(verifiedTime)) {
      return (nowMs - verifiedTime) >= VERIFIED_RETENTION_MS;
    }
  }

  // Rule 1: Resolved issue (Waiting Verification) - starts from resolvedAt
  if (isResolved && issue.resolutionInfo?.resolvedAt) {
    const resolvedTime = Date.parse(issue.resolutionInfo.resolvedAt);
    if (!isNaN(resolvedTime)) {
      return (nowMs - resolvedTime) >= VERIFIED_RETENTION_MS;
    }
  }

  // Fallback if status is VERIFIED but verificationInfo object was omitted
  if (isVerified) {
    const time = Date.parse(issue.statusUpdatedAt || issue.discoveredAt);
    if (!isNaN(time)) {
      return (nowMs - time) >= VERIFIED_RETENTION_MS;
    }
  }

  // Rule 2: Unverified / Unresolved issue - starts from discoveredAt
  const creationTime = Date.parse(issue.discoveredAt || issue.inspectionDate);
  if (!isNaN(creationTime)) {
    return (nowMs - creationTime) >= UNVERIFIED_RETENTION_MS;
  }

  return false;
}

/**
 * Runs cleanup on issues and inspections arrays in-memory.
 * Returns sanitized copies and list of removed photo data strings.
 */
export function cleanExpiredPhotosInMemory(
  issues: OperationalIssue[],
  inspections: DailyInspection[],
  nowMs: number = Date.now()
): {
  updatedIssues: OperationalIssue[];
  updatedInspections: DailyInspection[];
  removedPhotoUrls: string[];
  summary: PhotoCleanupSummary;
  hasChanges: boolean;
} {
  let cleanedIssuesCount = 0;
  let cleanedPhotosCount = 0;
  let cleanedInspectionPhotosCount = 0;
  const removedPhotoUrlsSet = new Set<string>();

  // Map to track which issue's criterion/item photos are expired
  const expiredIssueKeys = new Set<string>(); // `${inspectionDate}_${itemId}_${criterionId}`

  const updatedIssues = issues.map(issue => {
    if (!isIssuePhotoExpired(issue, nowMs)) {
      return issue;
    }

    const defectPhotos = Array.isArray(issue.photos) && issue.photos.length > 0
      ? issue.photos
      : (issue.photoUrl ? [issue.photoUrl] : []);
    const resPhotos = Array.isArray(issue.resolutionPhotos) && issue.resolutionPhotos.length > 0
      ? issue.resolutionPhotos
      : (issue.resolutionPhotoUrl ? [issue.resolutionPhotoUrl] : []);

    const totalPhotos = defectPhotos.length + resPhotos.length;
    if (totalPhotos === 0) {
      return issue;
    }

    defectPhotos.forEach(p => removedPhotoUrlsSet.add(p));
    resPhotos.forEach(p => removedPhotoUrlsSet.add(p));

    cleanedIssuesCount++;
    cleanedPhotosCount += totalPhotos;
    expiredIssueKeys.add(`${issue.inspectionDate}_${issue.itemId}_${issue.criterionId}`);
    if (issue.inspectionId) {
      expiredIssueKeys.add(`${issue.inspectionId}_${issue.itemId}_${issue.criterionId}`);
    }

    return {
      ...issue,
      photos: [],
      photoUrl: undefined,
      resolutionPhotos: [],
      resolutionPhotoUrl: undefined
    };
  });

  // Also clean corresponding photos in inspections
  const updatedInspections = inspections.map(inspection => {
    if (!inspection.itemResults) return inspection;

    let inspectionModified = false;
    const newItemResults = { ...inspection.itemResults };

    Object.keys(newItemResults).forEach(itemId => {
      const itemResult = newItemResults[itemId];
      if (!itemResult.criterionResults) return;

      const newCriterionResults = itemResult.criterionResults.map(crit => {
        const critPhotos = Array.isArray(crit.photos) && crit.photos.length > 0
          ? crit.photos
          : (crit.photoUrl ? [crit.photoUrl] : []);

        if (critPhotos.length === 0) return crit;

        const isExplicitlyExpired = 
          expiredIssueKeys.has(`${inspection.date}_${itemId}_${crit.criterionId}`) ||
          expiredIssueKeys.has(`${inspection.id}_${itemId}_${crit.criterionId}`) ||
          critPhotos.some(p => removedPhotoUrlsSet.has(p));

        if (isExplicitlyExpired) {
          critPhotos.forEach(p => removedPhotoUrlsSet.add(p));
          cleanedInspectionPhotosCount += critPhotos.length;
          inspectionModified = true;
          return {
            ...crit,
            photos: [],
            photoUrl: undefined
          };
        }

        return crit;
      });

      if (inspectionModified) {
        newItemResults[itemId] = {
          ...itemResult,
          criterionResults: newCriterionResults
        };
      }
    });

    return inspectionModified ? { ...inspection, itemResults: newItemResults } : inspection;
  });

  const hasChanges = cleanedIssuesCount > 0 || cleanedInspectionPhotosCount > 0;

  return {
    updatedIssues,
    updatedInspections,
    removedPhotoUrls: Array.from(removedPhotoUrlsSet),
    summary: {
      cleanedIssuesCount,
      cleanedPhotosCount,
      cleanedInspectionPhotosCount,
      cleanedBlobsCount: 0
    },
    hasChanges
  };
}

/**
 * Removes orphaned and expired photo blobs from IndexedDB 'photos' store and localStorage.
 */
export async function cleanOrphanedPhotoBlobs(
  activePhotoUrls: Set<string>,
  expiredPhotoUrls: string[] = []
): Promise<number> {
  let deletedCount = 0;
  const expiredSet = new Set(expiredPhotoUrls);

  try {
    const db = await getDb();
    if (db.objectStoreNames.contains('photos')) {
      const tx = db.transaction('photos', 'readwrite');
      const allRecords = await tx.store.getAll();
      
      for (const rec of allRecords) {
        // If the blob's data is expired or not in any active non-expired issue/inspection
        const isExpired = expiredSet.has(rec.data);
        const isNotReferenced = !activePhotoUrls.has(rec.data);

        if (isExpired || isNotReferenced) {
          await tx.store.delete(rec.id);
          deletedCount++;
        }
      }
      await tx.done;
    }
  } catch (err) {
    console.warn('Could not clean IndexedDB photo blobs', err);
  }

  // Also clean localStorage fallback keys
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('daily_ops_photo_')) {
        const val = localStorage.getItem(key);
        if (val) {
          if (expiredSet.has(val) || !activePhotoUrls.has(val)) {
            keysToRemove.push(key);
          }
        }
      }
    }
    keysToRemove.forEach(k => {
      localStorage.removeItem(k);
      deletedCount++;
    });
  } catch (err) {
    console.warn('Could not clean localStorage photo keys', err);
  }

  return deletedCount;
}

/**
 * Complete, safe, standalone photo cleanup executor.
 * Can be called on app startup, on foreground resume, or on interval.
 */
export async function executeAutoPhotoCleanup(
  currentIssues: OperationalIssue[],
  currentInspections: DailyInspection[],
  nowMs: number = Date.now()
): Promise<{
  issues: OperationalIssue[];
  inspections: DailyInspection[];
  summary: PhotoCleanupSummary;
  hasCleaned: boolean;
}> {
  const inMemoryResult = cleanExpiredPhotosInMemory(currentIssues, currentInspections, nowMs);

  // Collect all currently active (non-expired) photo data URLs
  const activePhotosSet = new Set<string>();
  inMemoryResult.updatedIssues.forEach(iss => {
    (iss.photos || []).forEach(p => activePhotosSet.add(p));
    if (iss.photoUrl) activePhotosSet.add(iss.photoUrl);
    (iss.resolutionPhotos || []).forEach(p => activePhotosSet.add(p));
    if (iss.resolutionPhotoUrl) activePhotosSet.add(iss.resolutionPhotoUrl);
  });

  inMemoryResult.updatedInspections.forEach(insp => {
    if (!insp.itemResults) return;
    Object.values(insp.itemResults).forEach(ir => {
      (ir.criterionResults || []).forEach(cr => {
        (cr.photos || []).forEach(p => activePhotosSet.add(p));
        if (cr.photoUrl) activePhotosSet.add(cr.photoUrl);
      });
    });
  });

  let blobsDeleted = 0;
  if (inMemoryResult.hasChanges || inMemoryResult.removedPhotoUrls.length > 0) {
    blobsDeleted = await cleanOrphanedPhotoBlobs(activePhotosSet, inMemoryResult.removedPhotoUrls);
  }

  const finalSummary: PhotoCleanupSummary = {
    ...inMemoryResult.summary,
    cleanedBlobsCount: blobsDeleted
  };

  if (inMemoryResult.hasChanges) {
    console.info(`[Auto-Photo Cleanup] Removed ${finalSummary.cleanedPhotosCount} expired photos across ${finalSummary.cleanedIssuesCount} issues (${blobsDeleted} storage blobs cleared).`);
  }

  return {
    issues: inMemoryResult.updatedIssues,
    inspections: inMemoryResult.updatedInspections,
    summary: finalSummary,
    hasCleaned: inMemoryResult.hasChanges
  };
}

import { supabase, isSupabaseConfigured, supabaseUrl } from './supabase';
import { getApiUrl, getAuthHeaders } from './apiConfig';

export const HNDVR_STORAGE_BUCKET = 'hndvr-photos';

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp'
];

export const MAX_PHOTO_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Standard path generator for daily inspection criterion photos.
 * Pattern: venues/{venueId}/inspections/{date}/{photoId}.jpg
 */
export function getInspectionPhotoStoragePath(
  venueId: string,
  date: string,
  photoId: string
): string {
  const sanitizedPhotoId = photoId.endsWith('.jpg') ? photoId : `${photoId}.jpg`;
  return `venues/${venueId}/inspections/${date}/${sanitizedPhotoId}`;
}

/**
 * Standard path generator for operational issue defect photos.
 * Pattern: venues/{venueId}/issues/{issueId}/defect_{photoId}.jpg
 */
export function getIssueDefectPhotoStoragePath(
  venueId: string,
  issueId: string,
  photoId: string
): string {
  const sanitizedPhotoId = photoId.endsWith('.jpg') ? photoId : `${photoId}.jpg`;
  return `venues/${venueId}/issues/${issueId}/defect_${sanitizedPhotoId}`;
}

/**
 * Standard path generator for operational issue resolution proof photos.
 * Pattern: venues/{venueId}/issues/{issueId}/resolution_{photoId}.jpg
 */
export function getIssueResolutionPhotoStoragePath(
  venueId: string,
  issueId: string,
  photoId: string
): string {
  const sanitizedPhotoId = photoId.endsWith('.jpg') ? photoId : `${photoId}.jpg`;
  return `venues/${venueId}/issues/${issueId}/resolution_${sanitizedPhotoId}`;
}

export interface StorageBucketCheckResult {
  configured: boolean;
  bucketExists: boolean;
  bucketName: string;
  error?: string;
}

/**
 * Lightweight check to verify if the storage client can access the Supabase storage bucket.
 * Checks server API status or falls back to client.
 */
export async function checkStorageBucketAccess(): Promise<StorageBucketCheckResult> {
  try {
    const res = await fetch(getApiUrl('/api/supabase/status'));
    if (res.ok) {
      const data = await res.json();
      return {
        configured: data.configured,
        bucketExists: data.connected,
        bucketName: HNDVR_STORAGE_BUCKET,
      };
    }
  } catch (e) {
    // Fall back to client check
  }

  if (!isSupabaseConfigured || !supabase) {
    return {
      configured: false,
      bucketExists: false,
      bucketName: HNDVR_STORAGE_BUCKET,
      error: 'Supabase is not configured in this environment.'
    };
  }

  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) {
      return {
        configured: true,
        bucketExists: false,
        bucketName: HNDVR_STORAGE_BUCKET,
        error: error.message
      };
    }

    const bucketFound = Boolean(buckets?.some(b => b.name === HNDVR_STORAGE_BUCKET || b.id === HNDVR_STORAGE_BUCKET));
    return {
      configured: true,
      bucketExists: bucketFound,
      bucketName: HNDVR_STORAGE_BUCKET
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Storage access error';
    return {
      configured: true,
      bucketExists: false,
      bucketName: HNDVR_STORAGE_BUCKET,
      error: message
    };
  }
}

/**
 * Helper to get the authenticated/signed URL for a given storage path in the private hndvr-photos bucket.
 */
export function getPhotoPublicUrl(storagePath: string): string | null {
  if (!storagePath) return null;
  if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
    return storagePath;
  }
  return getApiUrl(`/api/supabase/storage/photo?path=${encodeURIComponent(storagePath)}`);
}

/**
 * Uploads a base64 or Data URL photo to the Supabase hndvr-photos storage bucket.
 * Proxies through /api/supabase/storage/upload so secret keys are protected on the server.
 * Returns the short-lived signed URL of the uploaded photo, or null on error or when unconfigured.
 */
export async function uploadPhotoDataUrl(storagePath: string, dataUrl: string): Promise<string | null> {
  // If it's already an http/https URL, no upload needed
  if (dataUrl.startsWith('http://') || dataUrl.startsWith('https://')) {
    return dataUrl;
  }

  try {
    const res = await fetch(getApiUrl('/api/supabase/storage/upload'), {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ storagePath, dataUrl })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.signedUrl || data.url) {
        return data.signedUrl || data.url;
      }
    } else {
      const errText = await res.text();
      console.warn(`[Storage Upload] Server returned ${res.status}:`, errText);
    }
  } catch (err) {
    console.warn(`[Storage Upload] Server route failed:`, err);
  }

  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  try {
    // Convert DataURL to Blob
    const match = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    let blob: Blob;
    let contentType = 'image/jpeg';

    if (match) {
      contentType = match[1];
      const byteCharacters = atob(match[2]);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      blob = new Blob([byteArray], { type: contentType });
    } else {
      // Fallback fetch blob
      const res = await fetch(dataUrl);
      blob = await res.blob();
      contentType = blob.type || 'image/jpeg';
    }

    const { data, error } = await supabase.storage
      .from(HNDVR_STORAGE_BUCKET)
      .upload(storagePath, blob, {
        contentType,
        upsert: true,
      });

    if (error) {
      console.warn(`[SupabaseStorage] Photo upload failed for ${storagePath}:`, error.message);
      return null;
    }

    const { data: pubData } = supabase.storage
      .from(HNDVR_STORAGE_BUCKET)
      .getPublicUrl(data.path);

    return pubData.publicUrl || null;
  } catch (err) {
    console.warn(`[SupabaseStorage] Exception uploading photo to ${storagePath}:`, err);
    return null;
  }
}


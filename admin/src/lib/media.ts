import { apiClient } from '@/lib/api-client';

/**
 * Upload a media file through the API (multipart). The server writes the
 * object to R2 itself, so the browser never talks to the R2 S3 endpoint
 * directly — that endpoint's TLS is unreachable from some networks/ISPs.
 * Returns the public CDN URL of the uploaded object.
 */
export async function uploadMediaFile(file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const res = await apiClient.postForm<{ public_url: string; key: string }>('/media/upload', form);
  return res.public_url;
}

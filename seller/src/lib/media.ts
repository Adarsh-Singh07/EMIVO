import { apiClient } from './api-client';

/**
 * Upload a media file through the server-proxied endpoint to Cloudflare R2.
 * Supports images (.png, .jpg, .webp, etc.) and invoices (.pdf).
 */
export async function uploadMediaFile(file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const res = await apiClient.postForm<{ public_url: string; key: string }>('/media/upload', form);
  return res.public_url;
}

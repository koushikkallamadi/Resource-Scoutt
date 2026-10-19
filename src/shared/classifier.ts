// src/shared/classifier.ts
import { ResourceType } from './types';

/**
 * Accurately determines the ResourceType for any resource by analyzing
 * its URL, MIME type, download attribute, and type attribute.
 */
export function detectResourceType(
  rawUrl: string,
  mimeType?: string,
  downloadAttr?: string,
  typeAttr?: string
): ResourceType {
  const url = (rawUrl || '').trim();
  const cleanMime = (mimeType || '').split(';')[0].trim().toLowerCase();
  const cleanTypeAttr = (typeAttr || '').trim().toLowerCase();

  // 1. Check explicit MIME types
  if (cleanMime === 'application/pdf' || cleanTypeAttr === 'application/pdf') {
    return 'pdf';
  }
  if (cleanMime.startsWith('video/') || cleanMime.startsWith('audio/') ||
      cleanTypeAttr.startsWith('video/') || cleanTypeAttr.startsWith('audio/')) {
    return 'media';
  }
  if (cleanMime.startsWith('image/') || cleanTypeAttr.startsWith('image/')) {
    return 'image';
  }
  if (cleanMime.startsWith('font/')) {
    return 'font';
  }
  if (
    cleanMime.includes('application/x-mpegurl') ||
    cleanMime.includes('application/vnd.apple.mpegurl') ||
    cleanMime.includes('application/vnd.apple.mpegurl')
  ) {
    return 'media';
  }

  // 2. Check data: URLs
  if (url.startsWith('data:')) {
    const dataMatch = url.match(/^data:([^;,]+)/i);
    if (dataMatch) {
      const dataMime = dataMatch[1].toLowerCase();
      if (dataMime === 'application/pdf') return 'pdf';
      if (dataMime.startsWith('video/') || dataMime.startsWith('audio/')) return 'media';
      if (dataMime.startsWith('image/')) return 'image';
      if (dataMime.startsWith('font/')) return 'font';
    }
  }

  // 3. Inspect file extensions from URL path or download attribute
  const targetForExt = (downloadAttr || url).split(/[?#]/)[0].toLowerCase();
  const ext = targetForExt.split('.').pop() || '';

  const mediaExts = ['mp4', 'webm', 'mkv', 'mov', 'avi', 'm4v', 'ogv', 'ogg', 'mp3', 'wav', 'flac', 'aac', 'm3u8', 'ts'];
  const imageExts = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'avif', 'bmp', 'ico'];
  const docExts = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'csv', 'rtf', 'txt', 'zip', 'rar', 'tar', 'gz', '7z'];
  const fontExts = ['woff', 'woff2', 'ttf', 'otf', 'eot'];

  // Check media first to prevent any video with "pdf" in path/query from being misidentified
  if (mediaExts.includes(ext)) {
    return 'media';
  }

  if (ext === 'pdf') {
    return 'pdf';
  }

  if (imageExts.includes(ext)) {
    return 'image';
  }

  if (docExts.includes(ext)) {
    return 'document';
  }

  if (fontExts.includes(ext)) {
    return 'font';
  }

  // 4. Check pathname in case query string was complex
  try {
    const parsed = new URL(url, 'http://dummy.base');
    const pathPart = parsed.pathname.toLowerCase();
    const pathExt = pathPart.split('.').pop() || '';

    if (mediaExts.includes(pathExt)) return 'media';
    if (pathExt === 'pdf') return 'pdf';
    if (imageExts.includes(pathExt)) return 'image';
    if (docExts.includes(pathExt)) return 'document';
    if (fontExts.includes(pathExt)) return 'font';
  } catch {
    // ignore
  }

  return 'other';
}

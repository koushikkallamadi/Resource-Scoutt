import JSZip from 'jszip';

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.target !== 'offscreen') return;

  if (message.type === 'CREATE_ZIP') {
    handleCreateZip(message.payload)
      .then((dataUrl) => sendResponse({ success: true, dataUrl }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // async response
  }

  if (message.type === 'DOWNLOAD_HLS_SEGMENTS') {
    handleHlsSegments(message.payload)
      .then((dataUrl) => sendResponse({ success: true, dataUrl }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // async response
  }
});

interface ZipItem {
  filename: string;
  dataUrl?: string;
  url?: string;
}

/* Helper to map file extensions to folder names */
function getFolder(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const pdfExt = ['pdf'];
  const imageExt = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp'];
  const videoExt = ['mp4', 'webm', 'ogg', 'mp3', 'wav', 'aac', 'flac', 'mkv', 'avi'];
  if (pdfExt.includes(ext)) return 'pdfs';
  if (imageExt.includes(ext)) return 'images';
  if (videoExt.includes(ext)) return 'videos';
  return 'others';
}

async function handleCreateZip(payload: { items: ZipItem[]; zipName: string }): Promise<string> {
  const zip = new JSZip();

  for (let i = 0; i < payload.items.length; i++) {
    const item = payload.items[i];
    const folder = getFolder(item.filename);
    const zipPath = `${folder}/${item.filename}`;
    try {
      if (item.dataUrl) {
        const base64Data = item.dataUrl.split(',')[1];
        zip.file(zipPath, base64Data, { base64: true });
      } else if (item.url) {
        const resp = await fetch(item.url);
        const blob = await resp.blob();
        zip.file(zipPath, blob);
      }
    } catch (err) {
      console.warn(`Failed to add ${item.filename} to zip:`, err);
    }

    // Post progress message back to extension runtime
    chrome.runtime.sendMessage({
      type: 'ZIP_PROGRESS',
      payload: {
        current: i + 1,
        total: payload.items.length,
        filename: item.filename,
      },
    }).catch(() => {});
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}


/**
 * Downloads all HLS TS segment URLs, concatenates them in order, and returns
 * the combined binary as a data URL (video/mp2t).
 * Uses a concurrency pool of 5 parallel fetches for speed.
 */
async function handleHlsSegments(payload: {
  segmentUrls: string[];
  filename: string;
  referer?: string;
  origin?: string;
}): Promise<string> {
  const { segmentUrls, filename, referer, origin } = payload;
  const total = segmentUrls.length;
  const CONCURRENCY = 5;

  // Build fetch headers using the page's Referer/Origin so the server
  // accepts our requests (same as what the original video player sent).
  const segmentHeaders: HeadersInit = {};
  if (referer) segmentHeaders['Referer'] = referer;
  if (origin) segmentHeaders['Origin'] = origin;

  // Pre-allocate result array to maintain segment ordering
  const chunks: ArrayBuffer[] = new Array(total);
  let completed = 0;

  // Pool-based parallel download
  async function downloadSegment(index: number): Promise<void> {
    const url = segmentUrls[index];
    try {
      const resp = await fetch(url, { headers: segmentHeaders });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      chunks[index] = await resp.arrayBuffer();
    } catch (err) {
      console.warn(`[HLS] Segment ${index + 1}/${total} failed (${url}):`, err);
      chunks[index] = new ArrayBuffer(0); // empty placeholder so order is preserved
    }
    completed++;
    chrome.runtime.sendMessage({
      type: 'HLS_PROGRESS',
      payload: { current: completed, total, filename },
    }).catch(() => {});
  }

  // Run downloads in sliding-window concurrency pool
  const queue = Array.from({ length: total }, (_, i) => i);
  const pool: Promise<void>[] = [];

  for (let i = 0; i < Math.min(CONCURRENCY, total); i++) {
    const idx = queue.shift()!;
    pool.push(downloadSegment(idx));
  }

  while (queue.length > 0) {
    await Promise.race(pool);
    // Remove settled promises and fill slot
    const nextIdx = queue.shift()!;
    pool.push(downloadSegment(nextIdx));
  }

  await Promise.all(pool);

  // Concatenate all ArrayBuffers into one
  const totalBytes = chunks.reduce((sum, buf) => sum + buf.byteLength, 0);
  const combined = new Uint8Array(totalBytes);
  let offset = 0;
  for (const buf of chunks) {
    combined.set(new Uint8Array(buf), offset);
    offset += buf.byteLength;
  }

  // Return as data URL
  const resultBlob = new Blob([combined], { type: 'video/mp2t' });
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(resultBlob);
  });
}


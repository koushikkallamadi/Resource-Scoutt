import { DiscoveredResource } from '../shared/types';
import { parseFilenameTemplate } from '../shared/utils';

export async function downloadSingleResource(resource: DiscoveredResource, customFilename?: string): Promise<boolean> {
  // Route HLS streams to the dedicated HLS downloader
  if (resource.isHls) {
    return downloadHlsResource(resource, customFilename);
  }

  return new Promise((resolve) => {
    let filename = customFilename;
    if (!filename) {
      const ext = getExtensionFromUrl(resource.url, resource.mimeType || '', resource.type);
      filename = parseFilenameTemplate('{title}_{index}.{ext}', resource.title || resource.type, resource.type, 0, ext);
    }

    chrome.downloads.download(
      {
        url: resource.dataUrl || resource.url,
        filename,
        saveAs: false,
      },
      (downloadId) => {
        if (chrome.runtime.lastError || !downloadId) {
          console.error('Download error:', chrome.runtime.lastError);
          resolve(false);
        } else {
          resolve(true);
        }
      }
    );
  });
}

/**
 * Downloads an HLS (.m3u8) stream.
 * Strategy:
 *   1. Fetch the playlist and look for a direct MP4 URI in a master playlist.
 *   2. If not found, fall back to fetching all TS segment chunks, concat them,
 *      and trigger a download of the combined binary as .ts (playable in VLC / most players).
 */
async function downloadHlsResource(resource: DiscoveredResource, customFilename?: string): Promise<boolean> {
  try {
    // Build request headers. Many streaming servers require a matching Referer
    // and Origin to serve m3u8 playlists and TS segments. We use the page URL
    // that originally triggered this network request (captured by networkLogger).
    const referer = resource.pageUrl || resource.url;
    const origin = referer ? new URL(referer).origin : '';
    const fetchHeaders: HeadersInit = {
      'Referer': referer,
      ...(origin ? { 'Origin': origin } : {}),
    };

    const m3u8Text = await fetch(resource.url, { headers: fetchHeaders }).then((r) => r.text());

    // --- Strategy 1: Master playlist may reference direct MP4 URI ---
    const directMp4 = extractDirectMp4FromMaster(m3u8Text, resource.url);
    if (directMp4) {
      const filename = customFilename ||
        parseFilenameTemplate('{title}_{index}.{ext}', resource.title || 'video', resource.type, 0, 'mp4');
      return new Promise((resolve) => {
        chrome.downloads.download({ url: directMp4, filename, saveAs: false }, (id) => {
          resolve(!chrome.runtime.lastError && !!id);
        });
      });
    }

    // --- Strategy 2: Resolve the highest-quality media playlist if this is a master ---
    const mediaPlaylistUrl = await resolveMediaPlaylist(m3u8Text, resource.url);
    const segmentUrls = await extractSegmentUrls(mediaPlaylistUrl, fetchHeaders);

    if (segmentUrls.length === 0) {
      console.error('[HLS] No segments found in playlist.');
      return false;
    }

    // Download and concatenate all TS segments via offscreen
    const filename = customFilename ||
      parseFilenameTemplate('{title}_{index}.{ext}', resource.title || 'video', resource.type, 0, 'ts');

    await ensureOffscreenDocument();

    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        {
          target: 'offscreen',
          type: 'DOWNLOAD_HLS_SEGMENTS',
          // Pass headers so the offscreen document uses the same Referer/Origin
          payload: { segmentUrls, filename, referer, origin },
        },
        (response) => {
          if (response?.success) {
            chrome.downloads.download(
              { url: response.dataUrl, filename, saveAs: false },
              (id) => resolve(!chrome.runtime.lastError && !!id)
            );
          } else {
            console.error('[HLS] Offscreen segment stitch failed:', response?.error);
            resolve(false);
          }
        }
      );
    });
  } catch (err) {
    console.error('[HLS] Download failed:', err);
    return false;
  }
}

/** Checks if a master playlist lists a direct MP4 URI and returns the best one. */
function extractDirectMp4FromMaster(m3u8Text: string, baseUrl: string): string | null {
  const lines = m3u8Text.split('\n').map((l) => l.trim());
  for (const line of lines) {
    if (line && !line.startsWith('#')) {
      // Some master playlists link directly to MP4 files
      if (/\.mp4(\?|$)/i.test(line)) {
        try {
          return new URL(line, baseUrl).href;
        } catch {
          // ignore
        }
      }
    }
  }
  return null;
}

/**
 * If the m3u8 is a master playlist (contains #EXT-X-STREAM-INF),
 * pick the highest-bandwidth variant and return its URL.
 * Otherwise return the original URL (it's already a media playlist).
 */
async function resolveMediaPlaylist(m3u8Text: string, baseUrl: string): Promise<string> {
  if (!m3u8Text.includes('#EXT-X-STREAM-INF')) {
    return baseUrl; // already a media playlist
  }

  const lines = m3u8Text.split('\n').map((l) => l.trim());
  let bestBandwidth = -1;
  let bestUrl = baseUrl;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('#EXT-X-STREAM-INF')) {
      const bwMatch = lines[i].match(/BANDWIDTH=(\d+)/);
      const bw = bwMatch ? parseInt(bwMatch[1], 10) : 0;
      const uri = lines[i + 1];
      if (uri && !uri.startsWith('#') && bw >= bestBandwidth) {
        bestBandwidth = bw;
        bestUrl = new URL(uri, baseUrl).href;
      }
    }
  }

  return bestUrl;
}

/** Fetches a media playlist URL and extracts all segment URLs, using the provided headers. */
async function extractSegmentUrls(playlistUrl: string, headers?: HeadersInit): Promise<string[]> {
  const text = await fetch(playlistUrl, { headers }).then((r) => r.text());
  const lines = text.split('\n').map((l) => l.trim());
  const urls: string[] = [];

  for (const line of lines) {
    if (line && !line.startsWith('#')) {
      try {
        urls.push(new URL(line, playlistUrl).href);
      } catch {
        // ignore invalid lines
      }
    }
  }

  return urls;
}

export async function triggerOffscreenZip(resources: DiscoveredResource[], zipName: string, template: string = '{title}_{index}.{ext}'): Promise<boolean> {
  await ensureOffscreenDocument();

  const items = resources.map((r, idx) => {
    const ext = getExtensionFromUrl(r.url, r.mimeType || '', r.type);
    const filename = parseFilenameTemplate(template, r.title || r.type, r.type, idx, ext);
    return {
      filename,
      dataUrl: r.dataUrl,
      url: r.dataUrl ? undefined : r.url,
    };
  });

  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      {
        target: 'offscreen',
        type: 'CREATE_ZIP',
        payload: { items, zipName },
      },
      async (response) => {
        if (response && response.success && response.dataUrl) {
          chrome.downloads.download({
            url: response.dataUrl,
            filename: `${zipName}.zip`,
            saveAs: true,
          });
          resolve(true);
        } else {
          console.error('ZIP generation failed:', response?.error);
          resolve(false);
        }
      }
    );
  });
}

async function ensureOffscreenDocument() {
  if (await chrome.offscreen.hasDocument()) return;
  await chrome.offscreen.createDocument({
    url: 'src/offscreen/offscreen.html',
    reasons: ['BLOBS' as chrome.offscreen.Reason],
    justification: 'Packaging resources into ZIP file offscreen',
  });
}

/**
 * Extracts the correct file extension for a resource URL.
 * Checks the URL path first, then falls back to MIME type.
 */
function getExtensionFromUrl(url: string, mimeType: string, type: string): string {
  if (type === 'pdf') return 'pdf';

  // Try extracting extension from URL path (strip query params)
  const pathPart = url.split('?')[0].split('#')[0];
  const urlExt = pathPart.split('.').pop()?.toLowerCase();
  const knownExts = ['mp4', 'webm', 'mkv', 'mov', 'avi', 'm4v', 'ogv',
                     'mp3', 'wav', 'ogg', 'flac', 'aac',
                     'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif',
                     'pdf', 'woff', 'woff2', 'ttf', 'otf'];
  if (urlExt && knownExts.includes(urlExt)) {
    return urlExt;
  }

  // Fall back to MIME type
  const mimeMap: Record<string, string> = {
    'video/mp4': 'mp4', 'video/webm': 'webm', 'video/ogg': 'ogv',
    'video/x-matroska': 'mkv', 'video/quicktime': 'mov', 'video/x-msvideo': 'avi',
    'audio/mpeg': 'mp3', 'audio/wav': 'wav', 'audio/ogg': 'ogg',
    'audio/flac': 'flac', 'audio/aac': 'aac',
    'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif',
    'image/webp': 'webp', 'image/svg+xml': 'svg', 'image/avif': 'avif',
    'font/woff': 'woff', 'font/woff2': 'woff2', 'font/ttf': 'ttf',
  };
  const baseMime = mimeType.split(';')[0].trim();
  if (mimeMap[baseMime]) return mimeMap[baseMime];

  // Last resort defaults by type category
  if (type === 'image') return 'jpg';
  if (type === 'media') return 'mp4';
  if (type === 'font') return 'woff2';
  return 'bin';
}

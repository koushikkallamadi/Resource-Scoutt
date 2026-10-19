import { setupNetworkLogger, getTabNetworkResources } from './networkLogger';
import { downloadSingleResource, triggerOffscreenZip } from './downloadManager';

console.log('[ResourceScout] Background Service Worker Initialized');

// Start observing web requests
setupNetworkLogger();

// Listen for extension runtime messages
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_TAB_NETWORK_RESOURCES') {
    const tabId = message.tabId || _sender.tab?.id;
    if (tabId !== undefined) {
      const resources = getTabNetworkResources(tabId);
      sendResponse({ resources });
    } else {
      sendResponse({ resources: [] });
    }
    return false; // synchronous response
  }

  if (message.type === 'DOWNLOAD_RESOURCE') {
    downloadSingleResource(message.payload.resource, message.payload.customFilename)
      .then((success) => sendResponse({ success }));
    return true;
  }

  if (message.type === 'DOWNLOAD_BULK_ZIP') {
    triggerOffscreenZip(message.payload.resources, message.payload.zipName)
      .then((success) => sendResponse({ success }));
    return true;
  }

  if (message.type === 'REQUEST_HOST_PERMISSION') {
    chrome.permissions.request(
      { origins: ['<all_urls>'] },
      (granted) => sendResponse({ granted })
    );
    return true;
  }

  // Media download handler: receives selected assets from the MediaPanel,
  // fetches each one, zips them via JSZip, and triggers a download.
  if (message.action === 'downloadAssets' && message.assets) {
    handleMediaDownload(message.assets)
      .then(() => sendResponse({ status: 'done' }))
      .catch((err) => sendResponse({ status: 'error', error: err.message }));
    return true;
  }
});

/**
 * Fetch each asset, bundle into a ZIP, and trigger a download.
 * Runs entirely in the background service worker where chrome.downloads is available.
 */
async function handleMediaDownload(assets: { url: string; type: string }[]) {
  // Dynamically import JSZip (it's already bundled)
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  await Promise.all(
    assets.map(async (asset, index) => {
      try {
        let blob: Blob;
        let ext = 'bin';

        if (asset.url.startsWith('data:')) {
          // Handle data: URLs (e.g., canvas or embedded images)
          const parts = asset.url.split(',');
          const mimeMatch = parts[0].match(/:(.*?);/);
          const mime = mimeMatch ? mimeMatch[1] : 'image/png';
          ext = mime.split('/')[1] || 'png';
          const byteString = atob(parts[1]);
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
          }
          blob = new Blob([ab], { type: mime });
        } else {
          const resp = await fetch(asset.url);
          if (!resp.ok) return;
          blob = await resp.blob();
          const cleanUrl = asset.url.split('?')[0].split('#')[0];
          ext = cleanUrl.split('.').pop()?.toLowerCase() || 'bin';
          if (ext.length > 5 || ext === cleanUrl) {
            ext = asset.type === 'video' ? 'mp4' : asset.type === 'audio' ? 'mp3' : asset.type === 'image' ? 'jpg' : 'bin';
          }
        }

        const filename = `${asset.type}-${index + 1}.${ext}`;
        zip.file(filename, blob);
      } catch (e) {
        console.warn('[MediaDownload] Failed to fetch', asset.url, e);
      }
    })
  );

  // Generate base64 data URL directly without FileReader (which is unavailable in MV3 Service Workers)
  const base64 = await zip.generateAsync({ type: 'base64' });
  const dataUrl = `data:application/zip;base64,${base64}`;

  return new Promise<void>((resolve, reject) => {
    chrome.downloads.download(
      {
        url: dataUrl,
        filename: `resource-scout-media-${Date.now()}.zip`,
        saveAs: true,
      },
      (downloadId) => {
        if (chrome.runtime.lastError || !downloadId) {
          reject(new Error(chrome.runtime.lastError?.message || 'Download failed'));
        } else {
          resolve();
        }
      }
    );
  });
}

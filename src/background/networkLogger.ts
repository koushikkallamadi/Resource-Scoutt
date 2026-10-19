import { DiscoveredResource } from '../shared/types';
import { normalizeUrl } from '../shared/deduplication';
import { detectResourceType } from '../shared/classifier';

// Map of tabId -> Map of normalized resource URL -> DiscoveredResource
const tabNetworkLogs = new Map<number, Map<string, DiscoveredResource>>();

export function setupNetworkLogger() {
  if (!chrome.webRequest || !chrome.webRequest.onHeadersReceived) {
    console.warn('chrome.webRequest API not available.');
    return;
  }

  chrome.webRequest.onHeadersReceived.addListener(
    (details) => {
      if (details.tabId < 0) return;

      const contentTypeHeader = details.responseHeaders?.find(
        (h) => h.name.toLowerCase() === 'content-type'
      );
      const contentLengthHeader = details.responseHeaders?.find(
        (h) => h.name.toLowerCase() === 'content-length'
      );

      const mimeType = contentTypeHeader?.value?.toLowerCase() || '';
      const size = contentLengthHeader?.value ? parseInt(contentLengthHeader.value, 10) : undefined;

      let resourceType: DiscoveredResource['type'] | null = null;
      let isHls = false;

      if (
        mimeType.includes('application/x-mpegurl') ||
        mimeType.includes('application/vnd.apple.mpegurl') ||
        details.url.toLowerCase().includes('.m3u8')
      ) {
        resourceType = 'media';
        isHls = true;
      } else {
        const detected = detectResourceType(details.url, mimeType);
        if (detected !== 'other') {
          resourceType = detected;
        }
      }

      if (resourceType) {
        if (!tabNetworkLogs.has(details.tabId)) {
          tabNetworkLogs.set(details.tabId, new Map());
        }

        const normUrl = normalizeUrl(details.url);
        const tabMap = tabNetworkLogs.get(details.tabId)!;

        // details.initiator is the page/frame that triggered this request.
        // We store it so the download manager can send it as a Referer header,
        // which many streaming servers require to allow segment downloads.
        const pageUrl = details.initiator || '';

        tabMap.set(normUrl, {
          id: `net_${details.requestId}`,
          url: normUrl,
          type: resourceType,
          mimeType,
          size,
          source: 'network',
          status: 'downloadable',
          isHls,
          pageUrl,
          timestamp: Date.now(),
        });
      }
    },
    { urls: ['<all_urls>'] },
    ['responseHeaders']
  );

  // Clean up on tab close
  chrome.tabs.onRemoved.addListener((tabId) => {
    tabNetworkLogs.delete(tabId);
  });
}

export function getTabNetworkResources(tabId: number): DiscoveredResource[] {
  const map = tabNetworkLogs.get(tabId);
  return map ? Array.from(map.values()) : [];
}

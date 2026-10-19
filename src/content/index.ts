import { scanDOMResources } from './domScanner';
import { detectPageRestrictions } from './restrictionDetector';
import { fetchBlobAsDataUrl } from './blobFetcher';
import { deduplicateResources } from '../shared/deduplication';
import { DiscoveredResource } from '../shared/types';
import { detectResourceType } from '../shared/classifier';

console.log('[ResourceScout] Isolated Content Script Loaded');

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'SCAN_PAGE') {
    handleScanPage()
      .then((data) => sendResponse(data))
      .catch((err) => {
        console.error('Scan failed:', err);
        sendResponse({ resources: [], restrictionReport: null, error: err.message });
      });
    return true; // async response
  }
});

async function handleScanPage() {
  const domResources = scanDOMResources();
  const restrictionReport = detectPageRestrictions();

  // Resolve blob: URLs into dataUrls directly within page context
  for (const res of domResources) {
    if (res.url.startsWith('blob:') && !res.dataUrl) {
      const dataUrl = await fetchBlobAsDataUrl(res.url);
      if (dataUrl) {
        res.dataUrl = dataUrl;
        const refined = detectResourceType(dataUrl);
        if (refined !== 'other') {
          res.type = refined;
        }
      }
    }
  }

  // Query background service worker for captured network resources
  let networkResources: DiscoveredResource[] = [];
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_TAB_NETWORK_RESOURCES' });
    if (response && response.resources) {
      networkResources = response.resources;
    }
  } catch (err) {
    console.warn('Network resources fetch failed:', err);
  }

  const combined = [...domResources, ...networkResources];
  const deduplicated = deduplicateResources(combined);

  return {
    resources: deduplicated,
    restrictionReport,
  };
}

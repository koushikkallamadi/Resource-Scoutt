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
});

import { RawCheckInput, calculateRestrictionScore } from '../shared/scoringEngine';
import { RestrictionReport } from '../shared/types';

let mainWorldEvents: { eventBlockers: string[]; emeDetected: boolean } = {
  eventBlockers: [],
  emeDetected: false,
};

// Listen for updates from mainWorld.ts
window.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'RS_MAIN_WORLD_EVENT') {
    mainWorldEvents = event.data.payload;
  }
});

export function detectPageRestrictions(): RestrictionReport {
  const bodyStyle = window.getComputedStyle(document.body);
  const htmlStyle = window.getComputedStyle(document.documentElement);

  const userSelectNone =
    bodyStyle.userSelect === 'none' ||
    htmlStyle.userSelect === 'none' ||
    bodyStyle.getPropertyValue('-webkit-user-select') === 'none';

  // Check for transparent overlay divs
  const overlays = Array.from(document.querySelectorAll('div, span')).filter((el) => {
    const style = window.getComputedStyle(el);
    const isAbsolute = style.position === 'absolute' || style.position === 'fixed';
    const isTransparent = style.backgroundColor === 'rgba(0, 0, 0, 0)' || style.opacity === '0';
    const hasHighZIndex = parseInt(style.zIndex, 10) > 5;
    return isAbsolute && isTransparent && hasHighZIndex;
  });

  const pointerEventsNone = Array.from(document.querySelectorAll('img, canvas, iframe')).some(
    (el) => window.getComputedStyle(el).pointerEvents === 'none'
  );

  // Viewers
  const pdfJsViewer = !!document.querySelector('.pdf-viewer, #viewerContainer, .pdfViewer, canvas.pdf-canvas');
  const googleDocsViewer = !!document.querySelector('iframe[src*="docs.google.com/viewer"]');
  const blobUrlEmbed = !!document.querySelector('iframe[src^="blob:"], embed[src^="blob:"], object[data^="blob:"]');

  // Canvas
  const canvases = Array.from(document.querySelectorAll('canvas'));
  const canvasTextOrDoc = canvases.length > 0;
  let taintedCanvas = false;

  for (const c of canvases) {
    try {
      c.toDataURL();
    } catch {
      taintedCanvas = true;
      break;
    }
  }

  const rawInput: RawCheckInput = {
    eventBlockers: {
      contextMenu: mainWorldEvents.eventBlockers.includes('contextmenu'),
      selectStart: mainWorldEvents.eventBlockers.includes('selectstart'),
      copy: mainWorldEvents.eventBlockers.includes('copy'),
      dragStart: mainWorldEvents.eventBlockers.includes('dragstart'),
      keyboardShortcuts: mainWorldEvents.eventBlockers.includes('keydown'),
    },
    overlays: {
      userSelectNone,
      pointerEventsNone,
      transparentOverlayDiv: overlays.length > 0,
    },
    blobOrViewerEmbedded: {
      pdfJsViewer,
      googleDocsViewer,
      blobUrlEmbed,
    },
    canvasRendering: {
      canvasTextOrDoc,
      taintedCanvas,
    },
    referrerOrSignedUrls: {
      hotlinkProtection: false,
      signedExpiringUrl: false,
    },
    drmIndicators: {
      emeMediaKeys: mainWorldEvents.emeDetected,
    },
  };

  return calculateRestrictionScore(rawInput);
}

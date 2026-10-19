import { RestrictionCheckItem, RestrictionReport, RubricConfig } from './types';
import { DEFAULT_RUBRIC } from './constants';

export interface RawCheckInput {
  eventBlockers: {
    contextMenu: boolean;
    selectStart: boolean;
    copy: boolean;
    dragStart: boolean;
    keyboardShortcuts: boolean;
  };
  overlays: {
    userSelectNone: boolean;
    pointerEventsNone: boolean;
    transparentOverlayDiv: boolean;
  };
  blobOrViewerEmbedded: {
    pdfJsViewer: boolean;
    googleDocsViewer: boolean;
    blobUrlEmbed: boolean;
  };
  canvasRendering: {
    canvasTextOrDoc: boolean;
    taintedCanvas: boolean;
  };
  referrerOrSignedUrls: {
    hotlinkProtection: boolean;
    signedExpiringUrl: boolean;
  };
  drmIndicators: {
    emeMediaKeys: boolean;
  };
}

export function calculateRestrictionScore(
  input: RawCheckInput,
  rubric: RubricConfig = DEFAULT_RUBRIC
): RestrictionReport {
  const { weights, labels } = rubric;
  const checks: RestrictionCheckItem[] = [];

  // 1. Event Blockers (Weight: weights.eventBlockers)
  const eventBlockerItems = [
    input.eventBlockers.contextMenu,
    input.eventBlockers.selectStart,
    input.eventBlockers.copy,
    input.eventBlockers.dragStart,
    input.eventBlockers.keyboardShortcuts,
  ];
  const detectedEventsCount = eventBlockerItems.filter(Boolean).length;
  const eventBlockerScore = detectedEventsCount > 0 ? (weights.eventBlockers * (detectedEventsCount / eventBlockerItems.length)) : 0;
  
  checks.push({
    id: 'event_blockers',
    name: 'Right-Click & Action Blockers',
    category: 'eventBlockers',
    detected: detectedEventsCount > 0,
    scoreImpact: Math.round(eventBlockerScore),
    description: 'Site blocks right-click, selection, copy, or keyboard shortcuts (F12, Ctrl+S/U)',
    detail: detectedEventsCount > 0 ? `Detected ${detectedEventsCount} event trap(s)` : 'None detected',
  });

  // 2. Overlays & CSS Protections (Weight: weights.overlays)
  const overlayItems = [
    input.overlays.userSelectNone,
    input.overlays.pointerEventsNone,
    input.overlays.transparentOverlayDiv,
  ];
  const detectedOverlaysCount = overlayItems.filter(Boolean).length;
  const overlayScore = detectedOverlaysCount > 0 ? (weights.overlays * (detectedOverlaysCount / overlayItems.length)) : 0;

  checks.push({
    id: 'overlays_css',
    name: 'Visual & Selection Overlays',
    category: 'overlays',
    detected: detectedOverlaysCount > 0,
    scoreImpact: Math.round(overlayScore),
    description: 'CSS user-select: none, pointer-events disables, or transparent image overlays',
    detail: detectedOverlaysCount > 0 ? `Detected ${detectedOverlaysCount} overlay protection(s)` : 'None detected',
  });

  // 3. Blob / Custom Viewers (Weight: weights.blobOrViewerEmbedded)
  const viewerItems = [
    input.blobOrViewerEmbedded.pdfJsViewer,
    input.blobOrViewerEmbedded.googleDocsViewer,
    input.blobOrViewerEmbedded.blobUrlEmbed,
  ];
  const detectedViewerCount = viewerItems.filter(Boolean).length;
  const viewerScore = detectedViewerCount > 0 ? (weights.blobOrViewerEmbedded * (detectedViewerCount / viewerItems.length)) : 0;

  checks.push({
    id: 'custom_viewers',
    name: 'Embedded Custom Viewers & Blob URLs',
    category: 'blobOrViewerEmbedded',
    detected: detectedViewerCount > 0,
    scoreImpact: Math.round(viewerScore),
    description: 'PDF.js, Google Docs Viewer embed, or blob: URL streams',
    detail: detectedViewerCount > 0 ? `Detected ${detectedViewerCount} viewer/blob protection(s)` : 'None detected',
  });

  // 4. Canvas Rendered Content (Weight: weights.canvasRendering)
  const canvasItems = [
    input.canvasRendering.canvasTextOrDoc,
    input.canvasRendering.taintedCanvas,
  ];
  const detectedCanvasCount = canvasItems.filter(Boolean).length;
  const canvasScore = detectedCanvasCount > 0 ? (weights.canvasRendering * (detectedCanvasCount / canvasItems.length)) : 0;

  checks.push({
    id: 'canvas_rendering',
    name: 'Canvas Rendered Content',
    category: 'canvasRendering',
    detected: detectedCanvasCount > 0,
    scoreImpact: Math.round(canvasScore),
    description: 'Documents or images rendered to HTML5 canvas elements (or CORS tainted canvas)',
    detail: detectedCanvasCount > 0 ? `Detected ${detectedCanvasCount} canvas element issue(s)` : 'None detected',
  });

  // 5. Referrer / Signed Token Protection (Weight: weights.referrerOrSignedUrls)
  const signedItems = [
    input.referrerOrSignedUrls.hotlinkProtection,
    input.referrerOrSignedUrls.signedExpiringUrl,
  ];
  const detectedSignedCount = signedItems.filter(Boolean).length;
  const signedScore = detectedSignedCount > 0 ? (weights.referrerOrSignedUrls * (detectedSignedCount / signedItems.length)) : 0;

  checks.push({
    id: 'signed_referrer_protection',
    name: 'Referrer & Expiring Signed URLs',
    category: 'referrerOrSignedUrls',
    detected: detectedSignedCount > 0,
    scoreImpact: Math.round(signedScore),
    description: 'URLs with temporary security signature query params or strict Referer validation',
    detail: detectedSignedCount > 0 ? `Detected ${detectedSignedCount} token/referrer constraint(s)` : 'None detected',
  });

  // 6. EME / DRM Indicators (Weight: weights.drmIndicators)
  const drmDetected = input.drmIndicators.emeMediaKeys;
  const drmScore = drmDetected ? weights.drmIndicators : 0;

  checks.push({
    id: 'drm_eme',
    name: 'DRM / Encrypted Media Extension (EME)',
    category: 'drmIndicators',
    detected: drmDetected,
    scoreImpact: Math.round(drmScore),
    description: 'Hardware/EME MediaKey encryption detected (Content cannot be downloaded)',
    detail: drmDetected ? 'DRM MediaKeys hook active (Blocked)' : 'No DRM detected',
  });

  const totalScore = Math.min(
    100,
    Math.round(eventBlockerScore + overlayScore + viewerScore + canvasScore + signedScore + drmScore)
  );

  const matchedLabel = labels.find((l) => totalScore >= l.min && totalScore <= l.max) || labels[labels.length - 1];

  return {
    score: totalScore,
    label: matchedLabel.name,
    labelColor: matchedLabel.color,
    labelBadgeClass: matchedLabel.badge,
    checks,
    timestamp: Date.now(),
  };
}

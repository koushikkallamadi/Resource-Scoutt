import { describe, it, expect } from 'vitest';
import { calculateRestrictionScore, RawCheckInput } from '../src/shared/scoringEngine';
import { DEFAULT_RUBRIC } from '../src/shared/constants';

describe('Scoring Engine', () => {
  it('should return a 0 score and "Easy" label when no restrictions are detected', () => {
    const rawInput: RawCheckInput = {
      eventBlockers: { contextMenu: false, selectStart: false, copy: false, dragStart: false, keyboardShortcuts: false },
      overlays: { userSelectNone: false, pointerEventsNone: false, transparentOverlayDiv: false },
      blobOrViewerEmbedded: { pdfJsViewer: false, googleDocsViewer: false, blobUrlEmbed: false },
      canvasRendering: { canvasTextOrDoc: false, taintedCanvas: false },
      referrerOrSignedUrls: { hotlinkProtection: false, signedExpiringUrl: false },
      drmIndicators: { emeMediaKeys: false },
    };

    const report = calculateRestrictionScore(rawInput, DEFAULT_RUBRIC);
    expect(report.score).toBe(0);
    expect(report.label).toBe('Easy');
    expect(report.checks.every(c => !c.detected)).toBe(true);
  });

  it('should calculate correct weighted score for right-click and overlay traps', () => {
    const rawInput: RawCheckInput = {
      eventBlockers: { contextMenu: true, selectStart: true, copy: true, dragStart: false, keyboardShortcuts: false },
      overlays: { userSelectNone: true, pointerEventsNone: false, transparentOverlayDiv: true },
      blobOrViewerEmbedded: { pdfJsViewer: false, googleDocsViewer: false, blobUrlEmbed: false },
      canvasRendering: { canvasTextOrDoc: false, taintedCanvas: false },
      referrerOrSignedUrls: { hotlinkProtection: false, signedExpiringUrl: false },
      drmIndicators: { emeMediaKeys: false },
    };

    const report = calculateRestrictionScore(rawInput, DEFAULT_RUBRIC);
    // eventBlockers: 20 * (3/5) = 12
    // overlays: 15 * (2/3) = 10
    // Total = 22 -> Easy
    expect(report.score).toBe(22);
    expect(report.label).toBe('Easy');
  });

  it('should flag high restriction scores as Strict or Locked when DRM/Viewers are present', () => {
    const rawInput: RawCheckInput = {
      eventBlockers: { contextMenu: true, selectStart: true, copy: true, dragStart: true, keyboardShortcuts: true }, // 20
      overlays: { userSelectNone: true, pointerEventsNone: true, transparentOverlayDiv: true }, // 15
      blobOrViewerEmbedded: { pdfJsViewer: true, googleDocsViewer: false, blobUrlEmbed: true }, // 20 * 2/3 = ~13
      canvasRendering: { canvasTextOrDoc: true, taintedCanvas: true }, // 15
      referrerOrSignedUrls: { hotlinkProtection: true, signedExpiringUrl: true }, // 15
      drmIndicators: { emeMediaKeys: true }, // 15
    };

    const report = calculateRestrictionScore(rawInput, DEFAULT_RUBRIC);
    expect(report.score).toBeGreaterThanOrEqual(75);
    expect(report.label).toBe('Locked');
    expect(report.checks.find(c => c.category === 'drmIndicators')?.detected).toBe(true);
  });
});

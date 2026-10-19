import { ExtensionSettings, RubricConfig } from './types';

export const DEFAULT_RUBRIC: RubricConfig = {
  weights: {
    eventBlockers: 20,
    overlays: 15,
    blobOrViewerEmbedded: 20,
    canvasRendering: 15,
    referrerOrSignedUrls: 15,
    drmIndicators: 15,
  },
  labels: [
    { min: 0, max: 24, name: 'Easy', color: '#10b981', badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    { min: 25, max: 49, name: 'Moderate', color: '#f59e0b', badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    { min: 50, max: 74, name: 'Strict', color: '#f97316', badge: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
    { min: 75, max: 100, name: 'Locked', color: '#ef4444', badge: 'bg-red-500/20 text-red-400 border-red-500/30' },
  ],
};

export const DEFAULT_SETTINGS: ExtensionSettings = {
  scoringRubric: DEFAULT_RUBRIC,
  filenameTemplate: '{title}_{index}.{ext}',
  minImageWidth: 50,
  minImageHeight: 50,
  minFileSizeKB: 0,
  theme: 'dark',
  autoScan: true,
};

export const STORAGE_KEYS = {
  SETTINGS: 'resourcescout_settings',
  PER_SITE_HISTORY: 'resourcescout_history',
};

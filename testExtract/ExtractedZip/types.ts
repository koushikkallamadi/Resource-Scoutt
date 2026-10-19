export type ResourceType = 'image' | 'pdf' | 'media' | 'canvas' | 'document' | 'font' | 'other';

export type DownloadStatus = 'downloadable' | 'protected' | 'drm_locked' | 'failed';

export interface DiscoveredResource {
  id: string;
  url: string;
  type: ResourceType;
  mimeType?: string;
  size?: number; // bytes
  dimensions?: { width: number; height: number };
  source: 'dom' | 'network' | 'canvas' | 'blob' | 'iframe';
  title?: string;
  status: DownloadStatus;
  statusReason?: string;
  dataUrl?: string; // for canvas or blob exported items
  isHls?: boolean; // true if this is an HLS m3u8 playlist stream
  pageUrl?: string; // the page/frame URL that initiated this network request (used as Referer)
  timestamp: number;
}

export interface RestrictionCheckItem {
  id: string;
  name: string;
  category: 'eventBlockers' | 'overlays' | 'blobOrViewerEmbedded' | 'canvasRendering' | 'referrerOrSignedUrls' | 'drmIndicators';
  detected: boolean;
  scoreImpact: number;
  description: string;
  detail?: string;
}

export interface RestrictionReport {
  score: number;
  label: 'Easy' | 'Moderate' | 'Strict' | 'Locked';
  labelColor: string;
  labelBadgeClass: string;
  checks: RestrictionCheckItem[];
  timestamp: number;
}

export interface RubricConfig {
  weights: {
    eventBlockers: number;
    overlays: number;
    blobOrViewerEmbedded: number;
    canvasRendering: number;
    referrerOrSignedUrls: number;
    drmIndicators: number;
  };
  labels: {
    min: number;
    max: number;
    name: 'Easy' | 'Moderate' | 'Strict' | 'Locked';
    color: string;
    badge: string;
  }[];
}

export interface ExtensionSettings {
  scoringRubric: RubricConfig;
  filenameTemplate: string;
  minImageWidth: number;
  minImageHeight: number;
  minFileSizeKB: number;
  theme: 'dark' | 'light' | 'system';
  autoScan: boolean;
}

export interface MainWorldDetectionEvent {
  type: 'RS_MAIN_WORLD_EVENT';
  payload: {
    eventBlockers: string[];
    emeDetected: boolean;
  };
}

export interface MessagePayloads {
  SCAN_PAGE: { tabId?: number };
  SCAN_RESULT: { resources: DiscoveredResource[]; restrictionReport: RestrictionReport };
  DOWNLOAD_RESOURCE: { resource: DiscoveredResource };
  DOWNLOAD_BULK: { resources: DiscoveredResource[]; zipName: string };
  REQUEST_HOST_PERMISSION: {};
  HOST_PERMISSION_RESULT: { granted: boolean };
  ZIP_PROGRESS: { current: number; total: number; filename: string };
  GET_SETTINGS: {};
  SAVE_SETTINGS: { settings: Partial<ExtensionSettings> };
}

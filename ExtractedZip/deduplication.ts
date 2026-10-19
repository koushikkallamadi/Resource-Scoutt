import { DiscoveredResource } from './types';

/**
 * Normalizes a URL by stripping tracking parameters, hash fragments, and standardizing protocol/host.
 */
export function normalizeUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  try {
    if (rawUrl.startsWith('data:') || rawUrl.startsWith('blob:')) {
      return rawUrl;
    }
    const parsed = new URL(rawUrl);
    // Strip common tracking parameters while preserving important query params
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid'];
    trackingParams.forEach((param) => parsed.searchParams.delete(param));
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

/**
 * Simple fast string hash (fnv-1a algorithm) for fallback collision resolution
 */
export function fastHash(str: string): string {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16);
}

/**
 * Deduplicates discovered resources based on Normalized URL + Size primary key,
 * resolving collisions via dataUrl signature hashing when URL/size match.
 */
export function deduplicateResources(resources: DiscoveredResource[]): DiscoveredResource[] {
  const map = new Map<string, DiscoveredResource>();

  for (const res of resources) {
    const normUrl = normalizeUrl(res.url);
    const sizeKey = res.size ? res.size.toString() : 'unknown';
    const primaryKey = `${res.type}:${normUrl}:${sizeKey}`;

    if (!map.has(primaryKey)) {
      map.set(primaryKey, { ...res, url: normUrl });
    } else {
      const existing = map.get(primaryKey)!;
      // If the incoming resource has more data (e.g. dataUrl or size), merge or prefer the richer instance
      if (!existing.dataUrl && res.dataUrl) {
        map.set(primaryKey, { ...existing, dataUrl: res.dataUrl });
      }
      if ((!existing.size || existing.size === 0) && res.size && res.size > 0) {
        map.set(primaryKey, { ...existing, size: res.size });
      }
    }
  }

  return Array.from(map.values());
}

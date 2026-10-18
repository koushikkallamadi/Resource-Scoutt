import { describe, it, expect } from 'vitest';
import { deduplicateResources, normalizeUrl } from '../src/shared/deduplication';
import { DiscoveredResource } from '../src/shared/types';

describe('Deduplication & URL Normalization', () => {
  it('should normalize tracking parameters and hash fragments', () => {
    const raw = 'https://example.com/document.pdf?utm_source=twitter&id=123#page=2';
    const normalized = normalizeUrl(raw);
    expect(normalized).toBe('https://example.com/document.pdf?id=123');
  });

  it('should deduplicate resources by normalized URL and size', () => {
    const input: DiscoveredResource[] = [
      {
        id: '1',  
        url: 'https://example.com/image.png?utm_source=fb',
        type: 'image',
        size: 2048,
        source: 'dom',
        status: 'downloadable',
        timestamp: 100,
      },
      {
        id: '2',
        url: 'https://example.com/image.png',
        type: 'image',
        size: 2048,
        source: 'network',
        status: 'downloadable',
        timestamp: 105,
      },
      {
        id: '3',
        url: 'https://example.com/doc.pdf',
        type: 'pdf',
        size: 51200,
        source: 'dom',
        status: 'downloadable',
        timestamp: 110,
      },
    ];

    const result = deduplicateResources(input);
    expect(result.length).toBe(2);
    expect(result[0].url).toBe('https://example.com/image.png');
    expect(result[1].url).toBe('https://example.com/doc.pdf');
  });
});

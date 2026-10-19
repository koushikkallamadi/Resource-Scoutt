import { DiscoveredResource } from '../shared/types';
import { tryExportCanvas } from './canvasExporter';
import { detectResourceType } from '../shared/classifier';

export function scanDOMResources(): DiscoveredResource[] {
  const resources: DiscoveredResource[] = [];
  const seenUrls = new Set<string>();

  function addResource(url: string, type: DiscoveredResource['type'], source: DiscoveredResource['source'], extra: Partial<DiscoveredResource> = {}) {
    if (!url || url.startsWith('javascript:')) return;
    try {
      const absUrl = new URL(url, document.baseURI).href;
      if (seenUrls.has(absUrl)) return;
      seenUrls.add(absUrl);

      resources.push({
        id: `dom_${Math.random().toString(36).substring(2, 9)}`,
        url: absUrl,
        type,
        source,
        status: 'downloadable',
        timestamp: Date.now(),
        ...extra,
      });
    } catch {
      // Invalid URL
    }
  }

  // Helper for shadow root scanning
  function scanRoot(root: Document | ShadowRoot | Element) {
    // 1. Standard <img>, lazy loaded attributes, and data-highres page previews
    const imgs = root.querySelectorAll('img');
    imgs.forEach((img) => {
      const src =
        img.currentSrc ||
        img.src ||
        img.getAttribute('data-src') ||
        img.getAttribute('data-original') ||
        img.getAttribute('data-original-src') ||
        img.getAttribute('data-highres') ||
        img.getAttribute('data-page-image') ||
        img.getAttribute('data-lazy');

      if (src) {
        addResource(src, 'image', 'dom', {
          title: img.alt || img.title || undefined,
          dimensions:
            img.naturalWidth && img.naturalHeight
              ? { width: img.naturalWidth, height: img.naturalHeight }
              : undefined,
        });
      }
    });

    // 2. <picture> & <source> & responsive srcset
    const sources = root.querySelectorAll('picture source, video source, audio source, img[srcset]');
    sources.forEach((s) => {
      const srcset = s.getAttribute('srcset') || s.getAttribute('src');
      if (srcset) {
        const candidates = srcset.split(',').map((part) => part.trim().split(' ')[0]);
        const highestResUrl = candidates[candidates.length - 1];
        const isMedia = s.parentElement?.tagName.toLowerCase() === 'video' || s.parentElement?.tagName.toLowerCase() === 'audio';
        addResource(highestResUrl, isMedia ? 'media' : 'image', 'dom');
      }
    });

    // 3. Direct <video> & <audio> elements
    const mediaElements = root.querySelectorAll('video, audio');
    mediaElements.forEach((m) => {
      const el = m as HTMLMediaElement;
      const src = el.currentSrc || el.getAttribute('src');
      if (src) {
        addResource(src, 'media', 'dom', {
          title: el.getAttribute('title') || el.getAttribute('aria-label') || 'Media Resource',
        });
      }
    });

    // 4. SVG <image> and <use> elements
    const svgImages = root.querySelectorAll('svg image, image[*|href]');
    svgImages.forEach((img) => {
      const href = img.getAttribute('href') || img.getAttribute('xlink:href') || img.getAttribute('data-src');
      if (href) {
        addResource(href, 'image', 'dom', { title: 'SVG Page Resource' });
      }
    });

    // 5. Anchor tags (strictly classified via detectResourceType)
    const links = root.querySelectorAll('a[href]');
    links.forEach((a) => {
      const href = a.getAttribute('href');
      const downloadAttr = a.getAttribute('download') || '';
      const typeAttr = a.getAttribute('type') || '';
      
      if (href) {
        const detectedType = detectResourceType(href, undefined, downloadAttr, typeAttr);
        if (detectedType !== 'other') {
          addResource(href, detectedType, 'dom', {
            title: a.textContent?.trim() || a.getAttribute('title') || `${detectedType.toUpperCase()} Resource`,
          });
        }
      }
    });

    // 6. Embeds & IFrames & Objects
    const embeds = root.querySelectorAll('embed[src], object[data], iframe[src]');
    embeds.forEach((el) => {
      const src = el.getAttribute('src') || el.getAttribute('data');
      if (src) {
        const detectedType = detectResourceType(src);
        if (detectedType !== 'other') {
          addResource(src, detectedType, 'iframe', {
            title: el.getAttribute('title') || undefined,
          });
        }
      }
    });

    // 7. Canvas elements
    const canvases = root.querySelectorAll('canvas');
    canvases.forEach((c, index) => {
      const exportResult = tryExportCanvas(c);
      if (exportResult.dataUrl) {
        resources.push({
          id: `canvas_${index}_${Date.now()}`,
          url: exportResult.dataUrl,
          dataUrl: exportResult.dataUrl,
          type: 'canvas',
          source: 'canvas',
          dimensions: { width: c.width, height: c.height },
          status: 'downloadable',
          timestamp: Date.now(),
        });
      }
    });

    // 8. CSS Background images
    const allElements = root.querySelectorAll('*');
    allElements.forEach((el) => {
      if (el.shadowRoot) {
        scanRoot(el.shadowRoot);
      }

      const bg = window.getComputedStyle(el).backgroundImage;
      if (bg && bg !== 'none' && bg.includes('url(')) {
        const match = bg.match(/url\((['"]?)(.*?)\1\)/);
        if (match && match[2] && !match[2].startsWith('data:')) {
          addResource(match[2], 'image', 'dom');
        }
      }
    });
  }

  scanRoot(document);

  // 9. Check if current document itself is a direct PDF document
  if (
    window.location.pathname.toLowerCase().endsWith('.pdf') || 
    document.contentType === 'application/pdf'
  ) {
    addResource(window.location.href, 'pdf', 'dom', { title: document.title || 'Current PDF Document' });
  }

  return resources;
}

import { DiscoveredResource } from '../shared/types';
import { tryExportCanvas } from './canvasExporter';

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
    const sources = root.querySelectorAll('picture source, video source, img[srcset]');
    sources.forEach((s) => {
      const srcset = s.getAttribute('srcset') || s.getAttribute('src');
      if (srcset) {
        // Parse highest resolution URL from srcset string
        const candidates = srcset.split(',').map((part) => part.trim().split(' ')[0]);
        const highestResUrl = candidates[candidates.length - 1];
        const isMedia = s.parentElement?.tagName.toLowerCase() === 'video';
        addResource(highestResUrl, isMedia ? 'media' : 'image', 'dom');
      }
    });

    // 3. SVG <image> and <use> elements (common in document vector preview viewers)
    const svgImages = root.querySelectorAll('svg image, image[*|href]');
    svgImages.forEach((img) => {
      const href = img.getAttribute('href') || img.getAttribute('xlink:href') || img.getAttribute('data-src');
      if (href) {
        addResource(href, 'image', 'dom', { title: 'SVG Page Resource' });
      }
    });

    // 4. Anchor tags ending with .pdf, .docx, .zip, etc.
    const links = root.querySelectorAll('a[href]');
    links.forEach((a) => {
      const href = a.getAttribute('href');
      const downloadAttr = a.getAttribute('download') || '';
      const typeAttr = a.getAttribute('type') || '';
      
      if (href) {
        const isPdf = 
          href.toLowerCase().includes('.pdf') || 
          href.startsWith('blob:') || 
          downloadAttr.toLowerCase().includes('.pdf') ||
          typeAttr.toLowerCase() === 'application/pdf';

        if (isPdf) {
          addResource(href, 'pdf', 'dom', { title: a.textContent?.trim() || 'PDF Document' });
        } else if (/\.(docx?|xlsx?|pptx?|zip|rar|tar\.gz)$/i.test(href) || /\.(docx?|xlsx?|pptx?|zip|rar|tar\.gz)$/i.test(downloadAttr)) {
          addResource(href, 'document', 'dom', { title: a.textContent?.trim() || 'Document File' });
        }
      }
    });

    // 5. Embeds & IFrames & Objects (PDF viewers & blob streams)
    const embeds = root.querySelectorAll('embed[src], object[data], iframe[src]');
    embeds.forEach((el) => {
      const src = el.getAttribute('src') || el.getAttribute('data');
      if (src) {
        const isPdf = src.toLowerCase().includes('.pdf') || src.startsWith('blob:');
        addResource(src, isPdf ? 'pdf' : 'document', 'iframe');
      }
    });

    // 6. Canvas elements (e.g. PDF.js canvas pages & document canvas renderers)
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

    // 7. CSS Background images (e.g. div-based page background rendering)
    const allElements = root.querySelectorAll('*');
    allElements.forEach((el) => {
      if (el.shadowRoot) {
        scanRoot(el.shadowRoot);
      }

      const bg = window.getComputedStyle(el).backgroundImage;
      if (bg && bg !== 'none' && bg.includes('url(')) {
        const match = bg.match(/url\((['"]?)(.*?)\1\)/);
        if (match && match[2]) {
          addResource(match[2], 'image', 'dom');
        }
      }
    });
  }

  scanRoot(document);

  // 8. Check if the page itself is a direct PDF link
  if (
    window.location.href.toLowerCase().includes('.pdf') || 
    document.contentType === 'application/pdf'
  ) {
    addResource(window.location.href, 'pdf', 'dom', { title: document.title || 'Current PDF Document' });
  }

  return resources;
}

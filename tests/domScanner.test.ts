import { describe, it, expect, beforeEach } from 'vitest';
import { scanDOMResources } from '../src/content/domScanner';

describe('DOM Scanner', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should scan images, lazy loaded images, and document links', () => {
    document.body.innerHTML = `
      <div>
        <img src="https://example.com/photo1.jpg" width="300" height="200" alt="Sample 1">
        <img data-src="https://example.com/photo2.webp" alt="Lazy Loaded">
        <a href="https://example.com/manual.pdf">User Manual PDF</a>
        <a href="https://example.com/archive.zip">Files Archive</a>
      </div>
    `;

    const resources = scanDOMResources();
    expect(resources.length).toBe(4);

    const pdfRes = resources.find((r) => r.type === 'pdf');
    expect(pdfRes).toBeDefined();
    expect(pdfRes?.url).toBe('https://example.com/manual.pdf');

    const imageRes = resources.filter((r) => r.type === 'image');
    expect(imageRes.length).toBe(2);
  });

  it('should extract canvas elements into data URLs', () => {
    HTMLCanvasElement.prototype.toDataURL = function () {
      return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    };

    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    document.body.appendChild(canvas);

    const resources = scanDOMResources();
    const canvasRes = resources.find((r) => r.type === 'canvas');
    expect(canvasRes).toBeDefined();
    expect(canvasRes?.url.startsWith('data:image/png')).toBe(true);
  });
});

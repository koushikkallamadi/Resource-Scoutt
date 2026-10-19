// src/content/mediaExtractor.ts
export type Asset = {
    url: string;
    type: 'image' | 'video' | 'audio' | 'canvas' | 'pdf';
};

/**
 * Scan the current page and return every downloadable asset.
 */
export async function collectMedia(): Promise<Asset[]> {
    const assets: Asset[] = [];

    // Images
    document.querySelectorAll('img[src]').forEach(img => {
        const src = (img as HTMLImageElement).src;
        if (src) assets.push({ url: src, type: 'image' });
    });

    // Video / audio (src attribute or <source> children)
    const mediaSel = 'video[src], audio[src], video source[src], audio source[src]';
    document.querySelectorAll(mediaSel).forEach(el => {
        const src = (el as HTMLSourceElement).src;
        const tag = el.tagName.toLowerCase();
        if (src) {
            const type = tag.includes('video') ? 'video' : 'audio';
            assets.push({ url: src, type });
        }
    });

    // Canvas → PNG blob
    const canvases = document.querySelectorAll('canvas');
    for (let i = 0; i < canvases.length; i++) {
        const canvas = canvases[i] as HTMLCanvasElement;
        const blob = await new Promise<Blob>(res => canvas.toBlob(b => res(b!), 'image/png'));
        const url = URL.createObjectURL(blob);
        assets.push({ url, type: 'canvas' });
    }

    // Linked PDFs
    document.querySelectorAll('a[href$=".pdf"]').forEach(a => {
        const href = (a as HTMLAnchorElement).href;
        if (href) assets.push({ url: href, type: 'pdf' });
    });

    return assets;
}

// src/offscreen/mediaDownloader.ts
import JSZip from 'jszip';
import { Asset } from '../content/mediaExtractor';

/**
 * Receives a list of assets, fetches each one and puts it into a ZIP file.
 * The ZIP is then offered to the user via chrome.downloads.
 */
export async function downloadAssets(
    assets: Asset[],
    zipName = 'resource-scout.zip'
): Promise<void> {
    const zip = new JSZip();

    const fetchAndAdd = async (asset: Asset, index: number) => {
        try {
            const resp = await fetch(asset.url);
            if (!resp.ok) return;
            const blob = await resp.blob();
            // Derive a simple filename: type-index.extension
            const ext = asset.url.split('.').pop()?.split(/[?#]/)[0] ?? 'bin';
            const filename = `${asset.type}-${index}.${ext}`;
            zip.file(filename, blob);
        } catch (e) {
            console.warn('Failed to fetch', asset.url, e);
        }
    };

    await Promise.all(assets.map(fetchAndAdd));

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const downloadUrl = URL.createObjectURL(zipBlob);
    chrome.downloads.download({
        url: downloadUrl,
        filename: zipName,
        saveAs: true,
    });
}

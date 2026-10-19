// src/popup/MediaPanel.tsx
import React, { useEffect, useState } from 'react';

interface Asset {
  url: string;
  type: 'image' | 'video' | 'audio' | 'canvas' | 'pdf';
}

export const MediaPanel: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [scanning, setScanning] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (!tabId) {
        setScanning(false);
        return;
      }

      // Execute an inline function in the content script context.
      chrome.scripting.executeScript(
        {
          target: { tabId },
          func: () => {
            const assets: { url: string; type: 'image' | 'video' | 'audio' | 'canvas' | 'pdf' }[] = [];

            // Images (src, data-src, data-original)
            document.querySelectorAll('img').forEach((img) => {
              const src =
                img.currentSrc ||
                img.src ||
                img.getAttribute('data-src') ||
                img.getAttribute('data-original');
              if (src && !src.startsWith('data:')) {
                try {
                  assets.push({ url: new URL(src, document.baseURI).href, type: 'image' });
                } catch {
                  // ignore
                }
              }
            });

            // Background images in CSS
            document.querySelectorAll('*').forEach((el) => {
              const bg = getComputedStyle(el).backgroundImage;
              if (bg && bg !== 'none') {
                const match = bg.match(/url\(["']?(.*?)["']?\)/);
                if (match && match[1] && !match[1].startsWith('data:')) {
                  try {
                    assets.push({ url: new URL(match[1], document.baseURI).href, type: 'image' });
                  } catch {
                    // ignore
                  }
                }
              }
            });

            // Video / Audio
            document
              .querySelectorAll('video, audio, video source, audio source')
              .forEach((el) => {
                const mediaEl = el as HTMLMediaElement | HTMLSourceElement;
                const src = (mediaEl as HTMLMediaElement).currentSrc || mediaEl.getAttribute('src');
                if (src) {
                  try {
                    const tag = el.closest('video') || el.tagName.toLowerCase() === 'video' ? 'video' : 'audio';
                    assets.push({ url: new URL(src, document.baseURI).href, type: tag });
                  } catch {
                    // ignore
                  }
                }
              });

            // Canvas to PNG
            document.querySelectorAll('canvas').forEach((c) => {
              try {
                const dataUrl = (c as HTMLCanvasElement).toDataURL('image/png');
                if (dataUrl && dataUrl.length > 64) {
                  assets.push({ url: dataUrl, type: 'canvas' });
                }
              } catch {
                // Tainted canvas - ignore
              }
            });

            // Linked media and PDFs (strictly check file extension)
            const mediaExts = ['.mp4', '.webm', '.mkv', '.mov', '.avi', '.mp3', '.wav', '.ogg', '.m4v'];
            document.querySelectorAll('a[href]').forEach((a) => {
              const href = (a as HTMLAnchorElement).href;
              if (!href) return;
              try {
                const cleanHref = href.split(/[?#]/)[0].toLowerCase();
                if (mediaExts.some((ext) => cleanHref.endsWith(ext))) {
                  const type = cleanHref.endsWith('.mp3') || cleanHref.endsWith('.wav') || cleanHref.endsWith('.ogg') ? 'audio' : 'video';
                  assets.push({ url: new URL(href, document.baseURI).href, type });
                } else if (cleanHref.endsWith('.pdf')) {
                  assets.push({ url: new URL(href, document.baseURI).href, type: 'pdf' });
                }
              } catch {
                // ignore
              }
            });

            // Deduplicate by URL
            const seen = new Set<string>();
            return assets.filter((a) => {
              if (seen.has(a.url)) return false;
              seen.add(a.url);
              return true;
            });
          },
        },
        (results) => {
          if (results && results[0]?.result) {
            setAssets(results[0].result as Asset[]);
          }
          setScanning(false);
        }
      );
    });
  }, []);

  const toggle = (i: number) => {
    const next = new Set(selected);
    next.has(i) ? next.delete(i) : next.add(i);
    setSelected(next);
  };

  const selectAll = () => {
    if (selected.size === assets.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(assets.map((_, i) => i)));
    }
  };

  const download = () => {
    const toSend = assets.filter((_a, i) => selected.has(i));
    if (toSend.length === 0) return;

    setDownloading(true);
    setStatusMessage('Bundling ZIP & downloading...');

    chrome.runtime.sendMessage({ action: 'downloadAssets', assets: toSend }, (response) => {
      setDownloading(false);
      if (chrome.runtime.lastError || response?.status === 'error') {
        setStatusMessage('Error: ' + (chrome.runtime.lastError?.message || response?.error || 'Download failed'));
      } else {
        setStatusMessage('ZIP download started!');
        setTimeout(() => setStatusMessage(null), 3500);
      }
    });
  };

  if (scanning) {
    return (
      <div className="p-3 text-xs text-slate-400 bg-slate-900/60 rounded-xl border border-slate-800">
        Scanning page for media…
      </div>
    );
  }

  return (
    <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-slate-200">
          Media Assets ({assets.length})
        </h2>
        {assets.length > 0 && (
          <button
            onClick={selectAll}
            disabled={downloading}
            className="text-[10px] text-brand-400 hover:text-brand-300 transition-colors"
          >
            {selected.size === assets.length ? 'Deselect all' : 'Select all'}
          </button>
        )}
      </div>

      {assets.length === 0 ? (
        <p className="text-xs text-slate-500">No media found on this page.</p>
      ) : (
        <div className="max-h-40 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
          {assets.map((a, i) => (
            <label
              key={i}
              className="flex items-center gap-2 text-xs text-slate-300 hover:text-white cursor-pointer py-1 px-1.5 rounded hover:bg-slate-800/50 transition-colors"
            >
              <input
                type="checkbox"
                checked={selected.has(i)}
                onChange={() => toggle(i)}
                disabled={downloading}
                className="accent-indigo-500 rounded"
              />
              <span className="uppercase text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 w-12 text-center shrink-0">
                {a.type}
              </span>
              <span className="truncate flex-1 font-mono text-[11px]">
                {a.type === 'canvas' ? 'Canvas drawing/capture' : decodeURIComponent(a.url.split('/').pop()?.split(/[?#]/)[0] || a.url)}
              </span>
            </label>
          ))}
        </div>
      )}

      {statusMessage && (
        <div className="mt-2 text-[11px] text-brand-400 font-medium">
          {statusMessage}
        </div>
      )}

      {assets.length > 0 && (
        <button
          className="mt-3 w-full bg-indigo-600 text-white text-xs font-medium px-4 py-2 rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          onClick={download}
          disabled={selected.size === 0 || downloading}
        >
          {downloading ? (
            <>
              <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Packaging ZIP...</span>
            </>
          ) : (
            `Download ${selected.size} selected as ZIP`
          )}
        </button>
      )}
    </div>
  );
};

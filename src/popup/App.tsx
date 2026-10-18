import React, { useEffect, useState } from 'react';
import { DiscoveredResource, RestrictionReport, ResourceType } from '../shared/types';
import { ScoreCard } from './components/ScoreCard';
import { FilterToolbar } from './components/FilterToolbar';
import { ResourceGrid } from './components/ResourceGrid';
import { DownloadBar } from './components/DownloadBar';
import { NoticeFooter } from './components/NoticeFooter';
import { Shield, RefreshCw, AlertCircle, Key } from 'lucide-react';

export default function App() {
  const [resources, setResources] = useState<DiscoveredResource[]>([]);
  const [restrictionReport, setRestrictionReport] = useState<RestrictionReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [hasHostPermission, setHasHostPermission] = useState<boolean>(true);

  // Filters & Selection
  const [selectedType, setSelectedType] = useState<ResourceType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ZIP Packaging Progress
  const [isZipping, setIsZipping] = useState<boolean>(false);
  const [zipProgress, setZipProgress] = useState<{ current: number; total: number; filename: string } | null>(null);

  useEffect(() => {
    scanCurrentTab();

    // Listen for ZIP progress and HLS segment progress messages
    const listener = (message: any) => {
      if (message.type === 'ZIP_PROGRESS' || message.type === 'HLS_PROGRESS') {
        setZipProgress(message.payload);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const scanCurrentTab = async () => {
    setLoading(true);
    setError(null);

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) {
        setError('No active tab available.');
        setLoading(false);
        return;
      }

      if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.includes('chromewebstore.google.com'))) {
        setError('ResourceScout cannot run on internal Chrome pages or Chrome Web Store pages. Please open a web page or PDF document tab.');
        setLoading(false);
        return;
      }

      // Check optional host permissions
      const granted = await chrome.permissions.contains({ origins: ['<all_urls>'] });
      setHasHostPermission(granted);

      // Send SCAN_PAGE message to content script
      chrome.tabs.sendMessage(tab.id, { type: 'SCAN_PAGE' }, (response) => {
        if (chrome.runtime.lastError || !response) {
          // Fallback: try injecting content scripts dynamically if not present
          injectAndScan(tab.id!);
        } else {
          setResources(response.resources || []);
          setRestrictionReport(response.restrictionReport || null);
          setLoading(false);
        }
      });
    } catch (err: any) {
      setError(err.message || 'Scanning failed.');
      setLoading(false);
    }
  };

  const injectAndScan = async (tabId: number) => {
    try {
      // 1. Inject mainWorld script into MAIN world
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['mainWorld.js'],
        world: 'MAIN' as any,
      }).catch(() => {});

      // 2. Inject content script into ISOLATED world
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js'],
      });

      // 3. Allow small 150ms delay for content script listener setup
      setTimeout(() => {
        chrome.tabs.sendMessage(tabId, { type: 'SCAN_PAGE' }, (response) => {
          if (response) {
            setResources(response.resources || []);
            setRestrictionReport(response.restrictionReport || null);
            setError(null);
          } else {
            setError('Could not establish connection with page context.');
          }
          setLoading(false);
        });
      }, 150);
    } catch (err: any) {
      setError('Script injection restricted on this page.');
      setLoading(false);
    }
  };

  const requestHostPermissions = () => {
    chrome.permissions.request({ origins: ['<all_urls>'] }, (granted) => {
      setHasHostPermission(granted);
      if (granted) scanCurrentTab();
    });
  };

  // Filtered resources
  const filteredResources = resources.filter((res) => {
    const matchesType = selectedType === 'all' || res.type === selectedType;
    const matchesSearch =
      !searchQuery ||
      res.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (res.title && res.title.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesSearch;
  });

  const allSelected =
    filteredResources.length > 0 && filteredResources.every((r) => selectedIds.has(r.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      const next = new Set(selectedIds);
      filteredResources.forEach((r) => {
        if (r.status !== 'drm_locked') next.add(r.id);
      });
      setSelectedIds(next);
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleDownloadSingle = (res: DiscoveredResource) => {
    chrome.runtime.sendMessage({
      type: 'DOWNLOAD_RESOURCE',
      payload: { resource: res },
    });
  };

  const handleDownloadSelected = () => {
    const selected = resources.filter((r) => selectedIds.has(r.id));
    if (selected.length === 1) {
      handleDownloadSingle(selected[0]);
    } else {
      handleDownloadZip(selected);
    }
  };

  const handleDownloadZip = (targets = resources) => {
    const downloadable = targets.filter((r) => r.status !== 'drm_locked');
    if (downloadable.length === 0) return;

    setIsZipping(true);
    setZipProgress(null);

    chrome.runtime.sendMessage(
      {
        type: 'DOWNLOAD_BULK_ZIP',
        payload: { resources: downloadable, zipName: `ResourceScout_${Date.now()}` },
      },
      () => {
        setIsZipping(false);
      }
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="px-3 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-lg bg-brand-500/20 border border-brand-500/30 text-brand-400">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white leading-tight">ResourceScout</h1>
            <p className="text-[10px] text-slate-400">Restriction Detector & Exporter</p>
          </div>
        </div>

        <button
          onClick={scanCurrentTab}
          disabled={loading}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          title="Rescan Page"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-3 space-y-3">
        {!hasHostPermission && (
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between text-xs text-amber-200">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Grant host access for deep webRequest logging?</span>
            </div>
            <button
              onClick={requestHostPermissions}
              className="px-2 py-1 bg-amber-500 text-slate-950 font-semibold rounded text-[11px] hover:bg-amber-400 transition-colors"
            >
              Grant
            </button>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Restriction Score Card */}
        <ScoreCard report={restrictionReport} />

        {/* Filter Toolbar */}
        <FilterToolbar
          selectedType={selectedType}
          onSelectType={setSelectedType}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          allSelected={allSelected}
          onToggleSelectAll={toggleSelectAll}
          totalCount={resources.length}
          filteredCount={filteredResources.length}
        />

        {/* Resource Thumbnails Grid */}
        <ResourceGrid
          resources={filteredResources}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onDownloadSingle={handleDownloadSingle}
        />
      </main>

      {/* Bottom Download Bar */}
      <div className="p-3 bg-slate-950 border-t border-slate-800/80 shrink-0 space-y-2">
        <DownloadBar
          selectedCount={selectedIds.size}
          totalCount={resources.length}
          onDownloadSelected={handleDownloadSelected}
          onDownloadZip={() => handleDownloadZip(resources)}
          isZipping={isZipping}
          zipProgress={zipProgress}
        />
      </div>

      {/* Footer Warning Notice */}
      <NoticeFooter />
    </div>
  );
}

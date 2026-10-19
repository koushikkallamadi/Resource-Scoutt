import React from 'react';
import { DiscoveredResource } from '../../shared/types';
import { FileText, Download, CheckCircle2, Circle, Eye, ExternalLink, Lock } from 'lucide-react';

interface Props {
  resources: DiscoveredResource[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onDownloadSingle: (resource: DiscoveredResource) => void;
}

export const ResourceGrid: React.FC<Props> = ({
  resources,
  selectedIds,
  onToggleSelect,
  onDownloadSingle,
}) => {
  if (resources.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-4 text-center border border-dashed border-slate-800 rounded-xl bg-slate-900/30">
        <FileText className="w-8 h-8 text-slate-600 mb-2" />
        <p className="text-xs text-slate-400 font-medium">No resources found matching filter criteria.</p>
        <p className="text-[11px] text-slate-500 mt-1">Try refreshing or adjusting your search query.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 max-h-[260px] overflow-y-auto pr-1">
      {resources.map((res) => {
        const isSelected = selectedIds.has(res.id);
        const isPdf = res.type === 'pdf';
        const isCanvas = res.type === 'canvas';
        const isDrmLocked = res.status === 'drm_locked';

        return (
          <div
            key={res.id}
            onClick={() => !isDrmLocked && onToggleSelect(res.id)}
            className={`group relative flex flex-col justify-between p-2 rounded-xl border transition-all cursor-pointer select-none overflow-hidden ${
              isSelected
                ? 'bg-slate-900 border-brand-500 shadow-md shadow-brand-500/10'
                : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900'
            } ${isDrmLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {/* Top Bar: Checkbox & Type Badge */}
            <div className="flex items-center justify-between z-10">
              <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-950/80 border border-slate-800 text-slate-300">
                {res.type}
              </span>

              {isDrmLocked ? (
                <Lock className="w-4 h-4 text-red-400" />
              ) : isSelected ? (
                <CheckCircle2 className="w-4 h-4 text-brand-400 fill-brand-400/20" />
              ) : (
                <Circle className="w-4 h-4 text-slate-600 group-hover:text-slate-400" />
              )}
            </div>

            {/* Thumbnail / Preview Area */}
            <div className="my-2 h-20 w-full rounded-lg bg-slate-950 border border-slate-800/60 flex items-center justify-center overflow-hidden relative">
              {isPdf ? (
                <div className="flex flex-col items-center justify-center p-2 text-center">
                  <FileText className="w-8 h-8 text-rose-400 mb-1" />
                  <span className="text-[10px] text-slate-300 line-clamp-1 break-all font-medium">
                    {res.title || 'PDF Document'}
                  </span>
                </div>
              ) : res.url.startsWith('data:') || res.url.startsWith('http') || res.dataUrl ? (
                <img
                  src={res.dataUrl || res.url}
                  alt={res.title || res.type}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback on broken image
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <FileText className="w-6 h-6 text-slate-500" />
              )}
            </div>

            {/* Bottom Meta & Single Download Button */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[10px] text-slate-400">
              <div className="truncate pr-1">
                {res.dimensions && (
                  <div>
                    {res.dimensions.width}×{res.dimensions.height}
                  </div>
                )}
                {res.size ? (
                  <div>{(res.size / 1024).toFixed(0)} KB</div>
                ) : (
                  <div className="capitalize">{res.source}</div>
                )}
              </div>

              {!isDrmLocked && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownloadSingle(res);
                  }}
                  className="p-1 rounded bg-slate-800 hover:bg-brand-600 text-slate-300 hover:text-white transition-colors"
                  title="Download File"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

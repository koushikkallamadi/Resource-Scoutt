import React from 'react';
import { Download, FileArchive, Loader2 } from 'lucide-react';

interface Props {
  selectedCount: number;
  totalCount: number;
  onDownloadSelected: () => void;
  onDownloadZip: () => void;
  isZipping: boolean;
  zipProgress?: { current: number; total: number; filename: string } | null;
}

export const DownloadBar: React.FC<Props> = ({
  selectedCount,
  totalCount,
  onDownloadSelected,
  onDownloadZip,
  isZipping,
  zipProgress,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 space-y-2">
      {/* ZIP Progress Bar */}
      {isZipping && (
        <div className="space-y-1 text-xs">
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1.5 font-medium">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-400" />
              Packaging ZIP Archive...
            </span>
            <span className="font-mono">
              {zipProgress ? `${zipProgress.current}/${zipProgress.total}` : 'Preparing'}
            </span>
          </div>
          <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
            <div
              className="bg-brand-500 h-full transition-all duration-200"
              style={{
                width: zipProgress
                  ? `${Math.round((zipProgress.current / zipProgress.total) * 100)}%`
                  : '10%',
              }}
            ></div>
          </div>
        </div>
      )}

      {/* Buttons Row */}
      <div className="flex items-center gap-2">
        <button
          disabled={selectedCount === 0 || isZipping}
          onClick={onDownloadSelected}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-brand-600 hover:bg-brand-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-semibold rounded-lg text-xs transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" />
          <span>Download Selected ({selectedCount})</span>
        </button>

        <button
          disabled={totalCount === 0 || isZipping}
          onClick={onDownloadZip}
          className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-850 disabled:text-slate-600 text-slate-200 font-semibold rounded-lg text-xs border border-slate-700/60 transition-colors"
        >
          <FileArchive className="w-4 h-4 text-amber-400" />
          <span>ZIP All</span>
        </button>
      </div>
    </div>
  );
};

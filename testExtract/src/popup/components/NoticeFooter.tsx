import React from 'react';
import { ShieldCheck } from 'lucide-react';

export const NoticeFooter: React.FC = () => {
  return (
    <footer className="px-3 py-2 bg-slate-900/90 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-1.5 text-slate-400">
        <ShieldCheck className="w-3.5 h-3.5 text-brand-500 shrink-0" />
        <span>Download only content you have the right to save.</span>
      </div>
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          chrome.runtime.openOptionsPage();
        }}
        className="text-slate-400 hover:text-brand-400 underline transition-colors"
      >
        Settings
      </a>
    </footer>
  );
};

import React from 'react';
import { ResourceType } from '../../shared/types';
import { Search, Image as ImageIcon, FileText, Film, Layout, CheckSquare, Square } from 'lucide-react';

interface Props {
  selectedType: ResourceType | 'all';
  onSelectType: (type: ResourceType | 'all') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  allSelected: boolean;
  onToggleSelectAll: () => void;
  totalCount: number;
  filteredCount: number;
  categoryCounts?: Record<string, number>;
}

export const FilterToolbar: React.FC<Props> = ({
  selectedType,
  onSelectType,
  searchQuery,
  onSearchChange,
  allSelected,
  onToggleSelectAll,
  totalCount,
  filteredCount,
  categoryCounts,
}) => {
  const categories: { type: ResourceType | 'all'; label: string; icon: React.ReactNode }[] = [
    { type: 'all', label: 'All', icon: null },
    { type: 'pdf', label: 'PDFs', icon: <FileText className="w-3 h-3" /> },
    { type: 'image', label: 'Images', icon: <ImageIcon className="w-3 h-3" /> },
    { type: 'canvas', label: 'Canvas', icon: <Layout className="w-3 h-3" /> },
    { type: 'media', label: 'Media', icon: <Film className="w-3 h-3" /> },
  ];

  return (
    <div className="space-y-2 py-1">
      {/* Category Pills */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar text-xs">
        {categories.map((cat) => {
          const count = categoryCounts ? categoryCounts[cat.type] : undefined;
          return (
            <button
              key={cat.type}
              onClick={() => onSelectType(cat.type)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-medium whitespace-nowrap transition-all ${
                selectedType === cat.type
                  ? 'bg-brand-600 text-white border-brand-500 shadow-sm'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {cat.icon}
              <span>{cat.label}</span>
              {count !== undefined && (
                <span className={`text-[10px] px-1 py-0.2 rounded-full ${
                  selectedType === cat.type ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search Input & Select All Row */}
      <div className="flex items-center justify-between gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search resources..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-8 pr-3 py-1 bg-slate-900/90 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>

        <button
          onClick={onToggleSelectAll}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-300 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg shrink-0 transition-colors"
        >
          {allSelected ? (
            <CheckSquare className="w-3.5 h-3.5 text-brand-400" />
          ) : (
            <Square className="w-3.5 h-3.5 text-slate-500" />
          )}
          <span>Select All ({filteredCount})</span>
        </button>
      </div>
    </div>
  );
};

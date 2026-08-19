import React from 'react';
import { Filter, FileSpreadsheet, Trash2, Sparkles } from 'lucide-react';

interface FilterBarProps {
  showNoWebsiteOnly: boolean;
  onToggleFilter: (val: boolean) => void;
  onExport: () => void;
  onClear: () => void;
  totalResults: number;
  filteredResults: number;
}

const FilterBar: React.FC<FilterBarProps> = ({ 
  showNoWebsiteOnly, 
  onToggleFilter, 
  onExport,
  onClear,
  totalResults,
  filteredResults
}) => {
  return (
    <div className="sticky top-24 z-30 flex flex-col md:flex-row md:items-center justify-between gap-4 p-2 rounded-2xl bg-white/80 backdrop-blur-lg border border-white/40 shadow-glass">
      
      {/* Filter Toggle */}
      <div className="flex items-center p-1">
        <label className={`relative flex items-center cursor-pointer select-none p-1 pr-4 rounded-xl transition-all duration-300 ${showNoWebsiteOnly ? 'bg-orange-50 border border-orange-100' : 'hover:bg-slate-50'}`}>
          <input 
            type="checkbox" 
            className="sr-only" 
            checked={showNoWebsiteOnly}
            onChange={(e) => onToggleFilter(e.target.checked)}
          />
          <div className={`w-12 h-7 rounded-full shadow-inner transition-colors duration-300 flex items-center px-1 ${showNoWebsiteOnly ? 'bg-orange-500' : 'bg-slate-200'}`}>
            <div className={`bg-white w-5 h-5 rounded-full shadow-sm transform transition-transform duration-300 ${showNoWebsiteOnly ? 'translate-x-5' : 'translate-x-0'}`}></div>
          </div>
          <div className="ml-3 flex flex-col">
             <span className={`text-sm font-bold transition-colors ${showNoWebsiteOnly ? 'text-orange-700' : 'text-slate-600'}`}>
               No Website Mode
             </span>
             <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
               {showNoWebsiteOnly ? 'Active' : 'Inactive'}
             </span>
          </div>
        </label>
      </div>

      {/* Stats & Actions */}
      <div className="flex items-center gap-2 px-2 pb-2 md:pb-0">
        <div className="bg-slate-100/50 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 uppercase tracking-wide mr-2 border border-slate-100">
          {filteredResults} / {totalResults} Leads
        </div>
        
        <div className="h-8 w-px bg-slate-200 mx-1 hidden md:block"></div>

        <button
          onClick={onClear}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-slate-600 text-sm font-semibold rounded-xl hover:bg-red-50 hover:text-red-600 hover:border-red-200 border border-slate-200 transition-all active:scale-95"
          title="Clear all results"
        >
          <Trash2 className="h-4 w-4" />
          <span className="hidden sm:inline">Clear</span>
        </button>

        <button
          onClick={onExport}
          disabled={filteredResults === 0}
          className="group relative overflow-hidden flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl active:scale-95"
        >
           {/* Shine effect */}
          <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
          <FileSpreadsheet className="h-4 w-4 relative z-10" />
          <span className="relative z-10">Export CSV</span>
        </button>
      </div>
    </div>
  );
};

export default FilterBar;
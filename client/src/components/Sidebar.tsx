import React, { useState } from 'react';
import { 
  Folder, 
  Megaphone, 
  Package, 
  Video, 
  Clapperboard, 
  Rocket, 
  Mic2, 
  Layers, 
  Target, 
  ChevronDown,
  Check
} from 'lucide-react';
import { CollectionType, MediaType } from '../types/creative';

interface SidebarProps {
  activeCollection: CollectionType | 'All';
  onSelectCollection: (col: CollectionType | 'All') => void;
  mediaTypeFilter: MediaType | 'all';
  onSelectMediaType: (type: MediaType | 'all') => void;
  onOpenMyContent: () => void;
  isMyContentOpen?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeCollection,
  onSelectCollection,
  mediaTypeFilter,
  onSelectMediaType,
  onOpenMyContent,
  isMyContentOpen = false,
}) => {
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState<boolean>(false);

  // TODO(API): Keep this list in sync with the catalog response (or load the
  // available collections from the API) once categories are no longer fixed.
  const collections: { name: CollectionType; icon: React.ReactNode }[] = [
    { name: 'Ad prompts', icon: <Megaphone className="w-4 h-4 text-purple-400" /> },
    { name: 'Product demos', icon: <Package className="w-4 h-4 text-purple-400" /> },
    { name: 'Motion & video', icon: <Video className="w-4 h-4 text-purple-400" /> },
    { name: 'Reels & shorts', icon: <Clapperboard className="w-4 h-4 text-purple-400" /> },
    { name: 'Launch teasers', icon: <Rocket className="w-4 h-4 text-purple-400" /> },
    { name: 'Voice & audio', icon: <Mic2 className="w-4 h-4 text-purple-400" /> },
    { name: 'Thumbnails', icon: <Layers className="w-4 h-4 text-[#ec008c]" /> },
    { name: 'Campaign assets', icon: <Target className="w-4 h-4 text-purple-400" /> },
  ];

  return (
    <aside className="w-56 lg:w-60 shrink-0 bg-[#0b0a13] border-r border-white/[0.06] p-4 flex flex-col justify-between text-slate-300 select-none">
      <div className="space-y-6">
        {/* Top: My content button */}
        <div>
          <button
            // TODO(API): Wire this callback to a My Content request when this
            // sidebar is rendered by the app.
            onClick={onOpenMyContent}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
              isMyContentOpen 
                ? 'bg-purple-950/60 text-[#ec008c]' 
                : 'text-slate-300 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Folder className="w-4 h-4 text-slate-400" />
            <span>My content</span>
          </button>
        </div>

        {/* Collections Section */}
        <div className="space-y-1">
          <p className="px-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            COLLECTIONS
          </p>
          <div className="space-y-0.5">
            {collections.map((col) => {
              const isActive = activeCollection === col.name && !isMyContentOpen;
              return (
                <button
                  key={col.name}
                  onClick={() => onSelectCollection(col.name)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all text-left cursor-pointer ${
                    isActive
                      ? 'bg-white/[0.08] text-white font-semibold border-l-2 border-[#ec008c]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
                  }`}
                >
                  <span className="shrink-0">{col.icon}</span>
                  <span className="truncate">{col.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Filters Section */}
        <div className="space-y-2 pt-2 border-t border-white/[0.06]">
          <p className="px-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Filters
          </p>
          <div className="relative px-1">
            <button
              onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-slate-300 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] transition-colors cursor-pointer"
            >
              <span>
                {mediaTypeFilter === 'all' ? 'Media type' : mediaTypeFilter === 'video' ? 'Video only' : 'Image only'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Dropdown Options */}
            {isFilterDropdownOpen && (
              <div 
                className="absolute top-full left-1 right-1 mt-1 bg-[#151324] border border-purple-900/40 rounded-xl p-1 shadow-2xl z-30 space-y-0.5"
                onMouseLeave={() => setIsFilterDropdownOpen(false)}
              >
                {[
                  { value: 'all', label: 'All media types' },
                  { value: 'video', label: 'Video formats' },
                  { value: 'image', label: 'Image formats' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      onSelectMediaType(opt.value as MediaType | 'all');
                      setIsFilterDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left ${
                      mediaTypeFilter === opt.value
                        ? 'bg-purple-950 text-[#ec008c] font-semibold'
                        : 'text-slate-300 hover:bg-white/[0.05]'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {mediaTypeFilter === opt.value && <Check className="w-3 h-3 text-[#ec008c]" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};

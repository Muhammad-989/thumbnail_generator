import React, { useEffect, useState } from 'react';
import { Search, ArrowRight, ChevronDown, ChevronLeft, Check } from 'lucide-react';
import { getCategories } from '../api';

interface HeroSectionProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  resultCount: number;
  activeCollectionName?: string;
  onNavigateVisuals?: () => void;
  onPromptDropdownClick?: (category: string) => void;
  onStepClick?: (stepNumber: number) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  searchQuery,
  onSearchChange,
  resultCount,
  activeCollectionName = 'Thumbnails',
  onNavigateVisuals,
  onPromptDropdownClick,
  onStepClick,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [categories, setCategories] = useState<string[]>([]);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch((error: unknown) => {
        setCategoryError(error instanceof Error ? error.message : 'Failed to load categories');
      });
  }, []);
  return (
    <div className="space-y-6 pt-1 pb-2">
      {/* Breadcrumb Navigation Bar matching screenshot */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm text-slate-400 border-b border-white/[0.08] pb-3">
        <div className="flex items-center gap-3 relative">
          <div className="relative">
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-1 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <span>Prompts</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Prompts Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-[#16142a] border border-white/[0.12] rounded-xl shadow-2xl py-1.5 z-50">
                {(categoryError ? ['Thumbnails', 'All prompts'] : categories).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      if (onPromptDropdownClick) onPromptDropdownClick(cat);
                      setIsDropdownOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span>{cat}</span>
                    {activeCollectionName === cat && <Check className="w-3.5 h-3.5 text-[#ec008c]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <span className="text-slate-600">|</span>

          <button 
            onClick={onNavigateVisuals}
            className="flex items-center gap-1 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Thumbnails & visuals</span>
          </button>

          {/* Active Tab Indicator with magenta underline */}
          <div className="relative font-bold text-white pl-2">
            <span>{activeCollectionName}</span>
            <div className="absolute -bottom-3 left-2 right-0 h-0.5 bg-[#ec008c] rounded-full" />
          </div>
        </div>
      </div>

      {/* Main Title & Subtitle */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
          Create better videos, images, and audio faster
        </h1>
        <p className="text-sm sm:text-base text-slate-400 max-w-3xl leading-relaxed">
          Use ready-made prompts for video ads, social clips, product visuals, thumbnails, voiceovers, and sound.
        </p>
      </div>

      {/* 3 Step Instruction Cards matching screenshot */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Step 1 */}
        <div 
          onClick={() => onStepClick && onStepClick(1)}
          className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-pink-500/30 transition-all cursor-pointer group"
        >
          <div className="w-6 h-6 rounded-full bg-[#ec008c] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm group-hover:scale-105 transition-transform">
            1
          </div>
          <div>
            <p className="text-xs sm:text-sm font-bold text-white group-hover:text-pink-300 transition-colors">Choose</p>
            <p className="text-[11px] sm:text-xs text-slate-400">Pick a media type or creator use case.</p>
          </div>
        </div>

        {/* Step 2 */}
        <div 
          onClick={() => onStepClick && onStepClick(2)}
          className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-pink-500/30 transition-all cursor-pointer group"
        >
          <div className="w-6 h-6 rounded-full bg-[#ec008c] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm group-hover:scale-105 transition-transform">
            2
          </div>
          <div>
            <p className="text-xs sm:text-sm font-bold text-white group-hover:text-pink-300 transition-colors">Customize</p>
            <p className="text-[11px] sm:text-xs text-slate-400">Open a pack and adjust the prompt.</p>
          </div>
        </div>

        {/* Step 3 */}
        <div 
          onClick={() => onStepClick && onStepClick(3)}
          className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-pink-500/30 transition-all cursor-pointer group"
        >
          <div className="w-6 h-6 rounded-full bg-[#ec008c] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm group-hover:scale-105 transition-transform">
            3
          </div>
          <div>
            <p className="text-xs sm:text-sm font-bold text-white group-hover:text-pink-300 transition-colors">Create</p>
            <p className="text-[11px] sm:text-xs text-slate-400">Use it in Video & Image Playground.</p>
          </div>
        </div>
      </div>

      {/* Search Input & Results Count Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        {/* Search Bar Input */}
        <div className="relative flex-1 max-w-xl">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search thumbnails video clips"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#ec008c]/70 focus:bg-white/[0.06] transition-all"
          />
          <button 
            type="button"
            className="btn-analyze-gradient w-7 h-7 rounded-lg text-white absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center transition-all cursor-pointer hover:scale-105 shadow-md"
            title="Search"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Results Count Text matching screenshot: "11 results" */}
        <div className="text-xs font-semibold text-slate-400 shrink-0 font-mono">
          <span>{resultCount} results</span>
        </div>
      </div>
    </div>
  );
};

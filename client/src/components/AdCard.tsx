import React, { useState } from 'react';
import { 
  FileText, 
  Video, 
  Image as ImageIcon, 
  Heart, 
  Download, 
  Share2,
  Wand2,
  Copy,
  Check
} from 'lucide-react';
import { PromptPack } from '../types/creative';

interface AdCardProps {
  creative: PromptPack;
  onOpenInsideView: (creative: PromptPack) => void;
  onToggleLike: (id: string, e: React.MouseEvent) => void;
  onDownload: (creative: PromptPack, e: React.MouseEvent) => void;
  onShare: (creative: PromptPack, e: React.MouseEvent) => void;
  onQuickUsePrompt?: (promptText: string, e: React.MouseEvent) => void;
  isLiked?: boolean;
}

export const AdCard: React.FC<AdCardProps> = ({
  creative,
  onOpenInsideView,
  onToggleLike,
  onDownload,
  onShare,
  onQuickUsePrompt,
  isLiked = false,
}) => {
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [hoveredButton, setHoveredButton] = useState<'save' | 'download' | 'share' | 'copy' | 'use' | null>(null);
  const [copiedQuick, setCopiedQuick] = useState<boolean>(false);

  const mainPromptText = creative.variants[0]?.prompt || creative.tagline;

  const handleQuickCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(mainPromptText);
    setCopiedQuick(true);
    setTimeout(() => setCopiedQuick(false), 2000);
  };

  const handleQuickUse = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onQuickUsePrompt) {
      onQuickUsePrompt(mainPromptText, e);
    } else {
      onOpenInsideView(creative);
    }
  };

  return (
    <div
      onClick={() => onOpenInsideView(creative)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setHoveredButton(null);
      }}
      className="group relative bg-[#121021] hover:bg-[#161428] border border-white/[0.08] hover:border-pink-500/50 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-pink-500/10 transition-all duration-300 flex flex-col cursor-pointer select-none"
    >
      {/* Thumbnail Image Box */}
      <div className="relative w-full aspect-square overflow-hidden bg-black/60">
        <img
          src={creative.image}
          alt={creative.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
        />

        {/* Subtle Gradient Scrim for Contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#121021]/80 via-black/20 to-black/30 pointer-events-none group-hover:opacity-80 transition-opacity" />

        {/* Top Badges (Matching Screenshot Exactly) */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-10 pointer-events-none">
          {/* Top-Left: Document/Variant Count Badge */}
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-[11px] font-semibold text-slate-200 border border-white/10 shadow-sm">
            <FileText className="w-3 h-3 text-slate-300" />
            <span>{creative.itemCount}</span>
          </div>

          {/* Top-Right: Media Type Magenta Circle Badge */}
          <div className="w-6 h-6 rounded-full bg-[#ec008c] text-white flex items-center justify-center shadow-md">
            {creative.mediaType === 'video' ? (
              <Video className="w-3 h-3 text-white" />
            ) : (
              <ImageIcon className="w-3 h-3 text-white" />
            )}
          </div>
        </div>

        {/* 3 Circular Action Icons ALWAYS SHOWN in the image, with enhanced hover effects */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-20 pointer-events-auto">
          {/* Row of 3 Icons (Heart, Download, Share) */}
          <div className="flex items-center justify-center gap-2.5">
            {/* 1. Heart / Save Button */}
            <div className="relative flex flex-col items-center">
              <button
                onClick={(e) => onToggleLike(creative.id, e)}
                onMouseEnter={() => setHoveredButton('save')}
                onMouseLeave={() => setHoveredButton(null)}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer backdrop-blur-md shadow-xl ${
                  isLiked 
                    ? 'bg-[#ec008c] text-white scale-105 shadow-pink-500/40' 
                    : 'bg-black/70 hover:bg-black/95 text-slate-200 hover:text-white border border-white/20 hover:border-pink-400 hover:scale-110'
                }`}
                title="Save prompt"
              >
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-current text-white' : ''}`} />
              </button>
              {hoveredButton === 'save' && (
                <span className="absolute -top-7 bg-black/90 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md border border-white/10 whitespace-nowrap shadow-lg animate-in fade-in zoom-in-95 duration-150">
                  {isLiked ? 'Saved' : 'Save'}
                </span>
              )}
            </div>

            {/* 2. Download Button */}
            <div className="relative flex flex-col items-center">
              <button
                onClick={(e) => onDownload(creative, e)}
                onMouseEnter={() => setHoveredButton('download')}
                onMouseLeave={() => setHoveredButton(null)}
                className="w-9 h-9 rounded-full bg-black/70 hover:bg-black/95 text-slate-200 hover:text-white border border-white/20 hover:border-pink-400 flex items-center justify-center transition-all duration-200 cursor-pointer backdrop-blur-md shadow-xl hover:scale-110"
                title="Download prompt"
              >
                <Download className="w-4 h-4" />
              </button>
              {hoveredButton === 'download' && (
                <span className="absolute -top-7 bg-black/90 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md border border-white/10 whitespace-nowrap shadow-lg animate-in fade-in zoom-in-95 duration-150">
                  Download
                </span>
              )}
            </div>

            {/* 3. Share Button */}
            <div className="relative flex flex-col items-center">
              <button
                onClick={(e) => onShare(creative, e)}
                onMouseEnter={() => setHoveredButton('share')}
                onMouseLeave={() => setHoveredButton(null)}
                className="w-9 h-9 rounded-full bg-black/70 hover:bg-black/95 text-slate-200 hover:text-white border border-white/20 hover:border-pink-400 flex items-center justify-center transition-all duration-200 cursor-pointer backdrop-blur-md shadow-xl hover:scale-110"
                title="Share link"
              >
                <Share2 className="w-4 h-4" />
              </button>
              {hoveredButton === 'share' && (
                <span className="absolute -top-7 bg-black/90 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md border border-white/10 whitespace-nowrap shadow-lg animate-in fade-in zoom-in-95 duration-150">
                  Share
                </span>
              )}
            </div>
          </div>

          {/* "And some more when hover do this": Extra Action Buttons with Screenshot Button Gradient! */}
          <div 
            className={`flex items-center gap-2 transition-all duration-200 ${
              isHovered 
                ? 'opacity-100 translate-y-0 pointer-events-auto' 
                : 'opacity-0 translate-y-2 pointer-events-none'
            }`}
          >
            {/* Primary CTA: "Use prompt" with exact button gradient */}
            <button
              onClick={handleQuickUse}
              className="btn-analyze-gradient px-3.5 py-1.5 text-xs text-white font-bold tracking-wide shadow-xl cursor-pointer flex items-center gap-1.5 hover:scale-105 transition-transform"
            >
              <Wand2 className="w-3.5 h-3.5 text-white" />
              <span>Use prompt</span>
            </button>

            {/* Secondary CTA: Quick Copy prompt */}
            <button
              onClick={handleQuickCopy}
              className="px-2.5 py-1.5 rounded-full bg-black/80 hover:bg-black text-slate-200 hover:text-white border border-white/20 hover:border-white/40 text-[11px] font-semibold flex items-center gap-1 backdrop-blur-md transition-colors cursor-pointer"
              title="Copy prompt text"
            >
              {copiedQuick ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-300">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Card Content Matching Screenshot */}
      <div className="p-3.5 flex-1 flex flex-col justify-between space-y-1">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-pink-300 transition-colors line-clamp-1">
            {creative.title}
          </h3>
          <p className="text-xs text-slate-400 line-clamp-2 mt-0.5 leading-snug">
            {creative.tagline}
          </p>
        </div>
      </div>
    </div>
  );
};

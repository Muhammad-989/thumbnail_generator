import React, { useState } from 'react';
import { 
  ChevronLeft, 
  Heart, 
  Download, 
  Share2, 
  Play, 
  Pause,
  Sparkles,
  Wand2,
  Check,
  Copy
} from 'lucide-react';
import { PromptPack, PromptVariant, RelatedPrompt } from '../types/creative';

interface PromptDetailViewProps {
  pack: PromptPack;
  onBack: () => void;
  onSelectRelatedPrompt: (title: string) => void;
  onUsePrompt: (promptText: string) => void;
  isLiked?: boolean;
  onToggleLike: (id: string, e: React.MouseEvent) => void;
}

export const PromptDetailView: React.FC<PromptDetailViewProps> = ({
  pack,
  onBack,
  onSelectRelatedPrompt,
  onUsePrompt,
  isLiked = false,
  onToggleLike,
}) => {
  // This component receives the selected pack from App. It does not fetch data
  // itself yet; the API migration can either fetch in App or add a detail hook.
  const [selectedVariantIndex, setSelectedVariantIndex] = useState<number>(0);
  const activeVariant: PromptVariant = pack.variants[selectedVariantIndex] || pack.variants[0];
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);
  const [isPlayingPreview, setIsPlayingPreview] = useState<boolean>(false);

  const handleCopyPrompt = () => {
    // Copies the currently selected variant locally; the API is not involved.
    navigator.clipboard.writeText(activeVariant.prompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleDownloadText = () => {
    // Creates a prompt text file locally from the selected variant.
    const element = document.createElement("a");
    const file = new Blob([activeVariant.prompt], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${pack.id}_prompt.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleShareLink = () => {
    // Shares the browser URL. A real API-backed detail route should make this
    // URL contain the prompt ID so another user can load the same pack.
    navigator.clipboard.writeText(window.location.href);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-8 animate-in fade-in duration-200">
      {/* Breadcrumb line matching screenshot: Library > Prompts > [Title] */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <button onClick={onBack} className="hover:text-white transition-colors cursor-pointer">
          Library
        </button>
        <span>&gt;</span>
        <button onClick={onBack} className="hover:text-white transition-colors cursor-pointer">
          Prompts
        </button>
        <span>&gt;</span>
        <span className="text-white font-medium">{pack.title}</span>
      </div>

      {/* Main Two-Column View from Screenshot */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Details, Variants, Prompt Box, More Prompts */}
        <div className="lg:col-span-7 space-y-6">
          {/* Back to prompts link */}
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to prompts</span>
          </button>

          {/* Kicker, Title & Subtitle */}
          <div className="space-y-1">
            <span className="text-xs sm:text-sm font-semibold text-[#ec008c]">
              {pack.kicker}
            </span>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
              {pack.title}
            </h1>
            <p className="text-sm text-slate-400 pt-1">
              {pack.tagline || 'Animate stills while preserving identity and detail.'}
            </p>
          </div>

          {/* Prompt Variants Section */}
          <div className="space-y-2.5">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              PROMPT VARIANTS
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {pack.variants.map((v, idx) => {
                const isActive = selectedVariantIndex === idx;
                return (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariantIndex(idx)}
                    className={`px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#ec008c] text-white shadow-md'
                        : 'bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/[0.08] border border-white/[0.1]'
                    }`}
                  >
                    {v.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* PROMPT Box Card */}
          <div className="bg-[#121021] border border-white/[0.09] rounded-2xl p-5 space-y-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              PROMPT
            </p>

            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-normal">
              {activeVariant.prompt}
            </p>

            {/* Action Buttons Row */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-white/[0.06]">
              {/* Save */}
              <button
                onClick={(e) => onToggleLike(pack.id, e)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                  isLiked 
                    ? 'bg-[#ec008c]/20 text-[#ec008c] border-[#ec008c]' 
                    : 'bg-white/[0.03] text-slate-300 hover:text-white hover:bg-white/[0.07] border-white/[0.15]'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
                <span>{isLiked ? 'Saved' : 'Save'}</span>
              </button>

              {/* Download */}
              <button
                onClick={handleDownloadText}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-white/[0.03] text-slate-300 hover:text-white hover:bg-white/[0.07] border border-white/[0.15] transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>

              {/* Share */}
              <button
                onClick={handleShareLink}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-white/[0.03] text-slate-300 hover:text-white hover:bg-white/[0.07] border border-white/[0.15] transition-all cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{copiedPrompt ? 'Copied Link!' : 'Share'}</span>
              </button>

              {/* Use this prompt - Primary Action Button matching Screenshot */}
              <button
                onClick={() => onUsePrompt(activeVariant.prompt)}
                className="btn-analyze-gradient px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold text-white shadow-md cursor-pointer ml-auto flex items-center gap-2"
              >
                <Wand2 className="w-4 h-4 text-white" />
                <span>Use this prompt</span>
              </button>
            </div>
          </div>

          {/* Metadata: Use case & Works with */}
          <div className="grid grid-cols-2 gap-4 text-xs pt-1">
            <div>
              <p className="text-slate-400 text-[11px] mb-0.5">Use case</p>
              <p className="text-white font-medium">{pack.useCase}</p>
            </div>
            <div>
              <p className="text-slate-400 text-[11px] mb-0.5">Works with</p>
              <p className="text-white font-medium">{pack.worksWith}</p>
            </div>
          </div>

          {/* "More video prompts" / Related Prompts Carousel */}
          <div className="space-y-3 pt-4 border-t border-white/[0.08]">
            <p className="text-xs font-bold text-slate-300">
              More video prompts
            </p>

            <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin">
              {pack.relatedPrompts.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onSelectRelatedPrompt(item.title)}
                  className="w-32 shrink-0 bg-[#121021] hover:bg-[#18162e] border border-white/[0.08] hover:border-pink-500/40 rounded-xl overflow-hidden cursor-pointer transition-all p-2 flex flex-col justify-between space-y-1.5"
                >
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-16 object-cover rounded-lg"
                  />
                  <p className="text-[11px] font-semibold text-white leading-tight line-clamp-2">
                    {item.title}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Result Preview Card matching Screenshot */}
        <div className="lg:col-span-5">
          <div className="bg-[#121021] border border-white/[0.09] rounded-2xl overflow-hidden shadow-2xl p-4 flex flex-col justify-between space-y-4">
            {/* Image Preview with motion preview toggle */}
            <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden bg-black group">
              <img
                src={activeVariant.previewImage || pack.previewImage}
                alt="Result preview"
                className={`w-full h-full object-cover transition-transform duration-700 ${
                  isPlayingPreview ? 'scale-105 brightness-110' : 'scale-100'
                }`}
              />

              {/* TODO(API): Replace this image scale animation with the generated
                  preview URL/status returned by the generation API. */}
              {/* Video Play / Simulation Button */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                <button
                  onClick={() => setIsPlayingPreview(!isPlayingPreview)}
                  className="w-12 h-12 rounded-full bg-white/90 hover:bg-white text-slate-900 flex items-center justify-center shadow-xl transform group-hover:scale-110 transition-transform cursor-pointer"
                >
                  {isPlayingPreview ? (
                    <Pause className="w-5 h-5 fill-slate-900" />
                  ) : (
                    <Play className="w-5 h-5 fill-slate-900 ml-0.5" />
                  )}
                </button>
              </div>

              {/* Live Animation Indicator */}
              {isPlayingPreview && (
                <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md text-[10px] text-pink-300 font-mono flex items-center gap-1.5 border border-pink-500/30">
                  <span className="w-2 h-2 rounded-full bg-[#ec008c] animate-ping" />
                  <span>Previewing 4s Motion Loop</span>
                </div>
              )}
            </div>

            {/* Bottom Caption matching screenshot */}
            <div className="space-y-0.5">
              <p className="text-sm font-bold text-white">Result preview</p>
              <p className="text-xs text-slate-400">A starting point for your next video.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

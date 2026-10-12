import React, { useEffect, useState } from 'react';
import { X, Sparkles, Wand2, Copy, Check } from 'lucide-react';
import { createImageJob, getImageJob, resolveApiUrl } from '../api';

interface PlaygroundModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPrompt: string;
}

export const PlaygroundModal: React.FC<PlaygroundModalProps> = ({
  isOpen,
  onClose,
  initialPrompt,
}) => {
  const [promptText, setPromptText] = useState<string>(initialPrompt);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationProgress, setGenerationProgress] = useState<number>(0);
  const [generatedSuccess, setGeneratedSuccess] = useState<boolean>(false);
  const [aspectRatio, setAspectRatio] = useState<string>('9:16');
  const [copied, setCopied] = useState<boolean>(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // The parent decides whether the modal exists. The modal owns form values,
  // generation progress, and the temporary success state while it is open.
  // Sync a newly selected prompt into the textarea when the modal opens. The
  // dependency on `isOpen` also handles selecting the same prompt again later.
  useEffect(() => {
    if (isOpen) {
      setPromptText(initialPrompt);
      setGeneratedUrl(null);
      setGenerationError(null);
      setGeneratedSuccess(false);
    }
  }, [initialPrompt, isOpen]);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    const dimensions: Record<string, [number, number]> = {
      '9:16': [576, 1024],
      '1:1': [1024, 1024],
      '16:9': [1024, 576],
    };
    const [width, height] = dimensions[aspectRatio];
    setIsGenerating(true);
    setGenerationProgress(0);
    setGeneratedSuccess(false);
    setGeneratedUrl(null);
    setGenerationError(null);

    try {
      const job = await createImageJob(promptText, width, height);
      if (!job.statusUrl) throw new Error('The server did not return a status URL');

      let status = job;
      while (status.status === 'queued' || status.status === 'processing') {
        await new Promise(resolve => setTimeout(resolve, 2000));
        status = await getImageJob(job.statusUrl);
        setGenerationProgress(status.status === 'processing' ? 60 : 20);
      }
      if (status.status === 'failed') throw new Error(status.error || 'Image generation failed');
      if (!status.url) throw new Error('The completed job did not include an image URL');

      setGenerationProgress(100);
      setGeneratedUrl(resolveApiUrl(status.url));
      setGeneratedSuccess(true);
    } catch (error: unknown) {
      setGenerationError(error instanceof Error ? error.message : 'Image generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    // Clipboard action is intentionally local; it does not need an API call.
    navigator.clipboard.writeText(promptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#121021] border border-white/[0.1] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/[0.08] bg-[#161429]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#ec008c]/20 border border-pink-500/40 flex items-center justify-center text-[#ec008c]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Picsart AI Playground</h3>
              <p className="text-xs text-slate-400">Generate videos & visuals from ready-made prompts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/[0.05] text-slate-400 hover:text-white flex items-center justify-center border border-white/[0.08] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Prompt Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300">Active Prompt</label>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-[11px] text-pink-300 hover:text-white transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              rows={4}
              className="w-full p-3.5 rounded-xl bg-[#0b0a13] border border-white/[0.1] text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#ec008c] transition-colors font-mono"
            />
          </div>

          {/* Parameters Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1.5">Aspect Ratio</label>
              <div className="flex bg-[#0b0a13] p-1 rounded-xl border border-white/[0.08]">
                {['9:16', '1:1', '16:9'].map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    className={`flex-1 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      aspectRatio === ratio
                        ? 'bg-[#ec008c] text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1.5">AI Engine</label>
              <select className="w-full p-2 rounded-xl bg-[#0b0a13] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-[#ec008c]">
                <option>SDXL</option>

              </select>
            </div>
          </div>

          {/* Generation Progress Bar */}
          {isGenerating && (
            <div className="p-4 bg-purple-950/20 border border-purple-800/40 rounded-2xl space-y-2 text-center">
              <p className="text-xs font-semibold text-pink-300">Generating video motion clip in Playground...</p>
              <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden p-0.5 border border-purple-900/50">
                <div 
                  className="h-full bg-gradient-to-r from-purple-600 via-[#ec008c] to-indigo-500 rounded-full transition-all duration-200"
                  style={{ width: `${generationProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Success Banner */}
          {generatedSuccess && (
            <div className="p-3.5 bg-emerald-950/30 border border-emerald-500/40 rounded-2xl flex items-center justify-between text-xs text-white">
              <span className="text-emerald-300 font-semibold">Generation complete! 4-second motion preview ready.</span>
              <button 
                onClick={onClose}
                className="px-3 py-1 rounded-lg bg-emerald-600 text-white font-bold cursor-pointer"
              >
                View Result
              </button>
            </div>
          )}

          {generationError && (
            <div className="p-3.5 bg-red-950/30 border border-red-500/40 rounded-2xl text-xs text-red-200">
              {generationError}
            </div>
          )}

          {generatedUrl && (
            <img
              src={generatedUrl}
              alt="Generated result"
              className="w-full rounded-2xl border border-white/[0.08]"
            />
          )}

          {/* Footer Submit Button */}
          <div className="pt-2 flex items-center justify-between border-t border-white/[0.08]">
            <button
              onClick={onClose}
              className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="btn-analyze-gradient px-6 py-2.5 rounded-full text-white text-xs sm:text-sm font-bold shadow-xl cursor-pointer flex items-center gap-2"
            >
              <Wand2 className="w-4 h-4 text-white" />
              <span>{isGenerating ? 'Generating...' : 'Generate in Playground'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

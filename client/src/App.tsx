/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useMemo } from 'react';
import { PROMPT_PACKS } from './data/sampleCreatives';
import { PromptPack } from './types/creative';
import { addFavorite, getFavorites, getPromptPacks, removeFavorite } from './api';
import { HeroSection } from './components/HeroSection';
import { AdCard } from './components/AdCard';
import { PromptDetailView } from './components/PromptDetailView';
import { PlaygroundModal } from './components/PlaygroundModal';
import { CheckCircle2, FolderArchive } from 'lucide-react';

export default function App() {
  // `packs` is the catalog displayed by the cards. React state is used so this
  // is loaded from the MongoDB-backed catalog.
  const [packs, setPacks] = useState<PromptPack[]>([]);
  const [isLoadingPacks, setIsLoadingPacks] = useState(true);
  // `activePack` controls the screen: null means catalog, an object means the
  // detail screen for that prompt pack.
  const [activePack, setActivePack] = useState<PromptPack | null>(null);
  // These two values are controlled by HeroSection and are used only for the
  // current in-memory filtering calculation below.
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Thumbnails');
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set(['product-shot-systems']));
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isPlaygroundOpen, setIsPlaygroundOpen] = useState<boolean>(false);
  const [playgroundPrompt, setPlaygroundPrompt] = useState<string>('');

  useEffect(() => {
    getPromptPacks()
      .then((apiPacks) => {
        // The API owns prompt content. Bundled assets remain the frontend's
        // build-time presentation layer until an object-storage URL is added.
        setPacks(apiPacks.map((apiPack) => {
          const localPack = PROMPT_PACKS.find((pack) => pack.id === apiPack.id);
          if (!localPack) return apiPack;
          return {
            ...apiPack,
            image: localPack.image,
            previewImage: localPack.previewImage,
            relatedPrompts: apiPack.relatedPrompts.length
              ? apiPack.relatedPrompts
              : localPack.relatedPrompts,
            variants: apiPack.variants.map((variant) => {
              const localVariant = localPack.variants.find((item) => item.id === variant.id);
              return { ...variant, previewImage: localVariant?.previewImage };
            }),
          };
        }));
      })
      .catch(() => {
        // Keep the UI usable if the API is temporarily unavailable.
        setPacks(PROMPT_PACKS);
        showToast('Could not load API catalog; showing local sample data');
      })
      .finally(() => setIsLoadingPacks(false));
  }, []);

  useEffect(() => {
    getFavorites()
      .then((ids) => setLikedIds(new Set(ids)))
      .catch(() => showToast('Could not load saved prompts'));
  }, []);

  const showToast = (msg: string) => {
    // Temporary client-only feedback. API errors should use this same UI after
    // the request catch block has converted the server error into a message.
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const handleToggleLike = (id: string, e: React.MouseEvent) => {
    // Called by the Save button in AdCard and PromptDetailView. `stopPropagation`
    // prevents the card click from opening the detail screen at the same time.
    e.stopPropagation();
    const isLiked = likedIds.has(id);
    const request = isLiked ? removeFavorite(id) : addFavorite(id);
    request
      .then(() => {
        setLikedIds(prev => {
          const next = new Set(prev);
          if (isLiked) next.delete(id);
          else next.add(id);
          return next;
        });
        showToast(isLiked ? 'Removed from saved prompts' : 'Saved prompt pack to favorites!');
      })
      .catch((error: unknown) => {
        showToast(error instanceof Error ? error.message : 'Could not update saved prompt');
      });
  };

  const handleDownload = (pack: PromptPack, e: React.MouseEvent) => {
    // Builds a .txt file in the browser; no request is made to the server.
    e.stopPropagation();
    const promptText = pack.variants[0]?.prompt || pack.tagline;
    const element = document.createElement("a");
    const file = new Blob([promptText], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${pack.id}_prompt.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    showToast(`Downloaded prompt for "${pack.title}"`);
  };

  const handleShare = (pack: PromptPack, e: React.MouseEvent) => {
    // Currently shares the current page URL by copying it to the clipboard.
    e.stopPropagation();
    navigator.clipboard.writeText(window.location.href);
    showToast(`Link copied for "${pack.title}"`);
  };

  const handleOpenPack = (pack: PromptPack) => {
    // TODO(API): Prefer navigating with the pack ID and loading
    // GET /api/prompts/:id here (or in a route-level loader) so detail data is
    // not limited to the local sample file.
    setActivePack(pack);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToCatalog = () => {
    setActivePack(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectRelatedPrompt = (title: string) => {
    // TODO(API): Related prompts should contain IDs, not only display titles.
    // Request the selected prompt by ID instead of searching the local array.
    const found = packs.find(p => p.title.toLowerCase().includes(title.toLowerCase()));
    if (found) {
      setActivePack(found);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      showToast(`Loaded prompt pack: ${title}`);
    }
  };

  const handleUsePrompt = (promptText: string) => {
    // Passes the selected prompt down into PlaygroundModal. The modal currently
    // simulates generation; this is where the future API flow starts in the UI.
    setPlaygroundPrompt(promptText);
    setIsPlaygroundOpen(true);
  };

  const handleQuickUsePrompt = (promptText: string, e: React.MouseEvent) => {
    e.stopPropagation();
    handleUsePrompt(promptText);
  };

  const handleStepClick = (stepNumber: number) => {
    if (stepNumber === 1) {
      // Focus on search
      const input = document.querySelector('input[type="text"]') as HTMLInputElement;
      if (input) input.focus();
    } else if (stepNumber === 2) {
      // Open first pack
      if (packs.length > 0) {
        handleOpenPack(packs[0]);
      }
    } else if (stepNumber === 3) {
      // Open Playground
      handleUsePrompt(packs[0]?.variants[0]?.prompt || 'Cinematic video ad prompt...');
    }
  };

  // Filtered prompt packs based on search and category. This runs locally on
  // every relevant state change; an API-backed version would fetch `packs`
  // first, then could either keep this filter or send query parameters.
  const filteredPacks = useMemo(() => {
    return packs.filter(item => {
      // Category filter if not Thumbnails or All prompts
      if (selectedCategory === 'Video ads & clips' && item.mediaType !== 'video') {
        return false;
      }
      if (selectedCategory === 'Social visuals' && item.mediaType !== 'image') {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matches = 
          item.title.toLowerCase().includes(query) ||
          item.tagline.toLowerCase().includes(query) ||
          item.variants.some(v => v.name.toLowerCase().includes(query) || v.prompt.toLowerCase().includes(query));
        if (!matches) return false;
      }

      return true;
    });
  }, [packs, selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-[#0b0a13] text-slate-100 flex flex-col font-sans">
      {/* 
        NO SIDE MENU, NO MAIN HEADER MENU, NO FOOTER
        As requested: "remove side menu, main menu and footer also , and button color must be like that attached image"
        "header and footer remove in 1 row add 4 images and side menu also removed"
      */}

      {activePack ? (
        /* SCREEN 2: Detail View matching Image 2 */
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <PromptDetailView 
            pack={activePack}
            onBack={handleBackToCatalog}
            onSelectRelatedPrompt={handleSelectRelatedPrompt}
            onUsePrompt={handleUsePrompt}
            isLiked={likedIds.has(activePack.id)}
            onToggleLike={handleToggleLike}
          />
        </main>
      ) : (
        /* SCREEN 1: Main Catalog View without side menu, main menu, or footer */
        <main className="flex-1 w-full max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8">
          <div className="space-y-6">
            {/* Hero Banner with Breadcrumbs, 3 Steps, and Search Bar */}
            <HeroSection 
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              resultCount={filteredPacks.length}
              activeCollectionName={selectedCategory}
              onNavigateVisuals={() => {
                setSelectedCategory('Thumbnails');
                setSearchQuery('');
              }}
              onPromptDropdownClick={(cat) => {
                setSelectedCategory(cat);
              }}
              onStepClick={handleStepClick}
            />

            {/* Exactly 4 Images per Row (in 1 row add 4 images) */}
            {isLoadingPacks ? (
              <div className="text-center py-16 text-sm text-slate-400">Loading prompt packs...</div>
            ) : filteredPacks.length === 0 ? (
              <div className="text-center py-16 bg-[#121021] rounded-2xl border border-white/[0.08] p-8 max-w-md mx-auto">
                <FolderArchive className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-bold text-white mb-1">No matching prompt packs found</h3>
                <p className="text-xs text-slate-400 mb-4">Try clearing your search query.</p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('Thumbnails');
                  }}
                  className="btn-analyze-gradient px-5 py-2 text-white text-xs font-bold cursor-pointer"
                >
                  Reset search
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-4 sm:gap-5">
                {filteredPacks.map((pack) => (
                  <AdCard
                    key={pack.id}
                    creative={pack}
                    onOpenInsideView={handleOpenPack}
                    onToggleLike={handleToggleLike}
                    onDownload={handleDownload}
                    onShare={handleShare}
                    onQuickUsePrompt={handleQuickUsePrompt}
                    isLiked={likedIds.has(pack.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      )}

      {/* AI Playground Modal with attached screenshot button gradient */}
      <PlaygroundModal 
        isOpen={isPlaygroundOpen}
        onClose={() => setIsPlaygroundOpen(false)}
        initialPrompt={playgroundPrompt}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1e1b38] border border-pink-500/40 text-white text-xs font-semibold px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-4 h-4 text-[#ec008c]" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { ChevronDown, User, Sparkles, FolderArchive } from 'lucide-react';

interface HeaderNavProps {
  onStartCreating: () => void;
  onOpenZipAnalyzer: () => void;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  onStartCreating,
  onOpenZipAnalyzer,
}) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const navItems = [
    { name: 'Video', hasDropdown: true },
    { name: 'Image', hasDropdown: true },
    { name: 'Agents', hasDropdown: true, badge: 'Hot', badgeColor: 'bg-[#d80075] text-white' },
    { name: 'Library', hasDropdown: true },
    { name: 'Plugins', hasDropdown: true },
    { name: 'Solutions', hasDropdown: true },
    { name: 'Community', hasDropdown: true },
    { name: 'Pricing', hasDropdown: false, badge: 'Save big', badgeColor: 'bg-[#581c87] text-pink-300' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0b0a13] border-b border-white/[0.08] px-4 lg:px-6 py-2.5 flex items-center justify-between select-none">
      {/* Left: Picsart Brand Logo and Nav Menu */}
      <div className="flex items-center gap-6 xl:gap-8">
        {/* Picsart Wordmark */}
        <a 
          href="/" 
          className="flex items-center gap-1 text-2xl font-black tracking-tight text-[#ec008c] hover:opacity-90 transition-opacity"
        >
          <span>Picsart</span>
        </a>

        {/* Desktop Nav Links */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
          {navItems.map((item) => (
            <div key={item.name} className="relative">
              <button
                onClick={() => setActiveMenu(activeMenu === item.name ? null : item.name)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs xl:text-sm font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <span>{item.name}</span>
                {item.badge && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
                {item.hasDropdown && (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" />
                )}
              </button>

              {/* Sample Dropdown Menu */}
              {activeMenu === item.name && item.hasDropdown && (
                <div 
                  className="absolute top-full left-0 mt-2 w-52 bg-[#141224] border border-purple-900/40 rounded-2xl p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150"
                  onMouseLeave={() => setActiveMenu(null)}
                >
                  <div className="text-xs text-slate-400 font-semibold px-2 py-1 mb-1 border-b border-white/5">
                    {item.name} Tools
                  </div>
                  <button 
                    onClick={() => { setActiveMenu(null); onStartCreating(); }}
                    className="w-full text-left px-2.5 py-1.5 text-xs text-slate-200 hover:bg-purple-950/60 hover:text-white rounded-lg transition-colors flex items-center justify-between"
                  >
                    <span>AI {item.name} Generator</span>
                    <Sparkles className="w-3 h-3 text-[#ec008c]" />
                  </button>
                  <button 
                    onClick={() => { setActiveMenu(null); onOpenZipAnalyzer(); }}
                    className="w-full text-left px-2.5 py-1.5 text-xs text-slate-200 hover:bg-purple-950/60 hover:text-white rounded-lg transition-colors flex items-center justify-between"
                  >
                    <span>Inspect Ad ZIP</span>
                    <FolderArchive className="w-3 h-3 text-purple-400" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </nav>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Start Creating Magenta Button */}
        <button
          onClick={onStartCreating}
          className="btn-picsart-primary px-5 py-2 rounded-full text-white text-xs sm:text-sm font-bold tracking-wide shadow-md cursor-pointer flex items-center gap-1.5"
        >
          <span>Start creating</span>
        </button>

        {/* User Avatar Circle */}
        <div className="w-8 h-8 rounded-full bg-slate-800/90 border border-white/20 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer transition-colors">
          <User className="w-4 h-4" />
        </div>
      </div>
    </header>
  );
};

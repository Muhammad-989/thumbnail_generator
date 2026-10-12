import React from 'react';
import { 
  Apple, 
  Play, 
  Monitor, 
  ShieldCheck 
} from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-[#07060e] border-t border-white/[0.08] text-slate-400 text-xs mt-16 pt-12 pb-8 px-6 lg:px-12 select-none">
      {/* 5-Column Main Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 pb-12 border-b border-white/[0.08]">
        {/* Column 1: Brand & Apps (spans 2 cols on desktop) */}
        <div className="lg:col-span-2 space-y-5">
          <div className="text-2xl font-black text-[#ec008c] tracking-tight">
            Picsart
          </div>

          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white">Use Picsart anywhere</h4>
            <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
              Create on the web, in the app, or inside the AI tools you already use.
            </p>
          </div>

          {/* Use Picsart With Icons */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              USE PICSART WITH
            </p>
            <div className="flex items-center gap-2">
              {['🤖', '✦', '❖', '⬡', '▲', '⬢'].map((icon, idx) => (
                <div 
                  key={idx}
                  className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-xs text-slate-300 hover:text-white hover:bg-white/[0.1] transition-colors cursor-pointer"
                >
                  {icon}
                </div>
              ))}
            </div>
          </div>

          {/* Download The App Badges */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              DOWNLOAD THE APP
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black border border-white/20 text-white hover:border-white/40 transition-colors cursor-pointer">
                <Apple className="w-4 h-4" />
                <div className="text-left leading-none">
                  <span className="text-[9px] text-slate-400 block">Download on the</span>
                  <span className="text-xs font-bold block">App Store</span>
                </div>
              </button>
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black border border-white/20 text-white hover:border-white/40 transition-colors cursor-pointer">
                <Play className="w-3.5 h-3.5 fill-current" />
                <div className="text-left leading-none">
                  <span className="text-[9px] text-slate-400 block">GET IT ON</span>
                  <span className="text-xs font-bold block">Google Play</span>
                </div>
              </button>
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black border border-white/20 text-white hover:border-white/40 transition-colors cursor-pointer">
                <Monitor className="w-3.5 h-3.5" />
                <div className="text-left leading-none">
                  <span className="text-[9px] text-slate-400 block">Get it from</span>
                  <span className="text-xs font-bold block">Microsoft</span>
                </div>
              </button>
            </div>
          </div>

          {/* Social Links & AICPA Badge */}
          <div className="space-y-3 pt-1">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              FOLLOW PICSART
            </p>
            <div className="flex items-center gap-4 text-slate-400">
              {['Facebook', 'Twitter', 'Instagram', 'LinkedIn', 'YouTube', 'Pinterest'].map((net) => (
                <span key={net} className="text-xs hover:text-white cursor-pointer transition-colors">
                  {net[0]}
                </span>
              ))}
            </div>

            {/* AICPA SOC Badge */}
            <div className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-cyan-950/30 border border-cyan-800/40 text-cyan-300 text-[11px] font-mono">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>AICPA SOC Certified</span>
            </div>
          </div>
        </div>

        {/* Column 2: Video & Audio */}
        <div className="space-y-6">
          <div className="space-y-2">
            <h5 className="text-sm font-bold text-white">Video</h5>
            <ul className="space-y-2">
              {['AI Video Generator', 'Video Studio', 'AI Video Editor'].map(link => (
                <li key={link}>
                  <a href="#" className="hover:text-white transition-colors">{link}</a>
                </li>
              ))}
              <li className="flex items-center gap-1.5">
                <a href="#" className="hover:text-white transition-colors">Video clipping</a>
                <span className="px-1.5 py-0.2 rounded-full bg-[#ec008c] text-white text-[9px] font-bold uppercase">NEW</span>
              </li>
              {['Image to Video', 'Video Filters'].map(link => (
                <li key={link}>
                  <a href="#" className="hover:text-white transition-colors">{link}</a>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2 pt-2 border-t border-white/[0.06]">
            <h5 className="text-sm font-bold text-white">Audio</h5>
            <ul className="space-y-2">
              {['AI Voice Generator', 'Add Music to Video', 'Audio Models'].map(link => (
                <li key={link}>
                  <a href="#" className="hover:text-white transition-colors">{link}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Column 3: Images */}
        <div className="space-y-2">
          <h5 className="text-sm font-bold text-white">Images</h5>
          <ul className="space-y-2">
            {[
              'AI Image Generator',
              'AI Photo Editor',
              'Photo Editor',
              'Background Remover',
              'Image Enhancer',
              'Photo Effects',
              'Content Library',
              'Quicktools'
            ].map(link => (
              <li key={link}>
                <a href="#" className="hover:text-white transition-colors">{link}</a>
              </li>
            ))}
          </ul>
        </div>

        {/* Column 4: AI Workflows */}
        <div className="space-y-2">
          <h5 className="text-sm font-bold text-white">AI workflows</h5>
          <ul className="space-y-2">
            <li className="flex items-center gap-1.5">
              <a href="#" className="hover:text-white transition-colors">Flow</a>
              <span className="px-1.5 py-0.2 rounded-full bg-amber-600 text-white text-[9px] font-bold uppercase">HOT</span>
            </li>
            <li className="flex items-center gap-1.5">
              <a href="#" className="hover:text-white transition-colors">AI Agents</a>
              <span className="px-1.5 py-0.2 rounded-full bg-amber-600 text-white text-[9px] font-bold uppercase">HOT</span>
            </li>
            <li className="flex items-center gap-1.5">
              <a href="#" className="hover:text-white transition-colors">AI Playground</a>
              <span className="px-1.5 py-0.2 rounded-full bg-amber-600 text-white text-[9px] font-bold uppercase">HOT</span>
            </li>
            <li>
              <a href="#" className="hover:text-white transition-colors">AI Models</a>
            </li>
            <li className="flex items-center gap-1.5">
              <a href="#" className="hover:text-white transition-colors">Plugins</a>
              <span className="px-1.5 py-0.2 rounded-full bg-[#ec008c] text-white text-[9px] font-bold uppercase">NEW</span>
            </li>
            {['MCP setup', 'Command line', 'Enterprise'].map(link => (
              <li key={link}>
                <a href="#" className="hover:text-white transition-colors">{link}</a>
              </li>
            ))}
          </ul>
        </div>

        {/* Column 5: Creators & Resources */}
        <div className="space-y-6">
          <div className="space-y-2">
            <h5 className="text-sm font-bold text-white">Creators</h5>
            <ul className="space-y-2">
              {['Earn with Picsart', 'Earn campaigns', 'For Brands'].map(link => (
                <li key={link}>
                  <a href="#" className="hover:text-white transition-colors">{link}</a>
                </li>
              ))}
              <li className="flex items-center gap-1.5">
                <a href="#" className="hover:text-white transition-colors">Challenges</a>
                <span className="px-1.5 py-0.2 rounded-full bg-amber-600 text-white text-[9px] font-bold uppercase">HOT</span>
              </li>
              <li className="flex items-center gap-1.5">
                <a href="#" className="hover:text-white transition-colors">Picsart Store</a>
                <span className="px-1.5 py-0.2 rounded-full bg-[#ec008c] text-white text-[9px] font-bold uppercase">NEW</span>
              </li>
            </ul>
          </div>

          <div className="space-y-2 pt-2 border-t border-white/[0.06]">
            <h5 className="text-sm font-bold text-white">Resources</h5>
            <ul className="space-y-2">
              {['Pricing', 'Tutorials', 'Blog', 'Support', 'Solutions', 'About us', 'Careers', 'Press Center'].map(link => (
                <li key={link}>
                  <a href="#" className="hover:text-white transition-colors">{link}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Legal & Copyright Bar */}
      <div className="max-w-7xl mx-auto pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
          {[
            'Terms of Use',
            'Privacy Policy',
            'Internet-Based Advertising',
            'Community Guidelines',
            'DMCA',
            'Security Policy',
            'Accessibility'
          ].map(legal => (
            <a key={legal} href="#" className="hover:text-slate-300 transition-colors">
              {legal}
            </a>
          ))}
        </div>
        <p>© 2026 PicsArt, Inc.</p>
      </div>
    </footer>
  );
};

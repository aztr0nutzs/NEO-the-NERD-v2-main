import React, { useState, useMemo } from 'react';
import { SOUND_LIBRARY, PrankSound } from '../data/sounds';
import { playSynthesizedSound } from '../utils/audio';

const CATEGORIES = [
  "ALL", 
  ...Array.from(new Set(SOUND_LIBRARY.map(s => s.category))).sort(),
  "CUSTOM"
];

const categoryColors: Record<string, string> = {
  ALL: 'border-zinc-500 text-zinc-300 hover:bg-zinc-800',
  CUSTOM: 'border-orange-500 text-orange-400 hover:bg-orange-500/20',
  VOICE: 'border-lime-500 text-lime-400 hover:bg-lime-500/20',
  ANIMALS: 'border-cyan-400 text-cyan-400 hover:bg-cyan-400/20',
  TECH_SCIFI: 'border-fuchsia-400 text-fuchsia-400 hover:bg-fuchsia-400/20',
  RPG: 'border-yellow-400 text-yellow-400 hover:bg-yellow-400/20',
  FUNNY: 'border-pink-400 text-pink-400 hover:bg-pink-400/20',
  EFFECTS: 'border-purple-400 text-purple-400 hover:bg-purple-400/20',
  MISC: 'border-blue-400 text-blue-400 hover:bg-blue-400/20'
};

export default function Library() {
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredSounds = useMemo(() => {
    return SOUND_LIBRARY.filter(sound => {
      const matchesCategory = selectedCategory === 'ALL' || sound.category === selectedCategory;
      const matchesSearch = sound.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            sound.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <main className="pt-24 pb-32 px-4 lg:px-8 min-h-screen flex flex-col gap-8 max-w-7xl mx-auto">
      
      {/* Bold Header */}
      <section className="flex flex-col md:flex-row justify-between items-end gap-4 shrink-0">
        <div>
          <h1 className="text-4xl md:text-6xl font-display-lg font-black uppercase text-transparent bg-clip-text bg-gradient-to-r from-lime-400 via-cyan-400 to-fuchsia-500 drop-shadow-[0_0_15px_rgba(163,230,53,0.3)] italic">
            Audio Arsenal
          </h1>
          <p className="font-mono text-zinc-400 tracking-widest uppercase mt-2 font-bold italic">Payloads for maximum chaos</p>
        </div>
        
        <div className="w-full md:w-auto relative group flex-1 max-w-md">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-outline group-focus-within:text-lime-400 transition-colors">search</span>
          </div>
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border-2 border-zinc-700 hover:border-lime-500/50 rounded-2xl py-3 pl-12 pr-6 text-lime-100 focus:outline-none focus:border-lime-400 focus:ring-4 focus:ring-lime-400/20 transition-all font-mono text-sm placeholder:text-zinc-600 font-bold italic" 
            placeholder="Search database..." 
          />
        </div>
      </section>

      {/* Chunky Category Pills */}
      <section className="flex flex-wrap gap-3 pb-2 shrink-0">
        {CATEGORIES.map(cat => {
          const colorClass = categoryColors[cat] || 'border-zinc-500 text-zinc-400 hover:bg-zinc-800';
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-5 py-2.5 rounded-full font-label-caps text-xs sm:text-sm uppercase tracking-widest font-black italic transition-all border-2 
                ${isSelected 
                  ? 'bg-zinc-100 text-zinc-900 border-zinc-100 shadow-[0_0_20px_rgba(255,255,255,0.4)] scale-105' 
                  : `bg-transparent ${colorClass}`}`}
            >
              {cat}
            </button>
          );
        })}
      </section>

      {/* Grid Layout of Sounds */}
      <section className="flex-1 min-h-0">
         {selectedCategory === 'CUSTOM' && (
           <div className="mb-6 p-6 md:p-8 rounded-3xl border-4 border-dashed border-orange-500/40 bg-orange-500/10 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative group">
             <div className="absolute inset-0 bg-gradient-to-r from-orange-500/0 via-orange-500/10 to-orange-500/0 -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
             
             <div className="relative z-10 text-center md:text-left">
                <h4 className="font-display-lg text-2xl md:text-3xl font-black text-orange-400 italic drop-shadow-[0_0_10px_rgba(249,115,22,0.4)] uppercase">Custom Payloads</h4>
                <p className="font-mono text-orange-300/80 mt-2 font-bold italic">Upload your own .mp3 or .wav files to use in sequences.</p>
             </div>
             
             <button className="relative z-10 flex items-center gap-3 bg-orange-500 text-black px-6 py-3 rounded-full hover:bg-orange-400 hover:scale-105 hover:shadow-[0_0_20px_rgba(249,115,22,0.6)] font-black uppercase tracking-widest transition-all">
               <span className="material-symbols-outlined text-xl">upload_file</span>
               Import File
             </button>
           </div>
         )}

         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-12">
            {filteredSounds.map(sound => (
              <SoundCard key={sound.id} sound={sound} />
            ))}
            
            {filteredSounds.length === 0 && (
              <div className="col-span-full py-20 flex flex-col items-center justify-center text-zinc-600 bg-zinc-900/30 rounded-3xl border-2 border-dashed border-zinc-800">
                 <span className="material-symbols-outlined text-6xl mb-4 opacity-30">science</span>
                 <h2 className="font-display-lg text-2xl font-black italic uppercase text-zinc-500">No sounds found</h2>
                 <p className="font-mono text-sm tracking-widest uppercase mt-2 font-bold italic">Adjust search parameters</p>
              </div>
            )}
         </div>
      </section>

    </main>
  );
}

const SoundCard: React.FC<{ sound: PrankSound }> = ({ sound }) => {
  let accentColor = "text-lime-400 border-lime-500/30 hover:border-lime-400 group-hover:shadow-[0_0_20px_rgba(163,230,53,0.3)] bg-lime-500/5";
  let playBtn = "bg-lime-500 text-black hover:bg-lime-400";
  
  if (sound.category === 'VOICE' || sound.category === 'VOICES_FIGHTER') {
    accentColor = "text-orange-400 border-orange-500/30 hover:border-orange-400 group-hover:shadow-[0_0_20px_rgba(249,115,22,0.3)] bg-orange-500/5";
    playBtn = "bg-orange-500 text-black hover:bg-orange-400";
  } else if (sound.category === 'TECH_SCIFI') {
    accentColor = "text-fuchsia-400 border-fuchsia-500/30 hover:border-fuchsia-400 group-hover:shadow-[0_0_20px_rgba(217,70,239,0.3)] bg-fuchsia-500/5";
    playBtn = "bg-fuchsia-500 text-black hover:bg-fuchsia-400";
  } else if (sound.category === 'ANIMALS') {
    accentColor = "text-cyan-400 border-cyan-400/30 hover:border-cyan-400 group-hover:shadow-[0_0_20px_rgba(34,211,238,0.3)] bg-cyan-400/5";
    playBtn = "bg-cyan-400 text-black hover:bg-cyan-300";
  } else if (sound.category === 'FUNNY') {
    accentColor = "text-pink-400 border-pink-400/30 hover:border-pink-400 group-hover:shadow-[0_0_20px_rgba(244,114,182,0.3)] bg-pink-400/5";
    playBtn = "bg-pink-400 text-black hover:bg-pink-300";
  }

  const durationStr = (sound.durationMs / 1000).toFixed(1) + 's';

  return (
    <div className={`p-5 rounded-2xl border-2 transition-all group flex flex-col gap-4 ${accentColor}`}>
      <div className="flex justify-between items-start gap-2">
        <h3 className="font-display-lg text-lg font-black uppercase italic tracking-wide leading-tight line-clamp-2 min-h-[2.5rem]">
          {sound.name}
        </h3>
        <button 
           className="text-zinc-500 hover:text-white transition-colors p-1" 
           title="Add to Favorites"
        >
          <span className="material-symbols-outlined text-xl">star</span>
        </button>
      </div>
      
      <div className="flex-1 flex flex-col justify-end gap-3">
        <div className="flex items-center gap-2 flex-wrap">
           <span className="px-2 py-0.5 rounded-md bg-black/40 border border-white/10 font-mono text-[9px] uppercase tracking-widest text-zinc-300 font-bold italic">
             {sound.category}
           </span>
           <span className="px-2 py-0.5 rounded-md bg-black/40 border border-white/10 font-mono text-[9px] uppercase tracking-widest text-zinc-400 font-bold italic">
             ⏱ {durationStr}
           </span>
        </div>
        
        <div className="flex gap-2 mt-2">
          <button 
            onClick={() => playSynthesizedSound(sound.category, sound.name, sound.durationMs, sound.assetPath)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl font-black italic uppercase tracking-widest text-xs transition-transform active:scale-95 shadow-lg ${playBtn}`}
          >
            <span className="material-symbols-outlined text-lg">play_arrow</span>
            Play
          </button>
          
          <button 
             className="w-10 h-10 rounded-xl bg-black/40 border border-white/20 hover:bg-white/10 flex items-center justify-center transition-colors text-white hover:text-lime-400"
             title="Add to Sequence"
          >
             <span className="material-symbols-outlined text-lg">playlist_add</span>
          </button>
        </div>
      </div>
    </div>
  );
}



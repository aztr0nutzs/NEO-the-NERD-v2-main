import { useState } from 'react';
import { playSynthesizedSound, stopAllEmissions } from '../utils/audio';

export default function Home({ onNavigate }: { onNavigate: (screen: string) => void }) {
  const [isPlaying, setIsPlaying] = useState(false);

  const triggerPrankCore = () => {
    setIsPlaying(true);
    playSynthesizedSound('CHAOS', 'PRANK CORE ACTIVATED', 3000);
    setTimeout(() => setIsPlaying(false), 2000);
  };

  const playDirectSound = (category: string, name: string, ms: number) => {
    setIsPlaying(true);
    playSynthesizedSound(category, name, ms);
    setTimeout(() => setIsPlaying(false), 2000);
  };

  return (
    <main className="px-margin pt-24 pb-32 relative min-h-screen flex flex-col items-center">
      
      {/* Background Decor */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none opacity-20 -z-10">
        <div className="w-[80vw] h-[80vw] border border-cyan-500/10 rounded-full animate-hud-spin"></div>
        <div className="absolute w-[60vw] h-[60vw] border border-fuchsia-500/10 rounded-full animate-hud-spin-reverse delay-150"></div>
      </div>

      {/* REACTION CORE / PRANKSTER LAUNCHER matching exact Image */}
      <section className="flex flex-col items-center justify-center mt-8 relative w-full max-w-[500px] aspect-square mx-auto">
        <div className="w-full h-full relative group flex justify-center items-center">
          <img src="/reactor_core.png" alt="Reactor Core Launcher" className={`w-full h-full object-contain pointer-events-none drop-shadow-[0_0_20px_rgba(0,255,255,0.2)] ${isPlaying ? 'animate-pulse neon-glow-cyan' : ''}`} />
          
          {/* Overlay interactive button on the center 'P' icon */}
          <button 
            onClick={triggerPrankCore}
            className="absolute top-[35%] left-[35%] w-[30%] h-[30%] rounded-full cursor-pointer hover:bg-cyan-400/30 active:bg-cyan-400/50 hover:shadow-[0_0_30px_rgba(0,255,255,0.6)] transition-all z-20 flex items-center justify-center focus:outline-none ring-2 ring-transparent hover:ring-cyan-400/50 group/center"
            aria-label="Trigger Prank Core"
          >
             <div className="w-full h-full rounded-full border-2 border-cyan-400/30 group-hover/center:animate-ping opacity-50 bg-cyan-400/10"></div>
          </button>

          {/* Inner ring buttons for quick sounds */}
          <button 
            onClick={() => playDirectSound('VOICE', 'Distorted Voice', 2000)}
            className="absolute top-[18%] left-[45%] w-[10%] h-[10%] rounded-full cursor-pointer hover:bg-orange-500/40 active:bg-orange-500/60 hover:shadow-[0_0_15px_rgba(255,165,0,0.6)] transition-all z-10 focus:outline-none bg-orange-500/10 border border-orange-500/20 backdrop-blur-sm"
            title="Voice Module"
          ></button>
          <button 
            onClick={() => playDirectSound('ANIMAL', 'Eagle Screech', 2000)}
            className="absolute bottom-[22%] left-[25%] w-[12%] h-[12%] rounded-full cursor-pointer hover:bg-lime-500/40 active:bg-lime-500/60 hover:shadow-[0_0_15px_rgba(163,230,53,0.6)] transition-all z-10 focus:outline-none bg-lime-500/10 border border-lime-500/20 backdrop-blur-sm"
            title="Animal Call"
          ></button>
          <button 
            onClick={() => playDirectSound('TECH', 'Glitch Sound', 1000)}
            className="absolute bottom-[25%] right-[22%] w-[15%] h-[15%] rounded-full cursor-pointer hover:bg-fuchsia-500/40 active:bg-fuchsia-500/60 hover:shadow-[0_0_15px_rgba(217,70,239,0.6)] transition-all z-10 focus:outline-none bg-fuchsia-500/10 border border-fuchsia-500/20 backdrop-blur-sm"
            title="Tech Glitch"
          ></button>
          <button 
            onClick={() => playDirectSound('FUNNY', 'Clown Horn', 1000)}
            className="absolute top-[28%] right-[22%] w-[12%] h-[12%] rounded-full cursor-pointer hover:bg-yellow-500/40 active:bg-yellow-500/60 hover:shadow-[0_0_15px_rgba(255,255,0,0.6)] transition-all z-10 focus:outline-none bg-yellow-500/10 border border-yellow-500/20 backdrop-blur-sm"
            title="Funny"
          ></button>
        </div>
      </section>

      {/* Navigation Buttons Row under the Launcher */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-2xl mt-16 z-20 relative px-4">
        <button onClick={() => onNavigate('SOUND_FORGE')} className="glass-panel py-3 rounded-lg flex flex-col items-center border-orange-500/30 hover:border-orange-500 bg-orange-500/10 transition-all text-center group min-h-0">
          <span className="material-symbols-outlined text-orange-400 text-2xl group-hover:scale-110 transition-transform">tune</span>
          <span className="font-headline-md text-[10px] text-orange-400 uppercase mt-1 tracking-widest">CONTROL PANEL</span>
        </button>
        <button onClick={() => onNavigate('LIBRARY')} className="glass-panel py-3 rounded-lg flex flex-col items-center border-lime-500/30 hover:border-lime-500 bg-lime-500/10 transition-all text-center group min-h-0">
          <span className="material-symbols-outlined text-lime-400 text-2xl group-hover:scale-110 transition-transform">library_music</span>
          <span className="font-headline-md text-[10px] text-lime-400 uppercase mt-1 tracking-widest">Audio Arsenal</span>
        </button>
        <button onClick={() => onNavigate('TRAPS')} className="glass-panel py-3 rounded-lg flex flex-col items-center border-cyan-500/30 hover:border-cyan-500 bg-cyan-500/10 transition-all text-center group min-h-0">
          <span className="material-symbols-outlined text-cyan-400 text-2xl group-hover:scale-110 transition-transform">alarm_on</span>
          <span className="font-headline-md text-[10px] text-cyan-400 uppercase mt-1 tracking-widest">Trap Deployment</span>
        </button>
        <button className="glass-panel py-3 rounded-lg flex flex-col items-center border-fuchsia-500/30 hover:border-fuchsia-500 bg-fuchsia-500/10 transition-all text-center group min-h-0" onClick={stopAllEmissions}>
          <span className="material-symbols-outlined text-error text-2xl group-hover:animate-pulse">dangerous</span>
          <span className="font-headline-md text-[10px] text-error uppercase mt-1 tracking-widest">KILLSWITCH</span>
        </button>
      </section>

    </main>
  );
}


export const playSynthesizedSound = (category: string, name: string, durationMs: number = 1000, assetPath?: string) => {
  if (assetPath) {
    const audio = new Audio(assetPath);
    audio.play().catch(e => {
      console.warn(`[PranksterLab Audio] Missing asset file '${assetPath}': ${e}. Falling back to synthesis.`);
      playFallbackSynthesis(category, name, durationMs);
    });
    return;
  }
  
  playFallbackSynthesis(category, name, durationMs);
};

const playFallbackSynthesis = (category: string, name: string, durationMs: number) => {
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;
  
  const audioCtx = new AudioContext();
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  const duration = Math.max(0.1, Math.min(durationMs / 1000, 5.0));
  const now = audioCtx.currentTime;

  const hashString = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return Math.abs(hash);
  };
  
  const nameHash = hashString(name);
  const seededRandom = (min: number, max: number, offset: number = 0) => {
      const seed = (nameHash + offset) % 10000 / 10000;
      return min + seed * (max - min);
  };

  const lcName = name.toLowerCase();
  const cat = category.toUpperCase();

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);

  let attack = 0.05;
  let release = 0.1;
  let sustainLevel = 0.5;

  let isPercussive = false;
  
  if (lcName.includes('knock') || lcName.includes('thud') || lcName.includes('slam') || cat === 'DOOR_KNOCKS' || cat === 'FOOTSTEPS') {
      isPercussive = true;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(seededRandom(50, 100, 1), now);
      osc.frequency.exponentialRampToValueAtTime(0.01, now + 0.1);
      attack = 0.01;
      release = 0.05;
      durationMs = 150;
  } else if (lcName.includes('fart') || lcName.includes('burp')) {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(seededRandom(40, 90, 2), now);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(seededRandom(100, 300, 3), now);
      filter.frequency.linearRampToValueAtTime(50, now + duration);
      const lfo = audioCtx.createOscillator();
      lfo.frequency.value = seededRandom(15, 30, 4);
      const lfoGain = audioCtx.createGain();
      lfoGain.gain.value = 30;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start(now);
      lfo.stop(now + duration);
      attack = 0.1;
      release = 0.3;
  } else if (cat === 'GLITCH' || lcName.includes('error')) {
      osc.type = 'square';
      filter.type = 'bandpass';
      filter.frequency.value = seededRandom(500, 3000, 5);
      
      let t = now;
      while(t < now + duration) {
          osc.frequency.setValueAtTime(Math.random() * 2000 + 100, t);
          t += Math.random() * 0.1 + 0.02;
      }
      attack = 0.01;
      release = 0.01;
  } else if (cat === 'SCI_FI' || cat === 'ROBOT') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(seededRandom(100, 800, 6), now);
      osc.frequency.exponentialRampToValueAtTime(seededRandom(20, 200, 7), now + duration);
      filter.type = 'lowpass';
      filter.frequency.value = 2000;
      
      const lfo = audioCtx.createOscillator();
      lfo.type = 'square';
      lfo.frequency.value = seededRandom(10, 50, 8);
      const lfoGain = audioCtx.createGain();
      lfoGain.gain.value = 0.8;
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      lfo.start(now);
      lfo.stop(now + duration);
  } else {
      const waves: OscillatorType[] = ['sine', 'square', 'sawtooth', 'triangle'];
      osc.type = waves[nameHash % waves.length];
      osc.frequency.setValueAtTime(seededRandom(200, 1000, 9), now);
      if (nameHash % 2 === 0) {
         osc.frequency.exponentialRampToValueAtTime(seededRandom(50, 500, 10), now + duration);
      }
      attack = 0.1;
  }

  const actualDuration = Math.min(duration, durationMs / 1000);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(sustainLevel, now + attack);
  gain.gain.setValueAtTime(sustainLevel, now + actualDuration - release);
  gain.gain.exponentialRampToValueAtTime(0.001, now + actualDuration);

  osc.start(now);
  osc.stop(now + actualDuration);

  // Play TTS
  if ('speechSynthesis' in window && !isPercussive) {
     try {
       window.speechSynthesis.cancel();
       const utterance = new SpeechSynthesisUtterance(name);
       utterance.rate = seededRandom(0.8, 1.6, 11);
       if (cat === 'CREEPY' || cat === 'HORROR_LITE') {
           utterance.pitch = 0.1;
           utterance.rate = 0.5;
       } else if (cat === 'CARTOON' || cat === 'FUNNY') {
           utterance.pitch = 2.0;
       } else {
           utterance.pitch = seededRandom(0.4, 1.8, 12);
       }
       utterance.volume = 0.7;
       window.speechSynthesis.speak(utterance);
     } catch (e) {}
  }
};

export const forgeSound = (type: string, params: any) => {
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;
  
  const audioCtx = new AudioContext();
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  const now = audioCtx.currentTime;
  const duration = params.duration / 1000;
  
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);

  const baseFreq = 440 * params.pitch;

  switch(type) {
    case 'SCI_FI_BLIP':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * (2 + params.intensity * 4), now + duration);
      filter.type = 'lowpass';
      filter.frequency.value = 2000;
      break;
    case 'GLITCH_BURST':
      osc.type = 'square';
      filter.type = 'bandpass';
      for(let i = 0; i < 20; i++) {
        const t = now + (i / 20) * duration;
        osc.frequency.setValueAtTime(Math.random() * 2000 * params.intensity + 100, t);
      }
      break;
    case 'ROBOT_BEEP':
      osc.type = 'square';
      const steps = 4;
      for(let i = 0; i < steps; i++) {
        const t = now + (i / steps) * duration;
        osc.frequency.setValueAtTime(baseFreq + (i * 200 * params.intensity), t);
      }
      break;
    case 'TOY_SQUEAK':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq * 2, now);
      const lfo = audioCtx.createOscillator();
      lfo.frequency.value = 20 + params.intensity * 30;
      const lfoGain = audioCtx.createGain();
      lfoGain.gain.value = 500 * params.weirdness;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start(now);
      lfo.stop(now + duration);
      break;
    case 'CREEPY_DRONE':
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(baseFreq / 4, now);
      filter.type = 'lowpass';
      filter.frequency.value = 300 + 500 * params.intensity;
      const filterLfo = audioCtx.createOscillator();
      filterLfo.frequency.value = 0.5 + params.weirdness * 5;
      const filterLfoGain = audioCtx.createGain();
      filterLfoGain.gain.value = 200;
      filterLfo.connect(filterLfoGain);
      filterLfoGain.connect(filter.frequency);
      filterLfo.start(now);
      filterLfo.stop(now + duration);
      break;
    default:
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, now);
  }

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.5, now + 0.05);
  gain.gain.setValueAtTime(0.5, now + duration - 0.05);
  gain.gain.linearRampToValueAtTime(0, now + duration);

  osc.start(now);
  osc.stop(now + duration);
};

export const stopAllEmissions = () => {

    try {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
    } catch(e) {}
};

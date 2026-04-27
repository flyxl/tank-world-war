import { Scene } from '@babylonjs/core/scene';

export enum SoundType {
  ENGINE_IDLE = 'engine_idle',
  ENGINE_MOVE = 'engine_move',
  CANNON_FIRE = 'cannon_fire',
  EXPLOSION = 'explosion',
  HIT = 'hit',
  RELOAD = 'reload',
  AMBIENT = 'ambient',
  RAIN = 'rain',
  WIND = 'wind',
  UI_CLICK = 'ui_click',
  VICTORY = 'victory',
  DEFEAT = 'defeat',
}

export class AudioManager {
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private initialized = false;

  constructor(private scene: Scene) {}

  async init(): Promise<void> {
    if (this.initialized) return;
    try {
      this.audioCtx = new AudioContext();
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.connect(this.audioCtx.destination);

      this.sfxGain = this.audioCtx.createGain();
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.audioCtx.createGain();
      this.musicGain.gain.value = 0.3;
      this.musicGain.connect(this.masterGain);

      this.initialized = true;
    } catch {
      console.warn('Audio initialization failed');
    }
  }

  playSynth(type: SoundType): void {
    if (!this.audioCtx || !this.sfxGain) return;
    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    switch (type) {
      case SoundType.CANNON_FIRE: {
        const noise = ctx.createBufferSource();
        const buf = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.05));
        }
        noise.buffer = buf;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(2000, now);
        lp.frequency.exponentialRampToValueAtTime(200, now + 0.3);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        noise.connect(lp).connect(gain).connect(this.sfxGain);
        noise.start(now);
        noise.stop(now + 0.3);
        break;
      }
      case SoundType.EXPLOSION: {
        const noise = ctx.createBufferSource();
        const buf = ctx.createBuffer(1, ctx.sampleRate * 0.8, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.15));
        }
        noise.buffer = buf;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(3000, now);
        lp.frequency.exponentialRampToValueAtTime(100, now + 0.8);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.8, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
        noise.connect(lp).connect(gain).connect(this.sfxGain);
        noise.start(now);
        noise.stop(now + 0.8);
        break;
      }
      case SoundType.HIT: {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.connect(gain).connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      }
      case SoundType.RELOAD: {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.linearRampToValueAtTime(800, now + 0.15);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.connect(gain).connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.15);
        break;
      }
      case SoundType.UI_CLICK: {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 600;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        osc.connect(gain).connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.05);
        break;
      }
      default:
        break;
    }
  }

  setMasterVolume(vol: number): void {
    if (this.masterGain) this.masterGain.gain.value = vol;
  }

  dispose(): void {
    this.audioCtx?.close();
  }
}

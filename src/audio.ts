import { hasWeaponEffects, type WeaponEffectKey } from './data/weaponEffects';
import type { TowerKey } from './data/units';

const MAX_VOICES = 32;

/** Local synthesis: layered weapon transients, bounded voices and separately throttled impacts. */
export class BattleAudio {
  private context?: AudioContext;
  private gain?: GainNode;
  private last = new Map<string, number>();
  private noise?: AudioBuffer;
  private voices = new Set<AudioScheduledSourceNode>();
  volume = .25;
  unlock(): void {
    try {
      if (!this.context && typeof AudioContext !== 'undefined') {
        this.context = new AudioContext(); this.gain = this.context.createGain(); this.gain.connect(this.context.destination);
      }
      void this.context?.resume().catch(() => {});
    } catch { /* sound is optional on unsupported browsers */ }
  }
  play(kind: string): void {
    if (!this.ready(kind, 'fire', kind === 'warning' ? 2 : .14)) return;
    if (hasWeaponEffects(kind)) { this.weapon(kind, false); return; }
    const ctx = this.context!, now = ctx.currentTime;
    const tones: Record<string, number> = { marine: 640, cannon: 95, firebat: 160, arrow: 290, sniper: 460, frost: 880, templar: 720, cruiser: 120, ghost: 810, goliath: 260, zealot: 1150, highTemplar: 950, reaver: 130, scout: 570, carrier: 690, boss: 70, warning: 1050, clear: 660, build: 520, skill: 940 };
    const freq = tones[kind] ?? 400, duration = kind === 'boss' ? .6 : kind === 'warning' ? .3 : .1;
    this.tone(['boss', 'firebat'].includes(kind) ? 'sawtooth' : 'sine', freq, Math.max(30, freq * .45), duration, .35, now);
  }

  impact(kind: TowerKey): void {
    if (!hasWeaponEffects(kind) || !this.ready(kind, 'impact', kind === 'marine' ? .06 : kind === 'arrow' ? .12 : .18)) return;
    this.weapon(kind, true);
  }

  destroy(): void {
    for (const voice of this.voices) { try { voice.stop(); } catch { /* already ended */ } voice.disconnect(); }
    this.voices.clear();
    void this.context?.close().catch(() => {});
    this.context = undefined; this.gain = undefined; this.noise = undefined; this.last.clear();
  }

  private ready(kind: string, phase: 'fire' | 'impact', interval: number): boolean {
    const ctx = this.context;
    if (!ctx || !this.gain || ctx.state !== 'running' || this.volume <= 0
      || (typeof document !== 'undefined' && document.hidden) || this.voices.size >= MAX_VOICES) return false;
    const now = ctx.currentTime, key = phase + ':' + kind, group = phase + ':*';
    if (now - (this.last.get(key) ?? -10) < interval || now - (this.last.get(group) ?? -10) < (phase === 'fire' ? .045 : .035)) return false;
    this.last.set(key, now); this.last.set(group, now); this.gain.gain.value = this.volume * .22;
    return true;
  }

  private weapon(kind: WeaponEffectKey, impact: boolean): void {
    const now = this.context!.currentTime;
    if (kind === 'marine') {
      this.hiss('highpass', impact ? 2100 : 1300, impact ? .04 : .065, impact ? .32 : .6, now);
      this.tone('triangle', impact ? 730 : 210, impact ? 220 : 85, .05, impact ? .16 : .34, now);
    } else if (kind === 'arrow') {
      this.hiss('lowpass', impact ? 1700 : 2300, impact ? .24 : .15, impact ? .8 : .5, now);
      this.tone(impact ? 'sine' : 'triangle', impact ? 115 : 230, impact ? 38 : 85, impact ? .23 : .12, impact ? .8 : .3, now);
    } else {
      this.hiss('lowpass', impact ? 1100 : 1900, impact ? .38 : .18, impact ? .9 : .8, now);
      this.tone('sine', impact ? 68 : 105, impact ? 28 : 36, impact ? .42 : .26, impact ? 1 : .9, now);
    }
  }

  private envelope(duration: number, amplitude: number, now: number): GainNode {
    const env = this.context!.createGain();
    env.gain.setValueAtTime(.001, now); env.gain.linearRampToValueAtTime(amplitude, now + .003);
    env.gain.exponentialRampToValueAtTime(.001, now + duration); env.connect(this.gain!);
    return env;
  }

  private track(source: AudioScheduledSourceNode, nodes: AudioNode[], duration: number, now: number): void {
    this.voices.add(source);
    source.onended = () => { this.voices.delete(source); source.disconnect(); for (const node of nodes) node.disconnect(); };
    source.start(now); source.stop(now + duration);
  }

  private tone(type: OscillatorType, from: number, to: number, duration: number, amplitude: number, now: number): void {
    if (this.voices.size >= MAX_VOICES) return;
    const osc = this.context!.createOscillator(), env = this.envelope(duration, amplitude, now);
    osc.type = type; osc.frequency.setValueAtTime(from, now); osc.frequency.exponentialRampToValueAtTime(to, now + duration);
    osc.connect(env); this.track(osc, [env], duration, now);
  }

  private hiss(type: BiquadFilterType, frequency: number, duration: number, amplitude: number, now: number): void {
    if (this.voices.size >= MAX_VOICES) return;
    const ctx = this.context!;
    if (!this.noise) {
      this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), env = this.envelope(duration, amplitude, now);
    source.buffer = this.noise; filter.type = type; filter.frequency.value = frequency; filter.Q.value = .7;
    source.connect(filter); filter.connect(env); this.track(source, [filter, env], duration, now);
  }
}

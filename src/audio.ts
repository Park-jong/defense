/** Short synthesized cues, with no downloads. Voices are limited even at 3× speed. */
export class BattleAudio {
  private context?: AudioContext;
  private gain?: GainNode;
  private last = new Map<string, number>();
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
    const ctx = this.context;
    if (!ctx || !this.gain || ctx.state !== 'running' || this.volume <= 0 || (typeof document !== 'undefined' && document.hidden)) return;
    const now = ctx.currentTime;
    if (now - (this.last.get(kind) ?? -10) < (kind === 'warning' ? 2 : .14) || now - (this.last.get('*') ?? -10) < .045) return;
    this.last.set(kind, now); this.last.set('*', now);
    this.gain.gain.value = this.volume * .22;
    const osc = ctx.createOscillator(), env = ctx.createGain();
    const tones: Record<string, number> = { marine: 640, cannon: 95, firebat: 160, arrow: 290, sniper: 460, frost: 880, templar: 720, cruiser: 120, ghost: 810, goliath: 260, zealot: 1150, highTemplar: 950, reaver: 130, scout: 570, carrier: 690, boss: 70, warning: 1050, clear: 660, build: 520, skill: 940 };
    const freq = tones[kind] ?? 400, duration = kind === 'boss' ? .6 : kind === 'warning' ? .3 : .1;
    osc.type = ['cannon', 'boss', 'firebat'].includes(kind) ? 'sawtooth' : 'sine';
    osc.frequency.setValueAtTime(freq, now); osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq * .45), now + duration);
    env.gain.setValueAtTime(.001, now); env.gain.linearRampToValueAtTime(.35, now + .008); env.gain.exponentialRampToValueAtTime(.001, now + duration);
    osc.connect(env); env.connect(this.gain); osc.start(); osc.stop(now + duration);
    osc.onended = () => { osc.disconnect(); env.disconnect(); };
  }
  destroy(): void { void this.context?.close().catch(() => {}); this.context = undefined; this.last.clear(); }
}

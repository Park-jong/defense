import { GAME_W, MAP_H, MAP_Y, W } from './config';
import type { TowerKey } from './data/units';
import { MOE_CHARACTERS, MoeLine, MoeStreak } from './moeCharacters';
import { moePortraitUrl } from './moePortraits';
import { bishoujoPortraitAsset } from './bishoujoPortraitAssets';
import { isBishoujo, THEME_CHANGED } from './themes';

export interface MoeActor { id: string; k: TowerKey; x: number; y: number }
interface Bubble { actor: string; node: HTMLElement; left: number }

/** Disposable, pointer-transparent decoration. All clocks are local to this scene. */
export class MoePresentation {
  private root = document.createElement('div');
  private cutin?: HTMLElement;
  private cutinLeft = 0;
  private cutinPriority = 0;
  private bubbles: Bubble[] = [];
  private speechCooldown = 0;
  private idleClock = 9;
  private speaker = 0;
  private positionClock = 0;
  private streak = new MoeStreak();
  private chain = document.createElement('div');
  private clearOnTheme = () => this.reset();

  constructor() {
    this.root.className = 'moe-presentation';
    this.root.setAttribute('aria-hidden', 'true');
    this.root.hidden = true;
    this.chain.className = 'moe-chain'; this.chain.hidden = true;
    this.root.append(this.chain); document.body.append(this.root);
    window.addEventListener(THEME_CHANGED, this.clearOnTheme);
    this.position();
  }
  private position(): void {
    const canvas = document.querySelector('canvas'); if (!canvas) return;
    const rect = canvas.getBoundingClientRect(), scale = rect.width / GAME_W;
    Object.assign(this.root.style, { left: `${rect.left}px`, top: `${rect.top + MAP_Y * scale}px`,
      width: `${W}px`, height: `${MAP_H}px`, transform: `scale(${scale})` });
  }
  private portrait(key: TowerKey): string { return moePortraitUrl(key) ?? bishoujoPortraitAsset(key)?.portrait ?? ''; }

  start(wave: number, boss: boolean, actor: MoeActor): void {
    this.reset();
    if (!isBishoujo()) return;
    this.cinematic(actor.k, boss ? 'boss' : 'wave', boss ? 'BOSS APPROACHING' : `WAVE ${String(wave).padStart(2, '0')}`,
      boss ? '별빛을 지켜 낼 시간' : '별빛 방어선, 출격!', MOE_CHARACTERS[actor.k].wave, 3.2, 2);
    this.speechCooldown = 4; this.idleClock = 12;
  }
  kill(seconds: number, actor: MoeActor, boss: boolean): void {
    if (!isBishoujo()) return;
    const milestone = this.streak.kill(seconds);
    this.chain.hidden = !this.streak.alive(seconds);
    this.chain.textContent = `${this.streak.count} CHAIN`;
    if (boss) this.cinematic(actor.k, 'boss-clear', 'BOSS BREAK', '별을 가른 한 방', MOE_CHARACTERS[actor.k].clear, 3.2, 3);
    else if (milestone) this.cinematic(actor.k, 'streak', `${milestone} KILL STREAK`, milestone >= 20 ? '멈추지 않는 별빛' : '완벽한 연계!', MOE_CHARACTERS[actor.k].streak, 2.6, 1);
    if (milestone || boss) this.say(actor, boss ? 'clear' : 'streak');
  }
  clear(actor: MoeActor): void {
    if (isBishoujo()) this.say(actor, 'clear');
  }
  say(actor: MoeActor, kind: MoeLine): void {
    if (!isBishoujo() || this.speechCooldown > 0 || this.bubbles.length >= 2) return;
    const c = MOE_CHARACTERS[actor.k], node = document.createElement('div');
    node.className = 'moe-speech'; node.style.setProperty('--moe-accent', c.color);
    const name = document.createElement('b'), line = document.createElement('span');
    name.textContent = `${c.mark} ${c.name}`; line.textContent = c[kind];
    node.append(name, line); this.root.append(node);
    this.bubbles.push({ actor: actor.id, node, left: 3.6 });
    this.speechCooldown = kind === 'idle' ? 10 : 5;
  }
  private cinematic(key: TowerKey, kind: string, eyebrow: string, title: string, quote: string, seconds: number, priority: number): void {
    if (this.cutin && this.cutinPriority >= priority) return;
    this.cutin?.remove();
    const c = MOE_CHARACTERS[key], card = document.createElement('div');
    card.className = 'moe-cut-in'; card.dataset.kind = kind; card.style.setProperty('--moe-accent', c.color);
    const image = document.createElement('img'); image.src = this.portrait(key); image.alt = '';
    const copy = document.createElement('div'); copy.className = 'moe-cut-copy';
    const small = document.createElement('small'), heading = document.createElement('strong');
    const line = document.createElement('p'), name = document.createElement('b');
    small.textContent = `${c.mark} ${eyebrow}`; heading.textContent = title;
    line.textContent = `“${quote}”`; name.textContent = c.name;
    copy.append(small, heading, line, name); card.append(image, copy); this.root.append(card);
    this.cutin = card; this.cutinLeft = seconds; this.cutinPriority = priority;
  }
  update(dt: number, blocked: boolean, seconds: number, active: boolean, actors: MoeActor[]): void {
    this.root.hidden = !isBishoujo() || blocked;
    if (this.root.hidden) return;
    this.positionClock -= dt;
    if (this.positionClock <= 0) { this.position(); this.positionClock = .2; }
    this.speechCooldown = Math.max(0, this.speechCooldown - dt);
    if (this.cutin) {
      this.cutinLeft -= dt;
      this.cutin.classList.toggle('is-leaving', this.cutinLeft < .35);
      if (this.cutinLeft <= 0) { this.cutin.remove(); this.cutin = undefined; }
    }
    for (const bubble of this.bubbles) {
      bubble.left -= dt;
      const actor = actors.find(a => a.id === bubble.actor);
      if (!actor || bubble.left <= 0) { bubble.node.remove(); bubble.left = 0; continue; }
      bubble.node.hidden = actor.x < 0 || actor.x > W || actor.y < 0 || actor.y > MAP_H;
      bubble.node.style.left = `${Math.max(92, Math.min(W - 92, actor.x))}px`;
      bubble.node.style.top = `${Math.max(70, actor.y - 22)}px`;
      bubble.node.classList.toggle('is-leaving', bubble.left < .35);
    }
    this.bubbles = this.bubbles.filter(b => b.left > 0);
    this.chain.hidden = !active || !this.streak.alive(seconds) || this.streak.count < 2;
    if (active && actors.length) {
      this.idleClock -= dt;
      if (this.idleClock <= 0 && !this.cutin) {
        this.say(actors[this.speaker++ % actors.length], 'idle'); this.idleClock = 14;
      }
    }
  }
  reset(): void {
    this.cutin?.remove(); this.cutin = undefined; this.cutinLeft = 0; this.cutinPriority = 0;
    for (const b of this.bubbles) b.node.remove();
    this.bubbles = []; this.speechCooldown = 0; this.streak.reset(); this.chain.hidden = true;
    this.root.hidden = !isBishoujo();
  }
  destroy(): void { window.removeEventListener(THEME_CHANGED, this.clearOnTheme); this.root.remove(); }
}

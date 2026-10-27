import Phaser from 'phaser';

export type DamageKind = 'normal' | 'skill' | 'burn';
interface Target { x: number; y: number; r?: number }
interface Popup {
  view: Phaser.GameObjects.BitmapText;
  age: number; life: number; x: number; y: number; drift: number; rise: number; color: number;
}
const FONT_KEY = 'combat-digits';
const MAX_POPUPS = 160;
const BURN_INTERVAL = .2;

/** Shared digit atlas and a bounded pool keep rapid-fire damage cheap to render. */
export class DamageNumbers {
  private active: Popup[] = [];
  private free: Phaser.GameObjects.BitmapText[] = [];
  private burns = new Map<Target, { amount: number; age: number }>();
  private serial = 0;
  private emitted = 0;

  beginFrame(): void { this.emitted = 0; }

  constructor(private scene: Phaser.Scene) {
    if (scene.cache.bitmapFont.exists(FONT_KEY)) return;
    const chars = '0123456789,.', width = 32, height = 44;
    const atlas = scene.textures.createCanvas(FONT_KEY, chars.length * width, height)!;
    const ctx = atlas.context;
    ctx.font = '900 32px Arial, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = 5;
    ctx.strokeStyle = '#10121b'; ctx.fillStyle = '#ffffff';
    [...chars].forEach((char, i) => {
      ctx.strokeText(char, i * width + width / 2, height / 2);
      ctx.fillText(char, i * width + width / 2, height / 2);
    });
    atlas.refresh();
    scene.cache.bitmapFont.add(FONT_KEY, Phaser.GameObjects.RetroFont.Parse(scene, {
      image: FONT_KEY, width, height, chars, charsPerRow: chars.length,
      'offset.x': 0, 'offset.y': 0, 'spacing.x': 0, 'spacing.y': 0, lineSpacing: 0,
    }));
  }

  hit(target: Target, amount: number, kind: DamageKind = 'normal'): void {
    if (!Number.isFinite(amount) || amount <= 0) return;
    if (kind === 'burn') {
      const burn = this.burns.get(target);
      if (burn) burn.amount += amount;
      else this.burns.set(target, { amount, age: 0 });
      return;
    }
    this.flush(target);
    this.spawn(target, amount, kind);
  }

  flush(target: Target): void {
    const burn = this.burns.get(target);
    if (!burn) return;
    this.burns.delete(target);
    this.spawn(target, burn.amount, 'burn');
  }

  update(dt: number): void {
    if (dt <= 0) return;
    for (const [target, burn] of this.burns) {
      burn.age += dt;
      if (burn.age >= BURN_INTERVAL) this.flush(target);
    }
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      p.age += dt;
      if (p.age >= p.life) {
        p.view.setVisible(false).setActive(false);
        this.free.push(p.view); this.active.splice(i, 1);
        continue;
      }
      const t = p.age / p.life;
      const pop = t < .12 ? .7 + t / .12 * .65 : t < .28 ? 1.35 - (t - .12) / .16 * .35 : 1;
      p.view.setPosition(p.x + p.drift * t, p.y - p.rise * (1 - (1 - t) ** 2))
        .setScale(pop).setAlpha(t < .55 ? 1 : (1 - t) / .45).setTint(t < .08 ? 0xffffff : p.color);
    }
  }

  destroy(): void {
    for (const p of this.active) p.view.destroy();
    for (const view of this.free) view.destroy();
    this.active = []; this.free = []; this.burns.clear();
  }

  private spawn(target: Target, amount: number, kind: DamageKind): void {
    if (this.active.length >= MAX_POPUPS || this.emitted >= 32 || typeof document !== 'undefined' && document.hidden) return;
    this.emitted++;
    const heavy = amount >= 80;
    const size = kind === 'burn' ? 15 : heavy ? 30 : kind === 'skill' ? 23 : 19;
    const color = kind === 'burn' ? 0xffa15c : heavy ? 0xffd16b : kind === 'skill' ? 0x8eeaff : 0xfff1d5;
    const text = amount >= 1 ? Math.round(amount).toLocaleString('en-US') : Math.max(.1, amount).toFixed(1);
    const lane = this.serial++ % 7 - 3;
    const x = target.x + lane * 5, y = target.y - (target.r ?? 12) - 9 - this.serial % 3 * 5;
    const view = this.free.pop() ?? this.scene.add.bitmapText(0, 0, FONT_KEY, '', size).setOrigin(.5).setDepth(24);
    view.setText(text).setFontSize(size).setPosition(x, y).setTint(color).setAlpha(1).setScale(.7).setVisible(true).setActive(true);
    this.active.push({ view, age: 0, life: heavy ? .95 : kind === 'burn' ? .65 : .8,
      x, y, drift: lane * 9, rise: heavy ? 68 : 44, color });
  }
}

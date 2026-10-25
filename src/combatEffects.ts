import type Phaser from 'phaser';
import type { TowerKey } from './data/units';
import { hasWeaponEffects, WEAPON_EFFECTS, type WeaponEffectKey } from './data/weaponEffects';

type Image = Phaser.GameObjects.Image;
interface Point { x: number; y: number }
interface Gun extends Point { barrel: Image; host?: unknown }
interface Target extends Point { sprite: Image; r: number; dead?: boolean; shield?: number }
interface Particle {
  view: Image; age: number; life: number; x: number; y: number; vx: number; vy: number;
  width: number; height: number; growth: number; alpha: number; gravity: number; spin: number;
}
interface Flight extends Point { distance: number; travelled: number; carry: number; side: number; key: WeaponEffectKey }
interface Recoil { gun: Gun; angle: number; age: number; key: WeaponEffectKey }
interface HitFlash { target: Target; view: Image; age: number; key: WeaponEffectKey; shield: boolean; angle: number }
interface ParticleStyle {
  vx?: number; vy?: number; growth?: number; alpha?: number; gravity?: number; spin?: number;
  angle?: number; depth?: number; add?: boolean;
}

const MAX_PARTICLES = 320;
const MAX_HIT_FLASHES = 64;
const TAU = Math.PI * 2;
const random = (min: number, max: number) => min + Math.random() * (max - min);

/** Bounded, reusable visuals driven by combat time. Never writes to enemy or projectile simulation state. */
export class CombatEffects {
  private particles: Particle[] = [];
  private free: Image[] = [];
  private flights = new Map<Image, Flight>();
  private recoils = new Map<Image, Recoil>();
  private flashes = new Map<Target, HitFlash>();
  private flashFree: Image[] = [];
  private serial = 0;

  constructor(private scene: Phaser.Scene) { this.makeTextures(); }

  launch(key: TowerKey, origin: Point, angle: number, view: Image, gun: Gun): boolean {
    if (!hasWeaponEffects(key)) return false;
    if (this.hidden()) return true;
    const fx = WEAPON_EFFECTS[key], c = Math.cos(angle), s = Math.sin(angle);
    this.flights.set(view, { ...origin, key, distance: 0, travelled: 0, carry: 0, side: this.serial++ % 2 ? 1 : -1 });
    if (!gun.host) this.recoils.set(gun.barrel, { gun, angle, age: 0, key });
    const length = key === 'cannon' ? 53 : key === 'arrow' ? 24 : 21;
    const width = key === 'cannon' ? 31 : key === 'arrow' ? 13 : 11;
    this.spawn(key === 'cannon' ? 'siege_muzzle' : 'bunker_muzzle', origin.x + c * length * .43,
      origin.y + s * length * .43, length, width, key === 'cannon' ? .09 : .055, 0xffffff,
      { angle, add: true, growth: .3, depth: 12 });
    this.spawn('combat_glow', origin.x, origin.y, length * 1.2, width * 1.5, .065, fx.color,
      { alpha: .55, angle, add: true, depth: 12 });
    if (key === 'marine') {
      // Ejected brass travels across the barrel, away from the bullet's line.
      this.spawn('combat_streak', gun.x - s * 7, gun.y + c * 7, 3, 1.5, .24, 0xc8a35d,
        { vx: -s * 55 - c * 16, vy: c * 40 - 30, gravity: 180, spin: 15, angle, depth: 7 });
    } else {
      const count = key === 'cannon' ? 5 : 2;
      for (let i = 0; i < count; i++) {
        this.spawn('combat_smoke', origin.x + c * i * 4, origin.y + s * i * 4,
          11 + i * 3, 10 + i * 3, random(.28, .5), fx.smoke,
          { vx: c * random(15, 40) - s * random(-12, 12), vy: s * random(12, 30) - 14,
            growth: 2, alpha: key === 'cannon' ? .3 : .18, spin: random(-1, 1), depth: 11 });
      }
    }
    return true;
  }

  move(view: Image, from: Point, to: Point, target: Point): void {
    const f = this.flights.get(view);
    if (!f || this.hidden()) return;
    const fx = WEAPON_EFFECTS[f.key], dx = to.x - from.x, dy = to.y - from.y;
    const distance = Math.hypot(dx, dy), angle = Math.atan2(dy, dx);
    f.travelled += distance;
    const remaining = Math.hypot(target.x - to.x, target.y - to.y);
    f.distance = f.travelled + remaining;
    const progress = f.distance ? Math.min(1, f.travelled / f.distance) : 1;
    // The missile's visible arc is cosmetic; its collision position remains untouched.
    const bend = Math.sin(progress * Math.PI) * fx.curve * f.side;
    const x = to.x - Math.sin(angle) * bend, y = to.y + Math.cos(angle) * bend;
    const vx = x - f.x, vy = y - f.y, length = Math.hypot(vx, vy);
    const heading = length ? Math.atan2(vy, vx) : angle;
    for (let d = fx.trailSpacing - f.carry; d <= length; d += fx.trailSpacing) {
      const t = d / length, px = f.x + vx * t, py = f.y + vy * t;
      if (f.key === 'arrow') {
        this.spawn('combat_smoke', px, py, random(9, 12), random(8, 11), fx.trailLife, fx.smoke,
          { vx: -Math.cos(heading) * 8, vy: -Math.sin(heading) * 8 - 7, growth: 1.4, alpha: .36, depth: 7 });
        this.spawn('combat_streak', px - Math.cos(heading) * 8, py - Math.sin(heading) * 8,
          fx.trailLength, fx.trailWidth, .06, fx.color, { angle: heading, add: true, alpha: .85 });
      } else {
        this.spawn('combat_streak', px, py, fx.trailLength, fx.trailWidth, fx.trailLife, fx.color,
          { angle: heading, add: true, alpha: f.key === 'marine' ? .85 : .7 });
      }
    }
    f.carry = (f.carry + length) % fx.trailSpacing;
    f.x = x; f.y = y;
    view.setPosition(x, y).setRotation(heading);
  }

  forget(view: Image): void { this.flights.delete(view); }

  impact(key: TowerKey, target: Target, from: Point, radius: number): boolean {
    if (!hasWeaponEffects(key)) return false;
    if (this.hidden()) return true;
    const fx = WEAPON_EFFECTS[key], angle = Math.atan2(target.y - from.y, target.x - from.x);
    const x = key === 'marine' ? target.x - Math.cos(angle) * target.r * .7 : target.x;
    const y = key === 'marine' ? target.y - Math.sin(angle) * target.r * .7 : target.y;
    if (key === 'marine') {
      this.spawn('combat_glow', x, y, 19, 19, .055, 0xffe9b0, { add: true, depth: 20 });
      this.sparks(x, y, 5, angle, .95, 35, 115, .16, fx.color);
    } else {
      const heavy = key === 'cannon', size = Math.max(24, radius);
      this.spawn('combat_glow', x, y, size * 1.7, size * 1.7, .08, 0xffe7b5,
        { add: true, alpha: .95, depth: 20 });
      this.spawn('siege_blast', x, y, size * .9, size * .9, heavy ? .19 : .14, 0xffffff,
        { add: true, growth: .9, depth: 20 });
      this.spawn('combat_ring', x, y, 12, 8, heavy ? .3 : .2, fx.color,
        { growth: size / 6, alpha: .6, depth: 19 });
      this.sparks(x, y, heavy ? 16 : 9, 0, Math.PI, 45, heavy ? 185 : 120, heavy ? .4 : .27, fx.color);
      const count = heavy ? 8 : 4;
      for (let i = 0; i < count; i++) {
        const a = i * TAU / count + random(-.3, .3), speed = random(18, heavy ? 65 : 35);
        this.spawn('combat_smoke', x + Math.cos(a) * 6, y + Math.sin(a) * 4,
          random(14, 24), random(12, 20), random(.35, heavy ? .75 : .5), fx.smoke,
          { vx: Math.cos(a) * speed, vy: Math.sin(a) * speed * .6 - 12,
            growth: heavy ? 2 : 1.2, alpha: heavy ? .34 : .25, spin: random(-1, 1), depth: 18 });
      }
    }
    return true;
  }

  hitTarget(key: TowerKey, target: Target, from: Point = target): void {
    if (!hasWeaponEffects(key) || this.hidden()) return;
    const angle = Math.atan2(target.y - from.y, target.x - from.x);
    const old = this.flashes.get(target);
    if (old) {
      old.age = 0;
      if (WEAPON_EFFECTS[key].flinch >= WEAPON_EFFECTS[old.key].flinch) { old.key = key; old.angle = angle; }
      old.shield = (target.shield ?? 0) > 0; return;
    }
    if (this.flashes.size >= MAX_HIT_FLASHES) return;
    const view = this.flashFree.pop() ?? this.scene.add.image(0, 0, target.sprite.texture.key);
    view.setTexture(target.sprite.texture.key).setDepth(19).setVisible(true).setActive(true);
    const shield = (target.shield ?? 0) > 0;
    if (shield) this.spawn('combat_ring', target.x, target.y, target.r * 1.8, target.r * 1.5, .18, 0x92daff,
      { growth: .65, alpha: .85, add: true, depth: 21 });
    const flash: HitFlash = { target, view, age: 0, key, shield, angle };
    this.flashes.set(target, flash);
    this.drawFlash(flash);
  }

  /** Call once per simulation step, so pause and combat speed apply to all new effects together. */
  update(dt: number): void {
    if (dt <= 0) return;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += dt;
      if (p.age >= p.life) {
        p.view.setVisible(false).setActive(false); this.free.push(p.view); this.particles.splice(i, 1); continue;
      }
      p.vy += p.gravity * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      const t = p.age / p.life, scale = 1 + p.growth * t;
      p.view.setPosition(p.x, p.y).setDisplaySize(p.width * scale, p.height * scale)
        .setAlpha(p.alpha * (1 - t) ** 1.5);
      p.view.rotation += p.spin * dt;
    }
    for (const [barrel, r] of this.recoils) {
      if (!barrel.active || r.gun.host) { this.recoils.delete(barrel); continue; }
      r.age += dt;
      const fx = WEAPON_EFFECTS[r.key], duration = fx.kickTime + fx.recoverTime;
      const kick = r.age < fx.kickTime ? 1 - (1 - r.age / fx.kickTime) ** 3
        : Math.max(0, 1 - (r.age - fx.kickTime) / fx.recoverTime) ** 2;
      const offset = fx.recoil * kick;
      barrel.setPosition(r.gun.x - Math.cos(r.angle) * offset, r.gun.y - Math.sin(r.angle) * offset);
      if (r.age >= duration) this.recoils.delete(barrel);
    }
    for (const [target, f] of this.flashes) {
      f.age += dt;
      if (f.age >= WEAPON_EFFECTS[f.key].reactionLife || target.dead || !target.sprite.active) {
        if (target.sprite.active) target.sprite.setPosition(target.x, target.y);
        f.view.setVisible(false).setActive(false); this.flashFree.push(f.view); this.flashes.delete(target);
      }
    }
  }

  /** Apply a small visual flinch after movement; path coordinates and collisions stay unchanged. */
  render(): void {
    for (const f of this.flashes.values()) {
      if (!f.target.sprite.active || f.target.dead) { f.view.setVisible(false); continue; }
      const fx = WEAPON_EFFECTS[f.key], kick = fx.flinch * Math.max(0, 1 - f.age / fx.reactionLife) ** 2;
      f.target.sprite.setPosition(f.target.x + Math.cos(f.angle) * kick, f.target.y + Math.sin(f.angle) * kick);
      this.drawFlash(f);
    }
  }

  destroy(): void {
    for (const p of this.particles) p.view.destroy();
    for (const view of this.free) view.destroy();
    for (const f of this.flashes.values()) {
      if (f.target.sprite.active) f.target.sprite.setPosition(f.target.x, f.target.y);
      f.view.destroy();
    }
    for (const view of this.flashFree) view.destroy();
    for (const [barrel, r] of this.recoils) if (barrel.active && !r.gun.host) barrel.setPosition(r.gun.x, r.gun.y);
    this.particles = []; this.free = []; this.flashFree = [];
    this.flights.clear(); this.recoils.clear(); this.flashes.clear();
  }

  private hidden(): boolean { return typeof document !== 'undefined' && document.hidden; }

  private drawFlash(f: HitFlash): void {
    const fx = WEAPON_EFFECTS[f.key], sprite = f.target.sprite;
    f.view.setPosition(sprite.x, sprite.y).setRotation(sprite.rotation).setScale(sprite.scaleX, sprite.scaleY)
      .setTintFill(f.shield ? 0xb6eaff : 0xffefcf).setAlpha(fx.flashAlpha * Math.max(0, 1 - f.age / fx.flashLife));
  }

  private sparks(x: number, y: number, count: number, angle: number, spread: number,
    minSpeed: number, maxSpeed: number, life: number, color: number): void {
    for (let i = 0; i < count; i++) {
      const a = angle + random(-spread, spread), speed = random(minSpeed, maxSpeed);
      this.spawn('combat_streak', x, y, random(4, 10), random(1, 2), random(life * .55, life), color,
        { vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, gravity: 35, angle: a, add: true, depth: 21 });
    }
  }

  private spawn(texture: string, x: number, y: number, width: number, height: number,
    life: number, color: number, style: ParticleStyle = {}): void {
    const view = this.free.pop() ?? (this.particles.length >= MAX_PARTICLES
      ? this.particles.shift()!.view : this.scene.add.image(0, 0, texture));
    view.setTexture(texture).setPosition(x, y).setOrigin(.5).setDisplaySize(width, height)
      .setTint(color).setAlpha(style.alpha ?? 1).setRotation(style.angle ?? 0)
      .setBlendMode(style.add ? 'ADD' : 'NORMAL').setDepth(style.depth ?? 8).setVisible(true).setActive(true);
    this.particles.push({ view, age: 0, life, x, y, width, height, vx: style.vx ?? 0, vy: style.vy ?? 0,
      growth: style.growth ?? 0, alpha: style.alpha ?? 1, gravity: style.gravity ?? 0, spin: style.spin ?? 0 });
  }

  private makeTextures(): void {
    const texture = (key: string, width: number, height: number, draw: (g: Phaser.GameObjects.Graphics) => void) => {
      if (this.scene.textures.exists(key)) return;
      const g = this.scene.make.graphics({ x: 0, y: 0 }, false);
      draw(g); g.generateTexture(key, width, height); g.destroy();
    };
    texture('combat_glow', 64, 64, g => {
      for (let r = 31; r >= 1; r -= 2) g.fillStyle(0xffffff, .025 + (1 - r / 32) * .07).fillCircle(32, 32, r);
    });
    texture('combat_smoke', 64, 64, g => {
      for (let r = 30; r >= 2; r -= 2) {
        g.fillStyle(0xffffff, .018 + (1 - r / 32) * .04).fillEllipse(32, 32, r * 2, r * 1.7);
      }
    });
    texture('combat_streak', 32, 8, g => {
      g.fillStyle(0xffffff, .12).fillEllipse(16, 4, 32, 8);
      g.fillStyle(0xffffff, .35).fillEllipse(16, 4, 28, 4);
      g.fillStyle(0xffffff).fillRect(4, 3, 24, 2);
    });
    texture('combat_ring', 64, 64, g => g.lineStyle(1.5, 0xffffff, .9).strokeCircle(32, 32, 29));
  }
}

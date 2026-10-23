import Phaser from 'phaser';
import {
  CLEAR_BONUS_BASE, CLEAR_BONUS_PER_WAVE, COLS, ENEMY_DEFS, EnemyKey, FINAL_BOSS_HP_MULT, FONT, H, MAP_H, MAX_WAVE, ROWS, T, TEST_GOLD, TOWER_DEFS, TOWER_KEYS, TowerKey, W, WP, pathCells,
} from './config';
import { drawMap, makeTextures } from './textures';
import { Btn, mkBtn } from './ui';

interface Tower {
  k: TowerKey; c: number; r: number; x: number; y: number;
  lvl: number; cd: number; spent: number;
  base: Phaser.GameObjects.Image; barrel: Phaser.GameObjects.Image;
}

interface Enemy {
  type: EnemyKey; sprite: Phaser.GameObjects.Image;
  x: number; y: number; seg: number; hp: number; max: number; speed: number;
  slow: number; slowT: number; reward: number; r: number; dead?: boolean;
}

interface TowerStats { dmg: number; range: number; rate: number; splash: number; slow: number }

interface Projectile {
  s: Phaser.GameObjects.Image; x: number; y: number; tgt: Enemy; k: TowerKey; st: TowerStats; dead?: boolean;
}

interface Cell { c: number; r: number }

export class GameScene extends Phaser.Scene {
  private gold = 150;
  private lives = 20;
  private wave = 0;
  private towers: Tower[] = [];
  private enemies: Enemy[] = [];
  private projs: Projectile[] = [];
  private spawnQ: EnemyKey[] = [];
  private spawnT = 0;
  private waveActive = false;
  private building: TowerKey | null = null;
  private selected: Tower | null = null;
  private hover: Cell | null = null;
  private speed = 1;
  private paused = false;
  private over = false;
  private bossLeaked = false;
  private testMode = false;
  private repeat = 0;
  private uiCache: { hud?: string; info?: string } = {};

  private gfx!: Phaser.GameObjects.Graphics;
  private fxBoom!: Phaser.GameObjects.Particles.ParticleEmitter;
  private fxDie!: Phaser.GameObjects.Particles.ParticleEmitter;
  private fxFrost!: Phaser.GameObjects.Particles.ParticleEmitter;
  private fxPlace!: Phaser.GameObjects.Particles.ParticleEmitter;
  private hud!: Phaser.GameObjects.Text;
  private info!: Phaser.GameObjects.Text;
  private pauseTxt!: Phaser.GameObjects.Text;
  private towerBtns: Btn[] = [];
  private goBtn!: Btn;
  private spdBtn!: Btn;
  private pauseBtn!: Btn;
  private upBtn!: Btn;
  private sellBtn!: Btn;

  constructor() { super('game'); }

  // ---------- 생성 ----------
  create(): void {
    makeTextures(this);
    drawMap(this, COLS, ROWS);

    // scene.restart() 시 인스턴스가 재사용되므로 상태를 초기화한다.
    this.testMode = new URLSearchParams(location.search).has('test');
    this.repeat = 0;
    this.gold = this.testMode ? TEST_GOLD : 150;
    this.lives = 20;
    this.wave = this.testMode ? MAX_WAVE : 0;
    this.towers = []; this.enemies = []; this.projs = [];
    this.spawnQ = []; this.spawnT = 0; this.waveActive = false;
    this.building = null; this.selected = null; this.hover = null;
    this.speed = 1; this.paused = false; this.over = false; this.bossLeaked = false;
    this.uiCache = {};
    this.towerBtns = [];

    this.gfx = this.add.graphics().setDepth(10);
    const emitter = (tint: number, speed: number, life: number) => this.add.particles(0, 0, 'spark', {
      speed: { min: speed * .3, max: speed }, lifespan: life, scale: { start: 1.3, end: 0 }, tint, emitting: false,
    }).setDepth(20);
    this.fxBoom = emitter(0xff8a65, 200, 450);
    this.fxDie = emitter(0xef9a9a, 130, 400);
    this.fxFrost = emitter(0xb3e5fc, 110, 350);
    this.fxPlace = emitter(0xffffff, 90, 350);

    this.buildUI();

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => { this.hover = this.cellAt(p); });
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onMapClick(p));
    this.input.mouse?.disableContextMenu();
    this.input.keyboard?.addCapture('SPACE');
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => this.onKey(e));
  }

  private cellAt(p: Phaser.Input.Pointer): Cell | null {
    if (p.y >= MAP_H) return null;
    return { c: Math.floor(p.x / T), r: Math.floor(p.y / T) };
  }

  // ---------- UI ----------
  private buildUI(): void {
    this.add.rectangle(0, MAP_H, W, H - MAP_H, 0x1c232d).setOrigin(0).setDepth(25);
    this.add.rectangle(0, MAP_H, W, 2, 0x2c3644).setOrigin(0).setDepth(26);
    this.hud = this.add.text(12, MAP_H + 8, '', { fontFamily: FONT, fontSize: '16px', fontStyle: 'bold', color: '#e6edf3' }).setDepth(30);
    this.add.text(W - 8, H - 4, `v${__APP_VERSION__}`, { fontFamily: FONT, fontSize: '12px', color: '#8b98a8' })
      .setOrigin(1, 1).setDepth(30);
    this.info = this.add.text(12, MAP_H + 94, '', { fontFamily: FONT, fontSize: '13px', color: '#8b98a8' }).setDepth(30);

    this.towerBtns = TOWER_KEYS.map((k, i) => {
      const d = TOWER_DEFS[k];
      return mkBtn(this, 10 + i * 126, MAP_H + 34, 120, 50, `${i + 1}. ${d.name}\n${d.cost}G`, () => this.chooseBuild(k));
    });
    this.goBtn = mkBtn(this, 530, MAP_H + 34, 150, 50, '▶ 웨이브 시작', () => this.startWave());
    this.spdBtn = mkBtn(this, 690, MAP_H + 34, 80, 50, '속도 x1', () => {
      this.speed = this.speed % 3 + 1; this.spdBtn.set('속도 x' + this.speed);
    });
    this.pauseBtn = mkBtn(this, 780, MAP_H + 34, 90, 50, '일시정지', () => this.togglePause());
    this.upBtn = mkBtn(this, 690, MAP_H + 90, 150, 28, '', () => this.upgrade(), 13);
    this.sellBtn = mkBtn(this, 850, MAP_H + 90, 100, 28, '', () => this.sell(), 13);
    this.upBtn.show(false); this.sellBtn.show(false);
    this.pauseTxt = this.add.text(W / 2, MAP_H / 2, '일시정지', {
      fontFamily: FONT, fontSize: '44px', fontStyle: 'bold', color: '#fff', backgroundColor: '#000a', padding: { x: 24, y: 10 },
    }).setOrigin(.5).setDepth(40).setVisible(false);
  }

  private refreshUI(): void {
    const hud = `웨이브 ${this.wave}/${MAX_WAVE}${this.testMode ? ` [테스트 ${this.repeat}회차]` : ''}     골드 ${this.gold}     생명 ${this.lives}`
      + (this.waveActive ? `     남은 적 ${this.enemies.length + this.spawnQ.length}` : '');
    if (this.uiCache.hud !== hud) { this.uiCache.hud = hud; this.hud.setText(hud); }

    TOWER_KEYS.forEach((k, i) => {
      this.towerBtns[i].act(this.building === k);
      this.towerBtns[i].en(this.gold >= TOWER_DEFS[k].cost || this.building === k);
    });
    this.goBtn.en(!this.waveActive && !this.over && (this.testMode || this.wave < MAX_WAVE));

    const t = this.selected;
    let msg: string;
    if (t) {
      const st = this.stats(t);
      msg = `${TOWER_DEFS[t.k].name} Lv.${t.lvl} · 피해 ${st.dmg.toFixed(0)} · 사거리 ${st.range.toFixed(0)} · 속도 ${(1 / st.rate).toFixed(1)}/초`;
      this.upBtn.show(true); this.sellBtn.show(true);
      this.upBtn.set(t.lvl < 3 ? `업그레이드 ${this.upgradeCost(t)}G (U)` : '최대 레벨');
      this.upBtn.en(t.lvl < 3 && this.gold >= this.upgradeCost(t));
      this.sellBtn.set(`판매 +${this.sellValue(t)}G (S)`);
    } else {
      this.upBtn.show(false); this.sellBtn.show(false);
      msg = this.building
        ? `${TOWER_DEFS[this.building].name} 설치: 빈 땅을 클릭하세요 (우클릭/Esc 취소)`
        : '단축키: 1~4 타워 선택 · Space 웨이브 시작 · P 일시정지 · 타워를 클릭하면 업그레이드/판매';
    }
    if (this.uiCache.info !== msg) { this.uiCache.info = msg; this.info.setText(msg); }
  }

  // ---------- 입력 ----------
  private onKey(e: KeyboardEvent): void {
    if (e.key >= '1' && e.key <= '4') this.chooseBuild(TOWER_KEYS[+e.key - 1], true);
    else if (e.key === 'Escape') { this.building = null; this.selected = null; }
    else if (e.key === ' ') this.startWave();
    else if (e.key === 'p' || e.key === 'P') this.togglePause();
    else if (e.key === 'u' || e.key === 'U') this.upgrade();
    else if (e.key === 's' || e.key === 'S') this.sell();
  }

  private chooseBuild(k: TowerKey, force = false): void {
    this.building = (!force && this.building === k) ? null : k;
    this.selected = null;
  }

  private togglePause(): void {
    if (this.over) return;
    this.paused = !this.paused;
    this.pauseTxt.setVisible(this.paused);
    this.pauseBtn.set(this.paused ? '재개' : '일시정지');
  }

  private onMapClick(p: Phaser.Input.Pointer): void {
    if (this.over) return;
    if (p.rightButtonDown()) { this.building = null; this.selected = null; return; }
    const cell = this.cellAt(p);
    if (!cell) return;
    const t = this.towers.find(t => t.c === cell.c && t.r === cell.r);
    if (t) { this.selected = this.selected === t ? null : t; this.building = null; }
    else if (this.building) this.placeTower(cell.c, cell.r);
    else this.selected = null;
  }

  // ---------- 타워 ----------
  private stats(t: Tower): TowerStats {
    const d: { dmg: number; range: number; rate: number; splash?: number; slow?: number } = TOWER_DEFS[t.k];
    const l = t.lvl - 1;
    return {
      dmg: d.dmg * Math.pow(1.6, l),
      range: d.range * (1 + .08 * l),
      rate: d.rate * Math.pow(.92, l),
      splash: d.splash ? d.splash * (1 + .1 * l) : 0,
      slow: d.slow ? Math.max(.2, d.slow - .08 * l) : 0,
    };
  }
  private upgradeCost(t: Tower): number { return Math.round(TOWER_DEFS[t.k].cost * .8 * t.lvl); }
  private sellValue(t: Tower): number { return Math.round(t.spent * .7); }

  private cellFree(c: number, r: number): boolean {
    return c >= 0 && r >= 0 && c < COLS && r < ROWS && !pathCells.has(c + ',' + r)
      && !this.towers.some(t => t.c === c && t.r === r);
  }

  private placeTower(c: number, r: number): void {
    const k = this.building;
    if (!k) return;
    const d = TOWER_DEFS[k];
    if (!this.cellFree(c, r) || this.gold < d.cost) return;
    this.gold -= d.cost;
    const x = (c + .5) * T, y = (r + .5) * T;
    const base = this.add.image(x, y, 'base_' + k).setDepth(5);
    const barrel = this.add.image(x, y, 'barrel_' + k).setOrigin(0, .5).setDepth(6);
    this.tweens.add({ targets: [base, barrel], scale: { from: 0, to: 1 }, duration: 220, ease: 'Back.Out' });
    this.fxPlace.explode(8, x, y);
    this.towers.push({ k, c, r, x, y, lvl: 1, cd: 0, spent: d.cost, base, barrel });
    if (this.gold < d.cost) this.building = null;
  }

  private upgrade(): void {
    const t = this.selected;
    if (!t || t.lvl >= 3 || this.gold < this.upgradeCost(t)) return;
    const c = this.upgradeCost(t);
    this.gold -= c; t.spent += c; t.lvl++;
    this.tweens.add({ targets: [t.base, t.barrel], scale: { from: 1.3, to: 1 }, duration: 250, ease: 'Back.Out' });
    this.fxPlace.explode(12, t.x, t.y);
  }

  private sell(): void {
    const t = this.selected;
    if (!t) return;
    this.gold += this.sellValue(t);
    this.floatText(t.x, t.y, '+' + this.sellValue(t), '#ffd54f');
    t.base.destroy(); t.barrel.destroy();
    this.towers = this.towers.filter(x => x !== t);
    this.selected = null;
  }

  // ---------- 웨이브 / 적 ----------
  private startWave(): void {
    if (this.over || this.waveActive || (!this.testMode && this.wave >= MAX_WAVE)) return;
    if (this.testMode) this.repeat++; else this.wave++;
    const w = this.wave, q: EnemyKey[] = [], n = 6 + Math.floor(w * 1.6);
    for (let i = 0; i < n; i++) {
      let t: EnemyKey = 'grunt';
      if (w >= 3 && i % 3 === 1) t = 'runner';
      if (w >= 5 && i % 4 === 3) t = 'tank';
      q.push(t);
    }
    if (w % 10 === 0) q.push('boss');
    this.spawnQ = q; this.spawnT = 0; this.waveActive = true;
    this.banner(w % 10 === 0 ? `웨이브 ${w} — 보스 출현! (놓치면 패배)` : `웨이브 ${w}`);
  }

  private spawn(type: EnemyKey): void {
    const d = ENEMY_DEFS[type];
    const finalBoss = type === 'boss' && this.wave >= MAX_WAVE;
    const hp = d.hp * Math.pow(1.17, this.wave - 1) * (finalBoss ? FINAL_BOSS_HP_MULT : 1);
    const sprite = this.add.image(WP[0].x, WP[0].y, 'enemy_' + type).setDepth(8);
    this.tweens.add({ targets: sprite, scale: { from: 0, to: 1 }, duration: 200 });
    this.enemies.push({
      type, sprite, x: sprite.x, y: sprite.y, seg: 1, hp, max: hp, speed: d.speed,
      slow: 1, slowT: 0, reward: d.reward + Math.floor(this.wave / 4), r: d.r,
    });
  }

  private killEnemy(e: Enemy): void {
    if (e.dead) return;
    e.dead = true;
    this.gold += e.reward;
    this.fxDie.explode(e.type === 'boss' ? 40 : 10, e.x, e.y);
    this.floatText(e.x, e.y, '+' + e.reward, '#ffd54f');
    if (e.type === 'boss') this.cameras.main.shake(300, .01);
    this.tweens.add({ targets: e.sprite, scale: 0, alpha: 0, duration: 150, onComplete: () => e.sprite.destroy() });
  }

  private floatText(x: number, y: number, txt: string, color: string): void {
    const t = this.add.text(x, y - 10, txt, { fontFamily: FONT, fontSize: '14px', fontStyle: 'bold', color }).setOrigin(.5).setDepth(22);
    this.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 800, onComplete: () => t.destroy() });
  }

  private banner(msg: string): void {
    const t = this.add.text(W / 2, 100, msg, { fontFamily: FONT, fontSize: '34px', fontStyle: 'bold', color: '#fff', stroke: '#000', strokeThickness: 5 })
      .setOrigin(.5).setDepth(40).setAlpha(0);
    this.tweens.add({ targets: t, alpha: 1, y: 120, duration: 300, yoyo: true, hold: 900, onComplete: () => t.destroy() });
  }

  // ---------- 게임 루프 ----------
  update(_time: number, delta: number): void {
    if (!this.paused && !this.over) {
      const dt = Math.min(.05, delta / 1000);
      for (let i = 0; i < this.speed; i++) this.step(dt);
    }
    this.refreshUI();
    this.drawOverlay();
  }

  private step(dt: number): void {
    if (this.spawnQ.length) {
      this.spawnT -= dt;
      if (this.spawnT <= 0) {
        this.spawn(this.spawnQ.shift()!);
        this.spawnT = Math.max(.35, .9 - this.wave * .02);
      }
    }

    for (const e of this.enemies) {
      e.slowT = Math.max(0, e.slowT - dt);
      if (!e.slowT) e.slow = 1;
      let mv = e.speed * e.slow * dt;
      while (mv > 0 && e.seg < WP.length) {
        const tg = WP[e.seg], dx = tg.x - e.x, dy = tg.y - e.y, dist = Math.hypot(dx, dy);
        if (dist <= mv) { e.x = tg.x; e.y = tg.y; e.seg++; mv -= dist; }
        else { e.x += dx / dist * mv; e.y += dy / dist * mv; mv = 0; }
      }
      e.sprite.setPosition(e.x, e.y);
      if (e.slow < 1) e.sprite.setTint(0x81d4fa); else e.sprite.clearTint();
      if (e.seg >= WP.length) {
        e.dead = true; e.sprite.destroy();
        if (e.type === 'boss') { this.bossLeaked = true; this.lives = 0; } else this.lives--;
        this.cameras.main.shake(150, .006);
        this.cameras.main.flash(120, 255, 60, 60);
      }
    }

    for (const t of this.towers) this.towerAct(t, dt);

    for (const p of this.projs) {
      const e = p.tgt;
      if (e.dead) { p.dead = true; p.s.destroy(); continue; }
      const dx = e.x - p.x, dy = e.y - p.y, dist = Math.hypot(dx, dy), mv = 420 * dt;
      if (dist <= mv + e.r) { this.hit(p); p.dead = true; p.s.destroy(); }
      else { p.x += dx / dist * mv; p.y += dy / dist * mv; p.s.setPosition(p.x, p.y); }
    }
    this.projs = this.projs.filter(p => !p.dead);
    this.enemies = this.enemies.filter(e => !e.dead);

    if (this.waveActive && !this.spawnQ.length && !this.enemies.length && this.lives > 0) {
      this.waveActive = false;
      if (this.wave >= MAX_WAVE && !this.testMode) this.endGame(true);
      else {
        const bonus = CLEAR_BONUS_BASE + this.wave * CLEAR_BONUS_PER_WAVE;
        this.gold += bonus;
        this.banner(`웨이브 클리어! +${bonus}G`);
      }
    }
    if (this.lives <= 0) this.endGame(false);
  }

  private towerAct(t: Tower, dt: number): void {
    const st = this.stats(t);
    t.cd -= dt;
    let best: Enemy | null = null, bp = -Infinity;
    for (const e of this.enemies) {
      if (e.dead || Math.hypot(e.x - t.x, e.y - t.y) > st.range) continue;
      const nx = WP[Math.min(e.seg, WP.length - 1)];
      const p = e.seg * 10000 - Math.hypot(nx.x - e.x, nx.y - e.y);
      if (p > bp) { bp = p; best = e; }
    }
    if (!best) return;
    t.barrel.rotation = Math.atan2(best.y - t.y, best.x - t.x);
    if (t.cd > 0) return;
    t.cd = st.rate;
    const d = TOWER_DEFS[t.k];
    const s = this.add.image(t.x, t.y, 'proj').setTint(d.proj).setDepth(9).setScale(t.k === 'cannon' ? .9 : .55);
    this.projs.push({ s, x: t.x, y: t.y, tgt: best, k: t.k, st });
    this.tweens.add({ targets: t.barrel, scaleX: { from: .65, to: 1 }, duration: 120 });
  }

  private hit(p: Projectile): void {
    const e = p.tgt, st = p.st;
    if (st.splash) {
      this.fxBoom.explode(14, e.x, e.y);
      const ring = this.add.circle(e.x, e.y, 6, 0xff8a65, .3).setStrokeStyle(2, 0xff8a65).setDepth(21);
      this.tweens.add({ targets: ring, scale: st.splash / 6, alpha: 0, duration: 300, onComplete: () => ring.destroy() });
      for (const o of this.enemies) {
        if (o.dead || Math.hypot(o.x - e.x, o.y - e.y) > st.splash) continue;
        o.hp -= st.dmg;
        if (o.hp <= 0) this.killEnemy(o);
      }
    } else {
      e.hp -= st.dmg;
      if (e.hp <= 0) this.killEnemy(e);
    }
    if (st.slow && !e.dead) {
      e.slow = Math.min(e.slow, st.slow); e.slowT = 2;
      this.fxFrost.explode(4, e.x, e.y);
    }
  }

  private drawOverlay(): void {
    const g = this.gfx;
    g.clear();
    const h = this.hover;
    if (h && this.building && !this.over) {
      const d = TOWER_DEFS[this.building], ok = this.cellFree(h.c, h.r) && this.gold >= d.cost;
      const color = ok ? 0xffffff : 0xff0000;
      g.fillStyle(color, ok ? .2 : .25).fillRect(h.c * T, h.r * T, T, T);
      g.fillStyle(color, .12).fillCircle((h.c + .5) * T, (h.r + .5) * T, d.range);
      g.lineStyle(1.5, 0xffffff, .4).strokeCircle((h.c + .5) * T, (h.r + .5) * T, d.range);
    }
    for (const t of this.towers) {
      if (t === this.selected) {
        const r = this.stats(t).range;
        g.fillStyle(0x4fc3f7, .13).fillCircle(t.x, t.y, r);
        g.lineStyle(1.5, 0x4fc3f7, .7).strokeCircle(t.x, t.y, r);
        g.lineStyle(2, 0x4fc3f7).strokeRect(t.c * T + 2, t.r * T + 2, T - 4, T - 4);
      }
      g.fillStyle(0xffd54f);
      for (let i = 0; i < t.lvl; i++) g.fillRect(t.c * T + 7 + i * 8, t.r * T + T - 11, 6, 4);
    }
    for (const e of this.enemies) {
      if (e.dead) continue;
      const w = e.r * 2 + 4, x = e.x - w / 2, y = e.y - e.r - 9;
      g.fillStyle(0x000000, .65).fillRect(x, y, w, 4);
      g.fillStyle(0x66bb6a).fillRect(x, y, w * Math.max(0, e.hp / e.max), 4);
    }
  }

  private endGame(win: boolean): void {
    if (this.over) return;
    this.over = true;
    this.add.rectangle(0, 0, W, H, 0x000000, .6).setOrigin(0).setDepth(50);
    this.add.text(W / 2, 240, win ? '🎉 승리!' : '💀 패배', { fontFamily: FONT, fontSize: '56px', fontStyle: 'bold', color: '#fff' }).setOrigin(.5).setDepth(51);
    this.add.text(W / 2, 305, win ? `${MAX_WAVE}웨이브를 모두 막아냈습니다!` : (this.bossLeaked ? `웨이브 ${this.wave}의 보스를 막지 못했습니다.` : `웨이브 ${this.wave}에서 쓰러졌습니다.`),
      { fontFamily: FONT, fontSize: '20px', color: '#cfd8dc' }).setOrigin(.5).setDepth(51);
    const btn = this.add.rectangle(W / 2, 370, 180, 50, 0x1b5e20).setStrokeStyle(2, 0x66bb6a)
      .setInteractive({ useHandCursor: true }).setDepth(51);
    this.add.text(W / 2, 370, '다시 시작', { fontFamily: FONT, fontSize: '18px', color: '#fff' }).setOrigin(.5).setDepth(52);
    btn.on('pointerdown', () => this.scene.restart());
  }
}

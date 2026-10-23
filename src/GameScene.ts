import Phaser from 'phaser';
import {
  CLEAR_BONUS_BASE, CLEAR_BONUS_PER_WAVE, COLS, CONSOLE_Y, ENEMY_DEFS, EnemyKey, FINAL_BOSS_HP_MULT, FONT, H, MAP_H, MAP_Y, MAX_WAVE, ROWS, T, TEST_GOLD, TOWER_DEFS, TOWER_KEYS, TowerKey, W, WP, pathCells,
} from './config';
import { drawMap, makeTextures } from './textures';
import { Btn, mkBtn } from './ui';
import { loadUnitArt, UNIT_WORLD_SCALE } from './unitArt';
import { EquippedSkill, SKILL_DEFS, SKILL_SLOTS, SkillKey, UnitBuff } from './catalog';
import { SupplyShop } from './shop';
import { BUNKER_CAPACITY, BUNKER_PORTS, BUNKER_RANGE_BONUS, InfantryKey, isInfantry } from './bunker';

interface Tower {
  id: string;
  k: TowerKey; c: number; r: number; x: number; y: number;
  lvl: number; cd: number; spent: number;
  base: Phaser.GameObjects.Image; barrel: Phaser.GameObjects.Image;
  skills: EquippedSkill[]; buffs: UnitBuff[];
  host?: Tower; passengers: (Tower | null)[];
}

interface Enemy {
  type: EnemyKey; sprite: Phaser.GameObjects.Image;
  x: number; y: number; seg: number; hp: number; max: number; speed: number;
  slow: number; slowT: number; reward: number; r: number; dead?: boolean;
  stunT: number; burnT: number; burnDps: number; vulnerableT: number;
}

interface TowerStats { dmg: number; range: number; rate: number; splash: number; slow: number }

interface Projectile {
  s: Phaser.GameObjects.Image; x: number; y: number; tgt: Enemy; k: TowerKey; st: TowerStats; dead?: boolean;
}

interface Cell { c: number; r: number }
interface SkillField { x: number; y: number; radius: number; left: number; tick: number; dmg: number; color: number }

export class GameScene extends Phaser.Scene {
  private gold = 150;
  private lives = 20;
  private wave = 0;
  private towers: Tower[] = [];
  private nextUnitId = 0;
  private unloading: Tower | null = null;
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
  private shop!: SupplyShop;
  private shopOpen = false;
  private shopInputEnabled = true;
  private fields: SkillField[] = [];
  private shopBtn!: Btn;
  private skillBtn!: Btn;
  private uiCache: { hud?: string; info?: string } = {};

  private gfx!: Phaser.GameObjects.Graphics;
  private fxBoom!: Phaser.GameObjects.Particles.ParticleEmitter;
  private fxDie!: Phaser.GameObjects.Particles.ParticleEmitter;
  private fxFrost!: Phaser.GameObjects.Particles.ParticleEmitter;
  private fxPlace!: Phaser.GameObjects.Particles.ParticleEmitter;
  private hud!: Phaser.GameObjects.Text;
  private info!: Phaser.GameObjects.Text;
  private mineralTxt!: Phaser.GameObjects.Text;
  private lifeTxt!: Phaser.GameObjects.Text;
  private statusTxt!: Phaser.GameObjects.Text;
  private unitTitle!: Phaser.GameObjects.Text;
  private unitImage!: Phaser.GameObjects.Image;
  private miniGfx!: Phaser.GameObjects.Graphics;
  private pauseTxt!: Phaser.GameObjects.Text;
  private towerBtns: Btn[] = [];
  private goBtn!: Btn;
  private spdBtn!: Btn;
  private pauseBtn!: Btn;
  private upBtn!: Btn;
  private sellBtn!: Btn;

  constructor() { super('game'); }

  preload(): void { loadUnitArt(this); }

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
    this.nextUnitId = 0; this.unloading = null;
    this.spawnQ = []; this.spawnT = 0; this.waveActive = false;
    this.building = null; this.selected = null; this.hover = null;
    this.speed = 1; this.paused = false; this.over = false; this.bossLeaked = false;
    this.uiCache = {};
    this.towerBtns = [];
    this.fields = []; this.shopOpen = false;

    this.gfx = this.add.graphics().setDepth(10);
    const emitter = (tint: number, speed: number, life: number) => this.add.particles(0, 0, 'spark', {
      speed: { min: speed * .3, max: speed }, lifespan: life, scale: { start: 1.3, end: 0 }, tint, emitting: false,
    }).setDepth(20);
    this.fxBoom = emitter(0xff8a65, 200, 450);
    this.fxDie = emitter(0xef9a9a, 130, 400);
    this.fxFrost = emitter(0xb3e5fc, 110, 350);
    this.fxPlace = emitter(0xffffff, 90, 350);

    this.buildUI();
    this.shop = new SupplyShop({
      state: () => ({ gold: this.gold, selectedId: this.selected?.id ?? null,
        units: this.towers.map(t => ({ id: t.id, k: t.k, lvl: t.lvl, skills: t.skills, c: t.c, r: t.r,
          hostId: t.host?.id, passengers: t.passengers.map(p => p?.id ?? null) })) }),
      select: id => { this.selected = this.towers.find(t => t.id === id) ?? null; this.building = null; this.unloading = null; },
      choose: k => this.chooseBuild(k, true),
      equip: k => this.equipSkill(k),
      recruit: (id, slot, key) => this.recruit(id, slot, key),
      board: (id, slot, unitId) => this.board(id, slot, unitId),
      unload: id => this.beginUnload(id),
      close: () => { this.shopOpen = false; this.input.enabled = this.shopInputEnabled; },
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.shop.destroy());

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => { this.hover = this.cellAt(p); });
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onMapClick(p));
    this.input.mouse?.disableContextMenu();
    this.input.keyboard?.addCapture('SPACE');
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => this.onKey(e));
  }

  private cellAt(p: Phaser.Input.Pointer): Cell | null {
    if (p.y < MAP_Y || p.y >= CONSOLE_Y || p.x < 0 || p.x >= W) return null;
    return { c: Math.floor(p.x / T), r: Math.floor((p.y - MAP_Y) / T) };
  }

  // ---------- UI ----------
  private buildUI(): void {
    const y = CONSOLE_Y;
    const metal = this.add.graphics().setDepth(25);
    const panel = (x: number, top: number, w: number, h: number) => {
      metal.fillStyle(0x111715).fillRect(x, top, w, h);
      metal.fillStyle(0x29312e).fillRect(x + 2, top + 2, w - 4, h - 4);
      metal.fillStyle(0x1b2320).fillRect(x + 6, top + 6, w - 12, h - 12);
      metal.lineStyle(1, 0x596150).strokeRect(x + 2, top + 2, w - 4, h - 4);
      metal.lineStyle(1, 0x0a110d).strokeRect(x + 6, top + 6, w - 12, h - 12);
      for (const xx of [x + 9, x + w - 10]) for (const yy of [top + 9, top + h - 10]) {
        metal.fillStyle(0x0c110f).fillCircle(xx, yy, 3);
        metal.lineStyle(1, 0x717765).lineBetween(xx - 1, yy - 1, xx + 1, yy + 1);
      }
    };
    const text = (x: number, top: number, value: string, size = 12, color = '#a0ad92') =>
      this.add.text(x, top, value, { fontFamily: FONT, fontSize: size + 'px', color }).setDepth(30);
    panel(0, 0, W, MAP_Y);
    metal.fillStyle(0x111915).fillRect(0, y, W, H - y);
    metal.fillStyle(0x626751).fillRect(0, y, W, 2);
    metal.fillStyle(0x060c08).fillRect(0, y + 3, W, 5);
    for (let x = 8; x < W; x += 18) metal.fillStyle(0x363e30).fillRect(x, y + 4, 10, 2);
    panel(8, y + 12, 194, 184);
    panel(208, y + 12, 316, 184);
    panel(530, y + 12, 422, 184);
    text(21, 10, 'FRONTIER', 21, '#d2d7be').setFontStyle('bold').setLetterSpacing(3);
    text(23, 36, '기지 방어   /   SECTOR 07', 9, '#8a967b').setLetterSpacing(1);
    text(316, 10, 'OPERATION', 8, '#77876d').setLetterSpacing(2);
    this.hud = text(315, 25, '', 17, '#cbd5b8').setFontFamily('monospace');
    text(585, 10, 'MINERALS', 9, '#80978d').setLetterSpacing(1);
    this.mineralTxt = text(607, 25, '', 19, '#a6d7e1').setFontFamily('monospace');
    metal.fillStyle(0x5dacc0).fillTriangle(587, 27, 580, 36, 587, 44).fillTriangle(589, 27, 596, 36, 589, 44);
    text(742, 10, 'BASE INTEGRITY', 9, '#87977a').setLetterSpacing(1);
    this.lifeTxt = text(742, 26, '', 17, '#b7dc8e').setFontFamily('monospace');
    text(903, 16, 'SOLO', 9, '#a5ba8d').setLetterSpacing(1);
    text(901, 33, '● LIVE', 8, '#8eb967');
    text(24, y + 23, '전술 지도', 11, '#b7c2a2');
    text(140, y + 25, 'F-07', 9, '#72866a').setFontFamily('monospace');
    this.add.rectangle(24, y + 48, 162, 108, 0x0a1711).setOrigin(0).setStrokeStyle(1, 0x556447).setDepth(27);
    const mini = this.add.graphics().setDepth(28);
    for (const cell of pathCells) {
      const [c, r] = cell.split(',').map(Number);
      if (c >= 0 && c < COLS) mini.fillStyle(0x3f5941).fillRect(25 + c * 8, y + 53 + r * 8, 8, 8);
    }
    mini.lineStyle(1, 0x7a9663, .5).strokeRect(27, y + 51, 156, 102);
    for (let yy = y + 51; yy < y + 156; yy += 3) mini.fillStyle(0x000000, .15).fillRect(25, yy, 160, 1);
    this.miniGfx = this.add.graphics().setDepth(29);
    text(26, y + 167, '● 아군', 9, '#a6d97a');
    text(94, y + 167, '● 적군', 9, '#d78e72');
    this.unitTitle = text(224, y + 26, '기지 사령부', 14, '#c9d7b2').setFontStyle('bold');
    this.add.rectangle(224, y + 51, 90, 106, 0x0a1710).setOrigin(0).setStrokeStyle(1, 0x52634b).setDepth(27);
    this.unitImage = this.add.image(269, y + 104, 'portrait').setDisplaySize(88, 104).setDepth(28);
    this.info = text(326, y + 53, '', 11, '#a5b897').setLineSpacing(7);
    this.upBtn = mkBtn(this, 224, y + 163, 166, 25, '', () => this.upgrade(), 10);
    this.sellBtn = mkBtn(this, 396, y + 163, 112, 25, '', () => this.sell(), 10);
    this.upBtn.show(false); this.sellBtn.show(false);
    this.statusTxt = text(225, y + 170, '', 10, '#849a76');
    text(546, y + 24, '건설 명령', 11, '#b7c2a2');
    this.shopBtn = mkBtn(this, 807, y + 20, 130, 21, '보급 상점 [B]', () => this.openShop(), 10);
    this.skillBtn = mkBtn(this, 441, y + 24, 67, 21, '스킬 장착', () => this.openShop(this.selected?.k === 'bunker' ? 'garrison' : 'skills'), 9);
    this.skillBtn.show(false);
    this.towerBtns = TOWER_KEYS.slice(0, 4).map((k, i) => {
      const d = TOWER_DEFS[k];
      return mkBtn(this, 544 + i * 100, y + 43, 94, 95, `[${i + 1}] ${d.name}\n${d.cost} 미네랄`, () => this.chooseBuild(k), 10, k);
    });
    this.goBtn = mkBtn(this, 544, y + 146, 206, 38, '▶  웨이브 시작  [SPACE]', () => this.startWave(), 12);
    this.goBtn.act(true);
    this.spdBtn = mkBtn(this, 756, y + 146, 86, 38, '배속 ×1', () => {
      this.speed = this.speed % 3 + 1; this.spdBtn.set('배속 ×' + this.speed);
    }, 11);
    this.pauseBtn = mkBtn(this, 848, y + 146, 90, 38, '정지 [P]', () => this.togglePause(), 11);
    text(16, H - 17, 'B 상점    /    1–9 유닛    /    U 강화·주둔    /    S 회수    /    ESC 취소    /    스킬 자동 사용', 9, '#7d8b73');
    text(W - 16, H - 17, `FRONTIER  /  v${__APP_VERSION__}`, 9, '#616f5b').setOrigin(1, 0).setFontFamily('monospace');
    this.pauseTxt = this.add.text(W / 2, MAP_Y + MAP_H / 2, '전술 일시정지\n[ P ] 작전 재개', {
      fontFamily: FONT, fontSize: '28px', align: 'center', lineSpacing: 18, color: '#c5e49e',
      backgroundColor: '#0b1715ee', padding: { x: 42, y: 28 }, stroke: '#253a25', strokeThickness: 1,
    }).setOrigin(.5).setDepth(40).setVisible(false);
  }

  private refreshUI(): void {
    const remaining = this.enemies.length + this.spawnQ.length;
    const hud = `${this.wave}/${this.gold}/${this.lives}/${remaining}/${this.paused}/${this.over}`;
    if (this.uiCache.hud !== hud) {
      this.uiCache.hud = hud;
      this.hud.setText(`WAVE  ${String(this.wave).padStart(2, '0')} / ${MAX_WAVE}`);
      this.mineralTxt.setText(this.gold.toLocaleString());
      this.lifeTxt.setText(`${Math.max(0, this.lives)} / 20`);
      this.lifeTxt.setColor(this.lives <= 5 ? '#e29a7f' : '#b7dc8e');
      this.goBtn.set(this.over ? '작전 종료' : this.waveActive ? `교전 중 · 남은 적 ${remaining}` : '▶  웨이브 시작  [SPACE]');
    }
    TOWER_KEYS.slice(0, 4).forEach((k, i) => {
      this.towerBtns[i].act(this.building === k);
      this.towerBtns[i].en(!this.over && (this.gold >= TOWER_DEFS[k].cost || this.building === k));
    });
    this.goBtn.en(!this.waveActive && !this.over && !this.paused && !this.shopOpen && (this.testMode || this.wave < MAX_WAVE));
    this.shopBtn.en(!this.over);
    const t = this.selected, k = t?.k ?? this.building;
    let title: string, msg: string;
    if (k) {
      const d = TOWER_DEFS[k], st = t ? this.stats(t) : d;
      title = `${d.name}  ${t ? 'Lv.' + t.lvl : '/ 건설 대기'}`;
      if (k === 'bunker') {
        const crew = t?.passengers.filter((p): p is Tower => !!p) ?? [];
        title = `벙커  ${crew.length}/${BUNKER_CAPACITY} 주둔`;
        msg = `보병 최대 4기 · 사거리 +${BUNKER_RANGE_BONUS}\n` + (crew.length ? crew.map(p => `${TOWER_DEFS[p.k].name} Lv.${p.lvl} · 스킬 ${p.skills.length}/2`).join('\n') : '현재 주둔 병력 없음\n빈 벙커는 공격하지 않습니다.\n[병력 관리]에서 탑승·구매');
      } else {
        msg = `공격 ${st.dmg.toFixed(0)} · 사거리 ${st.range.toFixed(0)}\n공격 속도 ${(1 / st.rate).toFixed(1)}/초\n자동 스킬 ${t?.skills.length ?? 0}/${SKILL_SLOTS}`;
        msg += t?.skills.length ? '\n' + t.skills.map(s => `${SKILL_DEFS[s.key].name} ${s.cd > 0 ? Math.ceil(s.cd) + '초' : '준비'}`).join('\n') : '\n상점에서 스킬을 장착하세요.';
        if (t?.host) title += ' / 탑승';
      }
    } else {
      title = '기지 사령부';
      msg = this.unloading ? `${TOWER_DEFS[this.unloading.k].name} 하차 대기\n빈 구역을 클릭하세요.\nESC 취소 · 병력은 탑승 유지` : 'FRONTIER COMMAND\n[B] 상점 · 유닛 9종\n벙커 → 병력 관리 → 탑승\n스킬 장착 → 자동 사용';
    }
    const cache = title + msg;
    if (this.uiCache.info !== cache) {
      this.uiCache.info = cache;
      this.unitTitle.setText(title); this.info.setText(msg);
      this.unitImage.setTexture(k ? 'unit_' + k : 'portrait');
      if (k) this.unitImage.setDisplaySize(88, 88); else this.unitImage.setDisplaySize(88, 104);
    }
    this.upBtn.show(!!t); this.sellBtn.show(!!t); this.statusTxt.setVisible(!t);
    this.skillBtn.show(!!t && !this.over);
    this.skillBtn.set(t?.k === 'bunker' ? '병력 관리' : '스킬 장착');
    this.statusTxt.setText(this.unloading ? '빈 구역 클릭 하차 / ESC 취소' : this.testMode ? `시험 작전 / ${this.repeat}회차` : this.building ? '빈 구역 클릭 배치 / ESC 취소' : this.paused ? '작전 일시정지' : this.waveActive ? '방어 시스템 가동 중' : '명령 대기 / SPACE 출격');
    if (t) {
      const occupied = t.k === 'bunker' && t.passengers.some(Boolean);
      this.upBtn.set(t.k === 'bunker' ? '[U] 병력 관리 · 4칸' : t.lvl < 3 ? `[U] 강화  ${this.upgradeCost(t)} 미네랄` : '최대 강화 완료');
      this.upBtn.en(!this.over && (t.k === 'bunker' || t.lvl < 3 && this.gold >= this.upgradeCost(t)));
      this.sellBtn.set(occupied ? '병력 하차 후 회수' : `[S] 회수 +${this.sellValue(t)}`);
      this.sellBtn.en(!this.over && !occupied);
    }
  }

  // ---------- 입력 ----------
  private onKey(e: KeyboardEvent): void {
    if (e.repeat) return;
    if (this.shopOpen) { if (e.key === 'Escape' || e.key.toLowerCase() === 'b') this.shop.close(); return; }
    if (e.key.toLowerCase() === 'b') { this.openShop(); return; }
    if (e.key >= '1' && e.key <= '9') this.chooseBuild(TOWER_KEYS[+e.key - 1], true);
    else if (e.key === 'Escape') { this.building = null; this.selected = null; this.unloading = null; }
    else if (e.key === ' ') this.startWave();
    else if (e.key === 'p' || e.key === 'P') this.togglePause();
    else if (e.key === 'u' || e.key === 'U') this.upgrade();
    else if (e.key === 's' || e.key === 'S') this.sell();
  }

  private chooseBuild(k: TowerKey, force = false): void {
    if (this.over) return;
    this.building = (!force && this.building === k) ? null : k;
    this.selected = null; this.unloading = null;
  }

  private togglePause(): void {
    if (this.over) return;
    this.paused = !this.paused;
    this.pauseTxt.setVisible(this.paused);
    this.pauseBtn.set(this.paused ? '재개 [P]' : '정지 [P]');
  }

  private onMapClick(p: Phaser.Input.Pointer): void {
    if (this.over || this.shopOpen) return;
    if (p.rightButtonDown()) { this.building = null; this.selected = null; this.unloading = null; return; }
    const cell = this.cellAt(p);
    if (!cell) return;
    if (this.unloading) { this.finishUnload(cell.c, cell.r); return; }
    const t = this.towers.find(t => !t.host && t.c === cell.c && t.r === cell.r);
    if (t) {
      this.selected = this.selected === t ? null : t; this.building = null;
      if (this.selected?.k === 'bunker') this.openShop('garrison');
    }
    else if (this.building) this.placeTower(cell.c, cell.r);
    else this.selected = null;
  }

  // ---------- 타워 ----------
  private openShop(tab: 'units' | 'skills' | 'garrison' = 'units'): void {
    if (this.over || this.shopOpen) return;
    this.shopOpen = true; this.hover = null;
    this.shopInputEnabled = this.input.enabled;
    this.input.enabled = false;
    this.shop.open(tab);
  }

  private equipSkill(key: SkillKey): boolean {
    const t = this.selected, skill = SKILL_DEFS[key];
    if (this.over || !t || skill.unit !== t.k || this.gold < skill.cost || t.skills.length >= SKILL_SLOTS || t.skills.some(s => s.key === key)) return false;
    this.gold -= skill.cost; t.spent += skill.cost;
    t.skills.push({ key, cd: 0 });
    this.fxPlace.explode(10, t.x, t.y);
    return true;
  }

  private stats(t: Tower): TowerStats {
    const d: { dmg: number; range: number; rate: number; splash?: number; slow?: number } = TOWER_DEFS[t.k];
    const l = t.lvl - 1;
    const haste = t.buffs.reduce((v, b) => v * b.haste, 1);
    const power = t.buffs.reduce((v, b) => v * b.power, 1);
    return {
      dmg: d.dmg * Math.pow(1.6, l) * power,
      range: d.range * (1 + .08 * l) + (t.host ? BUNKER_RANGE_BONUS : 0),
      rate: d.rate * Math.pow(.92, l) / haste,
      splash: d.splash ? d.splash * (1 + .1 * l) : 0,
      slow: d.slow ? Math.max(.2, d.slow - .08 * l) : 0,
    };
  }
  private upgradeCost(t: Tower): number { return Math.round(TOWER_DEFS[t.k].cost * .8 * t.lvl); }
  private sellValue(t: Tower): number { return Math.round(t.spent * .7); }

  private cellFree(c: number, r: number): boolean {
    return c >= 0 && r >= 0 && c < COLS && r < ROWS && !pathCells.has(c + ',' + r)
      && !this.towers.some(t => !t.host && t.c === c && t.r === r);
  }

  private placeTower(c: number, r: number): void {
    const k = this.building;
    if (!k) return;
    const d = TOWER_DEFS[k];
    if (!this.cellFree(c, r) || this.gold < d.cost) return;
    this.gold -= d.cost;
    const t = this.createTower(k, c, r);
    this.floatText(t.x, t.y, d.name, '#c7dfaa');
    if (k === 'bunker') { this.building = null; this.selected = t; this.openShop('garrison'); }
    else if (this.gold < d.cost) this.building = null;
  }

  private createTower(k: TowerKey, c: number, r: number): Tower {
    const x = (c + .5) * T, y = MAP_Y + (r + .5) * T;
    const base = this.add.image(x, y, 'base_' + k).setDepth(5);
    const barrel = this.add.image(x, y, 'barrel_' + k).setOrigin(.5).setDepth(6);
    const scale = UNIT_WORLD_SCALE[k] ?? 1;
    this.tweens.add({ targets: [base, barrel], scale: { from: 0, to: scale }, duration: 220, ease: 'Back.Out' });
    if (k === 'cruiser') this.tweens.add({ targets: barrel, y: y - 2, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    if (k === 'frost') this.tweens.add({ targets: barrel, alpha: { from: .72, to: 1 }, duration: 1100, yoyo: true, repeat: -1 });
    this.fxPlace.explode(8, x, y);
    const t: Tower = { id: String(++this.nextUnitId), k, c, r, x, y, lvl: 1, cd: 0, spent: TOWER_DEFS[k].cost, base, barrel, skills: [], buffs: [], passengers: Array(BUNKER_CAPACITY).fill(null) };
    this.towers.push(t);
    return t;
  }

  private boardingSlot(id: string, slot: number): Tower | undefined {
    if (this.over || !Number.isInteger(slot) || slot < 0 || slot >= BUNKER_CAPACITY) return;
    return this.towers.find(t => t.id === id && t.k === 'bunker' && !t.passengers[slot]);
  }

  private recruit(id: string, slot: number, key: InfantryKey): boolean {
    const bunker = this.boardingSlot(id, slot);
    if (!bunker || !isInfantry(key) || this.gold < TOWER_DEFS[key].cost) return false;
    this.gold -= TOWER_DEFS[key].cost;
    const unit = this.createTower(key, bunker.c, bunker.r);
    this.garrison(bunker, slot, unit);
    return true;
  }

  private board(id: string, slot: number, unitId: string): boolean {
    const bunker = this.boardingSlot(id, slot), unit = this.towers.find(t => t.id === unitId);
    if (!bunker || !unit || unit.host || !isInfantry(unit.k) || unit === this.unloading) return false;
    this.garrison(bunker, slot, unit);
    return true;
  }

  private garrison(bunker: Tower, slot: number, unit: Tower): void {
    bunker.passengers[slot] = unit; unit.host = bunker;
    unit.c = bunker.c; unit.r = bunker.r;
    unit.x = bunker.x + BUNKER_PORTS[slot].x; unit.y = bunker.y + BUNKER_PORTS[slot].y;
    this.tweens.killTweensOf([unit.base, unit.barrel]);
    unit.base.setPosition(unit.x, unit.y).setVisible(false);
    unit.barrel.setPosition(unit.x, unit.y).setVisible(false);
    this.selected = bunker;
  }

  private beginUnload(id: string): boolean {
    const unit = this.towers.find(t => t.id === id);
    if (this.over || !unit?.host) return false;
    this.unloading = unit; this.selected = null; this.building = null;
    return true;
  }

  private finishUnload(c: number, r: number): void {
    const unit = this.unloading;
    if (!unit?.host || !this.cellFree(c, r)) return;
    const slot = unit.host.passengers.indexOf(unit);
    unit.host.passengers[slot] = null; unit.host = undefined;
    unit.c = c; unit.r = r; unit.x = (c + .5) * T; unit.y = MAP_Y + (r + .5) * T;
    this.tweens.killTweensOf([unit.base, unit.barrel]);
    const scale = UNIT_WORLD_SCALE[unit.k] ?? 1;
    unit.base.setPosition(unit.x, unit.y).setScale(scale).setVisible(true);
    unit.barrel.setPosition(unit.x, unit.y).setScale(scale).setVisible(true);
    this.fxPlace.explode(8, unit.x, unit.y);
    this.unloading = null; this.selected = unit;
  }

  private upgrade(): void {
    const t = this.selected;
    if (!this.over && t?.k === 'bunker') { this.openShop('garrison'); return; }
    if (this.over || !t || t.lvl >= 3 || this.gold < this.upgradeCost(t)) return;
    const c = this.upgradeCost(t);
    this.gold -= c; t.spent += c; t.lvl++;
    const scale = UNIT_WORLD_SCALE[t.k] ?? 1;
    this.tweens.add({ targets: [t.base, t.barrel], scale: { from: scale * 1.3, to: scale }, duration: 250, ease: 'Back.Out' });
    this.fxPlace.explode(12, t.x, t.y);
  }

  private sell(): void {
    const t = this.selected;
    if (this.over || !t) return;
    if (t.k === 'bunker' && t.passengers.some(Boolean)) return;
    this.gold += this.sellValue(t);
    this.floatText(t.x, t.y, '+' + this.sellValue(t), '#ffd54f');
    t.base.destroy(); t.barrel.destroy();
    if (t.host) t.host.passengers[t.host.passengers.indexOf(t)] = null;
    if (this.unloading === t) this.unloading = null;
    this.towers = this.towers.filter(x => x !== t);
    this.selected = null;
  }

  // ---------- 웨이브 / 적 ----------
  private startWave(): void {
    if (this.over || this.paused || this.shopOpen || this.waveActive || (!this.testMode && this.wave >= MAX_WAVE)) return;
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
      stunT: 0, burnT: 0, burnDps: 0, vulnerableT: 0,
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
    const t = this.add.text(W / 2, MAP_Y + 40, msg, { fontFamily: FONT, fontSize: '24px', fontStyle: 'bold', color: '#d4e8b9', stroke: '#15241b', strokeThickness: 5 })
      .setOrigin(.5).setDepth(40).setAlpha(0);
    this.tweens.add({ targets: t, alpha: 1, y: MAP_Y + 62, duration: 300, yoyo: true, hold: 900, onComplete: () => t.destroy() });
  }

  // ---------- 게임 루프 ----------
  update(_time: number, delta: number): void {
    if (!this.paused && !this.over && !this.shopOpen) {
      const dt = Math.min(.05, delta / 1000);
      for (let i = 0; i < this.speed && !this.over; i++) this.step(dt);
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
      if (e.dead) continue;
      e.vulnerableT = Math.max(0, e.vulnerableT - dt);
      if (e.burnT > 0) {
        this.damageEnemy(e, e.burnDps * Math.min(dt, e.burnT));
        e.burnT = Math.max(0, e.burnT - dt);
        if (e.dead) continue;
      }
      const stunned = e.stunT > 0;
      e.stunT = Math.max(0, e.stunT - dt);
      e.slowT = Math.max(0, e.slowT - dt);
      if (!e.slowT) e.slow = 1;
      let mv = stunned ? 0 : e.speed * e.slow * dt;
      while (mv > 0 && e.seg < WP.length) {
        const tg = WP[e.seg], dx = tg.x - e.x, dy = tg.y - e.y, dist = Math.hypot(dx, dy);
        if (dist <= mv) { e.x = tg.x; e.y = tg.y; e.seg++; mv -= dist; }
        else { e.x += dx / dist * mv; e.y += dy / dist * mv; mv = 0; }
      }
      e.sprite.setPosition(e.x, e.y);
      if (e.seg < WP.length) e.sprite.setRotation(Math.atan2(WP[e.seg].y - e.y, WP[e.seg].x - e.x));
      if (stunned) e.sprite.setTint(0xb7f5ff);
      else if (e.burnT > 0) e.sprite.setTint(0xffab69);
      else if (e.vulnerableT > 0) e.sprite.setTint(0xb8a0ff);
      else if (e.slow < 1) e.sprite.setTint(0x81d4fa); else e.sprite.clearTint();
      if (e.seg >= WP.length) {
        e.dead = true; e.sprite.destroy();
        if (e.type === 'boss') { this.bossLeaked = true; this.lives = 0; } else this.lives--;
        this.cameras.main.shake(150, .006);
        this.cameras.main.flash(120, 255, 60, 60);
      }
    }

    for (const t of this.towers) this.towerAct(t, dt);

    for (const field of this.fields) {
      field.left -= dt; field.tick -= dt;
      if (field.tick <= 0) {
        field.tick += .5;
        for (const e of this.enemies) if (!e.dead && Math.hypot(e.x - field.x, e.y - field.y) <= field.radius) this.damageEnemy(e, field.dmg);
      }
    }
    this.fields = this.fields.filter(f => f.left > 0);

    for (const p of this.projs) {
      const e = p.tgt;
      if (e.dead) { p.dead = true; p.s.destroy(); continue; }
      const dx = e.x - p.x, dy = e.y - p.y, dist = Math.hypot(dx, dy), mv = 420 * dt;
      if (dist <= mv + e.r) { this.hit(p); p.dead = true; p.s.destroy(); }
      else { p.x += dx / dist * mv; p.y += dy / dist * mv; p.s.setPosition(p.x, p.y).setRotation(Math.atan2(dy, dx)); }
    }
    this.projs = this.projs.filter(p => !p.dead);
    this.enemies = this.enemies.filter(e => !e.dead);

    if (this.waveActive && !this.spawnQ.length && !this.enemies.length && this.lives > 0) {
      this.waveActive = false;
      if (this.wave >= MAX_WAVE && !this.testMode) this.endGame(true);
      else {
        const bonus = CLEAR_BONUS_BASE + this.wave * CLEAR_BONUS_PER_WAVE;
        this.gold += bonus;
        this.banner(`구역 확보 · +${bonus} 미네랄`);
      }
    }
    if (this.lives <= 0) this.endGame(false);
  }

  private towerAct(t: Tower, dt: number): void {
    if (t.k === 'bunker') return;
    for (const buff of t.buffs) buff.left -= dt;
    t.buffs = t.buffs.filter(b => b.left > 0);
    for (const skill of t.skills) skill.cd = Math.max(0, skill.cd - dt);
    t.cd = Math.max(0, t.cd - dt);
    let best = this.findTarget(t);
    if (!best) return;
    for (const skill of t.skills) {
      if (skill.cd > 0) continue;
      if (best.dead) best = this.findTarget(t);
      if (!best) break;
      t.barrel.rotation = t.k === 'frost' ? 0 : Math.atan2(best.y - t.y, best.x - t.x);
      this.autoSkill(t, skill.key, best);
      skill.cd = SKILL_DEFS[skill.key].cooldown;
    }
    if (best?.dead) best = this.findTarget(t);
    if (!best) return;
    const st = this.stats(t);
    t.barrel.rotation = t.k === 'frost' ? 0 : Math.atan2(best.y - t.y, best.x - t.x);
    if (t.cd > 0) return;
    t.cd = st.rate;
    const d = TOWER_DEFS[t.k];
    const angle = Math.atan2(best.y - t.y, best.x - t.x);
    const reach = t.k === 'cruiser' ? 29 * (UNIT_WORLD_SCALE.cruiser ?? 1) : t.k === 'cannon' ? 31 * (UNIT_WORLD_SCALE.cannon ?? 1) : t.k === 'marine' && !t.host ? 31 : t.k === 'arrow' ? 15 : 8;
    const muzzleX = t.k === 'frost' ? t.x : t.x + Math.cos(angle) * reach;
    const muzzleY = t.k === 'frost' ? t.y - 18 : t.y + Math.sin(angle) * reach;
    const s = this.add.image(muzzleX, muzzleY, 'shot_' + t.k).setDepth(9).setRotation(angle);
    this.projs.push({ s, x: muzzleX, y: muzzleY, tgt: best, k: t.k, st });
    const flash = this.add.circle(muzzleX, muzzleY, t.k === 'cannon' ? 8 : 5, d.proj, .7).setDepth(9);
    this.tweens.add({ targets: flash, scale: 1.8, alpha: 0, duration: 160, onComplete: () => flash.destroy() });
    if (t.k === 'cannon') {
      const recoil = 5 * (UNIT_WORLD_SCALE.cannon ?? 1);
      this.tweens.add({ targets: t.barrel, x: t.x - Math.cos(angle) * recoil, y: t.y - Math.sin(angle) * recoil, duration: 90, yoyo: true });
    } else if (t.k === 'frost' || t.k === 'sniper' || t.k === 'templar') {
      this.tweens.add({ targets: t.barrel, scale: { from: 1.1, to: 1 }, duration: 220 });
    } else if (t.k === 'cruiser') {
      this.tweens.add({ targets: t.barrel, alpha: { from: .88, to: 1 }, duration: 140 });
    } else {
      this.tweens.add({ targets: t.barrel, scale: { from: .94, to: 1 }, duration: 100 });
    }
  }

  private findTarget(t: Tower): Enemy | null {
    const range = this.stats(t).range;
    let best: Enemy | null = null, bp = -Infinity;
    for (const e of this.enemies) {
      if (e.dead || Math.hypot(e.x - t.x, e.y - t.y) > range) continue;
      const nx = WP[Math.min(e.seg, WP.length - 1)];
      const p = e.seg * 10000 - Math.hypot(nx.x - e.x, nx.y - e.y);
      if (p > bp) { bp = p; best = e; }
    }
    return best;
  }

  private damageEnemy(e: Enemy, dmg: number): void {
    if (e.dead) return;
    e.hp -= dmg * (e.vulnerableT > 0 ? 1.35 : 1);
    if (e.hp <= 0) this.killEnemy(e);
  }

  private skillRing(x: number, y: number, radius: number, color: number): void {
    const ring = this.add.circle(x, y, 6, color, .12).setStrokeStyle(1.5, color, .8).setDepth(11);
    this.tweens.add({ targets: ring, scale: radius / 6, alpha: 0, duration: 500, onComplete: () => ring.destroy() });
  }

  private skillBeam(from: { x: number; y: number }, to: { x: number; y: number }, color: number, width = 2): void {
    const beam = this.add.graphics().setDepth(12);
    beam.lineStyle(width + 4, color, .2).lineBetween(from.x, from.y, to.x, to.y);
    beam.lineStyle(width, color, .9).lineBetween(from.x, from.y, to.x, to.y);
    this.tweens.add({ targets: beam, alpha: 0, duration: 360, onComplete: () => beam.destroy() });
  }

  private autoSkill(t: Tower, key: SkillKey, target: Enemy): void {
    const d = SKILL_DEFS[key], st = this.stats(t);
    const nearby = this.enemies.filter(e => !e.dead && Math.hypot(e.x - t.x, e.y - t.y) <= st.range)
      .sort((a, b) => Math.hypot(a.x - target.x, a.y - target.y) - Math.hypot(b.x - target.x, b.y - target.y));
    const burn = (e: Enemy, factor: number, seconds: number) => {
      e.burnDps = Math.max(e.burnT > 0 ? e.burnDps : 0, st.dmg * factor);
      e.burnT = Math.max(e.burnT, seconds);
    };
    const area = (x: number, y: number, radius: number, factor: number, status?: (e: Enemy) => void) => {
      this.skillRing(x, y, radius, d.color);
      for (const e of this.enemies) {
        if (e.dead || Math.hypot(e.x - x, e.y - y) > radius) continue;
        status?.(e); this.damageEnemy(e, st.dmg * factor);
      }
    };
    this.floatText(t.x, t.y - 12, d.name, '#' + d.color.toString(16).padStart(6, '0'));
    switch (key) {
      case 'barrage':
        for (const e of nearby.slice(0, 4)) { this.skillBeam(t, e, d.color); this.damageEnemy(e, st.dmg * 2); }
        break;
      case 'overdrive': t.buffs.push({ left: 4, haste: 2, power: 1 }); this.skillRing(t.x, t.y, 35, d.color); break;
      case 'siege': area(target.x, target.y, 90, 3.2); this.fxBoom.explode(24, target.x, target.y); break;
      case 'shrapnel': area(target.x, target.y, 75, 2.2, e => { e.slow = Math.min(e.slow, .4); e.slowT = Math.max(e.slowT, 3); }); break;
      case 'freeze': area(target.x, target.y, 75, 0, e => { e.stunT = Math.max(e.stunT, e.type === 'boss' ? .6 : 2); }); break;
      case 'nova': area(t.x, t.y, 135, 5, e => { e.slow = Math.min(e.slow, .35); e.slowT = Math.max(e.slowT, 4); }); break;
      case 'plasma':
        this.skillBeam(t, target, d.color, 4); this.damageEnemy(target, st.dmg * 2); target.vulnerableT = 5;
        break;
      case 'chain': {
        let previous: { x: number; y: number } = t;
        nearby.slice(0, 5).forEach((e, i) => { this.skillBeam(previous, e, d.color, 2); this.damageEnemy(e, st.dmg * 1.8 * (1 - .12 * i)); previous = e; });
        break;
      }
      case 'stim': t.buffs.push({ left: 6, haste: 1.8, power: 1 }); this.skillRing(t.x, t.y, 35, d.color); break;
      case 'burst': this.skillBeam(t, target, d.color, 3); this.damageEnemy(target, st.dmg * 4.5); break;
      case 'inferno': area(target.x, target.y, 70, 2.5, e => burn(e, 1, 4)); this.fxBoom.explode(20, target.x, target.y); break;
      case 'ignite':
        for (const e of nearby.slice(0, 3)) { burn(e, 1.5, 6); this.skillBeam(t, e, d.color); }
        break;
      case 'storm':
        this.fields.push({ x: target.x, y: target.y, radius: 85, left: 4, tick: .5, dmg: st.dmg * .9, color: d.color });
        this.skillRing(target.x, target.y, 85, d.color);
        break;
      case 'warp':
        for (const ally of this.towers) if (ally.k !== 'bunker' && Math.hypot(ally.x - t.x, ally.y - t.y) <= 150) {
          ally.buffs.push({ left: 6, haste: 1.3, power: 1.3 }); this.skillBeam(t, ally, d.color);
        }
        this.skillRing(t.x, t.y, 150, d.color);
        break;
      case 'yamato': {
        const angle = Math.atan2(target.y - t.y, target.x - t.x), reach = 29 * (UNIT_WORLD_SCALE.cruiser ?? 1);
        const bow = { x: t.x + Math.cos(angle) * reach, y: t.y + Math.sin(angle) * reach };
        const core = this.add.circle(bow.x, bow.y, 6, 0xffda8a, .85).setStrokeStyle(2, 0xfff2c8).setDepth(12);
        this.tweens.add({ targets: core, scale: 2.5, alpha: 0, duration: 360, onComplete: () => core.destroy() });
        this.skillBeam(bow, target, d.color, 9); this.skillRing(target.x, target.y, 55, d.color);
        this.damageEnemy(target, st.dmg * 8); this.fxBoom.explode(30, target.x, target.y);
        break;
      }
      case 'bombard':
        for (const e of nearby.slice(0, 3)) area(e.x, e.y, 55, 2.2);
        break;
    }
  }

  private hit(p: Projectile): void {
    const e = p.tgt, st = p.st;
    if (st.splash) {
      this.fxBoom.explode(14, e.x, e.y);
      const ring = this.add.circle(e.x, e.y, 6, 0xff8a65, .3).setStrokeStyle(2, 0xff8a65).setDepth(21);
      this.tweens.add({ targets: ring, scale: st.splash / 6, alpha: 0, duration: 300, onComplete: () => ring.destroy() });
      for (const o of this.enemies) {
        if (o.dead || Math.hypot(o.x - e.x, o.y - e.y) > st.splash) continue;
        this.damageEnemy(o, st.dmg);
      }
    } else {
      this.damageEnemy(e, st.dmg);
    }
    if (st.slow && !e.dead) {
      e.slow = Math.min(e.slow, st.slow); e.slowT = Math.max(e.slowT, 2);
      this.fxFrost.explode(4, e.x, e.y);
    }
  }

  private drawOverlay(): void {
    const g = this.gfx;
    g.clear();
    for (const field of this.fields) {
      g.fillStyle(field.color, .09).fillCircle(field.x, field.y, field.radius);
      g.lineStyle(1.5, field.color, .55).strokeCircle(field.x, field.y, field.radius);
      const phase = this.time.now / 100;
      for (let i = 0; i < 5; i++) {
        const a = i * Math.PI * .4 + phase * .1, r = field.radius * .7;
        const x = field.x + Math.cos(a) * r, y = field.y + Math.sin(a) * r;
        g.lineStyle(1.5, field.color, .8).lineBetween(x - 7, y - 10, x + 3, y + 1)
          .lineBetween(x + 3, y + 1, x - 4, y + 3).lineBetween(x - 4, y + 3, x + 7, y + 13);
      }
    }
    const h = this.hover;
    const preview = this.unloading?.k ?? this.building;
    if (h && preview && !this.over) {
      const d = TOWER_DEFS[preview], ok = this.cellFree(h.c, h.r) && (!!this.unloading || this.gold >= d.cost);
      const color = ok ? 0xa9e875 : 0xe37962;
      const x = (h.c + .5) * T, y = MAP_Y + (h.r + .5) * T;
      g.fillStyle(color, ok ? .12 : .25).fillRect(h.c * T, MAP_Y + h.r * T, T, T);
      g.lineStyle(1, color, .8).strokeRect(h.c * T + 2, MAP_Y + h.r * T + 2, T - 4, T - 4);
      g.fillStyle(color, .05).fillCircle(x, y, d.range);
      g.lineStyle(1, color, .55).strokeCircle(x, y, d.range);
      g.lineStyle(2, color, .8).strokeCircle(x, y, 15);
      g.lineBetween(x - 9, y, x + 9, y).lineBetween(x, y - 9, x, y + 9);
    }
    for (const t of this.towers) {
      if (t.host) {
        // Occupants stay hidden; their individual barrels and lights appear at the apertures.
        const color = t.k === 'firebat' ? 0xffa15c : 0xa7d5e7;
        g.fillStyle(0x0b1712).fillCircle(t.x, t.y, 4);
        g.lineStyle(3, 0x18281f).lineBetween(t.x, t.y, t.x + Math.cos(t.barrel.rotation) * 8, t.y + Math.sin(t.barrel.rotation) * 8);
        g.lineStyle(1.5, color, .9).lineBetween(t.x, t.y, t.x + Math.cos(t.barrel.rotation) * 7, t.y + Math.sin(t.barrel.rotation) * 7);
        g.fillStyle(color, .8).fillCircle(t.x, t.y, 1.8);
        if (t === this.selected) {
          const range = this.stats(t).range;
          g.lineStyle(1, color, .5).strokeCircle(t.x, t.y, range);
          g.lineStyle(1.5, color).strokeCircle(t.x, t.y, 6);
        }
        continue;
      }
      if (t === this.selected) {
        const r = t.k === 'bunker' ? Math.max(0, ...t.passengers.filter((p): p is Tower => !!p).map(p => this.stats(p).range)) : this.stats(t).range;
        g.fillStyle(0xa9d879, .06).fillCircle(t.x, t.y, r);
        g.lineStyle(1, 0xa9d879, .55).strokeCircle(t.x, t.y, r);
        g.lineStyle(2, 0xa9d879).strokeEllipse(t.x, t.y + 8, 44, 28);
      }
      if (t.k === 'bunker') {
        t.passengers.forEach((p, slot) => {
          const x = t.x - 15 + slot * 10, y = t.y - 23;
          g.fillStyle(p ? p.k === 'firebat' ? 0xffa15c : 0xa7d5e7 : 0x1d2c22).fillRect(x, y, 7, 4);
          g.lineStyle(1, 0x8da17c, .7).strokeRect(x, y, 7, 4);
        });
      }
      g.fillStyle(0xffd54f);
      for (let i = 0; i < t.lvl; i++) g.fillRect(t.c * T + 7 + i * 8, MAP_Y + t.r * T + T - 7, 6, 3);
      t.skills.forEach((skill, i) => {
        const cooldown = SKILL_DEFS[skill.key].cooldown;
        const x = t.x - 10 + i * 13, y = t.y - 27;
        g.fillStyle(0x0a1410, .9).fillCircle(x, y, 4);
        g.fillStyle(SKILL_DEFS[skill.key].color, skill.cd > 0 ? .3 : 1).fillCircle(x, y, 2.5);
        g.lineStyle(1, SKILL_DEFS[skill.key].color, .8).beginPath().arc(x, y, 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - skill.cd / cooldown), false).strokePath();
      });
      if (t.buffs.length) g.lineStyle(1, 0xc7b0ff, .6).strokeEllipse(t.x, t.y + 15, 46, 18);
    }
    for (const e of this.enemies) {
      if (e.dead) continue;
      const w = e.r * 2 + 4, x = e.x - w / 2, y = e.y - e.r - 9;
      g.fillStyle(0x000000, .65).fillRect(x, y, w, 4);
      g.fillStyle(0x66bb6a).fillRect(x, y, w * Math.max(0, e.hp / e.max), 4);
      if (e.stunT > 0) g.lineStyle(1, 0xb4f4ff, .8).strokeCircle(e.x, e.y, e.r + 4);
      if (e.burnT > 0) g.fillStyle(0xffb456, .8).fillTriangle(e.x - 4, e.y - e.r, e.x, e.y - e.r - 8, e.x + 4, e.y - e.r);
    }
    const mini = this.miniGfx;
    mini.clear();
    for (const t of this.towers) if (!t.host) mini.fillStyle(t === this.selected || t === this.selected?.host ? 0xe0f7ad : 0x9bd76f).fillRect(25 + t.c * 8 + 2, CONSOLE_Y + 53 + t.r * 8 + 2, 4, 4);
    for (const e of this.enemies) {
      if (!e.dead && e.x >= 0 && e.x < W) mini.fillStyle(e.type === 'boss' ? 0xea85d8 : 0xe49674)
        .fillCircle(25 + e.x / W * 160, CONSOLE_Y + 53 + (e.y - MAP_Y) / MAP_H * 96, e.type === 'boss' ? 3 : 1.8);
    }
    // A small base-integrity meter beneath the top resource readout.
    mini.fillStyle(0x0b120e).fillRect(832, 31, 54, 9);
    mini.fillStyle(this.lives <= 5 ? 0xcf8067 : 0x9dc278).fillRect(834, 33, 50 * Math.max(0, this.lives) / 20, 5);
  }

  private endGame(win: boolean): void {
    if (this.over) return;
    this.over = true;
    this.pauseTxt.setVisible(false);
    this.add.rectangle(0, 0, W, H, 0x030906, .82).setOrigin(0).setDepth(50);
    this.add.rectangle(W / 2, 330, 580, 280, 0x18221c).setStrokeStyle(2, 0x738361).setDepth(51);
    this.add.rectangle(W / 2, 330, 568, 268).setStrokeStyle(1, 0x354530).setDepth(51);
    this.add.text(W / 2, 226, win ? 'MISSION COMPLETE' : 'SIGNAL LOST', { fontFamily: 'monospace', fontSize: '12px', color: '#94a680' }).setLetterSpacing(3).setOrigin(.5).setDepth(52);
    this.add.text(W / 2, 277, win ? '방어 작전 성공' : '기지 함락', { fontFamily: FONT, fontSize: '38px', fontStyle: 'bold', color: win ? '#c7e99e' : '#d79a7f' }).setOrigin(.5).setDepth(52);
    this.add.text(W / 2, 334, win ? `${MAX_WAVE}개 웨이브를 모두 방어했습니다.` : (this.bossLeaked ? `웨이브 ${this.wave} · 적 지휘 개체가 방어선을 돌파했습니다.` : `웨이브 ${this.wave} · 기지 방어선이 무너졌습니다.`),
      { fontFamily: FONT, fontSize: '16px', color: '#aab99c' }).setOrigin(.5).setDepth(52);
    const btn = this.add.rectangle(W / 2, 410, 230, 46, 0x2c3d29).setStrokeStyle(1, 0x8aab6a)
      .setInteractive({ useHandCursor: true }).setDepth(51);
    this.add.text(W / 2, 410, '↻  작전 재시작', { fontFamily: FONT, fontSize: '16px', color: '#d2e7b5' }).setOrigin(.5).setDepth(52);
    btn.on('pointerdown', () => this.scene.restart());
  }
}

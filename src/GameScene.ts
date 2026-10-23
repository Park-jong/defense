import Phaser from 'phaser';
import {
  CLEAR_BONUS_BASE, CLEAR_BONUS_PER_WAVE, COLS, CONSOLE_Y, ENEMY_DEFS, EnemyKey, FINAL_BOSS_HP_MULT, FONT, GAME_W, H, MAP_H, MAP_Y, MAX_CATCHUP_SEC, MAX_WAVE, MOBILE_LAYOUT, RENDER_SCALE, ROWS, SIDE_W, STEP_SEC, T, TEST_GOLD, TOWER_DEFS, TOWER_KEYS, TowerKey, W, WP, pathCells,
} from './config';
import { drawMap, makeTextures } from './textures';
import { Btn, mkBtn } from './ui';
import { DRAGOON_EMITTER, FIREBAT_MUZZLES, loadUnitArt, SIEGE_MUZZLE, TURRET_LAUNCH_PORTS, UNIT_WORLD_SCALE } from './unitArt';
import { EquippedSkill, SKILL_DEFS, SKILL_SLOTS, SkillKey, UnitBuff } from './catalog';
import { ShopState, SupplyShop } from './shop';
import { MAX_UNIT_LEVEL, OrderResult, planOrder, UnitOrder, UnitScope, unitUpgradeCost } from './management';
import { BUNKER_BARREL_LENGTH, BUNKER_CAPACITY, BUNKER_PORTS, BUNKER_RANGE_BONUS, InfantryKey, isInfantry } from './bunker';

/** 건설 명령 한 쪽에 보이는 유닛 수. */
const BUILD_PAGE_SIZE = 4;

interface Tower {
  id: string;
  k: TowerKey; c: number; r: number; x: number; y: number;
  lvl: number; cd: number; spent: number; shotPort: number;
  base: Phaser.GameObjects.Image; barrel: Phaser.GameObjects.Image;
  skills: EquippedSkill[]; buffs: UnitBuff[];
  host?: Tower; passengers: (Tower | null)[];
  charge?: { target: Enemy; left: number };
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
const DRAGOON_CHARGE_TIME = .18;
/** 이 depth 이상은 UI로 보고 uiCam만, 미만은 맵으로 보고 mapCam만 그린다. */
const UI_DEPTH = 25;
const MAX_MAP_ZOOM = 2.5;

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
  /** 터치 위주 기기(손가락 입력)면 단축키 안내를 숨기고 두 번 탭 배치·취소 버튼을 쓴다. */
  private touchUI = false;
  private lastTick = 0;
  private stepAcc = 0;
  private bossLeaked = false;
  private testMode = false;
  private repeat = 0;
  private shop!: SupplyShop;
  private shopOpen = false;
  private shopInputEnabled = true;
  private fields: SkillField[] = [];
  private shopBtn!: Btn;
  private cancelBtn!: Btn;
  private skillBtn!: Btn;
  private uiCache: { hud?: string; info?: string } = {};
  /** 맵 영역 전용 카메라(확대·이동·흔들림)와 전체 화면 UI 카메라. */
  private mapCam!: Phaser.Cameras.Scene2D.Camera;
  private uiCam!: Phaser.Cameras.Scene2D.Camera;
  private mapZoom = 1;
  private mapCx = W / 2;
  private mapCy = MAP_Y + MAP_H / 2;
  /** 맵에서 시작된 포인터 입력(탭/드래그 구분용), 두 손가락 제스처 여부, 핀치 직전 거리·중점. */
  private mapDown: { id: number; dragged: boolean } | null = null;
  private gesture = false;
  private pinch = { d: 0, x: 0, y: 0 };

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
  /** 배치마다 다른 초상화 크기와 기지 내구도 막대 위치. */
  private portraitSize = 88;
  private lifeMeter = { x: 832, y: 31, w: 54 };
  /** 건설 명령의 현재 쪽과, 좌우로 밀어 넘기는 영역. */
  private buildPage = 0;
  private buildArea = { x: 0, y: 0, w: 0, h: 0 };
  private buildPageTxt?: Phaser.GameObjects.Text;
  private buildPageBtn?: Btn;
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
    // 캔버스는 RENDER_SCALE배 픽셀이므로 카메라를 같은 배율로 확대해 게임 좌표(GAME_W×H)를 화면에 꽉 채운다.
    // 기본 카메라는 맵 영역만 담당(mapCam)하고, 그 위에 전체 화면 uiCam을 얹어 UI를 그린다.
    const rs = RENDER_SCALE;
    this.mapCam = this.cameras.main.setViewport(0, MAP_Y * rs, W * rs, MAP_H * rs);
    this.uiCam = this.cameras.add(0, 0, GAME_W * rs, H * rs).setZoom(rs).centerOn(GAME_W / 2, H / 2);
    this.mapDown = null; this.gesture = false; this.pinch = { d: 0, x: 0, y: 0 };
    this.setMapView(1, W / 2, MAP_Y + MAP_H / 2);
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
    this.lastTick = 0; this.stepAcc = 0;
    this.touchUI = window.matchMedia('(pointer: coarse)').matches;
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
    this.buildZoomUI();
    // 매 프레임 렌더 직전에 depth로 카메라를 나눈다 (새로 생긴 오브젝트 포함).
    const split = () => this.splitCameras();
    this.events.on(Phaser.Scenes.Events.POST_UPDATE, split);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.events.off(Phaser.Scenes.Events.POST_UPDATE, split));
    this.splitCameras();
    this.shop = new SupplyShop({
      state: () => this.shopState(),
      select: id => { this.selected = this.towers.find(t => t.id === id) ?? null; this.building = null; this.unloading = null; },
      choose: k => this.chooseBuild(k, true),
      equip: (k, id) => this.equipSkill(k, id),
      upgrade: id => this.upgradeUnit(id),
      order: (order, scope) => this.applyOrder(order, scope),
      recruit: (id, slot, key) => this.recruit(id, slot, key),
      board: (id, slot, unitId) => this.board(id, slot, unitId),
      unload: id => this.beginUnload(id),
      close: () => { this.shopOpen = false; this.input.enabled = this.shopInputEnabled; },
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.shop.destroy());

    const im = this.input.manager; if (im.pointersTotal < 3) this.input.addPointer(3 - im.pointersTotal); // 마우스 포함 3개여야 pointer1·pointer2 둘 다 추적
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onPointerMove(p));
    this.input.on('pointerdown', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => this.onPointerDown(p, over));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.onPointerUp(p));
    this.input.on('wheel', (p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
      if (this.inMapView(p)) this.zoomMap(this.mapZoom * (dy < 0 ? 1.15 : 1 / 1.15), p.x, p.y);
    });
    this.input.mouse?.disableContextMenu();
    this.input.keyboard?.addCapture('SPACE');
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => this.onKey(e));
  }

  private cellAt(p: Phaser.Input.Pointer): Cell | null {
    // 맵 카메라 줌·스크롤이 있으므로 화면 좌표(p.x)가 아니라 mapCam 기준 세계 좌표로 칸을 찾는다.
    if (!this.inMapView(p)) return null;
    const { x, y } = this.mapPoint(p.x, p.y);
    if (y < MAP_Y || y >= CONSOLE_Y || x < 0 || x >= W) return null;
    return { c: Math.floor(x / T), r: Math.floor((y - MAP_Y) / T) };
  }

  // ---------- 맵 확대·이동 ----------
  /** 포인터(캔버스 픽셀)가 맵 영역 위에 있는가. */
  private inMapView(p: { x: number; y: number }): boolean {
    const x = p.x / RENDER_SCALE, y = p.y / RENDER_SCALE;
    return x >= 0 && x < W && y >= MAP_Y && y < MAP_Y + MAP_H;
  }

  /** 캔버스 픽셀 좌표 → mapCam 기준 게임 세계 좌표. */
  private mapPoint(sx: number, sy: number): { x: number; y: number } {
    const k = RENDER_SCALE * this.mapZoom;
    return { x: this.mapCx + (sx - W * RENDER_SCALE / 2) / k, y: this.mapCy + (sy - (MAP_Y + MAP_H / 2) * RENDER_SCALE) / k };
  }

  /** 줌과 시점 중심을 정하고 맵 경계 밖이 보이지 않게 제한한다. */
  private setMapView(zoom: number, cx: number, cy: number): void {
    const z = Phaser.Math.Clamp(zoom, 1, MAX_MAP_ZOOM), hw = W / 2 / z, hh = MAP_H / 2 / z;
    this.mapZoom = z;
    this.mapCx = Phaser.Math.Clamp(cx, hw, W - hw); this.mapCy = Phaser.Math.Clamp(cy, MAP_Y + hh, MAP_Y + MAP_H - hh);
    this.mapCam.setZoom(RENDER_SCALE * z).centerOn(this.mapCx, this.mapCy);
  }

  /** (fx,fy) 화면 지점 아래의 세계 좌표가 (tx,ty) 화면 지점에 오도록 확대한다 (핀치 중점 이동 포함). */
  private zoomMap(zoom: number, fx: number, fy: number, tx = fx, ty = fy): void {
    const wp = this.mapPoint(fx, fy), z = Phaser.Math.Clamp(zoom, 1, MAX_MAP_ZOOM), k = RENDER_SCALE * z;
    this.setMapView(z, wp.x - (tx - W * RENDER_SCALE / 2) / k, wp.y - (ty - (MAP_Y + MAP_H / 2) * RENDER_SCALE) / k);
  }

  /** 화면 전체가 흔들리도록 두 카메라에 shake를 건다. flash는 겹쳐 밝아지지 않게 uiCam에만 쓴다. */
  private shakeAll(ms: number, power: number): void { this.mapCam.shake(ms, power); this.uiCam.shake(ms, power); }

  private zoomStep(f: number): void {
    this.zoomMap(this.mapZoom * f, W * RENDER_SCALE / 2, (MAP_Y + MAP_H / 2) * RENDER_SCALE);
  }

  /** 맵 오른쪽 위 모서리의 [+] [−] [⟲] 버튼. 손가락 기기에서는 더 크게. */
  private buildZoomUI(): void {
    const big = this.touchUI || MOBILE_LAYOUT, s = big ? 40 : 28, x = W - s - 8;
    const items: [string, () => void][] = [['+', () => this.zoomStep(1.4)], ['−', () => this.zoomStep(1 / 1.4)], ['⟲', () => this.setMapView(1, W / 2, MAP_Y + MAP_H / 2)]];
    items.forEach(([label, cb], i) => mkBtn(this, x, MAP_Y + 8 + i * (s + 4), s, s, label, cb, big ? 20 : 15));
  }

  /** depth로 렌더 카메라를 나눈다. cameraFilter는 '이 카메라는 그리지 않음' 비트마스크다. */
  private splitCameras(): void {
    const hideFromUi = this.uiCam.id, hideFromMap = this.mapCam.id;
    for (const o of this.children.list as unknown as { depth: number; cameraFilter: number }[]) o.cameraFilter = o.depth >= UI_DEPTH ? hideFromMap : hideFromUi;
  }

  private onPointerDown(p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]): void {
    if (p.rightButtonDown()) { this.cancelCommand(); return; }
    // 두 번째 손가락이 닿으면 핀치 시작: 탭·드래그 처리를 모두 접는다.
    if (this.input.pointer1.isDown && this.input.pointer2?.isDown) { this.gesture = true; this.mapDown = null; return; }
    this.mapDown = !over.length && this.inMapView(p) ? { id: p.id, dragged: false } : null;
  }

  private onPointerMove(p: Phaser.Input.Pointer): void {
    // 터치에는 호버가 없다: 손가락이 움직여도 미리보기 칸은 탭으로만 바뀐다.
    if (!p.wasTouch) this.hover = this.cellAt(p);
    const a = this.input.pointer1, b = this.input.pointer2;
    if (b && a.isDown && b.isDown) {
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, d = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
      this.gesture = true; this.mapDown = null;
      if (this.pinch.d > 0 && this.inMapView({ x: mx, y: my })) this.zoomMap(this.mapZoom * d / this.pinch.d, this.pinch.x, this.pinch.y, mx, my);
      this.pinch = { d, x: mx, y: my };
      return;
    }
    this.pinch.d = 0;
    const md = this.mapDown;
    if (!md || md.id !== p.id || !p.isDown || this.gesture) return;
    if (!md.dragged) { if (p.getDistance() > 10 * RENDER_SCALE) md.dragged = true; } // 일정 거리 이상 움직이면 탭이 아니라 드래그
    else if (this.mapZoom > 1) {
      const k = RENDER_SCALE * this.mapZoom;
      this.setMapView(this.mapZoom, this.mapCx - (p.x - p.prevPosition.x) / k, this.mapCy - (p.y - p.prevPosition.y) / k);
    }
  }

  private onPointerUp(p: Phaser.Input.Pointer): void {
    const md = this.mapDown;
    this.mapDown = null;
    if (!this.gesture && md && md.id === p.id && !md.dragged && p.button === 0) this.onMapClick(p);
    if (![this.input.pointer1, this.input.pointer2].some(q => q && q !== p && q.isDown)) { this.gesture = false; this.pinch.d = 0; }
    // 건설 명령 영역을 좌우로 40px 넘게 밀면 쪽을 넘긴다. 포인터의 down/up 좌표는 캔버스 픽셀이라 게임 좌표로 나눈다.
    const k = RENDER_SCALE, ar = this.buildArea;
    const downX = p.downX / k, downY = p.downY / k, dx = (p.upX - p.downX) / k, dy = (p.upY - p.downY) / k;
    const inside = downX >= ar.x && downX <= ar.x + ar.w && downY >= ar.y && downY <= ar.y + ar.h;
    if (inside && Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) this.setBuildPage(this.buildPage + (dx < 0 ? 1 : -1));
  }

  // ---------- UI ----------
  private buildUI(): void {
    if (MOBILE_LAYOUT) this.buildMobileUI(); else this.buildDesktopUI();
  }

  /** 지원하는 기기에서만 전체화면 버튼을 만든다. 브라우저는 전체화면 요청을 사용자 제스처(pointerup) 안에서만 허용한다. */
  private addFullscreenButton(x: number, y: number, w: number, h: number, size: number): boolean {
    if (!this.touchUI || !this.scale.fullscreen.available) return false;
    mkBtn(this, x, y, w, h, '⛶ 전체화면', () => {}, size);
    this.add.zone(x, y, w, h).setOrigin(0).setDepth(34).setInteractive().on('pointerup', () => {
      if (this.scale.isFullscreen) { this.scale.stopFullscreen(); return; }
      this.scale.startFullscreen();
      (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.('landscape').catch(() => {});
    });
    return true;
  }

  /** 휴대폰 가로 화면용: 맵 오른쪽 SIDE_W 패널에 상황판·유닛 정보·건설 명령을 크게 세로로 쌓는다. */
  private buildMobileUI(): void {
    const x0 = W, pw = SIDE_W, right = x0 + pw, L = x0 + 20;
    const g = this.add.graphics().setDepth(25);
    g.fillStyle(0x111915).fillRect(x0, 0, pw, H);
    g.fillStyle(0x626751).fillRect(x0, 0, 2, H);
    g.fillStyle(0x060c08).fillRect(x0 + 2, 0, 5, H);
    const box = (top: number, h: number) => {
      g.fillStyle(0x1b2320).fillRect(x0 + 10, top, pw - 18, h);
      g.lineStyle(1, 0x596150).strokeRect(x0 + 10, top, pw - 18, h);
    };
    const text = (x: number, top: number, value: string, size: number, color: string) =>
      this.add.text(x, top, value, { fontFamily: FONT, fontSize: size + 'px', color }).setDepth(30);
    this.portraitSize = 60;
    this.lifeMeter = { x: right - 86, y: 68, w: 66 };

    // 상황판: 웨이브 · 미네랄 · 기지 내구도
    box(8, 72);
    this.hud = text(L, 14, '', 18, '#cbd5b8').setFontFamily('monospace');
    if (!this.addFullscreenButton(right - 104, 12, 86, 26, 11)) text(right - 20, 18, 'FRONTIER', 12, '#8a967b').setOrigin(1, 0).setLetterSpacing(2);
    g.fillStyle(0x5dacc0).fillTriangle(L + 6, 46, L, 55, L + 6, 64).fillTriangle(L + 8, 46, L + 14, 55, L + 8, 64);
    this.mineralTxt = text(L + 22, 43, '', 19, '#a6d7e1').setFontFamily('monospace');
    this.lifeTxt = text(right - 20, 43, '', 18, '#b7dc8e').setFontFamily('monospace').setOrigin(1, 0);
    this.miniGfx = this.add.graphics().setDepth(29);

    // 유닛 정보
    box(88, 150);
    this.unitTitle = text(L, 96, '기지 사령부', 15, '#c9d7b2').setFontStyle('bold');
    this.skillBtn = mkBtn(this, right - 104, 93, 86, 28, '스킬 장착', () => this.openShop(this.selected?.k === 'bunker' ? 'garrison' : 'skills'), 12);
    this.skillBtn.show(false);
    this.add.rectangle(L, 128, 64, 64, 0x0a1710).setOrigin(0).setStrokeStyle(1, 0x52634b).setDepth(27);
    this.unitImage = this.add.image(L + 32, 160, 'portrait').setDisplaySize(60, 71).setDepth(28);
    this.info = text(L + 76, 126, '', 13, '#a5b897').setLineSpacing(4).setWordWrapWidth(right - 20 - (L + 76));

    // 강화 · 회수 · 취소 (같은 줄)
    this.upBtn = mkBtn(this, x0 + 10, 246, 176, 40, '', () => this.upgrade(), 13);
    this.sellBtn = mkBtn(this, x0 + 192, 246, 118, 40, '', () => this.sell(), 13);
    this.cancelBtn = mkBtn(this, x0 + 192, 246, 118, 40, `✕ 취소${this.kb(' [ESC]')}`, () => this.cancelCommand(), 13);
    this.upBtn.show(false); this.sellBtn.show(false); this.cancelBtn.show(false);
    this.statusTxt = text(L, 257, '', 13, '#849a76');

    // 건설 명령
    this.shopBtn = mkBtn(this, x0 + 10, 294, pw - 94, 34, `보급 상점 · 스킬${this.kb(' [B]')}`, () => this.openShop(), 13);
    // 9종을 2×2 네 칸씩 쪽으로 나눈다. 좌우로 밀거나 오른쪽 위 쪽 버튼을 눌러 넘긴다.
    this.buildPageBtn = mkBtn(this, right - 80, 294, 72, 34, '', () => this.setBuildPage(this.buildPage + 1), 13);
    this.towerBtns = TOWER_KEYS.map((k, i) => {
      const d = TOWER_DEFS[k], slot = i % BUILD_PAGE_SIZE;
      return mkBtn(this, x0 + 10 + (slot % 2) * 153, 334 + Math.floor(slot / 2) * 80, 149, 76, `${d.name} · ${d.cost}`,
        () => this.chooseBuild(k), 12, k, { tap: true });
    });
    this.buildArea = { x: x0 + 10, y: 334, w: pw - 18, h: 156 };
    this.setBuildPage(0);
    this.goBtn = mkBtn(this, x0 + 10, 498, 160, 66, '▶  웨이브 시작', () => this.startWave(), 15);
    this.goBtn.act(true);
    this.spdBtn = mkBtn(this, x0 + 176, 498, 66, 66, '배속 ×1', () => {
      this.speed = this.speed % 3 + 1; this.spdBtn.set('배속 ×' + this.speed);
    }, 12);
    this.pauseBtn = mkBtn(this, x0 + 248, 498, 62, 66, `정지${this.kb(' [P]')}`, () => this.togglePause(), 13);

    this.add.text(W - 8, H - 6, `FRONTIER  /  v${__APP_VERSION__}`, { fontFamily: 'monospace', fontSize: '10px', color: '#616f5b' })
      .setOrigin(1, 1).setDepth(30).setAlpha(.8);
    this.pauseTxt = this.add.text(W / 2, MAP_Y + MAP_H / 2, this.touchUI ? '전술 일시정지\n정지 버튼으로 작전 재개' : '전술 일시정지\n[ P ] 작전 재개', {
      fontFamily: FONT, fontSize: '28px', align: 'center', lineSpacing: 18, color: '#c5e49e',
      backgroundColor: '#0b1715ee', padding: { x: 42, y: 28 }, stroke: '#253a25', strokeThickness: 1,
    }).setOrigin(.5).setDepth(40).setVisible(false);
  }

  /** 데스크톱용: 상단 상황판 + 맵 + 하단 콘솔(전술 지도 · 유닛 정보 · 건설 명령). */
  private buildDesktopUI(): void {
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
    if (!this.addFullscreenButton(878, 12, 66, 32, 9)) {
      text(903, 16, 'SOLO', 9, '#a5ba8d').setLetterSpacing(1);
      text(901, 33, '● LIVE', 8, '#8eb967');
    }
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
    // 우클릭·ESC가 없는 터치 기기를 위한 취소. 선택된 유닛이 없을 때만 회수 버튼 자리에 나타난다.
    this.cancelBtn = mkBtn(this, 396, y + 163, 112, 25, `✕ 취소${this.kb(' [ESC]')}`, () => this.cancelCommand(), 10);
    this.cancelBtn.show(false);
    this.statusTxt = text(225, y + 170, '', 10, '#849a76');
    text(546, y + 24, '건설 명령', 11, '#b7c2a2');
    this.shopBtn = mkBtn(this, 807, y + 20, 130, 21, `보급 상점${this.kb(' [B]')}`, () => this.openShop(), 10);
    this.skillBtn = mkBtn(this, 441, y + 24, 67, 21, '스킬 장착', () => this.openShop(this.selected?.k === 'bunker' ? 'garrison' : 'skills'), 9);
    this.skillBtn.show(false);
    // 9종을 4개씩 쪽으로 나눠 ◀ ▶로 넘긴다 (터치 기기는 이 영역을 좌우로 밀어도 넘어간다).
    this.towerBtns = TOWER_KEYS.map((k, i) => {
      const d = TOWER_DEFS[k];
      return mkBtn(this, 558 + (i % BUILD_PAGE_SIZE) * 92, y + 43, 86, 95, `${this.kb(`[${i + 1}] `)}${d.name}\n${d.cost} 미네랄`,
        () => this.chooseBuild(k), 10, k, { tap: true });
    });
    mkBtn(this, 538, y + 43, 16, 95, '◀', () => this.setBuildPage(this.buildPage - 1), 10);
    mkBtn(this, 926, y + 43, 16, 95, '▶', () => this.setBuildPage(this.buildPage + 1), 10);
    this.buildPageTxt = text(616, y + 26, '', 9, '#8ea17d').setFontFamily('monospace');
    this.buildArea = { x: 538, y: y + 43, w: 404, h: 95 };
    this.setBuildPage(0);
    this.goBtn = mkBtn(this, 544, y + 146, 206, 38, `▶  웨이브 시작${this.kb('  [SPACE]')}`, () => this.startWave(), 12);
    this.goBtn.act(true);
    this.spdBtn = mkBtn(this, 756, y + 146, 86, 38, '배속 ×1', () => {
      this.speed = this.speed % 3 + 1; this.spdBtn.set('배속 ×' + this.speed);
    }, 11);
    this.pauseBtn = mkBtn(this, 848, y + 146, 90, 38, `정지${this.kb(' [P]')}`, () => this.togglePause(), 11);
    text(16, H - 17, this.touchUI
      ? '탭: 유닛 선택    /    건설은 같은 칸을 두 번 탭해 확정    /    ✕ 취소    /    보급 상점에서 유닛 9종·스킬    /    스킬 자동 사용'
      : 'B 상점    /    1–9 유닛    /    U 강화·주둔    /    S 회수    /    ESC 취소    /    스킬 자동 사용', 9, '#7d8b73');
    text(W - 16, H - 17, `FRONTIER  /  v${__APP_VERSION__}`, 9, '#616f5b').setOrigin(1, 0).setFontFamily('monospace');
    this.pauseTxt = this.add.text(W / 2, MAP_Y + MAP_H / 2, this.touchUI ? '전술 일시정지\n재개 버튼으로 작전 재개' : '전술 일시정지\n[ P ] 작전 재개', {
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
      this.goBtn.set(this.over ? '작전 종료' : this.waveActive ? `${MOBILE_LAYOUT ? '교전' : '교전 중'} · 남은 적 ${remaining}` : `▶  웨이브 시작${this.kb('  [SPACE]')}`);
    }
    TOWER_KEYS.forEach((k, i) => {
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
      msg = this.unloading
        ? `${TOWER_DEFS[this.unloading.k].name} 하차 대기\n${this.touchUI ? '빈 구역을 두 번 탭하세요.\n✕ 취소' : '빈 구역을 클릭하세요.\nESC 취소'} · 병력은 탑승 유지`
        : `FRONTIER COMMAND\n${this.kb('[B] ')}상점 · 유닛 9종\n벙커 → 병력 관리 → 탑승\n스킬 장착 → 자동 사용`;
    }
    const cache = title + msg;
    if (this.uiCache.info !== cache) {
      this.uiCache.info = cache;
      this.unitTitle.setText(title); this.info.setText(msg);
      this.unitImage.setTexture(k ? 'unit_' + k : 'portrait');
      const ps = this.portraitSize;
      if (k) this.unitImage.setDisplaySize(ps, ps); else this.unitImage.setDisplaySize(ps, ps * 104 / 88);
    }
    this.upBtn.show(!!t); this.sellBtn.show(!!t); this.statusTxt.setVisible(!t);
    this.cancelBtn.show(!t && !this.over && !!(this.building || this.unloading));
    this.skillBtn.show(!!t && !this.over);
    this.skillBtn.set(t?.k === 'bunker' ? '병력 관리' : '스킬 장착');
    this.statusTxt.setText(this.unloading ? (this.touchUI ? '빈 구역 두 번 탭 하차' : '빈 구역 클릭 하차 / ESC 취소')
      : this.testMode ? `시험 작전 / ${this.repeat}회차`
      : this.building ? (this.touchUI ? '빈 구역 두 번 탭 배치' : '빈 구역 클릭 배치 / ESC 취소')
      : this.paused ? '작전 일시정지' : this.waveActive ? '방어 시스템 가동 중' : this.kb('SPACE') ? '명령 대기 / SPACE 출격' : '명령 대기 / 웨이브 시작');
    if (t) {
      const occupied = t.k === 'bunker' && t.passengers.some(Boolean);
      this.upBtn.set(t.k === 'bunker' ? `${this.kb('[U] ')}병력 관리 · 4칸` : t.lvl < 3 ? `${this.kb('[U] ')}강화  ${this.upgradeCost(t)} 미네랄` : '최대 강화 완료');
      this.upBtn.en(!this.over && (t.k === 'bunker' || t.lvl < 3 && this.gold >= this.upgradeCost(t)));
      this.sellBtn.set(occupied ? '병력 하차 후 회수' : `${this.kb('[S] ')}회수 +${this.sellValue(t)}`);
      this.sellBtn.en(!this.over && !occupied);
    }
  }

  // ---------- 입력 ----------
  /** 키보드 단축키 안내. 터치 기기와 좁은 모바일 패널에서는 비운다. */
  private kb(hint: string): string { return this.touchUI || MOBILE_LAYOUT ? '' : hint; }

  private cancelCommand(): void { this.building = null; this.selected = null; this.unloading = null; this.hover = null; }

  private onKey(e: KeyboardEvent): void {
    if (e.repeat) return;
    if (this.shopOpen) { if (e.key === 'Escape' || e.key.toLowerCase() === 'b') this.shop.close(); return; }
    if (e.key.toLowerCase() === 'b') { this.openShop(); return; }
    if (e.key >= '1' && e.key <= '9') this.chooseBuild(TOWER_KEYS[+e.key - 1], true);
    else if (e.key === 'Escape') this.cancelCommand();
    else if (e.key === ' ') this.startWave();
    else if (e.key === 'p' || e.key === 'P') this.togglePause();
    else if (e.key === 'u' || e.key === 'U') this.upgrade();
    else if (e.key === 's' || e.key === 'S') this.sell();
  }

  /** 건설 명령의 쪽을 바꾼다. 양 끝에서는 반대쪽 끝으로 돈다. */
  private setBuildPage(page: number): void {
    const pages = Math.ceil(TOWER_KEYS.length / BUILD_PAGE_SIZE);
    this.buildPage = (page % pages + pages) % pages;
    this.towerBtns.forEach((b, i) => b.show(Math.floor(i / BUILD_PAGE_SIZE) === this.buildPage));
    const label = `${this.buildPage + 1} / ${pages}`;
    this.buildPageTxt?.setText(label);
    this.buildPageBtn?.set(`${label} ▸`);
  }

  private chooseBuild(k: TowerKey, force = false): void {
    if (this.over) return;
    // 단축키나 상점으로 고른 유닛이 보이도록 그 유닛이 있는 쪽으로 넘긴다.
    const page = Math.floor(TOWER_KEYS.indexOf(k) / BUILD_PAGE_SIZE);
    if (page !== this.buildPage) this.setBuildPage(page);
    this.building = (!force && this.building === k) ? null : k;
    this.selected = null; this.unloading = null;
  }

  private togglePause(): void {
    if (this.over) return;
    this.paused = !this.paused;
    this.pauseTxt.setVisible(this.paused);
    this.pauseBtn.set(`${this.paused ? '재개' : '정지'}${this.kb(' [P]')}`);
  }

  private onMapClick(p: Phaser.Input.Pointer): void {
    if (this.over || this.shopOpen) return;
    const cell = this.cellAt(p);
    if (!cell) return;
    const t = this.towers.find(t => !t.host && t.c === cell.c && t.r === cell.r);
    // 터치에는 호버가 없으므로, 첫 탭은 위치·사거리 미리보기만 하고 같은 칸을 다시 탭해야 확정한다.
    if (p.wasTouch && (this.unloading || (this.building && !t)) && (this.hover?.c !== cell.c || this.hover?.r !== cell.r)) {
      this.hover = cell;
      return;
    }
    if (this.unloading) { this.finishUnload(cell.c, cell.r); if (p.wasTouch) this.hover = null; return; }
    if (t) {
      this.selected = this.selected === t ? null : t; this.building = null;
      if (this.selected?.k === 'bunker') this.openShop('garrison');
    }
    else if (this.building) { this.placeTower(cell.c, cell.r); if (p.wasTouch) this.hover = null; }
    else this.selected = null;
  }

  // ---------- 타워 ----------
  private shopState(): ShopState {
    return { gold: this.gold, selectedId: this.selected?.id ?? null,
      units: this.towers.map(t => ({ id: t.id, k: t.k, lvl: t.lvl, skills: t.skills, c: t.c, r: t.r,
        hostId: t.host?.id, passengers: t.passengers.map(p => p?.id ?? null) })) };
  }

  private openShop(tab: 'units' | 'skills' | 'garrison' | 'manage' = 'units'): void {
    if (this.over || this.shopOpen) return;
    this.shopOpen = true; this.hover = null;
    this.shopInputEnabled = this.input.enabled;
    this.input.enabled = false;
    this.shop.open(tab);
  }

  private equipSkill(key: SkillKey, id?: string): boolean {
    const t = id === undefined ? this.selected : this.towers.find(t => t.id === id), skill = SKILL_DEFS[key];
    if (this.over || !t || !skill || skill.unit !== t.k || this.gold < skill.cost || t.skills.length >= SKILL_SLOTS || t.skills.some(s => s.key === key)) return false;
    this.gold -= skill.cost; t.spent += skill.cost;
    t.skills.push({ key, cd: 0 });
    this.fxPlace.explode(10, t.x, t.y);
    return true;
  }

  private applyOrder(order: UnitOrder, scope: UnitScope = {}): OrderResult {
    if (this.over || scope.bunkerId !== undefined && !this.towers.some(t => t.id === scope.bunkerId && t.k === 'bunker')) return { count: 0, cost: 0 };
    const plan = planOrder(this.shopState().units, order, scope);
    if (!plan.ids.length || this.gold < plan.cost) return { count: 0, cost: 0 };
    for (const id of plan.ids) {
      if (order.type === 'upgrade') this.upgradeUnit(id);
      else this.equipSkill(order.key, id);
    }
    return { count: plan.ids.length, cost: plan.cost };
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
  private upgradeCost(t: Tower): number { return unitUpgradeCost(t); }
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
    const t: Tower = { id: String(++this.nextUnitId), k, c, r, x, y, lvl: 1, cd: 0, shotPort: 0, spent: TOWER_DEFS[k].cost, base, barrel, skills: [], buffs: [], passengers: Array(BUNKER_CAPACITY).fill(null) };
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
    if (t) this.upgradeUnit(t.id);
  }

  private upgradeUnit(id: string): boolean {
    const t = this.towers.find(t => t.id === id);
    if (this.over || !t || t.k === 'bunker' || t.lvl >= MAX_UNIT_LEVEL || this.gold < this.upgradeCost(t)) return false;
    const c = this.upgradeCost(t);
    this.gold -= c; t.spent += c; t.lvl++;
    const scale = UNIT_WORLD_SCALE[t.k] ?? 1;
    if (!t.host) this.tweens.add({ targets: [t.base, t.barrel], scale: { from: scale * 1.3, to: scale }, duration: 250, ease: 'Back.Out' });
    this.fxPlace.explode(12, t.x, t.y);
    return true;
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
    if (e.type === 'boss') this.shakeAll(300, .01);
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
  update(): void {
    // Phaser의 delta는 포커스를 잃거나 프레임이 밀리면 잘리므로 실제 경과 시간으로 따라잡는다.
    const now = performance.now();
    const elapsed = this.lastTick ? Math.min(MAX_CATCHUP_SEC, (now - this.lastTick) / 1000) : 0;
    this.lastTick = now;
    if (!this.paused && !this.over && !this.shopOpen) {
      this.stepAcc += elapsed;
      while (this.stepAcc >= STEP_SEC && !this.over) {
        for (let i = 0; i < this.speed && !this.over; i++) this.step(STEP_SEC);
        this.stepAcc -= STEP_SEC;
      }
    } else this.stepAcc = 0;
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
        this.shakeAll(150, .006);
        this.uiCam.flash(120, 255, 60, 60);
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
    if (t.charge) {
      t.charge.left = Math.max(0, t.charge.left - dt);
      if (t.charge.left > 0) return;
      const st = this.stats(t), previous = t.charge.target;
      const target = !previous.dead && Math.hypot(previous.x - t.x, previous.y - t.y) <= st.range ? previous : this.findTarget(t);
      t.charge = undefined;
      if (target) this.fire(t, target, st); else t.cd = 0;
      return;
    }
    let best = this.findTarget(t);
    if (!best) return;
    for (const skill of t.skills) {
      if (skill.cd > 0) continue;
      if (best.dead) best = this.findTarget(t);
      if (!best) break;
      t.barrel.rotation = t.k === 'frost' || t.k === 'sniper' || t.k === 'templar' ? 0 : Math.atan2(best.y - t.y, best.x - t.x);
      this.autoSkill(t, skill.key, best);
      skill.cd = SKILL_DEFS[skill.key].cooldown;
    }
    if (best?.dead) best = this.findTarget(t);
    if (!best) return;
    const st = this.stats(t);
    t.barrel.rotation = t.k === 'frost' || t.k === 'sniper' || t.k === 'templar' ? 0 : Math.atan2(best.y - t.y, best.x - t.x);
    if (t.cd > 0) return;
    t.cd = st.rate;
    if (t.k === 'sniper') { t.charge = { target: best, left: DRAGOON_CHARGE_TIME }; return; }
    this.fire(t, best, st);
  }

  private fire(t: Tower, best: Enemy, st: TowerStats): void {
    const d = TOWER_DEFS[t.k];
    const angle = Math.atan2(best.y - t.y, best.x - t.x);
    const reach = t.host ? BUNKER_BARREL_LENGTH : t.k === 'cruiser' ? 29 * (UNIT_WORLD_SCALE.cruiser ?? 1) : t.k === 'cannon' ? SIEGE_MUZZLE.x * (UNIT_WORLD_SCALE.cannon ?? 1) : t.k === 'marine' ? 31 : t.k === 'firebat' ? FIREBAT_MUZZLES[0].x : t.k === 'arrow' ? 15 : 8;
    const port = t.k === 'arrow' ? TURRET_LAUNCH_PORTS[t.shotPort++ % TURRET_LAUNCH_PORTS.length] : null;
    const muzzleX = t.k === 'templar' ? t.x + 18 : t.k === 'sniper' ? t.x + DRAGOON_EMITTER.x : port ? t.x + port.x * Math.cos(angle) - port.y * Math.sin(angle) : t.k === 'frost' ? t.x : t.x + Math.cos(angle) * reach;
    const muzzleY = t.k === 'templar' ? t.y - 8 : t.k === 'sniper' ? t.y + DRAGOON_EMITTER.y : port ? t.y + port.x * Math.sin(angle) + port.y * Math.cos(angle) : t.k === 'frost' ? t.y - 18 : t.y + Math.sin(angle) * reach;
    const flightAngle = t.k === 'sniper' || t.k === 'templar' ? Math.atan2(best.y - muzzleY, best.x - muzzleX) : angle;
    const s = this.add.image(muzzleX, muzzleY, 'shot_' + t.k).setDepth(9).setRotation(flightAngle);
    this.projs.push({ s, x: muzzleX, y: muzzleY, tgt: best, k: t.k, st });
    if (t.host) {
      const scale = t.k === 'firebat' ? 1 : .6;
      const flame = this.add.image(muzzleX, muzzleY, 'bunker_muzzle').setOrigin(0, .5).setRotation(angle).setScale(scale).setDepth(12);
      this.tweens.add({ targets: flame, scaleX: scale * 1.3, scaleY: scale * .65, alpha: 0,
        duration: t.k === 'firebat' ? 150 : 90, onComplete: () => flame.destroy() });
    } else if (t.k === 'cannon') {
      const flash = this.add.image(muzzleX, muzzleY, 'siege_muzzle').setOrigin(0, .5).setRotation(angle).setScale(.8).setDepth(12);
      this.tweens.add({ targets: flash, scaleX: 1.3, scaleY: 1.1, alpha: 0, duration: 140, onComplete: () => flash.destroy() });
      for (let i = 0; i < 3; i++) {
        const x = muzzleX + Math.cos(angle) * (10 + i * 4) - Math.sin(angle) * (i - 1) * 5;
        const y = muzzleY + Math.sin(angle) * (10 + i * 4) + Math.cos(angle) * (i - 1) * 5;
        const smoke = this.add.image(x, y, 'siege_smoke').setScale(.35 + i * .1).setAlpha(.65).setDepth(11);
        this.tweens.add({ targets: smoke, x: x + Math.cos(angle) * 14, y: y + Math.sin(angle) * 10 - 12,
          scale: 1.1 + i * .2, alpha: 0, duration: 650 + i * 120, onComplete: () => smoke.destroy() });
      }
    } else if (t.k === 'firebat') {
      for (const port of FIREBAT_MUZZLES) {
        const x = t.x + port.x * Math.cos(angle) - port.y * Math.sin(angle);
        const y = t.y + port.x * Math.sin(angle) + port.y * Math.cos(angle);
        const length = Math.max(18, Math.min(80, Math.hypot(best.x - x, best.y - y)));
        const flame = this.add.image(x, y, 'firebat_flame').setOrigin(0, .5)
          .setRotation(Math.atan2(best.y - y, best.x - x)).setScale(length / 68, .75).setDepth(12);
        this.tweens.add({ targets: flame, scaleX: length / 60, scaleY: 1, alpha: 0,
          duration: 220, onComplete: () => flame.destroy() });
      }
    } else if (t.k === 'templar') {
      this.archonBurst(muzzleX, muzzleY, 24);
    } else if (t.k === 'sniper') {
      const flare = this.add.image(muzzleX, muzzleY, 'dragoon_charge').setScale(.8).setDepth(12);
      this.tweens.add({ targets: flare, scale: 1.25, alpha: 0, duration: 180, onComplete: () => flare.destroy() });
    } else {
      const flash = this.add.circle(muzzleX, muzzleY, 5, d.proj, .7).setDepth(9);
      this.tweens.add({ targets: flash, scale: 1.8, alpha: 0, duration: 160, onComplete: () => flash.destroy() });
    }
    if (t.k === 'cannon') {
      const recoil = 6 * (UNIT_WORLD_SCALE.cannon ?? 1);
      this.tweens.add({ targets: t.barrel, x: t.x - Math.cos(angle) * recoil, y: t.y - Math.sin(angle) * recoil,
        duration: 80, hold: 30, yoyo: true, ease: 'Cubic.Out' });
    } else if (t.k === 'frost' || t.k === 'templar') {
      this.tweens.add({ targets: t.barrel, scale: { from: 1.1, to: 1 }, duration: 220 });
    } else if (t.k === 'arrow' || t.k === 'cruiser' || t.k === 'sniper') {
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

  private archonBurst(x: number, y: number, radius: number): void {
    const glow = this.add.image(x, y, 'shot_templar').setDepth(20).setScale(radius / 24);
    this.tweens.add({ targets: glow, scale: radius / 15, alpha: 0, duration: 250, onComplete: () => glow.destroy() });
    const arcs = this.add.graphics().setPosition(x, y).setDepth(21);
    arcs.lineStyle(2, 0x64cfff, .85).strokeCircle(0, 0, radius * .7);
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4, c = Math.cos(a), s = Math.sin(a);
      const points = [
        { x: c * 5, y: s * 5 },
        { x: c * radius * .4 - s * 5, y: s * radius * .4 + c * 5 },
        { x: c * radius * .65 + s * 4, y: s * radius * .65 - c * 4 },
        { x: c * radius, y: s * radius },
      ];
      arcs.lineStyle(4, 0x237dff, .35).strokePoints(points, false);
      arcs.lineStyle(1.2, 0xd8ffff, .95).strokePoints(points, false);
    }
    this.tweens.add({ targets: arcs, scale: 1.15, alpha: 0, duration: 220, onComplete: () => arcs.destroy() });
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
        this.skillBeam({ x: t.x + DRAGOON_EMITTER.x, y: t.y + DRAGOON_EMITTER.y }, target, d.color, 4);
        this.damageEnemy(target, st.dmg * 2); target.vulnerableT = 5;
        break;
      case 'chain': {
        let previous = { x: t.x + DRAGOON_EMITTER.x, y: t.y + DRAGOON_EMITTER.y };
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
        this.archonBurst(target.x, target.y, 65);
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
      if (p.k === 'templar') this.archonBurst(e.x, e.y, st.splash);
      else {
        this.fxBoom.explode(14, e.x, e.y);
        if (p.k === 'cannon') {
          const blast = this.add.image(e.x, e.y, 'siege_blast').setScale(st.splash / 50).setDepth(20);
          this.tweens.add({ targets: blast, scale: st.splash / 30, alpha: 0, duration: 280, onComplete: () => blast.destroy() });
        }
        const ring = this.add.circle(e.x, e.y, 6, 0xff8a65, .3).setStrokeStyle(2, 0xff8a65).setDepth(21);
        this.tweens.add({ targets: ring, scale: st.splash / 6, alpha: 0, duration: 300, onComplete: () => ring.destroy() });
      }
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
        const tipX = t.x + Math.cos(t.barrel.rotation) * BUNKER_BARREL_LENGTH;
        const tipY = t.y + Math.sin(t.barrel.rotation) * BUNKER_BARREL_LENGTH;
        g.lineStyle(2.5, 0x111f2c).lineBetween(t.x, t.y, tipX, tipY);
        g.lineStyle(1, 0xb0bec0, .85).lineBetween(t.x, t.y, tipX, tipY);
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
          const x = t.x - 15 + slot * 10, y = t.y - 17;
          g.fillStyle(p ? p.k === 'firebat' ? 0xffa15c : 0xa7d5e7 : 0x1d2c22).fillRect(x, y, 7, 4);
          g.lineStyle(1, 0x8da17c, .7).strokeRect(x, y, 7, 4);
        });
      }
      if (t.k === 'templar') {
        const phase = this.time.now / 180;
        const cy = t.y - 2;
        g.lineStyle(1, 0x6de8ff, .25 + Math.sin(phase) * .12).strokeCircle(t.x, cy, 25 + Math.sin(phase) * 2);
        for (let i = 0; i < 3; i++) {
          const a = phase * .35 + i * Math.PI * 2 / 3, r = 24 + Math.sin(phase + i) * 3;
          g.lineStyle(1.2, 0xb9faff, .65).lineBetween(t.x + Math.cos(a) * r, cy + Math.sin(a) * r,
            t.x + Math.cos(a + .2) * (r - 5), cy + Math.sin(a + .2) * (r - 5))
            .lineBetween(t.x + Math.cos(a + .2) * (r - 5), cy + Math.sin(a + .2) * (r - 5),
              t.x + Math.cos(a + .35) * r, cy + Math.sin(a + .35) * r);
        }
      }
      if (t.charge) {
        const progress = 1 - t.charge.left / DRAGOON_CHARGE_TIME;
        const x = t.x + DRAGOON_EMITTER.x, y = t.y + DRAGOON_EMITTER.y;
        const radius = 4 + progress * 8;
        g.fillStyle(0x328bff, .15).fillCircle(x, y, radius + 5);
        g.fillStyle(0x3f9fff, .55).fillCircle(x, y, radius);
        g.fillStyle(0x9aeaff, .9).fillCircle(x, y, radius * .6);
        g.fillStyle(0xf1ffff).fillCircle(x, y, 2 + progress * 3);
        g.lineStyle(1, 0xc0f5ff, .9).strokeCircle(x, y, 15 - progress * 10);
        for (let i = 0; i < 5; i++) {
          const angle = i * Math.PI * .4 + progress * 2, r = 18 - progress * 7;
          g.lineStyle(1, 0x9beaff, .85).lineBetween(x + Math.cos(angle) * r, y + Math.sin(angle) * r,
            x + Math.cos(angle + .2) * (r - 5), y + Math.sin(angle + .2) * (r - 5));
        }
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
    // 모바일 배치는 전장이 이미 크게 보이므로 전술 지도를 그리지 않는다.
    if (!MOBILE_LAYOUT) for (const t of this.towers) if (!t.host) mini.fillStyle(t === this.selected || t === this.selected?.host ? 0xe0f7ad : 0x9bd76f).fillRect(25 + t.c * 8 + 2, CONSOLE_Y + 53 + t.r * 8 + 2, 4, 4);
    if (!MOBILE_LAYOUT) for (const e of this.enemies) {
      if (!e.dead && e.x >= 0 && e.x < W) mini.fillStyle(e.type === 'boss' ? 0xea85d8 : 0xe49674)
        .fillCircle(25 + e.x / W * 160, CONSOLE_Y + 53 + (e.y - MAP_Y) / MAP_H * 96, e.type === 'boss' ? 3 : 1.8);
    }
    // A small base-integrity meter beneath the top resource readout.
    const m = this.lifeMeter;
    mini.fillStyle(0x0b120e).fillRect(m.x, m.y, m.w, 9);
    mini.fillStyle(this.lives <= 5 ? 0xcf8067 : 0x9dc278).fillRect(m.x + 2, m.y + 2, (m.w - 4) * Math.max(0, this.lives) / 20, 5);
  }

  private endGame(win: boolean): void {
    if (this.over) return;
    this.over = true;
    this.pauseTxt.setVisible(false);
    this.add.rectangle(0, 0, GAME_W, H, 0x030906, .82).setOrigin(0).setDepth(50);
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

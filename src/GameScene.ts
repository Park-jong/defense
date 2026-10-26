import Phaser from 'phaser';
import {
  CLEAR_BONUS_BASE, CLEAR_BONUS_PER_WAVE, COLS, SUPPORT_BRANCH_RANGE, CONSOLE_Y, ENEMY_DEFS, EnemyKey, FACTIONS, FACTION_TOWERS, Faction, FINAL_BOSS_HP_MULT, FONT, GAME_W, H, MAP_H, MAP_Y, MAX_CATCHUP_SEC, MAX_WAVE, MOBILE_LAYOUT, RENDER_SCALE, RIBBON_BAND, ROWS, SIDE_RIBBON_H, SIDE_W, STEP_SEC, T, TEST_GOLD, TOP_BAR_H, TOWER_DEFS, TowerKey, VIEW_H, W,
} from './config';
import { drawMap, loadEnemyArt, makeTextures } from './textures';
import { ENEMY_ART, ENEMY_FRAME_COUNT, ENEMY_FRAME_SIZE } from './enemyArt';
import { attackCount } from './data/units';
import { Btn, mkBtn } from './ui';
import { DRAGOON_EMITTER, FIREBAT_MUZZLES, loadBishoujoUnitArt, loadUnitArt, SIEGE_MUZZLE, TURRET_LAUNCH_PORTS, UNIT_WORLD_SCALE } from './unitArt';
import { EquippedSkill, SKILL_DEFS, SKILL_KEYS, SKILL_SLOTS, SkillKey, UnitBuff } from './catalog';
import { CommandCard, UnitCommand } from './commandCard';
import { loadCommandIcons } from './commandIcons';
import { addConsoleChrome, CONSOLE_RISE, consoleContains, loadBishoujoConsoleChrome, loadConsoleChrome } from './consoleChrome';
import { DamageKind, DamageNumbers } from './damageNumbers';
import { ShopState, SupplyShop } from './shop';
import { levelStats, OrderResult, planOrder, UnitOrder, UnitScope, unitUpgradeCost } from './management';
import { BUNKER_BARREL_LENGTH, BUNKER_PORTS, BUNKER_RANGE_BONUS, InfantryKey, isInfantry } from './bunker';
import { createMapRuntime, highGroundRangeBonus, type MapRuntime, type Point } from './game/map';
import { YAMATO_CHARGE_EVERY, YAMATO_CHARGE_POWER, ANALYSIS_BONUS, RESONANCE_HASTE, RESONANCE_RADIUS, bondInterest, sellRate, AIUR_LIMIT, Army, FORTRESS_RANGE, HANGAR_INTERCEPTORS, INVESTMENT_GOLD, SIEGE_RANGE, STASIS_BOSS_TIME, STASIS_TIME, bossDamageMultiplier, bountyMultiplier, bunkerCapacity, clearBonusMultiplier, commanderCooldownScale, maxLives, maxUnitLevel, AIUR_RANGE, AMON_LEAK, AMON_SCALE, AUGMENTS, AUGMENT_WAVES, AugmentKey, AugmentOffer, YAMATO_WIDTH, STORM_FREE_CASTS, amonDue, augmentEligible, augmentOffer, branchCost, damageMultiplier, drawAugment, eliteBonus, placeCost, relocateCost, setActiveAugments, skillCost, skillLocked, hasAugment } from './augments';
import { ACHIEVEMENTS, allowedUnit, awardAchievements, Bonuses, bossPattern, Branch, BranchState, COMMANDERS, hasBranch, CommanderKey, DEFAULT_OPTIONS, DIFFICULTIES, newStats, normalizeStats, Profile, PROFILE_KEY, readProfile, readSave, REWARDS, RewardKey, rewardChoices, RunOptions, RunSave, RunStats, SavedUnit, SAVE_KEY, clearSave, TargetMode, TestScope, validateSave, wavePlan, writeStored } from './campaign';
import { BattleAudio } from './audio';
import { CombatEffects } from './combatEffects';
import { hasWeaponEffects } from './data/weaponEffects';
import { OperationsCenter, OperationsView } from './operations';
import { showMissionResult } from './missionResult';
import { COMMAND_ACTIVE_CURSOR, COMMAND_CURSOR } from './cursors';
import { CommandConsole } from './commandConsole';
import { playThemeUnlock } from './themeUnlock';
import { activeTheme, isBishoujo, selectTheme, THEME_CHANGED, THEMES, themeBrand, themeTexture } from './themes';
import { createMoePortraits } from './moePortraits';
import { MoePresentation, type MoeActor } from './moePresentation';
import { MOE_CHARACTERS } from './moeCharacters';
import { OBSERVATION_BONUSES, OBSERVATION_DURATION, Observation, observationCount, supportTraits, VESSEL_AURA, vesselAuraBonus, vesselAuraMultiplier, VESSEL_EMP, weaknessBonus } from './support';

interface Tower {
  id: string;
  k: TowerKey; c: number; r: number; x: number; y: number;
  lvl: number; cd: number; spent: number; shotPort: number;
  base: Phaser.GameObjects.Image; barrel: Phaser.GameObjects.Image;
  skills: EquippedSkill[]; buffs: UnitBuff[];
  host?: Tower; passengers: (Tower | null)[];
  charge?: { target: Enemy; left: number };
  target: TargetMode; branch?: BranchState; stormFree?: number; yamatoShots?: number;
}

interface Enemy {
  type: EnemyKey; sprite: Phaser.GameObjects.Image;
  x: number; y: number; seg: number; hp: number; max: number; speed: number;
  slow: number; slowT: number; reward: number; r: number; dead?: boolean;
  stunT: number; burnT: number; burnDps: number; vulnerableT: number;
  route?: readonly Point[]; shield?: number; pulse?: number; age?: number; hasteT?: number; spawned?: boolean; burnSource?: string;
  observations?: Observation[];
  /** Distance-driven presentation phase; never used by combat, saves or route selection. */
  gait?: number;
  /** 젤나가 맙소사의 대가로 나오는 아몬. 보스 패턴을 쓰지만 놓쳐도 기지 내구도만 깎는다. */
  amon?: boolean;
}

interface TowerStats { dmg: number; range: number; rate: number; splash: number; slow: number }
type StatsUnit = Pick<Tower, 'k' | 'lvl'> & Partial<Pick<Tower, 'id' | 'c' | 'r' | 'x' | 'y' | 'buffs' | 'host' | 'branch'>>;

interface Projectile {
  s: Phaser.GameObjects.Image; x: number; y: number; tgt: Enemy; k: TowerKey; st: TowerStats; dead?: boolean; source?: string;
}

interface Cell { c: number; r: number }
interface SkillField { x: number; y: number; radius: number; left: number; tick: number; dmg: number; color: number; source?: string }
const DRAGOON_CHARGE_TIME = .18;
const OBSERVER_INFO_BONUSES = OBSERVATION_BONUSES.map(bonus => Math.round(bonus * 100) + '%').join(' → +');
/** 이 depth 이상은 UI로 보고 uiCam만, 미만은 맵으로 보고 mapCam만 그린다. */
const UI_DEPTH = 25;
const MAX_MAP_ZOOM = 2.5;
/** 작전 종료 화면에서 입력이 없을 때 게임 루프를 재우기까지의 시간. */
const IDLE_SLEEP_MS = 2500;
/** 명령 입력 창의 비밀 명령 수치. */
const CHEAT_GOLD = 10000, CHEAT_GOLD_CAP = 100000, CHEAT_POWER_CAP = 10000, CHEAT_POWER_STACKS = 20;

export class GameScene extends Phaser.Scene {
  private moe?: MoePresentation;
  private commandConsole?: CommandConsole;
  private gold = 150;
  private lives = 20;
  private wave = 0;
  private towers: Tower[] = [];
  private nextUnitId = 0;
  private unloading: Tower | null = null;
  private enemies: Enemy[] = [];
  private projs: Projectile[] = [];
  private spawnQ: (EnemyKey | 'amon')[] = [];
  private spawnT = 0;
  private waveActive = false;
  private building: TowerKey | null = null;
  private faction: Faction = 'terran';
  private selected: Tower | null = null;
  private hover: Cell | null = null;
  private speed = 1;
  private paused = false;
  private over = false;
  private continued = false;
  private victory = false;
  private closeResult?: () => void;
  private stopIdleSleep?: () => void;
  /** 터치 위주 기기(손가락 입력)면 단축키 안내를 숨기고 두 번 탭 배치·취소 버튼을 쓴다. */
  private touchUI = false;
  private lastTick = 0;
  private stepAcc = 0;
  private bossLeaked = false;
  private testMode = false;
  /** power overwhelming 입력 횟수: 입력할 때마다 모든 병력 공격력 2배씩 중첩(상한 10,000). 다시 출격하면 0. */
  private powerStacks = 0;
  private armyMemo?: Army;
  /** 치트(show me the money·power overwhelming)를 한 번이라도 쓴 작전. 이어하기에도 유지된다. */
  private cheated = false;
  // 테스트 출현 범위는 다시 출격해도 페이지 안에서 유지한다.
  private testScope: TestScope = 'all';
  // 테스트 페이지에서 증강 작전을 고르면 출격 전에 켜 둔 증강으로 시작한다(페이지 안에서 유지).
  private testAugments = new Set<AugmentKey>();
  private augments: AugmentKey[] = [];
  private augmentSeen: AugmentKey[] = [];
  private augmentOffer: AugmentOffer | null = null;
  private amonSince: number | null = null;
  private strikeEcho = 0;
  private repeat = 0;
  private options: RunOptions = { ...DEFAULT_OPTIONS };
  private map: MapRuntime = createMapRuntime(this.options.map, MAP_Y);
  private profile: Profile = readProfile();
  private bonuses: Bonuses = { power: 0, haste: 0, range: 0 };
  private runStats: RunStats = newStats();
  private commander: Record<CommanderKey, number> = { strike: 0, slow: 0, supply: 0 };
  /** 쿨타임마다 자동으로 쓰는 사령관 스킬. 재시작해도 같은 페이지에서는 설정을 유지한다. */
  private autoCommander = new Set<CommanderKey>();
  private pending: RewardKey[] = [];
  private rewarded = 0;
  private usedKinds: TowerKey[] = [];
  private tutorial = 0;
  private operations?: OperationsCenter;
  private operationsOpen = false;
  private relocating: Tower | null = null;
  private audio = new BattleAudio();
  private opsNotice = '';
  private checkpoint: RunSave | null = null;
  private waveStart = { kills: 0, lost: 0, seconds: 0 };
  private waveSpawnIndex = 0;
  private opsRefresh = 0;
  private saveClock = 0;
  private runLaunched = false;
  private shop!: SupplyShop;
  private shopOpen = false;
  private shopInputEnabled = true;
  private fields: SkillField[] = [];
  private damageNumbers?: DamageNumbers;
  private combatEffects?: CombatEffects;
  private shopBtn!: Btn;
  private uiCache: { hud?: string; info?: string } = {};
  /** 맵 영역 전용 카메라(확대·이동·흔들림)와 전체 화면 UI 카메라. */
  private mapCam!: Phaser.Cameras.Scene2D.Camera;
  private uiCam!: Phaser.Cameras.Scene2D.Camera;
  private mapZoom = 1;
  private mapCx = W / 2;
  private mapCy = MAP_Y + VIEW_H / 2;
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
  private unitTitle!: Phaser.GameObjects.Text;
  private unitImage!: Phaser.GameObjects.Image;
  private statusImage?: Phaser.GameObjects.Image;
  private miniGfx!: Phaser.GameObjects.Graphics;
  /** 배치마다 다른 초상화 크기와 기지 내구도 막대 위치. */
  private portraitSize = 88;
  private lifeMeter = { x: 832, y: 31, w: 54 };
  private commandCard!: CommandCard;
  private commandTitle!: Phaser.GameObjects.Text;
  private commandHint!: Phaser.GameObjects.Text;
  private commandTip?: Phaser.GameObjects.Rectangle;
  private pauseTxt!: Phaser.GameObjects.Text;
  private goBtn!: Btn;
  private spdBtn!: Btn;
  private pauseBtn!: Btn;

  constructor() { super('game'); }

  preload(): void { loadUnitArt(this); loadEnemyArt(this); loadCommandIcons(this); if (!MOBILE_LAYOUT) loadConsoleChrome(this); }

  // ---------- 생성 ----------
  create(data: { options?: RunOptions; resume?: RunSave; launched?: boolean } = {}): void {
    this.input.setDefaultCursor(COMMAND_CURSOR);
    this.options = { ...(data.resume?.options ?? data.options ?? DEFAULT_OPTIONS) };
    this.map = createMapRuntime(this.options.map, MAP_Y);
    makeTextures(this);
    createMoePortraits(this);
    // 캔버스는 RENDER_SCALE배 픽셀이므로 카메라를 같은 배율로 확대해 게임 좌표(GAME_W×H)를 화면에 꽉 채운다.
    // 기본 카메라는 맵 영역만 담당(mapCam)하고, 그 위에 전체 화면 uiCam을 얹어 UI를 그린다.
    const rs = RENDER_SCALE;
    // 데스크톱은 뷰포트를 맵보다 VIEW_H - MAP_H만큼 더 길게 잡아, 사거리 원·효과가 콘솔 골짜기 속으로 이어지고 장갑에 자연스럽게 가려지게 한다.
    this.mapCam = this.cameras.main.setViewport(0, MAP_Y * rs, W * rs, VIEW_H * rs);
    this.uiCam = this.cameras.add(0, 0, GAME_W * rs, H * rs).setZoom(rs).centerOn(GAME_W / 2, H / 2);
    this.mapDown = null; this.gesture = false; this.pinch = { d: 0, x: 0, y: 0 };
    this.setMapView(1, W / 2, MAP_Y + VIEW_H / 2);
    drawMap(this, COLS, ROWS, this.map);

    // scene.restart() 시 인스턴스가 재사용되므로 상태를 초기화한다.
    this.testMode = new URLSearchParams(location.search).has('test');
    this.powerStacks = 0; this.cheated = false;
    this.repeat = 0;
    this.gold = this.testMode ? TEST_GOLD : this.options.mode === 'budget' ? 1500 : DIFFICULTIES[this.options.difficulty].gold;
    this.lives = 20;
    this.wave = this.testMode ? MAX_WAVE : 0;
    this.towers = []; this.enemies = []; this.projs = []; this.armyMemo = undefined;
    this.nextUnitId = 0; this.unloading = null;
    this.spawnQ = []; this.spawnT = 0; this.waveActive = false;
    this.building = null; this.selected = null; this.hover = null; this.faction = 'terran';
    this.speed = 1; this.paused = false; this.over = false; this.bossLeaked = false;
    this.continued = false; this.victory = false;
    this.lastTick = 0; this.stepAcc = 0;
    this.touchUI = window.matchMedia('(pointer: coarse)').matches;
    this.uiCache = {};
    this.fields = []; this.shopOpen = false;
    this.profile = readProfile(); this.audio = new BattleAudio(); this.audio.volume = this.profile.volume;
    this.bonuses = { power: 0, haste: 0, range: 0 }; this.runStats = newStats();
    this.commander = { strike: 0, slow: 0, supply: 0 }; this.pending = []; this.rewarded = 0; this.usedKinds = [];
    const testAugments = this.testMode && this.options.mode === 'augment' ? [...this.testAugments] : [];
    this.augments = testAugments; this.augmentSeen = [...testAugments]; this.augmentOffer = null; this.strikeEcho = 0;
    this.amonSince = testAugments.includes('xelnaga') ? 0 : null;
    setActiveAugments(this.augments);
    this.lives = maxLives();
    this.operationsOpen = false; this.relocating = null; this.tutorial = this.profile.tutorialDone ? 4 : 0;
    this.opsNotice = ''; this.opsRefresh = 0; this.saveClock = 0; this.checkpoint = readSave();
    this.runLaunched = !!data.launched || this.testMode; this.waveSpawnIndex = 0;
    this.damageNumbers = new DamageNumbers(this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.damageNumbers?.destroy());
    this.combatEffects = new CombatEffects(this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.combatEffects?.destroy());

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
      select: id => this.selectUnit(id),
      choose: k => this.chooseBuild(k, true),
      equip: (k, id) => this.equipSkill(k, id),
      upgrade: id => this.upgradeUnit(id),
      order: (order, scope) => this.applyOrder(order, scope),
      recruit: (id, slot, key) => this.recruit(id, slot, key),
      board: (id, slot, unitId) => this.board(id, slot, unitId),
      unload: id => this.beginUnload(id),
      close: () => { this.shopOpen = false; this.input.enabled = this.shopInputEnabled; this.input.keyboard?.resetKeys(); },
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.shop.destroy());

    const im = this.input.manager; if (im.pointersTotal < 3) this.input.addPointer(3 - im.pointersTotal); // 마우스 포함 3개여야 pointer1·pointer2 둘 다 추적
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onPointerMove(p));
    this.input.on('pointerdown', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => this.onPointerDown(p, over));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.onPointerUp(p));
    this.input.on('wheel', (p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
      if (this.inMapView(p)) this.zoomMap(this.mapZoom * (dy < 0 ? 1.15 : 1 / 1.15), p.x, p.y);
    });
    // 우클릭 메뉴 차단은 캔버스에 리스너를 더하므로, 다시 출격할 때마다 쌓이지 않게 게임당 한 번만 건다.
    if (!this.game.registry.get('contextMenuDisabled')) { this.input.mouse?.disableContextMenu(); this.game.registry.set('contextMenuDisabled', true); }
    this.input.keyboard?.addCapture('SPACE');
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => this.onKey(e));
    this.setupOperations();
    this.commandConsole = new CommandConsole();
    this.registerCheats(this.commandConsole);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.commandConsole?.destroy(); this.commandConsole = undefined; });
    if (data.resume) this.restoreCheckpoint(data.resume);
    this.applySkin();
    this.setupTheme();
    this.moe = new MoePresentation();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.moe?.destroy(); this.moe = undefined; });
    // 테스트 모드도 처음에는 출격 화면을 열어 보스를 시험할 전장·난이도를 고르게 한다.
    if (!data.launched) this.operations!.show('setup');
    else if (this.pending.length) this.operations!.show('reward');
    else if (this.augmentOffer) this.operations!.show('augment');
    else this.saveCheckpoint(false);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.operations?.destroy(); this.operations = undefined; this.audio.destroy(); });
  }

  private savedUnits(): SavedUnit[] {
    return this.towers.map(t => ({ id: t.id, k: t.k, c: t.c, r: t.r, lvl: t.lvl, spent: t.spent,
      skills: t.skills.map(s => ({ ...s })), cd: t.cd, buffs: t.buffs.map(b => ({ ...b })), target: t.target, branch: t.branch,
      hostId: t.host?.id, slot: t.host ? t.host.passengers.indexOf(t) : undefined }));
  }

  private operationsView(): OperationsView {
    const units = this.savedUnits();
    return { options: this.options, wave: this.wave, gold: this.gold, lives: this.lives, active: this.waveActive, over: this.over,
      selected: units.find(u => u.id === this.selected?.id), units, stats: this.runStats, profile: this.profile,
      commander: this.commander, autoCommander: [...this.autoCommander], pending: this.pending, checkpoint: this.checkpoint, tutorial: this.tutorial, notice: this.opsNotice, test: this.testMode, testScope: this.testScope, augments: [...this.augments], augmentOffer: this.augmentOffer, amonSince: this.amonSince, testAugments: [...this.testAugments], paused: this.paused, faction: this.faction };
  }

  private setupOperations(): void {
    this.operations = new OperationsCenter({
      view: () => this.operationsView(),
      pause: open => { this.operationsOpen = open; this.input.enabled = !open && !this.shopOpen; this.input.keyboard?.resetKeys(); this.lastTick = performance.now(); },
      start: options => { this.scene.restart({ options, launched: true }); },
      resume: () => { const save = readSave(); if (save) this.scene.restart({ resume: save, launched: true }); },
      target: mode => { if (this.selected && !this.over) this.selected.target = mode; },
      branch: key => this.specialize(key),
      move: () => this.beginRelocate(),
      select: id => this.selectUnit(id),
      faction: key => this.selectFaction(key),
      commander: key => this.useCommander(key),
      autoCommander: key => this.toggleAutoCommander(key),
      console: () => this.commandConsole?.toggle(),
      testScope: key => { if (!this.waveActive) this.testScope = key; },
      testAugment: key => { if (!this.testAugments.delete(key)) this.testAugments.add(key); },
      pickAugment: key => this.pickAugment(key),
      rerollAugment: index => this.rerollAugment(index),
      reward: key => this.takeReward(key),
      skin: key => { this.profile.skin = key; this.applySkin(); this.persistProfile(); },
      volume: value => { this.profile.volume = value; this.audio.volume = value; this.audio.unlock(); this.audio.play('build'); this.persistProfile(); },
      tutorial: skip => { this.profile.tutorialDone = skip; this.tutorial = skip ? 4 : 0; this.persistProfile(); },
    });
    const unlock = () => this.audio.unlock();
    const save = () => this.saveCheckpoint(false);
    document.addEventListener('pointerdown', unlock); document.addEventListener('keydown', unlock); window.addEventListener('pagehide', save);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      document.removeEventListener('pointerdown', unlock); document.removeEventListener('keydown', unlock); window.removeEventListener('pagehide', save);
    });
  }

  private persistProfile(): void { if (!this.testMode) writeStored(PROFILE_KEY, this.profile); }

  private saveCheckpoint(notify: boolean): void {
    if (this.testMode || this.over || this.waveActive || !this.runLaunched) return;
    const save: RunSave = { version: 1, options: { ...this.options }, wave: this.wave, gold: this.gold, lives: this.lives,
      units: this.savedUnits(), bonuses: { ...this.bonuses }, stats: this.runStats, commander: { ...this.commander },
      pending: [...this.pending], rewarded: this.rewarded, tutorial: this.tutorial, usedKinds: [...this.usedKinds],
      augments: [...this.augments], augmentSeen: [...this.augmentSeen], augmentOffer: this.augmentOffer && structuredClone(this.augmentOffer), amonSince: this.amonSince, cheated: this.cheated, continued: this.continued };
    if (!validateSave(save)) { if (notify) this.opsNotice = '현재 상태를 저장할 수 없습니다.'; return; }
    if (writeStored(SAVE_KEY, save)) {
      this.checkpoint = structuredClone(save);
      if (notify) this.opsNotice = '현재 준비 상태를 저장했습니다.';
    } else this.opsNotice = '브라우저 저장 공간을 사용할 수 없습니다. 이 창에서는 계속 플레이할 수 있습니다.';
  }

  private restoreCheckpoint(save: RunSave): void {
    if (!validateSave(save)) return;
    // 증강 가격이 배치·강화 비용에 쓰이므로 병력을 되살리기 전에 먼저 적용한다.
    this.augments = [...save.augments ?? []]; this.augmentSeen = [...save.augmentSeen ?? []];
    this.augmentOffer = save.augmentOffer ? structuredClone(save.augmentOffer) : null; this.amonSince = save.amonSince ?? null; this.cheated = save.cheated ?? false;
    setActiveAugments(this.augments);
    this.wave = save.wave; this.gold = save.gold; this.lives = save.lives;
    this.continued = save.continued ?? false;
    const units = new Map<string, Tower>();
    for (const u of save.units) {
      const t = this.createTower(u.k, u.c, u.r);
      t.id = u.id; t.lvl = u.lvl; t.spent = u.spent; t.skills = u.skills.map(s => ({ ...s })); t.target = u.target; t.branch = u.branch;
      t.cd = u.cd; t.buffs = u.buffs.map(b => ({ ...b }));
      units.set(t.id, t);
    }
    for (const u of save.units) if (u.hostId) this.garrison(units.get(u.hostId)!, u.slot!, units.get(u.id)!);
    this.nextUnitId = Math.max(0, ...save.units.map(u => Number(u.id)));
    this.bonuses = { ...save.bonuses }; this.runStats = normalizeStats(structuredClone(save.stats)); this.commander = { ...save.commander };
    this.pending = [...save.pending]; this.rewarded = save.rewarded; this.tutorial = save.tutorial; this.usedKinds = [...save.usedKinds];
    this.opsNotice = `${save.wave}웨이브 준비 시점에서 복귀했습니다.`;
  }

  private applySkin(): void {
    const tint = this.profile.skin === 'gold' ? 0xffdb85 : this.profile.skin === 'ion' ? 0x9bcfff : 0xffffff;
    for (const t of this.towers) { t.base.setTint(tint); t.barrel.setTint(tint); }
  }

  /** 치트를 쓰면 이번 작전은 업적·훈장·최고 기록에서 빠진다. 테마 전환(q1w2e3r4)은 치트가 아니다. */
  private markCheated(): void {
    if (!this.cheated) this.opsNotice = '치트를 사용한 작전은 업적·훈장이 기록되지 않습니다.';
    this.cheated = true;
  }

  /** 명령 입력 창의 비밀 명령. */
  private registerCheats(console: CommandConsole): void {
    console.register({ names: ['show me the money'], desc: '미네랄 +10,000 (최대 100,000)', run: () => {
      this.markCheated();
      const gain = Math.max(0, Math.min(CHEAT_GOLD, CHEAT_GOLD_CAP - this.gold));
      if (!gain) return `미네랄이 이미 상한(${CHEAT_GOLD_CAP.toLocaleString()})입니다.`;
      this.gold += gain; this.banner(`미네랄 +${gain.toLocaleString()}`); this.audio.play('build');
      return `미네랄 +${gain.toLocaleString()} · 보유 ${this.gold.toLocaleString()}`;
    } });
    console.register({ names: ['power overwhelming'], desc: '모든 병력 공격력 2배, 입력할 때마다 중첩 (공격력 상한 10,000)', run: () => {
      this.markCheated();
      // 2배씩 거듭 곱해도 상한(10,000)에서 멈추므로, 배율 숫자가 무한히 커지지 않도록 횟수만 묶어 둔다.
      this.powerStacks = Math.min(CHEAT_POWER_STACKS, this.powerStacks + 1);
      const scale = 2 ** this.powerStacks;
      this.banner(`POWER OVERWHELMING ×${scale.toLocaleString()}`); this.audio.play('skill');
      return `모든 병력 공격력 ×${scale.toLocaleString()} · 공격력 상한 10,000`;
    } });
    console.register({ names: ['q1w2e3r4'], desc: '모에크래프트 테마 전환 (다시 입력하면 원래 테마)', run: () => {
      if (isBishoujo()) { selectTheme('frontier'); return `테마: ${THEMES.frontier.name}`; }
      // 프런티어 → 모에크래프트: 창을 닫고 잠금 해제 연출 한가운데(빛이 터지는 순간)에 테마를 바꾼다.
      console.close();
      // 모에크래프트 그림은 처음 켤 때 불러온다. 연출의 빛이 터지는 순간과 불러오기가 모두 끝난 뒤에 바꾼다.
      let loaded = false, revealed = false;
      this.loadBishoujoArt(() => { loaded = true; if (revealed) selectTheme('bishoujo'); });
      playThemeUnlock(() => { revealed = true; if (loaded) selectTheme('bishoujo'); });
      return `테마: ${THEMES.bishoujo.name}`;
    } });
  }

  /** 모에크래프트 그림을 처음 켤 때만 불러와, 프런티어만 쓰는 동안에는 메모리를 차지하지 않게 한다. */
  private loadBishoujoArt(done: () => void): void {
    if (this.textures.exists('bishoujo:portrait')) { done(); return; }
    loadBishoujoUnitArt(this);
    if (!MOBILE_LAYOUT) loadBishoujoConsoleChrome(this);
    this.load.once(Phaser.Loader.Events.COMPLETE, () => { createMoePortraits(this); done(); });
    this.load.start();
  }

  /** Swap artwork in place: battle state, saves, achievements and aiming remain intact. */
  private setupTheme(): void {
    const originals = new WeakMap<Phaser.GameObjects.Text, string>();
    const originalColors = new WeakMap<Phaser.GameObjects.Text, string>();
    const colors: Record<string, string> = { '#d2d7be': '#ffe0f4', '#8a967b': '#bfa7d2', '#77876d': '#ad93c1', '#80978d': '#b6a0cd', '#87977a': '#bda4cc', '#cbd5b8': '#ead9f4', '#a5b897': '#cbb8de', '#c9d7b2': '#f2d8f3', '#cedfb1': '#e7caef' };
    const chrome = this.add.graphics().setDepth(25.5);
    if (MOBILE_LAYOUT) {
      chrome.fillStyle(0x241e34).fillRect(W, 0, SIDE_W, H);
      chrome.lineStyle(1, 0x9070a3).strokeRect(W + 2, 2, SIDE_W - 4, H - 4);
    } else {
      chrome.fillStyle(0x2d243d).fillRect(0, 0, W, TOP_BAR_H);
      chrome.fillStyle(0x241e34).fillRect(0, TOP_BAR_H, W, RIBBON_BAND);
      chrome.lineStyle(1, 0x86659a).strokeRect(2, 2, W - 4, TOP_BAR_H - 4).lineBetween(0, MAP_Y - 2, W, MAP_Y - 2);
      chrome.fillStyle(0x9fd5ee).fillTriangle(587, 27, 580, 36, 587, 44).fillTriangle(589, 27, 596, 36, 589, 44);
    }
    const sky = this.add.graphics().setDepth(.5);
    sky.fillStyle(0x9e6ad2, .09).fillRect(0, MAP_Y, W, MAP_H);
    for (let i = 0; i < 34; i++) {
      const c = (i * 7 + 2) % COLS, r = (i * 3 + 1) % ROWS;
      if (this.map.pathCells.has(c + ',' + r)) continue;
      const x = (c + .5) * T, y = MAP_Y + (r + .5) * T;
      sky.lineStyle(1, 0xf4c8ed, .28).lineBetween(x - 3, y, x + 3, y).lineBetween(x, y - 3, x, y + 3);
      sky.fillStyle(0xe9bcf5, .12).fillCircle(x, y, 8);
    }
    const refresh = () => {
      sky.setVisible(isBishoujo());
      chrome.setVisible(isBishoujo());
      for (const child of this.children.list) {
        if (child instanceof Phaser.GameObjects.Image) {
          const texture = themeTexture(child.texture.key);
          if (texture !== child.texture.key && this.textures.exists(texture)) {
            const width = child.displayWidth, height = child.displayHeight;
            child.setTexture(texture).setDisplaySize(width, height);
          }
        } else if (child instanceof Phaser.GameObjects.Text) {
          if (child.text.includes('FRONTIER') || originals.has(child)) {
            if (!originals.has(child)) originals.set(child, child.text);
            child.setText(originals.get(child)!.replace(/FRONTIER/g, themeBrand()));
          }
          const color = originalColors.get(child) ?? child.style.color;
          if (typeof color === 'string' && colors[color]) {
            originalColors.set(child, color);
            child.setColor(isBishoujo() ? colors[color] : color);
          }
        }
      }
      this.uiCache.info = '';
      this.uiCache.hud = '';
    };
    refresh();
    window.addEventListener(THEME_CHANGED, refresh);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => window.removeEventListener(THEME_CHANGED, refresh));
  }

  private advanceTutorial(): void {
    if (this.profile.tutorialDone || this.testMode) return;
    const steps = [this.towers.some(t => t.k !== 'bunker'), this.towers.some(t => t.lvl > 1), this.towers.some(t => t.skills.length > 0), this.towers.some(t => t.host)];
    while (this.tutorial < 4 && steps[this.tutorial]) this.tutorial++;
    if (this.tutorial === 4) { this.profile.tutorialDone = true; this.persistProfile(); }
  }

  private specialize(key: Branch): boolean {
    const t = this.selected;
    // 이중 특화 증강이 있으면 이미 고른 갈래와 다른 갈래를 한 번 더 고를 수 있다.
    const second = !!t?.branch && hasAugment('dualBranch') && t.branch !== 'both' && t.branch !== key;
    if (!t || this.over || t.k === 'bunker' || t.lvl < 3 || t.branch && !second || this.gold < branchCost(t.k)) return false;
    const cost = branchCost(t.k); this.gold -= cost; t.spent += cost; t.branch = second ? 'both' : key;
    this.audio.play('build'); this.opsNotice = '특화가 적용되었습니다.'; this.saveCheckpoint(false); return true;
  }

  private beginRelocate(): boolean {
    const t = this.selected;
    if (!t || t.host || this.waveActive || this.over || this.gold < relocateCost(t.k)) return false;
    this.cancelCommand(); this.relocating = t;
    this.banner(`빈 칸을 지정해 재배치 · ${relocateCost(t.k)} 미네랄 · ESC 취소`); return true;
  }

  private finishRelocate(c: number, r: number): void {
    const t = this.relocating;
    if (!t || this.waveActive || !this.cellFree(c, r) || this.gold < relocateCost(t.k)) return;
    this.gold -= relocateCost(t.k);
    for (const unit of [t, ...t.passengers.filter((p): p is Tower => !!p)]) {
      unit.c = c; unit.r = r;
      if (unit === t) { unit.x = (c + .5) * T; unit.y = MAP_Y + (r + .5) * T; }
      this.tweens.killTweensOf([unit.base, unit.barrel]);
      unit.base.setPosition(unit.x, unit.y); unit.barrel.setPosition(unit.x, unit.y);
    }
    t.passengers.forEach((p, i) => { if (p) this.garrison(t, i, p); });
    this.selected = t; this.relocating = null; this.saveCheckpoint(false);
  }

  private useCommander(key: CommanderKey): void {
    if (this.over || this.paused || this.operationsOpen || this.shopOpen || !this.waveActive || this.commander[key] > 0 || key === 'supply' && this.options.mode === 'budget') return;
    // 지휘 과부하: 재사용 대기시간 -40%, 대신 쓸 때마다 기지 내구도 1. 마지막 1칸은 지원으로 소모하지 않는다.
    if (hasAugment('overload')) { if (this.lives <= 1) return; this.lives--; this.runStats.lost++; }
    this.commander[key] = COMMANDERS[key].cooldown * commanderCooldownScale();
    if (key === 'supply') this.gold += 100;
    else if (key === 'strike') { this.orbitalStrike(); if (hasAugment('orbital')) this.strikeEcho = .8; }
    else if (hasAugment('stasis')) for (const e of this.enemies) { if (!e.dead) e.stunT = Math.max(e.stunT, e.type === 'boss' ? STASIS_BOSS_TIME : STASIS_TIME); }
    else for (const e of this.enemies) if (!e.dead) { e.slow = Math.min(e.slow, .35); e.slowT = Math.max(e.slowT, 5); }
    this.audio.play('skill'); this.banner(COMMANDERS[key].name);
  }

  private orbitalStrike(): void {
    for (const e of [...this.enemies]) if (!e.dead) this.damageEnemy(e, e.max * (e.type === 'boss' ? .12 : .3), 'skill', 'commander');
  }

  // ---------- 증강 ----------
  private offerAugments(): void {
    this.augmentOffer = augmentOffer(this.wave, new Set([...this.augmentSeen, ...this.augments]), key => this.augmentEligible(key));
    if (!this.augmentOffer.cards.length) { this.augmentOffer = null; return; }
    this.augmentSeen.push(...this.augmentOffer.cards);
  }
  private augmentEligible(key: AugmentKey): boolean {
    return augmentEligible(key, this.faction, this.towers.map(t => t.k));
  }
  /** 카드마다 한 번, 그 자리만 등급부터 다시 굴려 아직 출현하지 않은 증강으로 바꾼다. */
  private rerollAugment(index: number): boolean {
    const offer = this.augmentOffer;
    if (!offer || this.over || offer.rerolled[index] !== false) return false;
    const card = drawAugment(this.wave, new Set([...this.augmentSeen, ...this.augments, ...offer.cards]), key => this.augmentEligible(key));
    if (!card) { this.opsNotice = '다시 뽑을 증강이 남아 있지 않습니다.'; return false; }
    offer.cards[index] = card; offer.rerolled[index] = true; this.augmentSeen.push(card);
    this.saveCheckpoint(false); return true;
  }
  private pickAugment(key: AugmentKey): void {
    if (!this.augmentOffer?.cards.includes(key) || this.over || this.augments.includes(key)) return;
    this.augments.push(key); this.augmentOffer = null; setActiveAugments(this.augments);
    if (key === 'aiur') for (const t of this.towers.filter(t => t.k === 'zealot')) this.sellTower(t);
    if (key === 'xelnaga') this.amonSince = this.wave;
    if (key === 'investment') this.gold += INVESTMENT_GOLD;
    if (key === 'glassCannon') this.lives = Math.min(this.lives, maxLives());
    // 요새화: 이미 지은 벙커에도 5·6번 사격구를 연다.
    if (key === 'fortress') for (const t of this.towers) if (t.k === 'bunker') while (t.passengers.length < bunkerCapacity()) t.passengers.push(null);
    this.opsNotice = AUGMENTS[key].name + ' 증강을 얻었습니다.'; this.saveCheckpoint(false);
  }
  /** 병력 구성은 능력치 계산마다 쓰이므로 병력이 바뀌거나(배치·판매) 기지 내구도가 달라질 때만 다시 센다. */
  private army(): Army {
    if (this.armyMemo?.lives === this.lives) return this.armyMemo;
    const units = this.towers.filter(t => t.k !== 'bunker');
    const kinds: Partial<Record<TowerKey, number>> = {};
    for (const t of units) kinds[t.k] = (kinds[t.k] ?? 0) + 1;
    this.armyMemo = { size: units.length, terran: units.filter(t => TOWER_DEFS[t.k].faction === 'terran').length, protoss: units.filter(t => TOWER_DEFS[t.k].faction === 'protoss').length, kinds, lives: this.lives };
    return this.armyMemo;
  }
  private armySize(): number { return this.army().size; }
  /** 약점 분석: 옵저버·사이언스 베슬의 지원 범위 안에 든 적은 병력 피해를 15% 더 받는다. */
  private analysisBonus(e: Enemy): number {
    return hasAugment('analysis') && this.towers.some(t => (t.k === 'observer' || t.k === 'support') && Math.hypot(e.x - t.x, e.y - t.y) <= this.supportRange(t)) ? ANALYSIS_BONUS : 1;
  }
  /** 사이오닉 공명: 아칸(자신 포함) 반경 150 안의 병력은 공격 속도 +15%. */
  private resonance(t: StatsUnit): number {
    return hasAugment('resonance') && t.x !== undefined && t.y !== undefined
      && this.towers.some(a => a.k === 'templar' && Math.hypot(a.x - t.x!, a.y - t.y!) <= RESONANCE_RADIUS) ? RESONANCE_HASTE : 1;
  }

  private toggleAutoCommander(key: CommanderKey): void {
    if (this.autoCommander.delete(key)) { this.banner(COMMANDERS[key].name + ' 자동 사용 해제'); return; }
    this.autoCommander.add(key); this.banner(COMMANDERS[key].name + ' 자동 사용');
  }

  private takeReward(key: RewardKey): void {
    if (!this.pending.includes(key) || this.over || this.waveActive || this.rewarded >= this.wave) return;
    if (key === 'power') this.bonuses.power += .12;
    if (key === 'haste') this.bonuses.haste += .1;
    if (key === 'range') this.bonuses.range += 12;
    if (key === 'repair') this.lives = Math.min(maxLives(), this.lives + 4);
    if (key === 'supply' && this.options.mode !== 'budget') this.gold += 150;
    this.rewarded = this.wave; this.pending = []; this.opsNotice = REWARDS[key].name + ' 보상을 획득했습니다.'; this.saveCheckpoint(false);
  }

  private recordWave(cleared = true): void {
    this.runStats.waves.push({ wave: this.wave, kills: this.runStats.kills - this.waveStart.kills,
      lost: this.runStats.lost - this.waveStart.lost, seconds: this.runStats.seconds - this.waveStart.seconds });
    if (!this.testMode && !this.cheated && cleared) { awardAchievements(this.profile, this.wave, false, this.runStats, this.options, this.usedKinds); this.persistProfile(); }
  }

  private cellAt(p: Phaser.Input.Pointer): Cell | null {
    // 맵 카메라 줌·스크롤이 있으므로 화면 좌표(p.x)가 아니라 mapCam 기준 세계 좌표로 칸을 찾는다.
    if (!this.inMapView(p)) return null;
    const { x, y } = this.mapPoint(p.x, p.y);
    if (y < MAP_Y || y >= MAP_Y + MAP_H || x < 0 || x >= W) return null; // 뷰포트 아래 덤 땅(VIEW_H - MAP_H)은 칸이 아니다
    return { c: Math.floor(x / T), r: Math.floor((y - MAP_Y) / T) };
  }

  /** 미리보기용 칸: 맵 아래 덤 땅(r ≥ ROWS)까지 잡아 빨간 설치 불가 표시를 띄운다. 실제 칸은 cellAt과 같다. */
  private hoverAt(p: Phaser.Input.Pointer): Cell | null {
    if (!this.inMapView(p)) return null;
    const { x, y } = this.mapPoint(p.x, p.y);
    if (y < MAP_Y || y >= MAP_Y + VIEW_H || x < 0 || x >= W) return null;
    return { c: Math.floor(x / T), r: Math.min(Math.floor((y - MAP_Y) / T), ROWS) };
  }

  // ---------- 맵 확대·이동 ----------
  /** 포인터(캔버스 픽셀)가 맵 영역 위에 있는가. */
  private inMapView(p: { x: number; y: number }): boolean {
    const x = p.x / RENDER_SCALE, y = p.y / RENDER_SCALE;
    if (!MOBILE_LAYOUT && consoleContains(x, y - CONSOLE_Y + CONSOLE_RISE)) return false;
    return x >= 0 && x < W && y >= MAP_Y && y < MAP_Y + VIEW_H;
  }

  /** 캔버스 픽셀 좌표 → mapCam 기준 게임 세계 좌표. */
  private mapPoint(sx: number, sy: number): { x: number; y: number } {
    const k = RENDER_SCALE * this.mapZoom;
    return { x: this.mapCx + (sx - W * RENDER_SCALE / 2) / k, y: this.mapCy + (sy - (MAP_Y + VIEW_H / 2) * RENDER_SCALE) / k };
  }

  /** 줌과 시점 중심을 정하고 맵 경계 밖이 보이지 않게 제한한다. */
  private setMapView(zoom: number, cx: number, cy: number): void {
    const z = Phaser.Math.Clamp(zoom, 1, MAX_MAP_ZOOM), hw = W / 2 / z, hh = VIEW_H / 2 / z;
    this.mapZoom = z;
    this.mapCx = Phaser.Math.Clamp(cx, hw, W - hw); this.mapCy = Phaser.Math.Clamp(cy, MAP_Y + hh, MAP_Y + VIEW_H - hh);
    this.mapCam.setZoom(RENDER_SCALE * z).centerOn(this.mapCx, this.mapCy);
  }

  /** (fx,fy) 화면 지점 아래의 세계 좌표가 (tx,ty) 화면 지점에 오도록 확대한다 (핀치 중점 이동 포함). */
  private zoomMap(zoom: number, fx: number, fy: number, tx = fx, ty = fy): void {
    const wp = this.mapPoint(fx, fy), z = Phaser.Math.Clamp(zoom, 1, MAX_MAP_ZOOM), k = RENDER_SCALE * z;
    this.setMapView(z, wp.x - (tx - W * RENDER_SCALE / 2) / k, wp.y - (ty - (MAP_Y + VIEW_H / 2) * RENDER_SCALE) / k);
  }

  /** 화면 전체가 흔들리도록 두 카메라에 shake를 건다. flash는 겹쳐 밝아지지 않게 uiCam에만 쓴다. */
  private shakeAll(ms: number, power: number): void { this.mapCam.shake(ms, power); this.uiCam.shake(ms, power); }

  private zoomStep(f: number): void {
    this.zoomMap(this.mapZoom * f, W * RENDER_SCALE / 2, (MAP_Y + VIEW_H / 2) * RENDER_SCALE);
  }

  /** 맵 오른쪽 위 모서리의 [+] [−] [⟲] 버튼. 손가락 기기에서는 더 크게. */
  private buildZoomUI(): void {
    const big = this.touchUI || MOBILE_LAYOUT, s = big ? 40 : 28, x = W - s - 8;
    const items: [string, () => void][] = [['+', () => this.zoomStep(1.4)], ['−', () => this.zoomStep(1 / 1.4)], ['⟲', () => this.setMapView(1, W / 2, MAP_Y + VIEW_H / 2)]];
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
    if (!p.wasTouch) this.hover = this.hoverAt(p);
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
  }

  // ---------- UI ----------
  private buildUI(): void {
    if (MOBILE_LAYOUT) this.buildMobileUI(); else this.buildDesktopUI();
  }

  /** 지원하는 기기에서만 전체화면 버튼을 만든다. 브라우저는 전체화면 요청을 사용자 제스처(pointerup) 안에서만 허용한다. */
  private addFullscreenButton(x: number, y: number, w: number, h: number, size: number): boolean {
    if (!this.touchUI || !this.scale.fullscreen.available) return false;
    mkBtn(this, x, y, w, h, '⛶ 전체화면', () => {}, size);
    this.add.zone(x, y, w, h).setOrigin(0).setDepth(34).setInteractive({ cursor: COMMAND_ACTIVE_CURSOR }).on('pointerup', () => {
      if (this.scale.isFullscreen) { this.scale.stopFullscreen(); return; }
      this.scale.startFullscreen();
      (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.('landscape').catch(() => {});
    });
    return true;
  }

  /** 휴대폰 가로 화면용: 상태·선택 이름을 간결하게 모으고, 설명문 대신 큰 3×3 명령 아이콘에 공간을 준다. */
  private buildMobileUI(): void {
    const x0 = W, pw = SIDE_W, right = x0 + pw, L = x0 + 20, o = SIDE_RIBBON_H;
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
    this.portraitSize = 36;
    this.lifeMeter = { x: right - 86, y: o + 58, w: 66 };

    // 상황판: 웨이브 · 미네랄 · 기지 내구도 (위쪽 o px는 HTML 전술 상황판 자리)
    box(o, 70);
    this.hud = text(L, o + 6, '', 18, '#cbd5b8').setFontFamily('monospace');
    if (!this.addFullscreenButton(right - 104, o + 4, 86, 26, 11)) text(right - 20, o + 10, 'FRONTIER', 12, '#8a967b').setOrigin(1, 0).setLetterSpacing(2);
    g.fillStyle(0x5dacc0).fillTriangle(L + 6, o + 35, L, o + 44, L + 6, o + 53).fillTriangle(L + 8, o + 35, L + 14, o + 44, L + 8, o + 53);
    this.mineralTxt = text(L + 22, o + 32, '', 19, '#a6d7e1').setFontFamily('monospace');
    this.lifeTxt = text(right - 20, o + 32, '', 18, '#b7dc8e').setFontFamily('monospace').setOrigin(1, 0);
    this.miniGfx = this.add.graphics().setDepth(29);

    // 선택 이름·초상화만 남기고 상세 설명 자리는 명령 칸에 돌려준다.
    const u = o + 72;
    box(u, 48);
    this.unitTitle = text(L, u + 16, '기지 사령부', 15, '#c9d7b2').setFontStyle('bold');
    this.add.rectangle(right - 60, u + 2, 40, 44, 0x0a1710).setOrigin(0).setStrokeStyle(1, 0x52634b).setDepth(27);
    this.unitImage = this.add.image(right - 40, u + 24, 'portrait').setDisplaySize(36, 43).setDepth(28);
    this.info = text(L, u + 34, '', 12, '#a5b897').setVisible(false);

    const c = u + 48 + 7, commandY = c + 25, b = H - 56;
    this.commandTitle = text(L, c, '', 13, '#cedfb1').setFontStyle('bold');
    this.commandHint = text(L, c + 21, '', 10, '#a3ba94').setVisible(false);
    this.shopBtn = mkBtn(this, right - 110, c - 5, 92, 24, '', () => this.selected ? this.cancelCommand() : this.openShop('manage'), 11);
    this.commandCard = new CommandCard(this, x0 + 10, commandY, pw - 20, b - commandY - 6, command => this.describeCommand(command), false, 72);
    this.goBtn = mkBtn(this, x0 + 10, b, 160, 50, '▶  웨이브 시작', () => this.startWave(), 15);
    this.goBtn.act(true);
    this.spdBtn = mkBtn(this, x0 + 176, b, 66, 50, '배속 ×1', () => {
      this.speed = this.speed % 3 + 1; this.spdBtn.set('배속 ×' + this.speed);
    }, 12);
    this.pauseBtn = mkBtn(this, x0 + 248, b, 62, 50, `정지${this.kb(' [P]')}`, () => this.togglePause(), 13);

    this.add.text(W - 8, H - 6, `FRONTIER  /  v${__APP_VERSION__}`, { fontFamily: 'monospace', fontSize: '10px', color: '#616f5b' })
      .setOrigin(1, 1).setDepth(30).setAlpha(.8);
    this.pauseTxt = this.add.text(W / 2, MAP_Y + MAP_H / 2, this.touchUI ? '전술 일시정지\n정지 버튼으로 작전 재개' : '전술 일시정지\n[ P ] 작전 재개', {
      fontFamily: FONT, fontSize: '28px', align: 'center', lineSpacing: 18, color: '#c5e49e',
      backgroundColor: '#0b1715ee', padding: { x: 42, y: 28 }, stroke: '#253a25', strokeThickness: 1,
    }).setOrigin(.5).setDepth(40).setVisible(false);
  }

  /** 데스크톱용: 전술지도 → 상태정보 → 초상화 → 3×3 커맨드. 웨이브 시작은 지도 위에 배치. */
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
    panel(0, 0, W, TOP_BAR_H);
    // 전술 띠: 상단 바와 맵 사이. HTML 상황판(operations.ts)이 이 안에 놓인다.
    metal.fillStyle(0x111715).fillRect(0, TOP_BAR_H, W, RIBBON_BAND).fillStyle(0x1b2320).fillRect(0, TOP_BAR_H, W, RIBBON_BAND - 3);
    metal.fillStyle(0x29312e).fillRect(0, MAP_Y - 3, W, 3).lineStyle(1, 0x596150).lineBetween(0, TOP_BAR_H + .5, W, TOP_BAR_H + .5).lineBetween(0, MAP_Y - 3.5, W, MAP_Y - 3.5);
    addConsoleChrome(this, y);
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
    text(24, y + 181, '전술 지도', 11, '#b7c2a2');
    const junction = this.map.key === 'junction';
    text(140, y + 183, this.map.key === 'canyon' ? 'C-03' : junction ? 'J-02' : 'F-07', 9, junction ? '#82a9b6' : '#72866a').setFontFamily('monospace');
    this.add.rectangle(24, y + 50, 162, 108, junction ? 0x101f2a : 0x0a1711).setOrigin(0).setStrokeStyle(1, junction ? 0x527480 : 0x556447).setDepth(27);
    const mini = this.add.graphics().setDepth(28);
    for (const cell of this.map.pathCells) {
      const [c, r] = cell.split(',').map(Number);
      if (c >= 0 && c < COLS) mini.fillStyle(this.map.key === 'canyon' ? 0xae8255 : junction ? 0x415866 : 0x3f5941).fillRect(25 + c * 8, y + 53 + r * 8, 8, 8);
    }
    if (junction) {
      const [north, south] = this.map.routes;
      const start = north.findIndex(p => south.some(q => p.x === q.x && p.y === q.y));
      const merge = north[start];
      const lanes = this.map.routes.map((route, i) => ({ route: route.slice(0, route.findIndex(p => p.x === merge.x && p.y === merge.y) + 1), color: i === 0 ? 0x71d0dc : 0xe5b96c }));
      lanes.push({ route: north.slice(start), color: 0xb7d6bd });
      // Match the battlefield's two approaches and common exit using actual route coordinates.
      for (const { route, color } of lanes) {
        mini.lineStyle(2, color, .85).beginPath();
        route.forEach((p, i) => {
          const x = Math.max(25, Math.min(25 + COLS * 8, 25 + p.x / T * 8)), yy = y + 53 + (p.y - this.map.mapY) / T * 8;
          if (i === 0) mini.moveTo(x, yy); else mini.lineTo(x, yy);
        });
        mini.strokePath();
      }
      mini.fillStyle(0x172d39).fillCircle(25 + merge.x / T * 8, y + 53 + (merge.y - this.map.mapY) / T * 8, 4);
      mini.lineStyle(1, 0xb7d6bd).strokeCircle(25 + merge.x / T * 8, y + 53 + (merge.y - this.map.mapY) / T * 8, 4);
    }
    for (const cell of this.map.highGroundCells) {
      const [c, r] = cell.split(',').map(Number);
      mini.fillStyle(0xc18b58, .7).fillRect(25 + c * 8 + 1, y + 53 + r * 8 + 1, 6, 6);
    }
    mini.lineStyle(1, 0x7a9663, .5).strokeRect(27, y + 51, 156, 102);
    for (let yy = y + 51; yy < y + 156; yy += 3) mini.fillStyle(0x000000, .15).fillRect(25, yy, 160, 1);
    this.miniGfx = this.add.graphics().setDepth(29);
    this.unitTitle = text(226, y + 50, '기지 사령부', 13, '#c9d7b2').setFontStyle('bold');
    this.statusImage = this.add.image(254, y + 120, 'unit_marine').setDisplaySize(64, 64).setTint(0x75df8a).setAlpha(.65).setDepth(28).setVisible(false);
    this.info = text(302, y + 76, '', 11, '#a5b897').setLineSpacing(5).setWordWrapWidth(238);
    this.portraitSize = 78;
    text(587, y + 59, 'COM LINK', 8, '#b2bea8').setFontFamily('monospace').setLetterSpacing(1);
    this.add.rectangle(582, y + 82, 108, 94, 0x0a1710).setOrigin(0).setStrokeStyle(1, 0x52634b).setDepth(27);
    this.unitImage = this.add.image(636, y + 129, 'portrait').setDisplaySize(78, 92).setDepth(28);
    text(595, y + 185, '● ONLINE', 9, '#9cbd85').setFontFamily('monospace');
    // 제목·버튼은 장갑 윗단 금속 띠(y+4..y+38) 가운데에 한 줄로 맞춘다 (액정 테두리 y+38, 모서리 나사 x 735·941 회피).
    this.commandTitle = text(746, y + 21, '', 10, '#cedfb1').setFontStyle('bold').setOrigin(0, .5);
    this.commandTip = this.add.rectangle(648, y - 122, 304, 114, 0x0a1710, .97).setOrigin(0).setStrokeStyle(1, 0x8aab69).setDepth(34).setVisible(false);
    this.commandHint = text(660, y - 110, '', 11, '#c0d5a7').setLineSpacing(4).setWordWrapWidth(278).setDepth(35).setVisible(false);
    this.shopBtn = mkBtn(this, 834, y + 10, 98, 22, '', () => this.selected ? this.cancelCommand() : this.openShop('manage'), 9);
    this.commandCard = new CommandCard(this, 728, y + 49, 210, 132, command => this.describeCommand(command));
    this.goBtn = mkBtn(this, 24, y + 12, 162, 26, `▶  웨이브 시작${this.kb('  [SPACE]')}`, () => this.startWave(), 11);
    this.goBtn.act(true);
    this.spdBtn = mkBtn(this, 224, y + 172, 154, 25, '배속 ×1', () => {
      this.speed = this.speed % 3 + 1; this.spdBtn.set('배속 ×' + this.speed);
    }, 11);
    this.pauseBtn = mkBtn(this, 384, y + 172, 158, 25, `정지${this.kb(' [P]')}`, () => this.togglePause(), 11);
    text(16, H - 17, this.touchUI
      ? '유닛 선택 → 명령 아이콘    /    빈 땅 → 유닛 보급    /    건설은 같은 칸을 두 번 탭    /    스킬 자동 사용'
      : 'T·R 종족    /    1–9 유닛 보급    /    U 강화    /    Z·X 스킬    /    S 회수    /    ESC 해제    /    B 관리', 9, '#7d8b73');
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
      this.hud.setText(`WAVE  ${String(this.wave).padStart(2, '0')} / ${this.options.mode === 'endless' || this.continued ? '∞' : MAX_WAVE}`);
      this.mineralTxt.setText(this.gold.toLocaleString());
      this.lifeTxt.setText(`${Math.max(0, this.lives)} / ${maxLives()}`);
      this.lifeTxt.setColor(this.lives <= 5 ? '#e29a7f' : isBishoujo() ? '#efb9dd' : '#b7dc8e');
      this.goBtn.set(this.over ? '작전 종료' : this.waveActive ? `${MOBILE_LAYOUT ? '교전' : '교전 중'} · 남은 적 ${remaining}` : `▶  웨이브 시작${this.kb('  [SPACE]')}`);
    }
    this.goBtn.en(!this.waveActive && !this.over && !this.paused && !this.shopOpen && !this.operationsOpen && !this.pending.length && !this.augmentOffer && (this.testMode || this.options.mode === 'endless' || this.continued || this.wave < MAX_WAVE));
    this.shopBtn.en(!this.over);
    const t = this.selected, k = t?.k ?? this.building;
    let title: string, msg: string;
    if (k) {
      const d = TOWER_DEFS[k];
      title = `${d.name}  ${t ? 'Lv.' + t.lvl : '/ 건설 대기'}`;
      const cell = t ?? this.hover;
      const st = this.stats(t ?? { k, lvl: 1, ...(cell ? { ...cell, x: (cell.c + .5) * T, y: MAP_Y + (cell.r + .5) * T } : {}) });
      const highGround = cell ? highGroundRangeBonus(this.map, cell.c, cell.r) : 0;
      const terrainHint = highGround ? ` · 고지 +${highGround}` : '';
      if (k === 'bunker') {
        const crew = t?.passengers.filter((p): p is Tower => !!p) ?? [];
        title = `벙커  ${crew.length}/${bunkerCapacity()} 주둔`;
        msg = `보병 최대 ${bunkerCapacity()}기 · 사거리 +${BUNKER_RANGE_BONUS + (hasAugment('fortress') ? FORTRESS_RANGE : 0)}${terrainHint}\n` + (crew.length ? crew.map(p => `${TOWER_DEFS[p.k].name} Lv.${p.lvl} · 스킬 ${p.skills.length}/2`).join('\n') : '현재 주둔 병력 없음\n빈 벙커는 공격하지 않습니다.\n명령 아이콘으로 탑승·구매');
      } else if (k === 'support' || k === 'observer') {
        msg = `지원 사거리 ${st.range.toFixed(0)}${terrainHint}\n` + (k === 'support'
          ? `공속 +${Math.round(vesselAuraBonus(t?.lvl ?? 1) * 100)}% · 2대 중첩(추가 ${VESSEL_AURA.secondary * 100}%)\nEMP · ${VESSEL_EMP.cooldown}초마다 보호막 ${VESSEL_EMP.shieldFraction * 100}% 제거\n표적 주변 반경 ${VESSEL_EMP.radius} · 자동 사용`
          : `미표식 우선 · 관측 ${OBSERVATION_DURATION}초\n받는 피해 +${OBSERVER_INFO_BONUSES}\n기체별 중첩 · 반복 관측은 갱신`);
      } else {
        msg = `공격 ${st.dmg.toFixed(0)}${attackCount(k) > 1 ? ` × ${attackCount(k)}` : ''} · 사거리 ${st.range.toFixed(0)}${terrainHint}\n공격 속도 ${(1 / st.rate).toFixed(1)}/초\n자동 스킬 ${t?.skills.length ?? 0}/${SKILL_SLOTS}`;
        msg += t?.skills.length ? '\n' + t.skills.map(s => `${SKILL_DEFS[s.key].name} ${s.cd > 0 ? Math.ceil(s.cd) + '초' : '준비'}`).join('\n') : '\n명령 아이콘으로 스킬 장착';
        if (t?.host) title += ' / 탑승';
      }
    } else {
      title = '기지 사령부';
      msg = this.unloading
        ? `${TOWER_DEFS[this.unloading.k].name} 하차 대기\n${this.touchUI ? '빈 구역을 두 번 탭하세요.\n✕ 취소' : '빈 구역을 클릭하세요.\nESC 취소'} · 병력은 탑승 유지`
        : `${themeBrand()} COMMAND\n아이콘 선택 → 유닛 배치\n유닛 선택 → 강화·스킬\n빈 땅 → 유닛 보급`;
    }
    const cache = title + msg;
    if (this.uiCache.info !== cache) {
      this.uiCache.info = cache;
      this.unitTitle.setText(title); this.info.setText(msg);
      this.unitImage.setTexture(themeTexture(k ? 'unit_' + k : 'portrait'));
      if (this.statusImage) {
        this.statusImage.setVisible(!!k);
        if (k) this.statusImage.setTexture(themeTexture('unit_' + k));
        this.info.setX(k ? 302 : 224).setWordWrapWidth(k ? 238 : 316);
      }
      const ps = this.portraitSize;
      if (k) this.unitImage.setDisplaySize(ps, ps); else this.unitImage.setDisplaySize(ps, ps * 104 / 88);
    }
    this.shopBtn.set(t ? '선택 해제' + this.kb(' [ESC]') : '일괄 관리' + this.kb(' [B]'));
    this.commandCard.update(this.commands());
  }

  private selectUnit(id: string): void {
    if (this.over) return;
    const unit = this.towers.find(t => t.id === id);
    if (!unit) return;
    this.selected = unit; this.building = null; this.unloading = null; this.hover = null;
  }

  private commands(): (UnitCommand | undefined)[] {
    const cells: (UnitCommand | undefined)[] = Array(9);
    const make = (id: string, title: string, texture: string, detail: string, run: () => void,
      enabled = true, price?: number): UnitCommand => ({ id, title, texture, detail, run, enabled: !this.over && enabled, price });
    const cancel = make('cancel', '선택 해제', 'cmd_cancel', '선택과 배치 명령을 취소하고 유닛 보급으로 돌아갑니다.', () => this.cancelCommand());
    cancel.hotkey = this.kb('ESC');
    if (this.unloading || this.relocating) { cells[8] = cancel; return cells; }
    const t = this.selected;
    if (!t) return FACTION_TOWERS[this.faction].map((key, i) => ({
      ...make('build:' + key, TOWER_DEFS[key].name, 'unit_' + key, TOWER_DEFS[key].desc + (this.buildLimited(key) ? '\n내 목숨을 아이어에 · 질럿은 1기만 배치할 수 있습니다.' : '\n아이콘 선택 후 빈 구역에 배치하세요.'),
        () => this.chooseBuild(key), allowedUnit(key, this.options.mode) && !this.buildLimited(key) && (this.gold >= placeCost(key) || this.building === key), placeCost(key)),
      active: this.building === key, hotkey: this.kb(String(i + 1)),
    }));
    if (t.k === 'bunker') {
      // 명령 카드는 4칸만 보여 준다. 요새화의 5·6번 사격구는 주둔 상세 관리에서 다룬다.
      t.passengers.slice(0, 4).forEach((crew, i) => {
        cells[i] = crew ? make('crew:' + crew.id, `${TOWER_DEFS[crew.k].name} Lv.${crew.lvl}`, 'unit_' + crew.k,
          '탑승 병력을 선택합니다. 다음 명령 칸에서 하차 없이 강화·스킬을 장착할 수 있습니다.', () => this.selectUnit(crew.id))
          : make('empty:' + i, '빈 사격구', 'cmd_empty', '마린·파이어뱃은 아래 아이콘으로, 고스트는 주둔 상세 관리에서 구매해 탑승시킬 수 있습니다.', () => {}, false);
      });
      const slot = t.passengers.findIndex(p => !p);
      (['marine', 'firebat'] as const).forEach((key, i) => {
        cells[4 + i] = make('recruit:' + key + ':' + t.id, TOWER_DEFS[key].name + ' 탑승', 'unit_' + key,
          slot < 0 ? '사격구 4칸이 모두 사용 중입니다.' : '병력 1기를 구매해 이 벙커의 빈 사격구에 바로 배치합니다.',
          () => this.recruit(t.id, slot, key), slot >= 0 && this.gold >= placeCost(key), placeCost(key));
      });
      const plan = planOrder(this.shopState().units, { type: 'upgrade' }, { bunkerId: t.id });
      cells[6] = make('upgrade-crew:' + t.id, '병력 일괄 강화', 'cmd_upgrade',
        `${plan.ids.length}기를 각 1단계 강화합니다. 최대 강화 병력은 제외하고, 총비용이 부족하면 전체 보류합니다.`,
        () => this.applyOrder({ type: 'upgrade' }, { bunkerId: t.id }), !!plan.ids.length && this.gold >= plan.cost, plan.cost);
      cells[7] = make('garrison:' + t.id, '주둔 상세 관리', 'cmd_manage', '마린·파이어뱃·고스트 구매, 병력 이동·하차와 벙커별 일괄 스킬을 관리합니다.', () => this.openShop('garrison'));
    } else {
      const cost = this.upgradeCost(t), max = t.lvl >= maxUnitLevel();
      cells[0] = { ...make('upgrade:' + t.id, '일반 강화', 'cmd_upgrade', max ? `최대 Lv.${maxUnitLevel()} 강화가 완료되었습니다.`
        : `Lv.${t.lvl} → Lv.${t.lvl + 1}\n공격력 ×1.6 · 기본 사거리 +8% · 공격 간격 감소`,
        () => this.upgradeUnit(t.id), !max && this.gold >= cost, max ? undefined : cost), hotkey: this.kb('U'), badge: max ? 'MAX' : 'Lv' + t.lvl, active: max };
      SKILL_KEYS.filter(key => SKILL_DEFS[key].unit === t.k).forEach((key, i) => {
        const def = SKILL_DEFS[key], owned = t.skills.find(s => s.key === key);
        cells[1 + i] = { ...make('skill:' + key + ':' + t.id, def.name, 'cmd_' + key,
          (skillLocked(t.k) ? '야마토 프로토콜로 스킬 비활성화\n' : owned ? '장착 완료 · 적을 만나면 자동 사용\n' : '누르면 영구 장착 · 이후 자동 사용\n') + def.desc,
          () => this.equipSkill(key, t.id), !owned && !skillLocked(t.k) && t.skills.length < SKILL_SLOTS && this.gold >= skillCost(key), owned ? undefined : skillCost(key)),
          hotkey: this.kb(i === 0 ? 'Z' : 'X'), active: !!owned, badge: owned ? owned.cd > 0 ? Math.ceil(owned.cd) + 's' : 'AUTO' : '',
          progress: owned ? 1 - owned.cd / def.cooldown : undefined };
      });
      supportTraits(t.k, t.lvl).forEach((trait, i) => {
        const emp = trait.icon === 'emp', cooldown = emp ? t.cd : 0;
        cells[1 + i] = { ...make('passive:' + trait.icon + ':' + t.id, trait.name, 'cmd_' + trait.icon,
          '기본 능력 · 자동 적용\n' + trait.text, () => {}, false), active: true,
          badge: cooldown > 0 ? Math.ceil(cooldown) + 's' : 'AUTO', progress: emp ? 1 - cooldown / VESSEL_EMP.cooldown : undefined };
      });
      cells[3] = make('sell:' + t.id, '유닛 회수', 'cmd_sell', `투자한 미네랄의 ${Math.round(sellRate() * 100)}%인 ${this.sellValue(t)}을 돌려받습니다.`,
        () => { if (this.selected?.id === t.id) this.sell(); });
      cells[3].hotkey = this.kb('S');
      cells[4] = make('manage', '부대 일괄 관리', 'cmd_manage', '전장과 모든 벙커의 병력을 함께 강화하거나 스킬을 일괄 장착합니다.', () => this.openShop('manage'));
      cells[5] = make('tactics', '전술 / 특화', 'cmd_manage', '공격 대상 우선순위와 Lv.3 이상 특화를 선택합니다.', () => this.operations?.show('tactics'));
      if (!t.host) cells[7] = make('relocate', '재배치', 'cmd_unload', `준비 시간에 빈 칸을 지정하면 ${relocateCost(t.k)}미네랄로 이동합니다.`, () => this.beginRelocate(), !this.waveActive && this.gold >= relocateCost(t.k), relocateCost(t.k));
      if (t.host) {
        const hostId = t.host.id;
        cells[6] = make('host:' + hostId, '벙커로 돌아가기', 'unit_bunker', '이 병력이 탑승한 벙커를 선택합니다.', () => this.selectUnit(hostId));
        cells[7] = make('unload:' + t.id, '하차', 'cmd_unload', '아이콘을 누르고 빈 구역을 지정하세요. 지정할 때까지 벙커에 남습니다.', () => this.beginUnload(t.id));
      }
      cells[8] = cancel;
    }
    if (t.k === 'bunker') {
      const occupied = t.passengers.some(Boolean);
      cells[8] = make('sell:' + t.id, '벙커 회수', 'cmd_sell', occupied ? '병력이 탑승해 있습니다. 모두 하차한 뒤 회수할 수 있습니다.'
        : `${this.sellValue(t)} 미네랄을 돌려받습니다.`, () => { if (this.selected?.id === t.id) this.sell(); }, !occupied);
    }
    return cells;
  }

  private describeCommand(command?: UnitCommand): void {
    const t = this.selected;
    const portraitKey = command?.texture.match(/^unit_(.+)$/)?.[1] as TowerKey | undefined;
    const character = isBishoujo() && portraitKey ? MOE_CHARACTERS[portraitKey] : undefined;
    this.commandTitle.setText(this.relocating ? '재배치 위치 지정' : this.unloading ? '하차 위치 지정' : t ? TOWER_DEFS[t.k].name + ' 명령' : FACTIONS[this.faction].name + ' / 9종 보급');
    this.commandHint.setVisible(!MOBILE_LAYOUT && !!command);
    this.commandTip?.setVisible(!!command);
    const detail = command ? `${character ? character.mark + ' ' + character.name + ' · ' : ''}${command.title}${command.price !== undefined ? ' · ◆ ' + command.price : ''}${!command.enabled && !command.active ? ' · 사용 불가' : ''}\n${MOBILE_LAYOUT ? command.detail.replace(/\n/g, ' ').slice(0, 48) : command.detail}`
      : this.unloading ? '빈 구역을 지정해 병력을 하차시키세요.\n취소하면 벙커에 그대로 남습니다.'
      : t ? t.k === 'bunker' ? '병력 초상화를 누르면 해당 병력의 강화·스킬 명령으로 전환됩니다.'
        : '강화·스킬 아이콘을 누르면 바로 적용됩니다.\n장착한 스킬은 자동으로 사용합니다.'
      : this.building ? `${TOWER_DEFS[this.building].name} 배치 대기\n빈 구역을 지정하세요.\nESC 또는 우클릭으로 취소`
      : '상단 종족 아이콘으로 테란 / 프로토스 전환\n유닛 아이콘을 선택한 뒤 빈 구역에 배치하세요.';
    this.commandHint.setText(detail);
  }

  // ---------- 입력 ----------
  /** 키보드 단축키 안내. 터치 기기와 좁은 모바일 패널에서는 비운다. */
  private kb(hint: string): string { return this.touchUI || MOBILE_LAYOUT ? '' : hint; }

  private cancelCommand(): void { this.building = null; this.selected = null; this.unloading = null; this.relocating = null; this.hover = null; }

  private onKey(e: KeyboardEvent): void {
    if (e.repeat) return;
    this.audio.unlock();
    if (e.key.toLowerCase() === 'o' && !this.shopOpen) { if (this.operations?.open) this.operations.close(); else this.operations?.show(); return; }
    if (this.operationsOpen) return;
    if (this.shopOpen) { if (e.key === 'Escape' || e.key.toLowerCase() === 'b') this.shop.close(); return; }
    // Enter: 명령 입력 창. 작전실·보급 상점이 열려 있을 때는 열지 않는다.
    if (e.key === 'Enter') { this.commandConsole?.open(); return; }
    if (e.key.toLowerCase() === 'b') { this.openShop(this.selected?.k === 'bunker' ? 'garrison' : this.selected ? 'army' : 'manage'); return; }
    if ((e.key.toLowerCase() === 'z' || e.key.toLowerCase() === 'x') && this.selected && this.selected.k !== 'bunker') {
      const skills = SKILL_KEYS.filter(key => SKILL_DEFS[key].unit === this.selected!.k);
      this.equipSkill(skills[e.key.toLowerCase() === 'z' ? 0 : 1]); return;
    }
    if (e.key.toLowerCase() === 't') { this.selectFaction('terran'); return; }
    if (e.key.toLowerCase() === 'r') { this.selectFaction('protoss'); return; }
    if (e.key >= '1' && e.key <= '9') this.chooseBuild(FACTION_TOWERS[this.faction][+e.key - 1], true);
    else if (e.key === 'Escape') this.cancelCommand();
    else if (e.key === ' ') this.startWave();
    else if (e.key === 'p' || e.key === 'P') this.togglePause();
    else if (e.key === 'u' || e.key === 'U') this.upgrade();
    else if (e.key === 's' || e.key === 'S') this.sell();
  }

  /** 내 목숨을 아이어에: 질럿은 전장에 1기까지만 둘 수 있다. */
  private buildLimited(k: TowerKey): boolean {
    return k === 'zealot' && hasAugment('aiur') && this.towers.filter(t => t.k === 'zealot').length >= AIUR_LIMIT;
  }

  private chooseBuild(k: TowerKey, force = false): void {
    if (this.buildLimited(k) && this.building === k) this.building = null;
    if (!allowedUnit(k, this.options.mode) || this.buildLimited(k)) return;
    if (this.over) return;
    this.faction = TOWER_DEFS[k].faction;
    this.building = (!force && this.building === k) ? null : k;
    this.selected = null; this.unloading = null; this.relocating = null;
  }

  private selectFaction(faction: Faction): void {
    if (this.over || this.options.mode === 'bunker' && faction !== 'terran') return;
    this.cancelCommand(); this.faction = faction;
    this.commandCard?.update(this.commands());
    this.operations?.update();
  }

  private togglePause(): void {
    if (this.over) return;
    this.paused = !this.paused;
    this.pauseTxt.setVisible(this.paused);
    this.pauseBtn.set(`${this.paused ? '재개' : '정지'}${this.kb(' [P]')}`);
  }

  private onMapClick(p: Phaser.Input.Pointer): void {
    if (this.over || this.shopOpen || this.operationsOpen) return;
    const cell = this.cellAt(p) ?? this.hoverAt(p); // 덤 땅은 hoverAt으로만 잡힌다
    if (!cell) return;
    const t = this.towers.find(t => !t.host && t.c === cell.c && t.r === cell.r);
    // 터치에는 호버가 없으므로, 첫 탭은 위치·사거리 미리보기만 하고 같은 칸을 다시 탭해야 확정한다.
    if (p.wasTouch && (this.relocating || this.unloading || (this.building && !t)) && (this.hover?.c !== cell.c || this.hover?.r !== cell.r)) {
      this.hover = cell;
      return;
    }
    if (cell.r >= ROWS) { if (this.relocating || this.unloading || this.building) this.banner('설치 불가 구역'); return; }
    if (this.relocating) { this.finishRelocate(cell.c, cell.r); if (p.wasTouch) this.hover = null; return; }
    if (this.unloading) { this.finishUnload(cell.c, cell.r); if (p.wasTouch) this.hover = null; return; }
    if (t) {
      this.selected = this.selected === t ? null : t; this.building = null;
    }
    else if (this.building) { this.placeTower(cell.c, cell.r); if (p.wasTouch) this.hover = null; }
    else this.selected = null;
  }

  // ---------- 타워 ----------
  private shopState(): ShopState {
    return { gold: this.gold, selectedId: this.selected?.id ?? null, mode: this.options.mode,
      units: this.towers.map(t => ({ id: t.id, k: t.k, lvl: t.lvl, skills: t.skills, c: t.c, r: t.r,
        stats: this.stats(t), nextStats: this.stats({ ...t, lvl: Math.min(maxUnitLevel(), t.lvl + 1) }),
        hostId: t.host?.id, passengers: t.passengers.map(p => p?.id ?? null) })) };
  }

  private openShop(tab: 'army' | 'garrison' | 'manage' = 'army'): void {
    if (this.over || this.shopOpen || this.operationsOpen) return;
    this.shopOpen = true; this.hover = null;
    this.shopInputEnabled = this.input.enabled;
    this.input.enabled = false;
    this.shop.open(tab);
  }

  private equipSkill(key: SkillKey, id?: string): boolean {
    const t = id === undefined ? this.selected : this.towers.find(t => t.id === id), skill = SKILL_DEFS[key];
    if (this.over || !t || !skill || skill.unit !== t.k || skillLocked(t.k) || this.gold < skillCost(key) || t.skills.length >= SKILL_SLOTS || t.skills.some(s => s.key === key)) return false;
    const cost = skillCost(key); this.gold -= cost; t.spent += cost;
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

  private stats(t: StatsUnit): TowerStats {
    const d: { dmg: number; range: number; rate: number; splash?: number; slow?: number } = TOWER_DEFS[t.k];
    const l = t.lvl - 1, base = levelStats(t.k, t.lvl);
    let aura = 1;
    if (t.x !== undefined && t.y !== undefined) {
      aura = vesselAuraMultiplier(this.towers.filter(ally => ally.id !== t.id && ally.k === 'support'
        && Math.hypot(ally.x - t.x!, ally.y - t.y!) <= this.supportRange(ally)).map(ally => ally.lvl));
    }
    const haste = (t.buffs ?? []).reduce((v, b) => v * b.haste, 1) * aura * (1 + this.bonuses.haste) * (hasBranch(t.branch, 'rapid') ? 1.4 : 1) * eliteBonus(this.armySize()) * this.resonance(t);
    const power = (t.buffs ?? []).reduce((v, b) => v * b.power, 1);
    return {
      // 증강의 병력 피해 배율까지 넣어 정보창·보급 상점의 공격력과 실제 피해가 같은 값이 되게 한다.
      dmg: this.cheatPower(base.dmg * power * (1 + this.bonuses.power) * (hasBranch(t.branch, 'power') ? 1.7 : 1)) * damageMultiplier(t.k, this.army()),
      range: this.supportRange(t) + (t.host ? BUNKER_RANGE_BONUS + (hasAugment('fortress') ? FORTRESS_RANGE : 0) : 0),
      rate: base.rate * (hasBranch(t.branch, 'power') ? 1.15 : 1) * (t.k === 'cannon' && hasAugment('siegeMode') ? 1.2 : 1) / haste,
      splash: d.splash ? d.splash * (1 + .1 * l) * (hasBranch(t.branch, 'rapid') ? 1.35 : 1) * this.splashAugment(t.k) : 0,
      slow: d.slow ? Math.max(.2, d.slow - .08 * l) : 0,
    };
  }
  /** 시즈 모드 확장(시즈 탱크 +30%)과 확장 격납고(리버 스캐럽 +40%)의 폭발 범위 배율. */
  private splashAugment(k: TowerKey): number {
    return k === 'cannon' && hasAugment('siegeMode') ? 1.3 : k === 'reaver' && hasAugment('hangar') ? 1.4 : 1;
  }
  /** power overwhelming: 입력 횟수만큼 공격력 2배씩, 단 올린 값은 10,000을 넘지 않는다(원래 더 높으면 그대로). */
  private cheatPower(dmg: number): number {
    return this.powerStacks ? Math.max(dmg, Math.min(dmg * 2 ** this.powerStacks, CHEAT_POWER_CAP)) : dmg;
  }
  private supportRange(t: StatsUnit): number {
    return levelStats(t.k, t.lvl).range + this.bonuses.range + highGroundRangeBonus(this.map, t.c ?? -1, t.r ?? -1) + (['support', 'observer'].includes(t.k) && t.branch ? SUPPORT_BRANCH_RANGE : 0)
      + (t.k === 'zealot' && hasAugment('aiur') ? AIUR_RANGE : 0) + (t.k === 'cannon' && hasAugment('siegeMode') ? SIEGE_RANGE : 0);
  }
  private upgradeCost(t: Tower): number { return unitUpgradeCost(t); }
  private sellValue(t: Tower): number { return Math.round(t.spent * sellRate()); }

  private cellFree(c: number, r: number): boolean {
    return c >= 0 && r >= 0 && c < COLS && r < ROWS && !this.map.pathCells.has(c + ',' + r)
      && !this.towers.some(t => !t.host && t.c === c && t.r === r);
  }

  private placeTower(c: number, r: number): void {
    const k = this.building;
    if (!k) return;
    const d = TOWER_DEFS[k];
    if (this.buildLimited(k)) { this.building = null; return; }
    if (!allowedUnit(k, this.options.mode) || !this.cellFree(c, r) || this.gold < placeCost(k)) return;
    this.runLaunched = true;
    this.gold -= placeCost(k);
    const t = this.createTower(k, c, r);
    this.moe?.say(t, 'deploy');
    this.floatText(t.x, t.y, d.name, '#c7dfaa');
    if (k === 'bunker') { this.building = null; this.selected = t; }
    else if (this.gold < placeCost(k) || this.buildLimited(k)) this.building = null;
  }

  private createTower(k: TowerKey, c: number, r: number): Tower {
    const x = (c + .5) * T, y = MAP_Y + (r + .5) * T;
    const base = this.add.image(x, y, themeTexture('base_' + k)).setDepth(5);
    const barrel = this.add.image(x, y, themeTexture('barrel_' + k)).setOrigin(.5).setDepth(6);
    const scale = UNIT_WORLD_SCALE[k] ?? 1;
    this.tweens.add({ targets: [base, barrel], scale: { from: 0, to: scale }, duration: 220, ease: 'Back.Out' });
    if (k === 'cruiser') this.tweens.add({ targets: barrel, y: y - 2, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    if (k === 'frost') this.tweens.add({ targets: barrel, alpha: { from: .72, to: 1 }, duration: 1100, yoyo: true, repeat: -1 });
    this.fxPlace.explode(8, x, y);
    const t: Tower = { id: String(++this.nextUnitId), k, c, r, x, y, lvl: 1, cd: 0, shotPort: 0, spent: placeCost(k), base, barrel, skills: [], buffs: [], passengers: Array(bunkerCapacity()).fill(null), target: 'first' };
    this.towers.push(t); this.armyMemo = undefined;
    this.runStats.units.push({ id: t.id, k, damage: 0, boss: 0, kills: 0 });
    if (!this.usedKinds.includes(k)) this.usedKinds.push(k);
    if (this.profile.skin !== 'standard') this.applySkin();
    this.audio.play('build');
    return t;
  }

  private boardingSlot(id: string, slot: number): Tower | undefined {
    if (this.over || !Number.isInteger(slot) || slot < 0 || slot >= bunkerCapacity()) return;
    return this.towers.find(t => t.id === id && t.k === 'bunker' && !t.passengers[slot]);
  }

  private recruit(id: string, slot: number, key: InfantryKey): boolean {
    const bunker = this.boardingSlot(id, slot);
    if (!bunker || !isInfantry(key) || this.gold < placeCost(key)) return false;
    this.gold -= placeCost(key);
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
    if (!this.over && t?.k === 'bunker') { this.applyOrder({ type: 'upgrade' }, { bunkerId: t.id }); return; }
    if (t) this.upgradeUnit(t.id);
  }

  private upgradeUnit(id: string): boolean {
    const t = this.towers.find(t => t.id === id);
    if (this.over || !t || t.k === 'bunker' || t.lvl >= maxUnitLevel() || this.gold < this.upgradeCost(t)) return false;
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
    this.sellTower(t);
  }

  private sellTower(t: Tower): void {
    this.gold += this.sellValue(t);
    this.floatText(t.x, t.y, '+' + this.sellValue(t), '#ffd54f');
    t.base.destroy(); t.barrel.destroy();
    if (t.host) t.host.passengers[t.host.passengers.indexOf(t)] = null;
    if (this.unloading === t) this.unloading = null;
    this.towers = this.towers.filter(x => x !== t); this.armyMemo = undefined;
    if (this.selected === t) this.selected = null;
  }

  // ---------- 웨이브 / 적 ----------
  private moeLead(): MoeActor {
    return this.selected ?? this.towers[(Math.max(1, this.wave) - 1) % Math.max(1, this.towers.length)]
      ?? { id: 'commander', k: 'marine', x: W / 2, y: MAP_Y + MAP_H / 2 };
  }

  private startWave(): void {
    if (this.over || this.paused || this.shopOpen || this.operationsOpen || this.pending.length || this.augmentOffer || this.waveActive || (!this.testMode && this.options.mode !== 'endless' && !this.continued && this.wave >= MAX_WAVE)) return;
    this.runLaunched = true; this.saveCheckpoint(false); this.cancelCommand();
    if (this.testMode) this.repeat++; else this.wave++;
    const w = this.wave, scope = this.testMode ? this.testScope : 'all';
    const q: (EnemyKey | 'amon')[] = wavePlan(w, scope);
    if (scope !== 'line' && amonDue(w, this.amonSince)) q.push('amon');
    // 폭풍의 눈: 웨이브마다 하이 템플러의 사이오닉 스톰 첫 2회를 대기 없이 쏜다.
    if (hasAugment('storm')) for (const t of this.towers) if (t.k === 'highTemplar') {
      t.stormFree = STORM_FREE_CASTS; const storm = t.skills.find(s => s.key === 'psionicStorm'); if (storm) storm.cd = 0;
    }
    this.waveStart = { kills: this.runStats.kills, lost: this.runStats.lost, seconds: this.runStats.seconds };
    this.spawnQ = q; this.spawnT = 0; this.waveActive = true;
    // 전시 채권: 웨이브를 시작할 때 보유 미네랄의 10%를 이자로 받는다(최대 100).
    const interest = bondInterest(this.gold);
    if (interest > 0) { this.gold += interest; this.opsNotice = `전시 채권 이자 +${interest} 미네랄`; }
    const boss = q.includes('boss') || q.includes('amon');
    this.moe?.start(w, boss, this.moeLead());
    this.banner(boss ? `웨이브 ${w} — ${bossPattern(w)}` : this.testMode && this.testScope === 'line' ? `웨이브 ${w} — 라인 테스트` : `웨이브 ${w}`);
    if (boss) this.audio.play('boss');
  }

  private enemyHp(type: EnemyKey, wave: number): number {
    const finalBoss = type === 'boss' && wave >= MAX_WAVE;
    return ENEMY_DEFS[type].hp * Math.pow(1.17, Math.min(100, wave) - 1) * (1 + Math.max(0, wave - 100) * .1) * DIFFICULTIES[this.options.difficulty].hp * (finalBoss ? FINAL_BOSS_HP_MULT : 1);
  }
  private bossShield(wave: number): number { return wave === 10 || wave >= 50 ? .18 : 0; }

  /** 아몬: 그 웨이브 보스의 80%. 보스가 없는 웨이브는 앞뒤 보스 체력의 기하 평균과 보호막 비율의 중간값을 쓴다. */
  private spawnAmon(): void {
    const w = this.wave, boss = w % 10 === 0;
    const hp = (boss ? this.enemyHp('boss', w) : Math.sqrt(this.enemyHp('boss', w - 5) * this.enemyHp('boss', w + 5))) * AMON_SCALE;
    const shield = boss ? this.bossShield(w) : (this.bossShield(w - 5) + this.bossShield(w + 5)) / 2;
    this.spawn('boss');
    const e = this.enemies[this.enemies.length - 1];
    Object.assign(e, { amon: true, hp, max: hp, shield: hp * shield, speed: e.speed * AMON_SCALE, reward: 0 });
    e.sprite.setTint(0xc79bff);
  }

  private spawn(type: EnemyKey, parent?: Enemy, child = false): void {
    const d = ENEMY_DEFS[type];
    const hp = this.enemyHp(type, this.wave);
    const route = parent?.route ?? this.map.routes[(this.waveSpawnIndex++) % this.map.routes.length];
    const scale = ENEMY_ART[type].size / ENEMY_FRAME_SIZE;
    const gait = this.enemies.length * .381966;
    const sprite = this.add.image(parent?.x ?? route[0].x, parent?.y ?? route[0].y, 'enemy_' + type, Math.floor(gait * ENEMY_FRAME_COUNT) % ENEMY_FRAME_COUNT).setDepth(8).setScale(scale);
    if (!parent) sprite.setRotation(Math.atan2(route[1].y - route[0].y, route[1].x - route[0].x));
    this.tweens.add({ targets: sprite, scale: { from: 0, to: scale }, duration: 200 });
    this.enemies.push({
      type, sprite, x: sprite.x, y: sprite.y, seg: parent?.seg ?? 1, hp, max: hp, speed: d.speed * DIFFICULTIES[this.options.difficulty].speed,
      slow: 1, slowT: 0, reward: child ? 0 : (d.reward + Math.floor(this.wave / 4)) * bountyMultiplier(type), r: d.r,
      route, shield: type === 'boss' ? hp * this.bossShield(this.wave) : 0, pulse: type === 'boss' ? 8 : 2, age: 0, spawned: child,
      stunT: 0, burnT: 0, burnDps: 0, vulnerableT: 0, gait,
    });
  }

  private killEnemy(e: Enemy, source?: string): void {
    if (e.dead) return;
    this.damageNumbers?.flush(e);
    e.dead = true;
    if (this.options.mode !== 'budget') this.gold += e.reward;
    this.runStats.kills++;
    const record = this.runStats.units.find(u => u.id === source); if (record) record.kills++;
    this.moe?.kill(this.runStats.seconds, this.towers.find(t => t.id === source) ?? this.moeLead(), e.type === 'boss');
    if (e.type === 'splitter' && !e.spawned) { this.spawn('runner', e, true); this.spawn('runner', e, true); }
    this.fxDie.explode(e.type === 'boss' ? 40 : 10, e.x, e.y);
    if (this.options.mode !== 'budget' && e.reward > 0) this.floatText(e.x + 8, e.y + 10, '+' + e.reward, '#ffd54f');
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
    if (!this.paused && !this.over && !this.shopOpen && !this.operationsOpen) {
      this.stepAcc += elapsed;
      while (this.stepAcc >= STEP_SEC && !this.over && !this.operationsOpen) {
        for (let i = 0; i < this.speed && !this.over && !this.operationsOpen; i++) this.step(STEP_SEC);
        this.stepAcc -= STEP_SEC;
      }
    } else this.stepAcc = 0;
    // Let the last impact settle after victory/defeat, without advancing the battle itself.
    if (this.over && !this.paused && !this.shopOpen && !this.operationsOpen) this.combatEffects?.update(Math.min(.05, elapsed));
    this.combatEffects?.render();
    this.damageNumbers?.update(this.paused || this.shopOpen || this.operationsOpen ? 0 : Math.min(.05, elapsed));
    this.moe?.update(Math.min(.1, elapsed), this.paused || this.shopOpen || this.operationsOpen || this.over,
      this.runStats.seconds, this.waveActive, this.towers.map(t => ({ id: t.id, k: t.k,
        x: ((t.host ?? t).x - this.mapCx) * this.mapZoom + W / 2,
        y: ((t.host ?? t).y - this.mapCy) * this.mapZoom + VIEW_H / 2 })));
    this.advanceTutorial();
    this.opsRefresh += elapsed;
    if (this.opsRefresh >= .3) { this.operations?.update(); this.opsRefresh = 0; }
    this.saveClock += elapsed;
    if (this.saveClock >= 2) { this.saveCheckpoint(false); this.saveClock = 0; }
    this.refreshUI();
    this.drawOverlay();
  }

  private step(dt: number): void {
    this.combatEffects?.update(dt);
    if (this.waveActive) {
      this.runStats.seconds += dt;
      for (const key of Object.keys(COMMANDERS) as CommanderKey[]) this.commander[key] = Math.max(0, this.commander[key] - dt);
      // 폭격·교란은 전장에 적이 있을 때만 자동 발동해 빈 화면에 낭비하지 않는다.
      for (const key of this.autoCommander) if (this.commander[key] <= 0 && (key === 'supply' || this.enemies.some(e => !e.dead))) this.useCommander(key);
      // 궤도 연사: 첫 폭격 0.8초 뒤 같은 폭격이 한 번 더 떨어진다.
      if (this.strikeEcho > 0 && (this.strikeEcho -= dt) <= 0) { this.orbitalStrike(); this.audio.play('skill'); }
    }
    if (this.spawnQ.length) {
      this.spawnT -= dt;
      if (this.spawnT <= 0) {
        const next = this.spawnQ.shift()!;
        if (next === 'amon') this.spawnAmon(); else this.spawn(next);
        this.spawnT = Math.max(.35, .9 - this.wave * .02);
      }
    }

    for (const e of this.enemies) {
      if (e.dead) continue;
      this.enemyAct(e, dt);
      e.vulnerableT = Math.max(0, e.vulnerableT - dt);
      if (e.observations) {
        for (const mark of e.observations) mark.left = Math.max(0, mark.left - dt);
        e.observations = e.observations.filter(mark => mark.left > 0);
      }
      if (e.burnT > 0) {
        this.damageEnemy(e, e.burnDps * Math.min(dt, e.burnT), 'burn', e.burnSource);
        e.burnT = Math.max(0, e.burnT - dt);
        if (e.dead) continue;
      }
      const stunned = e.stunT > 0;
      e.stunT = Math.max(0, e.stunT - dt);
      e.slowT = Math.max(0, e.slowT - dt);
      if (!e.slowT) e.slow = 1;
      const route = e.route ?? this.map.waypoints;
      const accelerated = e.type === 'boss' && ((this.wave === 40 && (e.age ?? 0) % 10 >= 7) || (e.hasteT ?? 0) > 0);
      let mv = stunned ? 0 : e.speed * e.slow * dt * (accelerated ? 1.8 : 1);
      const travel = mv;
      while (mv > 0 && e.seg < route.length) {
        const tg = route[e.seg], dx = tg.x - e.x, dy = tg.y - e.y, dist = Math.hypot(dx, dy);
        if (dist <= mv) { e.x = tg.x; e.y = tg.y; e.seg++; mv -= dist; }
        else { e.x += dx / dist * mv; e.y += dy / dist * mv; mv = 0; }
      }
      e.sprite.setPosition(e.x, e.y);
      e.gait = ((e.gait ?? 0) + (travel - mv) / ENEMY_ART[e.type].stride) % 1;
      e.sprite.setFrame(Math.floor(e.gait * ENEMY_FRAME_COUNT));
      if (e.seg < route.length) e.sprite.setRotation(Math.atan2(route[e.seg].y - e.y, route[e.seg].x - e.x));
      if (stunned) e.sprite.setTint(0xb7f5ff);
      else if (e.burnT > 0) e.sprite.setTint(0xffab69);
      else if (weaknessBonus(e) > 0) e.sprite.setTint(0xb8a0ff);
      else if (e.slow < 1) e.sprite.setTint(0x81d4fa); else if (accelerated) e.sprite.setTint(0xffb76f); else if (e.amon) e.sprite.setTint(0xc79bff); else e.sprite.clearTint();
      if (e.seg >= route.length) {
        e.dead = true; e.sprite.destroy();
        const loss = e.amon ? Math.min(this.lives, AMON_LEAK) : e.type === 'boss' ? this.lives : 1;
        this.runStats.lost += loss; this.lives -= loss;
        if (e.type === 'boss' && !e.amon) this.bossLeaked = true;
        this.audio.play('warning');
        this.moe?.say(this.moeLead(), 'danger');
        this.shakeAll(150, .006);
        this.uiCam.flash(120, 255, 60, 60);
      }
    }

    for (const t of this.towers) this.towerAct(t, dt);

    for (const field of this.fields) {
      field.left -= dt; field.tick -= dt;
      if (field.tick <= 0) {
        field.tick += .5;
        for (const e of this.enemies) if (!e.dead && Math.hypot(e.x - field.x, e.y - field.y) <= field.radius) this.damageEnemy(e, field.dmg, 'skill', field.source);
      }
    }
    this.fields = this.fields.filter(f => f.left > 0);

    for (const p of this.projs) {
      // Launched interceptors keep fighting after a kill, following their carrier's orders.
      if (p.k === 'carrier' && p.tgt.dead) {
        const carrier = this.towers.find(t => t.id === p.source);
        const next = carrier ? this.findTarget(carrier) : null;
        if (next) p.tgt = next;
      }
      const e = p.tgt;
      if (e.dead) { p.dead = true; this.combatEffects?.forget(p.s); p.s.destroy(); continue; }
      const dx = e.x - p.x, dy = e.y - p.y, dist = Math.hypot(dx, dy), mv = 420 * dt;
      if (dist <= mv + e.r) { this.hit(p); p.dead = true; this.combatEffects?.forget(p.s); p.s.destroy(); }
      else {
        const from = { x: p.x, y: p.y };
        p.x += dx / dist * mv; p.y += dy / dist * mv;
        p.s.setPosition(p.x, p.y).setRotation(Math.atan2(dy, dx));
        this.combatEffects?.move(p.s, from, p, e);
      }
    }
    this.projs = this.projs.filter(p => !p.dead);
    this.enemies = this.enemies.filter(e => !e.dead);

    if (this.waveActive && !this.spawnQ.length && !this.enemies.length && this.lives > 0) {
      this.waveActive = false;
      this.recordWave();
      if (this.wave >= MAX_WAVE && !this.testMode && this.options.mode !== 'endless' && !this.continued) this.endGame(true);
      else this.completeWave();
    }
    if (this.lives <= 0) this.endGame(false);
  }

  private completeWave(): void {
    const bonus = this.options.mode === 'budget' ? 0 : Math.round((CLEAR_BONUS_BASE + this.wave * CLEAR_BONUS_PER_WAVE) * clearBonusMultiplier());
    this.gold += bonus;
    this.banner(`구역 확보 · +${bonus} 미네랄`);
    this.audio.play('clear');
    this.moe?.clear(this.moeLead());
    if (!this.testMode && this.wave % 5 === 0 && this.rewarded < this.wave) {
      this.pending = rewardChoices(this.options.mode); this.opsNotice = '';
    }
    if (!this.testMode && this.options.mode === 'augment' && AUGMENT_WAVES.includes(this.wave) && !this.augmentOffer) this.offerAugments();
    if (this.pending.length) this.operations?.show('reward');
    else if (this.augmentOffer) this.operations?.show('augment');
    this.saveCheckpoint(false);
  }

  private continuePlaying(): void {
    if (!this.over || !this.victory || this.testMode || this.continued) return;
    this.over = false; this.victory = false; this.continued = true;
    this.closeResult?.(); this.closeResult = undefined;
    this.stopIdleSleep?.(); this.stopIdleSleep = undefined;
    this.paused = false; this.stepAcc = 0; this.lastTick = performance.now();
    this.runLaunched = true;
    this.completeWave();
    this.operations?.update();
  }

  private enemyAct(e: Enemy, dt: number): void {
    e.hasteT = Math.max(0, (e.hasteT ?? 0) - dt);
    e.age = (e.age ?? 0) + dt; e.pulse = (e.pulse ?? 2) - dt;
    if (e.pulse > 0 || e.stunT > 0) return;
    if (e.type === 'boss') {
      e.pulse = 8;
      const phase = this.wave >= 50 ? Math.floor(e.age / 8) % 3 : Math.floor(this.wave / 10) - 1;
      if (phase === 0) { e.shield = Math.max(e.shield ?? 0, e.max * .18 * (hasAugment('crownHunter') ? .5 : 1)); this.skillRing(e.x, e.y, 40, 0x8ab6ff); }
      if (phase === 1) { this.spawn('grunt', e, true); this.spawn('grunt', e, true); this.spawn('medic', e, true); }
      if (phase === 2) {
        if (this.wave >= 50) { e.hasteT = 4; this.skillRing(e.x, e.y, 40, 0xffb76f); }
        else { this.spawn('runner', e, true); this.spawn('runner', e, true); this.spawn('runner', e, true); }
      }
    } else if (e.type === 'medic' || e.type === 'shielder') {
      const heal = e.type === 'medic'; e.pulse = heal ? 2 : 3;
      for (const ally of this.enemies) if (!ally.dead && Math.hypot(ally.x - e.x, ally.y - e.y) <= (heal ? 100 : 95)) {
        if (heal) ally.hp = Math.min(ally.max, ally.hp + ally.max * .05);
        else ally.shield = Math.max(ally.shield ?? 0, ally.max * .08);
      }
      this.skillRing(e.x, e.y, heal ? 100 : 95, heal ? 0x76d6a5 : 0xb596db);
    }
  }

  private towerAct(t: Tower, dt: number): void {
    if (t.k === 'bunker') return;
    for (const buff of t.buffs) buff.left -= dt;
    t.buffs = t.buffs.filter(b => b.left > 0);
    for (const skill of t.skills) skill.cd = Math.max(0, skill.cd - dt);
    t.cd = Math.max(0, t.cd - dt);
    if (t.k === 'support') {
      if (t.cd > 0) return;
      const target = this.findTarget(t, e => (e.shield ?? 0) > 0);
      if (!target) return;
      for (const e of this.enemies) {
        if (e.dead || (e.shield ?? 0) <= 0 || Math.hypot(e.x - target.x, e.y - target.y) > VESSEL_EMP.radius) continue;
        e.shield = (e.shield ?? 0) * (1 - VESSEL_EMP.shieldFraction);
      }
      t.cd = VESSEL_EMP.cooldown;
      this.skillBeam(t, target, 0x81ceeb, 3);
      this.skillRing(target.x, target.y, VESSEL_EMP.radius, 0x81ceeb);
      this.audio.play('skill');
      return;
    }
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
    if (t.k === 'observer') {
      if (t.cd <= 0) {
        best.observations ??= [];
        const own = best.observations.find(mark => mark.source === t.id);
        if (own) own.left = OBSERVATION_DURATION;
        else best.observations.push({ source: t.id, left: OBSERVATION_DURATION });
        t.cd = this.stats(t).rate;
        this.skillBeam(t, best, 0xc4a1ff);
      }
      return;
    }
    for (const skill of skillLocked(t.k) ? [] : t.skills) {
      if (skill.cd > 0) continue;
      if (best.dead) best = this.findTarget(t);
      if (!best) break;
      t.barrel.rotation = ['frost', 'sniper', 'templar', 'highTemplar'].includes(t.k) ? 0 : Math.atan2(best.y - t.y, best.x - t.x);
      this.autoSkill(t, skill.key, best);
      const free = skill.key === 'psionicStorm' && (t.stormFree ?? 0) > 0 ? --t.stormFree! : -1;
      skill.cd = free > 0 ? .5 : SKILL_DEFS[skill.key].cooldown;
    }
    if (best?.dead) best = this.findTarget(t);
    if (!best) return;
    const st = this.stats(t);
    t.barrel.rotation = ['frost', 'sniper', 'templar', 'highTemplar'].includes(t.k) ? 0 : Math.atan2(best.y - t.y, best.x - t.x);
    if (t.cd > 0) return;
    t.cd = st.rate;
    if (t.k === 'sniper') { t.charge = { target: best, left: DRAGOON_CHARGE_TIME }; return; }
    this.fire(t, best, st);
  }

  private fire(t: Tower, best: Enemy, st: TowerStats): void {
    this.audio.play(t.k);
    const d = TOWER_DEFS[t.k];
    const angle = Math.atan2(best.y - t.y, best.x - t.x);
    if (t.k === 'zealot' && hasAugment('aiur')) {
      // 내 목숨을 아이어에: 사거리 안의 모든 적을 사이오닉 검으로 벤다.
      this.skillRing(t.x, t.y, st.range, d.proj);
      for (const e of [...this.enemies]) if (!e.dead && Math.hypot(e.x - t.x, e.y - t.y) <= st.range) this.damageEnemy(e, st.dmg, 'normal', t.id);
      return;
    }
    if (t.k === 'cruiser' && hasAugment('yamato')) { this.yamatoLine(t, angle, st); return; }
    if (t.k === 'zealot') {
      for (const offset of [-7, 7]) this.skillBeam({ x: t.x - Math.sin(angle) * offset, y: t.y + Math.cos(angle) * offset }, best, d.proj, 3);
      this.damageEnemy(best, st.dmg, 'normal', t.id); return;
    }
    if (t.k === 'highTemplar') {
      this.fields.push({ x: best.x, y: best.y, radius: st.splash, left: 2, tick: .5, dmg: st.dmg, color: d.proj, source: t.id });
      this.skillRing(best.x, best.y, st.splash, d.proj); return;
    }
    if (t.k === 'carrier' || t.k === 'goliath' || t.k === 'scout') {
      const count = t.k === 'carrier' ? attackCount(t.k) + (hasAugment('hangar') ? HANGAR_INTERCEPTORS : 0) : 2;
      for (let i = 0; i < count; i++) {
        const offset = (i - (count - 1) / 2) * (t.k === 'carrier' ? 6 : 9);
        const x = t.x + Math.cos(angle) * 18 - Math.sin(angle) * offset;
        const y = t.y + Math.sin(angle) * 18 + Math.cos(angle) * offset;
        const s = this.add.image(x, y, 'shot_' + t.k).setDepth(9).setRotation(angle);
        this.projs.push({ s, x, y, tgt: best, k: t.k, st: { ...st, dmg: st.dmg / (t.k === 'carrier' ? 1 : count) }, source: t.id });
      }
      return;
    }
    const reach = t.host ? BUNKER_BARREL_LENGTH : t.k === 'cruiser' ? 29 * (UNIT_WORLD_SCALE.cruiser ?? 1) : t.k === 'cannon' ? SIEGE_MUZZLE.x * (UNIT_WORLD_SCALE.cannon ?? 1) : t.k === 'marine' ? 31 : t.k === 'firebat' ? FIREBAT_MUZZLES[0].x : t.k === 'arrow' ? 15 : 8;
    const port = t.k === 'arrow' ? TURRET_LAUNCH_PORTS[t.shotPort++ % TURRET_LAUNCH_PORTS.length] : null;
    const muzzleX = t.k === 'templar' ? t.x + 18 : t.k === 'sniper' ? t.x + DRAGOON_EMITTER.x : port ? t.x + port.x * Math.cos(angle) - port.y * Math.sin(angle) : t.k === 'frost' ? t.x : t.x + Math.cos(angle) * reach;
    const muzzleY = t.k === 'templar' ? t.y - 8 : t.k === 'sniper' ? t.y + DRAGOON_EMITTER.y : port ? t.y + port.x * Math.sin(angle) + port.y * Math.cos(angle) : t.k === 'frost' ? t.y - 18 : t.y + Math.sin(angle) * reach;
    const flightAngle = t.k === 'sniper' || t.k === 'templar' ? Math.atan2(best.y - muzzleY, best.x - muzzleX) : angle;
    const s = this.add.image(muzzleX, muzzleY, 'shot_' + t.k).setDepth(9).setRotation(flightAngle);
    this.projs.push({ s, x: muzzleX, y: muzzleY, tgt: best, k: t.k, st, source: t.id });
    if (hasWeaponEffects(t.k)) {
      this.combatEffects?.launch(t.k, { x: muzzleX, y: muzzleY }, flightAngle, s, t);
      return;
    }
    if (t.host) {
      const scale = t.k === 'firebat' ? 1 : .6;
      const flame = this.add.image(muzzleX, muzzleY, 'bunker_muzzle').setOrigin(0, .5).setRotation(angle).setScale(scale).setDepth(12);
      this.tweens.add({ targets: flame, scaleX: scale * 1.3, scaleY: scale * .65, alpha: 0,
        duration: t.k === 'firebat' ? 150 : 90, onComplete: () => flame.destroy() });
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
    if (t.k === 'frost' || t.k === 'templar') {
      this.tweens.add({ targets: t.barrel, scale: { from: 1.1, to: 1 }, duration: 220 });
    } else if (t.k === 'cruiser' || t.k === 'sniper') {
      this.tweens.add({ targets: t.barrel, alpha: { from: .88, to: 1 }, duration: 140 });
    } else {
      this.tweens.add({ targets: t.barrel, scale: { from: .94, to: 1 }, duration: 100 });
    }
  }

  /** 야마토 프로토콜: 사거리 끝까지, 폭 0.7칸 안의 일직선상 모든 적에게 피해. 보스는 2배, 5발째마다 공격력 1200%. */
  private yamatoLine(t: Tower, angle: number, st: TowerStats): void {
    t.yamatoShots = ((t.yamatoShots ?? 0) % YAMATO_CHARGE_EVERY) + 1;
    const charged = t.yamatoShots === YAMATO_CHARGE_EVERY, power = charged ? YAMATO_CHARGE_POWER : 1;
    const dx = Math.cos(angle), dy = Math.sin(angle), half = YAMATO_WIDTH * T / 2, reach = 29 * (UNIT_WORLD_SCALE.cruiser ?? 1);
    const bow = { x: t.x + dx * reach, y: t.y + dy * reach }, end = { x: t.x + dx * st.range, y: t.y + dy * st.range };
    const hits: Enemy[] = [];
    for (const e of [...this.enemies]) {
      if (e.dead) continue;
      const along = (e.x - t.x) * dx + (e.y - t.y) * dy, across = Math.abs((e.x - t.x) * dy - (e.y - t.y) * dx);
      if (along >= 0 && along <= st.range && across <= half) { hits.push(e); this.damageEnemy(e, st.dmg * power * (e.type === 'boss' ? 2 : 1), 'skill', t.id); }
    }
    if (charged) { this.yamatoChargeFx(t, bow, end, half, hits); return; }
    const core = this.add.circle(bow.x, bow.y, 6, 0xffda8a, .85).setStrokeStyle(2, 0xfff2c8).setDepth(12);
    this.tweens.add({ targets: core, scale: 2.2, alpha: 0, duration: 300, onComplete: () => core.destroy() });
    this.skillBeam(bow, end, SKILL_DEFS.yamato.color, half * 2);
  }

  /** 5발째 강화 포격: 주황 포선 대신 붉은 외광·흰 심지의 3겹 포선, 포구로 빨려드는 충전 고리, 명중마다 충격파, 끝점 대폭발과 화면 흔들림. */
  private yamatoChargeFx(t: Tower, bow: Point, end: Point, half: number, hits: Enemy[]): void {
    const gather = this.add.circle(bow.x, bow.y, 24, 0xff6a4a, .25).setStrokeStyle(3, 0xffc0a0).setDepth(12);
    this.tweens.add({ targets: gather, scale: { from: 1.6, to: .2 }, alpha: { from: .9, to: 0 }, duration: 260, onComplete: () => gather.destroy() });
    const flash = this.add.circle(bow.x, bow.y, 12, 0xffffff, .95).setStrokeStyle(3, 0xff7a5a).setDepth(13);
    this.tweens.add({ targets: flash, scale: 4, alpha: 0, duration: 520, onComplete: () => flash.destroy() });
    this.skillBeam(bow, end, 0xff4b3a, half * 4);
    this.skillBeam(bow, end, 0xffe2b0, half * 1.6);
    this.skillBeam(bow, end, 0xffffff, 3);
    for (const e of hits) this.skillRing(e.x, e.y, 34, 0xff6a4a);
    this.skillRing(end.x, end.y, 64, 0xffb681);
    this.fxBoom.explode(32, end.x, end.y);
    this.floatText(t.x, t.y - 18, '야마토 포', '#ff9a7a');
    this.shakeAll(160, .005);
    this.audio.play('skill');
  }

  private findTarget(t: Tower, eligible: (enemy: Enemy) => boolean = () => true): Enemy | null {
    const range = this.stats(t).range;
    let best: Enemy | null = null, bp = -Infinity, bestObservationRank = Infinity;
    for (const e of this.enemies) {
      if (e.dead || Math.hypot(e.x - t.x, e.y - t.y) > range || !eligible(e)) continue;
      const route = e.route ?? this.map.waypoints, nx = route[Math.min(e.seg, route.length - 1)];
      let remaining = Math.hypot(nx.x - e.x, nx.y - e.y);
      for (let i = e.seg; i < route.length - 1; i++) remaining += Math.hypot(route[i + 1].x - route[i].x, route[i + 1].y - route[i].y);
      const p = t.target === 'strong' ? e.hp : t.target === 'weak' ? -e.hp : t.target === 'boss' ? (e.type === 'boss' ? 1e9 : 0) - remaining : -remaining;
      // Spread first, then add a distinct observer's analysis before refreshing our own.
      const rank = t.k !== 'observer' ? 0 : weaknessBonus(e) === 0 ? -1
        : (e.observations?.some(mark => mark.source === t.id && mark.left > 0) ? OBSERVATION_BONUSES.length + 1 : 0)
          + Math.min(observationCount(e), OBSERVATION_BONUSES.length);
      if (rank < bestObservationRank || rank === bestObservationRank && p > bp) {
        bestObservationRank = rank; bp = p; best = e;
      }
    }
    return best;
  }

  private damageEnemy(e: Enemy, dmg: number, kind: DamageKind = 'normal', source?: string): void {
    if (e.dead || !Number.isFinite(dmg) || dmg <= 0) return;
    // 증강의 피해 배율은 병력이 주는 기본 공격·스킬·지속 피해에 모두 적용한다(사령관 지원 제외).
    // 병력 쪽 배율(인플레이션·물량 공세 등)은 stats().dmg에 이미 들어 있고, 여기서는 맞는 적에 따른 배율(보스·약점 분석)만 곱한다.
    const unit = source && source !== 'commander' ? this.towers.find(t => t.id === source) : undefined;
    const amount = dmg * (1 + weaknessBonus(e)) * (unit ? (e.type === 'boss' ? bossDamageMultiplier() : 1) * this.analysisBonus(e) : 1);
    const absorbed = Math.min(e.shield ?? 0, amount);
    e.shield = Math.max(0, (e.shield ?? 0) - absorbed);
    const dealt = Math.min(e.hp, amount - absorbed);
    e.hp -= dealt;
    this.runStats.damage += dealt;
    const record = this.runStats.units.find(u => u.id === source); if (record) record.damage += dealt;
    if (e.type === 'boss') { this.runStats.bossDamage += dealt; if (record) record.boss += dealt; }
    if (source === 'commander') this.runStats.commanderDamage += dealt;
    this.damageNumbers?.hit(e, amount - absorbed, kind);
    if (e.hp <= 0) this.killEnemy(e, source);
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
    this.moe?.say(t, 'skill');
    this.audio.play('skill');
    const d = SKILL_DEFS[key], st = this.stats(t);
    const nearby = this.enemies.filter(e => !e.dead && Math.hypot(e.x - t.x, e.y - t.y) <= st.range)
      .sort((a, b) => Math.hypot(a.x - target.x, a.y - target.y) - Math.hypot(b.x - target.x, b.y - target.y));
    const burn = (e: Enemy, factor: number, seconds: number) => {
      if (e.burnT <= 0 || e.burnDps <= st.dmg * factor) { e.burnDps = st.dmg * factor; e.burnSource = t.id; }
      e.burnT = Math.max(e.burnT, seconds);
    };
    const area = (x: number, y: number, radius: number, factor: number, status?: (e: Enemy) => void) => {
      this.skillRing(x, y, radius, d.color);
      for (const e of this.enemies) {
        if (e.dead || Math.hypot(e.x - x, e.y - y) > radius) continue;
        status?.(e); this.damageEnemy(e, st.dmg * factor, 'skill', t.id);
      }
    };
    this.floatText(t.x, t.y - 12, d.name, '#' + d.color.toString(16).padStart(6, '0'));
    switch (key) {
      case 'barrage':
        for (const e of nearby.slice(0, 4)) { this.skillBeam(t, e, d.color); this.damageEnemy(e, st.dmg * 2, 'skill', t.id); }
        break;
      case 'overdrive': t.buffs.push({ left: 4, haste: 2, power: 1 }); this.skillRing(t.x, t.y, 35, d.color); break;
      case 'siege': area(target.x, target.y, 90, 3.2); this.fxBoom.explode(24, target.x, target.y); break;
      case 'shrapnel': area(target.x, target.y, 75, 2.2, e => { e.slow = Math.min(e.slow, .4); e.slowT = Math.max(e.slowT, 3); }); break;
      case 'freeze': area(target.x, target.y, 75, 0, e => { e.stunT = Math.max(e.stunT, e.type === 'boss' ? .6 : 2); }); break;
      case 'nova': area(t.x, t.y, 135, 5, e => { e.slow = Math.min(e.slow, .35); e.slowT = Math.max(e.slowT, 4); }); break;
      case 'plasma':
        this.skillBeam({ x: t.x + DRAGOON_EMITTER.x, y: t.y + DRAGOON_EMITTER.y }, target, d.color, 4);
        this.damageEnemy(target, st.dmg * 2, 'skill', t.id); target.vulnerableT = 5;
        break;
      case 'chain': {
        let previous = { x: t.x + DRAGOON_EMITTER.x, y: t.y + DRAGOON_EMITTER.y };
        nearby.slice(0, 5).forEach((e, i) => { this.skillBeam(previous, e, d.color, 2); this.damageEnemy(e, st.dmg * 1.8 * (1 - .12 * i), 'skill', t.id); previous = e; });
        break;
      }
      case 'stim': t.buffs.push({ left: 6, haste: 1.8, power: 1 }); this.skillRing(t.x, t.y, 35, d.color); break;
      case 'burst': this.skillBeam(t, target, d.color, 3); this.damageEnemy(target, st.dmg * 4.5, 'skill', t.id); break;
      case 'inferno': area(target.x, target.y, 70, 2.5, e => burn(e, 1, 4)); this.fxBoom.explode(20, target.x, target.y); break;
      case 'ignite':
        for (const e of nearby.slice(0, 3)) { burn(e, 1.5, 6); this.skillBeam(t, e, d.color); }
        break;
      case 'storm':
        this.fields.push({ x: target.x, y: target.y, radius: 85, left: 4, tick: .5, dmg: st.dmg * .9, color: d.color, source: t.id });
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
        const victim = nearby.reduce((best, e) => {
          if ((e.type === 'boss') !== (best.type === 'boss')) return e.type === 'boss' ? e : best;
          return e.hp > best.hp ? e : best;
        }, target);
        const angle = Math.atan2(victim.y - t.y, victim.x - t.x), reach = 29 * (UNIT_WORLD_SCALE.cruiser ?? 1);
        const bow = { x: t.x + Math.cos(angle) * reach, y: t.y + Math.sin(angle) * reach };
        const core = this.add.circle(bow.x, bow.y, 6, 0xffda8a, .85).setStrokeStyle(2, 0xfff2c8).setDepth(12);
        this.tweens.add({ targets: core, scale: 2.5, alpha: 0, duration: 360, onComplete: () => core.destroy() });
        this.skillBeam(bow, victim, d.color, 9); this.skillRing(victim.x, victim.y, 55, d.color);
        this.damageEnemy(victim, st.dmg * 12, 'skill', t.id); this.fxBoom.explode(30, victim.x, victim.y);
        break;
      }
      case 'bombard':
        for (const e of nearby.slice(0, 3)) area(e.x, e.y, 70, 3);
        break;
      case 'lockdown':
        target.stunT = Math.max(target.stunT, target.type === 'boss' ? .8 : 3);
        this.skillBeam(t, target, d.color); this.damageEnemy(target, st.dmg * 2, 'skill', t.id); break;
      case 'c10':
        this.skillBeam(t, target, d.color, 4); this.damageEnemy(target, st.dmg * 5, 'skill', t.id); break;
      case 'hellfire':
        for (const e of nearby.slice(0, 3)) area(e.x, e.y, 50, 2.2);
        break;
      case 'autocannon': case 'photonDrive':
        t.buffs.push({ left: 5, haste: 1.8, power: 1 }); this.skillRing(t.x, t.y, 35, d.color); break;
      case 'psiBlades':
        this.skillBeam(t, target, d.color, 5); this.damageEnemy(target, st.dmg * 4, 'skill', t.id); break;
      case 'zeal':
        t.buffs.push({ left: 5, haste: 1.7, power: 1.2 }); this.skillRing(t.x, t.y, 35, d.color); break;
      case 'psionicStorm':
        this.fields.push({ x: target.x, y: target.y, radius: 95, left: 4, tick: .5, dmg: st.dmg * 1.4, color: d.color, source: t.id });
        this.skillRing(target.x, target.y, 95, d.color); break;
      case 'khaydarin':
        t.buffs.push({ left: 6, haste: 1.3, power: 1.5 }); this.skillRing(t.x, t.y, 35, d.color); break;
      case 'scarab': area(target.x, target.y, 110 * this.splashAugment('reaver'), 2.8); this.fxBoom.explode(24, target.x, target.y); break;
      case 'scarabUpgrade':
        t.buffs.push({ left: 6, haste: 1, power: 1.6 }); this.skillRing(t.x, t.y, 35, d.color); break;
      case 'scoutVolley':
        for (const e of nearby.slice(0, 3)) { this.skillBeam(t, e, d.color); this.damageEnemy(e, st.dmg * 2.5, 'skill', t.id); }
        break;
      case 'interceptors': {
        let next: Enemy | null = target;
        for (let i = 0; i < 8; i++) {
          if (next.dead) next = this.findTarget(t);
          if (!next) break;
          this.skillBeam({ x: t.x, y: t.y + (i - 3.5) * 4 }, next, d.color);
          this.damageEnemy(next, st.dmg * 2, 'skill', t.id);
        }
        break;
      }
      case 'carrierCapacity':
        t.buffs.push({ left: 6, haste: 2, power: 1 }); this.skillRing(t.x, t.y, 45, d.color); break;
    }
  }

  private hit(p: Projectile): void {
    const e = p.tgt, st = p.st;
    const enhanced = hasWeaponEffects(p.k);
    if (enhanced) {
      this.combatEffects?.impact(p.k, e, p, st.splash);
      this.audio.impact(p.k);
    }
    if (st.splash) {
      if (!enhanced && p.k === 'templar') this.archonBurst(e.x, e.y, st.splash);
      else if (!enhanced) {
        this.fxBoom.explode(14, e.x, e.y);
        const ring = this.add.circle(e.x, e.y, 6, 0xff8a65, .3).setStrokeStyle(2, 0xff8a65).setDepth(21);
        this.tweens.add({ targets: ring, scale: st.splash / 6, alpha: 0, duration: 300, onComplete: () => ring.destroy() });
      }
      for (const o of this.enemies) {
        if (o.dead || Math.hypot(o.x - e.x, o.y - e.y) > st.splash) continue;
        if (enhanced) this.combatEffects?.hitTarget(p.k, o, p);
        this.damageEnemy(o, st.dmg, 'normal', p.source);
      }
    } else {
      if (enhanced) this.combatEffects?.hitTarget(p.k, e, p);
      this.damageEnemy(e, st.dmg, 'normal', p.source);
    }
    if (st.slow && !e.dead) {
      e.slow = Math.min(e.slow, st.slow); e.slowT = Math.max(e.slowT, 2);
      this.fxFrost.explode(4, e.x, e.y);
    }
  }

  private drawOverlay(): void {
    const g = this.gfx;
    g.clear();
    const skinColor = this.profile.skin === 'gold' ? 0xffdb85 : this.profile.skin === 'ion' ? 0x9bcfff : 0x91bd7a;
    const gate = this.map.waypoints[this.map.waypoints.length - 1];
    g.lineStyle(3, skinColor, .9).strokeRect(W - 35, gate.y - 29, 26, 58);
    if (this.relocating && this.hover) {
      const cell = this.hover;
      g.lineStyle(2, this.cellFree(cell.c, cell.r) ? 0xc0ec94 : 0xe38670, .9).strokeRect(cell.c * T + 2, MAP_Y + cell.r * T + 2, T - 4, T - 4);
    }
    if (this.selected && ['support', 'observer'].includes(this.selected.k)) g.lineStyle(1, 0x9fd9bf, .45).strokeCircle(this.selected.x, this.selected.y, this.supportRange(this.selected));
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
      const d = TOWER_DEFS[preview], ok = this.cellFree(h.c, h.r) && (!!this.unloading || this.gold >= placeCost(preview) && !this.buildLimited(preview));
      const highGround = highGroundRangeBonus(this.map, h.c, h.r);
      const color = ok ? highGround ? 0xf3c77e : 0xa9e875 : 0xe37962;
      const x = (h.c + .5) * T, y = MAP_Y + (h.r + .5) * T;
      const range = (this.unloading ? this.supportRange(this.unloading) - highGroundRangeBonus(this.map, this.unloading.c, this.unloading.r) : d.range + this.bonuses.range) + highGround;
      g.fillStyle(color, ok ? .12 : .25).fillRect(h.c * T, MAP_Y + h.r * T, T, T);
      g.lineStyle(1, color, .8).strokeRect(h.c * T + 2, MAP_Y + h.r * T + 2, T - 4, T - 4);
      g.fillStyle(color, .05).fillCircle(x, y, range);
      g.lineStyle(1, color, .55).strokeCircle(x, y, range);
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
      const visualR = ENEMY_ART[e.type].size * .4;
      const w = e.r * 2 + 4, x = e.x - w / 2, y = e.y - visualR - 7;
      // Healthy swarms keep their silhouettes; damage reveals a bar, bosses always show one.
      const healthVisible = e.hp < e.max || e.type === 'boss';
      if (healthVisible) {
        g.fillStyle(0x000000, .65).fillRect(x, y, w, 4);
        g.fillStyle(0x66bb6a).fillRect(x, y, w * Math.max(0, e.hp / e.max), 4);
      }
      if ((e.shield ?? 0) > 0) {
        if (healthVisible) g.fillStyle(0xbc9ce1).fillRect(x, y - 4, w * Math.min(1, (e.shield ?? 0) / (e.max * .18)), 2);
        // A pair of spores conveys protection without covering every creature in an energy dome.
        g.fillStyle(0xbc9ce1, .8).fillCircle(e.x - 3, e.y + visualR * .6, 1.4).fillCircle(e.x + 3, e.y + visualR * .6, 1.4);
      }
      const observations = Math.min(observationCount(e), OBSERVATION_BONUSES.length);
      for (let i = 0; i < observations; i++) g.fillStyle(0xc4a1ff, .95).fillCircle(e.x + (i - (observations - 1) / 2) * 5, y - 8, 1.6);
      if (e.stunT > 0) g.lineStyle(1, 0xb4f4ff, .8).strokeCircle(e.x, e.y, e.r + 4);
      if (e.burnT > 0) g.fillStyle(0xffb456, .8).fillTriangle(e.x - 4, e.y - visualR, e.x, e.y - visualR - 8, e.x + 4, e.y - visualR);
    }
    const mini = this.miniGfx;
    mini.clear();
    // 모바일 배치는 전장이 이미 크게 보이므로 전술 지도를 그리지 않는다.
    if (!MOBILE_LAYOUT) for (const t of this.towers) if (!t.host) mini.fillStyle(isBishoujo() ? t === this.selected || t === this.selected?.host ? 0xffe6f5 : 0xe6a8d3 : t === this.selected || t === this.selected?.host ? 0xe0f7ad : 0x9bd76f).fillRect(25 + t.c * 8 + 2, CONSOLE_Y + 53 + t.r * 8 + 2, 4, 4);
    if (!MOBILE_LAYOUT) for (const e of this.enemies) {
      if (!e.dead && e.x >= 0 && e.x < W) mini.fillStyle(e.type === 'boss' ? 0xea85d8 : 0xe49674)
        .fillCircle(25 + e.x / W * 160, CONSOLE_Y + 53 + (e.y - MAP_Y) / MAP_H * 96, e.type === 'boss' ? 3 : 1.8);
    }
    // A small base-integrity meter beneath the top resource readout.
    const m = this.lifeMeter;
    mini.fillStyle(0x0b120e).fillRect(m.x, m.y, m.w, 9);
    mini.fillStyle(this.lives <= 5 ? 0xcf8067 : isBishoujo() ? 0xe8acd4 : 0x9dc278).fillRect(m.x + 2, m.y + 2, (m.w - 4) * Math.max(0, this.lives) / maxLives(), 5);
  }

  /**
   * 작전이 끝나면 화면이 멈춰 있으므로, 잠시 뒤 게임 루프를 재워 CPU·그래픽 자원을 놓아준다.
   * 누르거나 키를 치면 깨어나 그 입력을 처리하고, 다시 조용해지면 잠든다. 다음 출격에서는 늘 깨어 있다.
   */
  private sleepWhenIdle(): void {
    this.stopIdleSleep?.();
    const loop = this.game?.loop;
    if (!loop?.sleep) return;
    let timer = 0;
    const nap = () => { window.clearTimeout(timer); timer = window.setTimeout(() => { if (this.over && loop.running) loop.sleep(); }, IDLE_SLEEP_MS); };
    const wake = () => { if (!loop.running) loop.wake(); nap(); };
    const types = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'resize'];
    for (const type of types) window.addEventListener(type, wake, true);
    const cleanup = () => {
      window.clearTimeout(timer);
      for (const type of types) window.removeEventListener(type, wake, true);
      if (!loop.running) loop.wake();
    };
    this.stopIdleSleep = cleanup;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    nap();
  }

  private endGame(win: boolean): void {
    if (this.over) return;
    this.over = true; this.victory = win;
    this.sleepWhenIdle();
    this.moe?.reset();
    if (!win && this.waveActive) this.recordWave(false);
    if (!this.testMode) {
      const earned = this.cheated ? [] : awardAchievements(this.profile, win ? this.wave : Math.max(0, this.wave - 1), win, this.runStats, this.options, this.usedKinds);
      this.persistProfile(); clearSave(); this.checkpoint = null;
      this.opsNotice = this.cheated ? '치트를 사용한 작전이라 업적·훈장이 기록되지 않았습니다.' : earned.length ? '업적 달성: ' + earned.map(k => ACHIEVEMENTS[k as keyof typeof ACHIEVEMENTS].name).join(' · ') : '작전이 종료되었습니다. 전투 통계에서 병력별 전과를 확인하세요.';
    }
    this.operations?.update();
    this.pauseTxt.setVisible(false);
    this.closeResult?.();
    const close = showMissionResult({ win, wave: this.wave, bossLeaked: this.bossLeaked,
      onContinue: win && !this.testMode ? () => this.continuePlaying() : undefined,
      onRestart: () => this.scene.restart({ options: this.options, launched: true }),
      onReport: () => this.operations?.show('stats') });
    this.closeResult = close;
    this.events?.once(Phaser.Scenes.Events.SHUTDOWN, close);
  }
}

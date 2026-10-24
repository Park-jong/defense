import { COLS, ENEMY_DEFS, EnemyKey, MAP_DEFS, MapKey, MAX_UNIT_LEVEL, MAX_WAVE, ROWS, TOWER_DEFS, TowerKey } from './config';
import { EquippedSkill, SKILL_DEFS, SKILL_SLOTS, UnitBuff } from './catalog';

export const DIFFICULTIES = {
  easy: { name: '쉬움', hp: .7, speed: .9, gold: 220 },
  normal: { name: '보통', hp: 1, speed: 1, gold: 150 },
  hard: { name: '어려움', hp: 1.3, speed: 1.08, gold: 150 },
};
export const MODES = {
  standard: { name: '방어 작전', desc: '50웨이브 방어' },
  endless: { name: '무한 방어', desc: '50웨이브 이후에도 계속 진행' },
  bunker: { name: '벙커 부대', desc: '벙커·마린·파이어뱃만 사용' },
  budget: { name: '제한 예산', desc: '시작 1,500미네랄 · 처치/클리어/보급 수입 없음' },
};
export interface RunOptions { map: MapKey; difficulty: keyof typeof DIFFICULTIES; mode: keyof typeof MODES }
export const DEFAULT_OPTIONS: RunOptions = { map: 'frontier', difficulty: 'normal', mode: 'standard' };
export const TARGETS = { first: '선두', strong: '체력 높은 적', weak: '체력 낮은 적', boss: '보스' };
export type TargetMode = keyof typeof TARGETS;
export const BRANCHES = {
  power: { name: '집중 화력', desc: '공격력 +70% · 공격 간격 +15% · 지원 유닛은 지원 사거리 +45' },
  rapid: { name: '전술 확장', desc: '공격 속도 +40% · 범위 공격 반경 +35% · 지원 유닛은 지원 사거리 +25' },
};
export type Branch = keyof typeof BRANCHES;
export const REWARDS = {
  power: { name: '고출력 탄두', desc: '모든 병력 공격력 +12%' },
  haste: { name: '가속 장전', desc: '모든 병력 공격 속도 +10%' },
  range: { name: '장거리 센서', desc: '모든 병력 사거리 +12' },
  repair: { name: '기지 수리', desc: '기지 내구도 4 회복 (최대 20)' },
  supply: { name: '긴급 보급', desc: '미네랄 150 획득 (제한 예산에서는 등장하지 않음)' },
};
export type RewardKey = keyof typeof REWARDS;
export interface Bonuses { power: number; haste: number; range: number }
export const COMMANDERS = {
  strike: { name: '궤도 폭격', cooldown: 70, desc: '전장 내 모든 적에게 현재 최대 체력의 30% 피해 · 보스 12%' },
  slow: { name: '시간 교란', cooldown: 55, desc: '현재 전장 내 적을 5초간 65% 감속' },
  supply: { name: '보급 투하', cooldown: 90, desc: '미네랄 100 획득 · 제한 예산에서는 사용 불가' },
};
export type CommanderKey = keyof typeof COMMANDERS;
export const ENEMY_INFO: Record<EnemyKey, { name: string; desc: string }> = {
  grunt: { name: '돌격병', desc: '기본 적. 입구부터 기지까지 이동합니다.' },
  runner: { name: '질주병', desc: '체력은 낮지만 빠르게 방어선을 돌파합니다.' },
  tank: { name: '중장갑', desc: '느리고 체력이 높습니다. 집중 화력으로 대응하세요.' },
  boss: { name: '지휘 개체', desc: '10웨이브마다 출현. 기지에 도달하면 즉시 패배합니다.' },
  medic: { name: '의무병', desc: '2초마다 주변 100 범위 아군 체력을 최대 체력의 5% 회복합니다.' },
  splitter: { name: '분열체', desc: '처치하면 같은 위치에서 보상이 없는 질주병 2기가 나타납니다.' },
  shielder: { name: '보호막 지원병', desc: '3초마다 주변 95 범위 아군에게 최대 체력 8%의 보호막을 부여합니다. 중첩되지 않습니다.' },
};
export function bossPattern(wave: number): string {
  return wave >= 50 ? '최종 지휘관 · 보호막/소환/가속 순환' : ['보호막 재생', '부하 소환', '분열 증원', '주기적 가속'][Math.max(0, Math.floor(wave / 10) - 1) % 4];
}
/** Both the preview and the actual spawn queue use this exact function. */
export function wavePlan(wave: number): EnemyKey[] {
  const q: EnemyKey[] = [];
  for (let i = 0, n = Math.min(160, 6 + Math.floor(wave * 1.6)); i < n; i++) {
    let k: EnemyKey = 'grunt';
    if (wave >= 3 && i % 3 === 1) k = 'runner';
    if (wave >= 5 && i % 4 === 3) k = 'tank';
    if (wave >= 7 && i % 11 === 5) k = 'medic';
    if (wave >= 9 && i % 13 === 7) k = 'splitter';
    if (wave >= 12 && i % 15 === 9) k = 'shielder';
    q.push(k);
  }
  if (wave % 10 === 0) q.push('boss');
  return q;
}
export function rewardChoices(mode: RunOptions['mode'], random: () => number = Math.random): RewardKey[] {
  const keys = (Object.keys(REWARDS) as RewardKey[]).filter(k => mode !== 'budget' || k !== 'supply');
  for (let i = keys.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1)); [keys[i], keys[j]] = [keys[j], keys[i]];
  }
  return keys.slice(0, 3);
}
export function allowedUnit(key: TowerKey, mode: RunOptions['mode']): boolean {
  return mode !== 'bunker' || ['bunker', 'marine', 'firebat'].includes(key);
}
export interface UnitRecord { id: string; k: TowerKey; damage: number; kills: number }
export interface WaveRecord { wave: number; lost: number; kills: number; seconds: number }
export interface RunStats { damage: number; kills: number; lost: number; seconds: number; units: UnitRecord[]; waves: WaveRecord[]; commanderDamage: number }
export const newStats = (): RunStats => ({ damage: 0, kills: 0, lost: 0, seconds: 0, units: [], waves: [], commanderDamage: 0 });
export interface SavedUnit {
  id: string; k: TowerKey; c: number; r: number; lvl: number; spent: number;
  skills: EquippedSkill[]; cd: number; buffs: UnitBuff[]; hostId?: string; slot?: number; target: TargetMode; branch?: Branch;
}
export interface RunSave {
  version: 1; options: RunOptions; wave: number; gold: number; lives: number; units: SavedUnit[];
  bonuses: Bonuses; stats: RunStats; commander: Record<CommanderKey, number>;
  pending: RewardKey[]; rewarded: number; tutorial: number; usedKinds: TowerKey[];
}
export interface Profile { version: 1; achievements: string[]; skin: 'standard' | 'gold' | 'ion'; bestWave: number; wins: number; tutorialDone: boolean; volume: number }
export const ACHIEVEMENTS = {
  first: { name: '첫 방어선', desc: '10웨이브 클리어', skin: '' },
  victory: { name: '프런티어 수호자', desc: '50웨이브 작전 승리', skin: 'gold' },
  flawless: { name: '철벽 지휘관', desc: '기지 피해 없이 50웨이브 승리', skin: 'ion' },
  infantry: { name: '벙커의 의지', desc: '벙커 부대 모드 승리', skin: '' },
  combined: { name: '연합 전선', desc: '테란과 프로토스를 모두 사용해 승리', skin: '' },
};
export const SAVE_KEY = 'frontier.run.v1', PROFILE_KEY = 'frontier.profile.v1';
export interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }
export function storage(): StorageLike | undefined { try { return typeof localStorage === 'undefined' ? undefined : localStorage; } catch { return undefined; } }
export function writeStored(key: string, value: unknown, store = storage()): boolean {
  try { if (!store) return false; store.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}
export function clearSave(store = storage()): void { try { store?.removeItem(SAVE_KEY); } catch { /* private storage */ } }
function readStored(key: string, store?: StorageLike): unknown { try { return JSON.parse(store?.getItem(key) ?? 'null'); } catch { return null; } }
const obj = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): v is number => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const integer = (v: unknown, min: number, max: number): v is number => num(v, min, max) && Number.isInteger(v);
const has = (o: object, k: unknown): boolean => typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);
export function validOptions(v: unknown): v is RunOptions { return obj(v) && has(MAP_DEFS, v.map) && has(DIFFICULTIES, v.difficulty) && has(MODES, v.mode); }
/** Reject incompatible or corrupt checkpoints before constructing any scene objects. */
export function validateSave(v: unknown): v is RunSave {
  if (!obj(v) || v.version !== 1 || !validOptions(v.options) || !integer(v.wave, 0, 10000)
    || v.options.mode !== 'endless' && v.wave >= MAX_WAVE || !num(v.gold) || !integer(v.lives, 1, 20)
    || !Array.isArray(v.units) || v.units.length > COLS * ROWS * 5) return false;
  const ids = new Set<string>(), occupied = new Set<string>(), slots = new Set<string>();
  const paths = new Set<string>();
  for (const route of MAP_DEFS[v.options.map as MapKey].routes) for (let i = 1; i < route.length; i++) {
    const [ac, ar] = route[i - 1], [bc, br] = route[i];
    for (let c = Math.min(ac, bc); c <= Math.max(ac, bc); c++) for (let r = Math.min(ar, br); r <= Math.max(ar, br); r++) paths.add(`${c},${r}`);
  }
  for (const u of v.units) {
    if (!obj(u) || typeof u.id !== 'string' || !/^[1-9]\d*$/.test(u.id) || !num(Number(u.id), 1) || ids.has(u.id)
      || !has(TOWER_DEFS, u.k) || !allowedUnit(u.k, v.options.mode) || !integer(u.c, 0, COLS - 1) || !integer(u.r, 0, ROWS - 1)
      || !integer(u.lvl, 1, MAX_UNIT_LEVEL) || !num(u.spent) || !has(TARGETS, u.target) || u.hostId !== undefined && typeof u.hostId !== 'string' || u.branch !== undefined && (!has(BRANCHES, u.branch) || u.lvl < 3 || u.k === 'bunker')
      || !num(u.cd, 0, 60) || !Array.isArray(u.buffs) || !u.buffs.every((b: unknown) => obj(b) && num(b.left, 0, 60) && num(b.haste, 1, 10) && num(b.power, 1, 10))
      || !Array.isArray(u.skills) || u.skills.length > SKILL_SLOTS) return false;
    ids.add(u.id);
    if (new Set(u.skills.map((s: any) => s?.key)).size !== u.skills.length || u.skills.some((s: any) => !obj(s) || !has(SKILL_DEFS, s.key) || SKILL_DEFS[s.key as keyof typeof SKILL_DEFS].unit !== u.k || !num(s.cd, 0, 60))) return false;
    if (!u.hostId) {
      const cell = `${u.c},${u.r}`;
      if (occupied.has(cell) || paths.has(cell)) return false;
      occupied.add(cell);
    } else {
      const host = v.units.find((h: any) => h.id === u.hostId);
      const slot = `${u.hostId}:${u.slot}`;
      if (!['marine', 'firebat'].includes(u.k) || !host || host.k !== 'bunker' || host.hostId || host.c !== u.c || host.r !== u.r || !integer(u.slot, 0, 3) || slots.has(slot)) return false;
      slots.add(slot);
    }
  }
  if (!obj(v.bonuses) || !['power', 'haste', 'range'].every(k => num(v.bonuses[k], 0, 10000))
    || !obj(v.commander) || !Object.entries(COMMANDERS).every(([k, d]) => num(v.commander[k], 0, d.cooldown))
    || !Array.isArray(v.pending) || ![0, 3].includes(v.pending.length) || new Set(v.pending).size !== v.pending.length || v.pending.some((k: unknown) => !has(REWARDS, k) || v.options.mode === 'budget' && k === 'supply')
    || !integer(v.rewarded, 0, v.wave) || v.rewarded !== Math.floor(v.wave / 5) * 5 - (v.pending.length ? 5 : 0) || v.pending.length > 0 && (v.wave === 0 || v.wave % 5 !== 0)
    || !integer(v.tutorial, 0, 4) || !Array.isArray(v.usedKinds) || !v.usedKinds.every((k: unknown) => has(TOWER_DEFS, k))) return false;
  const s = v.stats;
  return obj(s) && ['damage', 'kills', 'lost', 'seconds', 'commanderDamage'].every(k => num(s[k]))
    && Array.isArray(s.units) && s.units.every((u: unknown) => obj(u) && typeof u.id === 'string' && /^[1-9]\d*$/.test(u.id) && has(TOWER_DEFS, u.k) && num(u.damage) && num(u.kills))
    && Array.isArray(s.waves) && s.waves.every((w: unknown) => obj(w) && integer(w.wave, 1, v.wave) && num(w.lost) && num(w.kills) && num(w.seconds));
}
export function readSave(store = storage()): RunSave | null { const v = readStored(SAVE_KEY, store); return validateSave(v) ? v : null; }
export function readProfile(store = storage()): Profile {
  const v = readStored(PROFILE_KEY, store);
  const p: Profile = { version: 1, achievements: [], skin: 'standard', bestWave: 0, wins: 0, tutorialDone: false, volume: .25 };
  if (!obj(v) || v.version !== 1) return p;
  if (Array.isArray(v.achievements)) p.achievements = v.achievements.filter((k: unknown) => has(ACHIEVEMENTS, k));
  if (v.skin === 'gold' && p.achievements.includes('victory') || v.skin === 'ion' && p.achievements.includes('flawless')) p.skin = v.skin;
  if (num(v.bestWave)) p.bestWave = v.bestWave;
  if (num(v.wins)) p.wins = v.wins;
  p.tutorialDone = v.tutorialDone === true;
  if (num(v.volume, 0, 1)) p.volume = v.volume;
  return p;
}
export function awardAchievements(p: Profile, wave: number, win: boolean, stats: RunStats, options: RunOptions, kinds: TowerKey[]): string[] {
  const earned: string[] = [];
  const grant = (k: string, yes: boolean) => { if (yes && !p.achievements.includes(k)) { p.achievements.push(k); earned.push(k); } };
  p.bestWave = Math.max(p.bestWave, wave);
  grant('first', wave >= 10);
  grant('victory', win);
  grant('flawless', win && stats.lost === 0);
  grant('infantry', win && options.mode === 'bunker');
  grant('combined', win && kinds.some(k => TOWER_DEFS[k].faction === 'terran') && kinds.some(k => TOWER_DEFS[k].faction === 'protoss'));
  if (win) p.wins++;
  return earned;
}

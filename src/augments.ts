import { SKILL_DEFS } from './catalog';
import type { SkillKey } from './data/skills';
import { MAX_UNIT_LEVEL } from './data/rules';
import { Faction, TOWER_DEFS, TowerKey } from './data/units';

// 증강 모드(docs/augments.md)의 증강 정의, 가격 배율, 후보 추첨. 현재는 골드·프리즘 등급이 구현되어 있다.
export const AUGMENT_TIERS = { silver: '실버', gold: '골드', prism: '프리즘' };
export type AugmentTier = keyof typeof AUGMENT_TIERS;
export interface AugmentDef { name: string; tier: AugmentTier; icon: string; desc: string; faction?: Faction; unit?: TowerKey }
export const AUGMENTS = {
  bounty: { name: '현상금 사냥', tier: 'gold', icon: 'weak', desc: '특수 적(의무병·분열체·보호막 지원병) 처치 보상 3배' },
  investment: { name: '선행 투자', tier: 'gold', icon: 'saved', desc: '즉시 미네랄 400 · 대신 웨이브 클리어 보너스 절반' },
  fortress: { name: '요새화', tier: 'gold', icon: 'empty', faction: 'terran', unit: 'bunker', desc: '벙커 사격구 4 → 6칸 · 주둔 보병 사거리 +30' },
  siegeMode: { name: '시즈 모드 확장', tier: 'gold', icon: 'siege', faction: 'terran', unit: 'cannon', desc: '시즈 탱크 사거리 +60 · 범위 +30% · 대신 공격 간격 +20%' },
  hangar: { name: '확장 격납고', tier: 'gold', icon: 'interceptors', faction: 'protoss', desc: '캐리어 인터셉터 +4 · 리버 스캐럽 폭발 범위 +40%' },
  alliance: { name: '연합 전선', tier: 'gold', icon: 'tactics', desc: '테란·프로토스 병력이 각각 3기 이상이면 모든 병력 공격력 +20%' },
  pureBlood: { name: '단일 혈통', tier: 'gold', icon: 'shield', desc: '한 종족 병력만 배치하면 그 종족 공격력 +30%' },
  glassCannon: { name: '유리 대포', tier: 'gold', icon: 'burst', desc: '모든 병력 공격력 +50% · 대신 기지 내구도 20 → 10' },
  veteran: { name: '숙련병', tier: 'gold', icon: 'flag', desc: '병력 최대 레벨 5 → 7 · 대신 강화 비용 +30%' },
  overload: { name: '지휘 과부하', tier: 'gold', icon: 'clock', desc: '사령관 지원 재사용 대기시간 -40% · 사용할 때마다 기지 내구도 1 소모' },
  crownHunter: { name: '왕관 사냥꾼', tier: 'gold', icon: 'boss', desc: '보스에게 주는 피해 +30% · 보스 보호막 재생량 절반' },
  stasis: { name: '정지장', tier: 'gold', icon: 'freeze', desc: '시간 교란이 둔화 대신 3초 완전 정지 (보스 1초)' },
  factory: { name: '군수 공장', tier: 'prism', icon: 'mineral', desc: '모든 병력 배치·강화 비용 -25%' },
  yamato: { name: '야마토 프로토콜', tier: 'prism', icon: 'yamato', faction: 'terran', unit: 'cruiser', desc: '배틀크루저 기본 공격이 사거리 끝까지 관통하는 야마토포로 변경 · 보스 피해 2배 · 스킬 비활성화' },
  aiur: { name: '내 목숨을 아이어에', tier: 'prism', icon: 'psiBlades', faction: 'protoss', unit: 'zealot', desc: '질럿을 모두 판매 · 이후 질럿은 1기만 배치, 사거리 +100, 피해 4배, 기본 공격이 사거리 안 범위 공격 · 질럿 모든 비용 3배' },
  storm: { name: '폭풍의 눈', tier: 'prism', icon: 'psionicStorm', faction: 'protoss', unit: 'highTemplar', desc: '하이 템플러의 사이오닉 스톰이 웨이브마다 첫 2회 즉시 발동' },
  xelnaga: { name: '젤나가 맙소사', tier: 'prism', icon: 'warp', faction: 'protoss', desc: '프로토스 모든 유닛 피해 2배 · 대가로 5웨이브마다 아몬 출현' },
  elite: { name: '정예 소대', tier: 'prism', icon: 'medal', desc: '병력 6기 이하일 때 모든 병력 공격력·공격 속도 +60%' },
  dualBranch: { name: '이중 특화', tier: 'prism', icon: 'upgrade', desc: '특화를 두 갈래 모두 선택 가능' },
  inflation: { name: '인플레이션', tier: 'prism', icon: 'supply', desc: '모든 비용 2배 · 판매 환급도 2배 비용 기준 · 모든 유닛 피해 4배' },
  orbital: { name: '궤도 연사', tier: 'prism', icon: 'strike', desc: '궤도 폭격이 2회 연속 발동' },
} satisfies Record<string, AugmentDef>;
export type AugmentKey = keyof typeof AUGMENTS;
export const AUGMENT_KEYS = Object.keys(AUGMENTS) as AugmentKey[];
const def = (key: AugmentKey): AugmentDef => AUGMENTS[key];

/** 증강을 고르는 웨이브와 카드마다 따로 굴리는 등급 확률(실버·골드·프리즘). */
export const AUGMENT_WAVES = [10, 20, 30];
export const TIER_ODDS: Record<number, [number, number, number]> = { 10: [.55, .35, .1], 20: [.3, .5, .2], 30: [.1, .5, .4] };
/** 굴린 등급에 남은 증강이 없을 때 찾아갈 등급 순서. */
const FALLBACK: Record<AugmentTier, AugmentTier[]> = { silver: ['silver', 'gold', 'prism'], gold: ['gold', 'silver', 'prism'], prism: ['prism', 'gold', 'silver'] };
export const AMON_INTERVAL = 5;
export const AMON_LEAK = 5;
export const AMON_SCALE = .8;
/** 야마토 프로토콜의 관통 폭(맵 한 칸 대비). */
export const YAMATO_WIDTH = .7;
export const AIUR_RANGE = 100;
/** 내 목숨을 아이어에 이후 전장에 둘 수 있는 질럿 수. */
export const AIUR_LIMIT = 1;
export const STORM_FREE_CASTS = 2;
export const ELITE_LIMIT = 6;
export const RELOCATE_COST = 20;
export const INVESTMENT_GOLD = 400;
export const FORTRESS_CAPACITY = 6;
export const FORTRESS_RANGE = 30;
export const SIEGE_RANGE = 60;
export const HANGAR_INTERCEPTORS = 4;
export const STASIS_TIME = 3;
export const STASIS_BOSS_TIME = 1;
const BOUNTY_TARGETS = ['medic', 'splitter', 'shielder'];

/** 증강 선택지: 카드 3장과 카드별 리롤 사용 여부. */
export interface AugmentOffer { cards: AugmentKey[]; rerolled: boolean[] }

// 씬과 상점이 같은 가격을 보도록 현재 판의 증강을 모듈에 둔다.
let active = new Set<AugmentKey>();
export function setActiveAugments(keys: Iterable<AugmentKey>): void { active = new Set(keys); }
export const hasAugment = (key: AugmentKey): boolean => active.has(key);
export const maxUnitLevel = (): number => active.has('veteran') ? 7 : MAX_UNIT_LEVEL;
export const maxLives = (): number => active.has('glassCannon') ? 10 : 20;
export const bunkerCapacity = (): number => active.has('fortress') ? FORTRESS_CAPACITY : 4;
/** 지휘 과부하: 사령관 지원 재사용 대기시간 배율. */
export const commanderCooldownScale = (): number => active.has('overload') ? .6 : 1;
export const bountyMultiplier = (enemy: string): number => active.has('bounty') && BOUNTY_TARGETS.includes(enemy) ? 3 : 1;
export const clearBonusMultiplier = (): number => active.has('investment') ? .5 : 1;

export type CostKind = 'place' | 'upgrade' | 'skill' | 'branch' | 'move';
/** 인플레이션은 모든 비용 2배, 아이어 질럿은 3배, 군수 공장은 배치·강화만 -25%. */
export function costMultiplier(unit: TowerKey | undefined, kind: CostKind): number {
  return (active.has('inflation') ? 2 : 1) * (active.has('aiur') && unit === 'zealot' ? 3 : 1)
    * (active.has('factory') && (kind === 'place' || kind === 'upgrade') ? .75 : 1) * (active.has('veteran') && kind === 'upgrade' ? 1.3 : 1);
}
const priced = (base: number, unit: TowerKey | undefined, kind: CostKind): number => Math.round(base * costMultiplier(unit, kind));
export const placeCost = (k: TowerKey): number => priced(TOWER_DEFS[k].cost, k, 'place');
export const branchCost = (k: TowerKey): number => priced(TOWER_DEFS[k].cost, k, 'branch');
export const relocateCost = (k: TowerKey): number => priced(RELOCATE_COST, k, 'move');
export const skillCost = (key: SkillKey): number => priced(SKILL_DEFS[key].cost, SKILL_DEFS[key].unit as TowerKey, 'skill');
export const upgradePrice = (k: TowerKey, base: number): number => priced(base, k, 'upgrade');
/** 야마토 프로토콜 중에는 배틀크루저 스킬을 장착하거나 쓸 수 없다. */
export const skillLocked = (unit: TowerKey): boolean => unit === 'cruiser' && active.has('yamato');

/** 배치된 병력(벙커 제외)의 수와 종족 구성. 정예 소대·연합 전선·단일 혈통이 쓴다. */
export interface Army { size: number; terran: number; protoss: number }
/** 병력 하나가 주는 기본 공격·스킬 피해 배율. 정예 소대는 공격 속도에도 같은 배율을 쓴다. */
export function damageMultiplier(unit: TowerKey, army: Army): number {
  const pure = army.size > 0 && (army.terran === 0 || army.protoss === 0);
  return (active.has('inflation') ? 4 : 1) * (active.has('aiur') && unit === 'zealot' ? 4 : 1)
    * (active.has('xelnaga') && TOWER_DEFS[unit].faction === 'protoss' ? 2 : 1) * eliteBonus(army.size)
    * (active.has('glassCannon') ? 1.5 : 1) * (active.has('alliance') && army.terran >= 3 && army.protoss >= 3 ? 1.2 : 1)
    * (active.has('pureBlood') && pure ? 1.3 : 1);
}
/** 왕관 사냥꾼: 병력이 보스(아몬 포함)에게 주는 피해 +30%. */
export const bossDamageMultiplier = (): number => active.has('crownHunter') ? 1.3 : 1;
export const eliteBonus = (armySize: number): number => active.has('elite') && armySize <= ELITE_LIMIT ? 1.6 : 1;

/** 젤나가 맙소사를 고른 다음부터 5의 배수 웨이브마다 아몬이 나온다. */
export const amonDue = (wave: number, since: number | null): boolean => since !== null && wave > since && wave % AMON_INTERVAL === 0;

/**
 * 카드 한 장을 뽑는다. 등급을 굴리고, 그 등급에 남은 증강이 없으면 가까운 등급으로 넘어간다.
 * seen에 든 증강(이미 출현했거나 이번 선택지에 있는 것)과 eligible이 거절한 증강은 뽑지 않는다.
 */
export function drawAugment(wave: number, seen: ReadonlySet<AugmentKey>, eligible: (key: AugmentKey) => boolean, random: () => number = Math.random): AugmentKey | null {
  const [silver, gold] = TIER_ODDS[wave] ?? TIER_ODDS[30], roll = random();
  const tier: AugmentTier = roll < silver ? 'silver' : roll < silver + gold ? 'gold' : 'prism';
  for (const t of FALLBACK[tier]) {
    const pool = AUGMENT_KEYS.filter(k => def(k).tier === t && !seen.has(k) && eligible(k));
    if (pool.length) return pool[Math.floor(random() * pool.length)];
  }
  return null;
}
/** 서로 다른 카드 최대 3장. 남은 증강이 모자라면 그만큼 적게 나온다. */
export function augmentOffer(wave: number, seen: ReadonlySet<AugmentKey>, eligible: (key: AugmentKey) => boolean, random: () => number = Math.random): AugmentOffer {
  const taken = new Set(seen), cards: AugmentKey[] = [];
  for (let i = 0; i < 3; i++) {
    const card = drawAugment(wave, taken, eligible, random);
    if (!card) break;
    cards.push(card); taken.add(card);
  }
  return { cards, rerolled: cards.map(() => false) };
}
/** 종족 특화 증강은 그 종족이 현재 보급 중이거나 그 종족 병력이 배치되어 있을 때만 후보가 된다. */
export function augmentEligible(key: AugmentKey, faction: Faction, deployed: readonly TowerKey[]): boolean {
  const d = def(key);
  // 확장 격납고는 캐리어와 리버 모두에 걸리므로 종족 조건만 본다.
  return !d.faction || d.faction === faction || deployed.some(k => TOWER_DEFS[k].faction === d.faction);
}
export const isAugment = (key: unknown): key is AugmentKey => typeof key === 'string' && Object.prototype.hasOwnProperty.call(AUGMENTS, key);

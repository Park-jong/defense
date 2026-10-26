import type { Branch, BranchState } from './campaign';
import type { TowerKey } from './data/units';

interface Effects {
  damage?: number; interval?: number; range?: number; splash?: number; splashRadius?: number;
  slow?: number; slowDuration?: number; skillCooldown?: number; fieldDuration?: number;
  aura?: number; empCooldown?: number; empRadius?: number; empFraction?: number; observationDuration?: number;
}
interface Specialization {
  name: string; icon: string; role: string; desc: string; effects: Effects;
  garrison?: Effects; field?: Effects;
}
type SpecializableUnit = Exclude<TowerKey, 'bunker'>;

/** Stable power/rapid save keys now select a different doctrine for each unit. */
export const SPECIALIZATIONS = {
  arrow: {
    power: { name: '장거리 요격', icon: 'range', role: '장거리 집중 사격', desc: '공격력 +75% · 사거리 +36 · 공격 간격 +20%', effects: { damage: 1.75, range: 36, interval: 1.2 } },
    rapid: { name: '확산 탄두', icon: 'barrage', role: '밀집 병력 대응', desc: '일반 공격에 폭발 반경 32 추가 · 공격 간격 -25% · 공격력 -15%', effects: { splashRadius: 32, interval: .75, damage: .85 } },
  },
  cannon: {
    power: { name: '공성 저격포', icon: 'range', role: '장거리 단일 저격', desc: '공격력 +120% · 사거리 +80 · 공격 간격 +35% · 일반 공격 범위 피해 제거', effects: { damage: 2.2, range: 80, interval: 1.35, splash: 0 } },
    rapid: { name: '광역 포격진', icon: 'siege', role: '넓은 지역 포격', desc: '일반 공격 폭발 반경 +80% · 공격력 +20% · 공격 간격 -10%', effects: { splash: 1.8, damage: 1.2, interval: .9 } },
  },
  frost: {
    power: { name: '절대 영도', icon: 'freeze', role: '강한 단일 둔화', desc: '일반 공격 둔화 +12%p · 둔화 4초 · 공격력 +50%', effects: { slow: -.12, slowDuration: 2, damage: 1.5 } },
    rapid: { name: '냉기 파동', icon: 'nova', role: '광역 둔화', desc: '일반 공격에 폭발·둔화 반경 60 추가 · 사거리 +24 · 둔화 -12%p', effects: { splashRadius: 60, range: 24, slow: .12 } },
  },
  sniper: {
    power: { name: '위상 저격', icon: 'plasma', role: '원거리 고위력', desc: '공격력 +90% · 사거리 +60 · 공격 간격 +25%', effects: { damage: 1.9, range: 60, interval: 1.25 } },
    rapid: { name: '분열포 가속', icon: 'overdrive', role: '빠른 연속 사격', desc: '공격 간격 -45% · 공격력 -20% · 사거리 -30', effects: { interval: .55, damage: .8, range: -30 } },
  },
  marine: {
    power: { name: '주둔 사수', icon: 'shield', role: '벙커 주둔 특화', desc: '벙커 주둔 시 공격력 +80% · 사거리 +36 (야전에서는 공격력 +15%)', effects: {}, garrison: { damage: 1.8, range: 36 }, field: { damage: 1.15 } },
    rapid: { name: '야전 돌격대', icon: 'stim', role: '야전 전투 특화', desc: '야전에서 공격 간격 -40% · 사거리 +24 (주둔 시 공격 간격 -15%)', effects: {}, field: { interval: .6, range: 24 }, garrison: { interval: .85 } },
  },
  firebat: {
    power: { name: '집속 화염', icon: 'inferno', role: '강한 집중 화염', desc: '공격력 +85% · 사거리 +24 · 일반 공격 폭발 반경 -30% · 공격 간격 +15%', effects: { damage: 1.85, range: 24, splash: .7, interval: 1.15 } },
    rapid: { name: '화염 장벽', icon: 'ignite', role: '넓은 방어선', desc: '일반 공격 폭발 반경 +75% · 사거리 +16 · 공격 간격 -15%', effects: { splash: 1.75, range: 16, interval: .85 } },
  },
  templar: {
    power: { name: '압축 플라즈마', icon: 'plasma', role: '고밀도 에너지', desc: '공격력 +90% · 일반 공격 폭발 반경 -20% · 공격 간격 +15%', effects: { damage: 1.9, splash: .8, interval: 1.15 } },
    rapid: { name: '사이오닉 파장', icon: 'nova', role: '광역 전선 제압', desc: '일반 공격 폭발 반경 +75% · 사거리 +30 · 공격력 +15%', effects: { splash: 1.75, range: 30, damage: 1.15 } },
  },
  cruiser: {
    power: { name: '결전 주포', icon: 'yamato', role: '원거리 중화력', desc: '공격력 +80% · 사거리 +60 · 일반 공격 폭발 반경 -30% · 공격 간격 +20%', effects: { damage: 1.8, range: 60, splash: .7, interval: 1.2 } },
    rapid: { name: '함대 포격', icon: 'bombard', role: '광역 연속 포격', desc: '일반 공격 폭발 반경 +60% · 공격 간격 -20% · 공격력 +10%', effects: { splash: 1.6, interval: .8, damage: 1.1 } },
  },
  support: {
    power: { name: '전술 관제', icon: 'overdrive', role: '강한 화력 지원', desc: '공속 지원 효과 +15%p · 지원 사거리 +15 · 기존 2대 중첩 규칙 적용', effects: { aura: .15, range: 15 } },
    rapid: { name: 'EMP 전문선', icon: 'emp', role: '광역 보호막 해제', desc: 'EMP 재사용 8 → 4초 · 반경 64 → 96 · 보호막 제거 50 → 75% · 사거리 +45', effects: { empCooldown: .5, empRadius: 32, empFraction: .25, range: 45 } },
  },
  observer: {
    power: { name: '정밀 관측', icon: 'weak', role: '오래 유지되는 약점', desc: '관측 지속 3 → 6초 · 사거리 +15 · 동일 기체의 관측은 중첩 없이 갱신', effects: { observationDuration: 3, range: 15 } },
    rapid: { name: '광역 정찰', icon: 'range', role: '빠른 분산 관측', desc: '관측 간격 -40% · 사거리 +45', effects: { interval: .6, range: 45 } },
  },
  ghost: {
    power: { name: 'C-10 정밀탄', icon: 'c10', role: '장거리 정밀 저격', desc: '공격력 +100% · 사거리 +35 · 공격 간격 +30%', effects: { damage: 2, range: 35, interval: 1.3 } },
    rapid: { name: '특수전 요원', icon: 'lockdown', role: '스킬 중심 제압', desc: '전용 스킬 재사용 -35% · 공격 간격 -20% · 공격력 +10%', effects: { skillCooldown: .65, interval: .8, damage: 1.1 } },
  },
  goliath: {
    power: { name: '중장갑 사냥꾼', icon: 'autocannon', role: '원거리 쌍열 사격', desc: '공격력 +75% · 사거리 +35 · 공격 간격 +15%', effects: { damage: 1.75, range: 35, interval: 1.15 } },
    rapid: { name: '확산 기관포', icon: 'hellfire', role: '광역 쌍열 사격', desc: '일반 공격에 폭발 반경 42 추가 · 공격 간격 -20% · 공격력 -10%', effects: { splashRadius: 42, interval: .8, damage: .9 } },
  },
  zealot: {
    power: { name: '황혼의 검', icon: 'psiBlades', role: '강한 근접 일격', desc: '공격력 +90% · 사거리 +20 · 공격 간격 +15%', effects: { damage: 1.9, range: 20, interval: 1.15 } },
    rapid: { name: '회전 검무', icon: 'zeal', role: '근접 광역 베기', desc: '일반 공격에 표적 주변 반경 58 광역 베기 추가 · 공격 간격 -20%', effects: { splashRadius: 58, interval: .8 } },
  },
  highTemplar: {
    power: { name: '영속 폭풍', icon: 'psionicStorm', role: '오래 머무는 폭풍', desc: '일반 폭풍 지속 2 → 3초 · 공격력 +35% · 공격 간격 +15%', effects: { fieldDuration: 1, damage: 1.35, interval: 1.15 } },
    rapid: { name: '폭풍 전선', icon: 'storm', role: '넓은 폭풍 지대', desc: '일반 폭풍 반경 +60% · 공격 간격 -20% · 공격력 -10%', effects: { splash: 1.6, interval: .8, damage: .9 } },
  },
  reaver: {
    power: { name: '중량 스캐럽', icon: 'scarab', role: '고위력 공성탄', desc: '공격력 +100% · 사거리 +35 · 일반 공격 폭발 반경 -25% · 공격 간격 +30%', effects: { damage: 2, range: 35, splash: .75, interval: 1.3 } },
    rapid: { name: '군집 스캐럽', icon: 'shrapnel', role: '광역 군집 파괴', desc: '일반 공격 폭발 반경 +60% · 공격 간격 -10% · 공격력 +15%', effects: { splash: 1.6, interval: .9, damage: 1.15 } },
  },
  scout: {
    power: { name: '중무장 전투기', icon: 'scoutVolley', role: '장거리 화력 지원', desc: '공격력 +75% · 사거리 +50 · 공격 간격 +15%', effects: { damage: 1.75, range: 50, interval: 1.15 } },
    rapid: { name: '기동 타격대', icon: 'photonDrive', role: '빠른 스킬 순환', desc: '전용 스킬 재사용 -40% · 공격 간격 -20% · 공격력 +10%', effects: { skillCooldown: .6, interval: .8, damage: 1.1 } },
  },
  carrier: {
    power: { name: '중형 인터셉터', icon: 'interceptors', role: '장거리 정밀 출격', desc: '인터셉터 공격력 +80% · 사거리 +40 · 출격 간격 +20%', effects: { damage: 1.8, range: 40, interval: 1.2 } },
    rapid: { name: '고속 출격', icon: 'carrierCapacity', role: '근거리 지속 출격', desc: '출격 간격 -40% · 인터셉터 공격력 +10% · 사거리 -30', effects: { interval: .6, damage: 1.1, range: -30 } },
  },
} as const satisfies Record<SpecializableUnit, Record<Branch, Specialization>>;

export function specialization(k: TowerKey, branch: Branch): Specialization | undefined {
  return k === 'bunker' ? undefined : SPECIALIZATIONS[k][branch];
}

const effectCache = new Map<string, Readonly<Required<Effects>>>();
const multiplicativeEffects = new Set<keyof Effects>(['damage', 'interval', 'splash', 'skillCooldown', 'empCooldown']);

export function specializationEffects(k: TowerKey, branch?: BranchState, garrison = false): Readonly<Required<Effects>> {
  const cacheKey = `${k}/${branch ?? ''}/${garrison ? 1 : 0}`, cached = effectCache.get(cacheKey);
  if (cached) return cached;
  const result = { damage: 1, interval: 1, range: 0, splash: 1, splashRadius: 0, slow: 0,
    slowDuration: 0, skillCooldown: 1, fieldDuration: 0, aura: 0, empCooldown: 1,
    empRadius: 0, empFraction: 0, observationDuration: 0 };
  for (const key of ['power', 'rapid'] as const) {
    if (branch !== key && branch !== 'both') continue;
    const def = specialization(k, key);
    if (!def) continue;
    const effects: Effects = { ...def.effects, ...(garrison ? def.garrison : def.field) };
    for (const key of Object.keys(effects) as (keyof Effects)[]) {
      if (multiplicativeEffects.has(key)) result[key] *= effects[key]!;
      else result[key] += effects[key]!;
    }
  }
  // Dual specialization keeps the siege sniper's firepower and the barrage's area attack.
  if (k === 'cannon' && branch === 'both') result.splash = SPECIALIZATIONS.cannon.rapid.effects.splash;
  const resolved = Object.freeze(result);
  effectCache.set(cacheKey, resolved);
  return resolved;
}

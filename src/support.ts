import type { TowerKey } from './data/units';
import type { BranchState } from './campaign';
import { specializationEffects } from './specializations';

export const VESSEL_AURA = { base: .2, perLevel: .05, secondary: .4 } as const;
export const VESSEL_EMP = { cooldown: 8, radius: 64, shieldFraction: .5 } as const;
export const OBSERVATION_DURATION = 3;
export const OBSERVATION_BONUSES = [.35, .45, .5] as const;

export interface Observation { source: string; left: number }
interface ObservedTarget { vulnerableT: number; observations?: readonly Observation[] }

export const vesselAuraBonus = (level: number): number => VESSEL_AURA.base + (level - 1) * VESSEL_AURA.perLevel;

/** Only the two strongest in-range vessels contribute, regardless of placement order. */
export function vesselAuraMultiplier(levels: readonly number[], extraBonuses: readonly number[] = []): number {
  const bonuses = levels.map((level, i) => vesselAuraBonus(level) + (extraBonuses[i] ?? 0)).sort((a, b) => b - a);
  return 1 + (bonuses[0] ?? 0) + (bonuses[1] ?? 0) * VESSEL_AURA.secondary;
}

export const observationCount = (target: ObservedTarget): number =>
  target.observations?.filter(mark => mark.left > 0).length ?? 0;

/** Dragoon vulnerability and observations share one damage multiplier, never multiply each other. */
export function weaknessBonus(target: ObservedTarget): number {
  const count = observationCount(target);
  return Math.max(target.vulnerableT > 0 ? OBSERVATION_BONUSES[0] : 0,
    count ? OBSERVATION_BONUSES[Math.min(count, OBSERVATION_BONUSES.length) - 1] : 0);
}

const percent = (value: number): number => Math.round(value * 100);
const analysisSteps = OBSERVATION_BONUSES.map(percent).join('% → +') + '%';
export const SUPPORT_DESCRIPTIONS = {
  support: `테란 과학선. 범위 내 다른 병력의 공격 속도 +${percent(VESSEL_AURA.base)}%, 강화당 +${percent(VESSEL_AURA.perLevel)}%p. 가장 강한 2대까지 적용하며 두 번째 효과는 ${percent(VESSEL_AURA.secondary)}%만 더합니다. EMP를 ${VESSEL_EMP.cooldown}초마다 자동 사용해 표적 주변 반경 ${VESSEL_EMP.radius}의 적 보호막을 ${percent(VESSEL_EMP.shieldFraction)}% 제거합니다. 체력에는 피해를 주지 않습니다.`,
  observer: `프로토스 정찰선. 미표식 적을 우선 관측합니다. 기체별 관측은 ${OBSERVATION_DURATION}초 지속되며 1·2·3대 이상이 겹치면 받는 피해를 +${analysisSteps}까지 높입니다. 같은 기체는 자신의 관측 시간만 갱신하며 직접 공격하지 않습니다.`,
};

/** Passive ability descriptions shared by command icons, supply notes and codex traits. */
export function supportTraits(key: TowerKey, level = 1, branch?: BranchState): { icon: string; name: string; text: string }[] {
  const spec = specializationEffects(key, branch);
  if (key === 'support') return [
    { icon: 'overdrive', name: '화력 지원', text: `주변 공속 +${percent(vesselAuraBonus(level) + spec.aura)}% · 가장 강한 2대 중첩 · 두 번째 효과 ${percent(VESSEL_AURA.secondary)}% 적용` },
    { icon: 'emp', name: 'EMP', text: `${VESSEL_EMP.cooldown * spec.empCooldown}초마다 자동 사용 · 표적 주변 반경 ${VESSEL_EMP.radius + spec.empRadius}의 보호막 ${percent(VESSEL_EMP.shieldFraction + spec.empFraction)}% 제거 · 체력 피해 없음` },
  ];
  if (key === 'observer') return [
    { icon: 'weak', name: '약점 분석', text: `기체별 ${OBSERVATION_DURATION + spec.observationDuration}초 관측 · 1/2/3대 받는 피해 +${analysisSteps} · 같은 기체는 시간만 갱신` },
    { icon: 'tactics', name: '분산 관측', text: '미표식 적 우선 · 이미 관측 중이면 자신의 표식이 없는 적부터 분석 · 같은 조건에서는 지정한 표적 우선순위 적용' },
  ];
  return [];
}

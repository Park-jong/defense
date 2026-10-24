import { MAX_UNIT_LEVEL, TOWER_DEFS, TowerKey } from './config';
import { EquippedSkill, SKILL_DEFS, SKILL_SLOTS, SkillKey } from './catalog';

export { MAX_UNIT_LEVEL } from './config';
export interface ManagedUnit {
  id: string; k: TowerKey; lvl: number; skills: EquippedSkill[]; hostId?: string;
}
export interface UnitScope { bunkerId?: string; kind?: TowerKey }
export type UnitOrder = { type: 'upgrade' } | { type: 'skill'; key: SkillKey };
export interface OrderResult { count: number; cost: number }

export const unitUpgradeCost = (unit: Pick<ManagedUnit, 'k' | 'lvl'>): number =>
  Math.round(TOWER_DEFS[unit.k].cost * .8 * unit.lvl);

/** The shop and scene quote the same eligible units; execution always makes a fresh plan. */
export function planOrder(units: ManagedUnit[], order: UnitOrder, scope: UnitScope = {}): { ids: string[]; cost: number } {
  const eligible = units.filter(unit => {
    if (unit.k === 'bunker' || scope.bunkerId !== undefined && unit.hostId !== scope.bunkerId
      || scope.kind !== undefined && unit.k !== scope.kind) return false;
    if (order.type === 'upgrade') return unit.lvl < MAX_UNIT_LEVEL;
    const skill = SKILL_DEFS[order.key];
    return !!skill && skill.unit === unit.k && unit.skills.length < SKILL_SLOTS && !unit.skills.some(s => s.key === order.key);
  });
  return { ids: eligible.map(unit => unit.id), cost: eligible.reduce((cost, unit) =>
    cost + (order.type === 'upgrade' ? unitUpgradeCost(unit) : SKILL_DEFS[order.key].cost), 0) };
}

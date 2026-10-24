import type { SkillKey } from './data/skills';

export * from './data/skills';

export interface EquippedSkill { key: SkillKey; cd: number }
export interface UnitBuff { left: number; haste: number; power: number }

import type { TowerKey } from './config';

export interface SkillDef {
  name: string; unit: TowerKey; cost: number; cooldown: number;
  color: number; icon: string; desc: string;
}

export const SKILL_DEFS = {
  barrage: { name: '미사일 난사', unit: 'arrow', cost: 80, cooldown: 8, color: 0xffd47b, icon: '↗', desc: '사거리 안의 적 최대 4기에게 각각 공격력 200% 피해.' },
  overdrive: { name: '추적 과부하', unit: 'arrow', cost: 100, cooldown: 12, color: 0xb4df83, icon: '»', desc: '4초 동안 자신의 공격 속도 100% 증가.' },
  siege: { name: '초고폭 포격', unit: 'cannon', cost: 140, cooldown: 10, color: 0xffb66c, icon: '◎', desc: '표적 주변 반경 90에 공격력 320% 범위 피해.' },
  shrapnel: { name: '충격 탄막', unit: 'cannon', cost: 110, cooldown: 9, color: 0xe5c993, icon: '✦', desc: '반경 75에 공격력 220% 피해, 3초간 이동 속도 60% 감소.' },
  freeze: { name: '정지장', unit: 'frost', cost: 95, cooldown: 11, color: 0x99edff, icon: '❄', desc: '표적 반경 75의 적을 2초간 정지. 보스는 0.6초 정지.' },
  nova: { name: '광자 파동', unit: 'frost', cost: 120, cooldown: 9, color: 0x8bd6ff, icon: '◉', desc: '자신 주변 반경 135에 공격력 500% 피해, 4초간 65% 둔화.' },
  plasma: { name: '위상 균열', unit: 'sniper', cost: 150, cooldown: 10, color: 0x86b9ff, icon: '◇', desc: '표적에 공격력 200% 피해. 5초간 받는 모든 피해 35% 증가.' },
  chain: { name: '분열 연쇄탄', unit: 'sniper', cost: 170, cooldown: 12, color: 0xafa7ff, icon: 'ϟ', desc: '최대 5기의 적에게 에너지 연쇄. 첫 피해 180%, 이후 점차 감소.' },
  stim: { name: '전투 자극제', unit: 'marine', cost: 75, cooldown: 12, color: 0x9ade86, icon: '✚', desc: '6초 동안 자신의 공격 속도 80% 증가.' },
  burst: { name: '철갑 점사', unit: 'marine', cost: 85, cooldown: 6, color: 0xf2df8b, icon: '≋', desc: '표적에 공격력 450%의 집중 사격.' },
  inferno: { name: '지옥불 분사', unit: 'firebat', cost: 120, cooldown: 9, color: 0xff9d59, icon: '♨', desc: '표적 반경 70에 공격력 250% 피해, 4초간 매초 100% 화상.' },
  ignite: { name: '네이팜 탄두', unit: 'firebat', cost: 100, cooldown: 10, color: 0xf17d5e, icon: '▲', desc: '적 최대 3기에게 6초간 매초 공격력 150% 화상 피해.' },
  storm: { name: '사이오닉 폭주', unit: 'templar', cost: 170, cooldown: 12, color: 0x67caff, icon: 'ϟ', desc: '표적 위치 반경 85에 4초간 전기장을 방출. 0.5초마다 공격력 90% 피해.' },
  warp: { name: '에너지 공명', unit: 'templar', cost: 140, cooldown: 15, color: 0x9cefff, icon: '◉', desc: '자신과 반경 150의 아군에게 6초간 공격력 30%, 공격 속도 30% 증가.' },
  yamato: { name: '야마토 포', unit: 'cruiser', cost: 230, cooldown: 16, color: 0xffb681, icon: '⊕', desc: '표적 하나에게 공격력 800%의 압축 에너지 포격.' },
  bombard: { name: '융단 폭격', unit: 'cruiser', cost: 200, cooldown: 13, color: 0xff8d78, icon: '⋮', desc: '최대 3기의 적 위치에 각각 반경 55, 공격력 220% 범위 폭격.' },
} satisfies Record<string, SkillDef>;

export type SkillKey = keyof typeof SKILL_DEFS;
export const SKILL_KEYS = Object.keys(SKILL_DEFS) as SkillKey[];
export const SKILL_SLOTS = 2;
export interface EquippedSkill { key: SkillKey; cd: number }
export interface UnitBuff { left: number; haste: number; power: number }

export const T = 48;
export const COLS = 20;
export const ROWS = 12;
export const MAP_H = ROWS * T;
export const W = COLS * T;
export const H = 716;
export const MAX_WAVE = 30;
/** 웨이브 클리어 보너스 = BASE + PER_WAVE * 웨이브. 웨이브 30 시작 시점의 누적 골드가 약 12,000이 되도록 맞춤. */
export const CLEAR_BONUS_BASE = 17;
export const CLEAR_BONUS_PER_WAVE = 4;
/** 최종 보스(마지막 웨이브의 보스) 체력 배율. */
export const FINAL_BOSS_HP_MULT = 1;
/** 테스트 모드(`?test`): 마지막 스테이지(30)를 반복하며, 후반 수준의 골드로 시작한다. */
export const TEST_GOLD = 12000;
export const FONT = '"Malgun Gothic", system-ui, sans-serif';

export interface Point { x: number; y: number }

export const WP: Point[] = ([[-1, 2], [16, 2], [16, 5], [3, 5], [3, 9], [20, 9]] as const)
  .map(([c, r]) => ({ x: (c + .5) * T, y: (r + .5) * T }));

export const pathCells = new Set<string>();
for (let i = 0; i < WP.length - 1; i++) {
  const a = WP[i], b = WP[i + 1];
  const c0 = Math.floor(a.x / T), r0 = Math.floor(a.y / T);
  const c1 = Math.floor(b.x / T), r1 = Math.floor(b.y / T);
  for (let c = Math.min(c0, c1); c <= Math.max(c0, c1); c++)
    for (let r = Math.min(r0, r1); r <= Math.max(r0, r1); r++) pathCells.add(c + ',' + r);
}

export interface TowerDef {
  name: string; cost: number; range: number; dmg: number; rate: number;
  color: number; proj: number; barrel: number; desc: string;
  splash?: number; slow?: number;
}

export const TOWER_DEFS = {
  arrow:  { name: '화살탑', cost: 50,  range: 120, dmg: 10, rate: .45, color: 0x8d6e63, proj: 0xfff59d, barrel: 20, desc: '빠른 단일 공격' },
  cannon: { name: '대포탑', cost: 100, range: 110, dmg: 32, rate: 1.3, color: 0x546e7a, proj: 0xff8a65, barrel: 18, splash: 55, desc: '범위 폭발 피해' },
  frost:  { name: '냉기탑', cost: 75,  range: 100, dmg: 4,  rate: .8,  color: 0x4fc3f7, proj: 0xb3e5fc, barrel: 16, slow: .5, desc: '적을 느리게 함' },
  sniper: { name: '저격탑', cost: 150, range: 260, dmg: 95, rate: 2.2, color: 0x7e57c2, proj: 0xe1bee7, barrel: 30, desc: '초장거리 강타' },
} satisfies Record<string, TowerDef>;

export type TowerKey = keyof typeof TOWER_DEFS;
export const TOWER_KEYS = Object.keys(TOWER_DEFS) as TowerKey[];

export const ENEMY_DEFS = {
  grunt:  { hp: 40,   speed: 60,  reward: 5,   color: 0xe57373, r: 11 },
  runner: { hp: 25,   speed: 110, reward: 5,   color: 0xffb74d, r: 9 },
  tank:   { hp: 160,  speed: 40,  reward: 12,  color: 0x8d6e63, r: 14 },
  boss:   { hp: 1200, speed: 34,  reward: 120, color: 0xab47bc, r: 19 },
};
export type EnemyKey = keyof typeof ENEMY_DEFS;

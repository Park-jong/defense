export const T = 48;
export const COLS = 20;
export const ROWS = 12;
export const MAP_H = ROWS * T;
/** 맵의 가로 크기. 데스크톱에서는 캔버스 너비와 같고, 모바일에서는 오른쪽에 SIDE_W 패널이 붙는다. */
export const W = COLS * T;
/** 모바일 가로 배치에서 맵 오른쪽에 붙는 지휘 패널의 너비. */
export const SIDE_W = 320;
// 배치 값은 게임 생성 전에 useMobileLayout()으로 한 번만 바뀐다 (ES 모듈의 live binding으로 모든 곳에 반영).
export let MOBILE_LAYOUT = false;
export let MAP_Y = 56;
export let CONSOLE_Y = MAP_Y + MAP_H;
/** 캔버스 크기. 데스크톱 960×856(상단바 + 맵 + 하단 콘솔), 모바일 1280×576(맵 + 오른쪽 패널). */
export let GAME_W = W;
export let H = 856;
export const MAX_WAVE = 30;
/** 게임 로직 고정 스텝(초). 실제 경과 시간을 이 단위로 나눠 진행한다. */
export const STEP_SEC = 1 / 60;
/** 창이 가려져 루프가 드물게 돌 때 한 번에 따라잡는 최대 시간(초). */
export const MAX_CATCHUP_SEC = 60;
/** 웨이브 클리어 보너스 = BASE + PER_WAVE * 웨이브. 웨이브 30 시작 시점의 누적 골드가 약 12,000이 되도록 맞춤. */
export const CLEAR_BONUS_BASE = 17;
export const CLEAR_BONUS_PER_WAVE = 4;
/** 최종 보스(마지막 웨이브의 보스) 체력 배율. */
export const FINAL_BOSS_HP_MULT = 1;
/** 테스트 모드(`?test`): 마지막 스테이지(30)를 반복하며, 후반 수준의 골드로 시작한다. */
export const TEST_GOLD = 12000;
export const FONT = '"Malgun Gothic", system-ui, sans-serif';

export interface Point { x: number; y: number }

const WP_CELLS = [[-1, 2], [16, 2], [16, 5], [3, 5], [3, 9], [20, 9]] as const;
export const WP: Point[] = WP_CELLS.map(([c, r]) => ({ x: (c + .5) * T, y: MAP_Y + (r + .5) * T }));

/** 가로로 긴 터치 화면용 배치: 상단바·하단 콘솔 대신 맵 오른쪽에 세로 패널을 둔다. */
export function useMobileLayout(): void {
  MOBILE_LAYOUT = true;
  MAP_Y = 0;
  CONSOLE_Y = MAP_H;
  GAME_W = W + SIDE_W;
  H = MAP_H;
  WP_CELLS.forEach(([, r], i) => { WP[i].y = MAP_Y + (r + .5) * T; });
}

export const pathCells = new Set<string>();
for (let i = 0; i < WP.length - 1; i++) {
  const a = WP[i], b = WP[i + 1];
  const c0 = Math.floor(a.x / T), r0 = Math.floor((a.y - MAP_Y) / T);
  const c1 = Math.floor(b.x / T), r1 = Math.floor((b.y - MAP_Y) / T);
  for (let c = Math.min(c0, c1); c <= Math.max(c0, c1); c++)
    for (let r = Math.min(r0, r1); r <= Math.max(r0, r1); r++) pathCells.add(c + ',' + r);
}

export interface TowerDef {
  name: string; cost: number; range: number; dmg: number; rate: number;
  color: number; proj: number; barrel: number; desc: string;
  faction: 'terran' | 'protoss'; role: string;
  splash?: number; slow?: number;
}

export const TOWER_DEFS = {
  arrow:  { name: '미사일 터렛', faction: 'terran', role: '속사 / 방어', cost: 50, range: 120, dmg: 10, rate: .45, color: 0x8b9e76, proj: 0xffe8a3, barrel: 20, desc: '쌍열 미사일 발사대. 저렴한 비용으로 빠르게 방어선을 구축합니다.' },
  cannon: { name: '시즈 탱크', faction: 'terran', role: '포격 / 범위', cost: 100, range: 110, dmg: 32, rate: 1.3, color: 0xc15254, proj: 0xffb15b, barrel: 20, splash: 55, desc: '지지대를 펼쳐 고정한 중장갑 전차. 긴 주포의 고폭탄으로 밀집한 적에게 범위 피해를 줍니다.' },
  frost:  { name: '포톤 캐논', faction: 'protoss', role: '제어 / 둔화', cost: 75, range: 100, dmg: 4, rate: .8, color: 0x65a9b8, proj: 0x8deaff, barrel: 16, slow: .5, desc: '광자 에너지가 적의 이동 속도를 2초간 50% 감소시킵니다.' },
  sniper: { name: '드라군', faction: 'protoss', role: '저격 / 고위력', cost: 150, range: 260, dmg: 95, rate: 2.2, color: 0xa395bd, proj: 0x7fbdff, barrel: 30, desc: '긴 사거리와 강한 위상 분열포로 강력한 적을 제압합니다.' },
  marine: { name: '마린', faction: 'terran', role: '보병 / 속사', cost: 65, range: 140, dmg: 8, rate: .22, color: 0x7897b8, proj: 0xffeb9c, barrel: 17, desc: '가우스 소총을 연사하는 보병. 전투 자극제로 화력을 끌어올립니다.' },
  firebat: { name: '파이어뱃', faction: 'terran', role: '화염 / 범위', cost: 110, range: 88, dmg: 14, rate: .4, splash: 32, color: 0xc54437, proj: 0xff9a45, barrel: 28, desc: '붉은 중장갑과 연료통을 갖춘 화염 보병. 양팔의 화염방사기를 겨눠 몰려오는 적을 태웁니다.' },
  templar: { name: '아칸', faction: 'protoss', role: '에너지 / 범위 공격', cost: 190, range: 160, dmg: 22, rate: 1.2, color: 0x54bdff, proj: 0x9cefff, barrel: 12, splash: 48, desc: '푸른 에너지에 둘러싸인 사이오닉 전사. 플라즈마를 방출해 반경 48의 적을 함께 타격합니다.' },
  cruiser: { name: '배틀크루저', faction: 'terran', role: '중화력 / 범위', cost: 300, range: 195, dmg: 46, rate: 1.1, splash: 38, color: 0xa2b4c2, proj: 0xff8a76, barrel: 24, desc: '방어 구역에 정박하는 전투순양함. 야마토 포와 융단 폭격을 사용합니다.' },
  bunker: { name: '벙커', faction: 'terran', role: '주둔 / 보병 4기', cost: 40, range: 0, dmg: 0, rate: 1, color: 0x8f9d76, proj: 0xffe8a3, barrel: 0, desc: '빈 벙커는 공격하지 않습니다. 마린·파이어뱃 최대 4기 탑승, 각 병력의 사거리 +24. 스킬도 자동 사용합니다.' },
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

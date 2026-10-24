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
export const MAX_WAVE = 50;
export const MAX_UNIT_LEVEL = 5;
/** 게임 로직 고정 스텝(초). 실제 경과 시간을 이 단위로 나눠 진행한다. */
export const STEP_SEC = 1 / 60;
/** 창이 가려져 루프가 드물게 돌 때 한 번에 따라잡는 최대 시간(초). */
export const MAX_CATCHUP_SEC = 60;
/** 웨이브 클리어 보너스 = BASE + PER_WAVE * 웨이브. */
export const CLEAR_BONUS_BASE = 17;
export const CLEAR_BONUS_PER_WAVE = 4;
/** 최종 보스(마지막 웨이브의 보스) 체력 배율. */
export const FINAL_BOSS_HP_MULT = 1;
/** 테스트 모드(`?test`): MAX_WAVE 스테이지를 반복하며, 아래의 고정 미네랄을 지급한다. */
export const TEST_GOLD = 100000;
export const FONT = '"Malgun Gothic", system-ui, sans-serif';

export interface Point { x: number; y: number }

export const MAP_DEFS = {
  frontier: { name: '프런티어', desc: '긴 단일 진입로 · 기본 전장', routes: [[[-1, 2], [16, 2], [16, 5], [3, 5], [3, 9], [20, 9]]] },
  canyon: { name: '협곡', desc: '좁은 회랑과 네 번의 굴곡', routes: [[[-1, 1], [17, 1], [17, 4], [2, 4], [2, 7], [17, 7], [17, 10], [20, 10]]] },
  junction: { name: '합류 지대', desc: '두 진입로가 중앙에서 합류', routes: [[[-1, 1], [10, 1], [10, 5], [4, 5], [4, 9], [20, 9]], [[-1, 9], [1, 9], [1, 5], [4, 5], [4, 9], [20, 9]]] },
} satisfies Record<string, { name: string; desc: string; routes: number[][][] }>;
export type MapKey = keyof typeof MAP_DEFS;
export let activeMap: MapKey = 'frontier';
export const WP: Point[] = [];
export const ROUTES: Point[][] = [];
export const pathCells = new Set<string>();
export function configureMap(key: MapKey): void {
  activeMap = key;
  ROUTES.splice(0, ROUTES.length, ...MAP_DEFS[key].routes.map(route => route.map(([c, r]) => ({ x: (c + .5) * T, y: MAP_Y + (r + .5) * T }))));
  WP.splice(0, WP.length, ...ROUTES[0]);
  pathCells.clear();
  for (const route of ROUTES) for (let i = 0; i < route.length - 1; i++) {
    const a = route[i], b = route[i + 1];
    const c0 = Math.floor(a.x / T), r0 = Math.floor((a.y - MAP_Y) / T);
    const c1 = Math.floor(b.x / T), r1 = Math.floor((b.y - MAP_Y) / T);
    for (let c = Math.min(c0, c1); c <= Math.max(c0, c1); c++)
      for (let r = Math.min(r0, r1); r <= Math.max(r0, r1); r++) pathCells.add(c + ',' + r);
  }
}
configureMap('frontier');

/**
 * 캔버스를 게임 좌표의 몇 배 픽셀로 그릴지. 고밀도 화면(휴대폰 등)에서 CSS로 늘려 흐려지는 것을 막는다.
 * 게임 좌표는 그대로 두고 카메라 줌과 텍스트 해상도로 맞춘다. 일반 모니터에서는 1.
 */
export let RENDER_SCALE = 1;
export function setRenderScale(scale: number): void { RENDER_SCALE = scale; }

/** 가로로 긴 터치 화면용 배치: 상단바·하단 콘솔 대신 맵 오른쪽에 세로 패널을 둔다. */
export function useMobileLayout(): void {
  MOBILE_LAYOUT = true;
  MAP_Y = 0;
  CONSOLE_Y = MAP_H;
  GAME_W = W + SIDE_W;
  H = MAP_H;
  configureMap(activeMap);
}

export interface TowerDef {
  name: string; cost: number; range: number; dmg: number; rate: number;
  color: number; proj: number; barrel: number; desc: string;
  faction: Faction; role: string;
  splash?: number; slow?: number;
}

export const FACTIONS = { terran: { name: '테란', color: '#9bc4b5' }, protoss: { name: '프로토스', color: '#e4c777' } };
export type Faction = keyof typeof FACTIONS;

export const TOWER_DEFS = {
  arrow:  { name: '미사일 터렛', faction: 'terran', role: '속사 / 방어', cost: 50, range: 120, dmg: 10, rate: .45, color: 0x8b9e76, proj: 0xffe8a3, barrel: 20, desc: '쌍열 미사일 발사대. 저렴한 비용으로 빠르게 방어선을 구축합니다.' },
  cannon: { name: '시즈 탱크', faction: 'terran', role: '포격 / 범위', cost: 100, range: 110, dmg: 32, rate: 1.3, color: 0xc15254, proj: 0xffb15b, barrel: 20, splash: 55, desc: '지지대를 펼쳐 고정한 중장갑 전차. 긴 주포의 고폭탄으로 밀집한 적에게 범위 피해를 줍니다.' },
  frost:  { name: '포톤 캐논', faction: 'protoss', role: '제어 / 둔화', cost: 75, range: 100, dmg: 4, rate: .8, color: 0x65a9b8, proj: 0x8deaff, barrel: 16, slow: .5, desc: '광자 에너지가 적의 이동 속도를 2초간 50% 감소시킵니다.' },
  sniper: { name: '드라군', faction: 'protoss', role: '저격 / 고위력', cost: 150, range: 260, dmg: 95, rate: 2.2, color: 0xa395bd, proj: 0x7fbdff, barrel: 30, desc: '긴 사거리와 강한 위상 분열포로 강력한 적을 제압합니다.' },
  marine: { name: '마린', faction: 'terran', role: '보병 / 속사', cost: 65, range: 140, dmg: 8, rate: .22, color: 0x7897b8, proj: 0xffeb9c, barrel: 17, desc: '가우스 소총을 연사하는 보병. 전투 자극제로 화력을 끌어올립니다.' },
  firebat: { name: '파이어뱃', faction: 'terran', role: '화염 / 범위', cost: 110, range: 88, dmg: 14, rate: .4, splash: 32, color: 0xc54437, proj: 0xff9a45, barrel: 28, desc: '붉은 중장갑과 연료통을 갖춘 화염 보병. 양팔의 화염방사기를 겨눠 몰려오는 적을 태웁니다.' },
  templar: { name: '아칸', faction: 'protoss', role: '에너지 / 범위 공격', cost: 190, range: 160, dmg: 22, rate: 1.2, color: 0x54bdff, proj: 0x9cefff, barrel: 12, splash: 48, desc: '푸른 에너지에 둘러싸인 사이오닉 전사. 플라즈마를 방출해 반경 48의 적을 함께 타격합니다.' },
  cruiser: { name: '배틀크루저', faction: 'terran', role: '중화력 / 범위', cost: 300, range: 230, dmg: 72, rate: .8, splash: 55, color: 0xa2b4c2, proj: 0xff8a76, barrel: 24, desc: '장거리 레이저 포격으로 밀집한 적을 제압하는 전투순양함. 야마토 포는 보스를 우선 공격하며, 융단 폭격으로 전선을 정리합니다.' },
  bunker: { name: '벙커', faction: 'terran', role: '주둔 / 보병 4기', cost: 40, range: 0, dmg: 0, rate: 1, color: 0x8f9d76, proj: 0xffe8a3, barrel: 0, desc: '빈 벙커는 공격하지 않습니다. 마린·파이어뱃 최대 4기 탑승, 각 병력의 사거리 +24. 스킬도 자동 사용합니다.' },
  support: { name: '사이언스 베슬', faction: 'terran', role: '과학선 / 전술 지원', cost: 160, range: 145, dmg: 0, rate: 1, color: 0x81cead, proj: 0x81cead, barrel: 0, desc: '테란 과학선. 범위 내 다른 병력의 공격 속도를 20% 높입니다. 강화당 추가 5%. 같은 지원 효과는 중첩되지 않습니다.' },
  observer: { name: '옵저버', faction: 'protoss', role: '정찰선 / 약점 노출', cost: 175, range: 170, dmg: 0, rate: 1.4, color: 0xc4a1ff, proj: 0xc4a1ff, barrel: 0, desc: '프로토스 정찰선. 사거리 내 적 하나의 약점을 3초간 노출해 받는 피해를 35% 높입니다. 직접 공격하지 않습니다.' },
  ghost: { name: '고스트', faction: 'terran', role: '저격 / 락다운', cost: 140, range: 240, dmg: 42, rate: 1.2, color: 0x91b4bd, proj: 0xd8f3e9, barrel: 28, desc: '장거리 C-10 저격 소총을 사용하는 특수 요원. 락다운으로 적의 진격을 저지합니다.' },
  goliath: { name: '골리앗', faction: 'terran', role: '보행 병기 / 쌍열 기관포', cost: 145, range: 170, dmg: 28, rate: .65, color: 0xa1b3a1, proj: 0xffd18b, barrel: 24, desc: '두 팔의 기관포를 동시에 발사하는 보행 병기. 헬파이어 미사일로 밀집한 적을 타격합니다.' },
  zealot: { name: '질럿', faction: 'protoss', role: '근접 / 사이오닉 검', cost: 80, range: 78, dmg: 26, rate: .6, color: 0xe4bc67, proj: 0x8deaff, barrel: 12, desc: '양팔의 사이오닉 검으로 가까운 적을 즉시 베는 전사. 짧은 사거리에서 빠르고 강하게 공격합니다.' },
  highTemplar: { name: '하이 템플러', faction: 'protoss', role: '마법 / 사이오닉 스톰', cost: 170, range: 195, dmg: 22, rate: 2.8, splash: 75, color: 0xc3a0ee, proj: 0xa6c7ff, barrel: 0, desc: '일반 무기 대신 사이오닉 스톰을 자동 시전합니다. 표적 위치에 2초간 남는 폭풍으로 0.5초마다 피해를 줍니다.' },
  reaver: { name: '리버', faction: 'protoss', role: '공성 / 스캐럽', cost: 250, range: 225, dmg: 85, rate: 2.2, splash: 72, color: 0xd5b768, proj: 0xffe3a2, barrel: 20, desc: '스캐럽을 발사하는 중장갑 로봇. 느리지만 넓은 폭발 범위와 강한 한 발로 밀집한 적을 분쇄합니다.' },
  scout: { name: '스카우트', faction: 'protoss', role: '전투기 / 쌍열 광자포', cost: 200, range: 195, dmg: 32, rate: .8, color: 0x7fa8e3, proj: 0x9bdcff, barrel: 25, desc: '황금 날개를 펼친 프로토스 전투기. 쌍열 광자포와 미사일 일제 사격으로 전선을 지원합니다.' },
  carrier: { name: '캐리어', faction: 'protoss', role: '주력함 / 인터셉터', cost: 350, range: 245, dmg: 10, rate: .8, color: 0xe7c77d, proj: 0x9deaff, barrel: 25, desc: '4기의 인터셉터를 동시에 출격시키는 프로토스 주력함. 각 요격기가 독립적으로 표적을 추적합니다.' },
} satisfies Record<string, TowerDef>;

export type TowerKey = keyof typeof TOWER_DEFS;
export const TOWER_KEYS = Object.keys(TOWER_DEFS) as TowerKey[];
/** The command card and shop share the same nine slots and keyboard order. Legacy unit keys stay stable for saves. */
export const FACTION_TOWERS: Record<Faction, TowerKey[]> = {
  terran: ['arrow', 'cannon', 'marine', 'firebat', 'ghost', 'goliath', 'cruiser', 'bunker', 'support'],
  protoss: ['frost', 'sniper', 'zealot', 'highTemplar', 'templar', 'reaver', 'scout', 'carrier', 'observer'],
};

export const ENEMY_DEFS = {
  grunt:  { hp: 40,   speed: 60,  reward: 5,   color: 0xe57373, r: 11 },
  runner: { hp: 25,   speed: 110, reward: 5,   color: 0xffb74d, r: 9 },
  tank:   { hp: 160,  speed: 40,  reward: 12,  color: 0x8d6e63, r: 14 },
  boss:   { hp: 1200, speed: 34,  reward: 120, color: 0xab47bc, r: 19 },
  medic:  { hp: 90, speed: 48, reward: 10, color: 0x76d6a5, r: 12 },
  splitter: { hp: 130, speed: 50, reward: 10, color: 0xe3c36b, r: 13 },
  shielder: { hp: 110, speed: 46, reward: 11, color: 0x72a9ed, r: 12 },
};
export type EnemyKey = keyof typeof ENEMY_DEFS;

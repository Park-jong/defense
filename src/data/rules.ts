export const T = 48;
export const COLS = 20;
export const ROWS = 12;
export const MAP_H = ROWS * T;
/** 맵의 가로 크기. 데스크톱에서는 캔버스 너비와 같고, 모바일에서는 오른쪽에 SIDE_W 패널이 붙는다. */
export const W = COLS * T;
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
/** 테스트 모드(`?test`): MAX_WAVE 스테이지를 반복하며 미네랄을 제한 없이 사용한다. */
export const TEST_GOLD = Number.POSITIVE_INFINITY;
/** 지원 유닛(사이언스 베슬·옵저버)은 어느 특화를 골라도 지원 사거리가 같은 만큼 늘어난다. */
export const SUPPORT_BRANCH_RANGE = 45;

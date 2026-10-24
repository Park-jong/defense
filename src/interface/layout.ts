import { MAP_H, W } from '../data/rules';

export const SIDE_W = 320;
export const FONT = '"Malgun Gothic", system-ui, sans-serif';
export const TOP_BAR_H = 56;
/** 모바일 사이드 패널 맨 위에 HTML 상황판(operations.ts)이 차지하는 높이. 패널 내용은 이 아래부터 쌓는다. */
export const SIDE_RIBBON_H = 88;
/** 데스크톱에서 상단 바와 맵 사이의 전술 띠(HTML 상황판) 높이. 44px 버튼 + 패딩이 들어간다. */
export const RIBBON_BAND = 56;
/** 콘솔 골짜기 바닥(능선 y=82)과 맵 아래 가장자리(CONSOLE_RISE 32) 사이 거리: 맵 카메라가 맵 아래로 더 보여줄 높이. */
const VALLEY_DEPTH = 50;
export type LayoutMode = 'desktop' | 'mobile';
export interface LayoutConfig {
  readonly mobile: boolean;
  readonly mapY: number;
  /** 맵 카메라가 보여주는 높이: 맵 + (데스크톱) 콘솔 골짜기 아래로 이어지는 땅. */
  readonly viewH: number;
  readonly consoleY: number;
  readonly gameW: number;
  readonly height: number;
}

/** Build a layout without changing the active app or any battlefield. */
export function createLayoutConfig(mode: LayoutMode): LayoutConfig {
  const mobile = mode === 'mobile', mapY = mobile ? 0 : TOP_BAR_H + RIBBON_BAND;
  return { mobile, mapY, viewH: MAP_H + (mobile ? 0 : VALLEY_DEPTH), consoleY: mapY + MAP_H, gameW: mobile ? W + SIDE_W : W, height: mobile ? MAP_H : mapY + 800 };
}

// Selected once before Phaser boots; existing UI imports keep their live bindings.
const desktop = createLayoutConfig('desktop');
export let MOBILE_LAYOUT = desktop.mobile;
export let MAP_Y = desktop.mapY;
export let VIEW_H = desktop.viewH;
export let CONSOLE_Y = desktop.consoleY;
export let GAME_W = desktop.gameW;
export let H = desktop.height;

/** Canvas pixels per game coordinate, shared by cameras, text and input. */
export let RENDER_SCALE = 1;
export function setRenderScale(scale: number): void { RENDER_SCALE = scale; }

export function useMobileLayout(): void {
  const mobile = createLayoutConfig('mobile');
  MOBILE_LAYOUT = mobile.mobile;
  MAP_Y = mobile.mapY;
  VIEW_H = mobile.viewH;
  CONSOLE_Y = mobile.consoleY;
  GAME_W = mobile.gameW;
  H = mobile.height;
}

import { MAP_H, W } from '../data/rules';

export const SIDE_W = 320;
export const FONT = '"Malgun Gothic", system-ui, sans-serif';
export type LayoutMode = 'desktop' | 'mobile';
export interface LayoutConfig {
  readonly mobile: boolean;
  readonly mapY: number;
  readonly consoleY: number;
  readonly gameW: number;
  readonly height: number;
}

/** Build a layout without changing the active app or any battlefield. */
export function createLayoutConfig(mode: LayoutMode): LayoutConfig {
  const mobile = mode === 'mobile', mapY = mobile ? 0 : 56;
  return { mobile, mapY, consoleY: mapY + MAP_H, gameW: mobile ? W + SIDE_W : W, height: mobile ? MAP_H : 856 };
}

// Selected once before Phaser boots; existing UI imports keep their live bindings.
const desktop = createLayoutConfig('desktop');
export let MOBILE_LAYOUT = desktop.mobile;
export let MAP_Y = desktop.mapY;
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
  CONSOLE_Y = mobile.consoleY;
  GAME_W = mobile.gameW;
  H = mobile.height;
}

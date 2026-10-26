import { TOWER_KEYS, type TowerKey } from './data/units';

export interface PortraitAsset { portrait: string; icon: string }
let assets: Partial<Record<TowerKey, PortraitAsset>> = {};

/** Vite resolves the files in main; isolated simulation tests need no image loader. */
export function registerBishoujoPortraits(files: Record<string, string>): void {
  const next: Partial<Record<TowerKey, PortraitAsset>> = {};
  for (const key of TOWER_KEYS) {
    const portrait = files[`./assets/bishoujo/${key}.webp`];
    const icon = files[`./assets/bishoujo/${key}-icon.webp`];
    if (!portrait || !icon) throw new Error(`Missing bishoujo portrait assets: ${key}`);
    next[key] = { portrait, icon };
  }
  assets = next;
}

export const bishoujoPortraitAsset = (key: TowerKey): PortraitAsset | undefined => assets[key];

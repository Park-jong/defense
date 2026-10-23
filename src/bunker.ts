import type { TowerKey } from './config';

export const BUNKER_CAPACITY = 4;
export const BUNKER_RANGE_BONUS = 24;
export const BUNKER_INFANTRY = ['marine', 'firebat'] as const;
export type InfantryKey = typeof BUNKER_INFANTRY[number];
export const isInfantry = (key: TowerKey): key is InfantryKey => key === 'marine' || key === 'firebat';
// Each passenger fires from its own aperture, in world pixels relative to the bunker.
export const BUNKER_PORTS = [{ x: -18, y: -4 }, { x: 18, y: -4 }, { x: -12, y: 14 }, { x: 12, y: 14 }];

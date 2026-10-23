import type { TowerKey } from './config';

export const BUNKER_CAPACITY = 4;
export const BUNKER_RANGE_BONUS = 24;
export const BUNKER_INFANTRY = ['marine', 'firebat'] as const;
export type InfantryKey = typeof BUNKER_INFANTRY[number];
export const isInfantry = (key: TowerKey): key is InfantryKey => key === 'marine' || key === 'firebat';
// Each passenger fires from its own aperture, in world pixels relative to the bunker.
export const BUNKER_PORTS = [{ x: -14, y: 1 }, { x: 14, y: 1 }, { x: -8, y: 8 }, { x: 8, y: 8 }];
export const BUNKER_BARREL_LENGTH = 5;

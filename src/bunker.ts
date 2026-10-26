import type { TowerKey } from './data/units';

export const BUNKER_CAPACITY = 4;
export const BUNKER_RANGE_BONUS = 24;
export const BUNKER_INFANTRY = ['marine', 'firebat', 'ghost'] as const;
export type InfantryKey = typeof BUNKER_INFANTRY[number];
export const isInfantry = (key: TowerKey): key is InfantryKey => BUNKER_INFANTRY.some(unit => unit === key);
// Each passenger fires from its own aperture, in world pixels relative to the bunker.
// 5·6번 사격구는 요새화 증강으로 열린다.
export const BUNKER_PORTS = [{ x: -14, y: 1 }, { x: 14, y: 1 }, { x: -8, y: 8 }, { x: 8, y: 8 }, { x: -18, y: 9 }, { x: 18, y: 9 }];
export const BUNKER_BARREL_LENGTH = 5;

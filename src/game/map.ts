import { MAP_DEFS, type MapKey } from '../data/maps';
import { T } from '../data/rules';

export interface Point { readonly x: number; readonly y: number }
export interface MapRuntime {
  readonly key: MapKey;
  readonly mapY: number;
  readonly routes: readonly (readonly Point[])[];
  readonly waypoints: readonly Point[];
  readonly pathCells: ReadonlySet<string>;
}

/** Own routes and build restrictions per battlefield; mapY only offsets world coordinates. */
export function createMapRuntime(key: MapKey, mapY = 0): MapRuntime {
  const definition = MAP_DEFS[key];
  const routes = definition.routes.map(route => route.map(([c, r]) => ({ x: (c + .5) * T, y: mapY + (r + .5) * T })));
  const pathCells = new Set<string>();
  for (const route of definition.routes) for (let i = 1; i < route.length; i++) {
    const [ac, ar] = route[i - 1], [bc, br] = route[i];
    for (let c = Math.min(ac, bc); c <= Math.max(ac, bc); c++)
      for (let r = Math.min(ar, br); r <= Math.max(ar, br); r++) pathCells.add(`${c},${r}`);
  }
  return { key, mapY, routes, waypoints: routes[0], pathCells };
}

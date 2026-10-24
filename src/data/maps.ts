export interface MapDef {
  readonly name: string;
  readonly desc: string;
  readonly routes: readonly (readonly (readonly [number, number])[])[];
}

export const MAP_DEFS = {
  frontier: { name: '프런티어', desc: '긴 단일 진입로 · 기본 전장', routes: [[[-1, 2], [16, 2], [16, 5], [3, 5], [3, 9], [20, 9]]] },
  canyon: { name: '협곡', desc: '좁은 회랑과 네 번의 굴곡', routes: [[[-1, 1], [17, 1], [17, 4], [2, 4], [2, 7], [17, 7], [17, 10], [20, 10]]] },
  junction: { name: '합류 지대', desc: '두 진입로가 중앙에서 합류', routes: [[[-1, 1], [10, 1], [10, 5], [4, 5], [4, 9], [20, 9]], [[-1, 9], [1, 9], [1, 5], [4, 5], [4, 9], [20, 9]]] },
} as const satisfies Record<string, MapDef>;
export type MapKey = keyof typeof MAP_DEFS;

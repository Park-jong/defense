import type { Point } from './map';

/** Routes are immutable during a run; share their suffix lengths across every tower. */
export class RouteDistances {
  private routes = new WeakMap<readonly Point[], number[]>();
  private enemies = new WeakMap<object, { x: number; y: number; seg: number; route: readonly Point[]; distance: number }>();

  remaining(enemy: { x: number; y: number; seg: number }, route: readonly Point[]): number {
    const cached = this.enemies.get(enemy);
    if (cached && cached.x === enemy.x && cached.y === enemy.y && cached.seg === enemy.seg && cached.route === route) return cached.distance;
    let suffix = this.routes.get(route);
    if (!suffix) {
      suffix = new Array<number>(route.length).fill(0);
      for (let i = route.length - 2; i >= 0; i--) suffix[i] = suffix[i + 1] + Math.hypot(route[i + 1].x - route[i].x, route[i + 1].y - route[i].y);
      this.routes.set(route, suffix);
    }
    const seg = Math.min(enemy.seg, route.length - 1), next = route[seg];
    const distance = Math.hypot(next.x - enemy.x, next.y - enemy.y) + suffix[seg];
    this.enemies.set(enemy, { x: enemy.x, y: enemy.y, seg: enemy.seg, route, distance });
    return distance;
  }
}

/** Limits both live tween visuals and creation bursts, independently of combat state. */
export class VisualBudget {
  private active = 0;
  private emitted = 0;
  constructor(private limit = 128, private perFrame = 32) {}

  beginFrame(): void { this.emitted = 0; }

  acquire(): (() => void) | undefined {
    if (typeof document !== 'undefined' && document.hidden || this.active >= this.limit || this.emitted >= this.perFrame) return;
    this.active++; this.emitted++;
    let released = false;
    return () => { if (!released) { released = true; this.active--; } };
  }
}

import { MAP_H, T, W } from './data/rules';
import type { MapRuntime } from './game/map';

/** The relay yard is baked once; its route lights do not add work to the battle loop. */
export function drawJunction(ctx: CanvasRenderingContext2D, map: MapRuntime): void {
  ctx.save();
  let seed = 73019;
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  type Point = readonly [number, number];
  const line = (points: readonly Point[], color: string, width = 1) => {
    ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = width;
    points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
  };
  const ring = (x: number, y: number, radius: number, color: string, width = 1) => {
    ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = width;
    ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.stroke();
  };
  const floor = ctx.createLinearGradient(0, 0, W, MAP_H);
  floor.addColorStop(0, '#30434c'); floor.addColorStop(.5, '#29363e'); floor.addColorStop(1, '#1e2a31');
  ctx.fillStyle = floor; ctx.fillRect(0, 0, W, MAP_H);
  for (const [x, y, color] of [[170, 110, '#459da528'], [90, 460, '#c2944820']] as const) {
    const glow = ctx.createRadialGradient(x, y, 10, x, y, 330);
    glow.addColorStop(0, color); glow.addColorStop(1, '#00000000');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, MAP_H);
  }

  // Every free tile keeps visible seams and fasteners, including the painted service bays.
  for (let r = 0; r < MAP_H / T; r++) for (let c = 0; c < W / T; c++) {
    const x = c * T, y = r * T;
    ctx.fillStyle = rand() > .5 ? '#76909b09' : '#070f1612';
    ctx.fillRect(x + 2, y + 2, T - 4, T - 4);
    ctx.strokeStyle = '#0f1c2666'; ctx.lineWidth = 1; ctx.strokeRect(x + .5, y + .5, T - 1, T - 1);
    line([[x + 3, y + T - 4], [x + 3, y + 3], [x + T - 4, y + 3]], '#839ba51c');
    if (!map.pathCells.has(`${c},${r}`)) {
      for (const d of [6, T - 7]) {
        ctx.fillStyle = '#0f1d25'; ctx.fillRect(x + d, y + d, 2, 2);
        ctx.fillStyle = '#75899170'; ctx.fillRect(x + d, y + d, 1, 1);
      }
      if (rand() > .6) line([[x + 10, y + 34], [x + 15, y + 29], [x + 23, y + 29]], '#9babb515');
    }
  }

  // Recessed cable runs and flush vents suggest a working depot without hiding build cells.
  for (const [c, r, cols, color] of [[12, 2, 7, '#6db8bd'], [7, 7, 12, '#bfa566']] as const) {
    const x = c * T + 7, y = r * T + 8, w = cols * T - 14;
    ctx.fillStyle = '#0d1b24'; ctx.fillRect(x, y, w, 10);
    line([[x, y + 11], [x + w, y + 11]], '#6a839355');
    for (const d of [3, 6]) line([[x + 3, y + d], [x + w - 3, y + d]], color + '55');
    for (let dx = 12; dx < w; dx += T) {
      ctx.fillStyle = '#43565f'; ctx.fillRect(x + dx, y - 1, 4, 12);
      ctx.fillStyle = '#90a6ab'; ctx.fillRect(x + dx + 1, y, 2, 2);
    }
  }
  for (const [c, r] of [[2, 3], [7, 3], [13, 5], [18, 5], [7, 11], [16, 11]]) {
    const x = c * T + 9, y = r * T + 12;
    ctx.fillStyle = '#16252e'; ctx.fillRect(x, y, 30, 23);
    ctx.strokeStyle = '#60778270'; ctx.strokeRect(x + .5, y + .5, 30, 23);
    for (let dx = 4; dx < 28; dx += 4) {
      ctx.fillStyle = '#08151e'; ctx.fillRect(x + dx, y + 4, 2, 16);
      ctx.fillStyle = '#60798555'; ctx.fillRect(x + dx + 1, y + 4, 1, 15);
    }
  }

  // A worn convergence emblem replaces the frontier landing pad.
  ctx.save(); ctx.translate(15 * T, 4.6 * T);
  ring(0, 0, 67, '#95acb324', 2); ring(0, 0, 59, '#95acb314');
  ctx.setLineDash([2, 9]); ring(0, 0, 74, '#95acb32b', 3); ctx.setLineDash([]);
  line([[-33, -25], [-5, -25], [14, 0], [36, 0]], '#79c4cb38', 5);
  line([[-33, 25], [-5, 25], [14, 0]], '#e4bc7338', 5);
  line([[25, -11], [36, 0], [25, 11]], '#b9d8c943', 4);
  ctx.font = 'bold 16px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#a5b8be30';
  ctx.fillText('J-02', 0, 45); ctx.restore();

  // Paint all road beds before their lights, so overlapping routes have a single surface.
  const routes = map.routes.map(route => route.map(p => [p.x, p.y - map.mapY] as const));
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  for (const [color, width] of [['#0b151d', T + 8], ['#6a7d83', T + 1], ['#18252d', T - 5], ['#22323b', T - 12]] as const)
    for (const route of routes) line(route, color, width);

  // Transverse gratings and edge hazard marks remain quieter than units and projectiles.
  ctx.lineCap = 'butt';
  for (const cell of map.pathCells) {
    const [c, r] = cell.split(',').map(Number);
    const x = c * T, y = r * T;
    ctx.save(); ctx.beginPath(); ctx.rect(x + 4, y + 4, T - 8, T - 8); ctx.clip();
    const horizontal = map.pathCells.has(`${c - 1},${r}`) || map.pathCells.has(`${c + 1},${r}`);
    for (let d = 7; d < T; d += 6) {
      if (horizontal) line([[x + d, y + 4], [x + d, y + T - 4]], '#0a19264d');
      else line([[x + 4, y + d], [x + T - 4, y + d]], '#0a19264d');
    }
    ctx.restore();
    for (const [dc, dr] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      if (map.pathCells.has(`${c + dc},${r + dr}`)) continue;
      const xx = x + (dc < 0 ? 0 : dc > 0 ? T - 3 : 0), yy = y + (dr < 0 ? 0 : dr > 0 ? T - 3 : 0);
      ctx.fillStyle = '#b5a16b77';
      for (const d of [7, 29]) ctx.fillRect(xx + (dc ? 0 : d), yy + (dr ? 0 : d), dc ? 3 : 10, dr ? 3 : 10);
    }
  }

  // Split at the first shared waypoint: cyan and amber each become one mint exit lane.
  const mergeIndex = routes[0].findIndex(([x, y]) => routes[1].some(p => p[0] === x && p[1] === y));
  const merge = routes[0][mergeIndex];
  const lanes = routes.map((route, i) => ({
    points: route.slice(0, route.findIndex(p => p[0] === merge[0] && p[1] === merge[1]) + 1),
    color: i === 0 ? '#71d0dc' : '#e5b96c',
  }));
  lanes.push({ points: routes[0].slice(mergeIndex), color: '#b7d6bd' });
  for (const { points, color } of lanes) {
    ctx.lineCap = 'round'; line(points, color + '13', T - 17);
    ctx.lineCap = 'butt'; ctx.setLineDash([6, 10]); line(points, color + '55', 1.5); ctx.setLineDash([]);
    for (let i = 1; i < points.length; i++) {
      const [ax, ay] = points[i - 1], [bx, by] = points[i];
      const length = Math.hypot(bx - ax, by - ay), angle = Math.atan2(by - ay, bx - ax);
      ctx.save(); ctx.translate(ax, ay); ctx.rotate(angle);
      // Paired guide rails leave the center clear for marching enemies.
      for (const d of [-17, 17]) {
        line([[15, d], [length - 15, d]], '#081720', 4);
        line([[15, d], [length - 15, d]], color + '70', 1.5);
        for (let x = 36; x < length - 20; x += T * 2) line([[x, d], [x + 13, d]], color + 'cc', 2.5);
      }
      for (let x = T; x < length - 25; x += T * 2) {
        line([[x - 5, -5], [x, 0], [x - 5, 5]], color + '70', 2);
        line([[x + 1, -5], [x + 6, 0], [x + 1, 5]], color + '45', 1.5);
      }
      ctx.restore();
    }
  }

  // The merge switch fits inside its road tile; neighboring tiles remain visibly buildable.
  const [mx, my] = merge;
  ctx.fillStyle = '#13232d'; ctx.beginPath(); ctx.arc(mx, my, 22, 0, Math.PI * 2); ctx.fill();
  ring(mx, my, 21, '#91b6b9', 2); ring(mx, my, 17, '#4d6974');
  line([[mx + 13, my], [mx, my], [mx, my + 12]], '#71d0dc', 2.5);
  line([[mx - 13, my], [mx, my], [mx, my + 12]], '#e5b96c', 2.5);
  line([[mx - 4, my + 8], [mx, my + 12], [mx + 4, my + 8]], '#c5e3cb', 2);
  for (const [dx, dy] of [[-15, -15], [15, -15], [-15, 15], [15, 15]]) {
    ctx.fillStyle = '#d3e3d2'; ctx.fillRect(mx + dx - 1, my + dy - 1, 2, 2);
  }

  // Boundary armor and signal lamps frame the two approach sectors.
  for (const y of [0, MAP_H - 7]) {
    ctx.fillStyle = '#101d26'; ctx.fillRect(0, y, W, 7);
    for (let x = 12; x < W; x += T) {
      ctx.fillStyle = '#536973'; ctx.fillRect(x, y + 2, 20, 2);
      ctx.fillStyle = y === 0 ? '#71d0dc99' : '#e5b96c99'; ctx.fillRect(x + 23, y + 2, 4, 2);
    }
  }
  for (let i = 0; i < 16000; i++) {
    ctx.fillStyle = rand() > .5 ? '#c6d8dc0b' : '#020b1218';
    ctx.fillRect(rand() * W, rand() * MAP_H, 1 + rand() * 2, 1);
  }
  const shade = ctx.createRadialGradient(W * .45, MAP_H * .45, 150, W / 2, MAP_H / 2, W * .66);
  shade.addColorStop(0, '#00000000'); shade.addColorStop(1, '#030c1866');
  ctx.fillStyle = shade; ctx.fillRect(0, 0, W, MAP_H);
  ctx.restore();
}

import { MAP_DEFS } from './data/maps';
import { MAP_H, T, W } from './data/rules';
import type { MapRuntime } from './game/map';

/** Baked once into the battlefield texture; no per-frame terrain drawing. */
export function drawCanyon(ctx: CanvasRenderingContext2D, map: MapRuntime): void {
  let seed = 28041;
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const polygon = (points: readonly (readonly [number, number])[], color: string) => {
    ctx.beginPath();
    points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.closePath(); ctx.fillStyle = color; ctx.fill();
  };
  const line = (points: readonly (readonly [number, number])[], color: string, width = 1) => {
    ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = width;
    points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.stroke();
  };
  const floor = ctx.createLinearGradient(0, 0, W, MAP_H);
  floor.addColorStop(0, '#553d32'); floor.addColorStop(.5, '#76503c'); floor.addColorStop(1, '#412e2b');
  ctx.fillStyle = floor; ctx.fillRect(0, 0, W, MAP_H);

  // Wind-cut strata run across the rock, instead of the other fields' steel plates.
  for (let y = -10; y < MAP_H; y += 8 + rand() * 12) {
    const points: [number, number][] = [];
    for (let x = -10; x <= W + 20; x += 24) points.push([x, y + Math.sin(x / 85 + y) * 5 + rand() * 4]);
    line(points, rand() > .5 ? '#ba795527' : '#281e2448', 1 + rand() * 3);
  }

  // A continuous sandy riverbed makes all four switchbacks readable at a glance.
  for (const route of map.routes) {
    const points = route.map(p => [p.x, p.y - map.mapY] as const);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    line(points, '#241d22', T + 12);
    line(points, '#a16e47', T + 3);
    line(points, '#b68a59', T - 5);
    line(points, '#c29b68', T - 14);
    line(points, '#d5b47a55', T - 29);
  }
  ctx.lineJoin = 'miter'; ctx.lineCap = 'butt';

  for (let r = 0; r < MAP_H / T; r++) for (let c = 0; c < W / T; c++) {
    const x = c * T, y = r * T, path = map.pathCells.has(`${c},${r}`);
    if (path) {
      // Small transverse sand ripples and parallel wheel tracks stay under enemies.
      for (let i = 0; i < 7; i++) {
        const xx = x + 4 + rand() * 35, yy = y + 4 + rand() * 37;
        line([[xx, yy], [xx + 4 + rand() * 8, yy - 1]], '#76553630');
      }
      const horizontal = map.pathCells.has(`${c - 1},${r}`) && map.pathCells.has(`${c + 1},${r}`);
      const vertical = map.pathCells.has(`${c},${r - 1}`) && map.pathCells.has(`${c},${r + 1}`);
      ctx.setLineDash([3, 5]);
      for (const d of [-9, 9]) {
        if (horizontal) line([[x, y + T / 2 + d], [x + T, y + T / 2 + d]], '#654c3638');
        if (vertical) line([[x + T / 2 + d, y], [x + T / 2 + d, y + T]], '#654c3638');
      }
      ctx.setLineDash([]);
    } else {
      ctx.strokeStyle = '#e5b37c14'; ctx.lineWidth = 1; ctx.strokeRect(x + .5, y + .5, T - 1, T - 1);
      if (rand() > .45 && !map.highGroundCells.has(`${c},${r}`)) {
        const xx = x + 8 + rand() * 25, yy = y + 12 + rand() * 23, size = 4 + rand() * 7;
        polygon([[xx - size, yy + 2], [xx - 3, yy - size], [xx + size, yy - 3], [xx + size + 3, yy + 4], [xx, yy + 7]], '#34282a');
        polygon([[xx - size, yy], [xx - 3, yy - size], [xx + size, yy - 3], [xx + 1, yy + 2]], '#aa704e');
        line([[xx - size, yy], [xx - 3, yy - size], [xx + size, yy - 3]], '#d39a61', 1);
      }
    }
  }

  // Three low mesas sit entirely inside buildable cells. Their faces never hide the road.
  for (const [c, r, cols, rows] of MAP_DEFS.canyon.highGround.areas) {
    const x = c * T, y = r * T, w = cols * T, h = rows * T;
    const rim: [number, number][] = [[x + 2, y + 14], [x + 13, y + 5]];
    for (let dx = 30; dx < w - 15; dx += 22) rim.push([x + dx, y + 3 + rand() * 7]);
    rim.push([x + w - 10, y + 6], [x + w - 3, y + 20], [x + w - 5, y + h - 26]);
    for (let dx = w - 14; dx > 12; dx -= 22) rim.push([x + dx, y + h - 22 + rand() * 5]);
    rim.push([x + 6, y + h - 24], [x + 2, y + 14]);
    polygon(rim.map(([xx, yy]) => [xx + 3, yy + 20]), '#261e25');
    for (let layer = 15; layer >= 0; layer -= 3) {
      const colors = ['#bc8055', '#6c3d30', '#9d5b3f', '#59352f', '#a86c48', '#7c4835'];
      polygon(rim.map(([xx, yy]) => [xx, yy + layer]), colors[layer / 3]);
    }
    const top = ctx.createLinearGradient(x, y, x, y + h);
    top.addColorStop(0, '#bf8a5b'); top.addColorStop(1, '#956440');
    ctx.save();
    ctx.beginPath(); rim.forEach(([xx, yy], i) => i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy)); ctx.closePath(); ctx.clip();
    ctx.fillStyle = top; ctx.fillRect(x, y, w, h);
    for (let i = 0; i < 160; i++) {
      ctx.fillStyle = rand() > .5 ? '#f2c99322' : '#402d2e22';
      ctx.fillRect(x + rand() * w, y + rand() * h, 2 + rand() * 5, 1 + rand() * 2);
    }
    for (let dx = 20; dx < w; dx += 45 + rand() * 45) {
      line([[x + dx, y], [x + dx - 8, y + 13], [x + dx + 2, y + 21], [x + dx - 2, y + 28]], '#65432e70');
    }
    ctx.restore();
    line(rim, '#ecc28a99', 1.5);
    // Corner ticks and a small double-chevron identify every tile receiving the bonus.
    for (let dc = 0; dc < cols; dc++) for (let dr = 0; dr < rows; dr++) {
      if (!map.highGroundCells.has(`${c + dc},${r + dr}`)) continue;
      const xx = x + dc * T, yy = y + dr * T;
      ctx.strokeStyle = '#f5d79d70'; ctx.lineWidth = 1;
      for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
        const tx = xx + T / 2 + sx * 17, ty = yy + T / 2 + sy * 12;
        line([[tx - sx * 5, ty], [tx, ty], [tx, ty - sy * 4]], '#f5d79d70');
      }
      line([[xx + 19, yy + 19], [xx + 24, yy + 15], [xx + 29, yy + 19]], '#f5d79d95', 1.4);
      line([[xx + 19, yy + 24], [xx + 24, yy + 20], [xx + 29, yy + 24]], '#f5d79d75', 1.4);
    }
  }

  // Eroded boundary shelves frame the canyon without occupying additional cells.
  for (const y of [-27, MAP_H - 9]) {
    const edge: [number, number][] = [[-10, y - 20], [W + 10, y - 20], [W + 10, y + 27]];
    for (let x = W + 10; x >= -20; x -= 19) edge.push([x, y + 16 + rand() * 14]);
    polygon(edge.map(([x, yy]) => [x, yy + 8]), '#241c25');
    polygon(edge, '#815039');
    line(edge.slice(2), '#d4915977', 2);
  }

  // Sparse dry scrub and bleached bones; kept outside roads and the marked high ground.
  for (const [c, r] of [[1, 3], [15, 3], [4, 6], [19, 5], [1, 8], [15, 9], [3, 10], [18, 2]]) {
    const x = (c + .5) * T, y = (r + .5) * T;
    ctx.fillStyle = '#241e2444'; ctx.beginPath(); ctx.ellipse(x + 5, y + 8, 17, 5, 0, 0, Math.PI * 2); ctx.fill();
    line([[x - 4, y + 9], [x + 1, y - 6], [x - 1, y - 18]], '#c09869', 2.5);
    line([[x, y], [x - 10, y - 6], [x - 13, y - 13]], '#aa8055', 2);
    line([[x, y - 3], [x + 10, y - 10], [x + 12, y - 17]], '#aa8055', 2);
  }
  ctx.save(); ctx.translate(56, 5.5 * T); ctx.rotate(-.25);
  line([[-19, 0], [21, 0]], '#d6bd8e', 2);
  for (let x = -13; x < 17; x += 6) {
    ctx.strokeStyle = '#cdb386'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, 0, 4, 10 - Math.abs(x) * .25, 0, -.5 * Math.PI, .5 * Math.PI); ctx.stroke();
  }
  polygon([[22, -5], [33, -4], [37, 2], [25, 5], [19, 2]], '#d6bd8e');
  ctx.fillStyle = '#513d30'; ctx.fillRect(29, -2, 3, 2); ctx.restore();

  // Fine grain is baked, so the terrain has texture at every display scale.
  for (let i = 0; i < 19000; i++) {
    ctx.fillStyle = rand() > .5 ? '#ffe0a614' : '#1b172319';
    ctx.fillRect(rand() * W, rand() * MAP_H, 1 + rand() * 2, 1);
  }
  const light = ctx.createRadialGradient(W * .4, MAP_H * .3, 80, W / 2, MAP_H / 2, W * .64);
  light.addColorStop(0, '#efb76a08'); light.addColorStop(1, '#16152378');
  ctx.fillStyle = light; ctx.fillRect(0, 0, W, MAP_H);
}

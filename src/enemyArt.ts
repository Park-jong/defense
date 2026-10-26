import type Phaser from 'phaser';
import type { EnemyKey } from './data/enemies';

export const ENEMY_FRAME_SIZE = 160;
export const ENEMY_FRAME_COUNT = 8;
/** Visual dimensions and stride lengths only; collision radii and combat rules live in enemies.ts. */
export const ENEMY_ART: Record<EnemyKey, { cell: number; size: number; stride: number; gait: number }> = {
  grunt: { cell: 0, size: 44, stride: 22, gait: 5 },
  runner: { cell: 1, size: 43, stride: 28, gait: 7 },
  tank: { cell: 2, size: 54, stride: 30, gait: 2.5 },
  boss: { cell: 3, size: 82, stride: 42, gait: 3 },
  medic: { cell: 4, size: 61, stride: 28, gait: 4 },
  splitter: { cell: 5, size: 50, stride: 25, gait: 3 },
  shielder: { cell: 6, size: 64, stride: 27, gait: 4 },
};

const portraits = new Map<EnemyKey, string>();
export const enemyPortraitUrl = (key: EnemyKey): string => portraits.get(key) ?? '';

/** Precompute the walking frames once, so large swarms only change a frame index while moving. */
export function createEnemyArt(scene: Phaser.Scene): void {
  const source = scene.textures.get('zerg:atlas').getSourceImage() as HTMLImageElement;
  const cellW = source.width / 4, cellH = source.height / 2, size = ENEMY_FRAME_SIZE;
  for (const type of Object.keys(ENEMY_ART) as EnemyKey[]) {
    const key = 'enemy_' + type, art = ENEMY_ART[type];
    if (scene.textures.exists(key)) continue;
    const tile = document.createElement('canvas');
    tile.width = cellW; tile.height = cellH;
    const ctx = tile.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(source, art.cell % 4 * cellW, Math.floor(art.cell / 4) * cellH, cellW, cellH, 0, 0, cellW, cellH);
    // Center on the alpha bounds, not the uneven whitespace around generated atlas cells.
    const pixels = ctx.getImageData(0, 0, tile.width, tile.height).data;
    let left = tile.width, top = tile.height, right = -1, bottom = -1;
    for (let y = 0; y < tile.height; y++) for (let x = 0; x < tile.width; x++) {
      if (pixels[(y * tile.width + x) * 4 + 3] < 24) continue;
      left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
    }
    if (right < left) throw new Error('Empty Zerg atlas cell: ' + type);
    const sw = right - left + 1, sh = bottom - top + 1;
    const scale = size * .8 / Math.max(sw, sh), w = sw * scale, h = sh * scale;
    const body = document.createElement('canvas'); body.width = body.height = size;
    const bodyCtx = body.getContext('2d')!;
    bodyCtx.filter = 'brightness(1.2) saturate(.9)';
    bodyCtx.drawImage(tile, left, top, sw, sh, (size - w) / 2, (size - h) / 2, w, h);
    portraits.set(type, body.toDataURL('image/webp', .9));
    const texture = scene.textures.createCanvas(key, size * ENEMY_FRAME_COUNT, size)!;
    const target = texture.context;
    for (let frame = 0; frame < ENEMY_FRAME_COUNT; frame++) {
      const phase = frame / ENEMY_FRAME_COUNT * Math.PI * 2, origin = frame * size;
      target.save();
      target.translate(origin + size / 2, size / 2);
      target.fillStyle = 'rgba(7, 3, 10, .3)';
      target.beginPath(); target.ellipse(0, 5, w * .4, h * .31, 0, 0, Math.PI * 2); target.fill();
      target.rotate(Math.sin(phase) * (type === 'runner' ? .035 : .012));
      // The long defiler sends a gentle travelling wave down its segmented body.
      if (type === 'shielder') for (let x = 0; x < size; x += 2) {
        const wave = Math.sin(phase + x * .065) * art.gait * (1 - x / size);
        target.drawImage(body, x, 0, 2, size, x - size / 2, -size / 2 + wave, 2.15, size);
      }
      // Keep the spine stable; sweep the peripheral leg bands in alternating steps.
      else for (let y = 0; y < size; y += 2) {
        const edge = Math.min(1, Math.max(0, (Math.abs(y - size / 2) - h * .16) / (h * .3)));
        const offset = Math.sin(phase + (y < size / 2 ? 0 : Math.PI)) * art.gait * edge;
        const breathe = 1 + Math.cos(phase * 2) * (type === 'splitter' ? .018 : .006);
        target.drawImage(body, 0, y, size, 2, -size / 2 + offset, (y - size / 2) * breathe, size, 2 * breathe + .15);
      }
      target.restore();
      texture.add(frame, 0, origin, 0, size, size);
    }
    texture.refresh();
  }
}

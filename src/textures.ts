import Phaser from 'phaser';
import { ENEMY_DEFS, T, TOWER_DEFS, pathCells } from './config';

/** 외부 이미지 없이 코드로 모든 텍스처를 생성한다. */
export function makeTextures(scene: Phaser.Scene): void {
  const tex = (key: string, w: number, h: number, fn: (g: Phaser.GameObjects.Graphics) => void) => {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    fn(g);
    g.generateTexture(key, w, h);
    g.destroy();
  };

  tex('grass0', T, T, g => { g.fillStyle(0x2f552d).fillRect(0, 0, T, T); g.fillStyle(0x3a6637).fillRect(8, 10, 3, 3).fillRect(30, 32, 3, 3); });
  tex('grass1', T, T, g => { g.fillStyle(0x335a30).fillRect(0, 0, T, T); g.fillStyle(0x3d6b3a).fillRect(34, 8, 3, 3).fillRect(12, 34, 3, 3); });
  tex('path', T, T, g => { g.fillStyle(0xc2a878).fillRect(0, 0, T, T); g.fillStyle(0xb39a6b).fillRect(10, 14, 4, 4).fillRect(32, 30, 5, 4).fillRect(24, 8, 3, 3); });
  tex('spark', 8, 8, g => g.fillStyle(0xffffff).fillCircle(4, 4, 4));
  tex('proj', 10, 10, g => g.fillStyle(0xffffff).fillCircle(5, 5, 5));

  for (const [k, d] of Object.entries(TOWER_DEFS)) {
    tex('base_' + k, T, T, g => {
      g.fillStyle(0x263238).fillRect(4, 4, T - 8, T - 8);
      g.fillStyle(d.color).fillCircle(T / 2, T / 2, 16);
      g.lineStyle(2, 0x000000, .35).strokeCircle(T / 2, T / 2, 16);
    });
    tex('barrel_' + k, d.barrel + 4, 8, g => {
      g.fillStyle(0xeceff1).fillRoundedRect(0, 0, d.barrel, k === 'cannon' ? 8 : 6, 2);
    });
  }

  for (const [k, d] of Object.entries(ENEMY_DEFS)) {
    const s = d.r * 2 + 6, c = s / 2;
    tex('enemy_' + k, s, s, g => {
      g.fillStyle(d.color).fillCircle(c, c, d.r);
      g.lineStyle(2, 0x000000, .4).strokeCircle(c, c, d.r);
      g.fillStyle(0xffffff).fillCircle(c + d.r * .35, c - d.r * .25, d.r * .22).fillCircle(c + d.r * .35, c + d.r * .3, d.r * .22);
      g.fillStyle(0x000000).fillCircle(c + d.r * .42, c - d.r * .25, d.r * .1).fillCircle(c + d.r * .42, c + d.r * .3, d.r * .1);
    });
  }
}

/** 지형 타일을 깔아 맵 배경을 만든다. */
export function drawMap(scene: Phaser.Scene, cols: number, rows: number): void {
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      scene.add.image(c * T, r * T, pathCells.has(c + ',' + r) ? 'path' : 'grass' + ((c + r) % 2)).setOrigin(0);
}

import Phaser from 'phaser';
import { ENEMY_DEFS, FONT, MAP_H, MAP_Y, T, W, WP, pathCells } from './config';

/** All art is generated locally: no image downloads or external assets. */
export function makeTextures(scene: Phaser.Scene): void {
  const tex = (key: string, w: number, h: number, fn: (g: Phaser.GameObjects.Graphics) => void) => {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    fn(g); g.generateTexture(key, w, h); g.destroy();
  };
  tex('spark', 8, 8, g => g.fillStyle(0xffffff).fillRect(2, 2, 4, 4));
  tex('bunker_muzzle', 32, 24, g => {
    // Pointed orange flame with a white-hot core, anchored at the firing aperture.
    g.fillStyle(0xff752b, .18).fillEllipse(11, 12, 25, 21);
    g.fillStyle(0xff8135, .9).fillPoints([{ x: 0, y: 10 }, { x: 7, y: 8 }, { x: 16, y: 3 }, { x: 14, y: 9 }, { x: 30, y: 12 }, { x: 14, y: 15 }, { x: 18, y: 21 }, { x: 7, y: 16 }, { x: 0, y: 14 }], true);
    g.fillStyle(0xffd36d).fillPoints([{ x: 0, y: 10 }, { x: 8, y: 10 }, { x: 17, y: 7 }, { x: 14, y: 11 }, { x: 23, y: 12 }, { x: 13, y: 14 }, { x: 17, y: 17 }, { x: 7, y: 14 }, { x: 0, y: 14 }], true);
    g.fillStyle(0xfff3ca).fillTriangle(0, 10, 14, 12, 0, 14);
  });
  tex('shot_arrow', 22, 10, g => {
    g.fillStyle(0xffb554, .2).fillEllipse(6, 5, 12, 8);
    g.fillStyle(0xffbd64).fillTriangle(1, 5, 9, 2, 9, 8);
    g.fillStyle(0xfff4c1).fillTriangle(4, 5, 10, 3, 10, 7);
    g.fillStyle(0xc9d4c2).fillRect(9, 3, 8, 4);
    g.fillStyle(0x737f6f).fillRect(10, 6, 7, 1);
    g.fillStyle(0xc25b43).fillTriangle(17, 3, 22, 5, 17, 7);
    g.fillStyle(0x81927d).fillTriangle(10, 3, 8, 0, 14, 3).fillTriangle(10, 7, 8, 10, 14, 7);
  });
  tex('shot_cannon', 18, 12, g => {
    g.fillStyle(0xff923e, .15).fillEllipse(8, 6, 17, 12);
    g.fillStyle(0xff923e, .4).fillEllipse(10, 6, 12, 8);
    g.fillStyle(0xffe6a3).fillEllipse(12, 6, 8, 5);
    g.fillStyle(0xffffff).fillEllipse(14, 6, 4, 3);
  });
  for (const [key, radius] of [['frost', 6]] as const) {
    const size = radius * 4, c = size / 2;
    tex('shot_' + key, size, size, g => {
      for (let r = radius * 2; r > 0; r -= 2) g.fillStyle(0x449eff, .04 + (1 - r / (radius * 2)) * .09).fillCircle(c, c, r);
      g.fillStyle(0x3c91e9, .7).fillCircle(c, c, radius);
      g.fillStyle(0x8ceaff).fillCircle(c, c, radius * .7);
      g.fillStyle(0xf0ffff).fillCircle(c + 1, c - 1, radius * .4);
      g.lineStyle(1, 0xd8ffff, .8).strokeCircle(c, c, radius + 1);
    });
  }
  tex('dragoon_charge', 48, 48, g => {
    for (let r = 22; r > 2; r -= 2) g.fillStyle(0x398dff, .035 + (1 - r / 22) * .06).fillCircle(24, 24, r);
    g.lineStyle(1.2, 0x6aceff, .8).lineBetween(11, 15, 17, 11).lineBetween(17, 11, 21, 16)
      .lineBetween(29, 12, 36, 18).lineBetween(36, 18, 31, 23).lineBetween(14, 29, 20, 35).lineBetween(20, 35, 25, 30);
    g.fillStyle(0x377ee9, .7).fillCircle(24, 24, 10);
    g.fillStyle(0x8de5ff).fillCircle(24, 24, 6);
    g.fillStyle(0xf0ffff).fillCircle(24, 24, 3.5);
  });
  tex('shot_sniper', 48, 32, g => {
    g.fillStyle(0x3d8fff, .18).fillTriangle(1, 16, 25, 6, 25, 26);
    g.fillStyle(0x83dfff, .45).fillTriangle(7, 16, 24, 12, 24, 20);
    for (let r = 15; r > 2; r -= 2) g.fillStyle(0x398dff, .035 + (1 - r / 15) * .07).fillCircle(25, 16, r);
    g.fillStyle(0x356fdf, .85).fillCircle(25, 16, 8);
    g.fillStyle(0x6bd6ff).fillCircle(25, 16, 5.5);
    g.fillStyle(0xf1ffff).fillCircle(26, 15, 3.5);
    g.lineStyle(1, 0xc0f4ff, .9).lineBetween(15, 9, 20, 6).lineBetween(20, 6, 23, 10)
      .lineBetween(30, 7, 35, 12).lineBetween(35, 12, 31, 17).lineBetween(18, 23, 24, 26).lineBetween(24, 26, 28, 22);
  });
  tex('shot_marine', 18, 6, g => {
    g.fillStyle(0xffd571, .25).fillEllipse(8, 3, 16, 6);
    g.fillStyle(0xffedac).fillRect(4, 2, 10, 2);
    g.fillStyle(0xffffff).fillRect(12, 2, 5, 2);
  });
  tex('shot_firebat', 30, 24, g => {
    g.fillStyle(0xff5b29, .12).fillEllipse(15, 12, 30, 24);
    g.fillStyle(0xff813a, .55).fillEllipse(16, 12, 24, 18);
    g.fillStyle(0xffc15a, .85).fillEllipse(20, 12, 16, 12);
    g.fillStyle(0xffe4a1).fillEllipse(23, 12, 9, 7);
  });
  tex('shot_templar', 24, 24, g => {
    g.fillStyle(0xb98cff, .15).fillCircle(12, 12, 12);
    g.fillStyle(0xa684e9, .5).fillCircle(12, 12, 8);
    g.lineStyle(2, 0xe5d6ff).lineBetween(4, 12, 10, 8).lineBetween(10, 8, 14, 15).lineBetween(14, 15, 21, 11);
    g.fillStyle(0xffffff).fillCircle(12, 12, 3);
  });
  tex('shot_cruiser', 26, 12, g => {
    g.fillStyle(0xff735b, .2).fillEllipse(13, 6, 26, 12);
    g.fillStyle(0xff9276, .7).fillRoundedRect(3, 3, 20, 6, 3);
    g.fillStyle(0xffe1c3).fillRoundedRect(12, 4, 12, 4, 2);
  });
  for (const [k, d] of Object.entries(ENEMY_DEFS)) {
    const s = d.r * 2 + 12, c = s / 2, r = d.r;
    tex('enemy_' + k, s, s, g => {
      g.fillStyle(0x000000, .4).fillEllipse(c + 2, c + 4, r * 2 + 5, r * 1.5);
      const armor = k === 'boss' ? 0x735280 : k === 'tank' ? 0x88684f : k === 'runner' ? 0x967644 : 0x7d4c4b;
      for (const sign of [-1, 1]) {
        for (let j = 0; j < 3; j++) {
          const yy = c - r * .6 + j * r * .6;
          g.lineStyle(k === 'boss' ? 3 : 2, 0x312d2b).lineBetween(c - r * .3, yy, c - r * .6, yy + sign * r);
          g.lineStyle(2, armor).lineBetween(c - r * .6, yy + sign * r, c + r * .5, yy + sign * r * .75);
        }
      }
      g.fillStyle(0x30272b).fillEllipse(c - 2, c, r * 1.8, r * 1.5);
      g.fillStyle(armor).fillEllipse(c - 3, c - 2, r * 1.5, r * 1.25);
      g.lineStyle(1, 0xc5a48a, .5).strokeEllipse(c - 3, c - 2, r * 1.5, r * 1.25);
      g.lineStyle(2, 0x3c3037).lineBetween(c - r, c - 1, c + 3, c - 1);
      g.fillStyle(0x493240).fillTriangle(c + 1, c - r * .6, c + r + 3, c, c + 1, c + r * .6);
      g.fillStyle(0xffa36c).fillCircle(c + r * .5, c - 3, 2).fillCircle(c + r * .5, c + 3, 2);
      if (k === 'boss') g.lineStyle(3, 0xbda8bf).lineBetween(c + 10, c - 9, c + 22, c - 15).lineBetween(c + 10, c + 9, c + 22, c + 15);
    });
  }
  tex('portrait', 100, 116, g => {
    g.fillStyle(0x0b1b15).fillRect(0, 0, 100, 116);
    g.lineStyle(1, 0x345942, .5);
    for (let x = 10; x < 100; x += 12) g.lineBetween(x, 0, x, 116);
    for (let y = 8; y < 116; y += 12) g.lineBetween(0, y, 100, y);
    g.fillStyle(0x263d32).fillEllipse(50, 114, 110, 60);
    g.fillStyle(0x587057).fillPoints([{x:14,y:111},{x:22,y:87},{x:39,y:80},{x:65,y:80},{x:83,y:92},{x:90,y:116}], true);
    g.fillStyle(0x182b22).fillRect(29, 82, 45, 34);
    g.fillStyle(0x637c5f).fillRoundedRect(24, 15, 54, 72, 18);
    g.fillStyle(0x344d3d).fillRect(21, 37, 61, 30);
    g.fillStyle(0x13291e).fillRoundedRect(30, 39, 43, 23, 6);
    g.fillStyle(0x9ad27b).fillRect(34, 42, 34, 5);
    g.fillStyle(0x557d4c).fillRect(34, 47, 34, 8);
    g.lineStyle(2, 0x99b484).lineBetween(33, 22, 63, 22).lineBetween(22, 69, 34, 80).lineBetween(78, 69, 66, 80);
    g.fillStyle(0x152a20).fillRect(38, 69, 27, 12);
    g.fillStyle(0x91a984).fillRect(41, 72, 4, 5).fillRect(49, 72, 4, 5).fillRect(57, 72, 4, 5);
    g.fillStyle(0x7ec66b).fillCircle(77, 58, 3);
    g.lineStyle(2, 0x809675).lineBetween(79, 56, 87, 71).lineBetween(87, 71, 69, 75);
    for (let y = 0; y < 116; y += 3) g.fillStyle(0x000000, .18).fillRect(0, y, 100, 1);
  });
}

export function drawMap(scene: Phaser.Scene, cols: number, rows: number): void {
  const key = 'battlefield';
  if (!scene.textures.exists(key)) {
    const texture = scene.textures.createCanvas(key, W, MAP_H)!;
    const ctx = texture.context;
    let seed = 842;
    const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    ctx.fillStyle = '#343b37'; ctx.fillRect(0, 0, W, MAP_H);
    for (let i = 0; i < 42000; i++) {
      const light = rand() > .5;
      ctx.fillStyle = light ? 'rgba(153,159,137,.055)' : 'rgba(0,0,0,.10)';
      ctx.fillRect(rand() * W, rand() * MAP_H, 1 + rand() * 4, 1 + rand() * 3);
    }
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = c * T, y = r * T, path = pathCells.has(c + ',' + r);
      if (path) {
        ctx.fillStyle = '#202827'; ctx.fillRect(x, y, T, T);
        ctx.fillStyle = '#303a36'; ctx.fillRect(x + 2, y + 2, T - 4, T - 4);
        for (let i = 5; i < T; i += 6) { ctx.fillStyle = '#252e2b'; ctx.fillRect(x + 3, y + i, T - 6, 2); }
        ctx.fillStyle = '#50564a';
        const sides = [[-1,0],[1,0],[0,-1],[0,1]];
        sides.forEach(([dc, dr]) => {
          if (!pathCells.has((c + dc) + ',' + (r + dr))) {
            const xx = dc < 0 ? x : dc > 0 ? x + T - 3 : x;
            const yy = dr < 0 ? y : dr > 0 ? y + T - 3 : y;
            ctx.fillRect(xx, yy, dc ? 3 : T, dr ? 3 : T);
            ctx.fillStyle = '#a49b5c';
            if (dc) { ctx.fillRect(xx, y + 5, 2, 9); ctx.fillRect(xx, y + 30, 2, 9); }
            else { ctx.fillRect(x + 5, yy, 9, 2); ctx.fillRect(x + 30, yy, 9, 2); }
            ctx.fillStyle = '#50564a';
          }
        });
      } else {
        ctx.strokeStyle = 'rgba(16,24,20,.24)'; ctx.strokeRect(x + .5, y + .5, T - 1, T - 1);
        if (rand() > .72) {
          ctx.fillStyle = 'rgba(106,116,91,.1)'; ctx.fillRect(x + 3, y + 3, T - 6, T - 6);
          ctx.fillStyle = '#4d5647'; ctx.fillRect(x + 6, y + 6, 2, 2); ctx.fillRect(x + T - 8, y + T - 8, 2, 2);
        }
        if (rand() > .7) {
          ctx.strokeStyle = '#252f28'; ctx.beginPath(); ctx.moveTo(x + 7, y + 38); ctx.lineTo(x + 18, y + 26); ctx.lineTo(x + 16, y + 17); ctx.lineTo(x + 28, y + 8); ctx.stroke();
        }
      }
    }
    const shade = ctx.createRadialGradient(W / 2, MAP_H / 2, 100, W / 2, MAP_H / 2, W * .65);
    shade.addColorStop(0, 'rgba(0,0,0,0)'); shade.addColorStop(1, 'rgba(3,10,7,.45)');
    ctx.fillStyle = shade; ctx.fillRect(0, 0, W, MAP_H);
    texture.refresh();
  }
  scene.add.image(0, MAP_Y, key).setOrigin(0);
  const g = scene.add.graphics();
  // Landing-zone markings and a powered exit gate.
  g.lineStyle(1, 0x859274, .2).strokeCircle(480, MAP_Y + 357, 59).strokeCircle(480, MAP_Y + 357, 66);
  g.lineBetween(410, MAP_Y + 357, 550, MAP_Y + 357).lineBetween(480, MAP_Y + 287, 480, MAP_Y + 427);
  scene.add.text(480, MAP_Y + 347, 'F-07', { fontFamily: 'monospace', fontSize: '24px', color: '#6b7560' }).setOrigin(.5).setAlpha(.35);
  const label = (x: number, y: number, text: string, color: string) => scene.add.text(x, y, text, {fontFamily: FONT, fontSize: '10px', color}).setDepth(2);
  label(16, MAP_Y + 83, '▶  적 진입', '#c1a271');
  label(W - 103, MAP_Y + 493, '방어선  ▶', '#a7cd8d');
  for (const x of [W - 40, W - 12]) {
    g.fillStyle(0x141d1b).fillRect(x, WP[WP.length - 1].y - 33, 10, 66);
    g.fillStyle(0x89bf78).fillRect(x + 3, WP[WP.length - 1].y - 22, 3, 44);
  }
  g.lineStyle(2, 0x090f0c).strokeRect(1, MAP_Y + 1, W - 2, MAP_H - 2);
}

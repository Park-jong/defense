import Phaser from 'phaser';
import { FONT, RENDER_SCALE } from './config';
import { COMMAND_ACTIVE_CURSOR } from './cursors';
import { themeTexture, isBishoujo, THEME_CHANGED } from './themes';

export interface Btn {
  enabled: boolean;
  set(label: string): void;
  en(v: boolean): void;
  act(v: boolean): void;
  show(v: boolean): void;
}

/** tap: 누르는 순간이 아니라, 거의 움직이지 않고 손을 뗐을 때 실행한다 (밀어서 넘기는 목록 안의 버튼용). */
export function mkBtn(scene: Phaser.Scene, x: number, y: number, w: number, h: number,
                      label: string, cb: () => void, size = 14, icon?: string, opts: { tap?: boolean } = {}): Btn {
  const frame = scene.add.graphics().setDepth(30);
  const hit = scene.add.zone(x, y, w, h).setOrigin(0).setDepth(33)
    .setInteractive({ cursor: COMMAND_ACTIVE_CURSOR });
  const tx = scene.add.text(x + w / 2, y + (icon ? h - 23 : h / 2), label,
    { fontFamily: FONT, fontSize: size + 'px', color: '#c5ccb7', align: 'center', lineSpacing: 4 }).setOrigin(.5).setDepth(32);
  const art = icon ? scene.add.image(x + w / 2, y + 28, themeTexture('unit_' + icon)).setDepth(31) : null;
  // 낮은 버튼(모바일 패널)에서는 아래 이름표와 겹치지 않도록 그림을 줄인다.
  art?.setScale(Math.min(.82, (h - 40) / art.height));
  let active = false, hover = false, visible = true;
  const paint = () => {
    frame.clear();
    frame.fillStyle(0x090d0e).fillRect(x, y, w, h);
    frame.fillStyle(isBishoujo() ? active ? 0x57406c : hover && b.enabled ? 0x483452 : 0x30273f : active ? 0x243a2b : hover && b.enabled ? 0x303b39 : 0x202729).fillRect(x + 2, y + 2, w - 4, h - 4);
    frame.lineStyle(1, isBishoujo() ? active ? 0xf2b9de : hover ? 0xc4a1d5 : 0x856b99 : active ? 0x9bd66c : hover ? 0x81947d : 0x515b57).strokeRect(x + 2, y + 2, w - 4, h - 4);
    frame.lineStyle(1, 0x6c7566, .4).lineBetween(x + 4, y + 4, x + w - 5, y + 4);
    frame.lineStyle(2, 0x0a1110).lineBetween(x + 4, y + h - 4, x + w - 4, y + h - 4);
    if (active) frame.fillStyle(0xa9e875).fillRect(x + 5, y + 8, 2, h - 16);
    tx.setColor(isBishoujo() ? active ? '#ffd4ef' : b.enabled ? '#e8d8f2' : '#a394af' : active ? '#cbf59b' : b.enabled ? '#c5ccb7' : '#7d8982');
    frame.setAlpha(b.enabled ? 1 : .55);
    art?.setAlpha(b.enabled ? 1 : .4);
  };
  const b: Btn = {
    enabled: true,
    set: l => { if (tx.text !== l) tx.setText(l); },
    en: v => { if (b.enabled !== v) { b.enabled = v; paint(); } },
    act: v => { if (active !== v) { active = v; paint(); } },
    show: v => {
      if (visible === v) return;
      visible = v;
      frame.setVisible(v); tx.setVisible(v); art?.setVisible(v);
      hit.setVisible(v); if (v) hit.setInteractive({ cursor: COMMAND_ACTIVE_CURSOR }); else hit.disableInteractive();
    },
  };
  hit.on('pointerover', () => { hover = true; paint(); });
  hit.on('pointerout', () => { hover = false; paint(); });
  // getDistance()는 캔버스 픽셀 단위라 렌더 배율을 곱해 게임 좌표 기준 12px로 맞춘다.
  if (opts.tap) hit.on('pointerup', (p: Phaser.Input.Pointer) => { if (b.enabled && p.getDistance() < 12 * RENDER_SCALE) cb(); });
  else hit.on('pointerdown', () => { if (b.enabled) cb(); });
  paint();
  window.addEventListener(THEME_CHANGED, paint);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => window.removeEventListener(THEME_CHANGED, paint));
  return b;
}

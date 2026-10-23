import Phaser from 'phaser';
import { FONT } from './config';

export interface Btn {
  enabled: boolean;
  set(label: string): void;
  en(v: boolean): void;
  act(v: boolean): void;
  show(v: boolean): void;
}

export function mkBtn(scene: Phaser.Scene, x: number, y: number, w: number, h: number,
                      label: string, cb: () => void, size = 14, icon?: string): Btn {
  const frame = scene.add.graphics().setDepth(30);
  const hit = scene.add.zone(x, y, w, h).setOrigin(0).setDepth(33)
    .setInteractive({ useHandCursor: true });
  const tx = scene.add.text(x + w / 2, y + (icon ? h - 23 : h / 2), label,
    { fontFamily: FONT, fontSize: size + 'px', color: '#c5ccb7', align: 'center', lineSpacing: 4 }).setOrigin(.5).setDepth(32);
  const art = icon ? scene.add.image(x + w / 2, y + 28, 'unit_' + icon).setScale(.82).setDepth(31) : null;
  let active = false, hover = false, visible = true;
  const paint = () => {
    frame.clear();
    frame.fillStyle(0x090d0e).fillRect(x, y, w, h);
    frame.fillStyle(active ? 0x243a2b : hover && b.enabled ? 0x303b39 : 0x202729).fillRect(x + 2, y + 2, w - 4, h - 4);
    frame.lineStyle(1, active ? 0x9bd66c : hover ? 0x81947d : 0x515b57).strokeRect(x + 2, y + 2, w - 4, h - 4);
    frame.lineStyle(1, 0x6c7566, .4).lineBetween(x + 4, y + 4, x + w - 5, y + 4);
    frame.lineStyle(2, 0x0a1110).lineBetween(x + 4, y + h - 4, x + w - 4, y + h - 4);
    if (active) frame.fillStyle(0xa9e875).fillRect(x + 5, y + 8, 2, h - 16);
    tx.setColor(active ? '#cbf59b' : b.enabled ? '#c5ccb7' : '#7d8982');
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
      hit.setVisible(v); if (v) hit.setInteractive({ useHandCursor: true }); else hit.disableInteractive();
    },
  };
  hit.on('pointerover', () => { hover = true; paint(); });
  hit.on('pointerout', () => { hover = false; paint(); });
  hit.on('pointerdown', () => { if (b.enabled) cb(); });
  paint();
  return b;
}

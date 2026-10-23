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
                      label: string, cb: () => void, size = 14): Btn {
  const bg = scene.add.rectangle(x, y, w, h, 0x27313e).setOrigin(0).setStrokeStyle(2, 0x2c3644)
    .setInteractive({ useHandCursor: true }).setDepth(30);
  const tx = scene.add.text(x + w / 2, y + h / 2, label,
    { fontFamily: FONT, fontSize: size + 'px', color: '#e6edf3', align: 'center' }).setOrigin(.5).setDepth(31);
  const b: Btn = {
    enabled: true,
    set: l => { if (tx.text !== l) tx.setText(l); },
    en: v => { if (b.enabled === v) return; b.enabled = v; bg.setAlpha(v ? 1 : .45); tx.setAlpha(v ? 1 : .45); },
    act: v => { bg.setStrokeStyle(2, v ? 0x4fc3f7 : 0x2c3644); bg.setFillStyle(v ? 0x1e3a4d : 0x27313e); },
    show: v => { bg.setVisible(v); tx.setVisible(v); if (v) bg.setInteractive(); else bg.disableInteractive(); },
  };
  bg.on('pointerdown', () => { if (b.enabled) cb(); });
  return b;
}

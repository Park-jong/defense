import type Phaser from 'phaser';
import { FONT, RENDER_SCALE } from './config';

export interface UnitCommand {
  id: string; title: string; detail: string; texture: string; enabled: boolean;
  price?: number; active?: boolean; badge?: string; progress?: number; hotkey?: string;
  run(): void;
}

/** A fixed nine-cell command grid. Callbacks always read the current cell, never an old selection. */
export class CommandCard {
  private slots: { command?: UnitCommand; signature: string; render(): void }[] = [];
  private hovered = -1;

  constructor(scene: Phaser.Scene, x: number, y: number, w: number, h: number,
    private describe: (command?: UnitCommand) => void, labels = false) {
    const gap = 4, cw = (w - gap * 2) / 3, ch = (h - gap * 2) / 3;
    for (let i = 0; i < 9; i++) {
      const left = x + i % 3 * (cw + gap), top = y + Math.floor(i / 3) * (ch + gap);
      const frame = scene.add.graphics().setDepth(30);
      const art = scene.add.image(left + cw / 2, top + (labels ? 20 : ch / 2 - 3), 'cmd_empty')
        .setDisplaySize(labels ? 32 : 30, labels ? 32 : 30).setDepth(31);
      const label = scene.add.text(left + cw / 2, top + ch - 7, '', { fontFamily: FONT, fontSize: '9px', color: '#c6d8b4' }).setOrigin(.5).setDepth(32);
      const price = scene.add.text(left + cw - 3, top + ch - (labels ? 18 : 10), '', { fontFamily: FONT, fontSize: '8px', color: '#b5e1e6' }).setOrigin(1, 0).setDepth(32);
      const badge = scene.add.text(left + cw - 3, top + 2, '', { fontFamily: 'monospace', fontSize: '8px', color: '#d5eea2' }).setOrigin(1, 0).setDepth(32);
      const hotkey = scene.add.text(left + 4, top + 2, '', { fontFamily: 'monospace', fontSize: '8px', color: '#eadc8f' }).setDepth(32);
      const hit = scene.add.zone(left, top, cw, ch).setOrigin(0).setDepth(33).setInteractive({ useHandCursor: true });
      let pressed: string | undefined;
      const slot = { command: undefined as UnitCommand | undefined, signature: '', render: () => {
        const c = slot.command, bright = c && (c.enabled || c.active);
        frame.clear().fillStyle(0x070d0c).fillRect(left, top, cw, ch);
        frame.fillStyle(c?.active ? 0x273d2a : this.hovered === i ? 0x304039 : 0x182421).fillRect(left + 2, top + 2, cw - 4, ch - 4);
        frame.lineStyle(1, c?.active ? 0xb6db75 : this.hovered === i ? 0x99b18a : 0x4c5e53).strokeRect(left + 1, top + 1, cw - 2, ch - 2);
        frame.lineStyle(1, 0x93a58b, .3).lineBetween(left + 3, top + 3, left + cw - 4, top + 3);
        if (c?.progress !== undefined) frame.fillStyle(0x99d481, .8).fillRect(left + 3, top + ch - 3, (cw - 6) * Math.max(0, Math.min(1, c.progress)), 2);
        art.setVisible(!!c).setAlpha(bright ? 1 : .32);
        if (c && art.texture.key !== c.texture) art.setTexture(c.texture);
        label.setText(labels && c ? c.title : '').setAlpha(bright ? 1 : .5);
        price.setText(c?.price !== undefined ? '◆' + c.price : '').setAlpha(bright ? 1 : .5);
        badge.setText(c?.badge ?? ''); hotkey.setText(c?.hotkey ?? '');
      } };
      hit.on('pointerover', () => { this.hovered = i; slot.render(); this.describe(slot.command); });
      hit.on('pointerout', () => { if (this.hovered === i) this.hovered = -1; slot.render(); this.describe(); });
      hit.on('pointerdown', (p: Phaser.Input.Pointer) => { if (p.button === 0) pressed = slot.command?.id; });
      hit.on('pointerup', (p: Phaser.Input.Pointer) => {
        if (p.button === 0 && p.getDistance() < 12 * RENDER_SCALE && pressed && pressed === slot.command?.id && slot.command.enabled) slot.command.run();
        pressed = undefined;
      });
      this.slots.push(slot); slot.render();
    }
  }

  update(commands: (UnitCommand | undefined)[]): void {
    this.slots.forEach((slot, i) => {
      const command = commands[i];
      const signature = command ? [command.id, command.title, command.detail, command.texture, command.enabled, command.price, command.active, command.badge, command.progress, command.hotkey].join('|') : '';
      slot.command = command;
      if (slot.signature !== signature) { slot.signature = signature; slot.render(); }
    });
    this.describe(this.slots[this.hovered]?.command);
  }
}

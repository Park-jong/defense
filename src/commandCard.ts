import type Phaser from 'phaser';
import { FONT, RENDER_SCALE } from './config';
import { COMMAND_ACTIVE_CURSOR } from './cursors';
import { isBishoujo, themeTexture } from './themes';
import { MOE_CHARACTERS } from './moeCharacters';
import type { TowerKey } from './data/units';

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
    private describe: (command?: UnitCommand) => void, labels = false, iconSize = labels ? 32 : 30) {
    const gap = 4, cw = (w - gap * 2) / 3, ch = (h - gap * 2) / 3;
    for (let i = 0; i < 9; i++) {
      const left = x + i % 3 * (cw + gap), top = y + Math.floor(i / 3) * (ch + gap);
      const frame = scene.add.graphics().setDepth(30);
      const art = scene.add.image(left + cw / 2, top + (labels ? 20 : ch / 2 - 3), 'cmd_empty')
        .setDisplaySize(iconSize, iconSize).setDepth(31);
      const portraitMask = scene.make.graphics({ x: 0, y: 0 });
      portraitMask.fillStyle(0xffffff).fillRect(left + 3, top + 3, cw - 6, ch - 6);
      art.setMask(portraitMask.createGeometryMask());
      scene.events.once('shutdown', () => portraitMask.destroy());
      const identity = scene.add.graphics().setDepth(31.5);
      const crest = scene.add.text(left + cw - 5, top + 3, '', { fontFamily: FONT, fontSize: '12px', color: '#ffffff', stroke: '#161025', strokeThickness: 3 }).setOrigin(1, 0).setDepth(32);
      const label = scene.add.text(left + cw / 2, top + ch - 7, '', { fontFamily: FONT, fontSize: '9px', color: '#c6d8b4' }).setOrigin(.5).setDepth(32);
      const price = scene.add.text(left + cw - 3, top + ch - (labels ? 18 : 10), '', { fontFamily: FONT, fontSize: '8px', color: '#b5e1e6' }).setOrigin(1, 0).setDepth(32);
      const badge = scene.add.text(left + cw - 3, top + 2, '', { fontFamily: 'monospace', fontSize: '8px', color: '#d5eea2' }).setOrigin(1, 0).setDepth(32);
      const hotkey = scene.add.text(left + 4, top + 2, '', { fontFamily: 'monospace', fontSize: '8px', color: '#eadc8f' }).setDepth(32);
      const hit = scene.add.zone(left, top, cw, ch).setOrigin(0).setDepth(33).setInteractive({ cursor: COMMAND_ACTIVE_CURSOR });
      let pressed: string | undefined;
      const slot = { command: undefined as UnitCommand | undefined, signature: '', render: () => {
        const c = slot.command, bright = c && (c.enabled || c.active);
        const unitKey = c?.texture.replace(/^bishoujo:/, '').match(/^unit_(.+)$/)?.[1] as TowerKey | undefined;
        const character = isBishoujo() && unitKey ? MOE_CHARACTERS[unitKey] : undefined;
        frame.clear().fillStyle(0x070d0c).fillRect(left, top, cw, ch);
        frame.fillStyle(isBishoujo() ? c?.active ? 0x57406c : this.hovered === i ? 0x483452 : 0x28233d : c?.active ? 0x273d2a : this.hovered === i ? 0x304039 : 0x182421).fillRect(left + 2, top + 2, cw - 4, ch - 4);
        frame.lineStyle(1, isBishoujo() ? c?.active ? 0xf2b9de : 0x9273a6 : c?.active ? 0xb6db75 : this.hovered === i ? 0x99b18a : 0x4c5e53).strokeRect(left + 1, top + 1, cw - 2, ch - 2);
        frame.lineStyle(1, 0x93a58b, .3).lineBetween(left + 3, top + 3, left + cw - 4, top + 3);
        if (c?.progress !== undefined) frame.fillStyle(0x99d481, .8).fillRect(left + 3, top + ch - 3, (cw - 6) * Math.max(0, Math.min(1, c.progress)), 2);
        art.setVisible(!!c).setAlpha(bright ? 1 : .32);
        if (c && art.texture.key !== themeTexture(c.texture)) art.setTexture(themeTexture(c.texture));
        art.setDisplaySize(character ? Math.max(cw, ch) - 6 : iconSize, character ? Math.max(cw, ch) - 6 : iconSize)
          .setPosition(left + cw / 2, character ? top + ch / 2 + Math.max(0, cw - ch) * .25 : top + (labels ? 20 : ch / 2 - 3));
        identity.clear();
        if (character) {
          const accent = parseInt(character.color.slice(1), 16);
          identity.fillStyle(accent, c?.active ? 1 : .85).fillRect(left + 2, top + 2, 3, ch - 4);
          identity.fillStyle(0x151022, .85).fillRect(left + 3, top + ch - 12, cw - 6, 9);
          identity.lineStyle(c?.active ? 2 : 1, accent, c?.active ? 1 : .5).strokeRect(left + 1, top + 1, cw - 2, ch - 2);
          identity.fillStyle(0x151022, .8).fillRoundedRect(left + cw - 20, top + 2, 17, 17, 3);
        }
        crest.setText(character?.mark ?? '').setColor(character?.color ?? '#ffffff');
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
      const signature = command ? [command.id, command.title, command.detail, themeTexture(command.texture), command.enabled, command.price, command.active, command.badge, command.progress, command.hotkey].join('|') : String(isBishoujo());
      slot.command = command;
      if (slot.signature !== signature) { slot.signature = signature; slot.render(); }
    });
    this.describe(this.slots[this.hovered]?.command);
  }
}

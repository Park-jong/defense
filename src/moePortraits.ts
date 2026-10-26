import type Phaser from 'phaser';
import type { TowerKey } from './data/units';
import { MOE_ROSTER } from './moeCharacters';

let atlasUrl = '';
const portraits = new Map<TowerKey, string>();
const ready = new WeakSet<Phaser.Textures.TextureManager>();
export const registerMoeAtlas = (url: string): void => { atlasUrl = url; };
export const moePortraitUrl = (key: TowerKey): string | undefined => portraits.get(key);
export const hasMoeAtlas = (): boolean => !!atlasUrl;

/** Measured cell interiors of the approved 1024 × 1536 concept sheet (excluding separators). */
export function moePortraitCrop(index: number, width: number, height: number) {
  const columns = [[0, 342], [345, 681], [685, 1024]];
  const rows = [[0, 239], [241, 476], [479, 716], [718, 970], [973, 1228], [1230, 1536]];
  const [left, right] = columns[index % 3];
  const [top, bottom] = rows[Math.floor(index / 3)];
  const w = (right - left) * width / 1024, h = (bottom - top) * height / 1536;
  const size = Math.min(w, h) - 4;
  return { x: left * width / 1024 + (w - size) / 2, y: top * height / 1536 + (h - size) / 2, size };
}

export function loadMoeAtlas(scene: Phaser.Scene): void {
  if (atlasUrl && !scene.textures.exists('moe:roster')) scene.load.image('moe:roster', atlasUrl);
}

/** Keep the source atlas intact; crop square icons without stretching rectangular cells. */
export function createMoePortraits(scene: Phaser.Scene): void {
  if (!scene.textures.exists('moe:roster') || ready.has(scene.textures)) return;
  const source = scene.textures.get('moe:roster').getSourceImage() as HTMLImageElement;
  MOE_ROSTER.forEach((key, i) => {
    const textureKey = 'bishoujo:unit_' + key;
    if (scene.textures.exists(textureKey)) scene.textures.remove(textureKey);
    const texture = scene.textures.createCanvas(textureKey, 384, 384)!;
    const { x, y, size } = moePortraitCrop(i, source.width, source.height);
    texture.context.drawImage(source, x, y, size, size, 0, 0, 384, 384);
    texture.refresh();
    portraits.set(key, texture.canvas.toDataURL('image/webp', .88));
  });
  if (scene.textures.exists('bishoujo:portrait')) scene.textures.remove('bishoujo:portrait');
  const commander = scene.textures.createCanvas('bishoujo:portrait', 384, 384)!;
  commander.context.drawImage(scene.textures.get('bishoujo:unit_marine').getSourceImage() as HTMLCanvasElement, 0, 0);
  commander.refresh();
  ready.add(scene.textures);
}

import type Phaser from 'phaser';
import type { TowerKey } from './data/units';
import { MOE_ROSTER } from './moeCharacters';

let atlasUrl = '';
const portraits = new Map<TowerKey, string>();
const ready = new WeakSet<Phaser.Textures.TextureManager>();
export const registerMoeAtlas = (url: string): void => { atlasUrl = url; };
export const moePortraitUrl = (key: TowerKey): string | undefined => portraits.get(key);
export const hasMoeAtlas = (): boolean => !!atlasUrl;

export function loadMoeAtlas(scene: Phaser.Scene): void {
  if (atlasUrl && !scene.textures.exists('moe:roster')) scene.load.image('moe:roster', atlasUrl);
}

/** Slice only at runtime; preserve the generated atlas as the original source asset. */
export function createMoePortraits(scene: Phaser.Scene): void {
  if (!scene.textures.exists('moe:roster') || ready.has(scene.textures)) return;
  const source = scene.textures.get('moe:roster').getSourceImage() as HTMLImageElement;
  const width = source.width / 3, height = source.height / 6;
  MOE_ROSTER.forEach((key, i) => {
    const textureKey = 'bishoujo:unit_' + key;
    if (scene.textures.exists(textureKey)) scene.textures.remove(textureKey);
    const texture = scene.textures.createCanvas(textureKey, 384, 384)!;
    texture.context.drawImage(source, i % 3 * width, Math.floor(i / 3) * height, width, height, 0, 0, 384, 384);
    texture.refresh();
    portraits.set(key, texture.canvas.toDataURL('image/webp', .88));
  });
  if (scene.textures.exists('bishoujo:portrait')) scene.textures.remove('bishoujo:portrait');
  const commander = scene.textures.createCanvas('bishoujo:portrait', 384, 384)!;
  commander.context.drawImage(scene.textures.get('bishoujo:unit_marine').getSourceImage() as HTMLCanvasElement, 0, 0);
  commander.refresh();
  ready.add(scene.textures);
}

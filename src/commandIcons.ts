import type Phaser from 'phaser';
import { SKILL_DEFS, SKILL_KEYS } from './catalog';

const glyphs: Record<string, string> = {
  upgrade: '<path d="M14 19 32 10l18 9-3 24-15 12-15-12Z" fill="#53737a"/><path d="m22 30 10-9 10 9m-20 9 10-9 10 9"/>',
  sell: '<path d="M13 38h13l6 7h15l6-6-3-4H38l-5-6H16Z" fill="#a5b87d"/><path d="M14 47h12m15-30v12m-8-6h16"/><circle cx="41" cy="23" r="13" fill="none"/>',
  manage: '<path d="M12 14h40v37H12Z" fill="#344d43"/><path d="M20 23h5m7 0h12m-24 9h5m7 0h12m-24 9h5m7 0h12"/>',
  cancel: '<path d="M13 18h38v31H13Z" fill="#494346"/><path d="m23 24 18 18m0-18L23 42"/>',
  unload: '<path d="M13 14h25v36H13Z" fill="#3c525b"/><path d="M24 33h30M44 23l10 10-10 10"/>',
  empty: '<path d="M14 16h36v35H14Z" fill="#293f38" stroke-dasharray="4 3"/><path d="M22 33h20M32 23v20"/>',
  barrage: '<path d="m14 43 9-22 7 3-8 22Zm17-2 9-23 7 3-8 23Z" fill="#ce9c58"/><path d="m18 46-3 6m22-7-3 7"/>',
  overdrive: '<path d="m15 15 15 17-15 17m19-34 15 17-15 17"/><path d="m32 11-5 18h10l-5 24"/>',
  siege: '<circle cx="32" cy="32" r="18" fill="#724531"/><circle cx="32" cy="32" r="9" fill="#e7b35a"/><path d="M32 7v11m0 28v11M7 32h11m28 0h11"/>',
  shrapnel: '<path d="m32 11 5 14 15-5-8 13 11 10-17-1-6 13-5-14-15 4 9-13-8-10 15 2Z" fill="#b38b55"/>',
  freeze: '<path d="M32 10v44M13 21l38 22M13 43l38-22M26 13l6 6 6-6m-12 38 6-6 6 6M14 28l8-2-2-8m24 28-2-8 8-2M14 36l8 2-2 8m24-28-2 8 8 2"/>',
  nova: '<circle cx="32" cy="32" r="9" fill="#d0faff"/><ellipse cx="32" cy="32" rx="24" ry="13" fill="none"/><ellipse cx="32" cy="32" rx="13" ry="24" fill="none"/>',
  plasma: '<path d="m32 9 18 23-18 23-18-23Z" fill="#436f9c"/><path d="m32 21 8 11-8 11-8-11Z" fill="#e2ffff"/>',
  chain: '<path d="m15 15 14 7-7 12 18-6-4 16 14 5"/><circle cx="14" cy="14" r="5" fill="#d3e7ff"/><circle cx="50" cy="49" r="5" fill="#d3e7ff"/>',
  stim: '<path d="m22 43 20-24 7 6-20 24Z" fill="#77a8a0"/><path d="m39 14 15 13M25 40l-9 11m-3 3 6-7M22 26h12m-6-6v12m4 2 5 4"/>',
  burst: '<path d="M14 18h8l3 6v24H11V24Zm19 0h8l3 6v24H30V24Zm16 8h6v22h-6Z" fill="#d5bb72"/><path d="M12 40h12m7 0h12"/>',
  inferno: '<path d="M32 9c4 15 18 16 17 30-1 20-34 22-35 1-1-9 7-14 9-23 5 6 4 11 5 15 6-5 6-13 4-23Z" fill="#e88d49"/><path d="M32 31c12 13 7 23 0 23-9 0-13-11 0-23Z" fill="#fff0a0"/>',
  ignite: '<path d="m20 15 11-4 14 29-10 6Z" fill="#bf6f45"/><path d="m24 24 12-5m-7 15 12-5m-9 20-7 5m15-7 1 10m6-15 8 3"/>',
  storm: '<circle cx="32" cy="32" r="23" fill="#204974"/><path d="m33 8-15 26h14l-3 23 19-29H34l5-20Z" fill="#c9ffff"/>',
  warp: '<circle cx="32" cy="32" r="7" fill="#d0ffff"/><path d="M15 23q17-22 34 0M15 41q17 22 34 0M9 16v12h12m34 20V36H43"/>',
  yamato: '<circle cx="38" cy="32" r="16" fill="#aa5d36"/><circle cx="38" cy="32" r="8" fill="#ffecae"/><path d="M8 24h14M6 32h16M8 40h14m24-25 7-6m-7 40 7 6"/>',
  bombard: '<path d="m13 14 9-3 6 20-9 3Zm23 4 9-3 6 20-9 3Z" fill="#c58b67"/><path d="m17 40 4 4-7 10m26-11 4 4-7 9m-8-20 3 6"/>',
};

const urls = new Map<string, string>();

/** The command panel and DOM garrison share the same icon artwork. */
export function commandIconUrl(key: string): string {
  if (urls.has(key)) return urls.get(key)!;
  const color = SKILL_KEYS.includes(key as typeof SKILL_KEYS[number])
    ? '#' + SKILL_DEFS[key as typeof SKILL_KEYS[number]].color.toString(16).padStart(6, '0') : '#b9d39a';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><defs><radialGradient id="bg"><stop stop-color="${color}" stop-opacity=".23"/><stop offset="1" stop-color="#07100e"/></radialGradient></defs><rect x="1" y="1" width="62" height="62" rx="3" fill="url(#bg)"/><g stroke="${color}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" fill="none">${glyphs[key] ?? glyphs.empty}</g></svg>`;
  const url = 'data:image/svg+xml;base64,' + btoa(svg);
  urls.set(key, url);
  return url;
}

export function loadCommandIcons(scene: Phaser.Scene): void {
  for (const key of Object.keys(glyphs)) scene.load.svg('cmd_' + key, commandIconUrl(key));
}

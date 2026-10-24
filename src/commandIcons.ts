import type Phaser from 'phaser';
import { SKILL_DEFS, SKILL_KEYS } from './catalog';

const glyphs: Record<string, string> = {
  terran: '<path d="M12 15h40v10H38v27H26V25H12Z" fill="#648d82"/><path d="M8 11h48M21 55h22M17 31l-6 7 10 9m26-16 6 7-10 9"/>',
  protoss: '<path d="m32 7 8 15 13 8-13 5-8 22-8-22-13-5 13-8Z" fill="#a57f36"/><path d="m32 14 5 15-5 19-5-19Z" fill="#b9efff"/><path d="M16 12 9 27l8 17m31-32 7 15-8 17"/>',
  upgrade: '<path d="M14 19 32 10l18 9-3 24-15 12-15-12Z" fill="#53737a"/><path d="m22 30 10-9 10 9m-20 9 10-9 10 9"/>',
  sell: '<path d="M13 38h13l6 7h15l6-6-3-4H38l-5-6H16Z" fill="#a5b87d"/><path d="M14 47h12m15-30v12m-8-6h16"/><circle cx="41" cy="23" r="13" fill="none"/>',
  manage: '<circle cx="32" cy="32" r="23" fill="#203c31"/><circle cx="32" cy="32" r="13"/><path d="M32 9v23l15 15M9 32h9m28 0h9M32 46v9"/><circle cx="23" cy="24" r="3" fill="#b9d39a"/>',
  deploy: '<path d="m24 14 26 18-26 18Z" fill="#b9d39a"/><path d="M14 19v26"/>',
  resume: '<path d="M13 23a22 22 0 1 1 1 23M9 11v14h14"/><path d="m28 22 15 10-15 10Z" fill="#b9d39a"/>',
  close: '<path d="m20 20 24 24m0-24L20 44"/>',
  flag: '<path d="M17 55V12m1 1c12-10 20 10 32 0v25c-12 10-20-10-32 0" fill="#476957"/>',
  tactics: '<circle cx="32" cy="32" r="18"/><circle cx="32" cy="32" r="5" fill="#b9d39a"/><path d="M32 7v13m0 24v13M7 32h13m24 0h13"/>',
  stats: '<path d="m15 14 35 36m0-36L15 50M11 43l10 10m22 0 10-10M13 9l10 5-9 9-5-10Zm38 0-10 5 9 9 5-10Z" fill="#8eaa72"/>',
  codex: '<path d="M32 17c-7-6-16-7-24-5v37c8-2 17-1 24 5 7-6 16-7 24-5V12c-8-2-17-1-24 5Z" fill="#344d43"/><path d="M32 17v37M15 22l10 3m-10 7 10 3m14-10 10-3m-10 13 10-3"/>',
  medal: '<path d="m17 9 9 20h12L47 9H36l-4 11-4-11Z" fill="#648d82"/><circle cx="32" cy="41" r="15" fill="#9b7c3e"/><path d="m32 31 3 6 7 1-5 5 1 7-6-4-6 4 1-7-5-5 7-1Z" fill="#e2cf91"/>',
  volume: '<path d="M11 25h10l13-12v38L21 39H11Z" fill="#476957"/><path d="M42 23a15 15 0 0 1 0 18m6-26a25 25 0 0 1 0 34"/>',
  saved: '<path d="M15 12h34v40H15Z" fill="#344d43"/><path d="M23 12v14h18V12m-17 29 6 6 12-14"/>',
  move: '<path d="M32 9v46M9 32h46M23 18l9-9 9 9M23 46l9 9 9-9M18 23l-9 9 9 9m28-18 9 9-9 9"/>',
  shield: '<path d="m32 9 21 8-3 22-18 16-18-16-3-22Z" fill="#476957"/><path d="m22 31 7 7 14-15"/>',
  weak: '<path d="m32 9 21 8-3 22-18 16-18-16-3-22Z" fill="#476957"/><path d="m34 13-7 15 11 5-9 17"/>',
  boss: '<path d="m11 19 12 10 9-17 9 17 12-10-5 28H16Z" fill="#9b7c3e"/><path d="M17 53h30M25 38h14"/>',
  first: '<path d="M12 19h22M12 32h36M12 45h22m4-23 10 10-10 10M54 15v34"/>',
  range: '<circle cx="32" cy="32" r="9"/><path d="M18 10h-8v8m36-8h8v8M10 46v8h8m36-8v8h-8M32 13v7m0 24v7M13 32h7m24 0h7"/>',
  repair: '<path d="m32 9 21 8-3 22-18 16-18-16-3-22Z" fill="#476957"/><path d="M32 22v20M22 32h20"/>',
  endless: '<path d="M32 32c-7-14-23-15-23 0s16 14 23 0 23-15 23 0-16 14-23 0Z"/>',
  mineral: '<path d="m24 10 17 2 13 19-20 24L10 33Z" fill="#537f86"/><path d="m24 10-2 22 12 23 7-43M10 33l12-1 32-1"/>',
  help: '<circle cx="32" cy="32" r="23"/><path d="M24 23c0-12 21-12 18 1-1 5-10 5-10 14m0 7v2"/>',
  skip: '<path d="m14 17 20 15-20 15Zm18 0 20 15-20 15Z" fill="#648d82"/><path d="M55 17v30"/>',
  lock: '<path d="M17 28h30v25H17Z" fill="#344d43"/><path d="M22 28V18a10 10 0 0 1 20 0v10M32 38v6"/>',
  clock: '<circle cx="32" cy="32" r="23"/><path d="M32 17v16l11 7"/>',
  strike: '<path d="m35 12 17 17-9 3-8-8Z" fill="#ce9c58"/><path d="m35 24-17 17 5 5 17-17M13 35l-3 13 6 6 13-3M10 56l-4 2m29-13 6 6M18 24l-6-6"/>',
  slow: '<path d="M19 11h26M19 53h26M22 11v9c0 6 20 18 20 24v9M42 11v9c0 6-20 18-20 24v9"/><path d="m25 17 7 9 7-9m-14 31 7-9 7 9" fill="#77a8a0"/>',
  supply: '<path d="M10 25a22 22 0 0 1 44 0Z" fill="#53737a"/><path d="M22 25c0-12 4-22 10-22s10 10 10 22M10 25l15 15m29-15L39 40M22 25l7 15m13-15-7 15"/><path d="M22 40h20v16H22Z" fill="#a5b87d"/><path d="M32 40v16m-10-8h20"/>',
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

const aliases: Record<string, string> = {
  lockdown: 'freeze', c10: 'siege', hellfire: 'barrage', autocannon: 'burst',
  psiBlades: 'shrapnel', zeal: 'overdrive', psionicStorm: 'storm', khaydarin: 'plasma',
  scarab: 'siege', scarabUpgrade: 'upgrade', scoutVolley: 'bombard', photonDrive: 'overdrive',
  interceptors: 'barrage', carrierCapacity: 'warp',
};

const urls = new Map<string, string>();

/** The command panel and DOM garrison share the same icon artwork. */
export function commandIconUrl(key: string): string {
  if (urls.has(key)) return urls.get(key)!;
  const color = SKILL_KEYS.includes(key as typeof SKILL_KEYS[number])
    ? '#' + SKILL_DEFS[key as typeof SKILL_KEYS[number]].color.toString(16).padStart(6, '0') : '#b9d39a';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><defs><radialGradient id="bg"><stop stop-color="${color}" stop-opacity=".23"/><stop offset="1" stop-color="#07100e"/></radialGradient></defs><rect x="1" y="1" width="62" height="62" rx="3" fill="url(#bg)"/><g stroke="${color}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" fill="none">${glyphs[key] ?? glyphs[aliases[key]] ?? glyphs.empty}</g></svg>`;
  const url = 'data:image/svg+xml;base64,' + btoa(svg);
  urls.set(key, url);
  return url;
}

export function loadCommandIcons(scene: Phaser.Scene): void {
  for (const key of [...Object.keys(glyphs), ...Object.keys(aliases)]) scene.load.svg('cmd_' + key, commandIconUrl(key));
}

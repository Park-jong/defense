import type { TowerKey } from './data/units';

interface Hero { hair: string; shade: string; accent: string; style: 'twin' | 'long' | 'bob'; gear: 'rifle' | 'cannon' | 'orb' | 'blade' | 'wing' | 'support' | 'flame' | 'home' }
/** Homage battlefield operatives, with a separate weapon layer for the existing aiming system. */
export const HEROINES: Record<TowerKey, Hero> = {
  arrow: { hair: '#f59dc5', shade: '#ac507c', accent: '#ee8ab9', style: 'long', gear: 'rifle' },
  cannon: { hair: '#624135', shade: '#352629', accent: '#ee634b', style: 'bob', gear: 'orb' },
  frost: { hair: '#eee9ff', shade: '#9b90bf', accent: '#bca0ef', style: 'long', gear: 'orb' },
  sniper: { hair: '#80d2d8', shade: '#397984', accent: '#78d9d7', style: 'bob', gear: 'rifle' },
  marine: { hair: '#ee9653', shade: '#a94e35', accent: '#ef594b', style: 'long', gear: 'rifle' },
  firebat: { hair: '#e95c59', shade: '#923744', accent: '#ff9b55', style: 'long', gear: 'flame' },
  templar: { hair: '#f5d991', shade: '#b28c48', accent: '#78a6ef', style: 'bob', gear: 'blade' },
  cruiser: { hair: '#bf5d50', shade: '#71313b', accent: '#e98c79', style: 'long', gear: 'wing' },
  bunker: { hair: '#363342', shade: '#171b28', accent: '#d75c75', style: 'bob', gear: 'home' },
  support: { hair: '#63d9d0', shade: '#257a89', accent: '#72ece0', style: 'twin', gear: 'support' },
  observer: { hair: '#f4d778', shade: '#bb8c45', accent: '#ffe082', style: 'long', gear: 'support' },
  ghost: { hair: '#edf0f5', shade: '#9a9eaf', accent: '#c7cfdf', style: 'bob', gear: 'rifle' },
  goliath: { hair: '#9d725c', shade: '#533747', accent: '#f39acb', style: 'long', gear: 'cannon' },
  zealot: { hair: '#31303c', shade: '#181a29', accent: '#e69a72', style: 'long', gear: 'blade' },
  highTemplar: { hair: '#e8e5ef', shade: '#aaa3bd', accent: '#cbb5ed', style: 'twin', gear: 'orb' },
  reaver: { hair: '#5477bd', shade: '#293d75', accent: '#809ee8', style: 'bob', gear: 'cannon' },
  scout: { hair: '#b0daf2', shade: '#678ba8', accent: '#d8eff8', style: 'bob', gear: 'wing' },
  carrier: { hair: '#eda1bd', shade: '#aa638b', accent: '#e4c27b', style: 'long', gear: 'wing' },
};

const star = (x: number, y: number, color: string, size = 4) => `<path d="M${x} ${y-size}l${size*.32} ${size*.68} ${size*.68} ${size*.32}-${size*.68} ${size*.32}-${size*.32} ${size*.68}-${size*.32}-${size*.68}-${size*.68}-${size*.32} ${size*.68}-${size*.32}Z" fill="${color}"/>`;

export function bishoujoLayers(key: TowerKey): { base: string; head: string } {
  const h = HEROINES[key];
  const mystic = ['orb', 'blade', 'support'].includes(h.gear);
  const hair = h.style === 'twin'
    ? `<path d="M25 9Q12 6 16 26l-7 16q14-6 15-24m15-9q13-3 9 17l7 16q-14-6-15-24" fill="url(#heroHair)" stroke="${h.shade}" stroke-width=".7"/><path d="m21 9 5 1-3 4-4-3m20-2-1 5 6-2-1-4" fill="#34213e" stroke="${h.accent}" stroke-width=".7"/>`
    : h.style === 'long' ? `<path d="M23 13Q21 2 32 2q14 1 11 14l6 30q-8 4-13-5h-9q-10 5-13 1Z" fill="url(#heroHair)" stroke="${h.shade}" stroke-width=".8"/><path d="m23 20-4 20m20-21 6 21" fill="none" stroke="${h.accent}" opacity=".65"/>` : '';
  const wing = h.gear === 'wing' ? `<path d="m25 26-18-8 5 19 14 4m13-15 18-8-5 19-14 4" fill="#e9dff8" stroke="${h.shade}" stroke-width=".8"/><path d="m11 24 12 9m30-9-12 9" stroke="${h.accent}" stroke-width="2"/>` : '';
  const home = h.gear === 'home' ? `<path d="M5 43 13 35h38l8 8v16H5Z" fill="#47304f" stroke="#dda6cc"/><path d="M5 43h54M9 53h46" stroke="#9b718e"/><path d="M25 59V47h14v12" fill="#231b35" stroke="#f7c7e9"/>${star(32,42,'#ffe6ad',3)}` : '';
  const base = `<defs>
      <linearGradient id="heroHair" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#fff1fa"/><stop offset=".27" stop-color="${h.hair}"/><stop offset="1" stop-color="${h.shade}"/></linearGradient>
      <linearGradient id="heroSuit" x1="0" y1="0" x2="1" y2=".8"><stop stop-color="${h.accent}"/><stop offset=".45" stop-color="#252034"/><stop offset="1" stop-color="#46334e"/></linearGradient>
      <linearGradient id="heroSkin" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#fff0e9"/><stop offset="1" stop-color="#e7b7b8"/></linearGradient>
    </defs>
    <ellipse cx="32" cy="61" rx="16" ry="2.5" fill="#150c21" opacity=".45"/>
    <ellipse cx="32" cy="60" rx="13" ry="2" fill="${h.accent}" opacity=".22"/>
    ${wing}${hair}
    <g stroke-linejoin="round" stroke-linecap="round">
      <path d="m27 37-3 11 2 10 4 1 2-18m2-2 1 10 4 9 4-1-3-19Z" fill="url(#heroSuit)" stroke="#ac7b96" stroke-width=".65"/>
      <path d="m25 45 6 2-1 11 1 3h-8l2-4Zm9 1 6-1 2 12 3 3-7 1-2-4Z" fill="url(#heroSuit)" stroke="#251a35" stroke-width=".8"/>
      <path d="m26 47 4 1m6 0 4-1m-15 9 4 1m9-1 3-1" stroke="${h.accent}" stroke-width=".9"/>
      <path d="M29 18v4l-6 3-3 10 5 3 7-4 8 4 4-5-4-8-5-3v-4Z" fill="url(#heroSuit)" stroke="#b27c98" stroke-width=".65"/>
      <path d="m24 26 5-1 3 4 4-4 5 2-4 7 3 6-8 3-8-3 3-6Z" fill="url(#heroSuit)" stroke="#32233e" stroke-width=".8"/>
      <path d="m25 27 4-1 3 4 4-4 4 1m-8 4v8m-5-4 5 3 5-3" fill="none" stroke="${h.accent}" stroke-width=".8"/>
      <path d="M25 37q7 3 14 0l4 7-7-1-4-3-6 5-6-2Z" fill="${mystic ? h.accent : '#d9cbe4'}" stroke="${h.shade}" stroke-width=".7"/>
      <path d="m26 39-3 4m13-3 4 2" stroke="#fff1f8" stroke-width=".65"/>
      <path d="m25 37 14 1" stroke="#e9c6e8" stroke-width="1.3"/>
      <path d="m22 25-4 9 4 8 3-2-3-7 4-6m15-2 5 8-3 9-3-2 2-7-4-6" fill="url(#heroSuit)" stroke="#ae7d98" stroke-width=".65"/>
      <path d="m19 31 4 1 1 7-3 3-5-8Zm22 2 4-2 2 4-4 7-3-2Z" fill="url(#heroSuit)" stroke="${h.shade}" stroke-width=".6"/>
      ${mystic ? `<path d="m20 28-6 12 8 5 2-12m20-5 6 12-8 5-2-12" fill="${h.accent}" fill-opacity=".55" stroke="#f8dced" stroke-width=".5"/>` : ''}
      <path d="M23 12Q22 3 32 3q11 0 10 10l-3 9-14-1Z" fill="url(#heroHair)" stroke="${h.shade}" stroke-width=".8"/>
      <path d="M26 9q6-5 13 1v6q-1 5-7 7-6-3-7-7Z" fill="url(#heroSkin)" stroke="#b6859c" stroke-width=".5"/>
      <path d="M24 13Q23 4 33 4q10 0 9 10l-5-6-1 6-5-5-5 6 1-6Z" fill="url(#heroHair)" stroke="${h.shade}" stroke-width=".55"/>
      <path d="m27 6 5-1m3 1 4 2" stroke="#fff7ff" stroke-width=".8" opacity=".8"/>
      <path d="m26 14q2-1.5 4.5.1-2 3-4.5.4m8-.5q2-1.5 4.5-.1-2 3-4.5.6" fill="#fff7fa" stroke="#493044" stroke-width=".6"/>
      <g fill="${h.shade}"><ellipse cx="28.3" cy="14.9" rx="1.2" ry="1.7"/><ellipse cx="36.3" cy="14.9" rx="1.2" ry="1.7"/></g>
      <g fill="${h.accent}"><ellipse cx="28.3" cy="15.5" rx=".85" ry=".9"/><ellipse cx="36.3" cy="15.5" rx=".85" ry=".9"/></g>
      <g fill="#fff"><circle cx="28" cy="14.1" r=".55"/><circle cx="36" cy="14.1" r=".55"/></g>
      <path d="m25.8 13.9-.9-.8m14 1 .9-.8m-8.7 6q1.3.7 2.6-.2" fill="none" stroke="#8e4768" stroke-width=".5"/>
      <path d="m26 17h2m9 0h2" stroke="#e88ca9" stroke-width="1" opacity=".6"/>
      <path d="m29 23 3 1 3-1" stroke="#35243c" stroke-width="1.3"/>
      ${star(39,8,'#ffe4ac',2)}
      <path d="m24 11-4-2 1 4 4-1m15 0 4-3-1 4-4-1" fill="${h.accent}" stroke="#f5d9ee" stroke-width=".5"/>
    </g>${homageDetails(key, h)}${home}`;
  let head = '';
  if (h.gear === 'rifle' || h.gear === 'cannon' || h.gear === 'flame') {
    const heavy = h.gear === 'cannon', length = key === 'ghost' ? 29 : heavy ? 29 : 24;
    head = `<g stroke="#514866" stroke-width="1" stroke-linejoin="round"><path d="m32 33 5 1-1 10-4 1Z" fill="#635571"/><path d="M30 30h${length}v${heavy ? 9 : 6}H30Z" fill="#e9e7fa"/><path d="M34 32h${length-6}v3H34Z" fill="${h.accent}"/><path d="M${30+length} 29h3v${heavy ? 11 : 8}h-3Z" fill="#6d6584"/><path d="M38 27h8v3h-8Z" fill="#8ce5f6"/></g>${h.gear === 'flame' ? '<path d="m53 30 7 3-7 5 2-4Z" fill="#ffc99c"/>' : ''}`;
  } else if (h.gear === 'orb' || h.gear === 'support') {
    head = `<path d="M46 24v28" stroke="#645881" stroke-width="2.4"/><path d="M46 24v26" stroke="#e6d7fa" stroke-width="1"/><circle cx="46" cy="22" r="7" fill="${h.accent}" opacity=".17"/><circle cx="46" cy="22" r="4.5" fill="${h.accent}" stroke="#fff4fc"/>${star(46,22,'#fff',3)}${h.gear === 'support' ? '<path d="M43 22h6m-3-3v6" stroke="#fff" stroke-width="1.3"/>' : ''}`;
  } else if (h.gear === 'blade') {
    head = `<path d="m16 39-8-17 2-6 12 20m25 3 8-17-2-6-12 20" fill="#a8f2ff" stroke="#edffff" stroke-width="1.3"/><path d="m14 37 7-3m22 0 7 3" stroke="${h.accent}" stroke-width="3"/>`;
  } else if (h.gear === 'wing') head = `${star(13,38,h.accent,5)}${star(51,38,h.accent,5)}`;
  if (['arrow', 'firebat', 'reaver'].includes(key)) {
    head = `<g stroke="#202333" stroke-width="1"><path d="M23 35q-7-8-11-2t7 14q6 3 10-3l20-17-3-4-20 15Z" fill="${key === 'firebat' ? '#e55451' : key === 'reaver' ? '#4267ab' : '#262936'}"/><path d="m23 40 24-15" stroke="#e8ecf4" stroke-width="2"/><path d="m16 38 7 5m-5-8 7 5" stroke="#b9cadb"/><circle cx="20" cy="40" r="2" fill="#eee"/></g>`;
  }
  return { base, head };
}

/** Small, high-contrast signatures remain legible at battlefield scale. */
function homageDetails(key: TowerKey, h: Hero): string {
  const headset = '<path d="M21 14V9q11-15 23 0v7" fill="none" stroke="#29283b" stroke-width="3"/><path d="M21 13v7m23-7v7" stroke="'+h.accent+'" stroke-width="4"/>';
  const signatures: Record<TowerKey, string> = {
    arrow: '<rect x="22" y="7" width="4" height="4" fill="#6ebee9"/><rect x="22" y="11" width="4" height="4" fill="#f4da70"/>',
    cannon: '<path d="m16 11 10-11 12 4 5 8 7 3q-20 6-37 0Z" fill="#332538" stroke="#f29c52"/><path d="m26 5 5 4m0-5-5 5" stroke="#f9d76c" stroke-width="2"/>',
    frost: '<path d="m23 15-7-3 8 8m17-5 7-3-8 8" fill="#f3d4cd"/><circle cx="23" cy="8" r="4" fill="#fff"/><circle cx="23" cy="8" r="1.5" fill="#c6a4ef"/>',
    sniper: '<path d="m20 23 24 2-4 5-20-2Z" fill="#e9f5ee"/><rect x="22" y="8" width="4" height="2" fill="#2d3545"/>',
    marine: '<path d="m21 8 3-5 4 5m9 0 3-5 3 5" fill="#e33f37"/><path d="m26 25 6 5 6-5v12H26Z" fill="#e04b3c" stroke="#1d283b"/>',
    firebat: '<path d="m26 23 6 4 6-4v9l-6 4-6-4Z" fill="#c93c44"/><path d="m28 23 4 4 4-4" fill="none" stroke="#fff"/>',
    templar: '<circle cx="22" cy="10" r="5" fill="#e8cc85"/><path d="m17 10-5-3 1 9 7-3" fill="#4f83d1"/><path d="m22 26 10-3 10 3-3 10H25Z" fill="#e5eaf1" stroke="#c5a354"/>',
    cruiser: '<path d="M24 18q-7 8 0 12t0 12" fill="none" stroke="#bf5d50" stroke-width="5"/><path d="m25 25 7 3 7-3" stroke="#e7c270" stroke-width="4"/><path d="m31 25 2 0 1 10-2 3-2-3Z" fill="#151b29"/>',
    bunker: '<path d="m8 29 15-4 6 5-2 22-9 7-10-9Z" fill="#242330" stroke="#e15f79" stroke-width="2"/><path d="m12 35 11 10m0-10L12 45" stroke="#d75c75" stroke-width="2"/>',
    support: headset+'<path d="m31 24 3 0 2 13-4 4-3-4Z" fill="#63d9d0"/>',
    observer: '<path d="M21 8Q4 6 11 30l7-6-1-12" fill="#f4d778" stroke="#bb8c45"/><path d="m30 5 8-5-3 9Z" fill="#f4d778"/><ellipse cx="18" cy="40" rx="9" ry="5" fill="#d9a64c" stroke="#fff"/><path d="m21 30 16 10m4-10-15 10" stroke="#f8e1a1" stroke-width="2"/>',
    ghost: '<path d="M24 12h17v6H24Z" fill="#171d2b"/><rect x="8" y="20" width="8" height="9" fill="#d8dce6" stroke="#242b40"/><path d="m12 29-3 7m3-7 3 7" stroke="#d8dce6"/>',
    goliath: headset+'<path d="M9 26h12v22H6Zm34 0h12l3 22H43Z" fill="#df80b4" stroke="#416fb5" stroke-width="2"/><path d="m26 17 3 1m7 0 3-1" stroke="#ef77b6" stroke-width="2"/>',
    zealot: '<circle cx="23" cy="10" r="3" fill="#e4bd72"/><circle cx="42" cy="10" r="3" fill="#e4bd72"/><path d="m20 25-5 20 10-5m19-15 5 20-10-5" fill="#a9424b"/>',
    highTemplar: '<path d="m23 14-9-3 10 9m17-6 9-3-10 9" fill="#f1d4c9"/><path d="M22 26h20l5 17-8-3H25l-8 3Z" fill="#eeeaf3" stroke="#c6a467"/><circle cx="22" cy="21" r="1.6" fill="#cc4d64"/><circle cx="42" cy="21" r="1.6" fill="#cc4d64"/>',
    reaver: '<path d="M23 8h5m-5 4h5" stroke="#f4d774" stroke-width="3"/><path d="m28 24 4 4 4-4" fill="#fff"/>',
    scout: '<path d="m21 8 3-5 3 5m10 0 3-5 3 5" fill="#f2f6fa"/><path d="M25 24h14v14H25Z" fill="#eef4f6" stroke="#688ca0"/><circle cx="32" cy="29" r="2" fill="#6bd0bf"/>',
    carrier: headset+'<path d="m7 36 8-5 7 5-7 3Zm36 0 8-5 7 5-7 3Z" fill="#eee0a3" stroke="#bc9459"/><path d="m25 25 7 4 7-4" fill="none" stroke="#e4c27b" stroke-width="2"/>',
  };
  return signatures[key];
}

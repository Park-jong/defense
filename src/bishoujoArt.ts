import type { TowerKey } from './data/units';

interface Hero { hair: string; shade: string; accent: string; style: 'twin' | 'long' | 'bob'; gear: 'rifle' | 'cannon' | 'orb' | 'blade' | 'wing' | 'support' | 'flame' | 'home' }
/** Adult anime operatives, with a separate weapon layer for the existing aiming system. */
export const HEROINES: Record<TowerKey, Hero> = {
  arrow: { hair: '#f7a8cb', shade: '#a84d83', accent: '#ef8bb9', style: 'twin', gear: 'rifle' },
  cannon: { hair: '#dfb8fb', shade: '#77549f', accent: '#ba9aef', style: 'bob', gear: 'cannon' },
  frost: { hair: '#a9e8fa', shade: '#4c93ba', accent: '#77ddf0', style: 'long', gear: 'orb' },
  sniper: { hair: '#c9b8ff', shade: '#7161b1', accent: '#ad9bff', style: 'long', gear: 'orb' },
  marine: { hair: '#a4c8fa', shade: '#4a6cac', accent: '#8fb6ff', style: 'bob', gear: 'rifle' },
  firebat: { hair: '#ffc49f', shade: '#b86669', accent: '#ff9b9b', style: 'twin', gear: 'flame' },
  templar: { hair: '#e1efff', shade: '#7e9cc5', accent: '#89e3ff', style: 'long', gear: 'orb' },
  cruiser: { hair: '#f5b4c2', shade: '#9c5579', accent: '#e99fb5', style: 'long', gear: 'wing' },
  bunker: { hair: '#f4c2e5', shade: '#9b669d', accent: '#d6a7f0', style: 'twin', gear: 'home' },
  support: { hair: '#aff1d6', shade: '#4a9d98', accent: '#94e9d0', style: 'bob', gear: 'support' },
  observer: { hair: '#d3b7ff', shade: '#8063b5', accent: '#c9a4ff', style: 'twin', gear: 'support' },
  ghost: { hair: '#d8e7f5', shade: '#6c85a4', accent: '#b1d7ed', style: 'long', gear: 'rifle' },
  goliath: { hair: '#b9e3d5', shade: '#609a9a', accent: '#8dd5c5', style: 'bob', gear: 'cannon' },
  zealot: { hair: '#ffe3a1', shade: '#ba8d57', accent: '#ffe09b', style: 'twin', gear: 'blade' },
  highTemplar: { hair: '#f3c1f4', shade: '#a269b0', accent: '#e5acfc', style: 'long', gear: 'orb' },
  reaver: { hair: '#f4d3a2', shade: '#ac7c5c', accent: '#eac391', style: 'bob', gear: 'cannon' },
  scout: { hair: '#a9d3ff', shade: '#567bb9', accent: '#9ac5ff', style: 'twin', gear: 'wing' },
  carrier: { hair: '#fff0bd', shade: '#be965f', accent: '#f5d7a0', style: 'long', gear: 'wing' },
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
      <linearGradient id="heroSuit" x1="0" y1="0" x2="1" y2=".8"><stop stop-color="#64516e"/><stop offset=".45" stop-color="#252034"/><stop offset="1" stop-color="#46334e"/></linearGradient>
      <linearGradient id="heroSkin" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#fff0e9"/><stop offset="1" stop-color="#e7b7b8"/></linearGradient>
    </defs>
    <ellipse cx="32" cy="61" rx="16" ry="2.5" fill="#150c21" opacity=".45"/>
    <ellipse cx="32" cy="60" rx="13" ry="2" fill="${h.accent}" opacity=".22"/>
    ${wing}${hair}
    <g stroke-linejoin="round" stroke-linecap="round">
      <path d="m27 37-3 11 2 10 4 1 2-18m2-2 1 10 4 9 4-1-3-19Z" fill="url(#heroSkin)" stroke="#ac7b96" stroke-width=".65"/>
      <path d="m25 45 6 2-1 11 1 3h-8l2-4Zm9 1 6-1 2 12 3 3-7 1-2-4Z" fill="url(#heroSuit)" stroke="#251a35" stroke-width=".8"/>
      <path d="m26 47 4 1m6 0 4-1m-15 9 4 1m9-1 3-1" stroke="${h.accent}" stroke-width=".9"/>
      <path d="M29 18v4l-6 3-3 10 5 3 7-4 8 4 4-5-4-8-5-3v-4Z" fill="url(#heroSkin)" stroke="#b27c98" stroke-width=".65"/>
      <path d="m24 26 5-1 3 4 4-4 5 2-4 7 3 6-8 3-8-3 3-6Z" fill="url(#heroSuit)" stroke="#32233e" stroke-width=".8"/>
      <path d="m25 27 4-1 3 4 4-4 4 1m-8 4v8m-5-4 5 3 5-3" fill="none" stroke="${h.accent}" stroke-width=".8"/>
      <path d="M25 37q7 3 14 0l4 7-7-1-4-3-6 5-6-2Z" fill="${mystic ? h.accent : '#d9cbe4'}" stroke="${h.shade}" stroke-width=".7"/>
      <path d="m26 39-3 4m13-3 4 2" stroke="#fff1f8" stroke-width=".65"/>
      <path d="m25 37 14 1" stroke="#e9c6e8" stroke-width="1.3"/>
      <path d="m22 25-4 9 4 8 3-2-3-7 4-6m15-2 5 8-3 9-3-2 2-7-4-6" fill="url(#heroSkin)" stroke="#ae7d98" stroke-width=".65"/>
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
    </g>${home}`;
  let head = '';
  if (h.gear === 'rifle' || h.gear === 'cannon' || h.gear === 'flame') {
    const heavy = h.gear === 'cannon', length = key === 'ghost' ? 29 : heavy ? 29 : 24;
    head = `<g stroke="#514866" stroke-width="1" stroke-linejoin="round"><path d="m32 33 5 1-1 10-4 1Z" fill="#635571"/><path d="M30 30h${length}v${heavy ? 9 : 6}H30Z" fill="#e9e7fa"/><path d="M34 32h${length-6}v3H34Z" fill="${h.accent}"/><path d="M${30+length} 29h3v${heavy ? 11 : 8}h-3Z" fill="#6d6584"/><path d="M38 27h8v3h-8Z" fill="#8ce5f6"/></g>${h.gear === 'flame' ? '<path d="m53 30 7 3-7 5 2-4Z" fill="#ffc99c"/>' : ''}`;
  } else if (h.gear === 'orb' || h.gear === 'support') {
    head = `<path d="M46 24v28" stroke="#645881" stroke-width="2.4"/><path d="M46 24v26" stroke="#e6d7fa" stroke-width="1"/><circle cx="46" cy="22" r="7" fill="${h.accent}" opacity=".17"/><circle cx="46" cy="22" r="4.5" fill="${h.accent}" stroke="#fff4fc"/>${star(46,22,'#fff',3)}${h.gear === 'support' ? '<path d="M43 22h6m-3-3v6" stroke="#fff" stroke-width="1.3"/>' : ''}`;
  } else if (h.gear === 'blade') {
    head = `<path d="m16 39-8-17 2-6 12 20m25 3 8-17-2-6-12 20" fill="#a8f2ff" stroke="#edffff" stroke-width="1.3"/><path d="m14 37 7-3m22 0 7 3" stroke="${h.accent}" stroke-width="3"/>`;
  } else if (h.gear === 'wing') head = `${star(13,38,h.accent,5)}${star(51,38,h.accent,5)}`;
  return { base, head };
}

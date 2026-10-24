import Phaser from 'phaser';
import { MAP_H, RENDER_SCALE, W } from './config';

export const CONSOLE_RISE = 32;
const HEIGHT = 256;
const KEY = 'console-chrome';
// Raised monitor housings, recessed status display, then a lower communications bay.
const ridge = [[0, 34], [10, 18], [25, 12], [174, 12], [190, 20], [198, 56],
  [212, 66], [262, 66], [272, 52], [328, 52], [338, 66], [470, 66], [480, 52],
  [536, 52], [546, 66], [556, 66], [570, 82], [694, 82], [706, 72], [716, 36],
  [732, 14], [752, 6], [924, 6], [944, 14], [960, 34]];

/** Screen-space hit testing follows the armor silhouette, including its raised shoulders. */
export function consoleContains(x: number, y: number): boolean {
  if (x < 0 || x > W || y > HEIGHT) return false;
  for (let i = 1; i < ridge.length; i++) {
    const [ax, ay] = ridge[i - 1], [bx, by] = ridge[i];
    if (x <= bx) return y >= ay + (by - ay) * (x - ax) / (bx - ax);
  }
  return false;
}

const outline = ridge.map(([x, y]) => `${x},${y}`).join(' ');
const shell = `${outline} 960,256 0,256`;
const top = 'M' + ridge.map(([x, y]) => `${x} ${y}`).join('L');
const cutRect = (x: number, y: number, w: number, h: number, c = 6) =>
  `${x + c},${y} ${x + w - c},${y} ${x + w},${y + c} ${x + w},${y + h - c} ${x + w - c},${y + h} ${x + c},${y + h} ${x},${y + h - c} ${x},${y + c}`;
const bezel = (x: number, y: number, w: number, h: number) =>
  `<polygon points="${cutRect(x, y, w, h)}" fill="#06090c" stroke="#737d87" stroke-width="2"/>
   <polygon points="${cutRect(x + 3, y + 3, w - 6, h - 6, 4)}" fill="url(#recess)" stroke="#101419" stroke-width="3"/>
   <path d="M${x + 7} ${y + h - 2}H${x + w - 7}" stroke="#525d63"/>`;
const screw = (x: number, y: number) => `<circle cx="${x}" cy="${y}" r="3.5" fill="#0a0c0f" stroke="#646c73"/>
  <path d="m${x - 1.5} ${y + 1.5} 3-3" stroke="#9da1a0" stroke-width="1.2"/>`;
const vent = (x: number, y: number, w: number, h: number) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="#0a1014" stroke="#6a7277"/>
  ${Array.from({ length: Math.floor(w / 6) - 1 }, (_, i) => `<path d="M${x + 5 + i * 6} ${y + 3}v${h - 6}" stroke="#3f4b50" stroke-width="2"/>`).join('')}`;

function artwork(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="256" viewBox="0 0 960 256">
    <defs>
      <linearGradient id="steel" x2="0" y2="1"><stop stop-color="#59606a"/><stop offset=".2" stop-color="#303844"/><stop offset=".7" stop-color="#252b34"/><stop offset="1" stop-color="#11171c"/></linearGradient>
      <linearGradient id="rim" x2="0" y2="1"><stop stop-color="#a0a4a2"/><stop offset=".18" stop-color="#5d6571"/><stop offset=".5" stop-color="#282e39"/><stop offset="1" stop-color="#141a20"/></linearGradient>
      <linearGradient id="recess" x2="0" y2="1"><stop stop-color="#04090a"/><stop offset="1" stop-color="#0c1613"/></linearGradient>
      <pattern id="grain" width="7" height="5" patternUnits="userSpaceOnUse"><path d="M0 1h5M2 4h4" stroke="#bcc2c6" stroke-opacity=".035"/><path d="M1 2h3" stroke="#000" stroke-opacity=".2"/></pattern>
      <pattern id="hazard" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(38)"><rect width="14" height="14" fill="#111719"/><rect width="6" height="14" fill="#a59553"/></pattern>
      <clipPath id="body"><polygon points="${shell}"/></clipPath>
    </defs>
    <polygon points="${shell}" transform="translate(0 5)" fill="#000" stroke="#000" stroke-width="8" opacity=".6"/>
    <polygon points="${shell}" fill="url(#steel)" stroke="#090c10" stroke-width="8"/>
    <g clip-path="url(#body)">
      <path d="M0 34 10 18 25 12H174L190 20 198 56 202 218H0Z" fill="url(#rim)" stroke="#121922" stroke-width="3"/>
      <path d="M716 36 732 14 752 6H924L944 14 960 34V234H710Z" fill="url(#rim)" stroke="#10151c" stroke-width="3"/>
      <path d="M208 74 216 66H552L562 78V224H208Z" fill="url(#steel)" stroke="#131920" stroke-width="3"/>
      <path d="M566 94 576 82H692L704 94V226H566Z" fill="#343d46" stroke="#11171c" stroke-width="3"/>
      <path d="M4 38 20 22H171L180 29 184 40H4ZM730 36 744 22 758 17H921L937 24 947 36Z" fill="#242d36" stroke="#737e85"/>
      ${vent(26, 22, 58, 12)}
      <path d="M102 22h62l8 12h-70Z" fill="url(#hazard)" stroke="#6b7071"/>
      ${vent(773, 18, 126, 14)}
      <path d="M738 26h22l4 7h-30Zm172-7h13l13 12h-26Z" fill="#14191d" stroke="#7a858a"/>
      <path d="M744 28h8m165-4h4" stroke="#bb5144" stroke-width="3"/>
      <path d="M190 27 198 61 210 71 204 104 193 84 182 31Z" fill="#10191d" stroke="#586571" stroke-width="2"/>
      <path d="M188 35 196 63 204 71 200 87 192 74 183 37Z" fill="url(#hazard)" opacity=".8"/>
      <path d="M706 75 717 39 726 30 720 75 710 105 699 96Z" fill="#0e171a" stroke="#596873" stroke-width="2"/>
      <path d="m713 69 8-29 2 1-6 34-9 23-5-5Z" fill="url(#hazard)"/>
      <path d="M202 104v96m7-97v94m350-92v97m148-91v91" stroke="#080e12" stroke-width="4"/>
      <path d="M204 105v92m357-90v92m148-86v86" stroke="#75828b" stroke-width="1"/>
      ${bezel(17, 76, 176, 121)}
      ${bezel(216, 74, 336, 124)}
      ${bezel(576, 108, 120, 104)}
      ${bezel(722, 70, 226, 152)}
      <path d="M272 54h54l7 10h-68Z M480 54h54l7 10h-68Z" fill="#121b21" stroke="#727d83"/>
      <path d="M279 59h35m173 0h35" stroke="#42625c" stroke-width="2"/>
      ${vent(27, 202, 94, 8)}
      ${vent(741, 228, 125, 8)}
      <path d="M578 91h114l5 10H573Z" fill="#202a30" stroke="#7a8587"/>
      <path d="M648 96h15" stroke="#b29a59" stroke-width="2"/>
      <circle cx="680" cy="96" r="2" fill="#92bb72"/>
      <rect y="234" width="960" height="22" fill="#11191d"/>
      <path d="M0 236h960M0 254h960" stroke="#727e82" stroke-opacity=".4"/>
      <path d="M0 239h960" stroke="#04090d" stroke-width="3"/>
      ${Array.from({ length: 42 }, (_, i) => {
        const x = (i * 173 + 19) % 958, y = 38 + (i * 29) % 195;
        return `<path d="m${x} ${y} ${3 + i % 8} -1" stroke="${i % 2 ? '#a6afb0' : '#080d12'}" stroke-opacity=".14"/>`;
      }).join('')}
      <rect width="960" height="256" fill="url(#grain)"/>
      ${[[11, 47], [182, 45], [11, 220], [187, 222], [222, 69], [545, 69], [569, 222], [698, 222], [735, 44], [941, 44], [721, 232], [947, 232], [344, 229], [546, 229]].map(([x, y]) => screw(x, y)).join('')}
    </g>
    <path d="${top}" fill="none" stroke="#899298" stroke-width="2"/>
    <path d="${top}" transform="translate(0 3)" fill="none" stroke="#1a232d" stroke-width="2"/>
  </svg>`;
}

export function loadConsoleChrome(scene: Phaser.Scene): void {
  scene.load.svg(KEY, 'data:image/svg+xml;base64,' + btoa(artwork()), { width: W * RENDER_SCALE, height: HEIGHT * RENDER_SCALE });
}

export function addConsoleChrome(scene: Phaser.Scene, y: number, battlefieldKey: string): void {
  // Continue the battlefield floor through the valleys between raised housings.
  const groundKey = 'console-ground_' + battlefieldKey, bleed = 88, rs = RENDER_SCALE;
  if (!scene.textures.exists(groundKey)) {
    const ground = scene.textures.createCanvas(groundKey, W * rs, bleed * rs)!;
    // 맵 아래 가장자리를 거울처럼 뒤집어 이어 붙여 경계가 끊기지 않게 한다.
    ground.context.setTransform(1, 0, 0, -1, 0, bleed * rs);
    ground.context.drawImage(scene.textures.get(battlefieldKey).getSourceImage() as HTMLCanvasElement,
      0, (MAP_H - bleed) * rs, W * rs, bleed * rs, 0, 0, W * rs, bleed * rs);
    ground.refresh();
  }
  // 맵 아래 가장자리(y - 26)부터 가장 깊은 골짜기(능선 y=82)까지 채운다.
  scene.add.image(0, y - 26, groundKey).setOrigin(0).setDisplaySize(W, bleed).setDepth(25);
  const armor = scene.add.image(0, y - CONSOLE_RISE, KEY).setOrigin(0).setDisplaySize(W, HEIGHT).setDepth(26);
  const shape = new Phaser.Geom.Polygon([...ridge, [W, HEIGHT], [0, HEIGHT]].map(([x, yy]) => ({ x: x * rs, y: yy * rs })));
  armor.setInteractive(shape, Phaser.Geom.Polygon.Contains);
}

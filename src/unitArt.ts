import type { TowerKey } from './config';
import type Phaser from 'phaser';

// Layered, hand-drawn unit art. Each unit has a fixed chassis and a rotating weapon.
const defs = `<defs>
  <linearGradient id="steel" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#b7c6b8"/><stop offset=".42" stop-color="#667e70"/><stop offset="1" stop-color="#293f38"/></linearGradient>
  <linearGradient id="olive" x1="0" y1="0" x2=".65" y2="1"><stop stop-color="#c3c09a"/><stop offset=".35" stop-color="#929878"/><stop offset="1" stop-color="#424e40"/></linearGradient>
  <linearGradient id="gold" x1="0" y1="0" x2=".6" y2="1"><stop stop-color="#fff1b4"/><stop offset=".28" stop-color="#e3bc5c"/><stop offset=".65" stop-color="#a77c30"/><stop offset="1" stop-color="#59421f"/></linearGradient>
  <linearGradient id="goldDark" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#caa34f"/><stop offset="1" stop-color="#57401e"/></linearGradient>
  <linearGradient id="red" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#e2836c"/><stop offset=".45" stop-color="#9b3d32"/><stop offset="1" stop-color="#4c2926"/></linearGradient>
  <linearGradient id="gun" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#d2ddd3"/><stop offset=".3" stop-color="#758a7e"/><stop offset=".6" stop-color="#394e43"/><stop offset="1" stop-color="#1c2d26"/></linearGradient>
  <radialGradient id="energy"><stop stop-color="#f0ffff"/><stop offset=".25" stop-color="#a7f6ff"/><stop offset=".6" stop-color="#3db9ef"/><stop offset="1" stop-color="#1c4b9c" stop-opacity=".1"/></radialGradient>
  <radialGradient id="blue"><stop stop-color="#efffff"/><stop offset=".32" stop-color="#8af2ff"/><stop offset=".72" stop-color="#287dd3"/><stop offset="1" stop-color="#1a335a"/></radialGradient>
</defs>`;
const svg = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">${defs}${body}</svg>`;

const turretBase = `
  <defs>
    <linearGradient id="turretPlinth" x1="0" y1="0" x2=".4" y2="1"><stop stop-color="#717784"/><stop offset=".25" stop-color="#424956"/><stop offset=".7" stop-color="#242933"/><stop offset="1" stop-color="#141b24"/></linearGradient>
    <linearGradient id="turretTrim" x1="0" y1="0" x2=".4" y2="1"><stop stop-color="#e0e1d7"/><stop offset=".35" stop-color="#9da6aa"/><stop offset="1" stop-color="#47545a"/></linearGradient>
    <pattern id="turretHazard" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="skewX(-25)"><rect width="5" height="5" fill="#e8be49"/><rect width="2.5" height="5" fill="#20262b"/></pattern>
  </defs>
  <ellipse cx="32" cy="53" rx="29" ry="10" fill="#000" opacity=".4"/>
  <g stroke-linejoin="round">
    <!-- Four white-edged feet brace a squat, dark armoured plinth. -->
    <path d="M8 42 18 35h28l11 8v11l-10 8H17L6 54Z" fill="#19212a" stroke="#0b1219" stroke-width="1.3"/>
    <path d="m8 42 8-6 9 7-7 9-11-3Zm32 1 7-7 10 7v7l-11 3ZM8 49l12 2 6 8-9 3-11-8Zm32 6 8-6 10 5-11 8-10-2Z" fill="url(#turretHazard)" stroke="#111a21" stroke-width="1"/>
    <path d="m7 43 2-2v7l9 3 4-3 2 2-5 5L6 51Zm43-3 7 3v8l-4 2-2-2 3-2v-5ZM7 53l10 6 8-3 1 3-9 4-11-7Zm35 5 5 2 10-6 1 2-11 7-7-3Z" fill="url(#turretTrim)" stroke="#26323a" stroke-width=".6"/>
    <path d="M20 31 38 29 46 36 51 47 39 54 20 51 12 43Z" fill="url(#turretPlinth)" stroke="#111b25" stroke-width="1.3"/>
    <path d="M20 31 38 29 46 36 32 43 15 39Z" fill="#535a67" stroke="#929a9a" stroke-width=".6"/>
    <path d="M15 39 32 43 39 54 20 51 12 43Z" fill="#343b4a"/>
    <path d="M32 43 46 36 51 47 39 54Z" fill="#202b37"/>
    <path d="m19 35 15 3m-13-6 14 3m-12-4 14 2" stroke="#202a35" stroke-width="1.4"/>
    <path d="m21 36 2-3m4 5 2-4m4 5 2-4" stroke="#a1a8a8" stroke-width=".7"/>
    <path d="m18 42 3 1v5l-3-1Zm7 2 3 1v5l-3-1Zm13 1 3-2v5l-3 2Zm6-4 3-2v5l-3 2Z" fill="#111c25" stroke="#66727b" stroke-width=".6"/>
    <!-- Silver conduit and front service socket. -->
    <path d="M24 46 20 45l-7 8v5l5 2 8-8Z" fill="url(#turretTrim)" stroke="#14232b" stroke-width="1"/>
    <ellipse cx="16" cy="56" rx="3.2" ry="4.2" transform="rotate(30 16 56)" fill="#354751" stroke="#b5beb9" stroke-width=".8"/>
    <path d="m20 49 3 2m-5 0 3 2" stroke="#e0e3d6" stroke-width=".8"/>
    <ellipse cx="32" cy="34" rx="12" ry="7" fill="#131e25" stroke="#9ba7a8" stroke-width="1"/>
    <path d="M22 27h20v7c-1 8-19 8-20 0Z" fill="url(#turretTrim)" stroke="#192932"/>
    <path d="M23 30q9 6 18 0m-18 4q9 6 18 0" fill="none" stroke="#26343c" stroke-width="1.2"/>
    <ellipse cx="32" cy="27" rx="10" ry="6" fill="#414e58" stroke="#c0c8c3" stroke-width=".8"/>
    <path d="M27 22h10v9l-5 3-5-3Z" fill="url(#turretTrim)" stroke="#24343e"/>
    <path d="M30 25v6m4-7v7" stroke="#2a3941" stroke-width="1"/>
    <g fill="#a8b4ae" stroke="#28353e" stroke-width=".5"><circle cx="14" cy="42" r=".9"/><circle cx="47" cy="46" r=".9"/><circle cx="30" cy="47" r=".9"/></g>
  </g>
`;
const turretHead = `
  <defs>
    <linearGradient id="turretPod" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="#686d78"/><stop offset=".24" stop-color="#363d48"/><stop offset=".7" stop-color="#161e28"/><stop offset="1" stop-color="#0a121a"/></linearGradient>
    <linearGradient id="turretRim" x1="0" y1="0" x2=".2" y2="1"><stop stop-color="#f0f1e5"/><stop offset=".4" stop-color="#b6c2c1"/><stop offset="1" stop-color="#596d75"/></linearGradient>
    <radialGradient id="turretMissile"><stop stop-color="#c4fff0"/><stop offset=".3" stop-color="#68cdb6"/><stop offset=".75" stop-color="#267c70"/><stop offset="1" stop-color="#163e3e"/></radialGradient>
  </defs>
  <g stroke-linejoin="round">
    <!-- Tall, canted three-round pods straddle an exposed tracking mechanism. -->
    <path d="M37 5 47 3 53 8 60 27 54 32 42 27 33 12Z" fill="url(#turretPod)" stroke="#0c151e" stroke-width="1.3"/>
    <path d="m37 5 10-2 5 5-10 3-9 1Z" fill="#464b54" stroke="#8a9395" stroke-width=".5"/>
    <path d="m37 10 7 1 6 15-7-2Z" fill="#111b23" stroke="#596771" stroke-width=".6"/>
    <path d="m40 12 3 1m-1 3 3 1m-1 3 3 1" stroke="#83918e" stroke-width="1"/>
    <path d="M48 7 53 10 59 27 53 30 45 11Z" fill="#0b1d22" stroke="#53686b" stroke-width=".7"/>
    <path d="M49 7 53 10 59 27 54 30" fill="none" stroke="url(#turretRim)" stroke-width="2.1"/>
    <g fill="url(#turretMissile)" stroke="#315a58" stroke-width=".5">
      <ellipse cx="51" cy="13" rx="1.8" ry="2.1" transform="rotate(-20 51 13)"/>
      <ellipse cx="53" cy="19" rx="1.8" ry="2.1" transform="rotate(-20 53 19)"/>
      <ellipse cx="55" cy="25" rx="1.8" ry="2.1" transform="rotate(-20 55 25)"/>
    </g>
    <!-- Optics, gimbal bearings, actuator rods and bundled control cables. -->
    <path d="M23 22 27 13h8l7 11-6 10-10 1-5-7Z" fill="#43514f" stroke="#15252a" stroke-width="1"/>
    <path d="M27 17 32 14l6 7-3 5-8-2Z" fill="url(#turretRim)" stroke="#293c42" stroke-width=".6"/>
    <path d="m28 19 3-2 5 5-3 2Z" fill="#222e34"/>
    <path d="m30 24 6 1 2 7-6 3-4-6Z" fill="#909c94" stroke="#314247" stroke-width=".7"/>
    <path d="m30 26 5 2m-4 1 4 2" stroke="#26373c" stroke-width="1.2"/>
    <path d="M28 13 27 8l4-3 5 3 1 6-5 3Z" fill="#3c4b50" stroke="#899b98" stroke-width=".7"/>
    <circle cx="32" cy="11" r="2.6" fill="#112a2b" stroke="#b5c9c0" stroke-width=".8"/>
    <circle cx="32" cy="11" r="1.6" fill="url(#turretMissile)"/>
    <path d="M27 9 25 7l-3 3-1 10m15-5 5 1 4 10-5 5" fill="none" stroke="#101c22" stroke-width="2.5"/>
    <path d="m26 10-2 1-1 8m14-3 3 1 3 9-4 4" fill="none" stroke="#b3beb4" stroke-width=".8"/>
    <path d="m26 25-3 6m16-7 3 7" stroke="#c2cec3" stroke-width="1.8"/>
    <circle cx="38" cy="28" r="2.2" fill="#2c3d43" stroke="#a1b1aa" stroke-width=".7"/>
    <!-- Near pod: black recessed launch bay and a heavy silver C-shaped rim. -->
    <path d="M8 17 21 10 29 13 35 18 43 36 37 42 20 37 9 29Z" fill="url(#turretPod)" stroke="#0a141e" stroke-width="1.3"/>
    <path d="m8 17 13-7 8 3 5 6-13 5-12-2Z" fill="#434a56" stroke="#7e898e" stroke-width=".6"/>
    <path d="m11 19 10-5 5 1-10 5Zm4 6 11-4 4 11-9 2-9-6Z" fill="#202c39" stroke="#0b1822" stroke-width=".7"/>
    <path d="m13 22 9-4m-6 6 8-3m-8 7 10-3m-7 7 9-3" stroke="#5e6c78" stroke-width=".8"/>
    <path d="M32 17 36 19 43 36 37 40 29 22Z" fill="#092025" stroke="#4c6266" stroke-width=".7"/>
    <path d="M33 17 36 19 43 36 38 40" fill="none" stroke="url(#turretRim)" stroke-width="2.5"/>
    <path d="M29 20 35 38" stroke="#6e8487" stroke-width="1"/>
    <g fill="url(#turretMissile)" stroke="#315a58" stroke-width=".5">
      <ellipse cx="35" cy="22" rx="1.8" ry="2.1" transform="rotate(-20 35 22)"/>
      <ellipse cx="37" cy="28" rx="1.8" ry="2.1" transform="rotate(-20 37 28)"/>
      <ellipse cx="39" cy="34" rx="1.8" ry="2.1" transform="rotate(-20 39 34)"/>
    </g>
    <path d="m12 18 3-1m11-3 2 2m-12 17 3 1m25-27 2-1m0 16 1 2" stroke="#c0c4b2" stroke-width=".6"/>
    <g fill="#9caeaa" stroke="#263940" stroke-width=".4"><circle cx="11" cy="27" r=".8"/><circle cx="29" cy="17" r=".8"/><circle cx="45" cy="8" r=".8"/><circle cx="50" cy="28" r=".8"/></g>
  </g>
`;

// Local offsets from the rotating turret's (32, 32) pivot to its two launch bays.
export const TURRET_LAUNCH_PORTS = [{ x: 5, y: -4 }, { x: 21, y: -13 }];

const tankBase = `
  <defs>
    <linearGradient id="siegeHull" x1="0" y1="0" x2=".5" y2="1"><stop stop-color="#a9aaa5"/><stop offset=".25" stop-color="#747a7b"/><stop offset=".6" stop-color="#444c51"/><stop offset="1" stop-color="#242c32"/></linearGradient>
    <linearGradient id="siegeEdge" x1="0" y1="0" x2=".3" y2="1"><stop stop-color="#e4e2d5"/><stop offset=".35" stop-color="#a3aaa7"/><stop offset="1" stop-color="#4b595d"/></linearGradient>
    <linearGradient id="siegeRed" x1="0" y1="0" x2=".5" y2="1"><stop stop-color="#e18b87"/><stop offset=".25" stop-color="#c24e50"/><stop offset=".7" stop-color="#923239"/><stop offset="1" stop-color="#48252e"/></linearGradient>
  </defs>
  <ellipse cx="31" cy="44" rx="30" ry="18" fill="#000" opacity=".4"/>
  <g stroke-linejoin="round">
    <!-- Four articulated supports spread around a compact, exposed chassis. -->
    <path d="M24 29 12 23m18 0V10M23 38 12 49m24-10 9 15" fill="none" stroke="#101a20" stroke-width="10"/>
    <path d="M24 28 12 22m18 0V9M23 37 12 48m24-10 9 15" fill="none" stroke="url(#siegeHull)" stroke-width="6.5"/>
    <!-- Rear track shoes: thick black treads, bevelled steel caps and red inserts. -->
    <path d="M2 19 9 13 19 15 23 23 18 31 4 29 1 24Z" fill="#192228" stroke="#0c151a" stroke-width="1.3"/>
    <path d="M3 18 9 14 18 16 20 22 11 26 3 23Z" fill="url(#siegeHull)" stroke="#b4bab0" stroke-width=".65"/>
    <path d="m8 18 4-2 5 2-1 4-7 2-3-2Z" fill="url(#siegeRed)" stroke="#5a3437" stroke-width=".6"/>
    <path d="m4 25 8 2 7-3m-14 4 7 2 6-3" fill="none" stroke="#667174" stroke-width="1"/>
    <path d="m7 19 1 4m4-6-1 5" stroke="#e2b2a4" stroke-width=".6"/>
    <path d="M25 3 33 1 38 5v11l-7 5-8-5V8Z" fill="#192228" stroke="#0c151a" stroke-width="1.3"/>
    <path d="M25 3 33 2 37 5l-2 8-9 2-2-4Z" fill="url(#siegeHull)" stroke="#c1c3b7" stroke-width=".6"/>
    <path d="m27 4 6-1 2 2-1 4-7 1Z" fill="url(#siegeRed)" stroke="#693b3c" stroke-width=".5"/>
    <path d="M26 13v3l5 3 5-4m-10-3 5 3 5-3" fill="none" stroke="#6f797b" stroke-width="1"/>
    <!-- Open armour deck, cooling grilles and small green power strips. -->
    <path d="M17 22 30 13 46 22 48 39 32 51 15 41 11 31Z" fill="#242d32" stroke="#111b21" stroke-width="1.3"/>
    <path d="M17 22 30 14 45 23 32 32 14 31Z" fill="url(#siegeHull)" stroke="#bec2b6" stroke-width=".7"/>
    <path d="M14 31 32 32 46 24 47 39 32 49 16 40Z" fill="url(#siegeHull)" stroke="#1d2c32" stroke-width=".8"/>
    <path d="m18 24 7-5 4 2-7 6Zm17-4 5 2-3 5-6-2ZM16 32l8 4-3 5-6-4Z" fill="#111f25" stroke="#61716e" stroke-width=".6"/>
    <path d="m19 25 5-3m-3 5 5-3m9-1 3 1m-4 1 3 1m-20 8 5 2m-5 0 4 2" stroke="#3ce653" stroke-width=".9"/>
    <path d="M18 19 23 17l4 3-2 5-7-1Z" fill="url(#siegeHull)" stroke="#b8bfb5" stroke-width=".6"/>
    <path d="m21 19 3 1-1 3-3-1Z" fill="url(#siegeRed)"/>
    <path d="M38 18 44 13l5 1-3 8-6 5-4-3Z" fill="url(#siegeHull)" stroke="#161f26" stroke-width="1"/>
    <path d="m41 19 3-4 3 1-2 4-4 3Z" fill="url(#siegeRed)" stroke="#c6c4b6" stroke-width=".5"/>
    <!-- Forward legs expose hydraulic pistons and pointed, split anchor claws. -->
    <path d="m19 36 6 5-9 11-9-2 1-6Z" fill="url(#siegeHull)" stroke="#14232a" stroke-width="1"/>
    <path d="m19 39-6 8m8-6-5 7" stroke="#cbd2c8" stroke-width="1.3"/>
    <path d="m11 43 6 2-3 5-7-1Z" fill="#141f25" stroke="#7b8a86" stroke-width=".6"/>
    <path d="m8 48 7 3-4 8-8-3-2-3Zm8 3 5 2-4 8-6 1-1-3Z" fill="url(#siegeEdge)" stroke="#192b33" stroke-width="1"/>
    <path d="m6 51 6 1-3 4-5-2Zm9 4 4-1-3 5-4 1Z" fill="url(#siegeRed)" stroke="#934c4b" stroke-width=".5"/>
    <path d="M34 39 41 35 49 46 47 54 38 51 32 44Z" fill="url(#siegeHull)" stroke="#17272e" stroke-width="1.1"/>
    <path d="m38 40 6 7m-8-5 6 7" stroke="#c5cec6" stroke-width="1.3"/>
    <path d="M38 47 47 43 54 48v11l-7 4-10-4Z" fill="#1a252b" stroke="#101a20" stroke-width="1.3"/>
    <path d="M38 47 46 44 52 48l-1 8-6 4-7-3Z" fill="url(#siegeHull)" stroke="#b2b9b1" stroke-width=".7"/>
    <path d="m40 49 5-2 5 2-1 6-4 3-5-2Z" fill="url(#siegeRed)" stroke="#65363a" stroke-width=".6"/>
    <path d="m44 49 1 6m-4-3 7 1m-6-4 4 7m0-7-4 6" stroke="#efe9d0" stroke-width=".7"/>
    <path d="m39 59 6 3 7-4m-13-2 6 3 7-4m-12 5v-3m4 5v-3m4 1v-3" fill="none" stroke="#75817c" stroke-width=".9"/>
    <circle cx="22" cy="38" r="3" fill="#273941" stroke="#a8b7b0" stroke-width=".8"/>
    <circle cx="22" cy="38" r="1.2" fill="#121f25"/>
    <circle cx="37" cy="40" r="3" fill="#273941" stroke="#a8b7b0" stroke-width=".8"/>
    <circle cx="37" cy="40" r="1.2" fill="#121f25"/>
    <ellipse cx="31" cy="32" rx="12" ry="10" fill="#18262c" stroke="#7a8b85" stroke-width="1.2"/>
    <ellipse cx="31" cy="31" rx="10" ry="8" fill="url(#siegeHull)" stroke="#c0c9be" stroke-width=".7"/>
  </g>
`;
const tankHead = `
  <defs>
    <linearGradient id="siegeTurret" x1="0" y1="0" x2=".4" y2="1"><stop stop-color="#c5c6b9"/><stop offset=".25" stop-color="#929a97"/><stop offset=".6" stop-color="#5a6669"/><stop offset="1" stop-color="#2c3c43"/></linearGradient>
    <linearGradient id="siegeBarrel" x1="0" y1="0" x2=".3" y2="1"><stop stop-color="#8f9996"/><stop offset=".24" stop-color="#505e63"/><stop offset=".6" stop-color="#293940"/><stop offset="1" stop-color="#14252d"/></linearGradient>
    <linearGradient id="siegePlate" x1="0" y1="0" x2=".3" y2="1"><stop stop-color="#e69a8f"/><stop offset=".25" stop-color="#cd5d5b"/><stop offset=".7" stop-color="#a03742"/><stop offset="1" stop-color="#542d38"/></linearGradient>
  </defs>
  <g stroke-linejoin="round">
    <path d="M16 29 28 21 42 25 46 34 39 44 28 49 17 41Z" fill="#09161e" opacity=".5"/>
    <!-- Broad red command armour sits inside a pale, bevelled turret frame. -->
    <path d="M17 26 28 18 40 22 45 30 40 41 29 47 18 39Z" fill="url(#siegeTurret)" stroke="#162730" stroke-width="1.2"/>
    <path d="M20 25 28 20 38 23 41 29 30 35 20 31Z" fill="url(#siegePlate)" stroke="#e0b0a1" stroke-width=".65"/>
    <path d="M20 32 30 37 29 44 21 39Z" fill="url(#siegePlate)" stroke="#613c43" stroke-width=".6"/>
    <path d="M30 35 41 29 40 39 30 44Z" fill="#35494f"/>
    <path d="m23 24 7-5 6 3-7 6-5-1Z" fill="#b1bbb5" stroke="#3f5459" stroke-width=".7"/>
    <path d="m25 24 5-3 3 1-5 4Z" fill="#e5e7da"/>
    <path d="m17 22 4-4 7 3-3 6-8-1Z" fill="url(#siegeBarrel)" stroke="#253840" stroke-width=".8"/>
    <path d="m19 22 5 1m-6 1 5 1m-1-6 3 1" stroke="#82948c" stroke-width=".8"/>
    <path d="m18 27 7 2v4l-7-3Z" fill="#12272b"/>
    <path d="m19 28 5 2m-5 0 5 2" stroke="#49ed52" stroke-width=".9"/>
    <!-- Parallel recoil rails enclose a deep channel and a wide angular muzzle. -->
    <path d="M31 26 40 23 57 25 63 30v6l-5 5-16-2-12-7Z" fill="url(#siegeBarrel)" stroke="#152931" stroke-width="1.2"/>
    <path d="M34 27 42 26 58 29 62 32 58 37 43 35 34 32Z" fill="#0b1c23" stroke="#5c746b" stroke-width=".65"/>
    <path d="m34 25 7-2 16 2 6 5-4 1-17-3-9 1Z" fill="url(#siegeTurret)" stroke="#293f46" stroke-width=".8"/>
    <path d="m36 25 5-1 14 2 5 3-3 1-15-3Z" fill="url(#siegePlate)"/>
    <path d="m34 33 10 3 15 1 3-3-1 5-4 3-15-3-10-4Z" fill="url(#siegeTurret)" stroke="#253b43" stroke-width=".8"/>
    <path d="m42 37 14 2 2-1" fill="none" stroke="#b4c6b9" stroke-width=".8"/>
    <path d="m37 29 6 1m-5 1 6 1m-3-3 1 4m4-3 8 1m-7 1 8 1" stroke="#44ed48" stroke-width="1.1"/>
    <path d="M60 30h3v5l-4 3-2-2 3-2Z" fill="#10252a" stroke="#859b8d" stroke-width=".6"/>
    <path d="M61 31v3l-2 1" fill="none" stroke="#050f14" stroke-width="1.5"/>
    <path d="m56 27 2 2m-2 0 2-2" stroke="#f2e9d5" stroke-width=".65"/>
    <path d="m34 24 5 2m-4-4 5 2" stroke="#d3dfcc" stroke-width="1.2"/>
    <path d="m23 35 3 1m-3 1 2 1m17-13 4 1m6 1 3 1" stroke="#f3d2bc" stroke-width=".55"/>
    <g fill="#d3ded1" stroke="#354c50" stroke-width=".4"><circle cx="21" cy="28" r=".8"/><circle cx="31" cy="21" r=".8"/><circle cx="27" cy="41" r=".8"/><circle cx="47" cy="28" r=".65"/></g>
  </g>
`;

const cannonBase = `
  <defs>
    <linearGradient id="photonDeck" x1="0" y1="0" x2=".5" y2="1"><stop stop-color="#53775b"/><stop offset=".4" stop-color="#274d3b"/><stop offset="1" stop-color="#0e2c25"/></linearGradient>
    <linearGradient id="photonIvory" x1="0" y1="0" x2=".5" y2="1"><stop stop-color="#f1f1d6"/><stop offset=".35" stop-color="#b6c5b6"/><stop offset="1" stop-color="#647e78"/></linearGradient>
  </defs>
  <ellipse cx="32" cy="48" rx="31" ry="15" fill="#000" opacity=".33"/>
  <g stroke-linejoin="round">
    <!-- Eight radial anchor shoes surround a low, emerald circular platform. -->
    <path d="m10 23 8-3 7 7-8 6-10-3Zm23-7 9 2-2 10-11-1Zm19 7 8 4-4 8-11-6Z" fill="url(#gold)" stroke="#5c5127" stroke-width="1"/>
    <path d="m7 23 7-3 3 6-9 4Zm28-7 7 2-2 5-9-1Zm20 7 5 4-4 5-6-3Z" fill="url(#photonIvory)" stroke="#41574c" stroke-width=".75"/>
    <path d="M5 40C5 18 59 18 59 40v5C58 66 6 66 5 45Z" fill="#132e26" stroke="#273c26" stroke-width="1.2"/>
    <ellipse cx="32" cy="40" rx="27" ry="17" fill="url(#photonDeck)" stroke="#9c9048" stroke-width="1.3"/>
    <path d="M6 41C9 60 54 61 58 42v5C53 64 10 63 6 47Z" fill="#1d392a"/>
    <path d="M7 42C10 60 54 60 57 43" fill="none" stroke="#c9ab50" stroke-width="1.1"/>
    <ellipse cx="32" cy="39" rx="23" ry="14" fill="none" stroke="#182d20" stroke-width="3.5"/>
    <ellipse cx="32" cy="38.5" rx="23" ry="14" fill="none" stroke="#dfbf54" stroke-width="1.6"/>
    <ellipse cx="32" cy="39" rx="17" ry="10" fill="none" stroke="#0e2b20" stroke-width="3.3"/>
    <ellipse cx="32" cy="38.5" rx="17" ry="10" fill="none" stroke="#ccb047" stroke-width="1.5"/>
    <ellipse cx="32" cy="39" rx="10" ry="6" fill="#263f29" stroke="#e3c65a" stroke-width="1.2"/>
    <path d="M15 30 20 33m24-3-4 3M13 48l6-3m30 2-6-3M32 50v6" stroke="#74956e" stroke-width="1.1"/>
    <path d="M12 34q3-5 7-6m25 0q5 2 8 7M21 49q8 4 16 1" fill="none" stroke="#fff0a0" stroke-width=".7"/>
    <path d="M2 33 9 30l5 8-5 6-7-4Zm50 4 6-5 5 4-1 9-9-1ZM8 48l10-4 6 7-9 9-10-4Zm33 2 8-5 11 9-6 6-12-4ZM26 53h12l-1 9-11 1-4-4Z" fill="url(#gold)" stroke="#5a5128" stroke-width="1"/>
    <path d="M1 34 6 32l3 6-1 4-6-2Zm57 1 5 1-1 9-5-1-1-5ZM7 50l6-2 5 6-4 6-9-4Zm45 1 8 3-6 6-6-3ZM25 55h9l-1 7-7 1-4-4Z" fill="url(#photonIvory)" stroke="#435d53" stroke-width=".75"/>
    <path d="m2 35 4-1m-1 6 2-1m52-2 3 1M8 51l4-1 3 4m36-1 6 2M25 56h7l-1 5" fill="none" stroke="#f6f4d8" stroke-width=".8"/>
    <path d="m9 33 3 5m-3 1-1 2m46-3 2 5M16 47l5 4m-3 3 3-3m24-3 4 4m-13 2v6" stroke="#ffe391" stroke-width="1"/>
  </g>
`;
const cannonHead = `
  <defs>
    <linearGradient id="photonCore" x1="0" y1="0" x2="1" y2=".2"><stop stop-color="#3d6750"/><stop offset=".3" stop-color="#739b67"/><stop offset=".6" stop-color="#2a503e"/><stop offset="1" stop-color="#132f26"/></linearGradient>
    <linearGradient id="photonCrystal" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#efffe0"/><stop offset=".35" stop-color="#bde8b2"/><stop offset=".7" stop-color="#70c6b2"/><stop offset="1" stop-color="#2d7e76"/></linearGradient>
  </defs>
  <g stroke-linejoin="round">
    <!-- A raised cylindrical emitter, ringed in gold, replaces the floating orb. -->
    <ellipse cx="32" cy="40" rx="11" ry="6.5" fill="#18332a" stroke="#a38b37" stroke-width="1"/>
    <path d="M22 31h20v8c-1 9-19 9-20 0Z" fill="url(#photonCore)" stroke="#345035" stroke-width=".8"/>
    <ellipse cx="32" cy="31" rx="10" ry="6" fill="#274e38" stroke="#edcb60" stroke-width="1.4"/>
    <path d="M22 36c5 6 15 6 20 0v3c-4 7-17 7-20 0Z" fill="url(#goldDark)" stroke="#d6b54e" stroke-width=".6"/>
    <path d="M25 31v6m14-6v6" stroke="#8d9d5f" stroke-width="1"/>
    <path d="M27 23h10v11c-1 5-9 5-10 0Z" fill="url(#photonCore)" stroke="#566a36" stroke-width=".8"/>
    <path d="M27 25q5 4 10 0m-10 6q5 4 10 0" fill="none" stroke="#d9b64d" stroke-width="1.5"/>
    <path d="M30 24v9" stroke="#d8cd79" stroke-width="1"/>
    <ellipse cx="32" cy="23" rx="6" ry="3.5" fill="url(#gold)" stroke="#685b29" stroke-width=".7"/>
    <ellipse cx="32" cy="22.5" rx="4" ry="2" fill="#284d36" stroke="#e5c86c" stroke-width=".7"/>
    <path d="M29 15h6v8l-3 2-3-2Z" fill="url(#gold)" stroke="#65552a" stroke-width=".7"/>
    <path d="M31 17v6" stroke="#fff1a6" stroke-width=".9"/>
    <!-- Four slender crown prongs frame a small mint crystal. -->
    <path d="M24 18 22 10 23 4l2 3v8l4 4m10-1 3-8-1-6-2 3v8l-4 4" fill="none" stroke="#65552b" stroke-width="3.2"/>
    <path d="M24 18 22 10 23 4m16 14 3-8-1-6" fill="none" stroke="#e7c35f" stroke-width="1.4"/>
    <path d="M27 20 26 13l1-3m10 10 1-7-1-3" fill="none" stroke="#ebcb71" stroke-width="1.6"/>
    <path d="M32 8 36 13 34 19h-4l-2-6Z" fill="url(#photonCrystal)" stroke="#416f58" stroke-width=".7"/>
    <path d="M32 8v8l-3-3Zm0 8 2 3h-4Z" fill="#ddffe0" opacity=".8"/>
    <path d="m32 8 1 5 3 0" fill="none" stroke="#fbffe6" stroke-width=".8"/>
    <path d="m25 16 3 1m8 0 3-1" stroke="#b2e5c5" stroke-width="1.2"/>
  </g>
`;

const dragoonBase = `
  <ellipse cx="32" cy="47" rx="29" ry="13" fill="#000" opacity=".4"/>
  <g fill="none" stroke-linejoin="round" stroke-linecap="round">
    <path d="m24 27-9-9-9 11 3 17m30-19 10-9 10 11-4 16" stroke="#44351e" stroke-width="8"/>
    <path d="m24 26-9-9-9 11 3 17m30-19 10-9 10 11-4 16" stroke="url(#gold)" stroke-width="5.5"/>
    <path d="m24 37-9 4-5 15m30-19 10 4 4 15" stroke="#44351e" stroke-width="9"/>
    <path d="m24 36-9 4-5 15m30-19 10 4 4 15" stroke="url(#gold)" stroke-width="6.5"/>
    <path d="m14 18-6 10 2 10m40-20 7 10-3 10m-40 4-3 10m41-10 2 10" stroke="#ffe7a3" stroke-width="1"/>
  </g>
  <g fill="#b88d3f" stroke="#5c4420" stroke-width=".8">
    <path d="m4 43 6-3 4 6-6 4-5-1Zm46 1 5-4 6 5 1 4-8 2ZM4 55l8-4 6 4-3 5-11 1Zm44 0 5-4 9 5-1 5-12-1Z"/>
  </g>
  <g fill="#8b6b31" stroke="#e9ca7e" stroke-width=".7">
    <circle cx="15" cy="18" r="3"/><circle cx="49" cy="18" r="3"/><circle cx="15" cy="41" r="3.5"/><circle cx="49" cy="41" r="3.5"/>
  </g>
  <path d="M19 26 31 19 44 26 44 39 32 47 19 39Z" fill="url(#goldDark)" stroke="#58431f"/>
  <path d="m24 38 8 4 8-4v4l-8 5-8-5Z" fill="#304f6c"/>
  <path d="m28 43 4 2 4-2" stroke="#77d8f4" stroke-width="1.5"/>
`;
const dragoonHead = `
  <ellipse cx="32" cy="29" rx="18" ry="14" fill="#1e3e56" stroke="#51401e" stroke-width="1.2"/>
  <path d="M15 30C12 19 20 11 31 10 44 10 52 20 49 31L39 38 23 38Z" fill="url(#gold)" stroke="#735827" stroke-width="1.2"/>
  <path d="M16 25Q21 13 31 13L27 29 19 34Z" fill="#e8cb7e"/>
  <path d="M33 12q12 1 15 13l-7 9-5-5Z" fill="#b99343"/>
  <path d="M31 11 27 28 32 34 37 28 34 11Z" fill="#2d4c68" stroke="#7baab4" stroke-width=".65"/>
  <path d="m31 15-2 10 3 5 3-5-2-10Z" fill="url(#blue)"/>
  <path d="M18 31 25 27 32 34 39 27 47 31 42 40 32 45 22 40Z" fill="url(#goldDark)" stroke="#614b23"/>
  <path d="m19 30 6-3 5 5-7 5Zm16 2 4-5 7 3-6 7Z" fill="url(#gold)"/>
  <ellipse cx="33" cy="35" rx="9" ry="8" fill="#173653" stroke="#d7c07b" stroke-width="1.3"/>
  <ellipse cx="33" cy="35" rx="7" ry="6" fill="url(#blue)"/>
  <ellipse cx="33" cy="35" rx="12" ry="10" fill="url(#energy)" opacity=".45"/>
  <path d="M19 22q3-6 7-7m13 1 5 6" stroke="#fff0b2" stroke-width="1" fill="none"/>
  <path d="m21 35 4 5m16-5-4 5" stroke="#f0d382" stroke-width="1.3"/>
`;

// The powered suit and rifle turn together; the soft ground shadow stays fixed.
const marineBase = `
  <ellipse cx="31" cy="55" rx="24" ry="7" fill="#000" opacity=".3"/>
`;
const marineHead = `
  <defs>
    <linearGradient id="marineArmor" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="#8b9ea9"/><stop offset=".18" stop-color="#536b88"/><stop offset=".48" stop-color="#2d4263"/><stop offset=".8" stop-color="#1b2b45"/><stop offset="1" stop-color="#111e2b"/></linearGradient>
    <linearGradient id="marineEdge" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#bbc3b9"/><stop offset=".3" stop-color="#7f8d86"/><stop offset="1" stop-color="#34423e"/></linearGradient>
    <radialGradient id="marineVisor" cx=".35" cy=".24" r=".8"><stop stop-color="#ffffd2"/><stop offset=".18" stop-color="#ffe66d"/><stop offset=".45" stop-color="#e9b72b"/><stop offset=".73" stop-color="#a56813"/><stop offset="1" stop-color="#4f3612"/></radialGradient>
    <linearGradient id="marineRifle" x1="0" y1="0" x2=".2" y2="1"><stop stop-color="#7e8470"/><stop offset=".3" stop-color="#4b5442"/><stop offset="1" stop-color="#202c25"/></linearGradient>
  </defs>
  <g stroke-linejoin="round">
    <!-- Braced legs: thick greaves, exposed knee servos and metal toe caps. -->
    <path d="M19 35 30 36 30 43 27 51 26 59H13l1-9 2-8Zm13 1 11-2 5 8 1 10 2 6H37l-2-9-4-8Z" fill="#101c27" stroke="#0b161c" stroke-width="1.3"/>
    <path d="m19 38 9 1-3 10-9-1Zm16 0 7-1 5 10-10 3Z" fill="url(#marineArmor)" stroke="#78918f" stroke-width=".6"/>
    <path d="m16 46 10 1 2 7-3 6H13l-1-6Zm23 1 9-3 4 9-3 6H37l-2-6Z" fill="url(#marineArmor)" stroke="#172730" stroke-width="1"/>
    <path d="m15 48 8 1 1 5-4 2-6-2Zm24 1 7-2 3 6-5 2-5-1Z" fill="#525e52" stroke="#abb29a" stroke-width=".6"/>
    <path d="m17 49 5 1m-6 2 6 1m18-2 6-2m-5 4 6-2" stroke="#1d2b27" stroke-width=".8"/>
    <path d="m26 43-1 5m2-4-1 4m13-5 2 5m0-6 2 5" stroke="#b8c4bc" stroke-width="1.2"/>
    <path d="M13 56 22 57 27 59v3H10v-3Zm24 0h10l6 3v3H36l-1-3Z" fill="url(#marineEdge)" stroke="#182923" stroke-width="1"/>
    <path d="M12 60h13m12 0h14m-36-1v3m6-3v3m19-3v3m7-3v3" stroke="#3b4941" stroke-width=".8"/>
    <path d="M20 32h19l4 7-9 6h-7l-10-5Z" fill="url(#marineArmor)" stroke="#152431"/>
    <path d="m22 37 7 1 3 5-5-1Zm13 0 5-1-3 5-4 2Z" fill="#69725f" stroke="#a0a78e" stroke-width=".5"/>
    <!-- Backpack and chest are enclosed by the oversized rounded pauldrons. -->
    <path d="M18 16 21 9h21l5 8v18H18Z" fill="#17232b" stroke="#0c171c" stroke-width="1.2"/>
    <path d="M17 17 25 13h13l9 6-2 16-9 6H25l-9-7Z" fill="url(#marineArmor)" stroke="#122431" stroke-width="1.1"/>
    <path d="m23 20 7-2 8 1 5 5-4 6-10 2-7-5Z" fill="url(#marineArmor)" stroke="#718885" stroke-width=".6"/>
    <path d="m26 24 6-2 5 2-2 5h-6Z" fill="#283b54"/>
    <path d="M27 21h9m-8 1h7" stroke="#9da99c" stroke-width=".7"/>
    <g fill="#14231f" stroke="url(#marineEdge)" stroke-width="1.1">
      <ellipse cx="21" cy="23" rx="3.1" ry="3.8"/><ellipse cx="41" cy="23" rx="3.1" ry="3.8"/>
      <circle cx="22" cy="32" r="3"/><circle cx="40" cy="32" r="3"/>
    </g>
    <g fill="#3b4940" stroke="#77816a" stroke-width=".45"><circle cx="21" cy="23" r="1.5"/><circle cx="41" cy="23" r="1.5"/></g>
    <path d="M20 14C13 4 6 7 3 14L1 26l5 7 13-3 5-10Z" fill="url(#marineArmor)" stroke="#0f1e2b" stroke-width="1.2"/>
    <path d="M40 14c8-11 14-6 17 2l2 14-7 5-13-6-3-9Z" fill="url(#marineArmor)" stroke="#0f1e2b" stroke-width="1.2"/>
    <path d="M3 18Q6 6 13 10l8 7M40 16q8-10 14 0" fill="none" stroke="#b1b8a1" stroke-width=".8"/>
    <path d="M3 27 7 30l10-2M42 29l9 3 5-3" fill="none" stroke="#74827c" stroke-width=".8"/>
    <path d="m7 17 2-2m5 0 3 2m-10 7 2 1m4 2 3-1m29-8 2-2m5 6 1 3m-8 3 3 1" stroke="#b1b39a" stroke-width=".55" opacity=".8"/>
    <text x="7" y="23" font-family="monospace" font-size="4.3" font-weight="bold" fill="#c6c9ac" transform="rotate(-16 11 21)">512</text>
    <path d="m47 18 2 1 2-1-1 3 2 2-3-1-3 1 2-2Z" fill="#c6c9ac"/>
    <g fill="#151f27" stroke="#9aa593" stroke-width=".35"><circle cx="7" cy="28" r=".7"/><circle cx="17" cy="19" r=".7"/><circle cx="44" cy="28" r=".7"/><circle cx="52" cy="20" r=".7"/></g>
    <g fill="#101d1b" stroke="url(#marineEdge)" stroke-width="1">
      <ellipse cx="23" cy="24" rx="2.5" ry="3.2"/><ellipse cx="39" cy="24" rx="2.5" ry="3.2"/>
    </g>
    <path d="M22 23l2 2m-2 0 2-2m14 0 2 2m-2 0 2-2" stroke="#717a65" stroke-width=".7"/>
    <!-- The gold faceplate is a dome seated inside a dark armoured collar. -->
    <g transform="translate(30 20) scale(.82 .85) translate(-30 -20)">
    <path d="M20 16C19 8 23 2 30 2s12 6 12 14l-4 5H24Z" fill="#15212b" stroke="#0a141c" stroke-width="1.1"/>
    <path d="M21 14C21 7 25 3 30 3s10 4 11 11" fill="none" stroke="#a1afa7" stroke-width=".85"/>
    <path d="M23 14c0-6 3-9 7-9s8 3 8 9l-2 4H25Z" fill="url(#marineVisor)" stroke="#55431a" stroke-width=".7"/>
    <path d="M25 10q5-5 10 0m-9-1 1 5" fill="none" stroke="#ffffbd" stroke-width="1.2"/>
    <path d="m30 6 1 11m4-9 1 8m-12-4 13 1" fill="none" stroke="#f9d652" stroke-width=".5" opacity=".7"/>
    </g>
    <path d="M21 15q9 7 20 0v5l-6 2h-8l-6-2Z" fill="url(#marineEdge)" stroke="#182c29" stroke-width=".65"/>
    <path d="M24 18h3m9 0h3" stroke="#15251f" stroke-width="1.5"/>
    <!-- Massive forearms and articulated gauntlets wrap around the rifle. -->
    <path d="M6 30 14 28l7 8-3 8-9-3-5-5Z" fill="url(#marineArmor)" stroke="#132634" stroke-width="1.1"/>
    <path d="m7 32 6-2 5 5-1 4-8-3Z" fill="url(#marineArmor)" stroke="#87958b" stroke-width=".55"/>
    <path d="M46 29h7l2 7-6 6-8-3 2-6Z" fill="url(#marineArmor)" stroke="#132634" stroke-width="1"/>
    <path d="M10 36 17 33 24 36 23 43 17 45 10 42Z" fill="url(#marineArmor)" stroke="#a3ab95" stroke-width=".7"/>
    <path d="M13 37 17 35 21 37v5l-4 1-4-2Z" fill="#293e56"/>
    <!-- Boxy C-14 receiver, long barrel shroud, magazine and hazard markings. -->
    <path d="M20 29 25 26h10l3 2 24 1v7l-4 3H39l-2 6h-6l-2-7h-8Z" fill="url(#marineRifle)" stroke="#0e1b16" stroke-width="1.1"/>
    <path d="M24 27h10l4 2 22 1M22 30v5" fill="none" stroke="#a5ae96" stroke-width=".8"/>
    <path d="M29 28h8v3h-8Z" fill="#1a2822"/>
    <path d="m30 28 1 2m2-2 1 2m2-2 1 2" stroke="#d9bf55" stroke-width="1.1"/>
    <path d="M40 30h17v5H40Z" fill="#354134" stroke="#707e64" stroke-width=".5"/>
    <path d="m43 31-1 2m5-2-1 2m5-2-1 2m5-2-1 2" stroke="#14251d" stroke-width="1.4"/>
    <path d="M27 32h7v4h-7Z" fill="#0c1712"/>
    <path d="m34 37 4 1-2 5h-3Z" fill="#8d916d" stroke="#233329" stroke-width=".6"/>
    <path d="M26 36v5l3 1 1-4" fill="none" stroke="#899078" stroke-width="1.2"/>
    <path d="M58 29h5v7h-5Z" fill="url(#marineEdge)" stroke="#172a21" stroke-width=".7"/>
    <path d="M61 30h2v4h-2Z" fill="#08120c"/>
    <path d="M24 35h5v7h-5Zm20 1h8v5l-3 2-5-2Z" fill="url(#marineArmor)" stroke="#132630" stroke-width=".8"/>
    <path d="M25 36h3m-3 2h3m-3 2h3M45 37h6m-6 2h6m-5 2h4" stroke="#9ba694" stroke-width=".9"/>
    <circle cx="16" cy="33" r=".9" fill="#b5e6ae"/>
  </g>
`;
const firebatBase = `
  <ellipse cx="32" cy="53" rx="24" ry="8" fill="#000" opacity=".4"/>
  <path d="m20 35-5 18-5 3v5h17l5-20 5 20h17v-5l-5-3-5-18Z" fill="#6c3c2d" stroke="#2b2422" stroke-width="1.4"/>
  <path d="m20 39-3 12 10 2 3-12m5 0 3 12 10-2-4-12" fill="url(#red)"/>
  <path d="M17 20 32 15 47 20 46 40 32 48 18 40Z" fill="url(#red)" stroke="#452e25" stroke-width="1.3"/>
  <path d="M22 24v14m20-14v14" stroke="#252d2a" stroke-width="5"/>
  <path d="M22 24v9m20-9v9" stroke="#d2a666" stroke-width="2.5"/>
  <path d="m27 32 5-3 6 3-6 9Z" fill="#d5c28a" stroke="#71502d"/>
  <path d="m29 33 3-2 3 2-3 5Z" fill="#272c26"/>
  <path d="M11 24v19m42-19v19" stroke="#2c3029" stroke-width="9"/>
  <path d="M11 25v13m42-13v13" stroke="#a86c3f" stroke-width="6"/>
`;
const firebatHead = `
  <path d="M22 15Q23 6 32 6q10 0 11 9v14l-10 6-11-6Z" fill="url(#red)" stroke="#4e3025"/>
  <path d="m24 17 8-4 9 4-1 7-8 3-8-3Z" fill="#1b2829" stroke="#e0a676" stroke-width="1"/>
  <path d="m26 18 6-2 7 2-1 3-6 2-6-2Z" fill="#ffd477"/>
  <path d="m27 28 5-2 6 2-1 5-5 2-5-2Z" fill="#33413a"/>
  <path d="m10 29 7-3 37 7v8l-7 4-37-8Zm4 13 7-3 35 9v7l-7 3-35-8Z" fill="url(#gun)" stroke="#3b3226" stroke-width="1"/>
  <path d="m45 32 10 2v8l-10 3Zm2 15 11 2v8l-11 3Z" fill="#72523a" stroke="#d2a46a" stroke-width=".8"/>
  <path d="m51 36 4 1v3l-4 1m2 10 5 1v3l-5 1" stroke="#ffb85c" stroke-width="2"/>
`;
const templarBase = `
  <ellipse cx="32" cy="54" rx="22" ry="7" fill="#184d78" opacity=".35"/>
  <ellipse cx="32" cy="53" rx="17" ry="4" fill="none" stroke="#8c92d7" stroke-width="1"/>
  <path d="M23 22 41 22 46 43 53 53 39 57 32 52 24 57 11 53 18 43Z" fill="#514078" stroke="#292547" stroke-width="1.2"/>
  <path d="m23 24 6 2-6 28-10-2 8-15m17-11 4-2 2 13 8 15-11 3Z" fill="#8f7ab1"/>
  <path d="m28 28 4 5 5-5 2 28-7-4-7 4Z" fill="url(#gold)" stroke="#856533" stroke-width=".7"/>
  <path d="m30 34 2 2 3-2-3 13Z" fill="#5e5a91"/>
  <path d="m20 28-8 10-5-3 8-12m30 5 8 10 5-3-8-12" stroke="url(#gold)" stroke-width="5" fill="none"/>
`;
const templarHead = `
  <ellipse cx="32" cy="20" rx="15" ry="16" fill="url(#energy)" opacity=".28"/>
  <path d="M20 22Q19 10 32 4q13 6 12 18l-6 10H26Z" fill="url(#gold)" stroke="#88682e" stroke-width="1"/>
  <path d="M25 17 32 9 39 17 36 27 32 30 28 27Z" fill="#3f3b66"/>
  <path d="m27 19 4 2m2 0 4-2" stroke="#b3eeff" stroke-width="1.6"/>
  <path d="m30 27 2-2 3 2-3 5Z" fill="#b8ebff"/>
  <circle cx="8" cy="33" r="8" fill="url(#energy)"/><circle cx="55" cy="33" r="8" fill="url(#energy)"/>
  <path d="m5 31 3 2-2 4 5-3m41-2 4 2-2 4 5-5" fill="none" stroke="#d8bfff" stroke-width="1.2"/>
`;
// The cruiser is one complete turning hull; only its ground shadow stays fixed.
const cruiserBase = `
  <ellipse cx="32" cy="45" rx="29" ry="12" fill="#000" opacity=".2"/>
  <ellipse cx="32" cy="45" rx="23" ry="8" fill="#000" opacity=".16"/>
`;
const cruiserHead = `
  <defs>
    <linearGradient id="bcHull" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#bac2c7"/><stop offset=".18" stop-color="#87949e"/><stop offset=".5" stop-color="#53616d"/><stop offset="1" stop-color="#303b46"/></linearGradient>
    <linearGradient id="bcEdge" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#d4d9da"/><stop offset=".4" stop-color="#657581"/><stop offset="1" stop-color="#23313c"/></linearGradient>
    <linearGradient id="bcPlate" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#c57967"/><stop offset=".3" stop-color="#9c4d43"/><stop offset="1" stop-color="#592e2c"/></linearGradient>
    <radialGradient id="bcEngine"><stop stop-color="#fff7cc"/><stop offset=".25" stop-color="#ffd98b"/><stop offset=".65" stop-color="#f79947"/><stop offset="1" stop-color="#dc6933" stop-opacity="0"/></radialGradient>
  </defs>
  <g stroke-linejoin="round">
    <!-- Open central neck, exposed reactor piping and longitudinal girders. -->
    <path d="M22 23H49V41H22Z" fill="#101b24" stroke="#17222c" stroke-width="1.5"/>
    <path d="M22 25H49M22 39H49" fill="none" stroke="#82909a" stroke-width="1.7"/>
    <path d="M25 27H48M25 37H48" stroke="#c69c64" stroke-width=".65"/>
    <path d="M28 27v10m5-10v10m5-10v10m5-10v10" stroke="#3a4b58" stroke-width="3.2"/>
    <path d="M27 28v6m5-6v6m5-6v6m5-6v6" stroke="#8a98a1" stroke-width=".85"/>
    <path d="M29 30H45V34H29Z" fill="#080f18"/>
    <!-- Swept aft braces leave space between the engine pods and central hull. -->
    <path d="M13 12 24 13 30 22 24 26 11 20ZM11 44 24 38 30 42 24 51 13 52Z" fill="url(#bcHull)" stroke="#17232e" stroke-width="1.1"/>
    <path d="m16 14 6 1 5 7-4 2-9-6Zm-2 32 9-5 4 2-5 6-6 1Z" fill="#495865" stroke="#b6bec0" stroke-width=".6"/>
    <path d="m16 15 5 1 3 4-6-1Zm2 31 6-3-3 5-5 1Z" fill="url(#bcPlate)"/>
    <!-- Parallel, cylindrical engine nacelles with armoured collars. -->
    <path d="M4 8 9 6 31 7 36 10V16L30 18 9 17 4 15ZM4 49 9 47 31 46 36 49V55L30 58 9 58 4 55Z" fill="#1c2833" stroke="#0e1721" stroke-width="1.2"/>
    <path d="M6 8H28L34 10V14L28 16H6ZM6 49 28 48 34 50V53L28 56H6Z" fill="url(#bcEdge)" stroke="#9da8ad" stroke-width=".45"/>
    <path d="M8 8v8m5-8v8m15-8v8M8 49v7m5-8v8m15-8v8" stroke="#243642" stroke-width="2"/>
    <path d="M15 8H25V10H15ZM15 48H25V50H15Z" fill="url(#bcPlate)"/>
    <path d="M15 12H25M15 53H25" stroke="#d2d5cf" stroke-width=".6"/>
    <path d="M31 10h3v4h-3Zm0 40h3v3h-3Z" fill="#233440" stroke="#9aa6a9" stroke-width=".5"/>
    <ellipse cx="5" cy="12" rx="3" ry="5" fill="url(#bcEngine)"/><ellipse cx="5" cy="53" rx="3" ry="5" fill="url(#bcEngine)"/>
    <path d="M5 9v6M5 50v6" stroke="#ffd58d" stroke-width="1.4"/>
    <!-- Bulky aft reactor deck and raised command bridge. -->
    <path d="M5 25 11 20 23 20 28 25V40L23 45H11L5 40Z" fill="url(#bcHull)" stroke="#101c27" stroke-width="1.4"/>
    <path d="M9 24 13 22H22L25 26V38L21 42H12L9 38Z" fill="#4c5a66" stroke="#b3bfc1" stroke-width=".7"/>
    <path d="M11 26 15 24H22L23 27V36L20 39H12Z" fill="url(#bcEdge)" stroke="#293b47" stroke-width=".65"/>
    <path d="M13 27H22M13 31H22M13 35H21" stroke="#21313e" stroke-width="1.5"/>
    <path d="M14 26h5m-5 4h5m-5 4h5" stroke="#c0cbc7" stroke-width=".55"/>
    <path d="M8 21 12 19H19V22L12 25H8ZM8 42h4l7 2v3h-8l-3-2Z" fill="url(#bcPlate)" stroke="#35414b" stroke-width=".65"/>
    <path d="M22 24v16" stroke="#ddba72" stroke-width=".75"/>
    <ellipse cx="5" cy="33" rx="3.5" ry="7" fill="url(#bcEngine)"/><path d="M4.5 28v10" stroke="#ffe3a0" stroke-width="1.4"/>
    <path d="M12 21 15 17 22 18 24 23 19 26 12 25Z" fill="url(#bcHull)" stroke="#22333e" stroke-width=".7"/>
    <path d="m15 20 4-1 3 2-3 1-4-1Z" fill="#ffc98b" stroke="#e9e1bc" stroke-width=".35"/>
    <path d="M16 18V13m0 1 3 1" stroke="#b8c5c6" stroke-width=".65"/>
    <!-- The signature broad hammerhead bow, not a pointed fighter nose. -->
    <path d="M47 13 54 9 59 11 61 24 58 29 49 27 44 22ZM44 42 49 37 58 35 61 40 59 53 54 55 47 51Z" fill="url(#bcHull)" stroke="#15222e" stroke-width="1.2"/>
    <path d="m48 15 6-3 3 1 2 10-4 2-7-3Zm0 28 7-4 4 2-2 10-3 1-6-3Z" fill="url(#bcPlate)" stroke="#d0a090" stroke-width=".45"/>
    <path d="m49 17 6-2m-6 5 7-2m-7 26 7-2m-7 5 6-2" stroke="#592f31" stroke-width="1"/>
    <path d="M44 25 49 22 59 25 62 29V36L58 40 49 42 44 39Z" fill="url(#bcHull)" stroke="#142430" stroke-width="1.25"/>
    <path d="M46 27 50 25 59 28V31H47ZM47 35H60L57 38 50 40 46 37Z" fill="#71828c" stroke="#b0bec0" stroke-width=".45"/>
    <path d="M47 31H61V35H47Z" fill="#1a2935" stroke="#899b9e" stroke-width=".55"/>
    <path d="M52 32H61M51 34H60" stroke="#d2a76a" stroke-width=".5"/>
    <path d="M59 30H63V35H59Z" fill="#273b49" stroke="#b4c3c3" stroke-width=".5"/>
    <path d="M61 31V34" stroke="#ffcc8d" stroke-width="1.1"/>
    <!-- Small batteries sit along both rails, with barrels facing the bow. -->
    <g fill="#5f737e" stroke="#172c39" stroke-width=".55">
      <path d="m29 23 2-2 3 1v3l-2 1-3-1Zm8 0 2-2 3 1v3l-2 1-3-1Zm-8 17 3-2 2 1v3l-3 1-2-1Zm8 0 3-2 2 1v3l-3 1-2-1Z"/>
    </g>
    <path d="M32 23h4m4 0h4m-12 17h4m4 0h4" stroke="#bac8c7" stroke-width="1"/>
    <g fill="#e4c997"><circle cx="11" cy="26" r=".55"/><circle cx="11" cy="39" r=".55"/><circle cx="25" cy="27" r=".55"/><circle cx="25" cy="38" r=".55"/><circle cx="57" cy="12" r=".65"/><circle cx="57" cy="52" r=".65"/></g>
  </g>
`;

const bunkerBase = `
  <ellipse cx="32" cy="47" rx="31" ry="14" fill="#000" opacity=".4"/>
  <path d="M3 32 11 18 32 10 53 18 61 32 61 47 48 58H16L3 47Z" fill="#25352b" stroke="#121d17" stroke-width="1.5"/>
  <path d="M4 32 13 20 32 13 51 20 60 32 48 43H16Z" fill="url(#olive)" stroke="#bcc4a5" stroke-width=".8"/>
  <path d="M4 34 16 44h32l12-10v11L47 55H17L4 45Z" fill="url(#steel)" stroke="#17291d"/>
  <path d="M12 22 24 17h16l12 5 5 10-10 8H17L7 32Z" fill="#5c6d50" stroke="#243725" stroke-width="1.1"/>
  <path d="M16 21 25 18h14l9 3-6 5H22Z" fill="#c6c8a5"/>
  <path d="M18 27h28l6 6-7 5H19l-7-5Z" fill="url(#olive)" stroke="#aeb798" stroke-width=".6"/>
  <path d="M23 28h18v7H23Z" fill="#718064" stroke="#344934"/>
  <path d="M27 30h10m-10 2h10" stroke="#2a3e2b" stroke-width="1"/>
  <path d="m9 30 9 6v8l-9-6Zm37 6 9-6v8l-9 6ZM16 43h12v7H16Zm20 0h12v7H36Z" fill="#0b1712" stroke="#b2bc98" stroke-width=".8"/>
  <path d="M27 43h10v12H27Z" fill="#354c39" stroke="#14291b"/>
  <path d="M29 45h6v8h-6Z" fill="#192d20"/>
  <path d="M5 40v5l8 6v-5Zm54 0v5l-8 6v-5Z" fill="url(#red)"/>
  <path d="M12 22v-9m0 0 4 3" stroke="#c4cdb4" stroke-width="1"/>
  <circle cx="12" cy="13" r="1.4" fill="#e68b68"/>
  <path d="m17 54 5-2 4 2m12 0 4-2 5 2" fill="none" stroke="#d3bf73" stroke-width="1.4"/>
`;

const layers: Record<TowerKey, { base: string; head: string }> = {
  arrow: { base: turretBase, head: turretHead },
  cannon: { base: tankBase, head: tankHead },
  frost: { base: cannonBase, head: cannonHead },
  sniper: { base: dragoonBase, head: dragoonHead },
  marine: { base: marineBase, head: marineHead },
  firebat: { base: firebatBase, head: firebatHead },
  templar: { base: templarBase, head: templarHead },
  cruiser: { base: cruiserBase, head: cruiserHead },
  bunker: { base: bunkerBase, head: '' },
};

export const UNIT_WORLD_SCALE: Partial<Record<TowerKey, number>> = { cannon: 1.15, cruiser: 1.3 };

export function unitImageUrl(key: TowerKey): string {
  const art = layers[key];
  return 'data:image/svg+xml;base64,' + btoa(svg(art.base + art.head));
}

export function loadUnitArt(scene: Phaser.Scene): void {
  for (const [key, art] of Object.entries(layers)) {
    for (const [part, content] of [['base', art.base], ['barrel', art.head], ['unit', art.base + art.head]]) {
      if (!scene.textures.exists(part + '_' + key)) {
        // Phaser 3.80 decodes every data URI as Base64, including SVG sources.
        scene.load.svg(part + '_' + key, 'data:image/svg+xml;base64,' + btoa(svg(content)), { width: 64, height: 64 });
      }
    }
  }
}

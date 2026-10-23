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
  <defs>
    <linearGradient id="dragoonGold" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="#fff0b6"/><stop offset=".22" stop-color="#d5bd68"/><stop offset=".5" stop-color="#a18a3d"/><stop offset=".8" stop-color="#685c2a"/><stop offset="1" stop-color="#302d1c"/></linearGradient>
    <linearGradient id="dragoonSilver" x1="0" y1="0" x2=".5" y2="1"><stop stop-color="#e4e4d6"/><stop offset=".3" stop-color="#a4b0ad"/><stop offset=".6" stop-color="#667681"/><stop offset="1" stop-color="#2d3b4b"/></linearGradient>
  </defs>
  <ellipse cx="32" cy="52" rx="27" ry="10" fill="#000" opacity=".35"/>
  <g stroke-linejoin="round">
    <!-- High rear leg arches, with gold shells over dark articulated joints. -->
    <path d="M23 28 14 24 7 16 4 21 6 32 11 34 14 28 24 33Zm18 0 9-4 7-8 3 5-2 11-5 2-3-6-10 5Z" fill="#1b2826" stroke="#111c1c" stroke-width="1.2"/>
    <path d="M23 26C20 17 20 8 13 7 6 6 3 13 5 21l5 7 10 3Z" fill="url(#dragoonGold)" stroke="#433b25" stroke-width="1.2"/>
    <path d="M41 26C44 17 44 8 51 7c7-1 10 6 8 14l-5 7-10 3Z" fill="url(#dragoonGold)" stroke="#433b25" stroke-width="1.2"/>
    <path d="M7 11q4-5 8 0l4 12M57 11q-4-5-8 0l-4 12" fill="none" stroke="#fff1b9" stroke-width="1"/>
    <path d="M5 15 4 5 7 2l2 12Zm50-1 2-12 3 3-1 10Z" fill="#272d25" stroke="#111e1d" stroke-width=".9"/>
    <path d="m12 15 6 2-2 9-6-4Zm40 0-6 2 2 9 6-4Z" fill="#42472d" stroke="#c0ad67" stroke-width=".7"/>
    <path d="m13 17 3 1-1 6m36-7-3 1 1 6" fill="none" stroke="#b9ad79" stroke-width=".7"/>
    <path d="M5 26 10 28l-1 6-5 3-2-3Zm54 0-5 2 1 6 5 3 2-3Z" fill="#192a28" stroke="#72817b" stroke-width=".6"/>
    <!-- Long front limbs: rounded hip armour, bent knees and narrow black feet. -->
    <path d="M24 30 16 37 10 51 9 60l4 2 5-8 2-10 9-8Zm16 0 8 7 6 14 1 9-4 2-5-8-2-10-9-8Z" fill="#182927" stroke="#0e1c1b" stroke-width="1.2"/>
    <path d="M25 29Q14 27 10 39l2 7 10-3 7-8Z" fill="url(#dragoonGold)" stroke="#51462a" stroke-width="1"/>
    <path d="M39 29q11-2 15 10l-2 7-10-3-7-8Z" fill="url(#dragoonGold)" stroke="#51462a" stroke-width="1"/>
    <path d="M14 37q2-5 8-5m28 5q-2-5-8-5" fill="none" stroke="#ffedac" stroke-width="1.1"/>
    <path d="m13 40 6-3 2 4-5 3Zm38 0-6-3-2 4 5 3Z" fill="#978447" stroke="#b6ad78" stroke-width=".5"/>
    <path d="m12 44 5 1-2 8-5-1Zm40 0-5 1 2 8 5-1Z" fill="#3b4b3b" stroke="#9a9e79" stroke-width=".65"/>
    <path d="m12 48 3 1m-4 2 3 1m38-4-3 1m4 2-3 1" stroke="#182724" stroke-width="1.2"/>
    <path d="m10 53 5 2-1 6-4 2-3-4Zm44 0-5 2 1 6 4 2 3-4Z" fill="#1a2928" stroke="#091c1c" stroke-width=".9"/>
    <path d="m10 55 2 1-1 4m43-5-2 1 1 4" fill="none" stroke="#667972" stroke-width=".8"/>
    <!-- Silver central carapace, gold vertical crest and underslung abdomen. -->
    <path d="M28 36h8l2 8-5 6-5-5-2-5Z" fill="url(#dragoonSilver)" stroke="#344543" stroke-width=".8"/>
    <path d="m29 41 6-1 1 4-4 3-3-2Z" fill="url(#dragoonGold)" stroke="#6b633a" stroke-width=".5"/>
    <path d="M19 19 26 15h12l7 4-2 15-11 9-11-9Z" fill="url(#dragoonSilver)" stroke="#283946" stroke-width="1.2"/>
    <path d="M21 21 26 18h12l5 3-2 11-9 7-9-7Z" fill="#3c4d5b" stroke="#c7d0c6" stroke-width=".7"/>
    <path d="m22 24 5 2-1 8-4-4Zm20 0-5 2 1 8 4-4Z" fill="#8d9b9e"/>
    <path d="M28 24h8l-1 10-3 3-3-3Z" fill="url(#dragoonGold)" stroke="#625e39" stroke-width=".7"/>
    <path d="m31 25 2 1-1 3 2 1-3 1 1 3" fill="none" stroke="#fff0a5" stroke-width="1.1"/>
    <path d="M27 19v-5l3-2h4l3 2v5Z" fill="url(#dragoonSilver)" stroke="#253b43" stroke-width=".8"/>
    <path d="M30 14v4m4-4v4" stroke="#344c58" stroke-width="1"/>
    <path d="m20 26-4-1m28 1 4-1" stroke="#c6d0c3" stroke-width="1.6"/>
    <g fill="#d2d6b7" stroke="#556352" stroke-width=".4"><circle cx="24" cy="21" r=".65"/><circle cx="40" cy="21" r=".65"/><circle cx="25" cy="33" r=".65"/><circle cx="39" cy="33" r=".65"/></g>
  </g>
`;
const dragoonHead = `
  <ellipse cx="32" cy="20" rx="5" ry="3.8" fill="#1b303f" stroke="#b6c6c1" stroke-width=".8"/>
  <ellipse cx="32" cy="20" rx="3.2" ry="2.4" fill="#2c6799" stroke="#72b4dc" stroke-width=".5"/>
  <path d="M30 20h4" stroke="#c6f6ff" stroke-width=".8"/>
`;
export const DRAGOON_EMITTER = { x: 0, y: -12 };

// The powered suit stays planted; only the rifle and gripping hands track targets.
const marineBase = `
  <ellipse cx="31" cy="55" rx="24" ry="7" fill="#000" opacity=".3"/>
  <defs>
    <linearGradient id="marineArmor" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="#8b9ea9"/><stop offset=".18" stop-color="#536b88"/><stop offset=".48" stop-color="#2d4263"/><stop offset=".8" stop-color="#1b2b45"/><stop offset="1" stop-color="#111e2b"/></linearGradient>
    <linearGradient id="marineEdge" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#bbc3b9"/><stop offset=".3" stop-color="#7f8d86"/><stop offset="1" stop-color="#34423e"/></linearGradient>
    <radialGradient id="marineVisor" cx=".35" cy=".24" r=".8"><stop stop-color="#ffffd2"/><stop offset=".18" stop-color="#ffe66d"/><stop offset=".45" stop-color="#e9b72b"/><stop offset=".73" stop-color="#a56813"/><stop offset="1" stop-color="#4f3612"/></radialGradient>
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
    <!-- Braced upper arms stay with the suit; gripping hands move with the rifle. -->
    <path d="M6 30 14 28l7 8-3 8-9-3-5-5Z" fill="url(#marineArmor)" stroke="#132634" stroke-width="1.1"/>
    <path d="m7 32 6-2 5 5-1 4-8-3Z" fill="url(#marineArmor)" stroke="#87958b" stroke-width=".55"/>
    <path d="M46 29h7l2 7-6 6-8-3 2-6Z" fill="url(#marineArmor)" stroke="#132634" stroke-width="1"/>
    <path d="M10 36 17 33 24 36 23 43 17 45 10 42Z" fill="url(#marineArmor)" stroke="#a3ab95" stroke-width=".7"/>
    <path d="M13 37 17 35 21 37v5l-4 1-4-2Z" fill="#293e56"/>
    <circle cx="16" cy="33" r=".9" fill="#b5e6ae"/>
  </g>
`;
const marineHead = `
  <defs>
    <linearGradient id="marineWeaponArmor" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="#8b9ea9"/><stop offset=".18" stop-color="#536b88"/><stop offset=".48" stop-color="#2d4263"/><stop offset=".8" stop-color="#1b2b45"/><stop offset="1" stop-color="#111e2b"/></linearGradient>
    <linearGradient id="marineWeaponEdge" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#bbc3b9"/><stop offset=".3" stop-color="#7f8d86"/><stop offset="1" stop-color="#34423e"/></linearGradient>
    <linearGradient id="marineRifle" x1="0" y1="0" x2=".2" y2="1"><stop stop-color="#7e8470"/><stop offset=".3" stop-color="#4b5442"/><stop offset="1" stop-color="#202c25"/></linearGradient>
  </defs>
  <g stroke-linejoin="round">
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
    <path d="M58 29h5v7h-5Z" fill="url(#marineWeaponEdge)" stroke="#172a21" stroke-width=".7"/>
    <path d="M61 30h2v4h-2Z" fill="#08120c"/>
    <path d="M24 35h5v7h-5Zm20 1h8v5l-3 2-5-2Z" fill="url(#marineWeaponArmor)" stroke="#132630" stroke-width=".8"/>
    <path d="M25 36h3m-3 2h3m-3 2h3M45 37h6m-6 2h6m-5 2h4" stroke="#9ba694" stroke-width=".9"/>
  </g>
`;
// Offsets from the weapon pivot, matching the two nozzle openings in firebatHead.
export const FIREBAT_MUZZLES = [{ x: 28, y: -11 }, { x: 28, y: 11 }];

const firebatBase = `
  <defs>
    <linearGradient id="firebatArmor" x1="0" y1="0" x2=".6" y2="1"><stop stop-color="#f2927b"/><stop offset=".2" stop-color="#c63f35"/><stop offset=".55" stop-color="#8d2428"/><stop offset="1" stop-color="#381e25"/></linearGradient>
    <linearGradient id="firebatMetal" x1="0" y1="0" x2=".4" y2="1"><stop stop-color="#c7c9ba"/><stop offset=".35" stop-color="#7c8580"/><stop offset="1" stop-color="#303b3d"/></linearGradient>
    <linearGradient id="firebatFuel" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#242a28"/><stop offset=".35" stop-color="#a28b54"/><stop offset=".6" stop-color="#786944"/><stop offset="1" stop-color="#252c2c"/></linearGradient>
  </defs>
  <ellipse cx="31" cy="57" rx="26" ry="6" fill="#000" opacity=".4"/>
  <g stroke-linejoin="round">
    <!-- Twin fuel cylinders and heavy hoses rise behind the armoured collar. -->
    <path d="M15 22V9l5-6h22l6 6v15Z" fill="#141d23" stroke="#070e14" stroke-width="1.2"/>
    <rect x="17" y="4" width="10" height="23" rx="4" fill="url(#firebatFuel)" stroke="#111c1d"/>
    <rect x="37" y="4" width="10" height="23" rx="4" fill="url(#firebatFuel)" stroke="#111c1d"/>
    <path d="M19 8h6m14 0h6M18 18h8m12 0h8" stroke="#c0b283" stroke-width="1.4"/>
    <path d="M18 13Q6 8 6 26m39-13q12-5 12 13" fill="none" stroke="#0a1115" stroke-width="5"/>
    <path d="M17 13Q7 10 7 24m38-11q10-3 11 11" fill="none" stroke="#626d63" stroke-width="1" stroke-dasharray="1 2"/>
    <!-- Thick red greaves, black joints and broad metal boots. -->
    <path d="M18 34h12l1 9-4 16H12l1-12Zm15 0h12l5 13 1 12H36l-4-16Z" fill="#141c23" stroke="#080f16" stroke-width="1.2"/>
    <path d="m18 37 10 1-3 10-10-1Zm17 1 9-1 4 10-10 2Z" fill="url(#firebatArmor)" stroke="#ed8671" stroke-width=".6"/>
    <path d="M15 45h11l2 10-3 4H12l-1-5Zm23 0h10l5 10-3 4H37l-2-6Z" fill="url(#firebatArmor)" stroke="#151d24"/>
    <path d="M15 48h9m-10 3h10m15-3h9m-8 3h10" stroke="#68252a" stroke-width="1.8"/>
    <path d="M12 55h12l4 4v3H9v-4Zm25 0h13l5 3v4H35v-3Z" fill="url(#firebatMetal)" stroke="#111a20"/>
    <path d="M12 59h13m12 0h15m-36-2v4m5-4v4m20-4v4m5-4v4" stroke="#2e3839" stroke-width=".9"/>
    <!-- Compact torso and huge rounded shoulder armour identify the SC1 suit. -->
    <path d="M17 20 27 15h10l10 6-2 18-9 7h-9l-10-7Z" fill="url(#firebatArmor)" stroke="#121820" stroke-width="1.2"/>
    <path d="m21 23 9-3 11 4-2 8-8 4-9-4Z" fill="url(#firebatArmor)" stroke="#ec8d72" stroke-width=".7"/>
    <path d="M22 30h18m-16 4h14m-12 4h10" stroke="#372029" stroke-width="2"/>
    <path d="m27 24 4-2 5 3-4 6-5-3Z" fill="#2c3131" stroke="#c6ad69" stroke-width=".6"/>
    <path d="m31 24-2 4 3-1 1 2 1-3Z" fill="#f3bc55"/>
    <path d="M21 16Q15 8 8 11 1 13 2 25l5 7 13-3 5-9Zm19 0q6-8 13-5 8 4 7 14l-6 7-13-3-5-9Z" fill="url(#firebatArmor)" stroke="#101820" stroke-width="1.2"/>
    <path d="M4 21q1-10 8-9l8 5m20 0 8-5q7-1 9 9" fill="none" stroke="#f7a282" stroke-width=".9"/>
    <g fill="#1a2528" stroke="url(#firebatMetal)" stroke-width="1.4"><ellipse cx="12" cy="22" rx="5" ry="5.5"/><ellipse cx="50" cy="22" rx="5" ry="5.5"/></g>
    <path d="M9 20h6m-6 2h6m-5 2h4m30-4h6m-6 2h6m-5 2h4" stroke="#89918a" stroke-width=".8"/>
    <path d="M5 31 12 29l9 7-3 8-11-3-4-5Zm40 4 8-6 7 3 1 6-9 6-9-3Z" fill="url(#firebatArmor)" stroke="#151c23"/>
    <!-- Recessed amber visor and black respirator remain fixed with the body. -->
    <path d="M22 18V12q1-9 10-9 9 1 10 9v7l-5 7H27Z" fill="#20272b" stroke="#0d141b" stroke-width="1.2"/>
    <path d="M24 13q1-8 8-8t8 8l-4 4h-9Z" fill="url(#firebatArmor)" stroke="#da8c76" stroke-width=".7"/>
    <path d="m25 14 7-2 7 2-2 5-5 2-6-3Z" fill="#0a161c" stroke="#c4b28e" stroke-width=".7"/>
    <path d="m27 15 5-1 5 1-2 2-4 1-4-1Z" fill="#efb34c"/><path d="m28 15 3-.5" stroke="#fff2a0" stroke-width=".8"/>
    <path d="m27 20 5-2 5 2-1 5-4 3-5-3Z" fill="url(#firebatMetal)" stroke="#152028" stroke-width=".7"/>
    <path d="M29 21h6m-6 2h6m-5 2h4" stroke="#111c21" stroke-width="1"/>
    <g fill="#a0a399"><circle cx="7" cy="28" r=".7"/><circle cx="18" cy="17" r=".7"/><circle cx="44" cy="17" r=".7"/><circle cx="55" cy="28" r=".7"/></g>
  </g>
`;
const firebatHead = `
  <defs>
    <linearGradient id="firebatGauntlet" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#ed937a"/><stop offset=".25" stop-color="#c33c32"/><stop offset=".7" stop-color="#7c262b"/><stop offset="1" stop-color="#2b2027"/></linearGradient>
    <linearGradient id="firebatNozzle" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#c6c9b4"/><stop offset=".35" stop-color="#6b7773"/><stop offset="1" stop-color="#1b282c"/></linearGradient>
  </defs>
  <g stroke-linejoin="round">
    <!-- Two separate cylindrical gauntlets point along +X, rotating without the suit. -->
    <path d="m17 32 7-5 11-5 7 4-10 8-8 5-7-2Zm1 3 8 1 13 5-2 9-14-6-8-6Z" fill="url(#firebatGauntlet)" stroke="#101b22" stroke-width="1"/>
    <path d="m24 31 11-6m-10 16 9 4" stroke="#e69a7d" stroke-width=".8"/>
    <path d="M36 18 41 13 49 14 54 19v6l-6 5-10-2-4-5Zm-2 22 5-5 10 1 5 5v6l-6 5-12-2-4-5Z" fill="url(#firebatGauntlet)" stroke="#101b22" stroke-width="1.1"/>
    <path d="m39 17 8 1m-10 3 10 1m-10 17 10 1m-11 3 11 1" stroke="#ed9b78" stroke-width=".65"/>
    <path d="M42 15v13m-3 9v13" stroke="#541f26" stroke-width="2"/>
    <path d="M46 16h5v12h-5Zm0 22h5v12h-5Z" fill="url(#firebatNozzle)" stroke="#1a2427" stroke-width=".6"/>
    <path d="M46 18h11l3 2v3l-3 2H46Zm0 22h11l3 2v3l-3 2H46Z" fill="url(#firebatNozzle)" stroke="#101c22" stroke-width=".8"/>
    <path d="M49 19v5m4-5v5m-4 17v5m4-5v5" stroke="#212c30" stroke-width="1.4"/>
    <path d="M57 19h3v5h-3Zm0 22h3v5h-3Z" fill="#080f15" stroke="#8d9383" stroke-width=".5"/>
    <path d="M58 20v2m0 20v2" stroke="#ffb247" stroke-width="1.4"/>
    <path d="M45 26h8m-8 22h8" stroke="#aa823d" stroke-width="1.3"/><circle cx="54" cy="26" r="1" fill="#ffb957"/><circle cx="54" cy="48" r="1" fill="#ffb957"/>
  </g>
`;
const archonBase = `
  <ellipse cx="32" cy="57" rx="22" ry="5" fill="#08182e" opacity=".6"/>
  <ellipse cx="32" cy="56" rx="17" ry="3" fill="#36baff" opacity=".18"/>
`;
const archonHead = `
  <defs>
    <radialGradient id="archonAura"><stop stop-color="#ecffff" stop-opacity=".92"/><stop offset=".43" stop-color="#83f9ff" stop-opacity=".85"/><stop offset=".69" stop-color="#2cd6ff" stop-opacity=".65"/><stop offset=".84" stop-color="#2467ff" stop-opacity=".75"/><stop offset="1" stop-color="#282baa" stop-opacity="0"/></radialGradient>
    <linearGradient id="archonBody" x1="0" y1="0" x2="1" y2=".5"><stop stop-color="#041024"/><stop offset=".58" stop-color="#143958"/><stop offset="1" stop-color="#3286a1"/></linearGradient>
  </defs>
  <circle cx="32" cy="30" r="30" fill="url(#archonAura)"/>
  <path d="m9 15 5-7 8 2 6-7 9 4 8-2 5 8 8 4-3 9 5 8-6 6-1 10-9 2-6 6-9-3-9 2-4-8-9-4 2-10-5-7Z" fill="none" stroke="#3475ff" stroke-width="3" opacity=".3"/>
  <path d="M12 18Q22 1 41 9M51 18Q65 35 46 49M35 55Q10 55 8 34" fill="none" stroke="#42e9ff" stroke-width="2" opacity=".8"/>
  <path d="m12 15 7 1-3 6 5 3-6 5-4-1 2 7-5 4m23-33 3 7-5 5m18-8-3 7 7 4-4 6 7 5-4 7 4 3m-34-2 5 2-1 7 7-3 3 6 7-4" fill="none" stroke="#d4fdff" stroke-width="1.1" opacity=".85"/>
  <path d="M25 22q7-6 15 0l-1 9-4 8 1 8-4 8-4-1 2-8-4-8-2-7Z" fill="url(#archonBody)" stroke="#5be5f3" stroke-width=".55"/>
  <path d="m27 23-8 4-5 11 2 5 3-1-2-5 5-7 7-2m9-6 7 3 5-5 5 1 3 4-5-2-4 6-9 1" fill="url(#archonBody)" stroke="#55cee4" stroke-width=".55"/>
  <path d="m16 38-2 5 2 4 1-5 3 5 1-2-3-6m32-18 6-2 4 3-5-1 4 4-1 2-5-4" fill="#081b32"/>
  <path d="m27 39-5 6 2 6 5 1-4-5 7-6m2 10 4 2 5-1-4 4-7-1" fill="#0a2039" stroke="#4cb7d0" stroke-width=".5"/>
  <path d="M27 11 39 17 38 23 33 26 28 23 25 17Z" fill="#030c1d" stroke="#309ac8" stroke-width=".7"/>
  <path d="m28 18 7 3 3-2-3 5-4-2Z" fill="#174163"/><path d="m30 20 5 2 2-1" fill="none" stroke="#71faff" stroke-width="1"/>
  <path d="m25 28 5 3-2 4 6-1 3-7m-7 11 4 2" fill="none" stroke="#66e9ed" stroke-width=".8" opacity=".65"/>
  <path d="M10 43q13 14 33 7M16 9q-9 10-9 19M50 11q7 6 8 13" fill="none" stroke="#98faff" stroke-width=".8"/>
  <path d="m8 26 5-3-1-5m32 28 5-4-2-4m-26 9 5-4-2-4" fill="none" stroke="#baadff" stroke-width="1.3"/>
  <circle cx="50" cy="24" r="7" fill="url(#energy)"/><circle cx="50" cy="24" r="2" fill="#dcffff"/>
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
  <defs>
    <radialGradient id="bunkerDome" cx=".32" cy=".2" r=".85"><stop stop-color="#ecece2"/><stop offset=".3" stop-color="#b6bec1"/><stop offset=".58" stop-color="#7b8794"/><stop offset=".82" stop-color="#4a5669"/><stop offset="1" stop-color="#263343"/></radialGradient>
    <linearGradient id="bunkerRamp" x1="0" y1="0" x2=".3" y2="1"><stop stop-color="#67778b"/><stop offset=".3" stop-color="#3f526b"/><stop offset="1" stop-color="#1b2c40"/></linearGradient>
    <linearGradient id="bunkerFrame" x1="0" y1="0" x2=".6" y2="1"><stop stop-color="#8d99a2"/><stop offset=".45" stop-color="#485463"/><stop offset="1" stop-color="#202d3b"/></linearGradient>
    <linearGradient id="bunkerRed" x1="0" y1="0" x2=".3" y2="1"><stop stop-color="#e05a57"/><stop offset=".3" stop-color="#bb262f"/><stop offset="1" stop-color="#5a1824"/></linearGradient>
  </defs>
  <g transform="translate(0 9) scale(1 .85)">
  <ellipse cx="32" cy="49" rx="31" ry="13" fill="#000" opacity=".4"/>
  <g stroke-linejoin="round">
    <!-- Low angular buttresses and four broad, ribbed armour slopes. -->
    <path d="M3 32 14 20 32 14 50 20 61 32l2 15-16 14H17L1 47Z" fill="#17222e" stroke="#0b1721" stroke-width="1.4"/>
    <path d="M8 29 19 17 30 15 24 29l-13 7Zm26-14 11 2 11 12-3 7-13-7Z" fill="url(#bunkerRamp)" stroke="#6f808e" stroke-width=".65"/>
    <path d="m12 27 11-6m-9 8 10-5m16-4 11 7m-12-4 10 6" stroke="#24364b" stroke-width="1.2"/>
    <path d="M4 32 14 28l7 9-8 10-12-4Zm46-4 10 4 3 11-12 4-8-10Z" fill="url(#bunkerFrame)" stroke="#0f1e29" stroke-width="1"/>
    <path d="m5 35 2-1 3 8-2 1Zm5-2 2-1 4 8-2 2Zm44-1 2 1-4 9-2-2Zm5 2 2 1-3 8-2-1Z" fill="url(#bunkerRed)" stroke="#561d29" stroke-width=".5"/>
    <path d="M17 36 32 40 47 36 53 49 43 58H21L11 49Z" fill="url(#bunkerFrame)" stroke="#16232e" stroke-width="1"/>
    <!-- Flared silver dome with recessed firing embrasures, not a flat roof. -->
    <path d="M13 30C15 17 21 10 32 10s17 7 19 20l-4 8c-8 8-22 8-30 0Z" fill="url(#bunkerDome)" stroke="#1c2c39" stroke-width="1.2"/>
    <path d="M14 31c4 9 11 13 18 13s15-5 18-13" fill="none" stroke="#aeb8ba" stroke-width=".8"/>
    <path d="M18 20q3-5 8-7m-8 17 6-10m22 1-7-7m7 18-6-11M31 24v16" fill="none" stroke="#dae0d8" stroke-width=".65" opacity=".65"/>
    <path d="m15 24 6 2v6l-5-1Zm29 2 5-3-1 8-5 2ZM21 32l6 2-1 6-6-2Zm16 2 6-2 1 6-6 2Z" fill="#0b151e" stroke="#5c6e7c" stroke-width=".8"/>
    <path d="m16 25 4 2m24 0 4-2M22 33l4 2m12 0 4-2" fill="none" stroke="#040c12" stroke-width="1.1"/>
    <!-- The roof hatch has eight red radial locks around a dark centre. -->
    <ellipse cx="32" cy="17" rx="12" ry="7.2" fill="#637281" stroke="#cbd1ca" stroke-width=".8"/>
    <ellipse cx="32" cy="17" rx="10.5" ry="5.7" fill="#283746" stroke="#83949c" stroke-width=".6"/>
    <ellipse cx="32" cy="17" rx="6.7" ry="3.8" fill="#131e29" stroke="#0e1820" stroke-width=".6"/>
    <g fill="url(#bunkerRed)" stroke="#551c26" stroke-width=".5">
      <path d="M30.5 10.8h3v3.4h-3Zm0 9.2h3v3.4h-3ZM21.5 15.7h4.2v2.6h-4.2Zm16.8 0h4.2v2.6h-4.2ZM24 12l2.2-1 2.5 2.8-2.3 1Zm11.3 1.8 2.5-2.8 2.2 1-2.4 2.8ZM24 22l2.4-2.8 2.3 1-2.5 2.8Zm11.3-1.8 2.3-1L40 22l-2.2 1Z"/>
    </g>
    <path d="M31 11h2m-9 5h2m13 0h2m-10 4h2" stroke="#f28170" stroke-width=".5"/>
    <!-- Ribbed skirts overlap the dome's lower perimeter. -->
    <path d="m9 39 10-5 11 10-9 15-17-9Zm36-5 10 5 5 11-17 9-9-15Z" fill="url(#bunkerRamp)" stroke="#172a3d" stroke-width="1.1"/>
    <path d="m10 40 10-4 8 8-8 13-13-7Zm34-4 10 4 3 10-13 7-8-13Z" fill="none" stroke="#8a9ba6" stroke-width=".6"/>
    <path d="M9 42 24 49M8 45 22 52M10 48 21 54M13 39 26 45M38 43 51 37M39 46 54 39M40 49 56 42M42 52 57 45M43 55 58 48" stroke="#22364d" stroke-width="1.1"/>
    <path d="M10 42 24 48M9 45 22 51M38 42 51 36M39 45 54 38M41 51 56 44" stroke="#7f93a6" stroke-width=".4"/>
    <path d="M26 45h12l8 10-14 8-14-8Z" fill="url(#bunkerFrame)" stroke="#142634" stroke-width="1.1"/>
    <path d="M27 48h10l6 7-11 6-11-6Z" fill="#52616e" stroke="#8d9b9f" stroke-width=".6"/>
    <path d="m23 52 2-1 4 7-2 1Zm5-2 2-1 3 9-2 1Zm9-1 2 1-3 9-2-1Zm5 3 2 1-4 7-2-1Z" fill="url(#bunkerRed)" stroke="#571e29" stroke-width=".45"/>
    <path d="M30 37h4v10h-4Z" fill="#172734" stroke="#0c1a24" stroke-width=".8"/>
    <path d="M31 38h2v8h-2Z" fill="url(#bunkerRed)"/>
    <g fill="#a9b9ba" stroke="#243e4c" stroke-width=".4"><circle cx="10" cy="32" r=".65"/><circle cx="54" cy="32" r=".65"/><circle cx="23" cy="55" r=".65"/><circle cx="41" cy="55" r=".65"/></g>
  </g>
  </g>
`;

const layers: Record<TowerKey, { base: string; head: string }> = {
  arrow: { base: turretBase, head: turretHead },
  cannon: { base: tankBase, head: tankHead },
  frost: { base: cannonBase, head: cannonHead },
  sniper: { base: dragoonBase, head: dragoonHead },
  marine: { base: marineBase, head: marineHead },
  firebat: { base: firebatBase, head: firebatHead },
  templar: { base: archonBase, head: archonHead },
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

import type { TowerKey } from './config';

// Original SVG silhouettes inspired by the StarCraft 1 roster, using unitArt's shared materials.
export const classicUnitLayers = {
  ghost: {
    base: `<ellipse cx="29" cy="53" rx="20" ry="7" fill="#000" opacity=".4"/>
      <path d="m23 32-8 19 8 7 8-17 7 17 10-5-10-23Z" fill="#4d6471" stroke="#172b37" stroke-width="2"/>
      <path d="m21 15-7 25 10 7 8-8 10 7 6-13-7-18Z" fill="url(#steel)" stroke="#d5e3dd"/>
      <path d="m18 26-4 15 8 5 7-8m11-14 5 16-7 4" fill="none" stroke="#839a9f" stroke-width="2"/>
      <path d="m20 54 5 3m15-4 6 2" stroke="#d4dfd3" stroke-width="3"/>`,
    head: `<path d="M22 12q10-10 17 1l-1 15H24Z" fill="#d3dfd6" stroke="#253f49" stroke-width="2"/>
      <path d="m24 15 12-1 1 8-12 2Z" fill="#132e37"/><path d="m27 18 9-1" stroke="#8affe1" stroke-width="3"/>
      <path d="m18 27 12 2 9 8-4 6-15-5Z" fill="#8ca0a3" stroke="#1c3440" stroke-width="2"/>
      <path d="M29 30h29v6H29Z" fill="url(#gun)" stroke="#152d38"/><path d="M39 26h10v3H39m7 5h16" stroke="#c0dbce" stroke-width="2"/>
      <circle cx="43" cy="28" r="2" fill="#83efc9"/>`,
  },
  goliath: {
    // Keep the walker together when aiming; a separately rotating torso tears away from its legs.
    base: `<ellipse cx="30" cy="53" rx="24" ry="7" fill="#000" opacity=".32"/>
      <ellipse cx="30" cy="53" rx="18" ry="4" fill="#000" opacity=".18"/>`,
    head: `<defs>
        <linearGradient id="goliathArmor" x1="0" y1="0" x2=".6" y2="1"><stop stop-color="#d4d5c5"/><stop offset=".3" stop-color="#929e99"/><stop offset=".65" stop-color="#58686b"/><stop offset="1" stop-color="#2a3943"/></linearGradient>
        <linearGradient id="goliathTrim" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#e2e1cb"/><stop offset=".45" stop-color="#9aaba7"/><stop offset="1" stop-color="#40535a"/></linearGradient>
        <linearGradient id="goliathRed" x1="0" y1="0" x2=".3" y2="1"><stop stop-color="#ce8172"/><stop offset=".4" stop-color="#9b4943"/><stop offset="1" stop-color="#4e2a30"/></linearGradient>
      </defs>
      <g stroke-linejoin="round">
        <!-- Two articulated legs leave a clear gap beneath the narrow hip block. -->
        <path d="m22 31 8 3-8 10-1 9-9-1 1-12Z" fill="#26343e" stroke="#111f29" stroke-width="1.3"/>
        <path d="m23 32 5 3-8 9-4-3Z" fill="url(#goliathArmor)" stroke="#a6b2aa" stroke-width=".6"/>
        <path d="m15 43 5 1-2 9-4-1Z" fill="url(#goliathTrim)"/>
        <path d="m14 45 4 1m-5 3 4 1" stroke="#344a54" stroke-width="1.4"/>
        <path d="m12 50 8 1 5 5-2 3H9L7 56Z" fill="url(#goliathArmor)" stroke="#162631" stroke-width="1.2"/>
        <path d="m10 54 9 1 3 2H9m3-5 6 1" fill="none" stroke="#c9cebd" stroke-width=".8"/>
        <path d="m29 32 9-1 6 12-4 12-8-2 2-11-8-5Z" fill="#26343e" stroke="#111f29" stroke-width="1.3"/>
        <path d="m32 33 5-1 5 10-6 3-6-7Z" fill="url(#goliathArmor)" stroke="#bac2b6" stroke-width=".7"/>
        <path d="m35 45 6-2-3 11-6-1Z" fill="url(#goliathTrim)" stroke="#152b36" stroke-width=".7"/>
        <path d="m35 47 4-1m-5 4 4-1" stroke="#344a54" stroke-width="1.4"/>
        <path d="m32 52 8 1 7 5-2 3H31l-3-4Z" fill="url(#goliathArmor)" stroke="#14242e" stroke-width="1.2"/>
        <path d="m31 56 8 1 5 2H31m2-5 6 1" fill="none" stroke="#d1d3bf" stroke-width=".8"/>
        <g fill="url(#goliathRed)" stroke="#24323b" stroke-width=".9"><path d="m13 39 6-2 3 4-4 4-6-2Z"/><path d="m35 39 6-2 4 5-5 5-6-3Z"/></g>
        <path d="m21 29 12-3 7 7-6 5-12-3Z" fill="#283943" stroke="#13232e"/>
        <path d="m23 30 9-1 5 4-5 2-8-2Z" fill="url(#goliathTrim)"/>
        <!-- Far shoulder and its own short cannon sit behind the central cockpit. -->
        <path d="m30 12 7-4 8 4-1 12-9 3-6-5Z" fill="url(#goliathArmor)" stroke="#172731" stroke-width="1.2"/>
        <path d="m32 13 5-3 6 3-1 7-9 2Z" fill="url(#goliathRed)" stroke="#d2b6a0" stroke-width=".5"/>
        <path d="m35 22 8-1 2 5-4 5-8-3Z" fill="url(#goliathArmor)" stroke="#182b36"/>
        <path d="M40 25.5h8v4h-8Z" fill="url(#gun)" stroke="#182934" stroke-width=".8"/>
        <path d="M46 25h4v5h-4Z" fill="#2e414a" stroke="#a1aaa3" stroke-width=".7"/>
        <path d="M49 26v3" stroke="#0c1822" stroke-width="1.6"/>
        <!-- Broad rear armour frames a compact, forward-facing blue cockpit. -->
        <path d="m15 16 12-5 11 7 1 13-10 7-14-6-4-9Z" fill="url(#goliathArmor)" stroke="#12232e" stroke-width="1.4"/>
        <path d="m17 17 10-4 7 5-8 4-12-1Z" fill="#bdc3b5" stroke="#e1deca" stroke-width=".6"/>
        <path d="m14 23 10 1 5 11-12-5Z" fill="#566970" stroke="#8c9c98" stroke-width=".6"/>
        <path d="m25 17 9-2 7 6-2 10-9 2-7-9Z" fill="url(#goliathTrim)" stroke="#20333e" stroke-width="1.1"/>
        <path d="m28 19 6-1 5 4-2 6-7 1-4-6Z" fill="#0b2332" stroke="#506c77" stroke-width=".7"/>
        <path d="m28 20 6-1 3 3-7 1Z" fill="#6bbac4"/><path d="m30 24 7-1-1 3-5 1Z" fill="#2b667b"/>
        <path d="m28 29 3 2 6-1" fill="none" stroke="#d2d6c3" stroke-width=".7"/>
        <path d="m17 25 5 2m-5 1 6 2m-5 1 5 2" stroke="#233945" stroke-width="1.2"/>
        <!-- Near missile pod has recessed launch tubes, rather than decorative horns. -->
        <path d="m8 14 8-5 9 4 1 12-9 5-9-5Z" fill="url(#goliathArmor)" stroke="#14252f" stroke-width="1.3"/>
        <path d="m10 14 6-3 7 3-7 3Z" fill="#d0d1bd"/>
        <path d="m10 17 7 2 6-3v8l-6 4-7-4Z" fill="url(#goliathRed)" stroke="#653d3b" stroke-width=".7"/>
        <g fill="#182730" stroke="#b39981" stroke-width=".55"><ellipse cx="13" cy="20" rx="1.2" ry="1.5"/><ellipse cx="17" cy="21" rx="1.2" ry="1.5"/><ellipse cx="13" cy="24" rx="1.2" ry="1.5"/><ellipse cx="17" cy="25" rx="1.2" ry="1.5"/><ellipse cx="36" cy="14" rx="1" ry="1.2"/><ellipse cx="40" cy="14" rx="1" ry="1.2"/><ellipse cx="36" cy="18" rx="1" ry="1.2"/><ellipse cx="40" cy="18" rx="1" ry="1.2"/></g>
        <circle cx="18" cy="31" r="4" fill="#253943" stroke="#acb6aa" stroke-width=".9"/><circle cx="18" cy="31" r="1.8" fill="#597078"/>
        <path d="m20 29 9 3 8-1 5 5-4 6-12-1-7-5Z" fill="url(#goliathArmor)" stroke="#162b36" stroke-width="1.2"/>
        <path d="m23 31 6 3 8-1 3 3-13 1-5-3Z" fill="#abb7af"/>
        <path d="m26 38 10-1 2 3-11-1Z" fill="url(#goliathRed)"/>
        <path d="M38 34.5h10v4H38Z" fill="url(#gun)" stroke="#192a35" stroke-width=".8"/>
        <path d="M46 34h4v5h-4Z" fill="#31454e" stroke="#b7bcae" stroke-width=".7"/>
        <path d="M49 35v3" stroke="#0b1821" stroke-width="1.6"/>
        <path d="M40 35.5h5M40 26.5h5" stroke="#cbd1bf" stroke-width=".6"/>
        <g fill="#d2d1b8"><circle cx="10" cy="15" r=".65"/><circle cx="23" cy="15" r=".65"/><circle cx="24" cy="33" r=".7"/><circle cx="36" cy="35" r=".7"/></g>
      </g>`,
  },
  zealot: {
    base: `<ellipse cx="30" cy="54" rx="23" ry="7" fill="#000" opacity=".4"/>
      <path d="m24 30-13 14 6 15 11-3 4-14 9 15 12-4-9-18Z" fill="url(#goldDark)" stroke="#483c29" stroke-width="2"/>
      <path d="m16 44 7 1 3 10-8 2m21-11 8-3 5 9-9 3" fill="url(#gold)" stroke="#fff0b0"/>
      <path d="m23 17-10 8 9 14 18 1 11-16-12-9Z" fill="url(#gold)" stroke="#5c492b" stroke-width="2"/>
      <path d="m27 22 7-3 5 8-8 7Z" fill="#263f74" stroke="#9ad7ff"/>`,
    head: `<path d="m24 8 9-4 10 11-5 10-12-2Z" fill="#b2a9a4" stroke="#4b4250" stroke-width="1.5"/>
      <path d="m24 7 9-3 10 8-6 2-4-5-7 5Z" fill="url(#gold)"/>
      <path d="m31 17 8-1" stroke="#90eaff" stroke-width="2"/>
      <path d="m16 24 15 8-3 9-15-8Zm28-3 8 8-5 13-9-4Z" fill="url(#gold)" stroke="#5d4a29" stroke-width="1.5"/>
      <path d="m28 34 28-9-19 17Zm17 0 17 3-22 7Z" fill="#69c8f8" stroke="#c5ffff" stroke-width="1.5"/>
      <path d="m31 35 18-6m-6 10 12-1" stroke="#fff" stroke-width="1.5"/>`,
  },
  highTemplar: {
    base: `<ellipse cx="31" cy="55" rx="23" ry="6" fill="#000" opacity=".4"/>
      <path d="m23 17-12 36 13 7 9-6 10 5 13-8-17-36Z" fill="#675489" stroke="#312748" stroke-width="2"/>
      <path d="m23 23-6 29 9 4 5-23m6-13 13 30-8 4-8-24" fill="#b5a2c6" stroke="#e0c4c6"/>
      <path d="m29 24-3 35 8-5 6 3-5-33Z" fill="url(#gold)" stroke="#6f5631"/>
      <path d="m20 40 6 2m13-2 7-3" stroke="#d1b47c" stroke-width="2"/>`,
    head: `<path d="m24 12 8-10 9 11-1 15-9 5-8-7Z" fill="url(#gold)" stroke="#644b31" stroke-width="1.5"/>
      <path d="m27 14 6-5 4 7-4 11-5-2Z" fill="#5c527d"/>
      <path d="M29 18h6" stroke="#b7f2ff" stroke-width="2"/>
      <path d="m18 24-9 10 6 7 12-8m15-9 13 9-6 9-12-9" fill="#ac91bf" stroke="#e2c68c" stroke-width="2"/>
      <circle cx="13" cy="35" r="6" fill="url(#energy)"/><circle cx="51" cy="35" r="7" fill="url(#energy)"/>
      <path d="m7 27 4 3-3 7m43-10 5 4-3 8" fill="none" stroke="#bcecff"/>`,
  },
  reaver: {
    base: `<ellipse cx="31" cy="47" rx="30" ry="12" fill="#000" opacity=".4"/>
      <path d="m7 32-3 13 7 8 40 1 11-13-8-15Z" fill="#4b443e" stroke="#252a32" stroke-width="2"/>
      <path d="m11 43-4 9m12-8-3 12m13-12-1 13m13-13 3 11m6-16 6 10" stroke="#6ea0bc" stroke-width="4"/>
      <path d="M5 30q7-19 32-14l18 8 6 14-13 10-34-4Z" fill="url(#goldDark)" stroke="#56432c" stroke-width="2"/>
      <path d="M8 28q8-16 28-10l-3 23-17-1Z" fill="url(#gold)" stroke="#fae4a1"/>
      <path d="m19 19-5 20m15-21-5 23m14-21-3 23m12-19-3 19" fill="none" stroke="#665333" stroke-width="2"/>`,
    head: `<path d="m42 22 13 5 7 13-11 7-13-8Z" fill="url(#gold)" stroke="#6f532b" stroke-width="1.5"/>
      <path d="m49 31 9 5-1 6-10-3Z" fill="#152c41" stroke="#b8b979"/>
      <circle cx="53" cy="37" r="3" fill="#aeeeff"/><path d="m44 25 5 2m-6 3 4 2" stroke="#eae0b2"/>`,
  },
  scout: {
    base: `<ellipse cx="30" cy="48" rx="29" ry="11" fill="#000" opacity=".3"/>
      <path d="M30 27 7 5 2 12 12 31 4 49l7 8 20-19 19 8 11-13-13-15Z" fill="url(#goldDark)" stroke="#4d402a" stroke-width="2"/>
      <path d="M27 28 9 9 7 15l12 18L8 48l5 4 20-17m2-7 12-7 10 12-8 9-16-8" fill="url(#gold)" stroke="#f9dfa0"/>
      <path d="M17 26 10 15m9 21L11 47" stroke="#3d6791" stroke-width="3"/>
      <ellipse cx="15" cy="32" rx="7" ry="5" fill="#477ec1" stroke="#9ce9ff"/>`,
    head: `<path d="M18 23 42 24 61 32 42 40 18 40l10-9Z" fill="url(#gold)" stroke="#6a512e" stroke-width="1.5"/>
      <path d="m28 27 15 2 9 3-10 4-16-1Z" fill="#193c6c" stroke="#7eafc2"/>
      <path d="m34 29 9 1 3 2-5 2-9-1Z" fill="#8eeaff"/>
      <path d="M36 20h17v4H36m0 16h17v4H36" fill="#719bb1" stroke="#d8edbf"/>
      <path d="m12 26-7 6 7 6" fill="#75b8ee" stroke="#a8f5ff"/>`,
  },
  carrier: {
    base: `<ellipse cx="31" cy="45" rx="31" ry="15" fill="#000" opacity=".35"/>
      <path d="M4 22 13 10 38 12 59 25 64 34 54 47 22 55 3 44 12 33Z" fill="url(#goldDark)" stroke="#584329" stroke-width="1.5"/>
      <path d="M6 23 15 13 35 15 54 25 42 28 22 24 11 30Zm0 19 16 10 29-8-11-6-19 6-9-8Z" fill="url(#gold)" stroke="#ffeab2"/>
      <path d="m15 16 15 3m-9 3 17 1m-21 22 16-4m-12 7 18-5" stroke="#8b6632" stroke-width="1.5"/>
      <path d="m9 29 8 3-5 6-8-3m39-13 8 3 4 7-10-2m-4 9 11 4-5 3-8-3" fill="#447b9c" stroke="#b6daf1"/>`,
    head: `<path d="M14 27 39 21 60 30 60 36 38 45 15 39 23 33Z" fill="url(#gold)" stroke="#806032" stroke-width="1.5"/>
      <path d="M22 30 39 26 54 32 39 39 22 36 30 33Z" fill="#345e7c" stroke="#93adbc"/>
      <path d="m32 30 9-1 9 3-10 5-10-3Z" fill="#8fd4ee" stroke="#e1fbff"/>
      <path d="m53 29 9 3-9 6m-34-9-8 3 8 5" fill="none" stroke="#fff0c4" stroke-width="2"/>
      <path d="M26 24h9m-8 17h9" stroke="#f9e5a6" stroke-width="2"/>`,
  },
} satisfies Partial<Record<TowerKey, { base: string; head: string }>>;

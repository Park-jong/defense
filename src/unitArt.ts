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
  <ellipse cx="32" cy="49" rx="26" ry="11" fill="#000" opacity=".4"/>
  <path d="M8 39 21 30 43 30 56 39 56 48 43 56 21 56 8 48Z" fill="#192b28" stroke="#0c1815" stroke-width="1.5"/>
  <path d="M8 39 21 30 43 30 56 39 43 48 21 48Z" fill="url(#steel)" stroke="#87988a" stroke-width=".7"/>
  <path d="M8 39 21 48 43 48 56 39 56 46 43 54 21 54 8 46Z" fill="#3a5146"/>
  <path d="m13 40 10 6m-5-10 10 6m19-7-9 6m15-1-9 6" stroke="#c9b364" stroke-width="2"/>
  <path d="M23 23 32 18 41 23 41 41 32 47 23 41Z" fill="#263a33" stroke="#15241e"/>
  <path d="M23 23 32 28 32 47 23 41Z" fill="url(#olive)"/>
  <path d="M32 28 41 23 41 41 32 47Z" fill="#415c4c"/>
  <path d="M23 23 32 18 41 23 32 28Z" fill="#bac1a3"/>
  <path d="m26 30 3 2v8l-3-2m10-6 3-2v8l-3 2" fill="#142b25"/>
  <path d="m26 33 3 2m7 0 3-2" stroke="#7cdb9c" stroke-width="1.3"/>
  <path d="M18 33v11m28-11v11" stroke="#293c33" stroke-width="3"/>
  <circle cx="17" cy="44" r="1" fill="#d6ded1"/><circle cx="47" cy="44" r="1" fill="#d6ded1"/>
`;
const turretHead = `
  <ellipse cx="32" cy="30" rx="12" ry="8" fill="#10251e" stroke="#8f9e83"/>
  <path d="M22 22 30 17 41 22 41 33 32 39 22 33Z" fill="url(#steel)" stroke="#1a3027"/>
  <path d="M12 17 23 11 36 15 36 28 25 34 12 30Z" fill="#263b33" stroke="#101d17" stroke-width="1.2"/>
  <path d="M12 17 23 11 36 15 25 22Z" fill="url(#olive)" stroke="#b5bca0" stroke-width=".6"/>
  <path d="M12 17 25 22 25 34 12 30Z" fill="url(#red)"/>
  <path d="M25 22 36 15 36 28 25 34Z" fill="#263a32"/>
  <path d="M31 30 42 23 56 28 56 40 45 47 31 42Z" fill="#263b33" stroke="#101d17" stroke-width="1.2"/>
  <path d="M31 30 42 23 56 28 45 36Z" fill="url(#olive)" stroke="#b5bca0" stroke-width=".6"/>
  <path d="M31 30 45 36 45 47 31 42Z" fill="url(#red)"/>
  <path d="M45 36 56 28 56 40 45 47Z" fill="#1c3029"/>
  <g fill="#111c18" stroke="#a3b29c" stroke-width=".55">
    <ellipse cx="29" cy="22" rx="1.6" ry="2"/><ellipse cx="33" cy="19.5" rx="1.6" ry="2"/>
    <ellipse cx="29" cy="28" rx="1.6" ry="2"/><ellipse cx="33" cy="25.5" rx="1.6" ry="2"/>
    <ellipse cx="49" cy="36" rx="1.6" ry="2"/><ellipse cx="53" cy="33.5" rx="1.6" ry="2"/>
    <ellipse cx="49" cy="42" rx="1.6" ry="2"/><ellipse cx="53" cy="39.5" rx="1.6" ry="2"/>
  </g>
  <path d="m16 18 6 2m-6 4 6 2m13 7 7 2m-7 4 7 2" stroke="#f0ac8e" stroke-width=".8" opacity=".7"/>
  <path d="M32 18V8m0 0 4 3" stroke="#9cab91" stroke-width="1.2"/>
  <circle cx="32" cy="8" r="1.5" fill="#f46b50"/>
  <path d="m29 35 6-3 4 2-6 4Z" fill="#a2bca2"/>
`;

const tankBase = `
  <ellipse cx="32" cy="46" rx="30" ry="14" fill="#000" opacity=".4"/>
  <g stroke="#101e17" stroke-width="1.3">
    <path d="M4 28 17 20 24 25 24 47 12 54 4 49Z" fill="#26352c"/>
    <path d="M40 20 49 16 60 23 60 44 48 52 40 46Z" fill="#26352c"/>
    <path d="M4 28 17 20 24 25 12 33Z" fill="#8e9980"/>
    <path d="M40 20 49 16 60 23 48 31Z" fill="#8e9980"/>
  </g>
  <g stroke="#71806c" stroke-width="1.5">
    <path d="m6 33 6 4m-6 1 6 4m-6 1 6 4m-6 1 6 4m39-17 7-5m-7 10 7-5m-7 10 7-5m-7 10 7-5"/>
  </g>
  <path d="M14 28 34 17 51 28 51 44 31 56 14 45Z" fill="#374b38" stroke="#15261b" stroke-width="1.3"/>
  <path d="M14 28 34 17 51 28 31 40Z" fill="url(#olive)" stroke="#c2c3a0" stroke-width=".7"/>
  <path d="M14 28 31 40 31 56 14 45Z" fill="#667451"/>
  <path d="M31 40 51 28 51 44 31 56Z" fill="#3d5540"/>
  <path d="m16 34 10 7v5l-10-7m22 1 10-6v6l-10 6" fill="url(#red)" stroke="#482b25" stroke-width=".7"/>
  <path d="M17 32 5 40 2 38 10 29m38 8 13 6 1-4-12-8M25 48l-6 12h-7l6-15m26-1 6 13h8l-9-18" fill="url(#steel)" stroke="#20352a" stroke-width="1.1"/>
  <path d="m10 55 10 1-1 4h-8Zm41-3 9 3-1 4-10-2Z" fill="#76836d" stroke="#26382b"/>
  <path d="m19 29 8-5m-6 8 8-5m11-2 6 4m-9-2 6 4" stroke="#45543f" stroke-width="1.5"/>
  <circle cx="19" cy="42" r="1.4" fill="#fbdf8d"/><circle cx="46" cy="41" r="1.2" fill="#dce9a5"/>
`;
const tankHead = `
  <ellipse cx="32" cy="32" rx="15" ry="9" fill="#1b2e23" stroke="#8b9676"/>
  <path d="M17 22 29 15 43 19 47 28 34 38 20 32Z" fill="url(#olive)" stroke="#253a26" stroke-width="1.2"/>
  <path d="M17 22 29 15 43 19 32 26Z" fill="#bcc2a0"/>
  <path d="m21 22 7-4 5 2-7 4Z" fill="url(#red)"/>
  <path d="M20 27 30 32 30 37 20 32m18-9 8 4-5 6-6-4Z" fill="#657656"/>
  <path d="M28 26 35 22 58 29 61 33 54 38 30 31Z" fill="url(#gun)" stroke="#20342a" stroke-width="1.2"/>
  <path d="m35 23 21 7m-24-2 22 7" stroke="#d0d6bd" stroke-width="1.2"/>
  <path d="M49 27 57 28 63 32 63 38 56 42 49 37Z" fill="#384e3e" stroke="#15271c" stroke-width="1.2"/>
  <path d="m49 27 8 1 6 4-8 5Z" fill="#bbc2a0"/>
  <path d="m55 37 8-5v6l-7 4Z" fill="#14251c"/>
  <path d="m57 37 4-3v3l-4 2Z" fill="#050f0a"/>
  <path d="m29 28 6 2m-3-5 6 2m-2 0v5m4-4v5" stroke="#354e3c" stroke-width="1"/>
  <ellipse cx="30" cy="21" rx="4" ry="2.5" fill="#4e6246" stroke="#d1d1ac" stroke-width=".6"/>
  <path d="M22 20V9m0 1 3 2" stroke="#9da98c" stroke-width="1"/>
`;

const cannonBase = `
  <ellipse cx="32" cy="49" rx="27" ry="11" fill="#000" opacity=".35"/>
  <path d="M8 42 18 31 33 24 47 31 57 43 49 53 33 59 17 53Z" fill="#4f3b1d" stroke="#292b1e" stroke-width="1.3"/>
  <path d="M8 42 18 31 33 24 47 31 57 43 33 54Z" fill="url(#gold)"/>
  <path d="M8 42 33 54 57 43 49 53 33 59 17 53Z" fill="url(#goldDark)"/>
  <path d="M12 42 20 35 26 38 18 47Zm26-4 7-4 8 8-8 5ZM26 49l7-3 7 4-7 4Z" fill="#325b76" stroke="#83c7cc" stroke-width=".7"/>
  <ellipse cx="32" cy="39" rx="15" ry="9" fill="#503e23" stroke="#edcf7d"/>
  <ellipse cx="32" cy="36" rx="11" ry="7" fill="#183e56"/>
  <ellipse cx="32" cy="35" rx="8" ry="5" fill="url(#blue)"/>
  <path d="M13 38C10 30 15 19 24 17L24 25Q19 29 22 38L18 44Z" fill="url(#gold)" stroke="#6e5426" stroke-width=".8"/>
  <path d="M42 17C53 21 56 31 51 41L45 44 42 37Q47 29 39 24Z" fill="url(#gold)" stroke="#6e5426" stroke-width=".8"/>
  <path d="M23 49 27 37 33 35 38 39 42 50 33 55Z" fill="url(#gold)" stroke="#795b28"/>
  <path d="m29 43 4-3 4 3-4 6Z" fill="url(#blue)" stroke="#bae5db" stroke-width=".6"/>
  <path d="M15 34q0-9 6-12m25 0q6 5 5 12" fill="none" stroke="#ffe4a0" stroke-width="1.2"/>
  <circle cx="20" cy="48" r="1.5" fill="#7fe5fc"/><circle cx="46" cy="48" r="1.5" fill="#7fe5fc"/>
`;
const cannonHead = `
  <ellipse cx="32" cy="28" rx="18" ry="14" fill="url(#energy)" opacity=".52"/>
  <path d="M20 27Q17 16 24 10L28 17 26 28ZM38 27l-1-11 5-6q7 9 2 19Z" fill="url(#gold)" stroke="#7a5a27" stroke-width=".8"/>
  <circle cx="32" cy="24" r="10" fill="#284e72" stroke="#bceefd" stroke-width=".65"/>
  <circle cx="32" cy="24" r="9" fill="url(#blue)"/>
  <ellipse cx="29" cy="21" rx="4" ry="3" fill="#e5ffff" opacity=".85"/>
  <path d="M23 26q8 5 17-3m-12-7q-4 10 5 16" fill="none" stroke="#c3f8ff" stroke-width=".7" opacity=".8"/>
  <path d="m27 33 5-4 6 3-5 6Z" fill="url(#gold)" stroke="#745322" stroke-width=".7"/>
  <path d="m31 12 2-3 2 3-2 4Z" fill="#b7f9ff"/>
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

const marineBase = `
  <ellipse cx="32" cy="53" rx="20" ry="7" fill="#000" opacity=".4"/>
  <path d="m22 34-3 18-6 5 3 4 13-3 3-18 3 18 13 3 3-4-6-5-3-18Z" fill="url(#steel)" stroke="#1a2b30" stroke-width="1.4"/>
  <path d="m22 39-2 11 8 1 2-11m5 0 2 11 8-1-2-11" fill="#3b5c80" stroke="#849fb0" stroke-width=".6"/>
  <path d="m20 50 7 1m11 0 7-1" stroke="#d5d5ae" stroke-width="1.8"/>
  <path d="M20 23 32 18 44 23 43 40 32 46 21 40Z" fill="#314b67" stroke="#172b37" stroke-width="1.2"/>
  <path d="M20 23 32 18 44 23 32 30Z" fill="#7898b0"/>
  <path d="m25 32 7 4 7-4v7l-7 4-7-4Z" fill="url(#steel)"/>
  <path d="M18 24v12m28-12v12" stroke="#20354c" stroke-width="8"/>
  <path d="M18 24v8m28-8v8" stroke="#6c8da8" stroke-width="5"/>
`;
const marineHead = `
  <path d="M21 14Q22 6 32 6q11 0 12 10v12l-11 7-12-7Z" fill="#385a7a" stroke="#162b39" stroke-width="1.2"/>
  <path d="M22 16q11-8 21 0v8l-10 5-11-5Z" fill="#142d3b"/>
  <path d="m24 17 8-3 9 3-1 5-8 3-8-3Z" fill="#efc179" stroke="#ffe3a7" stroke-width=".7"/>
  <path d="m26 17 6-1 6 1" stroke="#fff4d4" stroke-width="1.3"/>
  <path d="M19 16v11m27-11v11" stroke="#8dabb8" stroke-width="3"/>
  <path d="m30 30 5-3 24 9v6l-6 3-23-9Z" fill="url(#gun)" stroke="#1a3031" stroke-width="1.1"/>
  <path d="m45 34 12 5m-10-3v5m5-3v5" stroke="#bacac2" stroke-width="1"/>
  <path d="m53 38 8-1v6l-7 3Z" fill="#233931"/>
  <path d="m24 32 7 5m6-7 6 5" stroke="#587994" stroke-width="5"/>
  <circle cx="22" cy="28" r="1.2" fill="#80dca1"/>
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
const cruiserBase = `
  <ellipse cx="32" cy="51" rx="29" ry="10" fill="#000" opacity=".4"/>
  <path d="M5 27 16 18 40 15 58 27 60 38 41 49 15 44 4 36Z" fill="#253c46" stroke="#172d33" stroke-width="1.2"/>
  <path d="M5 27 16 18 40 15 58 27 41 38 15 35Z" fill="url(#steel)" stroke="#a2b6b6" stroke-width=".7"/>
  <path d="M15 35 41 38 58 27 60 38 41 49 15 44Z" fill="#3c5964"/>
  <path d="M7 21 15 16 23 20 21 39 12 43 5 37Zm1 20 10-5 8 5-3 13-10 4-8-7Z" fill="url(#gun)" stroke="#2b4248" stroke-width="1"/>
  <path d="m8 27 8-5v10l-8 5m1 10 10-5v7l-9 5" fill="#102c43" stroke="#5f9bb2" stroke-width=".7"/>
  <path d="m8 30 6-3m-4 22 6-3" stroke="#77dcff" stroke-width="3"/>
  <path d="m21 21 6-3 6 3-6 3Zm7 22 5-3 7 3-5 3Z" fill="url(#red)"/>
  <path d="m46 32 10-6m-10 12 11-6m-11 12 11-6" stroke="#b6c5ba" stroke-width="1"/>
`;
const cruiserHead = `
  <path d="M20 24 29 15 46 18 61 29 61 36 46 43 29 36 20 32Z" fill="url(#steel)" stroke="#243e42" stroke-width="1"/>
  <path d="M29 15 46 18 61 29 46 32 27 26Z" fill="#a8b8b3"/>
  <path d="m27 21 6-3 10 3-6 4Z" fill="#2f6679" stroke="#aedbe2" stroke-width=".7"/>
  <path d="m32 20 6 2m-3-2 6 2" stroke="#8ee6f9" stroke-width="1"/>
  <path d="m41 29 19 1v6l-14 5-7-5Z" fill="#334e56"/>
  <path d="m48 31 12 1v3l-11 4Z" fill="#172b34"/>
  <path d="m52 33 7 .5v1l-7 2Z" fill="#ff967c"/>
  <path d="M29 17V8m0 0 5 3m-10 9v-6" stroke="#c0cabc" stroke-width="1.2"/>
  <circle cx="29" cy="8" r="1.3" fill="#ff8872"/>
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
};

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

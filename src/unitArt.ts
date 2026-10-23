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
  <ellipse cx="30" cy="36" rx="29" ry="26" fill="#000" opacity=".38"/>
  <g fill="url(#olive)" stroke="#17251d" stroke-width="1.1">
    <path d="M2 3h10v7l-3 3H2Zm46 0h10v10h-7l-3-3ZM2 51h7l3 3v7H2Zm49 0h7v10H48v-7Z"/>
  </g>
  <path d="M3 5h7M50 5h7M3 58h7m40 0h7" stroke="#e2dfbd" stroke-width="1"/>
  <!-- Broad, independently armoured track pods. -->
  <g stroke="#111e19" stroke-width="1.3">
    <path d="M13 10h29l7 5v9l-6 3H13l-5-5v-7Zm0 29h30l6 4v9l-7 5H13l-5-5v-8Z" fill="#1d2924"/>
    <path d="M14 12h27l5 4v6H12v-6Zm-2 32h34v7l-5 3H14l-2-3Z" fill="url(#gun)"/>
  </g>
  <g stroke="#111d18" stroke-width="1.6">
    <path d="M16 13v8m5-8v8m5-8v8m5-8v8m5-8v8m5-7v7M16 45v8m5-8v8m5-8v8m5-8v8m5-8v8m5-8v7"/>
  </g>
  <path d="M13 22h31m-31 22h31" stroke="#c6c9b1" stroke-width="1"/>
  <path d="M16 18h24l7 9v12l-7 9H16l-6-8V26Z" fill="url(#olive)" stroke="#17281e" stroke-width="1.4"/>
  <path d="m17 19-4 8v11l4 8h8V19Z" fill="url(#steel)" stroke="#b1b79a" stroke-width=".6"/>
  <path d="M37 20h3l5 8v9l-5 9h-3Z" fill="#697757"/>
  <path d="M17 21h7v7h-9Zm-2 16h9v7h-7Z" fill="url(#red)" stroke="#532e25" stroke-width=".6"/>
  <path d="M12 28h6v8h-6Z" fill="#1b2921"/>
  <path d="M13 29h4m-4 2h4m-4 2h4m-4 2h4" stroke="#8d9b85" stroke-width=".7"/>
  <!-- Deployed hydraulic arms cross above the tracks, clear of the turret. -->
  <g fill="none" stroke-linejoin="bevel">
    <path d="M22 25 7 8m31 17L53 8M22 39 7 56m31-17 15 17" stroke="#111c19" stroke-width="7"/>
    <path d="M22 24 7 7m31 17L53 7M22 38 7 55m31-17 15 17" stroke="url(#steel)" stroke-width="4.5"/>
    <path d="m17 19-7-8m33 8 7-8M17 43l-7 8m33-8 7 8" stroke="#e1e0c4" stroke-width="1.2"/>
  </g>
  <circle cx="31" cy="32" r="13" fill="#1c2b23" stroke="#a8b18e" stroke-width="1.2"/>
  <circle cx="31" cy="32" r="10.5" fill="url(#steel)" stroke="#121f19" stroke-width="1.3"/>
  <g fill="#e5d4a0" stroke="#303d2b" stroke-width=".5">
    <circle cx="27" cy="20" r="1"/><circle cx="35" cy="20" r="1"/>
    <circle cx="27" cy="44" r="1"/><circle cx="35" cy="44" r="1"/>
  </g>
  <path d="M43 26h3v3h-3Zm0 10h3v3h-3Z" fill="#ffda85"/>
`;
const tankHead = `
  <path d="M17 25 23 21h12l7 6v13l-7 6H23l-6-5Z" fill="#101d17" opacity=".5"/>
  <!-- Low, angular turret and heavy rear counterweight. Forward is +X. -->
  <path d="M16 25 22 20h12l7 7v11l-7 6H22l-6-5Z" fill="url(#olive)" stroke="#17251b" stroke-width="1.3"/>
  <path d="M17 25 23 21h10l5 5H23l-5 4Z" fill="#d7d6b2"/>
  <path d="M17 36h6l4 6h7l6-5v3l-6 4H22l-6-5Z" fill="#45553d"/>
  <path d="M18 26h6v11h-6Z" fill="url(#red)" stroke="#713f30" stroke-width=".7"/>
  <path d="M19 27v8" stroke="#efb391" stroke-width="1"/>
  <path d="M25 24h10l4 5v6l-5 5H25l-2-5v-6Z" fill="url(#steel)" stroke="#364a38" stroke-width=".8"/>
  <circle cx="29" cy="27" r="3.5" fill="#53674b" stroke="#d3d3ae" stroke-width=".7"/>
  <path d="M27 26h4v2h-4Z" fill="#2c402d"/>
  <path d="M25 36h7m-6 2h6" stroke="#1b2b20" stroke-width="1.1"/>
  <!-- Recoil cylinders flank the long siege cannon. -->
  <path d="M34 26h14v3H34Zm0 10h14v3H34Z" fill="url(#gun)" stroke="#23382a" stroke-width=".8"/>
  <path d="M38 27h9m-9 10h9" stroke="#dbe0c7" stroke-width=".8"/>
  <path d="M33 28h9l4 1h11v7H46l-4 1h-9Z" fill="url(#gun)" stroke="#14271c" stroke-width="1"/>
  <path d="M34 29h9l3 1h11" fill="none" stroke="#e4e5ca" stroke-width="1.2"/>
  <path d="M38 29v7m5-7v7m9-6v5" stroke="#394e3c" stroke-width="1.3"/>
  <path d="M54 27h6l3 3v7l-3 3h-6l-2-3v-7Z" fill="url(#olive)" stroke="#16271c" stroke-width="1.1"/>
  <path d="M54 27h6l3 3h-9Z" fill="#dedec0"/>
  <path d="M60 30h3v7l-3 3Z" fill="#1a2b20"/>
  <path d="M61 31v5" stroke="#050d08" stroke-width="1.7"/>
  <path d="M55 31h3m-3 3h3m-3 3h3" stroke="#1c3022" stroke-width="1.4"/>
  <path d="M21 22v-9m0 0 3 2" fill="none" stroke="#b9c4a8" stroke-width=".8"/>
  <circle cx="21" cy="13" r="1" fill="#ed8065"/>
  <circle cx="36" cy="24" r="1" fill="#ffe4a5"/>
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

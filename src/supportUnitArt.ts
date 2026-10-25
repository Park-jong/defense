import type { TowerKey } from './config';

// Flying support craft keep their ground shadows separate from the complete hull.
// These same layers supply battlefield textures, command icons and codex portraits.
export const supportUnitLayers = {
  support: {
    base: `<ellipse cx="32" cy="50" rx="27" ry="9" fill="#000" opacity=".2"/>
      <ellipse cx="32" cy="50" rx="20" ry="6" fill="#000" opacity=".15"/>`,
    head: `
      <defs>
        <linearGradient id="vesselHull" x1="0" y1="0" x2=".35" y2="1"><stop stop-color="#e0e3d7"/><stop offset=".24" stop-color="#a6b4b2"/><stop offset=".6" stop-color="#657b81"/><stop offset="1" stop-color="#2a404d"/></linearGradient>
        <radialGradient id="vesselDome" cx=".32" cy=".2" r=".85"><stop stop-color="#eff0dc"/><stop offset=".35" stop-color="#b6c3bb"/><stop offset=".7" stop-color="#758f90"/><stop offset="1" stop-color="#344f60"/></radialGradient>
        <linearGradient id="vesselRim" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#d9e0d4"/><stop offset=".22" stop-color="#a2b5b3"/><stop offset=".32" stop-color="#3d5863"/><stop offset=".72" stop-color="#172c3a"/><stop offset="1" stop-color="#718c91"/></linearGradient>
        <linearGradient id="vesselRed" x1="0" y1="0" x2=".3" y2="1"><stop stop-color="#de8d78"/><stop offset=".4" stop-color="#ac504d"/><stop offset="1" stop-color="#632f3b"/></linearGradient>
        <radialGradient id="vesselGlass" cx=".35" cy=".25"><stop stop-color="#d5ffe5"/><stop offset=".25" stop-color="#7de1b0"/><stop offset=".65" stop-color="#277d72"/><stop offset="1" stop-color="#102f3e"/></radialGradient>
        <radialGradient id="vesselEngine"><stop stop-color="#e9ffe1"/><stop offset=".35" stop-color="#82edc5"/><stop offset="1" stop-color="#41c8a5" stop-opacity="0"/></radialGradient>
      </defs>
      <g stroke-linejoin="round" stroke-linecap="round">
        <!-- A deep lower hull, exposed service keel and paired lift nacelles. -->
        <ellipse cx="32" cy="36" rx="27" ry="17" fill="#1a2e3b" stroke="#0d202c" stroke-width="1.3"/>
        <path d="M9 35c2 13 12 18 23 18s21-5 23-18L44 28H20Z" fill="url(#vesselHull)" stroke="#263c48"/>
        <path d="M13 40q19 17 38 0M18 46q14 9 28 0" fill="none" stroke="#a1b6af" stroke-width=".7"/>
        <path d="m16 39 4 8m4-6 2 10m14-10-2 10m10-12-4 8" stroke="#253e4a" stroke-width="1.6"/>
        <ellipse cx="16" cy="44" rx="5" ry="9" fill="url(#vesselEngine)"/>
        <ellipse cx="48" cy="44" rx="5" ry="9" fill="url(#vesselEngine)"/>
        <path d="m10 34 8-1 4 11-5 5-7-4Zm36-1 8 1v11l-7 4-5-5Z" fill="url(#vesselHull)" stroke="#203742" stroke-width="1"/>
        <path d="m12 37 5-1 3 8-4 2-4-3Zm35-1 5 1v6l-4 3-4-2Z" fill="#162f3a" stroke="#7f9a9a" stroke-width=".6"/>
        <path d="m14 39 2 5m34-5-2 5" stroke="#8aefd0" stroke-width="1.6"/>
        <path d="M25 42h14l3 9-5 5H27l-5-5Z" fill="url(#vesselHull)" stroke="#152e3b"/>
        <path d="M28 46h8l2 5-3 2h-6l-3-2Z" fill="#162c38" stroke="#9aac9f" stroke-width=".6"/>
        <path d="M29 48h6m-6 2h6" stroke="#73c4a9" stroke-width=".8"/>
        <!-- The thick equatorial belt gives the saucer a visible side wall. -->
        <path d="M4 29c0-10 12-18 28-18s28 8 28 18v7c-2 10-14 15-28 15S6 46 4 36Z" fill="url(#vesselRim)" stroke="#102733" stroke-width="1.4"/>
        <ellipse cx="32" cy="29" rx="28" ry="17" fill="url(#vesselHull)" stroke="#b9c9bd" stroke-width=".8"/>
        <path d="M5 32c7 18 47 18 54 0" fill="none" stroke="#d4ddd0" stroke-width="1"/>
        <path d="M7 38q25 20 50 0" fill="none" stroke="#0e2431" stroke-width="2.5"/>
        <path d="m10 40 5 2m5 2 5 1m14 0 5-1m5-2 5-2" stroke="#8addb9" stroke-width="1.3"/>
        <path d="M7 28 12 23l6 2-2 6-6 3Zm39-3 6-2 5 5-3 6-6-3Z" fill="url(#vesselRed)" stroke="#773d42" stroke-width=".7"/>
        <path d="m9 28 4-3m38 1 3 3" stroke="#f1b196" stroke-width=".6"/>
        <!-- Segmented spherical pressure dome inside an armoured circular collar. -->
        <ellipse cx="32" cy="28" rx="22" ry="13" fill="#283f4a" stroke="#c3d0c2" stroke-width="1"/>
        <ellipse cx="32" cy="26" rx="20" ry="13" fill="url(#vesselDome)" stroke="#405b65" stroke-width=".9"/>
        <path d="M14 24c4-10 12-15 18-15s15 5 18 15l-3 7c-8 9-23 9-31 0Z" fill="url(#vesselDome)" stroke="#28444e" stroke-width="1.1"/>
        <path d="M17 20q4-7 11-9m9 0q7 3 10 10M17 29l7-7m16 0 7 7M25 33l3-6m8 0 3 6" fill="none" stroke="#dae0ce" stroke-width=".7"/>
        <path d="m19 19 4-4 2 1-3 5Zm22-3 4 4-2 2-4-5ZM21 29l3 2-1 3-4-3Zm19 2 3-2 2 2-4 3Z" fill="url(#vesselRed)" stroke="#894c4a" stroke-width=".5"/>
        <path d="M24 15q8-5 16 0l1 9c-3 6-15 6-18 0Z" fill="url(#vesselHull)" stroke="#526f71" stroke-width=".8"/>
        <ellipse cx="32" cy="21" rx="10" ry="7" fill="#19343e" stroke="#cfdbcb" stroke-width="1"/>
        <ellipse cx="32" cy="20" rx="7.5" ry="4.8" fill="url(#vesselGlass)" stroke="#3b756c" stroke-width=".7"/>
        <path d="M26 19q4-4 10-2" fill="none" stroke="#d8ffe0" stroke-width="1" opacity=".8"/>
        <path d="M32 16v8m-6-4h12" stroke="#1c574e" stroke-width=".7"/>
        <circle cx="32" cy="20" r="1.5" fill="#b8f8cf"/>
        <!-- Offset radio dish, tall whip antenna and small receiver housings. -->
        <path d="m43 21 2-7m-1 4 5 1" fill="none" stroke="#172e3b" stroke-width="3"/>
        <path d="m43 20 2-6m-1 4 4 1" fill="none" stroke="#b8c8bd" stroke-width="1"/>
        <g transform="rotate(-24 47 12)">
          <path d="M39 11q8 11 16 0l-2-3H41Z" fill="#415b66" stroke="#182f3d" stroke-width=".8"/>
          <ellipse cx="47" cy="10" rx="8" ry="3.5" fill="url(#vesselHull)" stroke="#e2e4ce" stroke-width=".8"/>
          <ellipse cx="47" cy="10" rx="5.5" ry="2" fill="#445f68" stroke="#a6bcb3" stroke-width=".5"/>
          <path d="m43 10 4-5 4 5m-4-5v6" fill="none" stroke="#cfd7c5" stroke-width=".7"/>
          <circle cx="47" cy="5" r="1" fill="#d88572"/>
        </g>
        <path d="m15 20 2-6h4l2 5Z" fill="url(#vesselHull)" stroke="#294752" stroke-width=".7"/>
        <path d="M18 15V4m-2 4h5" stroke="#c5d2c4" stroke-width="1"/>
        <circle cx="18" cy="4" r="1.1" fill="#ed9b7a"/>
        <path d="m6 30-3 2v6l4 2 4-4-1-5Zm48 1-1 5 4 4 4-2v-6l-3-2Z" fill="url(#vesselHull)" stroke="#203a47" stroke-width=".9"/>
        <path d="M5 33v3m54-3v3" stroke="#a7f0cf" stroke-width="1.5"/>
        <path d="m26 36 6 2 6-2v4l-6 2-6-2Z" fill="#334c56" stroke="#c1cab6" stroke-width=".6"/>
        <path d="M30 38h4" stroke="#81e4bb" stroke-width="1.2"/>
        <g fill="#d8dec7" stroke="#314b57" stroke-width=".3"><circle cx="11" cy="35" r=".7"/><circle cx="19" cy="39" r=".7"/><circle cx="45" cy="39" r=".7"/><circle cx="53" cy="35" r=".7"/></g>
      </g>`,
  },
  observer: {
    base: `<ellipse cx="32" cy="51" rx="19" ry="6.5" fill="#000" opacity=".18"/>
      <ellipse cx="32" cy="51" rx="13" ry="4" fill="#000" opacity=".12"/>`,
    head: `
      <defs>
        <linearGradient id="observerGold" x1="0" y1="0" x2=".6" y2="1"><stop stop-color="#fff1bb"/><stop offset=".25" stop-color="#e5c77b"/><stop offset=".6" stop-color="#b18a43"/><stop offset="1" stop-color="#604623"/></linearGradient>
        <linearGradient id="observerEdge" x1="0" y1="0" x2=".2" y2="1"><stop stop-color="#ffffd9"/><stop offset=".45" stop-color="#efcf83"/><stop offset="1" stop-color="#9d7735"/></linearGradient>
        <linearGradient id="observerInset" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#587998"/><stop offset=".45" stop-color="#263b63"/><stop offset="1" stop-color="#131d3b"/></linearGradient>
        <radialGradient id="observerLens" cx=".4" cy=".35" r=".7"><stop stop-color="#e9ffff"/><stop offset=".17" stop-color="#b0f5ff"/><stop offset=".4" stop-color="#57b6e9"/><stop offset=".7" stop-color="#4160b2"/><stop offset="1" stop-color="#19234d"/></radialGradient>
        <radialGradient id="observerGlow"><stop stop-color="#b5efff" stop-opacity=".4"/><stop offset=".5" stop-color="#63b8f1" stop-opacity=".15"/><stop offset="1" stop-color="#7784e9" stop-opacity="0"/></radialGradient>
      </defs>
      <g stroke-linejoin="round" stroke-linecap="round">
        <ellipse cx="32" cy="30" rx="22" ry="23" fill="url(#observerGlow)"/>
        <!-- Separated crescent fins expose dark joints and blue propulsion insets. -->
        <path d="M24 23 16 16 8 7 4 10c0 16 6 26 18 31l5-9Zm16 0 8-7 8-9 4 3c0 16-6 26-18 31l-5-9Z" fill="#493a2d" stroke="#252c36" stroke-width="1.3"/>
        <path d="M23 23 15 18 7 8 5 11c1 13 6 22 16 26l5-6Zm18 0 8-5 8-10 2 3c-1 13-6 22-16 26l-5-6Z" fill="url(#observerGold)" stroke="#e3c884" stroke-width=".7"/>
        <path d="M7 12c2 11 7 19 14 22m36-22c-2 11-7 19-14 22" fill="none" stroke="url(#observerEdge)" stroke-width="1.3"/>
        <path d="M10 16 16 23 20 31 14 28Zm44 0-6 7-4 8 6-3Z" fill="url(#observerInset)" stroke="#6b633e" stroke-width=".7"/>
        <path d="m12 19 4 6 1 3m35-9-4 6-1 3" fill="none" stroke="#80d7f2" stroke-width="1.1"/>
        <path d="m13 15 4 4m-2 6 4 7m32-17-4 4m2 6-4 7" stroke="#806332" stroke-width=".7"/>
        <path d="m19 23 8 3-2 9-7-6Zm26 0-8 3 2 9 7-6Z" fill="url(#observerInset)" stroke="#a4a778" stroke-width=".7"/>
        <path d="m21 26 4 2m-4 1 3 2m19-5-4 2m4 1-3 2" stroke="#7297b9" stroke-width=".8"/>
        <!-- Two long, tapering vanes frame the small ventral crystal. -->
        <path d="M23 34 19 45 18 56l5-3 9-14 9 14 5 3-1-11-4-11Z" fill="url(#observerGold)" stroke="#5c472c" stroke-width="1.1"/>
        <path d="m24 38-3 12 8-11m11-1 3 12-8-11" fill="none" stroke="#f8dda1" stroke-width="1"/>
        <path d="m24 42-3 8m19-8 3 8" stroke="#506890" stroke-width="1.4"/>
        <path d="m27 38 5-4 5 4-2 9-3 5-3-5Z" fill="url(#observerInset)" stroke="#c3ab68" stroke-width=".8"/>
        <path d="m32 39 2 5-2 5-2-5Z" fill="#88d7f3" stroke="#d1fcff" stroke-width=".6"/>
        <!-- Overlapping gold carapace plates surround a recessed optical gimbal. -->
        <path d="M32 7c11 1 17 10 17 21 0 10-7 17-17 18-10-1-17-8-17-18 0-11 6-20 17-21Z" fill="#614b2d" stroke="#2e3036" stroke-width="1.1"/>
        <path d="M32 8c10 1 15 9 15 19 0 9-6 15-15 17-9-2-15-8-15-17 0-10 5-18 15-19Z" fill="url(#observerGold)" stroke="#e9d29a" stroke-width=".7"/>
        <path d="M32 9v7m-11-2 5 7m17-7-5 7M19 31l5-1m21 1-5-1M26 38l3-5m9 5-3-5" fill="none" stroke="#785f35" stroke-width=".8"/>
        <path d="M21 16q4-6 9-6m4 0q5 0 9 6M19 27q0 6 4 10m22-10q0 6-4 10" fill="none" stroke="#fff1be" stroke-width=".8"/>
        <path d="m29 9 3-5 3 5-1 8h-4Z" fill="url(#observerEdge)" stroke="#7d6439" stroke-width=".6"/>
        <path d="m31 9 1-2 1 2-1 5Z" fill="#87badc"/>
        <ellipse cx="32" cy="27" rx="12" ry="13.5" fill="#15213b" stroke="#f3d794" stroke-width="1.2"/>
        <ellipse cx="32" cy="27" rx="10" ry="11.5" fill="url(#observerInset)" stroke="#648ca7" stroke-width=".7"/>
        <path d="M24 23a9 10 0 0 1 14-5m2 12a9 10 0 0 1-11 7" fill="none" stroke="#a5b8db" stroke-width=".6"/>
        <ellipse cx="32" cy="27" rx="7.5" ry="8.5" fill="url(#observerLens)" stroke="#263f72" stroke-width=".8"/>
        <ellipse cx="32" cy="27" rx="3.5" ry="5" fill="#24578c" stroke="#a5e9ff" stroke-width=".6"/>
        <ellipse cx="32" cy="27" rx="1.6" ry="3.5" fill="#b0eeff"/>
        <path d="M27 23q2-3 5-3" fill="none" stroke="#efffff" stroke-width="1.5"/>
        <circle cx="35" cy="30" r="1.3" fill="#c6faff" opacity=".75"/>
        <!-- The three gold retaining claws stay clear of the bright central eye. -->
        <path d="m20 23 5 1-1 4-5-1Zm24 0-5 1 1 4 5-1ZM29 37l3-5 3 5-3 5Z" fill="url(#observerEdge)" stroke="#775d33" stroke-width=".7"/>
        <path d="m21 24 2 1m18 0 2-1m-11 12v3" stroke="#fff4c7" stroke-width=".7"/>
        <path d="m20 18 1 2m22-2-1 2M26 13l1 2m11-2-1 2" stroke="#8fd6ee" stroke-width="1"/>
        <g fill="#f8e7b1"><circle cx="17" cy="33" r=".65"/><circle cx="47" cy="33" r=".65"/><circle cx="23" cy="40" r=".65"/><circle cx="41" cy="40" r=".65"/></g>
      </g>`,
  },
} satisfies Partial<Record<TowerKey, { base: string; head: string }>>;

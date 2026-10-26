// 프런티어에서 모에크래프트로 넘어갈 때의 잠금 해제 연출. 스타일은 themeUnlock.css(main.ts에서 불러옴).

const REVEAL_MS = 1050;
const DONE_MS = 2600;
const SPARKS = 14;

/**
 * 화면 가운데 자물쇠가 흔들리다 걸쇠가 열리고 빛이 터진다. 빛이 터지는 순간 reveal을 불러 테마를 바꾸고,
 * 문구를 보여 준 뒤 사라진다. 움직임 줄이기 설정이면 연출 없이 바로 바꾼다.
 */
export function playThemeUnlock(reveal: () => void): void {
  if (typeof document === 'undefined' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { reveal(); return; }
  document.querySelector('.theme-unlock')?.remove();
  const root = document.createElement('div');
  root.className = 'theme-unlock';
  root.setAttribute('role', 'status');
  root.setAttribute('aria-label', '비밀 테마 모에크래프트 해금');
  const sparks = Array.from({ length: SPARKS }, (_, i) => `<i style="--a:${(360 / SPARKS) * i}deg;--d:${110 + (i % 3) * 40}px"></i>`).join('');
  root.innerHTML = `<div class="theme-unlock-stage" aria-hidden="true">
    <span class="theme-unlock-ring"></span><span class="theme-unlock-sparks">${sparks}</span>
    <svg class="theme-unlock-lock" viewBox="0 0 64 72" width="96" height="108">
      <path class="theme-unlock-shackle" d="M18 32V22a14 14 0 0 1 28 0v10" fill="none" stroke-width="7" stroke-linecap="round"/>
      <rect class="theme-unlock-body" x="8" y="30" width="48" height="38" rx="7"/>
      <path class="theme-unlock-keyhole" d="M32 42a5 5 0 0 1 3 9v6h-6v-6a5 5 0 0 1 3-9Z"/>
    </svg>
  </div>
  <p class="theme-unlock-text"><small>SECRET THEME UNLOCKED</small><b>모에크래프트 해금</b><span>星灯りの戦姫 · 별빛 방어선</span></p>`;
  document.body.append(root);
  window.setTimeout(reveal, REVEAL_MS);
  window.setTimeout(() => root.remove(), DONE_MS);
}

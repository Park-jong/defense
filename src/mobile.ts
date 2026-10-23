/** 터치 기기에서 세로 화면이면 가로 회전을 안내한다. 닫으면 이번 세션 동안은 다시 띄우지 않는다. */
export function setupRotateHint(): void {
  const hint = document.getElementById('rotate-hint');
  if (!hint) return;
  const touch = window.matchMedia('(pointer: coarse)');
  const portrait = window.matchMedia('(orientation: portrait)');
  const key = 'frontier.rotateHintDismissed';
  const dismissed = () => { try { return sessionStorage.getItem(key) === '1'; } catch { return false; } };
  const update = () => hint.classList.toggle('is-shown', touch.matches && portrait.matches && !dismissed());
  hint.querySelector('button')?.addEventListener('click', () => {
    try { sessionStorage.setItem(key, '1'); } catch { /* 저장소를 못 써도 이번 화면에서는 닫는다 */ }
    hint.classList.remove('is-shown');
  });
  portrait.addEventListener('change', update);
  update();
}

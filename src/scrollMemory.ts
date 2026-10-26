/**
 * innerHTML로 다시 그리는 창에서, 자체 스크롤 영역의 세로·가로 위치를 기억했다가 되돌린다.
 * 같은 선택자가 여러 개(예: 종족별 비교표)여도 순서대로 짝지어 복원한다.
 */
export function rememberScroll(root: ParentNode, selectors: readonly string[]): () => void {
  const saved = selectors.map(selector => Array.from(root.querySelectorAll<HTMLElement>(selector), el => ({ top: el.scrollTop, left: el.scrollLeft })));
  return () => selectors.forEach((selector, i) => root.querySelectorAll<HTMLElement>(selector).forEach((el, j) => {
    const at = saved[i][j]; if (at) { el.scrollTop = at.top; el.scrollLeft = at.left; }
  }));
}

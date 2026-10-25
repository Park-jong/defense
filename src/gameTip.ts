// 브라우저 기본 title 툴팁 대신 작전실 장갑판 모양(.ops-tip, operations.css)의 설명 창을 띄우는 공용 도구.

const escapeHtml = (value: string): string => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** 남은 title을 data-tip="text"로 옮겨 기본 툴팁이 겹치지 않게 한다. 이미 전용 설명이 있는 요소는 title만 지운다. */
export function adoptTitles(root: ParentNode): void {
  root.querySelectorAll<HTMLElement>('[title]').forEach(el => {
    if (!el.dataset.tip) { el.dataset.tip = 'text'; el.dataset.hint = el.title; }
    el.removeAttribute('title');
  });
}

/** "제목 · 내용 · 내용" 힌트를 머리(요소의 첫 아이콘 + 제목)와 항목 목록으로 나눠 그린다. */
export function textTip(el: HTMLElement): string {
  const [head, ...rest] = (el.dataset.hint ?? '').split(' · ').map(escapeHtml);
  const src = el.querySelector('img')?.getAttribute('src');
  const body = rest.length > 1 ? `<ul>${rest.map(line => `<li>${line}</li>`).join('')}</ul>` : rest.length ? `<p>${rest[0]}</p>` : '';
  return `<header>${src ? `<img class="ops-icon" src="${src}" width="32" height="32" alt="">` : ''}<b>${head}</b></header>${body}`;
}

/** 대상 아래(공간이 없으면 위)에 화면 밖으로 나가지 않게 붙인다. 표의 행은 이름 칸을 기준으로 삼는다. */
export function placeTip(tip: HTMLElement, el: HTMLElement): void {
  const anchor = (el.tagName === 'TR' ? el.querySelector('th') ?? el : el).getBoundingClientRect();
  const w = tip.offsetWidth, h = tip.offsetHeight, gap = 6, margin = 8;
  const below = anchor.bottom + gap + h <= innerHeight - margin;
  tip.style.left = `${Math.max(margin, Math.min(anchor.left, innerWidth - w - margin))}px`;
  tip.style.top = `${below ? anchor.bottom + gap : Math.max(margin, anchor.top - gap - h)}px`;
}

export function createTip(): HTMLDivElement {
  const tip = document.createElement('div');
  tip.className = 'ops-tip'; tip.setAttribute('role', 'tooltip'); tip.hidden = true;
  return tip;
}

/**
 * host 안의 [data-tip] 요소에 마우스를 올리거나 키보드로 포커스하면 show를 부른다.
 * 일반 버튼 설명(text)은 터치 탭에 명령과 함께 번쩍이지 않도록 마우스에서만 띄우고, touch가 true인 전용 설명만 터치에서도 띄운다.
 */
export function bindTips(host: HTMLElement, tip: HTMLElement, show: (el: HTMLElement) => void, touch = false, onHide?: () => void): void {
  const target = (e: Event) => (e.target as HTMLElement).closest?.<HTMLElement>('[data-tip]') ?? null;
  const hide = () => { tip.hidden = true; onHide?.(); };
  host.addEventListener('pointerover', e => {
    const el = target(e);
    if (el && ((e as PointerEvent).pointerType === 'mouse' || touch && el.dataset.tip !== 'text')) show(el);
  });
  host.addEventListener('focusin', e => { const el = target(e); if (el && el.matches(':focus-visible')) show(el); });
  for (const type of ['pointerout', 'focusout']) host.addEventListener(type, e => {
    const el = target(e), next = (e as PointerEvent).relatedTarget as HTMLElement | null;
    if (el && !(next && el.contains(next) && next.closest('[data-tip]') === el)) hide();
  });
  host.addEventListener('scroll', hide, true);
}

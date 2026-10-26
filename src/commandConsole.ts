import { commandIconUrl } from './commandIcons';
import { CONSOLE_Y, GAME_W, MOBILE_LAYOUT } from './interface/layout';
import { W } from './data/rules';

/** 명령 한 줄을 받아 결과 문구를 돌려준다. 명령 목록은 따로 보여 주지 않는다(비밀 명령). */
export interface ConsoleCommand { names: string[]; desc: string; run(args: string[]): string }

const HISTORY_LIMIT = 20;
/** 데스크톱 하단 콘솔은 맵 아래 가장자리보다 이만큼 솟아 있다(consoleChrome의 능선). */
const CONSOLE_RISE = 32;
const GAP = 8;

/**
 * 하단 인터페이스 바로 위, 맵 가운데에 뜨는 명령 입력 창. PC는 Enter, 모바일은 상단 패널 둘째 줄의 작은 명령 아이콘으로 연다.
 * 입력 중인 키는 게임 단축키(S 회수, 숫자 보급 등)로 새지 않도록 창 안에서 멈춘다.
 */
export class CommandConsole {
  private form = document.createElement('form');
  private input = document.createElement('input');
  private output = document.createElement('p');
  private commands: ConsoleCommand[] = [];
  private history: string[] = [];
  private cursor = 0;
  // 바깥을 누르면 닫는다. 여는 버튼은 스스로 열고 닫으므로 제외한다.
  private onResize = () => this.position();
  private onOutside = (e: PointerEvent) => {
    const target = e.target as HTMLElement;
    if (this.isOpen && !this.form.contains(target) && !target.closest?.('[data-action="console"]')) this.close();
  };

  constructor() {
    this.form.className = 'command-console';
    this.form.hidden = true;
    this.form.setAttribute('role', 'dialog');
    this.form.setAttribute('aria-label', '명령 입력');
    this.form.innerHTML = `<img src="${commandIconUrl('console')}" width="28" height="28" alt="" aria-hidden="true"><span class="command-console-prompt" aria-hidden="true">&gt;</span>`;
    Object.assign(this.input, { type: 'text', autocomplete: 'off', spellcheck: false, placeholder: '명령어 입력' });
    this.input.setAttribute('aria-label', '명령어');
    this.input.setAttribute('autocapitalize', 'off');
    this.input.enterKeyHint = 'send';
    this.output.className = 'command-console-output';
    this.output.setAttribute('role', 'status');
    this.form.append(this.input, this.output);
    document.body.append(this.form);

    this.form.addEventListener('submit', e => { e.preventDefault(); this.submit(); });
    // 입력 키가 Phaser(창 전체)의 게임 단축키로 전달되지 않게 막는다.
    for (const type of ['keydown', 'keyup', 'keypress']) this.form.addEventListener(type, e => e.stopPropagation());
    for (const type of ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'touchstart', 'touchend', 'wheel']) this.form.addEventListener(type, e => e.stopPropagation(), { passive: true });
    this.input.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); this.close(); }
      else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); this.recall(e.key === 'ArrowUp' ? -1 : 1); }
    });
    document.addEventListener('pointerdown', this.onOutside, true);
    window.addEventListener('resize', this.onResize);
    window.visualViewport?.addEventListener('resize', this.onResize);
    window.visualViewport?.addEventListener('scroll', this.onResize);
  }

  get isOpen(): boolean { return !this.form.hidden; }

  register(command: ConsoleCommand): void {
    this.commands = this.commands.filter(c => !c.names.some(name => command.names.includes(name)));
    this.commands.push(command);
  }

  open(): void {
    if (this.isOpen) { this.input.focus(); return; }
    this.form.hidden = false; this.output.textContent = ''; this.input.value = ''; this.cursor = this.history.length;
    this.position();
    // Enter를 누른 그 키 입력이 곧바로 빈 제출로 이어지지 않도록 다음 프레임에 포커스한다.
    requestAnimationFrame(() => this.input.focus({ preventScroll: true }));
  }

  close(): void {
    if (!this.isOpen) return;
    this.form.hidden = true; this.input.blur();
    const canvas = document.querySelector('canvas'); canvas?.setAttribute('tabindex', '0'); canvas?.focus({ preventScroll: true });
  }

  toggle(): void { if (this.isOpen) this.close(); else this.open(); }

  /** 입력한 명령을 실행해 결과를 창에 남긴다. 빈 입력으로 Enter를 누르면 창을 닫는다. */
  execute(line: string): string {
    // "show me the money"처럼 띄어쓰기가 든 명령도 받는다. 대소문자와 연속 공백은 가리지 않고, 가장 긴 이름부터 맞춘다.
    const text = line.trim().toLowerCase().replace(/\s+/g, ' ');
    const match = this.commands.flatMap(c => c.names.map(name => ({ c, name })))
      .filter(({ name }) => text === name || text.startsWith(name + ' '))
      .sort((a, b) => b.name.length - a.name.length)[0];
    if (!match) return `알 수 없는 명령: ${line.trim()}`;
    const rest = text.slice(match.name.length).trim();
    return match.c.run(rest ? rest.split(' ') : []);
  }

  destroy(): void {
    document.removeEventListener('pointerdown', this.onOutside, true);
    window.removeEventListener('resize', this.onResize);
    window.visualViewport?.removeEventListener('resize', this.onResize);
    window.visualViewport?.removeEventListener('scroll', this.onResize);
    this.form.remove();
  }

  private submit(): void {
    const line = this.input.value.trim();
    if (!line) { this.close(); return; }
    if (this.history[this.history.length - 1] !== line) this.history = [...this.history, line].slice(-HISTORY_LIMIT);
    this.cursor = this.history.length;
    this.output.textContent = this.execute(line);
    this.input.value = '';
    this.position();
  }

  /**
   * 창의 아래 끝을 하단 인터페이스(데스크톱 콘솔 능선, 모바일은 맵 아래 끝) 바로 위에 맞추고 맵 가운데에 둔다.
   * 모바일 가상 키보드가 화면을 가리면 보이는 영역 안으로 끌어올린다.
   */
  private position(): void {
    if (!this.isOpen) return;
    const canvas = document.querySelector('canvas'); if (!canvas) return;
    const r = canvas.getBoundingClientRect(), scale = r.width / GAME_W;
    const anchor = r.top + (MOBILE_LAYOUT ? CONSOLE_Y : CONSOLE_Y - CONSOLE_RISE) * scale - GAP;
    const view = window.visualViewport, viewBottom = view ? view.offsetTop + view.height : innerHeight;
    const top = Math.max(GAP, Math.min(anchor, viewBottom - GAP) - this.form.offsetHeight);
    Object.assign(this.form.style, { top: `${top}px`, left: `${r.left + W / 2 * scale}px`, width: `min(520px, ${Math.max(240, W * scale - 32)}px)` });
  }

  private recall(step: number): void {
    if (!this.history.length) return;
    this.cursor = Math.max(0, Math.min(this.history.length, this.cursor + step));
    this.input.value = this.history[this.cursor] ?? '';
  }
}

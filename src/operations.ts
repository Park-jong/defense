import { attackCount, attackDamage, SUPPORT_BRANCH_RANGE, ENEMY_DEFS, EnemyKey, FACTIONS, FACTION_TOWERS, Faction, GAME_W, MAP_DEFS, MAX_WAVE, MOBILE_LAYOUT, TEST_GOLD, SIDE_W, TOP_BAR_H, TOWER_DEFS, TowerKey, TOWER_KEYS, W } from './config';
import { SKILL_DEFS, SKILL_KEYS } from './catalog';
import { unitImageUrl } from './unitArt';
import { commandIconUrl } from './commandIcons';
import { ACHIEVEMENTS, bossPattern, BRANCHES, COMMANDERS, CommanderKey, DIFFICULTIES, ENEMY_INFO, MODES, Profile, REWARDS, RewardKey, RunOptions, RunSave, RunStats, SavedUnit, TARGETS, TargetMode, wavePlan } from './campaign';
import { adoptTitles, bindTips, createTip, placeTip, textTip } from './gameTip';
import './operations.css';

export interface OperationsView {
  options: RunOptions; wave: number; gold: number; lives: number; active: boolean; over: boolean; paused: boolean;
  selected?: SavedUnit; units: SavedUnit[]; stats: RunStats; profile: Profile;
  commander: Record<CommanderKey, number>; autoCommander: CommanderKey[]; pending: RewardKey[]; checkpoint: RunSave | null;
  tutorial: number; notice: string; test: boolean;
  faction: Faction;
}
export interface OperationsActions {
  view(): OperationsView;
  pause(open: boolean): void;
  start(options: RunOptions): void;
  resume(): void;
  target(mode: TargetMode): void;
  branch(key: keyof typeof BRANCHES): boolean;
  move(): boolean;
  select(id: string): void;
  faction(key: Faction): void;
  commander(key: CommanderKey): void;
  autoCommander(key: CommanderKey): void;
  reward(key: RewardKey): void;
  skin(key: Profile['skin']): void;
  volume(value: number): void;
  tutorial(skip: boolean): void;
}
const escape = (value: string): string => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const icon = (key: string): string => `<img class="ops-icon" src="${commandIconUrl(key)}" width="32" height="32" alt="" aria-hidden="true">`;
const button = (action: string, key: string, content: string, label: string, options: { disabled?: boolean; selected?: boolean; className?: string; hint?: string; tip?: string } = {}): string =>
  `<button type="button" data-action="${action}" data-key="${key}" class="${options.className ?? ''}" aria-label="${escape(label)}" title="${escape(options.hint ?? label)}"${options.tip ? ` data-tip="${options.tip}"` : ''} ${options.disabled ? 'disabled' : ''} ${options.selected === undefined ? '' : `aria-pressed="${options.selected}"`}>${content}</button>`;
const tutorialSteps = [
  '병력을 골라 길 옆 빈 칸에 배치하세요. 터치는 같은 칸을 두 번 탭합니다.',
  '배치한 병력을 선택하고 강화(U)를 누르세요.',
  '전용 스킬(Z/X)을 장착하세요. 전투 중 자동으로 발동합니다.',
  '벙커를 배치하고 빈 사격구에 보병을 보급하세요.',
];
const tutorialHints = ['병력을 골라 길 옆에 배치', '병력을 선택하고 강화', '전용 스킬 하나 장착', '벙커에 보병 보급'];
const tutorialIcons = ['terran', 'upgrade', 'storm', 'empty'];
const enemyIcons: Record<EnemyKey, string> = { grunt: 'first', runner: 'overdrive', tank: 'shield', boss: 'boss', medic: 'repair', splitter: 'shrapnel', shielder: 'plasma' };
const rewardIcons: Record<RewardKey, string> = { power: 'siege', haste: 'overdrive', range: 'range', repair: 'repair', supply: 'supply' };
const rewardValues: Record<RewardKey, string> = { power: '+12%', haste: '+10%', range: '+12', repair: '+4', supply: '+150' };
const modeIcons: Record<RunOptions['mode'], string> = { standard: 'shield', endless: 'endless', bunker: 'empty', budget: 'mineral' };
const compareHead = [
  ['mineral', '비용', '배치 비용 · 미네랄'], ['siege', '공격력', 'Lv.1 한 번 공격의 총 피해 · 캐리어는 인터셉터 전체 합산'], ['range', '사거리', '공격 · 지원이 닿는 반경'],
  ['overdrive', '초당 공격', '1초에 공격하는 횟수'], ['barrage', 'DPS', '초당 피해 · 공격력 × 초당 공격'],
  ['mineral', '미네랄 100당 DPS', '비용 대비 화력 · 높을수록 경제적'], ['storm', '전용 스킬', '보급 상점 부대 탭에서 장착 · 전투 중 자동 발동'],
];
/** 비교표 설명 창과 도감 카드가 함께 쓰는 병력 특성 요약. */
function unitTraits(k: TowerKey): string[] {
  const d = TOWER_DEFS[k] as (typeof TOWER_DEFS)[TowerKey] & { splash?: number; slow?: number };
  return [k === 'support' ? '주변 공격 속도 +20% · 레벨당 +5%' : '', k === 'observer' ? '약점 노출 · 받는 피해 +35%' : '',
    attackCount(k) > 1 ? `인터셉터 ${attackCount(k)}기 × 공격력 ${d.dmg} · 처치 후 표적 재탐색` : '',
    d.splash ? `범위 피해 · 반경 ${d.splash}` : '', d.slow ? `둔화 ${Math.round(d.slow * 100)}%` : ''].filter(Boolean);
}
/** 설명 창 없이 보이는 글자·아이콘만으로 충분한 작전실 요소. */
const OPS_SILENT = [
  '.ops-nav button', '.ops-volume', '.ops-save-status', '[data-action="map"]', '[data-action="difficulty"]', '[data-action="mode"]',
  '[data-action="start"]', '[data-action="resume"]', '[data-action="target"]', '.ops-empty [data-action="close"]', '.ops-metrics > div',
  '[data-action="tutorial"]', '[data-action="skin"]', '[data-action="reward"]',
].join(',');
const tabs = {
  setup: { icon: 'flag', name: '출격', label: '작전 설정' },
  tactics: { icon: 'tactics', name: '병력', label: '전술 / 병력' },
  stats: { icon: 'stats', name: '전적', label: '전투 통계' },
  codex: { icon: 'codex', name: '도감', label: '도감 / 훈련' },
  medals: { icon: 'medal', name: '훈장', label: '업적 / 외형' },
};

/** Preview the actual routes so the map can be chosen without a settings form. */
function mapPreview(key: RunOptions['map']): string {
  const routes = MAP_DEFS[key].routes.map(route => `<polyline points="${route.map(([c, r]) => `${(c + 1) * 8},${(r + 1) * 8}`).join(' ')}"/>`).join('');
  const highlands = key === 'canyon' ? MAP_DEFS.canyon.highGround.areas.map(([c, r, w, h]) => `<rect class="ops-map-highland" x="${(c + .5) * 8}" y="${(r + .5) * 8}" width="${w * 8}" height="${h * 8}" rx="3"/><path class="ops-map-elevation" d="M${(c + w / 2 + 1) * 8 - 4} ${(r + h / 2 + 1) * 8 + 1}l4-4 4 4m-8 4 4-4 4 4"/>`).join('') : '';
  let junction = '';
  if (key === 'junction') {
    const [north, south] = MAP_DEFS[key].routes;
    const start = north.findIndex(([c, r]) => south.some(([sc, sr]) => c === sc && r === sr));
    const [c, r] = north[start], x = (c + 1) * 8, y = (r + 1) * 8;
    junction = `<polyline class="ops-map-shared" points="${north.slice(start).map(([c, r]) => `${(c + 1) * 8},${(r + 1) * 8}`).join(' ')}"/><circle class="ops-map-hub" cx="${x}" cy="${y}" r="5"/><path class="ops-map-merge" d="M${x - 3} ${y - 1}h2l1 2 1-2h2m-3 2v2"/>`;
  }
  return `<svg class="ops-map ops-map-${key}" viewBox="0 0 168 104" fill="none" aria-hidden="true"><path class="ops-map-grid" d="M0 24h168M0 48h168M0 72h168M0 96h168M24 0v104M48 0v104M72 0v104M96 0v104M120 0v104M144 0v104"/><g class="ops-map-road">${routes}</g><g class="ops-map-route">${routes}</g>${highlands}${junction}${MAP_DEFS[key].routes.map(route => `<circle class="ops-map-entry" cx="${(route[0][0] + 1) * 8 + 3}" cy="${(route[0][1] + 1) * 8}" r="3"/>`).join('')}</svg>`;
}

export class OperationsCenter {
  private ribbon = document.createElement('div');
  private dialog = document.createElement('dialog');
  private tip = createTip();
  private ribbonTip = createTip();
  private ribbonTipSpec = '';
  private section = 'setup';
  private draft?: RunOptions;
  private cache = '';
  private images = new Map(TOWER_KEYS.map(k => [k, unitImageUrl(k)]));
  private onResize = () => this.position();
  constructor(private actions: OperationsActions) {
    this.ribbon.className = 'mission-ribbon'; this.ribbon.setAttribute('aria-label', '전술 상황판');
    this.dialog.className = 'operations-center'; this.dialog.setAttribute('aria-label', '작전실');
    document.body.append(this.ribbon, this.dialog);
    for (const el of [this.ribbon, this.dialog]) {
      for (const type of ['pointerdown', 'pointerup', 'pointermove', 'pointercancel', 'mousedown', 'mouseup', 'mousemove', 'touchstart', 'touchmove', 'touchend', 'touchcancel', 'wheel']) el.addEventListener(type, e => e.stopPropagation(), { passive: true });
      el.addEventListener('click', e => { e.stopPropagation(); this.click(e); });
      // 사령관 스킬 우클릭(터치는 길게 누르기)은 쿨타임마다 자동 사용을 켜고 끈다. 쿨타임 중이라 비활성인 버튼도 좌표로 찾아 받는다.
      if (el === this.ribbon) el.addEventListener('contextmenu', e => {
        const me = e as MouseEvent, selector = 'button[data-action="commander"]';
        const btn = (me.target as HTMLElement).closest<HTMLButtonElement>(selector) ?? document.elementsFromPoint(me.clientX, me.clientY).find(node => node.matches(selector)) as HTMLButtonElement | undefined;
        e.preventDefault(); e.stopPropagation();
        if (btn) { this.actions.autoCommander(btn.dataset.key as CommanderKey); this.update(); }
      });
      if (el === this.dialog) el.addEventListener('keydown', e => { if (!this.open) return; e.stopPropagation(); if ((e as KeyboardEvent).key.toLowerCase() === 'o') { e.preventDefault(); this.close(); } });
    }
    this.dialog.addEventListener('cancel', e => { e.preventDefault(); this.close(); });
    this.dialog.addEventListener('input', e => {
      if ((e.target as HTMLElement).id === 'battle-volume') {
        this.actions.volume(Number((e.target as HTMLInputElement).value) / 100);
        const output = this.dialog.querySelector('output'); if (output) output.textContent = (e.target as HTMLInputElement).value + '%';
      }
    });
    // 비교표와 상단 패널의 설명은 브라우저 기본 툴팁 대신 작전실 장갑판 모양의 창으로 띄운다.
    document.body.append(this.ribbonTip);
    // 비교표·도감처럼 명령이 없는 전용 설명은 터치로도 띄우고, 상단 패널은 누르는 순간 명령이 실행되므로 마우스와 키보드에서만 띄운다.
    bindTips(this.dialog, this.tip, el => this.showTip(el), true);
    bindTips(this.ribbon, this.ribbonTip, el => this.showTip(el, this.ribbonTip), false, () => { this.ribbonTipSpec = ''; });
    window.addEventListener('resize', this.onResize);
    this.update();
  }
  get open(): boolean { return this.dialog.open; }
  show(section = 'tactics'): void {
    const v = this.actions.view();
    if (!this.open) this.draft = { ...v.options };
    this.section = v.pending.length ? 'reward' : section;
    this.actions.pause(true); this.render();
    if (!this.dialog.open) {
      this.dialog.showModal();
      if (this.section === 'setup') this.dialog.querySelector<HTMLButtonElement>(`[data-action="${v.checkpoint && !v.test ? 'resume' : 'start'}"]`)?.focus({ preventScroll: true });
    }
  }
  close(): void {
    if (this.actions.view().pending.length) {
      if (this.section !== 'reward') { this.section = 'reward'; this.render(); }
      return;
    }
    this.dialog.close(); this.actions.pause(false);
    const canvas = document.querySelector('canvas'); canvas?.setAttribute('tabindex', '0'); canvas?.focus({ preventScroll: true });
  }
  destroy(): void { window.removeEventListener('resize', this.onResize); this.ribbon.remove(); this.ribbonTip.remove(); this.dialog.remove(); }
  update(): void {
    const v = this.actions.view(), next = v.test ? MAX_WAVE : v.wave + 1;
    const tutorial = !v.profile.tutorialDone && v.tutorial < 4 && !v.test && !v.active && !v.over
      ? `<div class="field-tutorial">${icon(tutorialIcons[v.tutorial])}<span title="${escape(tutorialSteps[v.tutorial])}">${tutorialHints[v.tutorial]}</span><span class="training-progress" role="img" aria-label="훈련 ${v.tutorial + 1}/4">${tutorialSteps.map((_, i) => `<i class="${i <= v.tutorial ? 'done' : ''}"></i>`).join('')}</span>${button('open', 'codex', icon('help'), '도움말')}${button('skip', '', icon('skip'), '훈련 건너뛰기')}</div>` : '';
    const factions = `<div class="mission-actions mission-factions" role="group" aria-label="종족 선택">${(Object.keys(FACTIONS) as Faction[]).map(k => button('faction', k, icon(k), `${FACTIONS[k].name} 병력 9종${k === 'terran' ? ' [T]' : ' [R]'}`, { disabled: v.over || v.options.mode === 'bunker' && k === 'protoss', selected: v.faction === k, tip: `faction:${k}` })).join('')}</div>`;
    // 모바일 사이드 패널은 한 줄(32px)뿐이라 훈련 안내가 있으면 예보 대신 보여준다.
    const forecast = !v.active && !v.over && !(tutorial && MOBILE_LAYOUT) ? `<div class="mission-forecast" role="group" aria-label="다음 웨이브 ${next}"><b>W ${String(next).padStart(2, '0')}</b>${this.enemies(next)}</div>` : '';
    const html = `<div class="mission-strip"><div class="mission-toolbar">${factions}<div class="mission-actions" role="group" aria-label="사령관 패널">${button('open', 'tactics', icon('manage'), '작전실 [O]', { tip: 'ops' })}${(['strike', 'slow', 'supply'] as CommanderKey[]).map(k => {
      const cooldown = Math.ceil(v.commander[k]);
      const auto = v.autoCommander.includes(k), autoText = auto ? ' · 자동 사용 중' : '';
      return button('commander', k, `${icon(k)}${cooldown > 0 ? `<span class="mission-cooldown" aria-hidden="true">${cooldown}</span>` : ''}`, COMMANDERS[k].name + (cooldown > 0 ? ` ${cooldown}초` : '') + autoText, { disabled: v.over || v.paused || !v.active || cooldown > 0 || v.options.mode === 'budget' && k === 'supply', className: auto ? 'is-auto' : '', tip: `commander:${k}`, hint: `${COMMANDERS[k].name} · ${COMMANDERS[k].desc} · 재사용 ${COMMANDERS[k].cooldown}초${cooldown > 0 ? ` · 남은 ${cooldown}초` : ''}${autoText} · 우클릭(길게 누르기)으로 자동 사용 ${auto ? '끄기' : '켜기'}` });
    }).join('')}</div></div>${forecast}${tutorial}</div>`;
    if (html !== this.cache) {
      this.ribbon.innerHTML = html; this.cache = html;
      // 쿨타임 숫자가 바뀔 때마다 버튼을 새로 그리므로, 자동 사용 빛의 회전 위상을 시계에 맞춰 끊김 없이 잇는다.
      const phase = -(performance.now() / 1000 % 2.6);
      this.ribbon.querySelectorAll<HTMLElement>('.is-auto').forEach(el => el.style.setProperty('--auto-delay', `${phase}s`));
      // 남은 title은 게임 스타일 설명 창으로 옮겨 브라우저 기본 툴팁이 겹치지 않게 한다.
      adoptTitles(this.ribbon);
      // 쿨타임 숫자처럼 보던 버튼이 다시 그려지면 설명 창도 새 버튼과 최신 값으로 다시 맞춘다.
      const hovered = this.ribbonTipSpec ? this.ribbon.querySelector<HTMLElement>(`[data-tip="${this.ribbonTipSpec}"]`) : null;
      if (hovered && !this.ribbonTip.hidden) this.showTip(hovered, this.ribbonTip); else { this.ribbonTip.hidden = true; this.ribbonTipSpec = ''; }
    }
    this.position();
  }
  /** 게임 좌표 크기 그대로 배치하고 캔버스 배율만큼 줄인다: 데스크톱은 맵 위 전술 띠, 모바일은 사이드 패널 맨 위. */
  private position(): void {
    const canvas = document.querySelector('canvas'); if (!canvas) return;
    const r = canvas.getBoundingClientRect(), scale = r.width / GAME_W, side = MOBILE_LAYOUT;
    Object.assign(this.ribbon.style, side
      ? { left: `${r.left + (W + 8) * scale}px`, top: `${r.top + 4 * scale}px`, width: `${SIDE_W - 16}px`, transform: `scale(${scale})` }
      : { left: `${r.left + 8 * scale}px`, top: `${r.top + (TOP_BAR_H + 2) * scale}px`, width: `${W - 16}px`, transform: `scale(${scale})` });
    this.ribbon.classList.toggle('side', side);
  }
  private tipContent(spec: string, el?: HTMLElement): string {
    const [kind, key, extra] = spec.split(':');
    if (kind === 'text') return el ? textTip(el) : '';
    if (kind === 'faction') {
      const f = key as Faction, v = this.actions.view(), locked = v.options.mode === 'bunker' && f === 'protoss';
      return `<header>${icon(f)}<b>${FACTIONS[f].name} 병력<small>${v.faction === f ? '현재 보급 중' : '명령 카드를 이 종족으로 전환'}</small></b><kbd>${f === 'terran' ? 'T' : 'R'}</kbd></header><div class="ops-tip-roster">${FACTION_TOWERS[f].map(k => this.art(k)).join('')}</div>${locked ? '<p class="ops-tip-note">벙커 작전에서는 테란만 보급합니다.</p>' : ''}`;
    }
    if (kind === 'ops') return `<header>${icon('manage')}<b>작전실<small>여는 동안 전투 일시정지</small></b><kbd>O</kbd></header><p>출격 설정 · 병력 전술 · 전적 · 도감 · 훈장</p>`;
    if (kind === 'commander') {
      const k = key as CommanderKey, v = this.actions.view(), cooldown = Math.ceil(v.commander[k]), auto = v.autoCommander.includes(k);
      const blocked = v.options.mode === 'budget' && k === 'supply';
      return `<header>${icon(k)}<b>${COMMANDERS[k].name}<small>사령관 지원</small></b>${auto ? '<span class="ops-tip-auto">AUTO</span>' : ''}</header><p>${COMMANDERS[k].desc}</p><footer><span>${icon('clock')}재사용 ${COMMANDERS[k].cooldown}초</span>${cooldown > 0 ? `<span class="ops-tip-wait">남은 ${cooldown}초</span>` : ''}</footer>${blocked ? '<p class="ops-tip-note">제한 예산 작전에서는 사용할 수 없습니다.</p>' : ''}<p class="ops-tip-hint"><kbd>우클릭</kbd>쿨타임마다 자동 사용 ${auto ? '끄기' : '켜기'}</p>`;
    }
    if (kind === 'enemy') {
      const k = key as EnemyKey;
      return `<header>${icon(enemyIcons[k])}<b>${ENEMY_INFO[k].name}<small>이번 웨이브 ${extra}기</small></b></header><p>${ENEMY_INFO[k].desc}</p><footer><span>기본 체력 ${ENEMY_DEFS[k].hp}</span><span>속도 ${ENEMY_DEFS[k].speed}</span></footer>`;
    }
    if (kind === 'stat') { const [i, label, desc] = compareHead[Number(key)]; return `<header>${icon(i)}<b>${label}</b></header><p>${desc}</p>`; }
    if (kind === 'skill') {
      const s = SKILL_DEFS[key as keyof typeof SKILL_DEFS];
      return `<header><img class="ops-icon" src="${commandIconUrl(key)}" width="32" height="32" alt=""><b>${s.name}<small>${TOWER_DEFS[s.unit as TowerKey].name} 전용</small></b></header><p>${s.desc}</p><footer><span>${icon('clock')}${s.cooldown}초</span><span>${icon('mineral')}${s.cost}</span></footer>`;
    }
    const k = key as TowerKey, d = TOWER_DEFS[k], traits = unitTraits(k);
    const skills = SKILL_KEYS.filter(s => SKILL_DEFS[s].unit === k);
    return `<header>${this.art(k)}<b>${d.name}<small>${d.role}</small></b><span class="ops-tip-cost">${icon('mineral')}${d.cost}</span></header><p>${d.desc}</p>${traits.length ? `<ul>${traits.map(t => `<li>${t}</li>`).join('')}</ul>` : ''}${skills.length ? `<div class="ops-tip-skills">${skills.map(s => `<span><img src="${commandIconUrl(s)}" width="20" height="20" alt=""><b>${SKILL_DEFS[s].name}</b><small>${SKILL_DEFS[s].cooldown}초</small></span>`).join('')}</div>` : ''}`;
  }
  /** 도감 병력 카드: 펼치지 않아도 역할·비용·특성·전용 스킬을 한눈에 읽는다. */
  private unitCard(k: TowerKey): string {
    const d = TOWER_DEFS[k], traits = unitTraits(k), skills = SKILL_KEYS.filter(s => SKILL_DEFS[s].unit === k);
    return `<article class="ops-unit-card" aria-label="${escape(`${d.name} · ${d.role}`)}"><header>${this.art(k)}<div><h3>${d.name}</h3><small>${d.role}</small></div>${d.dmg ? `<span class="ops-unit-cost ops-unit-dmg" title="공격력 · Lv.1 한 번 공격의 총 피해" aria-label="공격력 ${attackDamage(k)}">${icon('siege')}${attackDamage(k)}</span>` : ''}<span class="ops-unit-cost" title="배치 비용" aria-label="비용 ${d.cost}">${icon('mineral')}${d.cost}</span></header>
      <p>${d.desc}</p>${traits.length ? `<ul class="ops-unit-traits">${traits.map(t => `<li>${t}</li>`).join('')}</ul>` : ''}
      ${skills.length ? `<ul class="ops-unit-skills">${skills.map(s => `<li><img src="${commandIconUrl(s)}" width="26" height="26" alt=""><div><b>${SKILL_DEFS[s].name}<small>${icon('clock')}${SKILL_DEFS[s].cooldown}초</small></b><span>${SKILL_DEFS[s].desc}</span></div></li>`).join('')}</ul>` : ''}</article>`;
  }
  private showTip(el: HTMLElement, tip: HTMLElement = this.tip): void {
    tip.innerHTML = this.tipContent(el.dataset.tip!, el);
    if (tip === this.tip && tip.parentElement !== this.dialog) this.dialog.append(tip);
    if (tip === this.ribbonTip) this.ribbonTipSpec = el.dataset.tip!;
    tip.hidden = false;
    placeTip(tip, el);
  }
  private hideTip(): void { this.tip.hidden = true; }
  private art(key: TowerKey): string { return `<img class="ops-unit-art" src="${this.images.get(key)}" width="64" height="64" alt="" aria-hidden="true">`; }
  private enemies(wave: number): string {
    const plan = wavePlan(wave);
    return (Object.keys(ENEMY_DEFS) as EnemyKey[]).filter(k => plan.includes(k)).map(k => {
      const count = plan.filter(x => x === k).length, label = `${ENEMY_INFO[k].name} ${count}기`;
      return `<span class="ops-enemy ${k === 'boss' ? 'is-boss' : ''}" role="img" data-tip="enemy:${k}:${count}" aria-label="${label}">${icon(enemyIcons[k])}<b aria-hidden="true">${count}</b></span>`;
    }).join('');
  }
  private click(e: Event): void {
    const el = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]'); if (!el || el.disabled) return;
    const a = el.dataset.action!, key = el.dataset.key!;
    if (a === 'open') { this.show(key); return; }
    if (a === 'faction') { this.actions.faction(key as Faction); this.update(); return; }
    if (a === 'close') { this.close(); return; }
    if (a === 'tab') this.section = key;
    if (a === 'map' || a === 'difficulty' || a === 'mode') this.draft = { ...(this.draft ?? this.actions.view().options), [a]: key };
    if (a === 'commander') { this.actions.commander(key as CommanderKey); this.update(); return; }
    if (a === 'start') { this.actions.start({ ...(this.draft ?? this.actions.view().options) }); return; }
    if (a === 'resume') { this.actions.resume(); return; }
    if (a === 'target') this.actions.target(key as TargetMode);
    if (a === 'branch') this.actions.branch(key as keyof typeof BRANCHES);
    if (a === 'select') this.actions.select(key);
    if (a === 'move' && this.actions.move()) { this.close(); return; }
    if (a === 'reward') { this.actions.reward(key as RewardKey); this.close(); return; }
    if (a === 'skin') this.actions.skin(key as Profile['skin']);
    if (a === 'tutorial') { this.actions.tutorial(false); this.update(); }
    if (a === 'skip') { this.actions.tutorial(true); this.update(); if (!this.open) return; }
    const scroll = a === 'tab' ? 0 : this.dialog.querySelector('.ops-content')?.scrollTop ?? 0;
    this.render();
    const content = this.dialog.querySelector('.ops-content'); if (content) content.scrollTop = scroll;
    this.dialog.querySelector<HTMLButtonElement>(`button[data-action="${a}"][data-key="${key}"]`)?.focus({ preventScroll: true });
  }
  private render(): void {
    const v = this.actions.view();
    const disclosures = Array.from(this.dialog.querySelectorAll<HTMLDetailsElement>('details[id]')).map(el => ({ id: el.id, open: el.open }));
    // 병력 명부·탭 사이드바처럼 자체 스크롤하는 영역은 다시 그려도 보던 위치를 유지해 연속 조정이 끊기지 않게 한다.
    const scrolls = ['.ops-roster', '.ops-nav'].map(selector => {
      const el = this.dialog.querySelector<HTMLElement>(selector);
      return { selector, top: el?.scrollTop ?? 0, left: el?.scrollLeft ?? 0 };
    });
    this.dialog.classList.toggle('is-reward', this.section === 'reward');
    this.dialog.innerHTML = `<header class="ops-header"><div class="ops-heading">${icon(this.section === 'reward' ? 'supply' : 'manage')}<div><h1>${this.section === 'reward' ? '전장 보상 선택' : '작전실'}</h1><p>${this.section === 'reward' ? `WAVE ${v.wave} CLEAR` : MAP_DEFS[v.options.map].name}</p></div></div><span class="ops-wallet" aria-label="미네랄 ${v.gold}">${icon('mineral')}${v.gold.toLocaleString()}</span>${v.pending.length ? '' : button('close', '', icon('close'), '전장 복귀', { className: 'ops-close', hint: '전장 복귀 [Esc / O]' })}</header>
      ${v.pending.length ? '' : `<nav class="ops-nav" aria-label="작전실 메뉴">${Object.entries(tabs).map(([key, tab]) => button('tab', key, `${icon(tab.icon)}<span>${tab.name}</span>`, tab.label, { selected: this.section === key })).join('')}</nav>`}
      <main class="ops-content">${v.notice ? `<p class="ops-notice" role="status">${icon('saved')}${v.notice}</p>` : ''}${this.section === 'reward' ? this.rewards(v) : this.section === 'setup' ? this.setup(v) : this.section === 'tactics' ? this.tactics(v) : this.section === 'stats' ? this.stats(v) : this.section === 'codex' ? this.codex(v.faction) : this.medals(v)}</main>
      ${v.pending.length ? '' : `<footer class="ops-footer"><label class="ops-volume" title="효과음 음량">${icon('volume')}<input id="battle-volume" aria-label="효과음 음량" type="range" min="0" max="100" value="${Math.round(v.profile.volume * 100)}"><output for="battle-volume">${Math.round(v.profile.volume * 100)}%</output></label><span class="ops-save-status" title="${v.test ? '테스트 모드 · 저장 및 업적 제외' : '웨이브 종료 시 자동 저장 · 교전 중 새로고침하면 마지막 준비 시점으로 복귀'}">${icon('saved')}${v.test ? 'TEST' : '자동 저장'}</span></footer>`}`;
    for (const { id, open } of disclosures) {
      const details = this.dialog.querySelector<HTMLDetailsElement>(`#${id}`); if (details) details.open = open;
    }
    for (const { selector, top, left } of scrolls) this.dialog.querySelector<HTMLElement>(selector)?.scrollTo({ top, left });
    adoptTitles(this.dialog, OPS_SILENT); this.hideTip();
  }
  private setup(v: OperationsView): string {
    const draft = this.draft ?? v.options;
    return `<section class="ops-setup"><div class="ops-section-heading"><h2>${v.test ? '보스 테스트 전장' : '전장 선택'}</h2><span>${MAP_DEFS[draft.map].desc}</span></div><div class="ops-map-picker" role="group" aria-label="전장">${(Object.keys(MAP_DEFS) as RunOptions['map'][]).map(k => button('map', k, `${mapPreview(k)}<span>${MAP_DEFS[k].name}</span>`, MAP_DEFS[k].name, { selected: draft.map === k, hint: `${MAP_DEFS[k].name} · ${MAP_DEFS[k].desc}` })).join('')}</div>
      <div class="ops-rules"><div><h2>난이도</h2><div class="ops-difficulties" role="group" aria-label="난이도">${(Object.keys(DIFFICULTIES) as RunOptions['difficulty'][]).map((k, i) => button('difficulty', k, `${icon('shield')}<span>${DIFFICULTIES[k].name}</span><span class="ops-pips" aria-hidden="true">${'•'.repeat(i + 1)}</span>`, DIFFICULTIES[k].name, { selected: draft.difficulty === k })).join('')}</div></div><div><h2>모드</h2><div class="ops-modes" role="group" aria-label="작전 모드">${(Object.keys(MODES) as RunOptions['mode'][]).map(k => button('mode', k, k === 'bunker' ? this.art('bunker') : icon(modeIcons[k]), MODES[k].name, { selected: draft.mode === k, hint: `${MODES[k].name} · ${MODES[k].desc}` })).join('')}</div><p class="ops-mode-hint">${MODES[draft.mode].desc}</p></div></div>
      <div class="ops-launch">${v.checkpoint && !v.test ? `<div class="ops-checkpoint">${button('resume', '', `${icon('resume')}<span>이어하기</span><b>W ${String(v.checkpoint.wave).padStart(2, '0')}</b>`, '저장된 작전 이어하기', { className: 'ops-resume', hint: `${MAP_DEFS[v.checkpoint.options.map].name} · ${DIFFICULTIES[v.checkpoint.options.difficulty].name} · ${MODES[v.checkpoint.options.mode].name} · ${v.checkpoint.wave}웨이브 완료 · 기지 ${v.checkpoint.lives}/20 · 병력 ${v.checkpoint.units.length}기` })}<small>새 출격 시 기존 저장 교체</small></div>` : ''}${v.test
        ? button('start', '', `${icon('boss')}<span>보스 테스트</span>`, '보스 테스트 시작', { className: 'ops-deploy', hint: `${MAP_DEFS[draft.map].name}에서 ${MAX_WAVE}웨이브 ${bossPattern(MAX_WAVE)} 반복 · ◆ ${TEST_GOLD.toLocaleString()} · 저장 및 업적 제외` })
        : button('start', '', `${icon('deploy')}<span>출격</span>`, '새 작전 시작', { className: 'ops-deploy', hint: v.checkpoint ? '새 작전 시작 · 기존 체크포인트를 교체합니다' : '새 작전 시작' })}</div></section>`;
  }
  private tactics(v: OperationsView): string {
    const u = v.selected, next = v.test ? MAX_WAVE : v.wave + 1;
    const targetIcons: Record<TargetMode, string> = { first: 'first', strong: 'shield', weak: 'weak', boss: 'boss' };
    const targetNames: Record<TargetMode, string> = { first: '선두', strong: '강적', weak: '약적', boss: '보스' };
    const forecast = !v.over ? `<section class="ops-forecast"><div><small>${v.active ? '다음 교전' : '다음 웨이브'}</small><b>${String(next).padStart(2, '0')}</b></div><div class="ops-enemies">${this.enemies(next)}</div>${next % 10 === 0 ? `<p class="ops-danger">${icon('boss')}${bossPattern(next)} · 놓치면 패배</p>` : ''}</section>` : '';
    if (!v.units.length) return `${forecast}<div class="ops-empty">${this.art(v.faction === 'terran' ? 'marine' : 'zealot')}<h2>방어선을 세워볼까요?</h2><p>병력을 골라 길 옆에 배치하세요.</p>${button('close', '', `${icon('deploy')}<span>병력 배치</span>`, '병력 배치', { className: 'ops-primary' })}</div>`;
    return `${forecast}<div class="ops-section-heading"><h2>내 병력 <small>${v.units.length}</small></h2></div><div class="ops-roster" role="group" aria-label="배치된 병력">${v.units.map(t => button('select', t.id, `${this.art(t.k)}<span class="ops-level" aria-hidden="true">${t.hostId ? '↳ ' : ''}${'•'.repeat(t.lvl)}</span>`, `${TOWER_DEFS[t.k].name} #${t.id} · Lv.${t.lvl}${t.hostId ? ' · 주둔' : ''}`, { selected: t.id === u?.id })).join('')}</div>
      ${u ? `<section class="ops-unit"><div class="ops-unit-heading">${this.art(u.k)}<div><h2>${TOWER_DEFS[u.k].name}<small>Lv.${u.lvl}</small></h2><p>${TOWER_DEFS[u.k].role}</p></div>${button('move', '', `${icon('move')}<small>◆ 20</small>`, '선택 병력 재배치 · ◆ 20', { disabled: v.over || v.active || !!u.hostId || v.gold < 20, className: 'ops-move', hint: '준비 시간에 빈 칸으로 재배치 · ◆ 20 · 빈 칸 선택 시 비용 차감' })}</div>${u.k !== 'bunker' ? `<div class="ops-targets" role="group" aria-label="공격 대상 우선순위">${(Object.keys(TARGETS) as TargetMode[]).map(k => button('target', k, `${icon(targetIcons[k])}<span>${targetNames[k]}</span>`, TARGETS[k] + ' 우선', { disabled: v.over, selected: u.target === k })).join('')}</div><div class="ops-section-heading ops-branch-heading"><h3>특화</h3><span>${u.branch ? '선택 완료' : `Lv.3 · ◆ ${TOWER_DEFS[u.k].cost} · 선택 후 변경 불가`}</span></div><div class="ops-branches">${(Object.keys(BRANCHES) as (keyof typeof BRANCHES)[]).map(k => {
        const support = u.k === 'support' || u.k === 'observer';
        const value = support ? `+${SUPPORT_BRANCH_RANGE}` : k === 'power' ? '+70%' : '+40%';
        const detail = support ? '지원 사거리' : k === 'power' ? '공격력 · 간격 +15%' : '공속 · 범위 +35%';
        return button('branch', k, `${icon(k === 'power' ? 'siege' : 'overdrive')}<span><b>${BRANCHES[k].name}</b><small>${detail}</small></span><strong>${value}</strong>`, u.branch === k ? '선택 완료' : BRANCHES[k].name + ' 선택', { disabled: v.over || u.lvl < 3 || !!u.branch || v.gold < TOWER_DEFS[u.k].cost, selected: u.branch === k, hint: `${BRANCHES[k].name} · ${BRANCHES[k].desc} · ◆ ${TOWER_DEFS[u.k].cost} · 선택 후 변경 불가` });
      }).join('')}</div>` : `<p class="ops-muted">보병 보급과 강화는 벙커 명령 아이콘에서.</p>`}</section>` : '<p class="ops-muted">병력을 선택해 전술을 바꾸세요.</p>'}`;
  }
  private rewards(v: OperationsView): string {
    return `<p class="ops-reward-hint">하나를 골라 더 강해지세요.</p><div class="ops-rewards">${v.pending.map(k => button('reward', k, `${icon(rewardIcons[k])}<strong>${rewardValues[k]}</strong><b>${REWARDS[k].name}</b><span>${REWARDS[k].desc}</span>`, REWARDS[k].name + ' 획득', { hint: `${REWARDS[k].name} · ${REWARDS[k].desc}`, className: `ops-reward ops-reward-${k}` })).join('')}</div>`;
  }
  private stats(v: OperationsView): string {
    const units = [...v.stats.units].filter(u => u.damage > 0).sort((a, b) => b.damage - a.damage), top = units[0];
    const metrics = [{ icon: 'siege', label: '누적 피해', value: Math.round(v.stats.damage).toLocaleString() }, { icon: 'tactics', label: '처치', value: v.stats.kills }, { icon: 'weak', label: '기지 피해', value: v.stats.lost }, { icon: 'clock', label: '교전 시간', value: `${Math.floor(v.stats.seconds / 60)}:${String(Math.floor(v.stats.seconds % 60)).padStart(2, '0')}` }];
    return `<div class="ops-metrics">${metrics.map(m => `<div title="${m.label}" aria-label="${m.label} ${m.value}">${icon(m.icon)}<b>${m.value}</b><small>${m.label}</small></div>`).join('')}</div>${top ? `<section class="ops-mvp">${this.art(top.k)}<div><small>MVP</small><h2>${TOWER_DEFS[top.k].name}</h2><p>${Math.round(top.damage).toLocaleString()} 피해 · ${top.kills} 처치</p></div>${icon('medal')}</section><div class="ops-damage-list">${units.slice(0, 5).map(u => `<div title="${TOWER_DEFS[u.k].name} #${u.id} · ${u.kills} 처치" aria-label="${TOWER_DEFS[u.k].name} #${u.id} · ${Math.round(u.damage)} 피해 · ${u.kills} 처치">${this.art(u.k)}<span><span>${TOWER_DEFS[u.k].name}</span><i style="--damage:${u.damage / top.damage * 100}%"></i></span><b>${Math.round(u.damage).toLocaleString()}</b></div>`).join('')}</div>` : `<div class="ops-empty">${icon('stats')}<p>첫 전투를 기다리고 있어요.</p></div>`}${v.stats.waves.length ? `<div class="ops-section-heading"><h2>최근 웨이브</h2><span>처치 / 기지 피해</span></div><div class="ops-wave-history">${v.stats.waves.slice(-10).map(w => `<span class="${w.lost ? 'has-loss' : ''}" title="${w.wave}웨이브 · ${w.kills} 처치 · 기지 피해 ${w.lost} · ${w.seconds.toFixed(1)}초"><b>${String(w.wave).padStart(2, '0')}</b><small>${w.kills} / ${w.lost}</small></span>`).join('')}</div>` : ''}`;
  }
  private codex(current: Faction): string {
    // 순서: 배우고(플레이 방법) → 내 병력을 알고(현재 종족 먼저, 도감 뒤에 비교표) → 적과 보스를 대비한다. 모든 항목은 접힌 채 연다.
    const order = [current, ...(Object.keys(FACTIONS) as Faction[]).filter(f => f !== current)];
    const enemies = (Object.keys(ENEMY_INFO) as EnemyKey[]).map(k => `<details class="ops-codex-entry"><summary>${icon(enemyIcons[k])}<b>${ENEMY_INFO[k].name}</b></summary><p>${ENEMY_INFO[k].desc}</p><small>체력 ${ENEMY_DEFS[k].hp} · 속도 ${ENEMY_DEFS[k].speed}</small></details>`).join('');
    const compare = (faction: Faction): string => {
      const rows = FACTION_TOWERS[faction].filter(k => k !== 'bunker').map(k => {
        const d = TOWER_DEFS[k], support = k === 'support' || k === 'observer', damage = attackDamage(k), dps = damage / d.rate;
        const effect = k === 'support' ? '주변 공격 속도 +20% (레벨당 +5%)' : k === 'observer' ? '적 약점 노출 · 받는 피해 +35%' : '';
        const cells = support ? ['—', d.range, '—', '—', '—'] : [damage, d.range, (1 / d.rate).toFixed(2), dps.toFixed(1), (dps / d.cost * 100).toFixed(1)];
        return `<tr data-tip="unit:${k}" tabindex="0" aria-label="${escape(`${d.name} · ${d.role}${effect ? ' · ' + effect : ''}`)}"><th scope="row"><span class="ops-compare-unit">${this.art(k)}<b>${d.name}</b></span></th><td>${d.cost}</td>${cells.map(c => `<td>${c}</td>`).join('')}<td class="ops-compare-skills">${SKILL_KEYS.filter(s => SKILL_DEFS[s].unit === k).map(s => `<img src="${commandIconUrl(s)}" width="24" height="24" alt="${escape(SKILL_DEFS[s].name)}" data-tip="skill:${s}">`).join('')}</td></tr>`;
      }).join('');
      return `<details id="ops-${faction}-compare" class="ops-disclosure"><summary>${icon(faction)}<b>${FACTIONS[faction].name} 병력 비교</b><small>Lv.1</small></summary><div class="ops-compare"><table><thead><tr><th scope="col"><span class="ops-sr">병력</span></th>${compareHead.map(([i, l], n) => `<th scope="col" class="${n === compareHead.length - 1 ? 'ops-compare-skills' : ''}" data-tip="stat:${n}" aria-label="${l}">${icon(i)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div></details>`;
    };
    return `<details id="ops-training" class="ops-disclosure"><summary>${icon('help')}<b>플레이 방법</b></summary><ol class="ops-training">${tutorialSteps.map((s, i) => `<li>${icon(tutorialIcons[i])}<span>${s}</span></li>`).join('')}</ol><div class="ops-hotkeys">${[['T / R', '종족'], ['1–9', '병력'], ['Space', '웨이브'], ['U', '강화'], ['Z / X', '스킬'], ['S', '회수'], ['B', '보급'], ['P', '정지']].map(([key, label]) => `<span><kbd>${key}</kbd>${label}</span>`).join('')}</div>${button('tutorial', '', `${icon('resume')}<span>훈련 다시 보기</span>`, '훈련 다시 보기', { className: 'ops-retrain' })}</details>
      ${order.map(faction => `<details id="ops-${faction}-codex" class="ops-disclosure"><summary>${icon(faction)}<b>${FACTIONS[faction].name} 병력</b><small>9</small></summary><div class="ops-unit-cards">${FACTION_TOWERS[faction].map(k => this.unitCard(k)).join('')}</div></details>` + compare(faction)).join('')}
      <details id="ops-enemy-codex" class="ops-disclosure"><summary>${icon('tactics')}<b>적 도감</b><small>${Object.keys(ENEMY_INFO).length}</small></summary><div class="ops-codex-grid">${enemies}</div></details>
      <details id="ops-boss-codex" class="ops-disclosure"><summary>${icon('boss')}<b>보스</b></summary><div class="ops-boss-list">${[10, 20, 30, 40, 50].map(w => `<p><b>${w}</b>${bossPattern(w)}</p>`).join('')}</div><p class="ops-danger">보스가 기지에 도달하면 즉시 패배합니다.</p></details>`;
  }
  private medals(v: OperationsView): string {
    const earned = v.profile.achievements;
    return `<div class="ops-personal-best"><span>${icon('flag')}<b>${v.profile.bestWave}</b><small>최고 웨이브</small></span><span>${icon('medal')}<b>${v.profile.wins}</b><small>승리</small></span></div><div class="ops-medals">${Object.entries(ACHIEVEMENTS).map(([k, d]) => `<div class="ops-medal ${earned.includes(k) ? 'is-earned' : ''}" title="${d.name} · ${d.desc}${d.skin ? ' · ' + (d.skin === 'gold' ? '황금' : '이온') + ' 외형 해금' : ''}">${icon(earned.includes(k) ? 'medal' : 'lock')}<b>${d.name}</b><small>${d.desc}</small></div>`).join('')}</div><div class="ops-section-heading"><h2>부대 외형</h2><span>능력치는 그대로</span></div><div class="ops-skins" role="group" aria-label="부대 외형">${(['standard', 'gold', 'ion'] as Profile['skin'][]).map((k, i) => button('skin', k, `${this.art(v.faction === 'terran' ? 'marine' : 'zealot')}<span>${['기본', '황금', '이온'][i]}</span>${k !== 'standard' && !earned.includes(k === 'gold' ? 'victory' : 'flawless') ? icon('lock') : ''}`, ['기본 외형', '황금 외형', '이온 외형'][i], { disabled: k !== 'standard' && !earned.includes(k === 'gold' ? 'victory' : 'flawless'), selected: v.profile.skin === k, className: `ops-skin-${k}`, hint: k === 'standard' ? '기본 외형' : `${k === 'gold' ? '50웨이브 승리' : '기지 피해 없이 50웨이브 승리'} 시 해금` })).join('')}</div>`;
  }
}

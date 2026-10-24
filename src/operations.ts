import { ENEMY_DEFS, GAME_W, MAP_DEFS, MAP_Y, MAX_WAVE, TOWER_DEFS, TOWER_KEYS, TowerKey, W } from './config';
import { SKILL_DEFS } from './catalog';
import { unitImageUrl } from './unitArt';
import { ACHIEVEMENTS, allowedUnit, bossPattern, BRANCHES, COMMANDERS, CommanderKey, DIFFICULTIES, ENEMY_INFO, MODES, Profile, REWARDS, RewardKey, RunOptions, RunSave, RunStats, SavedUnit, TARGETS, TargetMode, wavePlan } from './campaign';
import './operations.css';

export interface OperationsView {
  options: RunOptions; wave: number; gold: number; lives: number; active: boolean; over: boolean; paused: boolean;
  selected?: SavedUnit; units: SavedUnit[]; stats: RunStats; profile: Profile;
  commander: Record<CommanderKey, number>; pending: RewardKey[]; checkpoint: RunSave | null;
  tutorial: number; notice: string; test: boolean;
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
  choose(key: TowerKey): void;
  commander(key: CommanderKey): void;
  reward(key: RewardKey): void;
  skin(key: Profile['skin']): void;
  volume(value: number): void;
  tutorial(skip: boolean): void;
  save(): void;
}
const button = (action: string, key: string, label: string, disabled = false, selected = false, accessible = ''): string =>
  `<button type="button" data-action="${action}" data-key="${key}" ${accessible ? `aria-label="${accessible}"` : ''} ${disabled ? 'disabled' : ''} ${selected ? 'aria-pressed="true" class="selected"' : ''}>${label}</button>`;
const tutorialSteps = ['보급 상점(B) 또는 유닛 명령에서 병력을 고르고, 길 옆 빈 칸에 배치하세요. 터치는 같은 칸을 두 번 탭합니다.', '배치한 유닛을 선택하고 강화(U)를 한 번 적용하세요.', '유닛 전용 자동 스킬(Z/X)을 하나 장착하세요. 적이 사거리 안에 들어오면 자동으로 발동합니다.', '벙커를 배치하고 빈 사격구에 마린 또는 파이어뱃을 구매하세요. 벙커는 보병 4기를 수용하며 사거리를 늘립니다.'];

export class OperationsCenter {
  private ribbon = document.createElement('div');
  private dialog = document.createElement('dialog');
  private section = 'setup';
  private cache = '';
  private images = new Map(TOWER_KEYS.map(k => [k, unitImageUrl(k)]));
  private onResize = () => this.position();
  constructor(private actions: OperationsActions) {
    this.ribbon.className = 'mission-ribbon'; this.ribbon.setAttribute('aria-label', '전술 상황판');
    this.dialog.className = 'operations-center'; this.dialog.setAttribute('aria-label', '작전실');
    document.body.append(this.ribbon, this.dialog);
    for (const el of [this.ribbon, this.dialog]) {
      for (const type of ['pointerdown', 'pointerup', 'pointermove', 'mousedown', 'mouseup', 'touchstart', 'touchend', 'wheel']) el.addEventListener(type, e => e.stopPropagation(), { passive: true });
      el.addEventListener('click', e => this.click(e));
      if (el === this.dialog) el.addEventListener('keydown', e => { if (!this.open) return; e.stopPropagation(); if ((e as KeyboardEvent).key.toLowerCase() === 'o') this.close(); });
    }
    this.dialog.addEventListener('cancel', e => { e.preventDefault(); this.close(); });
    this.dialog.addEventListener('input', e => {
      if ((e.target as HTMLElement).id === 'battle-volume') {
        this.actions.volume(Number((e.target as HTMLInputElement).value) / 100);
        const output = this.dialog.querySelector('output'); if (output) output.textContent = (e.target as HTMLInputElement).value + '%';
      }
    });
    window.addEventListener('resize', this.onResize);
    this.update();
  }
  get open(): boolean { return this.dialog.open; }
  show(section = 'tactics'): void {
    this.section = this.actions.view().pending.length ? 'reward' : section;
    this.actions.pause(true); this.render(); if (!this.dialog.open) this.dialog.showModal();
  }
  close(): void {
    if (this.actions.view().pending.length) { this.section = 'reward'; this.render(); return; }
    this.dialog.close(); this.actions.pause(false);
    const canvas = document.querySelector('canvas'); canvas?.setAttribute('tabindex', '0'); canvas?.focus({ preventScroll: true });
  }
  destroy(): void { window.removeEventListener('resize', this.onResize); this.ribbon.remove(); this.dialog.remove(); }
  update(): void {
    const v = this.actions.view(), next = v.test ? MAX_WAVE : v.wave + 1;
    const plan = wavePlan(next), counts = this.counts(plan);
    const forecast = v.over ? '작전 종료 · 통계와 업적 확인' : v.active ? `교전 ${v.wave} · 기지 ${v.lives}/20` : `다음 ${next} · ${counts}`;
    const tutorial = !v.profile.tutorialDone && v.tutorial < 4 && !v.test && !v.active && !v.over ? `<div class="field-tutorial"><span><b>훈련 ${v.tutorial + 1}/4</b><span class="training-detail"> · ${tutorialSteps[v.tutorial]}</span></span>${button('open', 'codex', '도움말')}${button('skip', '', '훈련 건너뛰기')}</div>` : '';
    const html = `<div class="mission-strip"><span class="mission-forecast" title="${forecast}">${forecast}</span>${button('open', 'tactics', '<span class="wide-label">작전실 [O]</span><span class="short-label">작전실</span>', false, false, '작전실 [O]')}${(['strike', 'slow', 'supply'] as CommanderKey[]).map(k => {
      const cooldown = v.commander[k] > 0 ? ` ${Math.ceil(v.commander[k])}초` : '';
      const label = COMMANDERS[k].name + cooldown;
      return button('commander', k, `<span class="wide-label">${label}</span><span class="short-label">${({ strike: '폭격', slow: '감속', supply: '보급' })[k]}${cooldown}</span>`, v.over || v.paused || !v.active || v.commander[k] > 0 || v.options.mode === 'budget' && k === 'supply', false, label);
    }).join('')}</div>${tutorial}`;
    if (html !== this.cache) { this.ribbon.innerHTML = html; this.cache = html; }
    this.position();
  }
  private position(): void {
    const canvas = document.querySelector('canvas'); if (!canvas) return;
    const r = canvas.getBoundingClientRect(), scale = r.width / GAME_W;
    Object.assign(this.ribbon.style, { left: `${r.left + 8 * scale}px`, top: `${r.top + (MAP_Y + 6) * scale}px`, width: `${(W - 112) * scale}px` });
    this.ribbon.classList.toggle('compact', W * scale < 650);
  }
  private counts(plan: (keyof typeof ENEMY_DEFS)[]): string {
    return Object.keys(ENEMY_DEFS).filter(k => plan.includes(k as keyof typeof ENEMY_DEFS)).map(k => `${ENEMY_INFO[k as keyof typeof ENEMY_DEFS].name} ${plan.filter(x => x === k).length}`).join(' · ');
  }
  private click(e: Event): void {
    const el = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]'); if (!el || el.disabled) return;
    const a = el.dataset.action!, key = el.dataset.key!;
    if (a === 'open') { this.show(key); return; }
    if (a === 'close') { this.close(); return; }
    if (a === 'tab') this.section = key;
    if (a === 'commander') { this.actions.commander(key as CommanderKey); this.update(); return; }
    if (a === 'start') {
      const get = (id: string) => this.dialog.querySelector<HTMLSelectElement>('#' + id)!.value;
      this.actions.start({ map: get('run-map'), difficulty: get('run-difficulty'), mode: get('run-mode') } as RunOptions); return;
    }
    if (a === 'resume') { this.actions.resume(); return; }
    if (a === 'target') this.actions.target(key as TargetMode);
    if (a === 'branch') this.actions.branch(key as keyof typeof BRANCHES);
    if (a === 'select') { this.actions.select(key); }
    if (a === 'move') { if (this.actions.move()) { this.close(); return; } }
    if (a === 'choose') { this.actions.choose(key as TowerKey); this.close(); return; }
    if (a === 'reward') { this.actions.reward(key as RewardKey); this.close(); return; }
    if (a === 'skin') this.actions.skin(key as Profile['skin']);
    if (a === 'tutorial') this.actions.tutorial(false);
    if (a === 'skip') { this.actions.tutorial(true); this.update(); if (!this.open) return; }
    if (a === 'save') this.actions.save();
    const scroll = this.dialog.querySelector('.ops-content')?.scrollTop ?? 0;
    this.render();
    const content = this.dialog.querySelector('.ops-content'); if (content) content.scrollTop = scroll;
    this.dialog.querySelector<HTMLButtonElement>(`button[data-action="${a}"][data-key="${key}"]`)?.focus({ preventScroll: true });
  }
  private render(): void {
    const v = this.actions.view(), selected = v.selected;
    const tabs = { setup: '작전 설정', tactics: '전술 / 병력', stats: '전투 통계', codex: '도감 / 훈련', medals: '업적 / 외형' };
    const next = v.test ? MAX_WAVE : v.wave + 1;
    this.dialog.innerHTML = `<header><div><small>FRONTIER / COMMAND CENTER</small><h1>${this.section === 'reward' ? '전장 보상 선택' : '작전실'}</h1><p>${MAP_DEFS[v.options.map].name} · ${DIFFICULTIES[v.options.difficulty].name} · ${MODES[v.options.mode].name} · WAVE ${v.wave} · ◆ ${v.gold}</p></div>${v.pending.length ? '' : button('close', '', '전장 복귀')}</header>
      ${v.pending.length ? '' : `<nav aria-label="작전실 메뉴">${Object.entries(tabs).map(([key, label]) => button('tab', key, label, false, this.section === key)).join('')}</nav>`}
      <main class="ops-content">${v.notice ? `<p class="ops-notice" role="status">${v.notice}</p>` : ''}${this.section === 'reward' ? this.rewards(v) : this.section === 'setup' ? this.setup(v) : this.section === 'tactics' ? this.tactics(v, selected, next) : this.section === 'stats' ? this.stats(v) : this.section === 'codex' ? this.codex(v) : this.medals(v)}</main>
      <footer>작전실을 열면 전투가 일시정지됩니다. · 준비 시간 자동 저장${v.test ? ' · TEST: 저장/업적 제외' : ''}</footer>`;
  }
  private setup(v: OperationsView): string {
    const select = (id: string, label: string, defs: Record<string, { name: string; desc?: string }>, value: string) => `<label>${label}<select id="${id}">${Object.entries(defs).map(([k, d]) => `<option value="${k}" ${k === value ? 'selected' : ''}>${d.name}${d.desc ? ' — ' + d.desc : ''}</option>`).join('')}</select></label>`;
    return `<section class="ops-setup"><div><h2>새 방어 작전</h2><p>전장과 작전 조건을 선택하세요. 새 작전을 시작하면 이전 체크포인트가 교체됩니다.</p>${select('run-map', '전장', MAP_DEFS, v.options.map)}${select('run-difficulty', '난이도', DIFFICULTIES, v.options.difficulty)}${select('run-mode', '작전 모드', MODES, v.options.mode)}${button('start', '', '새 작전 시작')}</div><div><h2>체크포인트</h2>${v.checkpoint ? `<p>${MAP_DEFS[v.checkpoint.options.map].name} · ${DIFFICULTIES[v.checkpoint.options.difficulty].name} · ${MODES[v.checkpoint.options.mode].name}</p><p>${v.checkpoint.wave}웨이브 완료 · 기지 ${v.checkpoint.lives}/20 · 병력 ${v.checkpoint.units.length}기</p>${button('resume', '', '저장된 작전 이어하기')}` : '<p>저장된 작전이 없습니다.</p>'}<p>웨이브 종료 시 자동 저장합니다. 교전 중 새로고침하면 마지막 준비 시점으로 돌아갑니다.</p>${button('save', '', '현재 준비 상태 저장', v.active || v.over || v.test)}<label>효과음 음량 <output>${Math.round(v.profile.volume * 100)}%</output><input id="battle-volume" aria-label="효과음 음량" type="range" min="0" max="100" value="${Math.round(v.profile.volume * 100)}"></label></div></section>`;
  }
  private tactics(v: OperationsView, u: SavedUnit | undefined, next: number): string {
    const branchCost = u ? TOWER_DEFS[u.k].cost : 0;
    return `<section class="ops-forecast"><h2>${v.over ? '작전 종료' : v.active ? '다음 교전 준비' : '다음 웨이브 ' + next}</h2><p>${this.counts(wavePlan(next))}</p>${next % 10 === 0 ? `<p class="danger">⚠ ${bossPattern(next)} · 보스를 놓치면 즉시 패배합니다.</p>` : ''}</section>
      <h2>병력 전술</h2><div class="ops-roster">${v.units.map(t => button('select', t.id, `${TOWER_DEFS[t.k].name} #${t.id} · Lv.${t.lvl}${t.hostId ? ' · 주둔' : ''}`, false, t.id === u?.id)).join('') || '<p>먼저 병력을 배치하세요.</p>'}</div>
      ${u ? `<section class="ops-unit"><img src="${this.images.get(u.k)}" alt=""><div><h3>${TOWER_DEFS[u.k].name} #${u.id}</h3><p>${TOWER_DEFS[u.k].desc}</p>${u.k !== 'bunker' ? `<div class="ops-buttons" aria-label="공격 대상 우선순위">${Object.entries(TARGETS).map(([k, label]) => button('target', k, label + ' 우선', v.over, u.target === k)).join('')}</div><p>Lv.3 특화 · ◆ ${branchCost} · 선택 후 변경 불가</p><div class="ops-cards">${Object.entries(BRANCHES).map(([k, d]) => `<article><h3>${d.name}</h3><p>${d.desc}</p>${button('branch', k, u.branch === k ? '선택 완료' : d.name + ' 선택', v.over || u.lvl !== 3 || !!u.branch || v.gold < branchCost, u.branch === k)}</article>`).join('')}</div>` : ''}${button('move', '', '선택 병력 재배치 · ◆ 20', v.over || v.active || !!u.hostId || v.gold < 20)}<p>준비 시간에 빈 칸을 지정하면 이동합니다. 빈 칸 선택 전까지 비용은 차감되지 않습니다.</p></div></section>` : ''}
      <h2>지원 병력 보급</h2><div class="ops-cards">${(['support', 'observer'] as TowerKey[]).map(k => `<article><img class="ops-art" src="${this.images.get(k)}" alt=""><h3>${TOWER_DEFS[k].name}</h3><p>${TOWER_DEFS[k].desc}</p>${button('choose', k, `배치 · ◆ ${TOWER_DEFS[k].cost}`, v.over || !allowedUnit(k, v.options.mode) || v.gold < TOWER_DEFS[k].cost)}</article>`).join('')}</div>
      <h2>지휘관 지원</h2><div class="ops-cards">${Object.entries(COMMANDERS).map(([k, d]) => `<article><h3>${d.name}</h3><p>${d.desc}</p><p>재사용 ${d.cooldown}초 · ${v.commander[k as CommanderKey] > 0 ? '남은 ' + Math.ceil(v.commander[k as CommanderKey]) + '초' : '준비 완료'}</p><p>전장 상단 버튼으로 교전 중 사용하세요.</p></article>`).join('')}</div>`;
  }
  private rewards(v: OperationsView): string {
    return `<p>${v.wave}웨이브를 방어했습니다. 보상 하나를 선택하면 다음 웨이브를 준비할 수 있습니다. 화력·장전·센서는 누적됩니다.</p><div class="ops-cards">${v.pending.map(k => `<article><small>FIELD REWARD</small><h2>${REWARDS[k].name}</h2><p>${REWARDS[k].desc}</p>${button('reward', k, REWARDS[k].name + ' 획득')}</article>`).join('')}</div>`;
  }
  private stats(v: OperationsView): string {
    const units = [...v.stats.units].sort((a, b) => b.damage - a.damage), top = units[0];
    return `<div class="ops-metrics"><div><small>누적 피해</small><b>${Math.round(v.stats.damage).toLocaleString()}</b></div><div><small>처치</small><b>${v.stats.kills}</b></div><div><small>기지 피해</small><b>${v.stats.lost}</b></div><div><small>교전 시간</small><b>${Math.floor(v.stats.seconds / 60)}분 ${Math.floor(v.stats.seconds % 60)}초</b></div></div><p>MVP: ${top && top.damage > 0 ? `${TOWER_DEFS[top.k].name} #${top.id}` : '교전 기록 없음'} · 지휘관 피해 ${Math.round(v.stats.commanderDamage).toLocaleString()}</p><h2>병력별 전과</h2><div class="ops-table"><table><thead><tr><th>병력</th><th>누적 피해</th><th>처치</th></tr></thead><tbody>${units.map(u => `<tr><td>${TOWER_DEFS[u.k].name} #${u.id}${v.units.some(t => t.id === u.id) ? '' : ' (회수)'}</td><td>${Math.round(u.damage).toLocaleString()}</td><td>${u.kills}</td></tr>`).join('')}</tbody></table></div><h2>웨이브 기록</h2><div class="ops-table"><table><thead><tr><th>웨이브</th><th>처치</th><th>기지 피해</th><th>시간</th></tr></thead><tbody>${[...v.stats.waves].reverse().map(w => `<tr><td>${w.wave}</td><td>${w.kills}</td><td>${w.lost}</td><td>${w.seconds.toFixed(1)}초</td></tr>`).join('')}</tbody></table></div>`;
  }
  private codex(v: OperationsView): string {
    return `<h2>지휘관 훈련</h2><ol>${tutorialSteps.map((s, i) => `<li>${i < v.tutorial || v.profile.tutorialDone ? '✓ ' : ''}${s}</li>`).join('')}</ol>${button('tutorial', '', '훈련 다시 보기')}<p>Space 웨이브 시작 · P 정지 · B 보급 · O 작전실 · U 강화 · Z/X 스킬 · S 회수 · Esc 명령 취소. 모바일은 명령 아이콘과 상단 버튼을 사용하세요.</p><h2>적 도감</h2><div class="ops-cards">${Object.entries(ENEMY_INFO).map(([k, d]) => `<article><h3>${d.name}</h3><p>${d.desc}</p><small>기본 체력 ${ENEMY_DEFS[k as keyof typeof ENEMY_DEFS].hp} · 속도 ${ENEMY_DEFS[k as keyof typeof ENEMY_DEFS].speed}</small></article>`).join('')}</div><h2>보스 전술</h2><ul>${[10, 20, 30, 40, 50].map(w => `<li>${w}웨이브: ${bossPattern(w)}</li>`).join('')}</ul><h2>병력 / 자동 스킬</h2><div class="ops-cards">${TOWER_KEYS.map(k => `<article><img class="ops-art" src="${this.images.get(k)}" alt=""><h3>${TOWER_DEFS[k].name}</h3><p>${TOWER_DEFS[k].desc}</p>${Object.values(SKILL_DEFS).filter(s => s.unit === k).map(s => `<p><b>${s.name}</b> · ${s.desc}</p>`).join('')}</article>`).join('')}</div><p>지원 효과는 같은 종류끼리 중첩되지 않습니다. 보호막은 체력 위 파란 막대로 표시됩니다.</p>`;
  }
  private medals(v: OperationsView): string {
    return `<p>최고 기록 ${v.profile.bestWave}웨이브 · 승리 ${v.profile.wins}회 · 외형은 전투 수치에 영향을 주지 않습니다.</p><div class="ops-cards">${Object.entries(ACHIEVEMENTS).map(([k, d]) => `<article class="${v.profile.achievements.includes(k) ? 'earned' : ''}"><small>${v.profile.achievements.includes(k) ? '✓ 달성' : '미달성'}</small><h3>${d.name}</h3><p>${d.desc}</p>${d.skin ? `<p>보상: ${d.skin === 'gold' ? '황금 부대 / 기지' : '이온 부대 / 기지'} 외형</p>` : ''}</article>`).join('')}</div><h2>부대 / 기지 외형</h2><div class="ops-buttons">${button('skin', 'standard', '기본 외형', false, v.profile.skin === 'standard')}${button('skin', 'gold', '황금 외형', !v.profile.achievements.includes('victory'), v.profile.skin === 'gold')}${button('skin', 'ion', '이온 외형', !v.profile.achievements.includes('flawless'), v.profile.skin === 'ion')}</div>`;
  }
}

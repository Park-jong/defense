import { TOWER_DEFS, TOWER_KEYS, TowerKey } from './config';
import { EquippedSkill, SKILL_DEFS, SKILL_KEYS, SKILL_SLOTS, SkillKey } from './catalog';
import { unitImageUrl } from './unitArt';
import { commandIconUrl } from './commandIcons';
import { BUNKER_CAPACITY, BUNKER_INFANTRY, BUNKER_RANGE_BONUS, InfantryKey, isInfantry } from './bunker';
import { MAX_UNIT_LEVEL, OrderResult, planOrder, UnitOrder, UnitScope, unitUpgradeCost } from './management';
import { allowedUnit, RunOptions } from './campaign';
import './shop.css';

export interface ShopUnit {
  id: string; k: TowerKey; lvl: number; skills: EquippedSkill[]; c: number; r: number;
  hostId?: string; passengers: (string | null)[];
}
export interface ShopState { gold: number; units: ShopUnit[]; selectedId: string | null; mode?: RunOptions['mode'] }
interface ShopActions {
  state(): ShopState;
  select(id: string): void;
  choose(key: TowerKey): void;
  equip(key: SkillKey, id?: string): boolean;
  upgrade(id: string): boolean;
  order(order: UnitOrder, scope: UnitScope): OrderResult;
  recruit(id: string, slot: number, key: InfantryKey): boolean;
  board(id: string, slot: number, unitId: string): boolean;
  unload(id: string): boolean;
  close(): void;
}

export class SupplyShop {
  private dialog: HTMLDialogElement;
  private tab: 'units' | 'skills' | 'garrison' | 'manage' = 'units';
  private faction = 'all';
  private notice = '';
  private boarding: { bunkerId: string; slot: number } | null = null;
  private images = new Map(TOWER_KEYS.map(k => [k, unitImageUrl(k)]));

  constructor(private actions: ShopActions) {
    this.dialog = document.createElement('dialog');
    this.dialog.className = 'supply-shop';
    this.dialog.setAttribute('aria-label', '보급 상점');
    document.body.append(this.dialog);
    // Phaser also listens on window; modal pointer events must stay inside the shop.
    for (const type of ['pointerdown', 'pointerup', 'pointermove', 'pointercancel', 'mousedown', 'mouseup', 'mousemove', 'touchstart', 'touchmove', 'touchend', 'touchcancel', 'wheel']) {
      this.dialog.addEventListener(type, e => e.stopPropagation(), { passive: true });
    }
    this.dialog.addEventListener('cancel', e => { e.preventDefault(); this.close(); });
    this.dialog.addEventListener('keydown', e => {
      if (!this.dialog.open) return;
      e.stopPropagation();
      if (e.key === 'Escape' || e.key.toLowerCase() === 'b') { e.preventDefault(); this.close(); }
    });
    this.dialog.addEventListener('click', e => {
      e.stopPropagation();
      const button = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]');
      if (!button || button.disabled) return;
      const { action, key } = button.dataset;
      if (action === 'close') { this.close(); return; }
      if (action === 'tab') { this.tab = key as typeof this.tab; this.notice = ''; }
      if (action === 'filter') this.faction = key!;
      if (action === 'select') { this.actions.select(key!); this.notice = ''; this.boarding = null; }
      if (action === 'select-slot') {
        this.actions.select(key!); this.boarding = { bunkerId: key!, slot: Number(button.dataset.slot) }; this.notice = '';
      }
      if (action === 'choose') { this.actions.choose(key as TowerKey); this.close(); return; }
      if (action === 'upgrade') {
        this.notice = this.actions.upgrade(key!) ? '병력을 한 단계 강화했습니다. 탑승 상태와 스킬은 유지됩니다.' : '강화 단계와 보유 미네랄을 확인해 주세요.';
      }
      if (action === 'batch-upgrade' || action === 'batch-equip') {
        const order: UnitOrder = action === 'batch-upgrade' ? { type: 'upgrade' } : { type: 'skill', key: key as SkillKey };
        const result = this.actions.order(order, { bunkerId: button.dataset.bunker || undefined, kind: (button.dataset.kind || undefined) as TowerKey | undefined });
        this.notice = result.count ? `${result.count}기 ${order.type === 'upgrade' ? '각 1단계 강화' : SKILL_DEFS[order.key].name + ' 장착'} 완료 · ${result.cost} 미네랄 사용`
          : '대상 병력과 총비용을 확인해 주세요. 미네랄이 부족하면 전체 적용이 보류됩니다.';
      }
      if (action === 'recruit') {
        this.notice = this.actions.recruit(key!, Number(button.dataset.slot), button.dataset.unit as InfantryKey)
          ? '병력이 탑승했습니다. 전장에 복귀하면 자동으로 공격합니다.' : '빈 슬롯과 보유 미네랄을 확인해 주세요.';
      }
      if (action === 'board') {
        const unit = button.dataset.unit;
        this.notice = unit && this.actions.board(key!, Number(button.dataset.slot), unit)
          ? '병력을 옮겼습니다. 강화와 스킬은 그대로 유지됩니다.' : '탑승할 보병과 빈 슬롯을 확인해 주세요.';
      }
      if (action === 'unload') {
        if (this.actions.unload(key!)) { this.close(); return; }
        this.notice = '하차할 병력을 찾을 수 없습니다.';
      }
      if (action === 'equip' || action === 'equip-unit') {
        const skill = key as SkillKey;
        this.notice = this.actions.equip(skill, action === 'equip-unit' ? button.dataset.unit : undefined) ? `${SKILL_DEFS[skill].name} 장착 완료. 적을 만나면 자동으로 사용합니다.` : '장착할 유닛과 보유 미네랄을 확인해 주세요.';
      }
      this.render(['equip', 'equip-unit', 'upgrade', 'batch-upgrade', 'batch-equip', 'filter', 'recruit', 'board', 'select-slot'].includes(action!) || action === 'select' && this.tab === 'garrison');
      const next = this.dialog.querySelector<HTMLButtonElement>(`button[data-action="${action}"][data-key="${key}"]${button.dataset.slot !== undefined ? `[data-slot="${button.dataset.slot}"]` : ''}${button.dataset.unit ? `[data-unit="${button.dataset.unit}"]` : ''}`);
      if (next && !next.disabled) next.focus({ preventScroll: true });
      else if (this.tab === 'garrison') {
        const portrait = this.dialog.querySelector<HTMLButtonElement>(`.garrison-portrait[data-key="${button.dataset.unit ?? key}"]`)
          ?? this.dialog.querySelector<HTMLButtonElement>('.garrison-portrait.is-active')
          ?? this.dialog.querySelector<HTMLButtonElement>('.garrison-portrait');
        portrait?.focus({ preventScroll: true });
      }
    });
  }

  open(tab: 'units' | 'skills' | 'garrison' | 'manage' = 'units'): void {
    this.tab = tab; this.notice = ''; this.boarding = null; this.render();
    if (!this.dialog.open) this.dialog.showModal();
  }
  close(): void {
    const wasOpen = this.dialog.open;
    if (wasOpen) this.dialog.close(); this.actions.close();
    if (wasOpen) { const canvas = document.querySelector('canvas'); canvas?.setAttribute('tabindex', '0'); canvas?.focus({ preventScroll: true }); }
  }
  destroy(): void { this.close(); this.dialog.remove(); }

  private render(preserveScroll = false): void {
    const scrollTop = preserveScroll ? this.dialog.querySelector<HTMLElement>('.shop-content')?.scrollTop ?? 0 : 0;
    const strips = ['.garrison-bunkers', '.garrison-available'].map(selector => ({ selector,
      left: preserveScroll ? this.dialog.querySelector<HTMLElement>(selector)?.scrollLeft ?? 0 : 0 }));
    const state = this.actions.state();
    const selected = state.units.find(u => u.id === state.selectedId);
    const combatUnits = state.units.filter(u => u.k !== 'bunker');
    const unitCount = (k: TowerKey) => state.units.filter(u => u.k === k).length;
    const button = (action: string, key: string, label: string, active = false) =>
      `<button type="button" data-action="${action}" data-key="${key}" class="${active ? 'is-active' : ''}" aria-pressed="${active}">${label}</button>`;
    const roster = this.tab === 'skills' ? `<section class="shop-roster" aria-label="스킬을 장착할 유닛">
      <span>장착 대상</span>${combatUnits.length ? combatUnits.map(u => button('select', u.id,
        `${TOWER_DEFS[u.k].name} <small>Lv.${u.lvl} · ${u.hostId ? `벙커 #${u.hostId} 탑승` : `구역 ${u.c + 1}-${u.r + 1}`} · ${u.skills.length}/${SKILL_SLOTS}</small>`, u.id === state.selectedId)).join('') : '<p>먼저 유닛을 배치하거나 벙커에 병력을 구매하세요.</p>'}
      </section>` : '';
    const cards = this.tab === 'units' ? TOWER_KEYS.filter(k => allowedUnit(k, state.mode ?? 'standard') && (this.faction === 'all' || TOWER_DEFS[k].faction === this.faction)).map(k => {
      const d = TOWER_DEFS[k];
      return `<article class="shop-card unit-card ${d.faction}">
        <div class="shop-card-top"><span>${d.faction === 'terran' ? 'TERRAN' : 'PROTOSS'} / ${d.role}</span><b>◆ ${d.cost}</b></div>
        <div class="shop-unit-art"><img src="${this.images.get(k)}" alt="${d.name}" width="112" height="112"><span>${String(TOWER_KEYS.indexOf(k) + 1).padStart(2, '0')}</span></div>
        <h3>${d.name}</h3><p>${d.desc}</p>
        <div class="shop-unit-skills">${k === 'bunker' ? '<span>마린 · 파이어뱃 탑승</span><span>병력 스킬 자동 발동</span>' : SKILL_KEYS.filter(skill => SKILL_DEFS[skill].unit === k).map(skill => `<span>${SKILL_DEFS[skill].icon} ${SKILL_DEFS[skill].name}</span>`).join('')}</div>
        <dl class="shop-stats">${k === 'bunker' ? `<div><dt>탑승 인원</dt><dd>${BUNKER_CAPACITY}</dd></div><div><dt>사거리 보너스</dt><dd>+${BUNKER_RANGE_BONUS}</dd></div><div><dt>빈 벙커</dt><dd>대기</dd></div>` : k === 'support' || k === 'observer' ? `<div><dt>지원 반경</dt><dd>${d.range}</dd></div><div><dt>${k === 'support' ? '공격 속도' : '받는 피해'}</dt><dd>+${k === 'support' ? 20 : 35}%</dd></div><div><dt>직접 공격</dt><dd>없음</dd></div>` : `<div><dt>공격력</dt><dd>${d.dmg}</dd></div><div><dt>사거리</dt><dd>${d.range}</dd></div><div><dt>초당 공격</dt><dd>${(1 / d.rate).toFixed(1)}</dd></div>`}</dl>
        <div class="shop-card-note">${k === 'bunker' ? '건설 후 병력 관리' : ['support', 'observer'].includes(k) ? '자동 지원 · 강화 가능' : '전용 스킬 2종'} <span>보유 ${unitCount(k)}기</span></div>
        <button type="button" class="shop-purchase" data-action="choose" data-key="${k}" ${state.gold < d.cost ? 'disabled' : ''}>${state.gold < d.cost ? `미네랄 ${d.cost - state.gold} 부족` : `구매 · 배치  ◆ ${d.cost}`}</button>
      </article>`;
    }).join('') : SKILL_KEYS.filter(k => !selected || selected.k === 'bunker' || SKILL_DEFS[k].unit === selected.k).map(k => {
      const d = SKILL_DEFS[k], owned = selected?.skills.some(s => s.key === k);
      const full = !!selected && selected.skills.length >= SKILL_SLOTS;
      const canBuy = !!selected && selected.k === d.unit && !owned && !full && state.gold >= d.cost;
      const label = owned ? '✓ 장착됨 · 자동 사용' : !selected || selected.k === 'bunker' ? '장착할 병력을 선택하세요' : full ? '스킬 슬롯이 가득 찼습니다' : state.gold < d.cost ? `미네랄 ${d.cost - state.gold} 부족` : `스킬 장착  ◆ ${d.cost}`;
      return `<article class="shop-card skill-card ${owned ? 'is-equipped' : ''}">
        <div class="shop-card-top"><span>${TOWER_DEFS[d.unit].name} 전용</span><b>◆ ${d.cost}</b></div>
        <div class="shop-skill-art" style="--skill-color:#${d.color.toString(16).padStart(6, '0')}"><span>${d.icon}</span><small>AUTO CAST</small></div>
        <h3>${d.name}</h3><p>${d.desc}</p>
        <div class="shop-skill-meta"><span>↻ 재사용 ${d.cooldown}초</span><span>자동 발동</span></div>
        <div class="shop-card-note">${owned ? '이 유닛에 적용 중' : '개별 유닛에 영구 장착'}<span>${owned ? 'ONLINE' : 'MODULE'}</span></div>
        <button type="button" class="shop-purchase" data-action="equip" data-key="${k}" ${canBuy ? '' : 'disabled'}>${label}</button>
      </article>`;
    }).join('');
    this.dialog.innerHTML = `
      <header class="shop-header"><div><span class="shop-eyebrow">FRONTIER / SUPPLY TERMINAL</span><h2>보급 상점 <small>전투 일시정지</small></h2></div><div class="shop-wallet"><span>보유 미네랄</span><strong>◆ ${state.gold.toLocaleString()}</strong></div><button type="button" class="shop-close" data-action="close" aria-label="상점 닫기">×</button></header>
      <nav class="shop-tabs" aria-label="상점 메뉴">${button('tab', 'units', `유닛 보급 <small>${TOWER_KEYS.length}</small>`, this.tab === 'units')}${button('tab', 'skills', `자동 스킬 <small>${SKILL_KEYS.length}</small>`, this.tab === 'skills')}${button('tab', 'garrison', '벙커 주둔 <small>4칸</small>', this.tab === 'garrison')}${button('tab', 'manage', '일괄 관리', this.tab === 'manage')}<span>보급 · 강화 · 자동 스킬</span></nav>
      <div class="shop-content">
        ${this.tab === 'manage' ? `<p class="shop-notice" role="status">${this.notice || '전장과 모든 벙커의 병력을 함께 관리합니다. 유닛 종류별로도 강화·스킬을 적용할 수 있습니다.'}</p>${this.batchControls(state, {}, '전체 부대 일괄 관리')}` : this.tab === 'garrison' ? this.garrisonView(state) : this.tab === 'units' ? `<div class="shop-filter">${button('filter', 'all', '전체 유닛', this.faction === 'all')}${button('filter', 'terran', '테란', this.faction === 'terran')}${button('filter', 'protoss', '프로토스', this.faction === 'protoss')}<span>미네랄은 전장에 배치할 때 차감됩니다.</span></div>` : `${roster}<div class="shop-skill-context">${selected && selected.k !== 'bunker' ? `<img src="${this.images.get(selected.k)}" alt="" width="54" height="54"><div><b>${TOWER_DEFS[selected.k].name} <span>Lv.${selected.lvl}${selected.hostId ? ' · 벙커 탑승' : ''}</span></b><p>장착 ${selected.skills.length}/${SKILL_SLOTS} · 스킬은 적이 사거리 안에 있을 때 자동 사용</p></div>${this.upgradeButton(selected, state.gold)}` : '<div><b>병력을 선택하면 전용 스킬을 구매할 수 있습니다.</b><p>벙커에 탑승한 병력도 스킬을 각각 장착합니다.</p></div>'}</div>`}
        ${this.tab === 'skills' ? `<p class="shop-notice ${this.notice ? 'is-success' : ''}" role="status">${this.notice ? '✓ ' + this.notice : '전용 스킬을 장착하면 적 탐지와 재사용 대기시간에 따라 자동으로 발동합니다.'}</p>` : ''}
        ${this.tab === 'units' || this.tab === 'skills' ? `<div class="shop-grid ${this.tab === 'skills' && selected && selected.k !== 'bunker' ? 'focused-skills' : ''}">${cards}</div>` : ''}
      </div>
      <footer class="shop-footer"><span>${this.tab === 'garrison' ? '강화·스킬 아이콘을 누르면 즉시 적용 · 체크 표시는 장착 완료 · 스킬은 자동 사용' : '유닛당 스킬 2개 · 추가 조작 없이 자동 발동 · 회수 시 스킬 비용도 70% 환급'}</span><button type="button" data-action="close">전장 복귀 <kbd>ESC</kbd></button></footer>`;
    this.dialog.querySelector<HTMLElement>('.shop-content')!.scrollTop = scrollTop;
    for (const { selector, left } of strips) this.dialog.querySelector<HTMLElement>(selector)?.scrollTo({ left });
  }

  private upgradeButton(unit: ShopUnit, gold: number): string {
    const max = unit.lvl >= MAX_UNIT_LEVEL, cost = unitUpgradeCost(unit);
    return `<button type="button" class="shop-purchase" data-action="upgrade" data-key="${unit.id}" ${max || gold < cost ? 'disabled' : ''}>${max ? '✓ 최대 강화 완료' : `강화 → Lv.${unit.lvl + 1} · ◆ ${cost}${gold < cost ? ' · 부족' : ''}`}</button>`;
  }

  private orderButton(state: ShopState, order: UnitOrder, scope: UnitScope, label: string): string {
    const plan = planOrder(state.units, order, scope);
    return `<button type="button" class="shop-purchase" data-action="${order.type === 'upgrade' ? 'batch-upgrade' : 'batch-equip'}" data-key="${order.type === 'upgrade' ? scope.kind ?? 'all' : order.key}" data-bunker="${scope.bunkerId ?? ''}" data-kind="${scope.kind ?? ''}" ${!plan.ids.length || state.gold < plan.cost ? 'disabled' : ''}>${label} · ${plan.ids.length}기${plan.ids.length ? ` · ◆ ${plan.cost}${state.gold < plan.cost ? ' · 부족' : ''}` : ' · 대상 없음'}</button>`;
  }

  private batchControls(state: ShopState, scope: UnitScope, title: string): string {
    const units = state.units.filter(u => u.k !== 'bunker' && (scope.bunkerId === undefined || u.hostId === scope.bunkerId));
    return `<section class="shop-batch" aria-label="${title}">
      <div class="shop-batch-header"><div><h3>${title}</h3><p>강화는 각 1단계씩 · 최대 강화·이미 장착한 스킬은 제외 · 미네랄 부족 시 전체 보류</p></div>${this.orderButton(state, { type: 'upgrade' }, scope, '전체 강화')}</div>
      ${units.length ? `<div class="shop-batch-groups">${TOWER_KEYS.filter(k => units.some(u => u.k === k)).map(k => {
        const group = units.filter(u => u.k === k), kindScope = { ...scope, kind: k };
        return `<section class="shop-batch-group" aria-label="${TOWER_DEFS[k].name} 일괄 관리"><header><img src="${this.images.get(k)}" alt="" width="44" height="44"><div><h4>${TOWER_DEFS[k].name} · ${group.length}기</h4><p>벙커 탑승 ${group.filter(u => u.hostId).length} · 전장 ${group.filter(u => !u.hostId).length}</p></div></header>
          ${this.orderButton(state, { type: 'upgrade' }, kindScope, '동종 병력 강화')}
          ${SKILL_KEYS.filter(key => SKILL_DEFS[key].unit === k).map(key => this.orderButton(state, { type: 'skill', key }, kindScope, SKILL_DEFS[key].name)).join('')}</section>`;
      }).join('')}</div>` : '<p class="shop-batch-empty">병력을 배치하거나 벙커에 구매하면 일괄 관리할 수 있습니다.</p>'}</section>`;
  }

  private garrisonButton(action: string, key: string, label: string, image: string, options: {
    meta?: string; detail?: string; disabled?: boolean; active?: boolean;
    unit?: string; slot?: number; bunker?: string; kind?: TowerKey;
  } = {}): string {
    const description = [label, options.meta, options.detail].filter(Boolean).join(' · ')
      .replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    return `<button type="button" class="garrison-action ${options.active ? 'is-equipped' : ''}" data-action="${action}" data-key="${key}"
      ${options.unit ? `data-unit="${options.unit}"` : ''} ${options.slot !== undefined ? `data-slot="${options.slot}"` : ''}
      ${options.bunker ? `data-bunker="${options.bunker}"` : ''} ${options.kind ? `data-kind="${options.kind}"` : ''}
      title="${description}" aria-label="${description}" ${options.active ? 'aria-pressed="true"' : ''} ${options.disabled ? 'disabled' : ''}>
      <img src="${image}" alt="" width="36" height="36"><span>${label}</span><small>${options.meta ?? ''}</small>${options.active ? '<b class="garrison-check" aria-hidden="true">✓</b>' : ''}</button>`;
  }

  private garrisonOrder(state: ShopState, bunkerId: string, order: UnitOrder): string {
    const scope = { bunkerId }, plan = planOrder(state.units, order, scope);
    const units = state.units.filter(u => u.hostId === bunkerId && (order.type === 'upgrade' || u.k === SKILL_DEFS[order.key].unit));
    const complete = units.length > 0 && units.every(u => order.type === 'upgrade' ? u.lvl >= MAX_UNIT_LEVEL : u.skills.some(s => s.key === order.key));
    const label = order.type === 'upgrade' ? '전체 강화' : SKILL_DEFS[order.key].name;
    const kind = order.type === 'skill' ? SKILL_DEFS[order.key].unit : undefined;
    return this.garrisonButton(order.type === 'upgrade' ? 'batch-upgrade' : 'batch-equip', order.type === 'upgrade' ? 'all' : order.key,
      label, commandIconUrl(order.type === 'upgrade' ? 'upgrade' : order.key), {
        bunker: bunkerId, kind, active: complete, disabled: !plan.ids.length || state.gold < plan.cost,
        meta: `${kind ? TOWER_DEFS[kind].name + ' · ' : ''}${complete ? '완료' : !plan.ids.length ? '대상 없음' : `${plan.ids.length}기 ◆ ${plan.cost}`}`,
        detail: complete ? '모든 대상 병력에 적용했습니다.' : `${order.type === 'upgrade' ? '각 병력을 1단계 강화' : '해당 스킬 일괄 장착'} · 미네랄 부족 시 전체 보류${state.gold < plan.cost ? ' · 미네랄 부족' : ''}`,
      });
  }

  private garrisonView(state: ShopState): string {
    const selected = state.units.find(u => u.id === state.selectedId);
    const bunkers = state.units.filter(u => u.k === 'bunker');
    const bunker = bunkers.find(u => u.id === selected?.id || u.id === selected?.hostId) ?? bunkers[0];
    if (!bunker) return `<section class="bunker-empty"><img src="${this.images.get('bunker')}" alt="벙커" width="128" height="128"><h3>먼저 빈 벙커를 건설하세요.</h3><p>마린·파이어뱃 4기를 조합해 나만의 방어 거점을 만드세요.</p><button type="button" class="shop-purchase" data-action="choose" data-key="bunker" ${state.gold < TOWER_DEFS.bunker.cost ? 'disabled' : ''}>벙커 건설 · ◆ ${TOWER_DEFS.bunker.cost}</button></section>`;
    const available = state.units.filter(u => !u.hostId && isInfantry(u.k));
    const preferred = this.boarding?.bunkerId === bunker.id ? this.boarding.slot : -1;
    const targetSlot = preferred >= 0 && preferred < BUNKER_CAPACITY && !bunker.passengers[preferred]
      ? preferred : bunker.passengers.findIndex(id => !id);
    return `<div class="garrison-console">
      <nav class="garrison-bunkers" aria-label="관리할 벙커">${bunkers.map(b => `<button type="button" data-action="select" data-key="${b.id}" class="${b.id === bunker.id ? 'is-active' : ''}" aria-pressed="${b.id === bunker.id}">
        <img src="${this.images.get('bunker')}" alt="" width="44" height="44"><span>벙커 #${b.id}<small>${b.passengers.filter(Boolean).length}/${BUNKER_CAPACITY} 주둔 · 구역 ${b.c + 1}-${b.r + 1}</small></span></button>`).join('')}</nav>
      <p class="garrison-notice" role="status">${this.notice || '초상화로 병력 선택 · 아래 아이콘으로 바로 강화·스킬 장착 · 빈 사격구에 보병 구매'}</p>
      <div class="bunker-slots garrison-slots">${bunker.passengers.map((id, slot) => {
        const unit = state.units.find(u => u.id === id);
        const focused = unit ? unit.id === selected?.id : slot === targetSlot;
        return `<section class="bunker-slot garrison-slot ${unit ? 'is-occupied' : ''} ${focused ? 'is-selected' : ''}" aria-label="${slot + 1}번 주둔 슬롯">
          <div class="bunker-slot-header"><span>사격구 ${String(slot + 1).padStart(2, '0')}</span><b>${unit ? '● 주둔 중' : focused ? '▼ 탑승 대상' : '비어 있음'}</b></div>
          <button type="button" class="garrison-portrait ${focused ? 'is-active' : ''}" data-action="${unit ? 'select' : 'select-slot'}" data-key="${unit?.id ?? bunker.id}" data-slot="${slot}" aria-pressed="${focused}" aria-label="${slot + 1}번 사격구 · ${unit ? `${TOWER_DEFS[unit.k].name} Lv.${unit.lvl} 선택` : '탑승 위치로 선택'}">
            <img src="${unit ? this.images.get(unit.k) : commandIconUrl('empty')}" alt="" width="68" height="68"><strong>${unit ? TOWER_DEFS[unit.k].name : '빈 사격구'}</strong>
            <small>${unit ? `Lv.${unit.lvl} · 스킬 ${unit.skills.length}/${SKILL_SLOTS}` : '마린 · 파이어뱃 탑승'}</small></button>
          ${unit ? `<div class="garrison-commands" aria-label="${slot + 1}번 병력 명령">${this.garrisonButton('upgrade', unit.id, '강화', commandIconUrl('upgrade'), {
            disabled: unit.lvl >= MAX_UNIT_LEVEL || state.gold < unitUpgradeCost(unit), active: unit.lvl >= MAX_UNIT_LEVEL,
            meta: unit.lvl >= MAX_UNIT_LEVEL ? 'MAX' : `◆ ${unitUpgradeCost(unit)}`, detail: unit.lvl >= MAX_UNIT_LEVEL ? '최대 강화 완료' : `Lv.${unit.lvl} → Lv.${unit.lvl + 1}${state.gold < unitUpgradeCost(unit) ? ' · 미네랄 부족' : ''}`,
          })}${SKILL_KEYS.filter(key => SKILL_DEFS[key].unit === unit.k).map(key => {
            const d = SKILL_DEFS[key], owned = unit.skills.some(s => s.key === key);
            return this.garrisonButton('equip-unit', key, d.name, commandIconUrl(key), { unit: unit.id, active: owned,
              disabled: owned || unit.skills.length >= SKILL_SLOTS || state.gold < d.cost,
              meta: owned ? '자동 사용' : `◆ ${d.cost}`, detail: `${d.desc}${owned ? ' · 장착 완료' : unit.skills.length >= SKILL_SLOTS ? ' · 슬롯 가득 참' : state.gold < d.cost ? ' · 미네랄 부족' : ''}` });
          }).join('')}</div><button type="button" class="garrison-unload" data-action="unload" data-key="${unit.id}" title="빈 구역을 지정하면 하차합니다. 강화와 스킬은 유지됩니다."><img src="${commandIconUrl('unload')}" alt="" width="22" height="22">하차 <small>전장에 배치</small></button>`
          : `<div class="garrison-recruits">${BUNKER_INFANTRY.map(k => this.garrisonButton('recruit', bunker.id, TOWER_DEFS[k].name, this.images.get(k)!, {
            unit: k, slot, disabled: state.gold < TOWER_DEFS[k].cost, meta: `◆ ${TOWER_DEFS[k].cost}`, detail: `구매 즉시 ${slot + 1}번 사격구 탑승${state.gold < TOWER_DEFS[k].cost ? ' · 미네랄 부족' : ''}`,
          })).join('')}</div><p class="garrison-vacancy-hint">기존 보병은 아래 아이콘으로 무료 탑승</p>`}</section>`;
      }).join('')}</div>
      <section class="garrison-batch" aria-label="이 벙커 병력 일괄 관리"><header><h3>벙커 전체 명령</h3><span>각 1단계 강화 · 이미 장착한 스킬 제외</span></header><div class="garrison-batch-actions">
        ${this.garrisonOrder(state, bunker.id, { type: 'upgrade' })}${SKILL_KEYS.filter(key => isInfantry(SKILL_DEFS[key].unit)).map(key => this.garrisonOrder(state, bunker.id, { type: 'skill', key })).join('')}
      </div></section>
      <section class="garrison-transfer" aria-label="전장 보병 탑승"><header><h3>전장 보병 ${targetSlot >= 0 ? `→ ${targetSlot + 1}번 사격구` : ''}</h3><span>${targetSlot < 0 ? '사격구가 모두 찼습니다' : '초상화를 누르면 무료 탑승'}</span></header>
        ${targetSlot >= 0 && available.length ? `<div class="garrison-available">${available.map(u => this.garrisonButton('board', bunker.id, TOWER_DEFS[u.k].name, this.images.get(u.k)!, {
          unit: u.id, slot: targetSlot, meta: `Lv.${u.lvl} · 구역 ${u.c + 1}-${u.r + 1}`, detail: `${targetSlot + 1}번 사격구 무료 탑승 · 강화·스킬 유지`,
        })).join('')}</div>` : `<p>${targetSlot < 0 ? '병력을 하차시키면 다른 보병을 탑승시킬 수 있습니다.' : '탑승 가능한 보병이 없습니다. 빈 사격구의 유닛 아이콘으로 새 병력을 구매하세요.'}</p>`}
      </section></div>`;
  }
}

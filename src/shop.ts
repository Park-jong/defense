import { attackDamage, TOWER_DEFS, TOWER_KEYS, TowerKey } from './config';
import { EquippedSkill, SKILL_DEFS, SKILL_KEYS, SKILL_SLOTS, SkillKey } from './catalog';
import { unitImageUrl } from './unitArt';
import { commandIconUrl } from './commandIcons';
import { BUNKER_INFANTRY, InfantryKey, isInfantry } from './bunker';
import { OrderResult, planOrder, UnitOrder, UnitScope, unitUpgradeCost } from './management';
import { RunOptions } from './campaign';
import { adoptTitles, bindTips, createTip, placeTip, textTip } from './gameTip';
import { OBSERVATION_BONUSES, supportTraits, vesselAuraBonus } from './support';
import { bunkerCapacity, maxUnitLevel, placeCost, skillCost, skillLocked } from './augments';
import './shop.css';

/** 설명 창 없이 보이는 글자·아이콘만으로 충분한 상점 요소. */
const SHOP_SILENT = '.shop-tabs button, .army-unit, .army-stat, .garrison-unload[data-action="tab"]';

const icon = (key: string): string => `<img class="shop-icon" src="${commandIconUrl(key)}" width="32" height="32" alt="" aria-hidden="true">`;

export interface ShopUnit {
  id: string; k: TowerKey; lvl: number; skills: EquippedSkill[]; c: number; r: number;
  stats: { dmg: number; range: number; rate: number }; nextStats: { dmg: number; range: number; rate: number };
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
  private tab: 'army' | 'garrison' | 'manage' = 'army';
  private notice = '';
  private boarding: { bunkerId: string; slot: number } | null = null;
  private images = new Map(TOWER_KEYS.map(k => [k, unitImageUrl(k)]));
  private tip = createTip();

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
    // 상점의 설명도 브라우저 기본 툴팁 대신 작전실과 같은 장갑판 창으로 띄운다(모달 안이라 창 안에 붙인다).
    bindTips(this.dialog, this.tip, el => {
      this.tip.innerHTML = textTip(el);
      if (this.tip.parentElement !== this.dialog) this.dialog.append(this.tip);
      this.tip.hidden = false; placeTip(this.tip, el);
    });
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
      if (action === 'equip-unit') {
        const skill = key as SkillKey;
        this.notice = this.actions.equip(skill, button.dataset.unit) ? `${SKILL_DEFS[skill].name} 장착 완료. 적을 만나면 자동으로 사용합니다.` : '장착할 유닛과 보유 미네랄을 확인해 주세요.';
      }
      this.render(['equip-unit', 'upgrade', 'batch-upgrade', 'batch-equip', 'recruit', 'board', 'select-slot'].includes(action!) || action === 'select' && this.tab !== 'manage');
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

  open(tab: 'army' | 'garrison' | 'manage' = 'army'): void {
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
    const strips = ['.garrison-bunkers', '.garrison-available', '.army-roster'].map(selector => ({ selector,
      left: preserveScroll ? this.dialog.querySelector<HTMLElement>(selector)?.scrollLeft ?? 0 : 0 }));
    const state = this.actions.state();
    const selected = state.units.find(u => u.id === state.selectedId);
    const tabs = [
      { key: 'army', name: '부대', label: '부대 · 강화와 스킬', art: icon('tactics') },
      { key: 'garrison', name: '벙커', label: '벙커 주둔 · 4칸', art: `<img class="shop-icon shop-unit-icon" src="${this.images.get('bunker')}" alt="" aria-hidden="true">` },
      { key: 'manage', name: '일괄', label: '일괄 관리', art: icon('manage') },
    ];
    this.dialog.innerHTML = `
      <header class="shop-header"><div class="shop-heading">${icon('supply')}<div><h1>보급 상점</h1><p>전투 일시정지</p></div></div><span class="shop-wallet" aria-label="미네랄 ${state.gold}">${icon('mineral')}${state.gold.toLocaleString()}</span><button type="button" class="shop-close" data-action="close" aria-label="전장 복귀" title="전장 복귀 [Esc / B]">${icon('close')}</button></header>
      <nav class="shop-tabs" aria-label="상점 메뉴">${tabs.map(t => `<button type="button" data-action="tab" data-key="${t.key}" class="${this.tab === t.key ? 'is-active' : ''}" aria-pressed="${this.tab === t.key}" aria-label="${t.label}" title="${t.label}">${t.art}<span>${t.name}</span></button>`).join('')}</nav>
      <div class="shop-content">
        ${this.tab === 'manage' ? `<p class="shop-notice" role="status">${icon(this.notice ? 'saved' : 'help')}${this.notice || '전장과 모든 벙커의 병력을 함께 관리합니다. 유닛 종류별로도 강화·스킬을 적용할 수 있습니다.'}</p>${this.batchControls(state, {}, '전체 부대 일괄 관리')}` : this.tab === 'garrison' ? this.garrisonView(state) : this.armyView(state, selected)}
      </div>
      <footer class="shop-footer"><span class="shop-hint">${icon('help')}<span>${this.tab === 'garrison' ? '강화·스킬 아이콘을 누르면 즉시 적용 · 체크 표시는 장착 완료 · 스킬은 자동 사용' : '유닛당 스킬 2개 · 적을 만나면 자동 발동 · 병력 구매는 명령 카드 또는 1–9 키 · 회수 시 비용 70% 환급'}</span></span><kbd>ESC</kbd></footer>`;
    this.dialog.querySelector<HTMLElement>('.shop-content')!.scrollTop = scrollTop;
    for (const { selector, left } of strips) this.dialog.querySelector<HTMLElement>(selector)?.scrollTo({ left });
    adoptTitles(this.dialog, SHOP_SILENT); this.tip.hidden = true;
  }

  private armyView(state: ShopState, selected?: ShopUnit): string {
    const units = state.units.filter(u => u.k !== 'bunker').sort((a, b) => TOWER_KEYS.indexOf(a.k) - TOWER_KEYS.indexOf(b.k) || Number(a.id) - Number(b.id));
    const notice = `<p class="shop-notice ${this.notice ? 'is-success' : ''}" role="status">${icon(this.notice ? 'saved' : 'help')}${this.notice || '병력을 고르면 강화와 전용 스킬을 바로 적용합니다. 병력 구매는 명령 카드나 1–9 키로 합니다.'}</p>`;
    if (!units.length) return `${notice}<section class="army-empty">${icon('terran')}<p>병력을 배치하면 여기서 강화·스킬을 관리합니다</p></section>`;
    const roster = units.map(u => {
      const name = `${TOWER_DEFS[u.k].name} #${u.id} · Lv.${u.lvl} · 스킬 ${u.skills.length}/${SKILL_SLOTS}${u.hostId ? ' · 탑승' : ''}`;
      return `<button type="button" class="army-unit" data-action="select" data-key="${u.id}" aria-pressed="${u.id === selected?.id}" aria-label="${name}" title="${name}">
        <img src="${this.images.get(u.k)}" alt="" width="44" height="44"><b>Lv.${u.lvl}</b><span class="army-dots" aria-hidden="true">${Array.from({ length: SKILL_SLOTS }, (_, i) => `<i class="${i < u.skills.length ? 'on' : ''}"></i>`).join('')}</span>${u.hostId ? `<img class="army-host" src="${this.images.get('bunker')}" alt="" width="16" height="16">` : ''}</button>`;
    }).join('');
    return `${notice}<div class="army-console"><nav class="army-roster" aria-label="배치된 병력">${roster}</nav>${this.armyDetail(state, selected)}</div>`;
  }

  private armyDetail(state: ShopState, u?: ShopUnit): string {
    if (!u) return `<section class="army-detail army-pointer">${icon('tactics')}<p>왼쪽에서 병력을 선택하세요</p></section>`;
    const d = TOWER_DEFS[u.k];
    const toGarrison = `<button type="button" class="garrison-unload" data-action="tab" data-key="garrison" aria-label="벙커 탭으로 이동" title="벙커 탭으로 이동"><img src="${this.images.get('bunker')}" alt="" width="22" height="22"></button>`;
    if (u.k === 'bunker') return `<section class="army-detail army-pointer"><img src="${this.images.get('bunker')}" alt="" width="64" height="64"><p>벙커는 벙커 탭에서 주둔 병력을 관리합니다</p>${toGarrison}</section>`;
    const max = u.lvl >= maxUnitLevel(), cost = unitUpgradeCost(u), cur = u.stats, next = u.nextStats;
    const support = u.k === 'support' || u.k === 'observer';
    const stat = (art: string, label: string, now: number, then: number, digits = 0): string => {
      const text = (v: number) => String(+v.toFixed(digits)), changed = !max && text(now) !== text(then);
      return `<div class="army-stat" title="${label}" aria-label="${label} ${text(now)}${changed ? ` → ${text(then)}` : ''}">${icon(art)}<b>${text(now)}</b>${changed ? `<i>→ ${text(then)}</i>` : ''}<small>${label}</small></div>`;
    };
    const stats = support
      ? stat('range', '지원 반경', cur.range, next.range) + (u.k === 'support' ? stat('overdrive', '주변 공속 +%', vesselAuraBonus(u.lvl) * 100, vesselAuraBonus(u.lvl + 1) * 100) : stat('weak', '받는 피해 +%', OBSERVATION_BONUSES[0] * 100, OBSERVATION_BONUSES[0] * 100))
      : stat('siege', '공격력', attackDamage(u.k, cur.dmg), attackDamage(u.k, next.dmg)) + stat('range', '사거리', cur.range, next.range) + stat('overdrive', '초당 공격', 1 / cur.rate, 1 / next.rate, 2) + stat('barrage', 'DPS', attackDamage(u.k, cur.dmg) / cur.rate, attackDamage(u.k, next.dmg) / next.rate, 1);
    const skills = SKILL_KEYS.filter(key => SKILL_DEFS[key].unit === u.k);
    return `<section class="army-detail" aria-label="${d.name} 상세">
      <header class="army-head"><img src="${this.images.get(u.k)}" alt="" width="72" height="72"><div><h3>${d.name} <small>${max ? 'MAX' : `Lv.${u.lvl}`}</small></h3>
        <p>${u.hostId ? `벙커 #${u.hostId} 탑승` : `구역 ${u.c + 1}-${u.r + 1}`} · ${d.role}</p></div>${u.hostId ? toGarrison : ''}</header>
      <div class="army-stats">${stats}</div>
      <div class="army-actions">${this.garrisonButton('upgrade', u.id, '강화', commandIconUrl('upgrade'), {
        disabled: max || state.gold < cost, active: max, meta: max ? 'MAX' : `◆ ${cost}`,
        detail: max ? '최대 강화 완료' : `Lv.${u.lvl} → Lv.${u.lvl + 1} · 공격력 ×1.6 · 사거리 +8% · 공격 간격 감소${state.gold < cost ? ' · 미네랄 부족' : ''}` })}${skills.map(key => {
        const sk = SKILL_DEFS[key], owned = u.skills.some(e => e.key === key), full = u.skills.length >= SKILL_SLOTS;
        return this.garrisonButton('equip-unit', key, sk.name, commandIconUrl(key), { unit: u.id, active: owned, disabled: owned || full || skillLocked(u.k) || state.gold < skillCost(key),
          meta: owned ? '자동 사용' : skillLocked(u.k) ? '비활성' : full ? '슬롯 가득' : `◆ ${skillCost(key)}`, detail: `${sk.desc} · 재사용 ${sk.cooldown}초${owned ? ' · 장착 완료' : full ? ' · 슬롯 가득 참' : state.gold < skillCost(key) ? ' · 미네랄 부족' : ''}` });
      }).join('')}</div>
      ${support ? `<ul class="army-skill-notes army-support-notes">${supportTraits(u.k, u.lvl).map(trait => `<li><img src="${commandIconUrl(trait.icon)}" alt="" width="18" height="18"><span><b>${trait.name}</b> ${trait.text}</span></li>`).join('')}</ul>` : ''}
      ${skills.length ? `<ul class="army-skill-notes">${skills.map(key => `<li><img src="${commandIconUrl(key)}" alt="" width="18" height="18"><span><b>${SKILL_DEFS[key].name}</b> ${SKILL_DEFS[key].desc} · ↻ ${SKILL_DEFS[key].cooldown}초</span></li>`).join('')}</ul>` : ''}</section>`;
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
    const complete = units.length > 0 && units.every(u => order.type === 'upgrade' ? u.lvl >= maxUnitLevel() : u.skills.some(s => s.key === order.key));
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
    if (!bunker) return `<section class="bunker-empty"><img src="${this.images.get('bunker')}" alt="벙커" width="128" height="128"><h3>먼저 빈 벙커를 건설하세요.</h3><p>마린·파이어뱃 4기를 조합해 나만의 방어 거점을 만드세요.</p><button type="button" class="shop-purchase" data-action="choose" data-key="bunker" ${state.gold < placeCost('bunker') ? 'disabled' : ''}>벙커 건설 · ◆ ${placeCost('bunker')}</button></section>`;
    const available = state.units.filter(u => !u.hostId && isInfantry(u.k));
    const preferred = this.boarding?.bunkerId === bunker.id ? this.boarding.slot : -1;
    const targetSlot = preferred >= 0 && preferred < bunkerCapacity() && !bunker.passengers[preferred]
      ? preferred : bunker.passengers.findIndex(id => !id);
    return `<div class="garrison-console">
      <nav class="garrison-bunkers" aria-label="관리할 벙커">${bunkers.map(b => `<button type="button" data-action="select" data-key="${b.id}" class="${b.id === bunker.id ? 'is-active' : ''}" aria-pressed="${b.id === bunker.id}">
        <img src="${this.images.get('bunker')}" alt="" width="44" height="44"><span>벙커 #${b.id}<small>${b.passengers.filter(Boolean).length}/${bunkerCapacity()} 주둔 · 구역 ${b.c + 1}-${b.r + 1}</small></span></button>`).join('')}</nav>
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
            disabled: unit.lvl >= maxUnitLevel() || state.gold < unitUpgradeCost(unit), active: unit.lvl >= maxUnitLevel(),
            meta: unit.lvl >= maxUnitLevel() ? 'MAX' : `◆ ${unitUpgradeCost(unit)}`, detail: unit.lvl >= maxUnitLevel() ? '최대 강화 완료' : `Lv.${unit.lvl} → Lv.${unit.lvl + 1}${state.gold < unitUpgradeCost(unit) ? ' · 미네랄 부족' : ''}`,
          })}${SKILL_KEYS.filter(key => SKILL_DEFS[key].unit === unit.k).map(key => {
            const d = SKILL_DEFS[key], owned = unit.skills.some(s => s.key === key);
            return this.garrisonButton('equip-unit', key, d.name, commandIconUrl(key), { unit: unit.id, active: owned,
              disabled: owned || unit.skills.length >= SKILL_SLOTS || state.gold < skillCost(key),
              meta: owned ? '자동 사용' : `◆ ${skillCost(key)}`, detail: `${d.desc}${owned ? ' · 장착 완료' : unit.skills.length >= SKILL_SLOTS ? ' · 슬롯 가득 참' : state.gold < skillCost(key) ? ' · 미네랄 부족' : ''}` });
          }).join('')}</div><button type="button" class="garrison-unload" data-action="unload" data-key="${unit.id}" title="빈 구역을 지정하면 하차합니다. 강화와 스킬은 유지됩니다."><img src="${commandIconUrl('unload')}" alt="" width="22" height="22">하차 <small>전장에 배치</small></button>`
          : `<div class="garrison-recruits">${BUNKER_INFANTRY.map(k => this.garrisonButton('recruit', bunker.id, TOWER_DEFS[k].name, this.images.get(k)!, {
            unit: k, slot, disabled: state.gold < placeCost(k), meta: `◆ ${placeCost(k)}`, detail: `구매 즉시 ${slot + 1}번 사격구 탑승${state.gold < placeCost(k) ? ' · 미네랄 부족' : ''}`,
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

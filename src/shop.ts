import { TOWER_DEFS, TOWER_KEYS, TowerKey } from './config';
import { EquippedSkill, SKILL_DEFS, SKILL_KEYS, SKILL_SLOTS, SkillKey } from './catalog';
import { unitImageUrl } from './unitArt';
import { BUNKER_CAPACITY, BUNKER_INFANTRY, BUNKER_RANGE_BONUS, InfantryKey, isInfantry } from './bunker';
import './shop.css';

export interface ShopUnit {
  id: string; k: TowerKey; lvl: number; skills: EquippedSkill[]; c: number; r: number;
  hostId?: string; passengers: (string | null)[];
}
export interface ShopState { gold: number; units: ShopUnit[]; selectedId: string | null }
interface ShopActions {
  state(): ShopState;
  select(id: string): void;
  choose(key: TowerKey): void;
  equip(key: SkillKey): boolean;
  recruit(id: string, slot: number, key: InfantryKey): boolean;
  board(id: string, slot: number, unitId: string): boolean;
  unload(id: string): boolean;
  close(): void;
}

export class SupplyShop {
  private dialog: HTMLDialogElement;
  private tab: 'units' | 'skills' | 'garrison' = 'units';
  private faction = 'all';
  private notice = '';
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
      e.stopPropagation();
      if (e.key.toLowerCase() === 'b') { e.preventDefault(); this.close(); }
    });
    this.dialog.addEventListener('click', e => {
      e.stopPropagation();
      const button = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]');
      if (!button || button.disabled) return;
      const { action, key } = button.dataset;
      if (action === 'close') { this.close(); return; }
      if (action === 'tab') { this.tab = key as typeof this.tab; this.notice = ''; }
      if (action === 'filter') this.faction = key!;
      if (action === 'select') { this.actions.select(key!); this.notice = ''; }
      if (action === 'choose') { this.actions.choose(key as TowerKey); this.close(); return; }
      if (action === 'crew-skills') { this.actions.select(key!); this.tab = 'skills'; this.notice = ''; }
      if (action === 'recruit') {
        this.notice = this.actions.recruit(key!, Number(button.dataset.slot), button.dataset.unit as InfantryKey)
          ? '병력이 탑승했습니다. 전장에 복귀하면 자동으로 공격합니다.' : '빈 슬롯과 보유 미네랄을 확인해 주세요.';
      }
      if (action === 'board') {
        const unit = button.closest('.bunker-slot')?.querySelector<HTMLSelectElement>('select')?.value;
        this.notice = unit && this.actions.board(key!, Number(button.dataset.slot), unit)
          ? '병력을 옮겼습니다. 강화와 스킬은 그대로 유지됩니다.' : '탑승할 보병과 빈 슬롯을 확인해 주세요.';
      }
      if (action === 'unload') {
        if (this.actions.unload(key!)) { this.close(); return; }
        this.notice = '하차할 병력을 찾을 수 없습니다.';
      }
      if (action === 'equip') {
        const skill = key as SkillKey;
        this.notice = this.actions.equip(skill) ? `${SKILL_DEFS[skill].name} 장착 완료. 적을 만나면 자동으로 사용합니다.` : '장착할 유닛과 보유 미네랄을 확인해 주세요.';
      }
      this.render(['equip', 'filter', 'recruit', 'board'].includes(action!));
      const next = this.dialog.querySelector<HTMLButtonElement>(`button[data-action="${action}"][data-key="${key}"]${button.dataset.slot ? `[data-slot="${button.dataset.slot}"]` : ''}${button.dataset.unit ? `[data-unit="${button.dataset.unit}"]` : ''}`);
      if (next && !next.disabled) next.focus({ preventScroll: true });
    });
  }

  open(tab: 'units' | 'skills' | 'garrison' = 'units'): void {
    this.tab = tab; this.notice = ''; this.render();
    if (!this.dialog.open) this.dialog.showModal();
  }
  close(): void { if (this.dialog.open) this.dialog.close(); this.actions.close(); }
  destroy(): void { this.close(); this.dialog.remove(); }

  private render(preserveScroll = false): void {
    const scrollTop = preserveScroll ? this.dialog.querySelector<HTMLElement>('.shop-content')?.scrollTop ?? 0 : 0;
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
    const cards = this.tab === 'units' ? TOWER_KEYS.filter(k => this.faction === 'all' || TOWER_DEFS[k].faction === this.faction).map(k => {
      const d = TOWER_DEFS[k];
      return `<article class="shop-card unit-card ${d.faction}">
        <div class="shop-card-top"><span>${d.faction === 'terran' ? 'TERRAN' : 'PROTOSS'} / ${d.role}</span><b>◆ ${d.cost}</b></div>
        <div class="shop-unit-art"><img src="${this.images.get(k)}" alt="${d.name}" width="112" height="112"><span>${String(TOWER_KEYS.indexOf(k) + 1).padStart(2, '0')}</span></div>
        <h3>${d.name}</h3><p>${d.desc}</p>
        <div class="shop-unit-skills">${k === 'bunker' ? '<span>마린 · 파이어뱃 탑승</span><span>병력 스킬 자동 발동</span>' : SKILL_KEYS.filter(skill => SKILL_DEFS[skill].unit === k).map(skill => `<span>${SKILL_DEFS[skill].icon} ${SKILL_DEFS[skill].name}</span>`).join('')}</div>
        <dl class="shop-stats">${k === 'bunker' ? `<div><dt>탑승 인원</dt><dd>${BUNKER_CAPACITY}</dd></div><div><dt>사거리 보너스</dt><dd>+${BUNKER_RANGE_BONUS}</dd></div><div><dt>빈 벙커</dt><dd>대기</dd></div>` : `<div><dt>공격력</dt><dd>${d.dmg}</dd></div><div><dt>사거리</dt><dd>${d.range}</dd></div><div><dt>초당 공격</dt><dd>${(1 / d.rate).toFixed(1)}</dd></div>`}</dl>
        <div class="shop-card-note">${k === 'bunker' ? '건설 후 병력 관리' : '전용 스킬 2종'} <span>보유 ${unitCount(k)}기</span></div>
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
      <nav class="shop-tabs" aria-label="상점 메뉴">${button('tab', 'units', `유닛 보급 <small>${TOWER_KEYS.length}</small>`, this.tab === 'units')}${button('tab', 'skills', `자동 스킬 <small>${SKILL_KEYS.length}</small>`, this.tab === 'skills')}${button('tab', 'garrison', '벙커 주둔 <small>4칸</small>', this.tab === 'garrison')}<span>구매 → 배치 → 스킬 장착</span></nav>
      <div class="shop-content">
        ${this.tab === 'garrison' ? this.garrisonView(state) : this.tab === 'units' ? `<div class="shop-filter">${button('filter', 'all', '전체 유닛', this.faction === 'all')}${button('filter', 'terran', '테란', this.faction === 'terran')}${button('filter', 'protoss', '프로토스', this.faction === 'protoss')}<span>미네랄은 전장에 배치할 때 차감됩니다.</span></div>` : `${roster}<div class="shop-skill-context">${selected && selected.k !== 'bunker' ? `<img src="${this.images.get(selected.k)}" alt="" width="54" height="54"><div><b>${TOWER_DEFS[selected.k].name} <span>Lv.${selected.lvl}${selected.hostId ? ' · 벙커 탑승' : ''}</span></b><p>장착 ${selected.skills.length}/${SKILL_SLOTS} · 스킬은 적이 사거리 안에 있을 때 자동 사용</p></div>` : '<div><b>병력을 선택하면 전용 스킬을 구매할 수 있습니다.</b><p>벙커에 탑승한 병력도 스킬을 각각 장착합니다.</p></div>'}</div>`}
        ${this.tab === 'skills' ? `<p class="shop-notice ${this.notice ? 'is-success' : ''}" role="status">${this.notice ? '✓ ' + this.notice : '전용 스킬을 장착하면 적 탐지와 재사용 대기시간에 따라 자동으로 발동합니다.'}</p>` : ''}
        ${this.tab !== 'garrison' ? `<div class="shop-grid ${this.tab === 'skills' && selected && selected.k !== 'bunker' ? 'focused-skills' : ''}">${cards}</div>` : ''}
      </div>
      <footer class="shop-footer"><span>${this.tab === 'garrison' ? '병력별 강화·스킬 유지 · 하차는 빈 구역 클릭 · 벙커 회수 전 병력을 하차시키세요.' : '유닛당 스킬 2개 · 추가 조작 없이 자동 발동 · 회수 시 스킬 비용도 70% 환급'}</span><button type="button" data-action="close">전장 복귀 <kbd>ESC</kbd></button></footer>`;
    this.dialog.querySelector<HTMLElement>('.shop-content')!.scrollTop = scrollTop;
  }

  private garrisonView(state: ShopState): string {
    const selected = state.units.find(u => u.id === state.selectedId);
    const bunkers = state.units.filter(u => u.k === 'bunker');
    const bunker = bunkers.find(u => u.id === selected?.id || u.id === selected?.hostId) ?? bunkers[0];
    if (!bunker) return `<section class="bunker-empty"><img src="${this.images.get('bunker')}" alt="벙커" width="128" height="128"><h3>먼저 빈 벙커를 건설하세요.</h3><p>마린·파이어뱃 4기를 조합해 나만의 방어 거점을 만드세요.</p><button type="button" class="shop-purchase" data-action="choose" data-key="bunker" ${state.gold < TOWER_DEFS.bunker.cost ? 'disabled' : ''}>벙커 건설 · ◆ ${TOWER_DEFS.bunker.cost}</button></section>`;
    const available = state.units.filter(u => !u.hostId && isInfantry(u.k));
    return `<section class="shop-roster" aria-label="관리할 벙커"><span>주둔 거점</span>${bunkers.map(b => `<button type="button" data-action="select" data-key="${b.id}" class="${b.id === bunker.id ? 'is-active' : ''}">벙커 #${b.id}<small>구역 ${b.c + 1}-${b.r + 1} · ${b.passengers.filter(Boolean).length}/4</small></button>`).join('')}</section>
      <div class="shop-skill-context"><img src="${this.images.get('bunker')}" alt="" width="70" height="70"><div><b>벙커 #${bunker.id} <span>${bunker.passengers.filter(Boolean).length}/4 주둔</span></b><p>각 병력이 독립 사격 · 사거리 +${BUNKER_RANGE_BONUS} · 마린·파이어뱃 전용 · 스킬 자동 발동</p></div></div>
      <p class="shop-notice" role="status">${this.notice || '빈 슬롯에서 병력을 구매하거나, 전장에 배치한 보병을 무료로 옮기세요.'}</p>
      <div class="bunker-slots">${bunker.passengers.map((id, slot) => {
        const unit = state.units.find(u => u.id === id);
        return `<section class="bunker-slot ${unit ? 'is-occupied' : ''}" aria-label="${slot + 1}번 주둔 슬롯"><div class="bunker-slot-header"><span>주둔 ${String(slot + 1).padStart(2, '0')}</span><b>${unit ? 'ONLINE' : 'EMPTY'}</b></div>${unit ? `
          <img class="bunker-crew-art" src="${this.images.get(unit.k)}" alt="${TOWER_DEFS[unit.k].name}" width="84" height="84"><h3>${TOWER_DEFS[unit.k].name} <small>Lv.${unit.lvl}</small></h3>
          <p>사거리 ${Math.round(TOWER_DEFS[unit.k].range * (1 + .08 * (unit.lvl - 1)) + BUNKER_RANGE_BONUS)} · 스킬 ${unit.skills.length}/${SKILL_SLOTS}</p>
          <div class="bunker-crew-skills">${unit.skills.length ? unit.skills.map(s => `<span>${SKILL_DEFS[s.key].icon} ${SKILL_DEFS[s.key].name}</span>`).join('') : '<span>전용 스킬을 장착해 보세요.</span>'}</div>
          <button type="button" class="shop-purchase" data-action="crew-skills" data-key="${unit.id}">스킬 장착 · 자동 사용</button><button type="button" data-action="unload" data-key="${unit.id}">하차 · 전장에 배치</button>` : `
          <div class="bunker-vacancy">＋</div><h3>비어 있는 사격구</h3><p>보병 1기가 탑승할 수 있습니다.</p>
          ${BUNKER_INFANTRY.map(k => `<button type="button" class="shop-purchase" data-action="recruit" data-key="${bunker.id}" data-slot="${slot}" data-unit="${k}" ${state.gold < TOWER_DEFS[k].cost ? 'disabled' : ''}>${TOWER_DEFS[k].name} 구매 · ◆ ${TOWER_DEFS[k].cost}</button>`).join('')}
          <label class="bunker-board-label">전장 보병 옮기기<select aria-label="${slot + 1}번 슬롯 탑승 병력" ${available.length ? '' : 'disabled'}>${available.length ? available.map(u => `<option value="${u.id}">${TOWER_DEFS[u.k].name} Lv.${u.lvl} · 구역 ${u.c + 1}-${u.r + 1}</option>`).join('') : '<option>탑승 가능한 보병 없음</option>'}</select></label>
          <button type="button" data-action="board" data-key="${bunker.id}" data-slot="${slot}" ${available.length ? '' : 'disabled'}>선택한 보병 탑승 · 무료</button>`}</section>`;
      }).join('')}</div>`;
  }
}

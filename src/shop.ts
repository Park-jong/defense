import { TOWER_DEFS, TOWER_KEYS, TowerKey } from './config';
import { EquippedSkill, SKILL_DEFS, SKILL_KEYS, SKILL_SLOTS, SkillKey } from './catalog';
import { unitImageUrl } from './unitArt';
import './shop.css';

export interface ShopUnit { id: string; k: TowerKey; lvl: number; skills: EquippedSkill[] }
export interface ShopState { gold: number; units: ShopUnit[]; selectedId: string | null }
interface ShopActions {
  state(): ShopState;
  select(id: string): void;
  choose(key: TowerKey): void;
  equip(key: SkillKey): boolean;
  close(): void;
}

export class SupplyShop {
  private dialog: HTMLDialogElement;
  private tab: 'units' | 'skills' = 'units';
  private faction = 'all';
  private notice = '';
  private images = new Map(TOWER_KEYS.map(k => [k, unitImageUrl(k)]));

  constructor(private actions: ShopActions) {
    this.dialog = document.createElement('dialog');
    this.dialog.className = 'supply-shop';
    this.dialog.setAttribute('aria-label', '보급 상점');
    document.body.append(this.dialog);
    this.dialog.addEventListener('cancel', e => { e.preventDefault(); this.close(); });
    this.dialog.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key.toLowerCase() === 'b') { e.preventDefault(); this.close(); }
    });
    this.dialog.addEventListener('click', e => {
      const button = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]');
      if (!button || button.disabled) return;
      const { action, key } = button.dataset;
      if (action === 'close') { this.close(); return; }
      if (action === 'tab') { this.tab = key as 'units' | 'skills'; this.notice = ''; }
      if (action === 'filter') this.faction = key!;
      if (action === 'select') { this.actions.select(key!); this.notice = ''; }
      if (action === 'choose') { this.actions.choose(key as TowerKey); this.close(); return; }
      if (action === 'equip') {
        const skill = key as SkillKey;
        this.notice = this.actions.equip(skill) ? `${SKILL_DEFS[skill].name} 장착 완료. 적을 만나면 자동으로 사용합니다.` : '장착할 유닛과 보유 미네랄을 확인해 주세요.';
      }
      this.render();
      const next = this.dialog.querySelector<HTMLButtonElement>(`button[data-action="${action}"][data-key="${key}"]`);
      if (next && !next.disabled) next.focus();
    });
  }

  open(tab: 'units' | 'skills' = 'units'): void {
    this.tab = tab; this.notice = ''; this.render();
    if (!this.dialog.open) this.dialog.showModal();
  }
  close(): void { if (this.dialog.open) this.dialog.close(); this.actions.close(); }
  destroy(): void { this.dialog.remove(); }

  private render(): void {
    const state = this.actions.state();
    const selected = state.units.find(u => u.id === state.selectedId);
    const unitCount = (k: TowerKey) => state.units.filter(u => u.k === k).length;
    const button = (action: string, key: string, label: string, active = false) =>
      `<button type="button" data-action="${action}" data-key="${key}" class="${active ? 'is-active' : ''}" aria-pressed="${active}">${label}</button>`;
    const roster = this.tab === 'skills' ? `<section class="shop-roster" aria-label="스킬을 장착할 유닛">
      <span>장착 대상</span>${state.units.length ? state.units.map(u => button('select', u.id,
        `${TOWER_DEFS[u.k].name} <small>Lv.${u.lvl} · 구역 ${u.id.split(',').map(n => +n + 1).join('-')} · ${u.skills.length}/${SKILL_SLOTS}</small>`, u.id === state.selectedId)).join('') : '<p>먼저 유닛을 구매해 전장에 배치하세요.</p>'}
      </section>` : '';
    const cards = this.tab === 'units' ? TOWER_KEYS.filter(k => this.faction === 'all' || TOWER_DEFS[k].faction === this.faction).map(k => {
      const d = TOWER_DEFS[k];
      return `<article class="shop-card unit-card ${d.faction}">
        <div class="shop-card-top"><span>${d.faction === 'terran' ? 'TERRAN' : 'PROTOSS'} / ${d.role}</span><b>◆ ${d.cost}</b></div>
        <div class="shop-unit-art"><img src="${this.images.get(k)}" alt="${d.name}" width="112" height="112"><span>${String(TOWER_KEYS.indexOf(k) + 1).padStart(2, '0')}</span></div>
        <h3>${d.name}</h3><p>${d.desc}</p>
        <div class="shop-unit-skills">${SKILL_KEYS.filter(skill => SKILL_DEFS[skill].unit === k).map(skill => `<span>${SKILL_DEFS[skill].icon} ${SKILL_DEFS[skill].name}</span>`).join('')}</div>
        <dl class="shop-stats"><div><dt>공격력</dt><dd>${d.dmg}</dd></div><div><dt>사거리</dt><dd>${d.range}</dd></div><div><dt>초당 공격</dt><dd>${(1 / d.rate).toFixed(1)}</dd></div></dl>
        <div class="shop-card-note">전용 스킬 2종 <span>배치 ${unitCount(k)}기</span></div>
        <button type="button" class="shop-purchase" data-action="choose" data-key="${k}" ${state.gold < d.cost ? 'disabled' : ''}>${state.gold < d.cost ? `미네랄 ${d.cost - state.gold} 부족` : `구매 · 배치  ◆ ${d.cost}`}</button>
      </article>`;
    }).join('') : SKILL_KEYS.filter(k => !selected || SKILL_DEFS[k].unit === selected.k).map(k => {
      const d = SKILL_DEFS[k], owned = selected?.skills.some(s => s.key === k);
      const full = !!selected && selected.skills.length >= SKILL_SLOTS;
      const canBuy = !!selected && !owned && !full && state.gold >= d.cost;
      const label = owned ? '✓ 장착됨 · 자동 사용' : !selected ? '장착할 유닛을 선택하세요' : full ? '스킬 슬롯이 가득 찼습니다' : state.gold < d.cost ? `미네랄 ${d.cost - state.gold} 부족` : `스킬 장착  ◆ ${d.cost}`;
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
      <nav class="shop-tabs" aria-label="상점 메뉴">${button('tab', 'units', '유닛 보급 <small>08</small>', this.tab === 'units')}${button('tab', 'skills', '자동 스킬 <small>16</small>', this.tab === 'skills')}<span>구매 → 배치 → 스킬 장착</span></nav>
      <div class="shop-content">
        ${this.tab === 'units' ? `<div class="shop-filter">${button('filter', 'all', '전체 유닛', this.faction === 'all')}${button('filter', 'terran', '테란', this.faction === 'terran')}${button('filter', 'protoss', '프로토스', this.faction === 'protoss')}<span>미네랄은 전장에 배치할 때 차감됩니다.</span></div>` : `${roster}<div class="shop-skill-context">${selected ? `<img src="${this.images.get(selected.k)}" alt="" width="54" height="54"><div><b>${TOWER_DEFS[selected.k].name} <span>Lv.${selected.lvl}</span></b><p>장착 ${selected.skills.length}/${SKILL_SLOTS} · 스킬은 적이 사거리 안에 있을 때 자동 사용</p></div>` : '<div><b>유닛을 선택하면 전용 스킬을 구매할 수 있습니다.</b><p>같은 종류의 유닛도 스킬은 각각 장착합니다. 아래는 전체 스킬 목록입니다.</p></div>'}</div>`}
        ${this.notice ? `<p class="shop-notice" role="status">✓ ${this.notice}</p>` : ''}
        <div class="shop-grid ${this.tab === 'skills' && selected ? 'focused-skills' : ''}">${cards}</div>
      </div>
      <footer class="shop-footer"><span>유닛당 스킬 2개 · 추가 조작 없이 자동 발동 · 회수 시 스킬 비용도 70% 환급</span><button type="button" data-action="close">전장 복귀 <kbd>ESC</kbd></button></footer>`;
  }
}

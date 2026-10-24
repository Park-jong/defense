export interface TowerDef {
  name: string; cost: number; range: number; dmg: number; rate: number;
  color: number; proj: number; barrel: number; desc: string;
  faction: Faction; role: string;
  splash?: number; slow?: number;
}

export const FACTIONS = { terran: { name: '테란', color: '#9bc4b5' }, protoss: { name: '프로토스', color: '#e4c777' } };
export type Faction = keyof typeof FACTIONS;

export const TOWER_DEFS = {
  arrow:  { name: '미사일 터렛', faction: 'terran', role: '속사 / 방어', cost: 50, range: 120, dmg: 10, rate: .45, color: 0x8b9e76, proj: 0xffe8a3, barrel: 20, desc: '쌍열 미사일 발사대. 저렴한 비용으로 빠르게 방어선을 구축합니다.' },
  cannon: { name: '시즈 탱크', faction: 'terran', role: '포격 / 범위', cost: 100, range: 110, dmg: 32, rate: 1.3, color: 0xc15254, proj: 0xffb15b, barrel: 20, splash: 55, desc: '지지대를 펼쳐 고정한 중장갑 전차. 긴 주포의 고폭탄으로 밀집한 적에게 범위 피해를 줍니다.' },
  frost:  { name: '포톤 캐논', faction: 'protoss', role: '제어 / 둔화', cost: 75, range: 100, dmg: 4, rate: .8, color: 0x65a9b8, proj: 0x8deaff, barrel: 16, slow: .5, desc: '광자 에너지가 적의 이동 속도를 2초간 50% 감소시킵니다.' },
  sniper: { name: '드라군', faction: 'protoss', role: '저격 / 고위력', cost: 150, range: 260, dmg: 95, rate: 2.2, color: 0xa395bd, proj: 0x7fbdff, barrel: 30, desc: '긴 사거리와 강한 위상 분열포로 강력한 적을 제압합니다.' },
  marine: { name: '마린', faction: 'terran', role: '보병 / 속사', cost: 65, range: 140, dmg: 8, rate: .22, color: 0x7897b8, proj: 0xffeb9c, barrel: 17, desc: '가우스 소총을 연사하는 보병. 전투 자극제로 화력을 끌어올립니다.' },
  firebat: { name: '파이어뱃', faction: 'terran', role: '화염 / 범위', cost: 110, range: 88, dmg: 14, rate: .4, splash: 32, color: 0xc54437, proj: 0xff9a45, barrel: 28, desc: '붉은 중장갑과 연료통을 갖춘 화염 보병. 양팔의 화염방사기를 겨눠 몰려오는 적을 태웁니다.' },
  templar: { name: '아칸', faction: 'protoss', role: '에너지 / 범위 공격', cost: 190, range: 160, dmg: 22, rate: 1.2, color: 0x54bdff, proj: 0x9cefff, barrel: 12, splash: 48, desc: '푸른 에너지에 둘러싸인 사이오닉 전사. 플라즈마를 방출해 반경 48의 적을 함께 타격합니다.' },
  cruiser: { name: '배틀크루저', faction: 'terran', role: '중화력 / 범위', cost: 300, range: 230, dmg: 72, rate: .8, splash: 55, color: 0xa2b4c2, proj: 0xff8a76, barrel: 24, desc: '장거리 레이저 포격으로 밀집한 적을 제압하는 전투순양함. 야마토 포는 보스를 우선 공격하며, 융단 폭격으로 전선을 정리합니다.' },
  bunker: { name: '벙커', faction: 'terran', role: '주둔 / 보병 4기', cost: 40, range: 0, dmg: 0, rate: 1, color: 0x8f9d76, proj: 0xffe8a3, barrel: 0, desc: '빈 벙커는 공격하지 않습니다. 마린·파이어뱃 최대 4기 탑승, 각 병력의 사거리 +24. 스킬도 자동 사용합니다.' },
  support: { name: '사이언스 베슬', faction: 'terran', role: '과학선 / 전술 지원', cost: 160, range: 145, dmg: 0, rate: 1, color: 0x81cead, proj: 0x81cead, barrel: 0, desc: '테란 과학선. 범위 내 다른 병력의 공격 속도를 20% 높입니다. 강화당 추가 5%. 같은 지원 효과는 중첩되지 않습니다.' },
  observer: { name: '옵저버', faction: 'protoss', role: '정찰선 / 약점 노출', cost: 175, range: 170, dmg: 0, rate: 1.4, color: 0xc4a1ff, proj: 0xc4a1ff, barrel: 0, desc: '프로토스 정찰선. 사거리 내 적 하나의 약점을 3초간 노출해 받는 피해를 35% 높입니다. 직접 공격하지 않습니다.' },
  ghost: { name: '고스트', faction: 'terran', role: '저격 / 락다운', cost: 140, range: 240, dmg: 42, rate: 1.2, color: 0x91b4bd, proj: 0xd8f3e9, barrel: 28, desc: '장거리 C-10 저격 소총을 사용하는 특수 요원. 락다운으로 적의 진격을 저지합니다.' },
  goliath: { name: '골리앗', faction: 'terran', role: '보행 병기 / 쌍열 기관포', cost: 145, range: 170, dmg: 28, rate: .65, color: 0xa1b3a1, proj: 0xffd18b, barrel: 24, desc: '두 팔의 기관포를 동시에 발사하는 보행 병기. 헬파이어 미사일로 밀집한 적을 타격합니다.' },
  zealot: { name: '질럿', faction: 'protoss', role: '근접 / 사이오닉 검', cost: 80, range: 78, dmg: 26, rate: .6, color: 0xe4bc67, proj: 0x8deaff, barrel: 12, desc: '양팔의 사이오닉 검으로 가까운 적을 즉시 베는 전사. 짧은 사거리에서 빠르고 강하게 공격합니다.' },
  highTemplar: { name: '하이 템플러', faction: 'protoss', role: '마법 / 사이오닉 스톰', cost: 170, range: 195, dmg: 22, rate: 2.8, splash: 75, color: 0xc3a0ee, proj: 0xa6c7ff, barrel: 0, desc: '일반 무기 대신 사이오닉 스톰을 자동 시전합니다. 표적 위치에 2초간 남는 폭풍으로 0.5초마다 피해를 줍니다.' },
  reaver: { name: '리버', faction: 'protoss', role: '공성 / 스캐럽', cost: 250, range: 225, dmg: 85, rate: 2.2, splash: 72, color: 0xd5b768, proj: 0xffe3a2, barrel: 20, desc: '스캐럽을 발사하는 중장갑 로봇. 느리지만 넓은 폭발 범위와 강한 한 발로 밀집한 적을 분쇄합니다.' },
  scout: { name: '스카우트', faction: 'protoss', role: '전투기 / 쌍열 광자포', cost: 200, range: 195, dmg: 32, rate: .8, color: 0x7fa8e3, proj: 0x9bdcff, barrel: 25, desc: '황금 날개를 펼친 프로토스 전투기. 쌍열 광자포와 미사일 일제 사격으로 전선을 지원합니다.' },
  carrier: { name: '캐리어', faction: 'protoss', role: '주력함 / 인터셉터', cost: 350, range: 245, dmg: 10, rate: .8, color: 0xe7c77d, proj: 0x9deaff, barrel: 25, desc: '4기의 인터셉터를 동시에 출격시키는 프로토스 주력함. 각 요격기가 독립적으로 표적을 추적합니다.' },
} satisfies Record<string, TowerDef>;

export type TowerKey = keyof typeof TOWER_DEFS;
export const TOWER_KEYS = Object.keys(TOWER_DEFS) as TowerKey[];
/** The command card and shop share the same nine slots and keyboard order. Legacy unit keys stay stable for saves. */
export const FACTION_TOWERS: Record<Faction, TowerKey[]> = {
  terran: ['arrow', 'cannon', 'marine', 'firebat', 'ghost', 'goliath', 'cruiser', 'bunker', 'support'],
  protoss: ['frost', 'sniper', 'zealot', 'highTemplar', 'templar', 'reaver', 'scout', 'carrier', 'observer'],
};

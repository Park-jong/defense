const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { createSourceLoader } = require('./helpers/load-source.cjs');

// 증강 모드의 프리즘 증강을 실제 규칙과 게임 씬으로 확인한다. Phaser·그림·DOM만 대체한다.
const load = createSourceLoader({
  './missionResult': { showMissionResult: () => () => {} },
  phaser: { Scene: class {} },
  './unitArt': { UNIT_WORLD_SCALE: {} },
  ...Object.fromEntries(['./shop', './textures', './ui', './operations'].map(name => [name, {}])),
});
const rules = load('./campaign'), config = load('./config'), aug = load('./augments'), { GameScene } = load('./GameScene');
const { createMapRuntime } = load('./game/map');
function sprite(x = 0, y = 0) {
  const s = { x, y, visible: true, tint: 0xffffff };
  for (const k of ['setDepth', 'setOrigin', 'setScale', 'setFrame', 'setRotation', 'setStrokeStyle', 'setAlpha', 'setLetterSpacing', 'setInteractive', 'on', 'destroy', 'setText']) s[k] = () => s;
  s.setPosition = (x, y) => { s.x = x; s.y = y; return s; };
  s.setVisible = v => { s.visible = v; return s; };
  s.setTint = t => { s.tint = t; return s; }; s.clearTint = () => s;
  return s;
}
function setup(augments = [], mode = 'augment') {
  const s = new GameScene();
  s.options = { ...rules.DEFAULT_OPTIONS, mode }; s.map = createMapRuntime('frontier', config.MAP_Y); s.gold = 100000;
  s.add = { image: sprite, circle: sprite, rectangle: sprite, text: sprite };
  s.tweens = { add() {}, killTweensOf() {} }; s.fxPlace = s.fxBoom = s.fxDie = s.fxFrost = { explode() {} };
  s.banner = s.floatText = s.skillRing = s.skillBeam = s.shakeAll = s.archonBurst = () => {};
  s.uiCam = { flash() {} }; s.input = { enabled: true }; s.pauseTxt = sprite(); s.audio = { play() {} };
  s.augments = [...augments]; aug.setActiveAugments(augments);
  return s;
}
const place = (s, key, c = 6, r = 1) => { s.building = key; s.placeTower(c, r); return s.towers.at(-1); };
function spawn(s, type = 'grunt', x = 300, y = 176) { s.spawn(type); const e = s.enemies.at(-1); e.x = x; e.y = y; e.shield = 0; return e; }
const sequence = values => { let i = 0; return () => values[i++ % values.length]; };
afterEach(() => aug.setActiveAugments([]));

test('증강 후보는 카드마다 등급을 굴리고, 출현한 증강과 같은 선택지 안의 중복을 다시 내지 않는다', () => {
  const all = () => true, offer = aug.augmentOffer(10, new Set(['factory', 'yamato']), all, sequence([.99, 0]));
  assert.equal(offer.cards.length, 3); assert.equal(new Set(offer.cards).size, 3);
  assert.ok(!offer.cards.includes('factory') && !offer.cards.includes('yamato'));
  assert.deepEqual(offer.rerolled, [false, false, false]);
  // 굴린 등급(실버)이 바닥나면 가까운 등급(골드)으로 넘어간다.
  const silvers = new Set(aug.AUGMENT_KEYS.filter(k => aug.AUGMENTS[k].tier === 'silver'));
  assert.equal(aug.AUGMENTS[aug.drawAugment(10, new Set(), all, sequence([0, 0]))].tier, 'silver');
  assert.equal(aug.AUGMENTS[aug.drawAugment(10, silvers, all, sequence([0, 0]))].tier, 'gold');
  const seen = new Set(aug.AUGMENT_KEYS.slice(0, -1));
  assert.deepEqual(aug.augmentOffer(30, seen, all).cards, [aug.AUGMENT_KEYS.at(-1)]);
  assert.equal(aug.drawAugment(30, new Set(aug.AUGMENT_KEYS), all), null);
  assert.deepEqual(aug.TIER_ODDS[10], [.55, .35, .1]);
});

test('종족 특화 증강은 그 종족을 보급 중이거나 그 종족 병력이 있을 때만 후보가 된다', () => {
  assert.equal(aug.augmentEligible('aiur', 'terran', ['marine']), false);
  assert.equal(aug.augmentEligible('aiur', 'terran', ['zealot']), true);
  assert.equal(aug.augmentEligible('yamato', 'terran', []), true);
  assert.equal(aug.augmentEligible('inflation', 'protoss', []), true);
});

test('10·20·30웨이브 클리어 뒤에만 증강 선택지가 열리고, 고르기 전에는 다음 웨이브를 시작할 수 없다', () => {
  const s = setup(); s.recordWave = () => {}; s.saveCheckpoint = () => {};
  for (const w of [9, 10]) {
    s.wave = w; s.waveActive = true; s.spawnQ = []; s.enemies = []; s.lives = 20; s.step(.01);
    assert.equal(!!s.augmentOffer, w === 10);
  }
  assert.equal(s.augmentOffer.cards.length, 3); assert.deepEqual(s.augmentSeen, s.augmentOffer.cards);
  s.pending = []; s.startWave(); assert.equal(s.waveActive, false);
  const first = s.augmentOffer.cards[0];
  assert.ok(s.rerollAugment(0)); assert.notEqual(s.augmentOffer.cards[0], first); assert.equal(s.rerollAugment(0), false);
  assert.ok(s.augmentSeen.includes(first)); assert.equal(s.augmentSeen.length, 4);
  const pick = s.augmentOffer.cards[1]; s.pickAugment(pick);
  assert.deepEqual(s.augments, [pick]); assert.equal(s.augmentOffer, null);
});

test('인플레이션은 모든 비용과 판매 환급을 2배로, 병력 피해를 4배로 만들지만 사령관 지원은 그대로다', () => {
  const s = setup(['inflation']), gold = s.gold, t = place(s, 'marine');
  assert.equal(gold - s.gold, config.TOWER_DEFS.marine.cost * 2); assert.equal(t.spent, config.TOWER_DEFS.marine.cost * 2);
  assert.equal(aug.relocateCost('marine'), 40); assert.equal(aug.branchCost('marine'), config.TOWER_DEFS.marine.cost * 2);
  // 병력 피해 4배는 표시 공격력(stats)에 들어가 그대로 적에게 맞고, 사령관 지원 피해에는 붙지 않는다.
  const st = s.stats(t); assert.equal(st.dmg, config.TOWER_DEFS.marine.dmg * 4);
  const e = spawn(s); e.hp = e.max = 1000; s.damageEnemy(e, st.dmg, 'normal', t.id); assert.equal(e.hp, 1000 - st.dmg);
  s.damageEnemy(e, 10, 'skill', 'commander'); assert.equal(e.hp, 990 - st.dmg);
  const before = s.gold; s.selected = t; s.sell(); assert.equal(s.gold - before, Math.round(config.TOWER_DEFS.marine.cost * 2 * .7));
});

test('군수 공장은 배치·강화 비용만 25% 깎는다', () => {
  setup(['factory']);
  assert.equal(aug.placeCost('marine'), Math.round(config.TOWER_DEFS.marine.cost * .75));
  assert.equal(aug.skillCost('stim'), load('./catalog').SKILL_DEFS.stim.cost);
});

test('내 목숨을 아이어에는 질럿을 일반 환급으로 팔고, 이후 질럿을 3배 비용·사거리 +100·사거리 안 범위 공격으로 바꾼다', () => {
  const s = setup(), z = place(s, 'zealot'), refund = Math.round(z.spent * .7), gold = s.gold;
  s.augmentOffer = { cards: ['aiur'], rerolled: [false] }; s.saveCheckpoint = () => {}; s.pickAugment('aiur');
  assert.equal(s.towers.length, 0); assert.equal(s.gold - gold, refund);
  assert.equal(aug.placeCost('zealot'), config.TOWER_DEFS.zealot.cost * 3);
  const again = place(s, 'zealot'), st = s.stats(again);
  assert.equal(st.range, s.stats({ k: 'zealot', lvl: 1, c: again.c, r: again.r }).range);
  assert.ok(st.range >= config.TOWER_DEFS.zealot.range + 100);
  const near = spawn(s, 'grunt', again.x + 60, again.y), far = spawn(s, 'grunt', again.x + st.range + 40, again.y);
  near.hp = near.max = far.hp = far.max = 100000;
  const other = spawn(s, 'grunt', again.x, again.y + 120); other.hp = other.max = 100000;
  s.fire(again, near, st);
  assert.ok(near.hp < 100000 && other.hp < 100000); assert.equal(far.hp, 100000);
  assert.equal(st.dmg, config.TOWER_DEFS.zealot.dmg * 4); assert.equal(100000 - near.hp, st.dmg);
});

test('야마토 프로토콜은 기본 공격을 사거리 끝까지 폭 0.7칸의 관통 포격으로 바꾸고 보스에게 2배, 스킬은 막는다', () => {
  const s = setup(['yamato']), t = place(s, 'cruiser'), st = s.stats(t), half = aug.YAMATO_WIDTH * config.T / 2;
  const mk = (type, dx, dy) => { const e = spawn(s, type, t.x + dx, t.y + dy); e.hp = e.max = 1e7; return e; };
  const front = mk('grunt', 60, 0), edge = mk('grunt', st.range - 5, half - 1), wide = mk('grunt', 90, half + 4), past = mk('grunt', st.range + 20, 0), boss = mk('boss', 120, 0);
  s.fire(t, front, st);
  assert.equal(1e7 - front.hp, st.dmg); assert.ok(edge.hp < 1e7);
  assert.equal(wide.hp, 1e7); assert.equal(past.hp, 1e7); assert.equal(1e7 - boss.hp, st.dmg * 2);
  assert.equal(aug.skillLocked('cruiser'), true); assert.equal(s.equipSkill('yamato', t.id), false);
});

test('젤나가 맙소사는 프로토스 피해를 2배로 하고, 고른 뒤 5의 배수 웨이브마다 보스의 80% 아몬을 보낸다', () => {
  const s = setup(['xelnaga']), z = place(s, 'zealot'), m = place(s, 'marine', 7, 1);
  const e = spawn(s); e.hp = e.max = 1000;
  assert.equal(s.stats(z).dmg, config.TOWER_DEFS.zealot.dmg * 2); assert.equal(s.stats(m).dmg, config.TOWER_DEFS.marine.dmg);
  s.amonSince = 10;
  assert.equal(aug.amonDue(10, 10), false); assert.equal(aug.amonDue(15, 10), true); assert.equal(aug.amonDue(20, 10), true); assert.equal(aug.amonDue(15, null), false);
  s.wave = 19; s.startWave(); assert.equal(s.spawnQ.at(-1), 'amon'); assert.ok(s.spawnQ.includes('boss'));
  s.enemies = []; s.wave = 20; s.spawnAmon(); const amon20 = s.enemies.at(-1);
  assert.ok(amon20.amon); assert.equal(amon20.reward, 0);
  assert.ok(Math.abs(amon20.max - s.enemyHp('boss', 20) * .8) < 1e-6);
  s.wave = 15; s.spawnAmon(); const amon15 = s.enemies.at(-1);
  assert.ok(Math.abs(amon15.max - Math.sqrt(s.enemyHp('boss', 10) * s.enemyHp('boss', 20)) * .8) < 1e-6);
  assert.ok(Math.abs(amon15.shield - amon15.max * .09) < 1e-6);
});

test('아몬을 놓치면 즉시 패배하지 않고 기지 내구도가 5 줄어든다', () => {
  const s = setup(['xelnaga']); s.wave = 20; s.lives = 20; s.spawnAmon();
  const amon = s.enemies.at(-1), route = amon.route; amon.seg = route.length - 1; amon.x = route.at(-1).x - 1; amon.y = route.at(-1).y;
  s.waveActive = true; s.spawnQ = []; s.step(.1);
  assert.equal(s.lives, 15); assert.equal(s.bossLeaked, false); assert.equal(s.runStats.lost, 5);
});

test('이중 특화는 두 갈래를 모두 고르게 하고 두 효과를 함께 적용한다', () => {
  const s = setup(['dualBranch']), t = place(s, 'marine'); t.lvl = 3; s.selected = t; s.saveCheckpoint = () => {};
  const base = s.stats(t);
  assert.ok(s.specialize('power')); assert.equal(s.specialize('power'), false); assert.ok(s.specialize('rapid'));
  assert.equal(t.branch, 'both'); assert.equal(s.specialize('rapid'), false);
  const st = s.stats(t);
  assert.ok(Math.abs(st.dmg - base.dmg * 1.15) < 1e-6); assert.ok(Math.abs(st.rate - base.rate * .6) < 1e-6);
  aug.setActiveAugments([]); const plain = setup(), u = place(plain, 'marine'); u.lvl = 3; plain.selected = u; plain.saveCheckpoint = () => {};
  assert.ok(plain.specialize('power')); assert.equal(plain.specialize('rapid'), false);
});

test('정예 소대는 병력 6기 이하에서만 공격력·공격 속도 +60%다', () => {
  const s = setup(['elite']), t = place(s, 'marine');
  assert.equal(aug.damageMultiplier('marine', s.army()), 1.6);
  const fast = s.stats(t).rate;
  for (let c = 7; c <= 12; c++) place(s, 'marine', c, 1);
  assert.equal(s.armySize(), 7); assert.equal(aug.damageMultiplier('marine', { size: 7, terran: 7, protoss: 0 }), 1);
  assert.ok(Math.abs(s.stats(t).rate - fast * 1.6) < 1e-6);
});

test('궤도 연사는 궤도 폭격을 0.8초 뒤 한 번 더 떨어뜨리고, 폭풍의 눈은 웨이브 첫 사이오닉 스톰 2회를 대기 없이 쏜다', () => {
  const s = setup(['orbital', 'storm']); s.waveActive = true;
  const e = spawn(s); e.hp = e.max = 1000;
  s.useCommander('strike'); assert.equal(e.hp, 700);
  s.step(.5); assert.equal(e.hp, 700); s.step(.4); assert.equal(e.hp, 400);
  s.enemies = []; s.waveActive = false;
  const h = place(s, 'highTemplar'); h.skills.push({ key: 'psionicStorm', cd: 30 });
  s.wave = 3; s.startWave(); assert.equal(h.stormFree, 2); assert.equal(h.skills[0].cd, 0);
});

test('증강 상태는 저장 검증을 통과하고 잘못된 증강 값은 거부한다', () => {
  const save = { version: 1, options: { ...rules.DEFAULT_OPTIONS, mode: 'augment' }, wave: 10, gold: 100, lives: 20, units: [],
    bonuses: { power: 0, haste: 0, range: 0 }, stats: rules.newStats(), commander: { strike: 0, slow: 0, supply: 0 },
    pending: [], rewarded: 10, tutorial: 4, usedKinds: [], augments: ['xelnaga'], augmentSeen: ['xelnaga', 'aiur', 'orbital', 'elite'],
    augmentOffer: { cards: ['factory', 'storm'], rerolled: [true, false] }, amonSince: 10 };
  assert.ok(rules.validateSave(save));
  assert.equal(rules.validateSave({ ...save, augments: ['nope'] }), false);
  assert.equal(rules.validateSave({ ...save, augmentOffer: { cards: ['factory'], rerolled: [] } }), false);
  assert.equal(rules.validateSave({ ...save, amonSince: 99 }), false);
});

test('현상금 사냥은 특수 적 처치 보상을 3배로, 선행 투자는 즉시 400과 함께 클리어 보너스를 절반으로 만든다', () => {
  const s = setup(['bounty']); s.wave = 12;
  const medic = spawn(s, 'medic'), grunt = spawn(s, 'grunt'), base = config.ENEMY_DEFS.medic.reward + 3;
  assert.equal(medic.reward, base * 3); assert.equal(grunt.reward, config.ENEMY_DEFS.grunt.reward + 3);
  const t = setup(), gold = t.gold; t.augmentOffer = { cards: ['investment'], rerolled: [false] }; t.saveCheckpoint = () => {};
  t.pickAugment('investment'); assert.equal(t.gold - gold, 400); assert.equal(aug.clearBonusMultiplier(), .5);
});

test('요새화는 이미 지은 벙커까지 사격구를 6칸으로 늘리고 주둔 보병 사거리를 +30 한다', () => {
  const s = setup(), b = place(s, 'bunker'); s.saveCheckpoint = () => {};
  for (let i = 0; i < 4; i++) assert.ok(s.recruit(b.id, i, 'marine'));
  assert.equal(s.boardingSlot(b.id, 4), undefined);
  const before = s.stats(b.passengers[0]).range;
  s.augmentOffer = { cards: ['fortress'], rerolled: [false] }; s.pickAugment('fortress');
  assert.equal(b.passengers.length, 6); assert.ok(s.recruit(b.id, 5, 'firebat')); assert.equal(b.passengers[5].k, 'firebat');
  assert.equal(s.stats(b.passengers[0]).range, before + 30);
  assert.equal(place(s, 'bunker', 9, 1).passengers.length, 6);
});

test('시즈 모드 확장과 확장 격납고는 해당 병력의 사거리·범위·인터셉터를 바꾼다', () => {
  const plain = setup(), tank = place(plain, 'cannon'), reaver = place(plain, 'reaver', 8, 1), a = plain.stats(tank), r = plain.stats(reaver);
  aug.setActiveAugments(['siegeMode', 'hangar']);
  const b = plain.stats(tank);
  assert.equal(b.range, a.range + 60); assert.ok(Math.abs(b.splash - a.splash * 1.3) < 1e-9); assert.ok(Math.abs(b.rate - a.rate * 1.2) < 1e-9);
  assert.ok(Math.abs(plain.stats(reaver).splash - r.splash * 1.4) < 1e-9);
  const carrier = place(plain, 'carrier', 10, 1), e = spawn(plain); e.hp = e.max = 1e7; plain.projs = [];
  plain.fire(carrier, e, plain.stats(carrier)); assert.equal(plain.projs.length, config.TOWER_DEFS.carrier.attackCount + 4);
});

test('연합 전선·단일 혈통·유리 대포는 병력 구성과 함께 피해 배율을 바꾸고, 유리 대포는 기지 내구도를 10으로 낮춘다', () => {
  setup(['alliance']);
  assert.equal(aug.damageMultiplier('marine', { size: 6, terran: 3, protoss: 3 }), 1.2);
  assert.equal(aug.damageMultiplier('marine', { size: 5, terran: 3, protoss: 2 }), 1);
  aug.setActiveAugments(['pureBlood']);
  assert.equal(aug.damageMultiplier('zealot', { size: 4, terran: 0, protoss: 4 }), 1.3);
  assert.equal(aug.damageMultiplier('zealot', { size: 5, terran: 1, protoss: 4 }), 1);
  const s = setup(); s.lives = 18; s.augmentOffer = { cards: ['glassCannon'], rerolled: [false] }; s.saveCheckpoint = () => {};
  s.pickAugment('glassCannon'); assert.equal(s.lives, 10); assert.equal(aug.maxLives(), 10);
  assert.equal(aug.damageMultiplier('marine', { size: 1, terran: 1, protoss: 0 }), 1.5);
  s.pending = ['repair']; s.wave = 5; s.rewarded = 0; s.lives = 8; s.takeReward('repair'); assert.equal(s.lives, 10);
});

test('숙련병은 최대 레벨을 7로 올리고 강화 비용을 30% 늘린다', () => {
  const plain = setup(), t = place(plain, 'marine'); t.lvl = 5;
  const base = load('./management').unitUpgradeCost({ k: 'marine', lvl: 5 });
  assert.equal(plain.upgradeUnit(t.id), false);
  aug.setActiveAugments(['veteran']); plain.augments = ['veteran'];
  assert.equal(load('./management').unitUpgradeCost({ k: 'marine', lvl: 5 }), Math.round(base * 1.3));
  assert.ok(plain.upgradeUnit(t.id)); assert.ok(plain.upgradeUnit(t.id)); assert.equal(t.lvl, 7); assert.equal(plain.upgradeUnit(t.id), false);
});

test('지휘 과부하는 재사용 대기시간을 40% 줄이고 쓸 때마다 기지 내구도 1을 쓰며, 정지장은 시간 교란을 완전 정지로 바꾼다', () => {
  const s = setup(['overload', 'stasis']); s.waveActive = true; s.lives = 5;
  const e = spawn(s), boss = spawn(s, 'boss');
  s.useCommander('slow');
  assert.equal(s.commander.slow, rules.COMMANDERS.slow.cooldown * .6); assert.equal(s.lives, 4);
  assert.equal(e.stunT, 3); assert.equal(boss.stunT, 1); assert.equal(e.slow, 1);
  s.lives = 1; s.useCommander('strike'); assert.equal(s.commander.strike, 0); assert.equal(s.lives, 1);
});

test('왕관 사냥꾼은 보스에게 주는 병력 피해를 30% 늘리고 보스 보호막 재생을 절반으로 줄인다', () => {
  const s = setup(['crownHunter']), t = place(s, 'marine'); s.wave = 10;
  const boss = spawn(s, 'boss'); boss.hp = boss.max = 1000;
  s.damageEnemy(boss, 10, 'normal', t.id); assert.equal(boss.hp, 987);
  boss.pulse = 0; boss.age = 0; boss.shield = 0; s.enemyAct(boss, .1); assert.ok(Math.abs(boss.shield - boss.max * .09) < 1e-9);
});

test('내 목숨을 아이어에 이후 질럿은 전장에 1기만 배치할 수 있고, 판매하면 다시 배치할 수 있다', () => {
  const s = setup(['aiur']), first = place(s, 'zealot'), gold = s.gold;
  assert.ok(first); assert.equal(s.building, null);
  s.building = 'zealot'; s.placeTower(8, 1);
  assert.equal(s.towers.filter(t => t.k === 'zealot').length, 1); assert.equal(s.gold, gold);
  s.chooseBuild('zealot'); assert.equal(s.building, null);
  s.selected = first; s.sell(); assert.ok(place(s, 'zealot', 8, 1));
  aug.setActiveAugments([]); const plain = setup(); place(plain, 'zealot'); place(plain, 'zealot', 8, 1);
  assert.equal(plain.towers.length, 2);
});

test('실버 7종이 모두 정의되어 있고 등급별 수는 실버 7·골드 12·프리즘 9다', () => {
  const count = t => aug.AUGMENT_KEYS.filter(k => aug.AUGMENTS[k].tier === t).length;
  assert.deepEqual([count('silver'), count('gold'), count('prism')], [7, 12, 9]);
});

test('전시 채권은 웨이브 시작 때 보유 미네랄의 10%(최대 100)를, 고철 회수는 판매 때 투자액 전액을 돌려준다', () => {
  const s = setup(['bonds']); s.gold = 650; s.wave = 3; s.startWave(); assert.equal(s.gold, 715);
  const rich = setup(['bonds']); rich.gold = 5000; rich.wave = 3; rich.startWave(); assert.equal(rich.gold, 5100);
  aug.setActiveAugments(['scrap']); const t = setup(['scrap']), m = place(t, 'marine'), gold = t.gold;
  t.selected = m; t.sell(); assert.equal(t.gold - gold, config.TOWER_DEFS.marine.cost);
});

test('보병 교리·물량 공세·최후의 저항은 조건에 맞는 병력의 피해를 올린다', () => {
  setup(['infantry']);
  assert.equal(aug.damageMultiplier('marine', { size: 1, terran: 1, protoss: 0 }), 1.25);
  assert.equal(aug.damageMultiplier('cannon', { size: 1, terran: 1, protoss: 0 }), 1);
  aug.setActiveAugments(['mass']);
  assert.equal(aug.damageMultiplier('marine', { size: 2, terran: 2, protoss: 0, kinds: { marine: 2 } }), 1);
  assert.ok(Math.abs(aug.damageMultiplier('marine', { size: 7, terran: 7, protoss: 0, kinds: { marine: 7 } }) - 1.2) < 1e-9);
  aug.setActiveAugments(['lastStand']);
  assert.equal(aug.damageMultiplier('marine', { size: 1, terran: 1, protoss: 0, lives: 6 }), 1);
  assert.equal(aug.damageMultiplier('marine', { size: 1, terran: 1, protoss: 0, lives: 5 }), 1.4);
  const s = setup(['lastStand']), t = place(s, 'marine'), e = spawn(s); e.hp = e.max = 1000; s.lives = 4;
  assert.ok(Math.abs(s.stats(t).dmg - config.TOWER_DEFS.marine.dmg * 1.4) < 1e-9); s.lives = 6; assert.equal(s.stats(t).dmg, config.TOWER_DEFS.marine.dmg);
});

test('물량 공세는 같은 유닛이 3기 모일 때마다 표시 공격력과 실제 피해를 함께 10%씩 올린다', () => {
  const s = setup(['mass']), marines = [];
  for (let c = 3; c < 10; c++) {
    marines.push(place(s, 'marine', c, 1));
    const scale = 1 + Math.floor(marines.length / 3) * .1, st = s.stats(marines[0]);
    assert.ok(Math.abs(st.dmg - config.TOWER_DEFS.marine.dmg * scale) < 1e-9);
    const e = spawn(s); e.hp = e.max = 1e6; s.damageEnemy(e, st.dmg, 'normal', marines[0].id); assert.ok(Math.abs(1e6 - e.hp - st.dmg) < 1e-6);
  }
  s.selected = marines[6]; s.sell(); assert.ok(Math.abs(s.stats(marines[0]).dmg - config.TOWER_DEFS.marine.dmg * 1.2) < 1e-9);
});

test('사이오닉 공명은 아칸 주변 150 안의 병력 공격 속도를, 약점 분석은 옵저버·베슬 범위 안 적의 피해를 15% 올린다', () => {
  const s = setup(), m = place(s, 'marine'), base = s.stats(m).rate;
  place(s, 'templar', 7, 1); aug.setActiveAugments(['resonance']);
  assert.ok(Math.abs(s.stats(m).rate - base / 1.15) < 1e-9);
  const a = setup(['analysis']), t = place(a, 'marine'), o = place(a, 'observer', 9, 1);
  const near = spawn(a, 'grunt', o.x, o.y + 40), far = spawn(a, 'grunt', o.x + 2000, o.y);
  near.hp = near.max = far.hp = far.max = 1000;
  a.damageEnemy(near, 100, 'normal', t.id); a.damageEnemy(far, 100, 'normal', t.id);
  assert.equal(1000 - near.hp, 115); assert.equal(1000 - far.hp, 100);
});

test('야마토 프로토콜은 관통 포격 5발째마다 공격력 1200%의 강화 포격을 쏜다(보스는 그 2배)', () => {
  const s = setup(['yamato']), t = place(s, 'cruiser'), st = s.stats(t);
  const grunt = spawn(s, 'grunt', t.x + 60, t.y), boss = spawn(s, 'boss', t.x + 100, t.y);
  grunt.hp = grunt.max = boss.hp = boss.max = 1e9;
  const hits = [];
  for (let i = 0; i < 10; i++) { const g = grunt.hp, b = boss.hp; s.fire(t, grunt, st); hits.push([g - grunt.hp, b - boss.hp]); }
  for (const [i, [g, b]] of hits.entries()) {
    const power = (i + 1) % 5 === 0 ? 12 : 1;
    assert.ok(Math.abs(g - st.dmg * power) < 1e-6); assert.ok(Math.abs(b - st.dmg * power * 2) < 1e-6);
  }
});

test('비밀 명령: show me the money는 미네랄을 10,000(상한 100,000), power overwhelming은 공격력을 2배(상한 10,000)로 올린다', () => {
  const s = setup(); s.audio = { play() {} };
  const commands = new Map(); s.registerCheats({ register: c => c.names.forEach(n => commands.set(n, c)) });
  s.gold = 50; commands.get('show me the money').run([]); assert.equal(s.gold, 10050);
  s.gold = 95000; commands.get('show me the money').run([]); assert.equal(s.gold, 100000);
  assert.match(commands.get('show me the money').run([]), /상한/); assert.equal(s.gold, 100000);
  const t = place(s, 'marine'), base = s.stats(t).dmg;
  commands.get('power overwhelming').run([]); assert.equal(s.stats(t).dmg, base * 2);
  t.lvl = 5; s.bonuses.power = 100; const strong = s.stats(t).dmg; assert.equal(strong, 10000);
  s.powerStacks = 0; const raw = s.stats(t).dmg; s.powerStacks = 1; assert.equal(s.stats(t).dmg, Math.max(raw, 10000));
  // 입력할 때마다 2배씩 중첩된다: 1회 ×2, 2회 ×4, 3회 ×8 (상한 10,000).
  t.lvl = 1; s.bonuses.power = 0; s.powerStacks = 0;
  for (const scale of [2, 4, 8]) { commands.get('power overwhelming').run([]); assert.equal(s.stats(t).dmg, base * scale); }
  for (let i = 0; i < 30; i++) commands.get('power overwhelming').run([]);
  assert.equal(s.stats(t).dmg, 10000); assert.equal(s.powerStacks, 20);
  assert.ok(commands.has('q1w2e3r4'));
});

test('치트를 쓴 작전은 웨이브 클리어와 작전 종료 때 업적·훈장·최고 기록을 남기지 않고, 이어하기에도 유지된다', () => {
  const s = setup('', 'standard'); s.audio = { play() {} }; s.testMode = false; s.persistProfile = () => {};
  s.profile = rules.readProfile({ getItem: () => null, setItem() {}, removeItem() {} });
  const commands = new Map(); s.registerCheats({ register: c => c.names.forEach(n => commands.set(n, c)) });
  commands.get('q1w2e3r4') && assert.equal(s.cheated, false);
  commands.get('show me the money').run([]); assert.equal(s.cheated, true);
  s.wave = 10; s.waveStart = { kills: 0, lost: 0, seconds: 0 }; s.recordWave();
  assert.deepEqual(s.profile.achievements, []); assert.equal(s.profile.bestWave, 0);
  const save = { version: 1, options: { ...rules.DEFAULT_OPTIONS }, wave: 10, gold: 100, lives: 20, units: [], bonuses: { power: 0, haste: 0, range: 0 }, stats: rules.newStats(),
    commander: { strike: 0, slow: 0, supply: 0 }, pending: [], rewarded: 10, tutorial: 4, usedKinds: [], cheated: true };
  assert.ok(rules.validateSave(save)); assert.equal(rules.validateSave({ ...save, cheated: 'yes' }), false);
});

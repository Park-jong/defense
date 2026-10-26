const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { createSourceLoader } = require('./helpers/load-source.cjs');
const load = createSourceLoader({
  phaser: { Scene: class {} }, './unitArt': { UNIT_WORLD_SCALE: {} },
  './missionResult': { showMissionResult: () => () => {} },
  ...Object.fromEntries(['./shop', './textures', './ui', './operations'].map(name => [name, {}])),
});
const { GameScene } = load('./GameScene'), rules = load('./campaign'), config = load('./config');
const aug = load('./augments'), { SPECIALIZATIONS, specializationEffects } = load('./specializations');
const { supportTraits, vesselAuraMultiplier } = load('./support');
function sprite(x = 0, y = 0) {
  const value = { x, y };
  for (const key of ['setDepth', 'setOrigin', 'setScale', 'setRotation', 'setVisible', 'setPosition', 'setTint', 'clearTint', 'setStrokeStyle', 'destroy']) value[key] = () => value;
  return value;
}
function setup(augments = []) {
  const s = new GameScene();
  s.gold = 100000; s.options = { ...rules.DEFAULT_OPTIONS, mode: 'augment' };
  s.add = { image: sprite, circle: sprite }; s.tweens = { add() {}, killTweensOf() {} };
  s.fxPlace = s.fxBoom = s.fxDie = s.fxFrost = { explode() {} };
  s.banner = s.floatText = s.skillRing = s.skillBeam = s.shakeAll = s.archonBurst = () => {};
  s.audio = { play() {}, impact() {} }; s.saveCheckpoint = () => {};
  aug.setActiveAugments(augments); s.augments = augments;
  return s;
}
function place(s, k, c = 6, r = 1) { s.building = k; s.placeTower(c, r); return s.towers.at(-1); }
function enemy(s, x, y) {
  s.spawn('tank'); const e = s.enemies.at(-1);
  Object.assign(e, { x, y, hp: 100000, max: 100000, shield: 0 }); return e;
}
function close(actual, expected) { assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`); }
afterEach(() => aug.setActiveAugments([]));

test('17종의 두 전용 특화가 레벨·주둔·이중 특화에서 유효한 전투 수치를 만든다', () => {
  assert.deepEqual(Object.keys(SPECIALIZATIONS).sort(), config.TOWER_KEYS.filter(k => k !== 'bunker').sort());
  assert.equal(new Set(Object.values(SPECIALIZATIONS).flatMap(pair => Object.values(pair).map(def => def.name))).size, 34);
  for (const k of Object.keys(SPECIALIZATIONS)) {
    const s = setup(), t = place(s, k);
    for (const lvl of [3, 5, 7]) for (const branch of ['power', 'rapid', 'both']) {
      t.lvl = lvl; t.branch = branch;
      const st = s.stats(t);
      for (const value of Object.values(st)) assert.ok(Number.isFinite(value) && value >= 0, `${k}/${branch}/${lvl}`);
      assert.ok(st.rate > 0 && st.range > 0);
    }
  }
});

test('공성 저격포는 일반 공격을 단일화하고 광역 포격진은 경계 안의 적만 타격한다', () => {
  const s = setup(), t = place(s, 'cannon'); t.lvl = 3;
  const base = s.stats(t), target = enemy(s, t.x + 60, t.y), next = enemy(s, target.x + 20, target.y);
  t.branch = 'power'; const single = s.stats(t);
  close(single.range, base.range + 80); close(single.dmg, base.dmg * 2.2); assert.equal(single.splash, 0);
  s.hit({ k: t.k, st: single, tgt: target, source: t.id });
  assert.ok(target.hp < target.max); assert.equal(next.hp, next.max);
  t.branch = 'rapid'; const area = s.stats(t);
  const boundary = enemy(s, target.x + area.splash - 1e-6, target.y), outside = enemy(s, target.x + area.splash + .01, target.y);
  s.hit({ k: t.k, st: area, tgt: target, source: t.id });
  assert.ok(next.hp < next.max && boundary.hp < boundary.max); assert.equal(outside.hp, outside.max);
});

test('주둔 사수·야전 돌격대는 탑승·하차 즉시 각 전투 조건을 반영한다', () => {
  for (const branch of ['power', 'rapid']) {
    const s = setup(), bunker = place(s, 'bunker'), t = place(s, 'marine', 7); t.lvl = 3;
    const base = s.stats(t); t.branch = branch; const field = s.stats(t);
    s.board(bunker.id, 0, t.id); assert.equal(t.host, bunker);
    const garrison = s.stats(t);
    if (branch === 'power') { close(field.dmg, base.dmg * 1.15); close(garrison.dmg, base.dmg * 1.8); close(garrison.range, base.range + 36 + 24); }
    else { close(field.rate, base.rate * .6); close(garrison.rate, base.rate * .85); close(field.range, base.range + 24); }
    s.beginUnload(t.id); s.finishUnload(8, 1);
    assert.equal(t.host, undefined); assert.deepEqual(s.stats(t), field);
  }
});

test('냉기 파동은 폭발 반경 안에만 둔화를 퍼뜨리고 절대 영도는 단일 4초 둔화를 준다', () => {
  const s = setup(), t = place(s, 'frost'); t.lvl = 3; t.branch = 'rapid';
  const target = enemy(s, t.x + 60, t.y), inside = enemy(s, target.x + 60, target.y), outside = enemy(s, target.x + 61, target.y);
  const st = s.stats(t); s.hit({ k: t.k, st, tgt: target, source: t.id });
  close(target.slow, .46); close(inside.slow, .46); assert.equal(inside.slowT, 2); assert.equal(outside.slow, 1);
  t.branch = 'power'; const precise = s.stats(t), only = enemy(s, target.x, target.y);
  s.hit({ k: t.k, st: precise, tgt: only, source: t.id });
  close(only.slow, .22); assert.equal(only.slowT, 4); assert.equal(precise.splash, 0);
});

test('회전 검무는 표적 주변만 베고 영속 폭풍은 실제 영역을 3초 유지한다', () => {
  const s = setup(), t = place(s, 'zealot'); t.lvl = 3; t.branch = 'rapid';
  const target = enemy(s, t.x + 30, t.y), inside = enemy(s, target.x + 58, target.y), outside = enemy(s, target.x + 59, target.y);
  s.fire(t, target, s.stats(t));
  assert.ok(target.hp < target.max && inside.hp < inside.max); assert.equal(outside.hp, outside.max);
  const caster = place(s, 'highTemplar', 8); caster.branch = 'power'; caster.lvl = 3;
  s.fire(caster, target, s.stats(caster)); assert.equal(s.fields[0].left, 3);
  const radius = s.fields[0].radius; caster.branch = 'rapid'; s.fire(caster, target, s.stats(caster));
  close(s.fields[1].radius, radius * 1.6); assert.equal(s.fields[1].left, 2);
});

test('EMP 전문선은 반경 96의 보호막을 75% 제거하고 4초 재사용을 지킨다', () => {
  const s = setup(), t = place(s, 'support'); t.lvl = 3; t.branch = 'rapid';
  const target = enemy(s, t.x + 40, t.y), inside = enemy(s, target.x + 96, target.y), outside = enemy(s, target.x + 97, target.y);
  for (const e of [target, inside, outside]) e.shield = 400;
  t.target = 'strong'; target.hp = target.max = 200000;
  s.towerAct(t, 0);
  assert.equal(target.shield, 100); assert.equal(inside.shield, 100); assert.equal(outside.shield, 400); assert.equal(t.cd, 4);
  s.towerAct(t, 1); assert.equal(target.shield, 100); assert.equal(t.cd, 3);
  s.selected = t; assert.match(s.commands()[2].detail, /4초.*96.*75%/); close(s.commands()[2].progress, .25);
  assert.equal(s.runStats.damage, 0);
});

test('전술 관제는 특화 보너스를 포함한 강한 오라 두 대만 적용하고 회수하면 사라진다', () => {
  const s = setup(), t = place(s, 'marine'), a = place(s, 'support', 7), b = place(s, 'support', 8), c = place(s, 'support', 9);
  a.lvl = b.lvl = c.lvl = 3; a.branch = 'power';
  const rate = load('./management').levelStats('marine', 1).rate;
  close(s.stats(t).rate, rate / 1.57);
  s.towers = s.towers.filter(t => t !== a); close(s.stats(t).rate, rate / 1.42);
  close(vesselAuraMultiplier([3, 3, 3], [.15, 0, 0]), 1.57);
  assert.match(supportTraits('support', 3, 'power')[0].text, /45%/);
});

test('정밀 관측은 같은 기체의 표식을 6초로 갱신하고 광역 정찰은 관측 주기를 줄인다', () => {
  const s = setup(), t = place(s, 'observer'); t.lvl = 3; t.branch = 'power';
  const target = enemy(s, t.x + 50, t.y); s.towerAct(t, 0);
  assert.equal(target.observations[0].left, 6); target.observations[0].left = 1;
  t.cd = 0; s.towerAct(t, 0); assert.equal(target.observations.length, 1); assert.equal(target.observations[0].left, 6);
  const base = s.stats({ ...t, branch: undefined }); t.branch = 'rapid'; t.cd = 0; s.towerAct(t, 0);
  close(t.cd, base.rate * .6); close(s.stats(t).range, base.range + 45);
  assert.match(supportTraits('observer', 3, 'power')[0].text, /6초/);
});

test('고스트·스카우트의 전용 특화는 스킬 재사용과 명령 카드 진행률에 같은 값을 쓴다', () => {
  for (const [k, key, factor] of [['ghost', 'c10', .65], ['scout', 'scoutVolley', .6]]) {
    const s = setup(), t = place(s, k); t.lvl = 3; t.branch = 'rapid'; t.cd = 100;
    t.skills = [{ key, cd: 0 }]; enemy(s, t.x + 40, t.y); s.towerAct(t, 0);
    const cooldown = load('./catalog').SKILL_DEFS[key].cooldown * factor;
    close(t.skills[0].cd, cooldown); t.skills[0].cd /= 2; s.selected = t;
    const command = s.commands().find(c => c.id.startsWith('skill:' + key)); close(command.progress, .5);
  }
});

test('이중 특화는 공성 저격포의 고위력과 광역 포격을 함께 적용하며 저장 후 복원된다', () => {
  const s = setup(['dualBranch']); s.runLaunched = true; s.wave = 0;
  const t = place(s, 'cannon'); t.lvl = 3; s.selected = t;
  assert.equal(s.specialize('power'), true); assert.equal(s.specialize('rapid'), true);
  const effect = specializationEffects('cannon', 'both'); assert.equal(effect.splash, 1.8);
  const state = { version: 1, options: s.options, wave: 0, gold: s.gold, lives: 20, units: s.savedUnits(), bonuses: s.bonuses,
    stats: s.runStats, commander: s.commander, pending: [], rewarded: 0, tutorial: 4, usedKinds: ['cannon'], augments: ['dualBranch'], augmentSeen: [], augmentOffer: null, amonSince: null };
  assert.equal(rules.validateSave(state), true);
  const restored = setup(['dualBranch']); restored.restoreCheckpoint(structuredClone(state));
  assert.equal(restored.towers[0].branch, 'both'); assert.deepEqual(restored.stats(restored.towers[0]), s.stats(t));
});

test('상점은 특화된 오라·EMP·관측·스킬 재사용을 실제 전투 수치로 안내한다', () => {
  const { SupplyShop } = createSourceLoader({ './unitArt': { unitPortraitUrl: () => '' }, './commandIcons': { commandIconUrl: () => '' }, './shop.css': {} })('./shop');
  const shop = Object.create(SupplyShop.prototype);
  for (const [key, branch, expected] of [
    ['support', 'power', /주변 공속 \+45%/], ['support', 'rapid', /4초마다 자동 사용.*반경 96.*75%/],
    ['observer', 'power', /기체별 6초/], ['ghost', 'rapid', /재사용 5\.85초/], ['scout', 'rapid', /재사용 5\.4초/],
  ]) {
    const s = setup(), t = place(s, key); t.lvl = 3; t.branch = branch;
    const state = s.shopState(); assert.equal(state.units[0].branch, branch);
    assert.match(shop.armyDetail(state, state.units[0]), expected);
  }
});

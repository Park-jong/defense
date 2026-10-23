const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Exercise the actual scene's economy, transfers, combat and skill logic without WebGL.
// Only Phaser rendering and the DOM shop are substituted.
const modules = new Map();
function load(name) {
  if (name === 'phaser') return { Scene: class {} };
  if (name === './unitArt') return { UNIT_WORLD_SCALE: { cannon: 1.15, cruiser: 1.3 } };
  if (['./shop', './textures', './ui'].includes(name)) return {};
  if (modules.has(name)) return modules.get(name);
  const filename = path.resolve(__dirname, '../src', name.replace('./', '') + '.ts');
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const mod = { exports: {} };
  modules.set(name, mod.exports);
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename })(load, mod, mod.exports);
  return mod.exports;
}
const { GameScene } = load('./GameScene');
const { TOWER_DEFS, pathCells } = load('./config');
const { DamageNumbers } = load('./damageNumbers');

function sprite(x = 0, y = 0) {
  return {
    x, y, visible: true, rotation: 0, scale: 1, destroyed: false,
    setDepth() { return this; }, setOrigin() { return this; }, setStrokeStyle() { return this; },
    setPosition(x, y) { this.x = x; this.y = y; return this; },
    setScale(scale) { this.scale = scale; return this; },
    setVisible(visible) { this.visible = visible; return this; },
    setRotation(rotation) { this.rotation = rotation; return this; },
    destroy() { this.destroyed = true; },
  };
}
function setup(gold = 2000) {
  const s = new GameScene();
  s.gold = gold;
  s.add = { image: sprite, circle: sprite };
  s.tweens = { add() {}, killTweensOf() {} };
  s.fxPlace = s.fxBoom = { explode() {} };
  s.floatText = s.skillBeam = s.skillRing = () => {};
  s.input = { enabled: true };
  s.shop = { open() {} };
  return s;
}
function place(s, k, c = 6, r = 1) {
  s.building = k;
  s.placeTower(c, r);
  s.shopOpen = false;
  return s.towers.at(-1);
}
function enemy(x, y) {
  return { x, y, type: 'tank', seg: 1, hp: 10000, max: 10000, slow: 1, slowT: 0, burnT: 0, burnDps: 0, vulnerableT: 0 };
}

test('빈 벙커는 40미네랄만 차감하고 공격하지 않는다', () => {
  const s = setup(150), b = place(s, 'bunker');
  assert.equal(s.gold, 110);
  assert.equal(b.passengers.filter(Boolean).length, 0);
  assert.equal(s.selected, b);
  s.findTarget = () => { throw new Error('Empty bunker must not target'); };
  s.towerAct(b, .1);
  assert.equal(s.projs.length, 0);
});

test('혼합 병력 4칸 구매는 각 비용을 한 번만 차감하고 초과·중복·잘못된 슬롯을 거부한다', () => {
  const s = setup(), b = place(s, 'bunker');
  for (const [slot, key] of ['marine', 'firebat', 'marine', 'firebat'].entries()) {
    assert.equal(s.recruit(b.id, slot, key), true);
    assert.equal(b.passengers[slot].host, b);
    assert.equal(b.passengers[slot].base.visible, false);
  }
  assert.equal(s.gold, 2000 - 40 - 65 - 110 - 65 - 110);
  const before = s.gold;
  for (const slot of [0, 4, -1, 1.5, NaN]) assert.equal(s.recruit(b.id, slot, 'marine'), false);
  assert.equal(s.gold, before);
  assert.equal(s.towers.length, 5);
  assert.equal(new Set(s.towers.map(t => t.id)).size, 5);
});

test('자금 부족 구매와 대형·프로토스 유닛 탑승은 병력이나 돈을 바꾸지 않는다', () => {
  const s = setup(40), b = place(s, 'bunker');
  assert.equal(s.recruit(b.id, 0, 'marine'), false);
  assert.equal(s.recruit(b.id, 0, 'cannon'), false);
  const tank = s.createTower('cannon', 8, 1), templar = s.createTower('templar', 9, 1);
  assert.equal(s.board(b.id, 0, tank.id), false);
  assert.equal(s.board(b.id, 0, templar.id), false);
  assert.equal(s.gold, 0);
  assert.equal(b.passengers.filter(Boolean).length, 0);
});

test('기존 보병은 무료로 옮기며 강화·스킬·재사용 시간·투자액·고유 ID를 보존한다', () => {
  const s = setup(), b = place(s, 'bunker'), marine = place(s, 'marine', 8, 1);
  s.selected = marine; s.upgrade(); s.equipSkill('stim');
  marine.cd = .1; marine.skills[0].cd = 7;
  const saved = { id: marine.id, spent: marine.spent, gold: s.gold, range: s.stats(marine).range, damage: s.stats(marine).dmg };
  assert.equal(s.board(b.id, 0, marine.id), true);
  assert.equal(s.gold, saved.gold);
  assert.equal(s.cellFree(8, 1), true);
  assert.equal(s.cellFree(b.c, b.r), false);
  assert.equal(marine.id, saved.id); assert.equal(marine.spent, saved.spent); assert.equal(marine.lvl, 2);
  assert.equal(marine.skills[0].cd, 7); assert.equal(marine.cd, .1);
  assert.equal(s.stats(marine).range, saved.range + 24); assert.equal(s.stats(marine).dmg, saved.damage);
  const other = place(s, 'bunker', 10, 1);
  assert.equal(s.board(other.id, 0, marine.id), false);
  assert.equal(other.passengers[0], null);
});

test('탑승 병력에 스킬을 구매할 수 있으며 각 병력이 자기 무장과 자동 스킬로 싸운다', () => {
  const s = setup(), b = place(s, 'bunker');
  s.recruit(b.id, 0, 'marine'); s.recruit(b.id, 1, 'firebat');
  const [marine, firebat] = b.passengers;
  s.selected = marine;
  assert.equal(s.equipSkill('stim'), true); assert.equal(s.equipSkill('burst'), true);
  const gold = s.gold;
  assert.equal(s.equipSkill('stim'), false); assert.equal(s.gold, gold);
  s.selected = firebat; assert.equal(s.equipSkill('inferno'), true);
  const target = enemy(b.x + 65, b.y);
  s.enemies = [target];
  s.towerAct(marine, .05); s.towerAct(firebat, .05); s.towerAct(b, .05);
  assert.deepEqual(s.projs.map(p => p.k), ['marine', 'firebat']);
  assert.ok(target.hp < target.max); assert.ok(target.burnT > 0);
  assert.equal(marine.skills[0].cd, 12); assert.equal(marine.skills[1].cd, 6);
  assert.ok(s.stats(marine).rate < TOWER_DEFS.marine.rate);
  assert.equal(marine.base.visible, false); assert.equal(firebat.base.visible, false);
  assert.notEqual(s.projs[0].y, s.projs[1].y);
  s.hit(s.projs[1]); assert.ok(target.hp < target.max - 36);
});

test('하차할 빈 구역을 정하기 전에는 병력이 벙커에 남고 잘못된 위치는 거부한다', () => {
  const s = setup(), b = place(s, 'bunker');
  s.recruit(b.id, 0, 'marine'); const marine = b.passengers[0];
  marine.skills.push({ key: 'burst', cd: 3 });
  const gold = s.gold;
  assert.equal(s.beginUnload(marine.id), true);
  assert.equal(marine.host, b); assert.equal(b.passengers[0], marine);
  const [pc, pr] = [...pathCells][0].split(',').map(Number);
  for (const [c, r] of [[b.c, b.r], [pc, pr], [-1, 1], [20, 12]]) {
    s.finishUnload(c, r); assert.equal(marine.host, b); assert.equal(s.unloading, marine);
  }
  s.finishUnload(8, 1);
  assert.equal(b.passengers[0], null); assert.equal(marine.host, undefined); assert.equal(s.unloading, null);
  assert.equal(marine.base.visible, true); assert.equal(marine.barrel.visible, true);
  assert.equal(s.selected, marine); assert.equal(s.stats(marine).range, TOWER_DEFS.marine.range);
  assert.equal(marine.skills[0].cd, 3); assert.equal(s.gold, gold);
  assert.equal(s.cellFree(8, 1), false);
});

test('ESC로 하차를 취소해도 병력과 스킬은 벙커에 남는다', () => {
  const s = setup(), b = place(s, 'bunker'); s.recruit(b.id, 0, 'marine');
  const marine = b.passengers[0]; s.beginUnload(marine.id);
  s.onKey({ key: 'Escape', repeat: false });
  assert.equal(s.unloading, null); assert.equal(marine.host, b); assert.equal(b.passengers[0], marine);
  assert.equal(s.cellFree(8, 1), true);
});

test('아칸의 에너지 공명은 벙커 건물 대신 탑승한 보병 각각에 적용된다', () => {
  const s = setup(), b = place(s, 'bunker');
  s.recruit(b.id, 0, 'marine'); s.recruit(b.id, 1, 'firebat');
  const templar = place(s, 'templar', 8, 1);
  s.enemies = [enemy(b.x + 65, b.y)];
  s.autoSkill(templar, 'warp', s.enemies[0]);
  assert.equal(b.buffs.length, 0);
  for (const unit of b.passengers.filter(Boolean)) {
    assert.equal(unit.buffs.length, 1);
    assert.ok(s.stats(unit).dmg > TOWER_DEFS[unit.k].dmg);
    s.towerAct(unit, 6.1);
    assert.equal(unit.buffs.length, 0);
  }
});

test('탑승 병력이 있는 벙커 회수를 막고 개별 병력 회수는 슬롯과 환급액을 정확히 정리한다', () => {
  const s = setup(), b = place(s, 'bunker'); s.recruit(b.id, 0, 'marine');
  const marine = b.passengers[0]; s.selected = marine; s.equipSkill('burst');
  const gold = s.gold, refund = Math.round((65 + 85) * .7);
  s.selected = b; s.sell();
  assert.equal(s.gold, gold); assert.equal(b.base.destroyed, false);
  s.selected = marine; s.sell();
  assert.equal(s.gold, gold + refund); assert.equal(b.passengers[0], null);
  assert.equal(s.towers.includes(marine), false);
  s.selected = b; s.sell();
  assert.equal(s.gold, gold + refund + 28); assert.equal(s.towers.length, 0);
});

test('작전 종료 뒤에는 구매·탑승·하차·강화·회수로 상태를 바꾸지 않는다', () => {
  const s = setup(), b = place(s, 'bunker'), m = place(s, 'marine', 8, 1);
  s.recruit(b.id, 0, 'firebat'); const firebat = b.passengers[0];
  s.over = true; const gold = s.gold;
  assert.equal(s.recruit(b.id, 1, 'marine'), false);
  assert.equal(s.board(b.id, 1, m.id), false); assert.equal(s.beginUnload(firebat.id), false);
  s.selected = m; s.upgrade(); s.sell();
  assert.equal(m.lvl, 1); assert.equal(s.gold, gold); assert.equal(s.towers.length, 3);
});

test('주둔 병력은 ID로 직접 강화·스킬 장착해도 선택한 벙커와 숨김 상태를 유지한다', () => {
  const s = setup(), b = place(s, 'bunker'); s.recruit(b.id, 0, 'marine');
  const m = b.passengers[0], gold = s.gold; m.cd = .15;
  assert.equal(s.upgradeUnit(m.id), true); assert.equal(s.equipSkill('stim', m.id), true);
  assert.equal(s.gold, gold - 52 - 75); assert.equal(m.spent, 65 + 52 + 75);
  assert.equal(m.lvl, 2); assert.equal(m.cd, .15); assert.equal(s.selected, b);
  assert.equal(m.host, b); assert.equal(m.base.visible, false); assert.equal(m.barrel.visible, false);
  assert.equal(s.upgradeUnit('missing'), false); assert.equal(s.upgradeUnit(b.id), false);
  assert.equal(s.equipSkill('inferno', m.id), false);
});

test('벙커 일괄 강화는 각 병력의 다음 단계 비용을 합산하고 최대 강화·다른 벙커·전장 병력을 제외한다', () => {
  const s = setup(10000), b = place(s, 'bunker');
  s.recruit(b.id, 0, 'marine'); s.recruit(b.id, 1, 'marine'); s.recruit(b.id, 2, 'firebat');
  const [a, m, f] = b.passengers;
  s.upgradeUnit(m.id); s.upgradeUnit(f.id); s.upgradeUnit(f.id);
  const other = place(s, 'bunker', 10, 1); s.recruit(other.id, 0, 'marine');
  const outside = place(s, 'marine', 8, 1), gold = s.gold;
  assert.deepEqual(s.applyOrder({ type: 'upgrade' }, { bunkerId: b.id }), { count: 2, cost: 156 });
  assert.equal(s.gold, gold - 156); assert.deepEqual([a.lvl, m.lvl, f.lvl], [2, 3, 3]);
  assert.equal(outside.lvl, 1); assert.equal(other.passengers[0].lvl, 1);
  assert.equal(a.host, b); assert.equal(a.base.visible, false);
  assert.deepEqual(s.applyOrder({ type: 'upgrade' }, { bunkerId: b.id }), { count: 1, cost: 104 });
  assert.deepEqual(s.applyOrder({ type: 'upgrade' }, { bunkerId: b.id }), { count: 0, cost: 0 });
});

test('전체 부대의 동종 일괄 강화는 여러 벙커의 탑승 병력과 전장 병력을 함께 포함한다', () => {
  const s = setup(), a = place(s, 'bunker'), b = place(s, 'bunker', 10, 1);
  s.recruit(a.id, 0, 'marine'); s.recruit(b.id, 0, 'marine'); s.recruit(b.id, 1, 'firebat');
  const outside = place(s, 'marine', 8, 1), tank = place(s, 'cannon', 9, 1), gold = s.gold;
  assert.deepEqual(s.applyOrder({ type: 'upgrade' }, { kind: 'marine' }), { count: 3, cost: 156 });
  assert.equal(s.gold, gold - 156);
  for (const m of [a.passengers[0], b.passengers[0], outside]) assert.equal(m.lvl, 2);
  assert.equal(tank.lvl, 1); assert.equal(b.passengers[1].lvl, 1); assert.equal(a.lvl, 1);
  assert.deepEqual(s.applyOrder({ type: 'upgrade' }), { count: 5, cost: 480 });
  assert.equal(tank.lvl, 2); assert.equal(b.passengers[1].lvl, 2);
});

test('일괄 스킬은 전용 병력에만 적용하고 이미 장착한 스킬과 재사용 시간을 보존한다', () => {
  const s = setup(), a = place(s, 'bunker'), b = place(s, 'bunker', 10, 1);
  s.recruit(a.id, 0, 'marine'); s.recruit(a.id, 1, 'marine'); s.recruit(a.id, 2, 'firebat');
  s.recruit(b.id, 0, 'marine'); const outside = place(s, 'marine', 8, 1);
  const [m, n, f] = a.passengers; s.equipSkill('stim', m.id); m.skills[0].cd = 7;
  const gold = s.gold;
  assert.deepEqual(s.applyOrder({ type: 'skill', key: 'stim' }, { bunkerId: a.id }), { count: 1, cost: 75 });
  assert.equal(s.gold, gold - 75); assert.equal(m.skills[0].cd, 7); assert.equal(n.skills[0].cd, 0);
  assert.equal(f.skills.length, 0); assert.equal(outside.skills.length, 0); assert.equal(b.passengers[0].skills.length, 0);
  assert.deepEqual(s.applyOrder({ type: 'skill', key: 'stim' }), { count: 2, cost: 150 });
  assert.deepEqual(s.applyOrder({ type: 'skill', key: 'burst' }, { kind: 'marine' }), { count: 4, cost: 340 });
  assert.deepEqual(s.applyOrder({ type: 'skill', key: 'stim' }), { count: 0, cost: 0 });
  assert.equal(m.skills.length, 2); assert.equal(m.skills[0].cd, 7);
});

test('일괄 강화 총액이 부족하면 한 기도 강화하지 않고 정확한 총액이면 모두 강화한다', () => {
  const s = setup(), b = place(s, 'bunker'); s.recruit(b.id, 0, 'marine'); s.recruit(b.id, 1, 'firebat');
  const [m, f] = b.passengers, spent = [m.spent, f.spent]; s.gold = 139;
  assert.deepEqual(s.applyOrder({ type: 'upgrade' }, { bunkerId: b.id }), { count: 0, cost: 0 });
  assert.equal(s.gold, 139); assert.deepEqual([m.lvl, f.lvl], [1, 1]); assert.deepEqual([m.spent, f.spent], spent);
  s.gold = 140;
  assert.deepEqual(s.applyOrder({ type: 'upgrade' }, { bunkerId: b.id }), { count: 2, cost: 140 });
  assert.equal(s.gold, 0); assert.deepEqual([m.lvl, f.lvl], [2, 2]);
});

test('일괄 스킬 총액이 부족하면 부분 장착과 부분 차감 없이 보류한다', () => {
  const s = setup(), b = place(s, 'bunker'); s.recruit(b.id, 0, 'marine'); s.recruit(b.id, 1, 'marine');
  s.gold = 149;
  assert.deepEqual(s.applyOrder({ type: 'skill', key: 'stim' }), { count: 0, cost: 0 });
  assert.equal(s.gold, 149); assert.ok(b.passengers.filter(Boolean).every(p => !p.skills.length && p.spent === 65));
  s.gold = 150;
  assert.deepEqual(s.applyOrder({ type: 'skill', key: 'stim' }), { count: 2, cost: 150 });
  assert.equal(s.gold, 0); assert.ok(b.passengers.filter(Boolean).every(p => p.skills.length === 1 && p.spent === 140));
});

test('일괄 적용한 강화·스킬의 비용과 병력 ID는 하차·환급까지 유지된다', () => {
  const s = setup(), b = place(s, 'bunker'); s.recruit(b.id, 0, 'marine'); const m = b.passengers[0], id = m.id;
  s.applyOrder({ type: 'upgrade' }); s.applyOrder({ type: 'skill', key: 'burst' });
  const spent = 65 + 52 + 85; assert.equal(m.spent, spent);
  s.beginUnload(m.id); s.finishUnload(8, 1);
  assert.equal(m.id, id); assert.equal(m.lvl, 2); assert.equal(m.skills[0].key, 'burst');
  assert.equal(m.base.visible, true); assert.equal(b.passengers[0], null);
  const gold = s.gold; s.sell(); assert.equal(s.gold, gold + Math.round(spent * .7));
});

test('잘못된 벙커 범위와 작전 종료 후에는 일괄 명령이 어떤 병력도 바꾸지 않는다', () => {
  const s = setup(), b = place(s, 'bunker'), m = place(s, 'marine', 8, 1), gold = s.gold;
  for (const bunkerId of ['missing', m.id, '']) {
    assert.deepEqual(s.applyOrder({ type: 'upgrade' }, { bunkerId }), { count: 0, cost: 0 });
    assert.deepEqual(s.applyOrder({ type: 'skill', key: 'stim' }, { bunkerId }), { count: 0, cost: 0 });
  }
  assert.deepEqual(s.applyOrder({ type: 'upgrade' }, { kind: 'bunker' }), { count: 0, cost: 0 });
  s.over = true;
  assert.equal(s.upgradeUnit(m.id), false); assert.equal(s.equipSkill('stim', m.id), false);
  assert.deepEqual(s.applyOrder({ type: 'upgrade' }), { count: 0, cost: 0 });
  assert.deepEqual(s.applyOrder({ type: 'skill', key: 'stim' }), { count: 0, cost: 0 });
  assert.equal(s.gold, gold); assert.equal(m.lvl, 1); assert.equal(m.skills.length, 0); assert.equal(b.lvl, 1);
});

test('선택이 없으면 9종 보급 아이콘, 유닛 선택 시 전용 명령, 빈 땅 클릭 시 다시 보급을 표시한다', () => {
  const s = setup(), m = place(s, 'marine'); s.cancelCommand();
  assert.equal(s.commands().length, 9); assert.ok(s.commands().every(c => c.id.startsWith('build:')));
  s.cellAt = () => ({ c: m.c, r: m.r }); s.onMapClick({ wasTouch: false });
  assert.equal(s.selected, m); assert.equal(s.commands()[0].id, 'upgrade:' + m.id);
  assert.ok(s.commands()[1].id.startsWith('skill:stim:')); assert.ok(s.commands()[2].id.startsWith('skill:burst:'));
  s.cellAt = () => ({ c: 8, r: 1 }); s.onMapClick({ wasTouch: false });
  assert.equal(s.selected, null); assert.ok(s.commands().every(c => c.id.startsWith('build:'))); assert.equal(s.shopOpen, false);
});

test('명령 아이콘으로 강화·스킬을 바로 구매하고 장착한 스킬은 재구매 없이 자동 사용 상태로 표시한다', () => {
  const s = setup(), m = place(s, 'marine'), other = place(s, 'firebat', 8, 1); s.selectUnit(m.id);
  const gold = s.gold; s.commands()[0].run(); s.commands()[1].run(); s.commands()[2].run();
  assert.equal(s.gold, gold - 52 - 75 - 85); assert.equal(m.lvl, 2); assert.equal(other.lvl, 1);
  assert.deepEqual(m.skills.map(s => s.key), ['stim', 'burst']); assert.equal(s.shopOpen, false);
  m.skills[0].cd = 6;
  const skill = s.commands()[1]; assert.equal(skill.enabled, false); assert.equal(skill.active, true);
  assert.equal(skill.price, undefined); assert.equal(skill.badge, '6s'); assert.equal(skill.progress, .5);
  const after = s.gold; skill.run(); assert.equal(s.gold, after); assert.equal(m.skills[0].cd, 6);
});

test('벙커는 창을 자동으로 열지 않고 명령 아이콘에서 구매·탑승 병력 선택·강화·복귀·일괄 강화를 처리한다', () => {
  const s = setup(), b = place(s, 'bunker'); assert.equal(s.shopOpen, false);
  assert.equal(s.commands()[0].enabled, false); s.commands()[4].run(); s.commands()[5].run();
  const [m, f] = b.passengers;
  assert.equal(m.k, 'marine'); assert.equal(f.k, 'firebat');
  s.commands()[0].run(); assert.equal(s.selected, m); s.commands()[0].run(); s.commands()[1].run();
  assert.equal(m.lvl, 2); assert.equal(m.skills[0].key, 'stim'); assert.equal(m.base.visible, false);
  s.commands()[6].run(); assert.equal(s.selected, b);
  const order = s.commands()[6]; assert.equal(order.price, 104 + 88); order.run();
  assert.equal(m.lvl, 3); assert.equal(f.lvl, 2); assert.equal(s.commands()[8].enabled, false);
  assert.equal(s.shopOpen, false); assert.equal(s.selected, b);
});

test('탑승 병력의 하차 명령은 위치 확정 전까지 탑승을 유지하며 취소 아이콘은 보급 화면으로 돌아간다', () => {
  const s = setup(), b = place(s, 'bunker'); s.commands()[4].run(); const m = b.passengers[0];
  s.commands()[0].run(); s.commands()[7].run();
  assert.equal(s.unloading, m); assert.equal(m.host, b); assert.equal(s.commands().filter(Boolean).length, 1);
  s.commands()[8].run(); assert.equal(s.unloading, null); assert.equal(m.host, b); assert.equal(s.selected, null);
  assert.ok(s.commands().every(c => c.id.startsWith('build:')));
});

test('선택 변경 후 스킬 단축키는 현재 유닛에 적용되고 중복·자금 부족·최대 강화·작전 종료는 비활성화한다', () => {
  const s = setup(), m = place(s, 'marine'), f = place(s, 'firebat', 8, 1);
  s.selectUnit(f.id); s.onKey({ key: 'z', repeat: false }); s.onKey({ key: 'x', repeat: false });
  assert.deepEqual(f.skills.map(s => s.key), ['inferno', 'ignite']); assert.equal(m.skills.length, 0);
  const gold = s.gold; s.onKey({ key: 'z', repeat: false }); assert.equal(s.gold, gold);
  s.selectUnit(m.id); s.gold = 0; assert.equal(s.commands()[0].enabled, false); assert.equal(s.commands()[1].enabled, false);
  s.gold = 1000; s.commands()[0].run(); s.commands()[0].run();
  assert.equal(s.commands()[0].enabled, false); assert.equal(s.commands()[0].badge, 'MAX');
  s.over = true; assert.ok(s.commands().filter(Boolean).every(c => !c.enabled));
});

test('피해 숫자는 취약 보정을 반영하고 무효 피해는 건너뛰며 처치하는 마지막 피해도 남긴다', () => {
  const s = setup(), target = enemy(120, 180), events = [];
  s.damageNumbers = { hit: (_e, amount, kind) => events.push(['hit', amount, kind]), flush: () => events.push(['flush']) };
  target.vulnerableT = 3;
  s.damageEnemy(target, 10); assert.equal(target.hp, 10000 - 13.5);
  for (const dmg of [0, -1, NaN, Infinity]) s.damageEnemy(target, dmg);
  assert.deepEqual(events, [['hit', 13.5, 'normal']]);
  target.hp = 5; target.sprite = sprite(); target.reward = 7; s.fxDie = { explode() {} };
  const gold = s.gold; s.damageEnemy(target, 10, 'skill');
  assert.deepEqual(events.slice(1), [['hit', 13.5, 'skill'], ['flush']]);
  assert.equal(target.dead, true); assert.equal(s.gold, gold + 7);
  s.damageEnemy(target, 100); assert.equal(events.length, 3);
});

test('범위 공격은 피격한 적마다 숫자를 보내고 자동 스킬은 스킬 피해로 구분한다', () => {
  const s = setup(), a = enemy(120, 180), b = enemy(140, 180), outside = enemy(160, 180), hits = [];
  s.enemies = [a, b, outside];
  s.damageNumbers = { hit: (target, amount, kind) => hits.push({ target, amount, kind }) };
  s.hit({ tgt: a, k: 'firebat', st: { dmg: 14, splash: 32 } });
  assert.deepEqual(hits.map(h => [h.amount, h.kind]), [[14, 'normal'], [14, 'normal']]);
  assert.equal(a.hp, 9986); assert.equal(b.hp, 9986); assert.equal(outside.hp, 10000);
  const m = place(s, 'marine'); s.autoSkill(m, 'burst', a);
  assert.equal(hits.at(-1).kind, 'skill'); assert.equal(hits.at(-1).amount, TOWER_DEFS.marine.dmg * 4.5);
});

function damageRenderer() {
  const views = [];
  const numbers = new DamageNumbers({
    cache: { bitmapFont: { exists: () => true } },
    add: { bitmapText: () => {
      const view = Object.assign(sprite(), {
        setText(text) { this.text = text; return this; },
        setFontSize(size) { this.size = size; return this; },
        setTint(color) { this.color = color; return this; },
        setAlpha(alpha) { this.alpha = alpha; return this; },
        setActive(active) { this.active = active; return this; },
      });
      views.push(view); return view;
    } },
  });
  return { numbers, views };
}

test('화상 숫자는 짧게 합산하고 직격이나 처치 전에 남은 피해를 빠짐없이 표시한다', () => {
  const { numbers, views } = damageRenderer(), target = { x: 120, y: 180, r: 12 };
  for (let i = 0; i < 12; i++) numbers.hit(target, .5, 'burn');
  assert.equal(views.length, 0); numbers.update(.21);
  assert.equal(views.length, 1); assert.equal(views[0].text, '6');
  numbers.hit(target, 2, 'burn'); numbers.hit(target, 8);
  assert.deepEqual(views.map(v => v.text), ['6', '2', '8']);
  numbers.hit(target, 3, 'burn'); numbers.flush(target);
  assert.equal(views.at(-1).text, '3'); numbers.flush(target); assert.equal(views.length, 4);
});

test('연사 숫자는 서로 다른 위치에서 떠오르고 최대 160개를 재사용하며 정지·만료·장면 종료를 처리한다', () => {
  const { numbers, views } = damageRenderer(), target = { x: 120, y: 180, r: 12 };
  for (let i = 0; i < 240; i++) numbers.hit(target, 10 + i);
  assert.equal(views.length, 160); assert.equal(numbers.active.length, 160);
  assert.ok(new Set(views.map(v => v.x + '/' + v.y)).size > 1);
  const before = views[0].y; numbers.update(.1); assert.ok(views[0].y < before);
  const after = views[0].y; numbers.update(0); assert.equal(views[0].y, after);
  numbers.update(2); assert.ok(views.every(v => !v.visible && !v.active));
  for (let i = 0; i < 100; i++) numbers.hit(target, 1);
  assert.equal(views.length, 160); assert.equal(numbers.active.length, 100);
  numbers.destroy(); assert.ok(views.every(v => v.destroyed)); assert.equal(numbers.active.length, 0);
});

test('솟은 콘솔 장갑 위에서는 건설·맵 입력을 막고 가운데 열린 맵은 고밀도 화면에서도 사용할 수 있다', () => {
  const config = load('./config'), originalScale = config.RENDER_SCALE;
  try {
    for (const scale of [1, 2]) {
      config.setRenderScale(scale);
      const s = setup(), gold = s.gold;
      const pointer = x => ({ x: x * scale, y: (config.CONSOLE_Y - 12) * scale, wasTouch: false });
      s.building = 'marine';
      for (const x of [100, 800]) {
        assert.equal(s.inMapView(pointer(x)), false); s.onMapClick(pointer(x));
      }
      assert.equal(s.towers.length, 0); assert.equal(s.gold, gold);
      assert.equal(s.inMapView(pointer(408)), true); s.onMapClick(pointer(408));
      assert.equal(s.towers.length, 1); assert.equal(s.towers[0].c, 8); assert.equal(s.towers[0].r, 11);
      assert.equal(s.gold, gold - TOWER_DEFS.marine.cost);
    }
  } finally { config.setRenderScale(originalScale); }
});

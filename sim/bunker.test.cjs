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

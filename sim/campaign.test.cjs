const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createSourceLoader } = require('./helpers/load-source.cjs');

// Use production rules; only Phaser, artwork and DOM views are substituted.
const load = createSourceLoader({
  './missionResult': { showMissionResult: () => () => {} },
  phaser: { Scene: class {} },
  './unitArt': { UNIT_WORLD_SCALE: {} },
  ...Object.fromEntries(['./shop', './textures', './ui', './operations'].map(name => [name, {}])),
});
const rules = load('./campaign'), config = load('./config'), { GameScene } = load('./GameScene');
const { createMapRuntime } = load('./game/map');
function sprite(x = 0, y = 0) {
  const s = { x, y, visible: true, tint: 0xffffff };
  for (const k of ['setDepth', 'setOrigin', 'setScale', 'setFrame', 'setRotation', 'setStrokeStyle', 'setAlpha', 'setLetterSpacing', 'setInteractive', 'on', 'destroy', 'setText']) s[k] = () => s;
  s.setPosition = (x, y) => { s.x = x; s.y = y; return s; };
  s.setVisible = v => { s.visible = v; return s; };
  s.setTint = t => { s.tint = t; return s; }; s.clearTint = () => s;
  return s;
}
function setup(mode = 'standard', map = 'frontier') {
  const s = new GameScene();
  s.options = { ...rules.DEFAULT_OPTIONS, mode, map }; s.map = createMapRuntime(map, config.MAP_Y); s.gold = 10000;
  s.add = { image: sprite, circle: sprite, rectangle: sprite, text: sprite };
  s.tweens = { add() {}, killTweensOf() {} }; s.fxPlace = s.fxBoom = s.fxDie = s.fxFrost = { explode() {} };
  s.banner = s.floatText = s.skillRing = s.skillBeam = s.shakeAll = s.archonBurst = () => {};
  s.uiCam = { flash() {} }; s.input = { enabled: true }; s.pauseTxt = sprite();
  return s;
}
const place = (s, key, c = 6, r = 1) => { s.building = key; s.placeTower(c, r); return s.towers.at(-1); };
function spawn(s, type = 'grunt', x = 300, y = 176) { s.spawn(type); const e = s.enemies.at(-1); e.x = x; e.y = y; return e; }
function memory() { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: k => m.delete(k) }; }
function checkpoint() {
  return { version: 1, options: { ...rules.DEFAULT_OPTIONS }, wave: 5, gold: 420, lives: 17,
    units: [{ id: '1', k: 'bunker', c: 6, r: 1, lvl: 1, spent: 40, skills: [], cd: 0, buffs: [], target: 'first' },
      { id: '7', k: 'marine', c: 6, r: 1, lvl: 3, spent: 400, skills: [{ key: 'stim', cd: 4 }], cd: .1, buffs: [{ left: 2, haste: 1.8, power: 1 }], hostId: '1', slot: 2, target: 'boss', branch: 'rapid' }],
    bonuses: { power: .12, haste: .1, range: 12 }, stats: rules.newStats(), commander: { strike: 25, slow: 0, supply: 40 },
    pending: ['power', 'haste', 'range'], rewarded: 0, tutorial: 4, usedKinds: ['bunker', 'marine'] };
}

test('예고와 실제 편성은 1~100웨이브에서 같고 특수 적과 보스 등장 시점을 지킨다', () => {
  for (let w = 1; w <= 100; w++) {
    const s = setup(w > 50 ? 'endless' : 'standard'); s.wave = w - 1; s.startWave();
    assert.deepEqual(s.spawnQ, rules.wavePlan(w));
    assert.equal(s.spawnQ.includes('boss'), w % 10 === 0);
  }
  assert.ok(!rules.wavePlan(6).includes('medic')); assert.ok(rules.wavePlan(7).includes('medic'));
  assert.ok(rules.wavePlan(9).includes('splitter')); assert.ok(rules.wavePlan(12).includes('shielder'));
  assert.ok(rules.wavePlan(10000).length <= 161);
});

test('각 전장의 경로 전체가 건설 금지이고 전장 인스턴스 사이에 경로를 공유하지 않는다', () => {
  for (const key of Object.keys(config.MAP_DEFS)) {
    const map = createMapRuntime(key, config.MAP_Y);
    assert.equal(map.routes.length, key === 'junction' ? 2 : 1);
    for (const route of map.routes) for (let i = 1; i < route.length; i++) {
      const a = route[i - 1], b = route[i]; assert.ok(a.x === b.x || a.y === b.y);
      for (let c = Math.min(a.x, b.x) / config.T - .5; c <= Math.max(a.x, b.x) / config.T - .5; c++)
        for (let r = (Math.min(a.y, b.y) - config.MAP_Y) / config.T - .5; r <= (Math.max(a.y, b.y) - config.MAP_Y) / config.T - .5; r++) assert.ok(map.pathCells.has(`${c},${r}`));
    }
  }
  assert.ok(!createMapRuntime('frontier').pathCells.has('10,1'));
});

test('서로 다른 장면의 건설 금지 칸·적 진입 경로·이동은 서로 영향을 주지 않는다', () => {
  const frontier = setup(), original = frontier.map;
  frontier.spawn('grunt');
  const junction = setup('standard', 'junction');
  junction.spawn('grunt'); junction.spawn('grunt');
  assert.equal(frontier.map, original);
  assert.equal(frontier.cellFree(10, 1), true);
  assert.equal(junction.cellFree(10, 1), false);
  frontier.spawn('grunt');
  for (const e of frontier.enemies) assert.equal(e.route, original.routes[0]);
  assert.equal(junction.enemies[1].route, junction.map.routes[1]);
  const before = frontier.enemies[0].x;
  frontier.step(.1);
  assert.ok(frontier.enemies[0].x > before);
  assert.equal(frontier.enemies[0].y, config.MAP_Y + 120);
  assert.equal(junction.enemies[0].x, -24);
});

test('다른 전장을 만들어도 기존 저장의 경로 검증과 복원 위치는 유지된다', () => {
  const save = checkpoint(), s = setup('standard', 'junction');
  assert.equal(s.map.pathCells.has('6,1'), true);
  assert.equal(rules.validateSave(save), true);
  const restored = setup(); restored.restoreCheckpoint(save);
  assert.equal(restored.map.key, 'frontier');
  assert.equal(restored.towers[0].y, config.MAP_Y + 1.5 * config.T);
  assert.equal(restored.towers[1].host, restored.towers[0]);
  assert.equal(s.map.key, 'junction');
});

test('합류 지대의 적은 두 입구를 번갈아 사용하고 자신의 경로를 따라 이동한다', () => {
  const s = setup('standard', 'junction'); s.spawn('grunt'); s.spawn('grunt');
  const [a, b] = s.enemies; assert.notEqual(a.y, b.y); assert.notEqual(a.route, b.route);
  const bx = b.x; s.step(.1); assert.ok(b.x > bx); assert.equal(b.y, s.map.routes[1][0].y);
});

test('협곡 고지의 사거리 보너스는 실제 표적 선택·강화·지원 오라에 적용된다', () => {
  const s = setup('standard', 'canyon');
  const tower = place(s, 'arrow', 6, 2), base = config.TOWER_DEFS.arrow.range;
  const enemy = spawn(s, 'grunt', tower.x + base + 12, tower.y);
  assert.equal(s.stats(tower).range, base + 24);
  assert.equal(s.findTarget(tower), enemy);
  s.selected = tower; assert.equal(s.beginRelocate(), true); s.finishRelocate(3, 2);
  assert.equal(s.stats(tower).range, base);
  enemy.x = tower.x + base + 12; enemy.y = tower.y;
  assert.equal(s.findTarget(tower), null);
  s.selected = tower; s.beginRelocate(); s.finishRelocate(6, 2);
  s.upgradeUnit(tower.id); s.bonuses.range = 12;
  assert.equal(s.stats(tower).range, config.TOWER_DEFS.arrow.range * 1.08 + 12 + 24);
  const support = place(s, 'support', 8, 2), ally = place(s, 'marine', 15, 2);
  // Keep coordinates 12 beyond the normal aura edge, inside the high-ground extension.
  ally.x = support.x + config.TOWER_DEFS.support.range + s.bonuses.range + 12; ally.y = support.y;
  assert.ok(s.stats(ally).rate < config.TOWER_DEFS.marine.rate);
  s.selected = support; s.beginRelocate(); s.finishRelocate(14, 2);
  ally.x = support.x + config.TOWER_DEFS.support.range + s.bonuses.range + 12;
  assert.equal(s.stats(ally).rate, config.TOWER_DEFS.marine.rate);
});

test('협곡 고지의 벙커 병력은 보너스를 한 번만 받고 재배치·하차 시 새 지형을 따른다', () => {
  const s = setup('standard', 'canyon'), bunker = place(s, 'bunker', 6, 2);
  assert.equal(s.recruit(bunker.id, 0, 'marine'), true);
  const marine = bunker.passengers[0], base = config.TOWER_DEFS.marine.range;
  const { BUNKER_RANGE_BONUS } = load('./bunker');
  assert.equal(s.stats(marine).range, base + BUNKER_RANGE_BONUS + 24);
  s.selected = bunker; s.beginRelocate(); s.finishRelocate(3, 2);
  assert.equal(s.stats(marine).range, base + BUNKER_RANGE_BONUS);
  s.beginUnload(marine.id); s.finishUnload(7, 2);
  assert.equal(s.stats(marine).range, base + 24);
  assert.equal(marine.host, undefined);
  s.selected = marine; s.beginRelocate(); s.finishRelocate(4, 2);
  assert.equal(s.stats(marine).range, base);
});

test('기존 협곡 체크포인트는 고지·일반 칸을 모두 복원하고 지형 보너스를 다시 계산한다', () => {
  for (const r of [2, 11]) {
    const save = checkpoint(); save.options.map = 'canyon';
    for (const unit of save.units) unit.r = r;
    assert.equal(rules.validateSave(save), true);
    const s = setup('standard', 'canyon'); s.restoreCheckpoint(save);
    const marine = s.towers[1];
    const low = setup('standard', 'junction'); low.restoreCheckpoint({...save, options: {...save.options, map: 'junction'}});
    assert.equal(s.stats(marine).range - low.stats(low.towers[1]).range, r === 2 ? 24 : 0);
  }
});

test('타겟 우선순위는 체력·보스·도착까지 남은 거리로 적을 고르고 범위 밖은 제외한다', () => {
  const s = setup(), t = place(s, 'sniper');
  const a = spawn(s, 'grunt', t.x, t.y + 30), b = spawn(s, 'boss', t.x + 20, t.y + 30);
  a.hp = 300; b.hp = 100; a.seg = b.seg = 1;
  t.target = 'strong'; assert.equal(s.findTarget(t), a);
  t.target = 'weak'; assert.equal(s.findTarget(t), b);
  t.target = 'boss'; assert.equal(s.findTarget(t), b);
  b.x = 2000; assert.equal(s.findTarget(t), a);
  s.map = createMapRuntime('junction', config.MAP_Y); a.route = s.map.routes[0]; a.seg = 1; a.x = 0; a.y = s.map.routes[0][0].y;
  b.route = s.map.routes[1]; b.seg = 1; b.x = 0; b.y = s.map.routes[1][0].y;
  t.x = 0; t.y = 290; t.target = 'first'; s.bonuses.range = 1000;
  assert.equal(s.findTarget(t), b);
});

test('보스는 10 보호막·20 소환·30 증원·40 가속·50 순환 패턴을 가진다', () => {
  assert.equal(new Set([10, 20, 30, 40, 50].map(rules.bossPattern)).size, 5);
  for (const w of [10, 20, 30, 40, 50]) {
    const s = setup(); s.wave = w; const e = spawn(s, 'boss');
    e.pulse = 0; s.enemyAct(e, .1);
    if (w === 10 || w === 50) assert.ok(e.shield > 0);
    if (w === 20 || w === 30) { assert.equal(s.enemies.length, 4); assert.ok(s.enemies.slice(1).every(child => child.reward === 0 && child.route === e.route && child.seg === e.seg)); }
    if (w === 40) { e.age = 7; const x = e.x; s.step(.1); assert.ok(e.x - x > e.speed * .1); }
    if (w === 50) { e.age = 16; e.pulse = 0; s.enemyAct(e, .1); assert.equal(e.hasteT, 4); }
  }
});

test('저그 보행은 이동 거리를 따르고 기절·감속·보스 가속에도 전투 수치를 바꾸지 않는다', () => {
  const s = setup(), e = spawn(s);
  e.route = [{ x: e.x, y: e.y }, { x: e.x + 5000, y: e.y }]; e.gait = 0; e.pulse = 999;
  const initial = { x: e.x, hp: e.hp, reward: e.reward, r: e.r, speed: e.speed };
  s.step(.05); const normalGait = e.gait, normalDistance = e.x - initial.x;
  assert.ok(normalGait > 0);
  e.stunT = 1; s.step(.05); assert.equal(e.gait, normalGait); assert.equal(e.x, initial.x + normalDistance);
  e.stunT = 0; e.slow = .5; e.slowT = 1; s.step(.05);
  assert.ok(Math.abs(e.gait - normalGait * 1.5) < 1e-9);
  assert.deepEqual({ hp: e.hp, reward: e.reward, r: e.r, speed: e.speed },
    { hp: initial.hp, reward: initial.reward, r: initial.r, speed: initial.speed });
  const boss = spawn(s, 'boss'); boss.gait = 0; boss.pulse = 999;
  boss.route = e.route; boss.hasteT = 1; s.wave = 50;
  const before = boss.x; s.step(.05);
  assert.ok(Math.abs(boss.x - before - boss.speed * .05 * 1.8) < 1e-9);
  const phase = boss.gait; boss.speed = 0; s.step(.05); assert.equal(boss.gait, phase);
});

test('의무병은 범위 내 체력만 회복하고 보호막 지원은 중첩되지 않는다', () => {
  const s = setup(), a = spawn(s, 'grunt'), b = spawn(s, 'grunt', 800), m = spawn(s, 'medic');
  a.hp = b.hp = 1; m.pulse = 0; s.enemyAct(m, .1);
  assert.ok(a.hp > 1); assert.equal(b.hp, 1);
  const sh = spawn(s, 'shielder'); sh.pulse = 0; s.enemyAct(sh, .1); const shield = a.shield;
  sh.pulse = 0; s.enemyAct(sh, .1); assert.equal(a.shield, shield);
  a.hp = a.max; m.pulse = 0; s.enemyAct(m, .1); assert.equal(a.hp, a.max);
});

test('분열체는 처치된 위치와 진행 구간에서 보상 없는 질주병 2기를 만든다', () => {
  const s = setup(), e = spawn(s, 'splitter', 500, 320); e.seg = 3; const gold = s.gold;
  s.damageEnemy(e, e.hp + 1);
  const children = s.enemies.filter(x => !x.dead); assert.equal(children.length, 2);
  assert.ok(children.every(c => c.type === 'runner' && c.x === 500 && c.y === 320 && c.seg === 3 && c.reward === 0));
  for (const child of children) s.damageEnemy(child, child.hp + 1);
  assert.equal(s.gold, gold + e.reward); assert.equal(s.runStats.kills, 3);
});

test('베슬 공속은 가장 강한 2대의 효과만 100%·40%로 더하고 배치 순서와 무관하다', () => {
  const s = setup(), m = place(s, 'marine'), base = s.stats(m).rate;
  place(s, 'support', 7); assert.ok(Math.abs(s.stats(m).rate - base / 1.2) < 1e-9);
  const support = place(s, 'support', 8); assert.ok(Math.abs(s.stats(m).rate - base / 1.28) < 1e-9);
  support.lvl = 3; assert.ok(Math.abs(s.stats(m).rate - base / 1.38) < 1e-9);
  const third = place(s, 'support', 5); third.lvl = 5;
  assert.ok(Math.abs(s.stats(m).rate - base / 1.52) < 1e-9);
  s.towers.reverse(); assert.ok(Math.abs(s.stats(m).rate - base / 1.52) < 1e-9);
  third.x = m.x + s.supportRange(third) + 1;
  assert.ok(Math.abs(s.stats(m).rate - base / 1.38) < 1e-9);
  assert.equal(s.runStats.damage, 0);
});

test('베슬 중첩은 사거리 경계·벙커 승객·회수에 즉시 반응하고 자기 자신을 세지 않는다', () => {
  const s = setup(), bunker = place(s, 'bunker'), a = place(s, 'support', 7), b = place(s, 'support', 8);
  s.recruit(bunker.id, 0, 'marine'); const marine = bunker.passengers[0], base = config.TOWER_DEFS.marine.rate;
  assert.ok(Math.abs(s.stats(marine).rate - base / 1.28) < 1e-9);
  assert.ok(Math.abs(s.stats(a).rate - config.TOWER_DEFS.support.rate / 1.2) < 1e-9);
  b.x = marine.x + s.supportRange(b); b.y = marine.y;
  assert.ok(Math.abs(s.stats(marine).rate - base / 1.28) < 1e-9);
  b.x++;
  assert.ok(Math.abs(s.stats(marine).rate - base / 1.2) < 1e-9);
  s.selected = a; s.sell(); assert.equal(s.stats(marine).rate, base);
});

test('베슬 EMP는 표적 주변 반경 64의 보호막만 절반 제거하고 체력·전과·투사체를 만들지 않는다', () => {
  const s = setup(), vessel = place(s, 'support'); vessel.target = 'strong';
  const center = spawn(s, 'tank', vessel.x + 70, vessel.y), edge = spawn(s, 'tank', vessel.x + 134, vessel.y);
  const outside = spawn(s, 'tank', vessel.x + 135, vessel.y), bare = spawn(s, 'grunt', center.x, center.y);
  const dead = spawn(s, 'tank', center.x, center.y); dead.dead = true;
  center.hp = center.max = 10000;
  center.shield = 100; edge.shield = 60; outside.shield = 40; dead.shield = 80;
  const hp = s.enemies.map(e => e.hp);
  s.towerAct(vessel, .01);
  assert.deepEqual(s.enemies.map(e => e.shield), [50, 30, 40, 0, 80]);
  assert.deepEqual(s.enemies.map(e => e.hp), hp); assert.equal(bare.dead, undefined);
  assert.equal(vessel.cd, 8); assert.equal(s.projs.length, 0);
  assert.equal(s.runStats.damage, 0); assert.equal(s.runStats.kills, 0); assert.equal(s.runStats.units[0].damage, 0);
  s.towerAct(vessel, 7.9); assert.equal(center.shield, 50);
  s.towerAct(vessel, .11); assert.equal(center.shield, 25); assert.equal(vessel.cd, 8);
});

test('EMP는 사거리 밖·무보호막·죽은 표적에 낭비하지 않고 베슬별 재사용 시간을 따로 지킨다', () => {
  const s = setup(), a = place(s, 'support'), b = place(s, 'support', 7);
  const target = spawn(s, 'tank', a.x + s.supportRange(a) + 1, a.y); target.shield = 100;
  s.towerAct(a, 1); assert.equal(a.cd, 0); assert.equal(target.shield, 100);
  target.x = a.x + s.supportRange(a); target.shield = 0;
  s.towerAct(a, 1); assert.equal(a.cd, 0);
  target.shield = 100; target.dead = true;
  s.towerAct(a, 1); assert.equal(a.cd, 0);
  target.dead = false;
  s.towerAct(a, .01); assert.equal(target.shield, 50);
  s.towerAct(b, .01); assert.equal(target.shield, 25);
  s.towerAct(a, .01); s.towerAct(b, .01); assert.equal(target.shield, 25);
});

test('옵저버는 직접 피해 없이 취약을 부여하며 재사용 대기시간을 지킨다', () => {
  const s = setup(), o = place(s, 'observer'), e = spawn(s, 'tank', o.x, o.y + 30);
  const hp = e.hp;
  s.towerAct(o, .01); assert.deepEqual(e.observations, [{ source: o.id, left: 3 }]); assert.equal(s.projs.length, 0);
  e.observations = []; s.towerAct(o, .01); assert.deepEqual(e.observations, []);
  assert.equal(e.hp, hp); assert.equal(s.runStats.damage, 0);
});

test('옵저버는 미표식 적을 먼저 나누어 관측하고 같은 조건에서는 지정한 표적 순서를 지킨다', () => {
  const s = setup(), a = place(s, 'observer'), b = place(s, 'observer', 7), c = place(s, 'observer', 8);
  for (const o of [a, b, c]) o.target = 'boss';
  const boss = spawn(s, 'boss', a.x + 40, a.y), grunt = spawn(s, 'grunt', a.x + 50, a.y);
  const outside = spawn(s, 'grunt', 2000, a.y), dead = spawn(s, 'grunt', a.x, a.y); dead.dead = true;
  s.towerAct(a, .01); assert.equal(boss.observations[0].source, a.id);
  assert.equal(s.findTarget(b), grunt); s.towerAct(b, .01);
  assert.equal(grunt.observations[0].source, b.id);
  assert.equal(s.findTarget(c), boss); s.towerAct(c, .01);
  assert.equal(boss.observations.length, 2);
  assert.equal(outside.observations, undefined); assert.equal(dead.observations, undefined);
  assert.equal(s.findTarget(a), grunt, 'adds its own analysis before refreshing an existing mark');
});

test('같은 적의 관측은 서로 다른 옵저버로만 35%·45%·50%까지 쌓이고 반복 관측은 자기 시간만 갱신한다', () => {
  const s = setup(), observers = [6, 7, 8, 9].map(c => place(s, 'observer', c));
  const e = spawn(s, 'tank', observers[0].x + 40, observers[0].y); e.hp = e.max = 10000;
  for (let i = 0; i < observers.length; i++) {
    s.towerAct(observers[i], .01); const hp = e.hp; s.damageEnemy(e, 100);
    assert.ok(Math.abs(hp - e.hp - [135, 145, 150, 150][i]) < 1e-9);
  }
  assert.equal(e.observations.length, 4);
  for (const mark of e.observations) mark.left = 1;
  observers[0].cd = 0; s.towerAct(observers[0], .01);
  assert.deepEqual(e.observations.map(mark => mark.left), [3, 1, 1, 1]);
  assert.equal(e.observations.length, 4);
  const hp = e.hp; s.damageEnemy(e, 100); assert.equal(hp - e.hp, 150);
});

test('옵저버별 3초 관측은 따로 만료되어 피해 배율이 50%·45%·35%·0%로 내려간다', () => {
  const s = setup(), observers = [6, 7, 8].map(c => place(s, 'observer', c));
  const e = spawn(s, 'tank', observers[0].x + 40, observers[0].y); e.hp = e.max = 10000; e.speed = 0;
  for (const o of observers) o.cd = 999;
  for (const o of observers) {
    o.cd = 0; s.towerAct(o, 0); o.cd = 999;
    if (o !== observers.at(-1)) s.step(1);
  }
  for (const [index, damage] of [150, 145, 135, 100].entries()) {
    if (index) s.step(index === 1 ? 1.01 : 1);
    const hp = e.hp; s.damageEnemy(e, 100);
    assert.ok(Math.abs(hp - e.hp - damage) < 1e-9);
  }
  assert.deepEqual(e.observations, []);
});

test('드라군의 5초 취약과 옵저버 관측은 배율을 곱하지 않고 각 지속 시간을 유지한다', () => {
  const s = setup(), a = place(s, 'observer'), b = place(s, 'observer', 7);
  const e = spawn(s, 'tank', a.x + 40, a.y); e.hp = e.max = 10000; e.speed = 0; e.vulnerableT = 5;
  for (const o of [a, b]) { s.towerAct(o, 0); o.cd = 999; }
  let hp = e.hp; s.damageEnemy(e, 100); assert.ok(Math.abs(hp - e.hp - 145) < 1e-9);
  s.step(3.01); assert.ok(e.vulnerableT > 0); assert.deepEqual(e.observations, []);
  hp = e.hp; s.damageEnemy(e, 100); assert.ok(Math.abs(hp - e.hp - 135) < 1e-9);
  s.step(2); hp = e.hp; s.damageEnemy(e, 100); assert.equal(hp - e.hp, 100);
});

test('기본 지원 능력은 비용·스킬 슬롯 없이 자동 표시하고 EMP 재사용 시간은 저장·복원된다', () => {
  const s = setup(), vessel = place(s, 'support'), observer = place(s, 'observer', 7);
  const e = spawn(s, 'tank', vessel.x + 40, vessel.y); e.shield = 100;
  s.towerAct(vessel, 0); s.selected = vessel;
  const commands = s.commands(), gold = s.gold;
  assert.equal(commands[1].title, '화력 지원'); assert.equal(commands[2].texture, 'cmd_emp');
  assert.equal(commands[2].enabled, false); assert.equal(commands[2].active, true); assert.equal(commands[2].badge, '8s');
  commands[2].run(); assert.equal(s.gold, gold); assert.equal(vessel.skills.length, 0);
  s.selected = observer; assert.equal(s.commands()[1].title, '약점 분석'); assert.equal(s.commands()[2].title, '분산 관측');
  const save = checkpoint(); save.units = s.savedUnits(); save.stats = s.runStats; save.usedKinds = s.usedKinds;
  assert.equal(rules.validateSave(save), true);
  const restored = setup(); restored.restoreCheckpoint(save);
  const restoredVessel = restored.towers.find(t => t.k === 'support'); assert.equal(restoredVessel.cd, 8);
  const target = spawn(restored, 'tank', restoredVessel.x + 40, restoredVessel.y); target.shield = 100;
  restored.towerAct(restoredVessel, 7.9); assert.equal(target.shield, 100);
  restored.towerAct(restoredVessel, .11); assert.equal(target.shield, 50);
});

test('Lv.3 특화는 한 번만 비용을 차감하고 화력·연사·지원 범위를 실제로 바꾼다', () => {
  const s = setup(), t = place(s, 'cannon'); s.selected = t;
  assert.equal(s.specialize('power'), false); t.lvl = 3; const base = s.stats(t), gold = s.gold;
  assert.equal(s.specialize('power'), true); assert.equal(s.gold, gold - config.TOWER_DEFS.cannon.cost);
  assert.ok(s.stats(t).dmg > base.dmg); assert.ok(s.stats(t).rate > base.rate); assert.equal(s.specialize('rapid'), false);
  const rapid = place(s, 'cannon', 7); rapid.lvl = 3; s.selected = rapid; assert.equal(s.specialize('rapid'), true);
  assert.ok(s.stats(rapid).rate < base.rate); assert.ok(s.stats(rapid).splash > base.splash);
  const support = place(s, 'support', 8); support.lvl = 3; const range = s.supportRange(support); s.selected = support; s.specialize('power'); assert.equal(s.supportRange(support), range + 45);
});

test('모든 전투·지원 유닛은 Lv.5까지 강화되고 최대 단계에서는 추가 비용을 차감하지 않는다', () => {
  assert.equal(config.MAX_UNIT_LEVEL, 5);
  for (const key of config.TOWER_KEYS.filter(k => k !== 'bunker')) {
    const s = setup(), t = place(s, key), gold = s.gold;
    let cost = 0, previous = s.stats(t);
    for (let level = 2; level <= 5; level++) {
      cost += s.upgradeCost(t);
      assert.equal(s.upgradeUnit(t.id), true); assert.equal(t.lvl, level);
      const next = s.stats(t);
      assert.ok(next.range > previous.range); assert.ok(next.rate < previous.rate);
      if (config.TOWER_DEFS[key].dmg > 0) assert.ok(next.dmg > previous.dmg);
      previous = next;
    }
    assert.equal(s.gold, gold - cost);
    s.selected = t;
    assert.equal(s.commands()[0].badge, 'MAX'); assert.equal(s.commands()[0].enabled, false);
    assert.match(s.commands()[0].detail, /Lv\.5/);
    assert.equal(s.upgradeUnit(t.id), false); assert.equal(s.gold, gold - cost);
  }
});

test('Lv.3 특화는 Lv.4·5 강화 후에도 유지되고 특화를 미뤘다면 Lv.5에서도 선택할 수 있다', () => {
  const s = setup(), t = place(s, 'marine'); s.selected = t;
  s.upgradeUnit(t.id); s.upgradeUnit(t.id); s.equipSkill('stim', t.id);
  t.skills[0].cd = 6; assert.equal(s.specialize('rapid'), true);
  s.upgradeUnit(t.id); s.upgradeUnit(t.id);
  assert.equal(t.lvl, 5); assert.equal(t.branch, 'rapid'); assert.equal(t.skills[0].cd, 6);
  assert.equal(s.specialize('power'), false);
  const second = place(s, 'cannon', 7); s.selected = second;
  for (let i = 0; i < 4; i++) s.upgradeUnit(second.id);
  assert.equal(s.specialize('power'), true); assert.equal(second.branch, 'power');
});

test('기존 Lv.3 저장과 Lv.4·5 특화·주둔 저장을 복원하고 Lv.6은 거부한다', () => {
  for (const level of [3, 4, 5]) {
    const save = checkpoint(); save.units[1].lvl = level;
    assert.equal(rules.validateSave(save), true);
    const store = memory(); rules.writeStored(rules.SAVE_KEY, save, store);
    const s = setup(); s.restoreCheckpoint(rules.readSave(store));
    assert.equal(s.towers[1].lvl, level); assert.equal(s.towers[1].branch, 'rapid');
    assert.equal(s.towers[0].passengers[2], s.towers[1]);
    assert.deepEqual(JSON.parse(JSON.stringify(s.savedUnits())), save.units);
  }
  const save = checkpoint(); save.units[1].lvl = 6; assert.equal(rules.validateSave(save), false);
});

test('5웨이브 보상은 세 개의 서로 다른 선택지를 제공하고 선택 전 시작·중복 수령을 막는다', () => {
  const s = setup(); s.wave = 5; s.pending = ['power', 'range', 'repair']; s.lives = 19;
  s.startWave(); assert.equal(s.wave, 5); s.takeReward('supply'); assert.equal(s.pending.length, 3);
  s.takeReward('repair'); assert.equal(s.lives, 20); assert.equal(s.rewarded, 5);
  s.takeReward('repair'); assert.equal(s.lives, 20); s.startWave(); assert.equal(s.wave, 6);
  for (let i = 0; i < 20; i++) { const choices = rules.rewardChoices('budget'); assert.equal(new Set(choices).size, 3); assert.ok(!choices.includes('supply')); }
});

test('누적 전장 보상은 모든 종류의 기존 병력과 이후 건설한 병력에 똑같이 적용된다', () => {
  for (const k of config.TOWER_KEYS) {
    const s = setup(), existing = place(s, k);
    for (const [i, key] of ['power', 'haste', 'range', 'power'].entries()) {
      s.wave = (i + 1) * 5; s.pending = ['power', 'haste', 'range']; s.takeReward(key);
    }
    const added = place(s, k, 7), d = config.TOWER_DEFS[k];
    assert.deepEqual(s.stats(added), s.stats(existing), k);
    assert.equal(s.stats(added).dmg, d.dmg * 1.24, k);
    assert.equal(s.stats(added).range, d.range + 12, k);
    assert.equal(s.stats(added).rate, d.rate / ((k === 'support' ? 1.2 : 1) * 1.1), k);
  }
});

test('보상 후 벙커 충원과 저장 복원 뒤 새 병력도 전장 보상을 한 번씩 받는다', () => {
  const s = setup(), bunker = place(s, 'bunker');
  for (const [i, key] of ['power', 'haste', 'range'].entries()) {
    s.wave = (i + 1) * 5; s.pending = ['power', 'haste', 'range']; s.takeReward(key);
  }
  s.recruit(bunker.id, 0, 'marine');
  const expected = s.stats(bunker.passengers[0]);
  assert.equal(expected.dmg, config.TOWER_DEFS.marine.dmg * 1.12);
  assert.equal(expected.range, config.TOWER_DEFS.marine.range + 12 + 24);
  assert.equal(expected.rate, config.TOWER_DEFS.marine.rate / 1.1);
  const store = memory(), save = { ...checkpoint(), wave: s.wave, units: s.savedUnits(), bonuses: { ...s.bonuses },
    stats: s.runStats, pending: [], rewarded: s.rewarded, usedKinds: s.usedKinds };
  rules.writeStored(rules.SAVE_KEY, save, store);
  const restored = setup(); restored.restoreCheckpoint(rules.readSave(store));
  const restoredBunker = restored.towers[0]; restored.recruit(restoredBunker.id, 1, 'marine');
  assert.deepEqual(restored.stats(restoredBunker.passengers[0]), expected);
  assert.deepEqual(restored.stats(restoredBunker.passengers[1]), expected);
  const added = place(restored, 'marine', 7);
  assert.equal(restored.stats(added).dmg, expected.dmg);
  assert.equal(restored.stats(added).range, expected.range - 24);
  assert.equal(restored.stats(added).rate, expected.rate);
});

test('건설 대기 정보는 전장 보상·고지·지원 오라를 반영해 배치 직후 정보와 일치한다', () => {
  const s = setup('standard', 'canyon');
  s.bonuses = { power: .24, haste: .2, range: 24 };
  place(s, 'support', 7, 2);
  const label = () => ({ text: '', setText(value) { this.text = value; return this; }, setColor() {}, setTexture() {}, setDisplaySize() {} });
  for (const key of ['hud', 'mineralTxt', 'lifeTxt', 'unitTitle', 'info', 'unitImage']) s[key] = label();
  s.goBtn = s.shopBtn = { set() {}, en() {} }; s.commandCard = { update() {} }; s.commands = () => [];
  for (const k of ['marine', 'carrier', 'support', 'observer']) {
    s.selected = null; s.building = k; s.hover = { c: 6, r: 2 }; s.refreshUI();
    const preview = s.info.text, tower = place(s, k, 6, 2);
    s.selected = tower; s.building = null; s.refreshUI();
    assert.equal(s.info.text, preview, k);
    s.towers = s.towers.filter(t => t !== tower);
  }
});

test('보급 상점의 현재·강화 예상 수치는 보상·특화·주둔·고지·버프·오라를 포함한 전투 계산과 같다', () => {
  const { SupplyShop } = createSourceLoader({ './unitArt': { unitPortraitUrl: () => '' }, './commandIcons': { commandIconUrl: () => '' }, './shop.css': {} })('./shop');
  const shop = Object.create(SupplyShop.prototype);
  const s = setup('standard', 'canyon'), bunker = place(s, 'bunker', 6, 2), support = place(s, 'support', 7, 2);
  s.recruit(bunker.id, 0, 'marine'); const marine = bunker.passengers[0];
  s.bonuses = { power: .24, haste: .2, range: 24 };
  marine.lvl = support.lvl = 3; marine.branch = 'power'; support.branch = 'rapid';
  marine.buffs = [{ left: 4, haste: 1.8, power: 1.3 }];
  for (const tower of [marine, support]) {
    const state = s.shopState(), unit = state.units.find(u => u.id === tower.id), current = s.stats(tower);
    assert.deepEqual(unit.stats, current);
    tower.lvl++; const next = s.stats(tower); tower.lvl--;
    assert.deepEqual(unit.nextStats, next);
    const html = shop.armyDetail(state, unit);
    const stat = (label, now, then, digits = 0) => {
      const format = v => String(+v.toFixed(digits));
      assert.ok(html.includes(`aria-label="${label} ${format(now)}${format(now) !== format(then) ? ` → ${format(then)}` : ''}"`), label);
    };
    stat(tower === support ? '지원 반경' : '사거리', current.range, next.range);
    if (tower === marine) {
      stat('공격력', current.dmg, next.dmg);
      stat('초당 공격', 1 / current.rate, 1 / next.rate, 2);
      stat('DPS', current.dmg / current.rate, next.dmg / next.rate, 1);
    }
  }
});

test('지휘관 능력은 교전 중에만 작동하고 보스 피해·감속·재사용 제한을 지킨다', () => {
  const s = setup(), e = spawn(s, 'grunt'), boss = spawn(s, 'boss'); boss.shield = 0;
  s.useCommander('strike'); assert.equal(e.hp, e.max);
  s.waveActive = true; s.useCommander('strike'); assert.ok(Math.abs(e.hp - e.max * .7) < 1e-8); assert.ok(Math.abs(boss.hp - boss.max * .88) < 1e-8);
  const hp = e.hp; s.useCommander('strike'); assert.equal(e.hp, hp);
  s.useCommander('slow'); assert.equal(e.slow, .35); assert.equal(e.slowT, 5);
  s.paused = true; s.useCommander('supply'); assert.equal(s.commander.supply, 0);
  s.paused = false; s.useCommander('supply'); assert.equal(s.gold, 10100);
  const cd = s.commander.strike; s.step(.1); assert.ok(s.commander.strike < cd);
});

test('벙커 모드는 금지 유닛 건설을 거부하고 제한 예산은 처치·클리어·보급 수입을 차단한다', () => {
  const s = setup('bunker'); s.building = 'cruiser'; s.placeTower(6, 1); assert.equal(s.towers.length, 0);
  assert.ok(rules.allowedUnit('marine', 'bunker')); assert.ok(!rules.allowedUnit('observer', 'bunker'));
  const b = setup('budget'), e = spawn(b); const gold = b.gold; b.damageEnemy(e, e.hp + 1); assert.equal(b.gold, gold);
  b.wave = 1; b.waveActive = true; b.enemies = []; b.step(.01); assert.equal(b.gold, gold);
  b.waveActive = true; b.useCommander('supply'); assert.equal(b.gold, gold); assert.equal(b.commander.supply, 0);
});

test('무한 모드는 50 이후 계속되며 난이도별 적 체력·속도가 실제로 다르다', () => {
  const s = setup('endless'); s.wave = 50; s.startWave(); assert.equal(s.wave, 51);
  const values = [];
  for (const d of ['easy', 'normal', 'hard']) { const g = setup(); g.options.difficulty = d; const e = spawn(g); values.push([e.hp, e.speed]); }
  assert.ok(values[0][0] < values[1][0] && values[1][0] < values[2][0]);
  assert.ok(values[0][1] < values[1][1] && values[1][1] < values[2][1]);
  s.wave = 10000; const e = spawn(s); assert.ok(Number.isFinite(e.hp));
});

test('전투 통계는 과잉 피해와 보호막을 제외하고 유닛·스킬·지휘관 처치를 구분한다', () => {
  const s = setup(), t = place(s, 'marine'), e = spawn(s); e.hp = 5; e.shield = 10;
  s.damageEnemy(e, 12, 'normal', t.id); assert.equal(e.hp, 3); assert.equal(s.runStats.damage, 2);
  s.damageEnemy(e, 100, 'skill', t.id); assert.equal(s.runStats.damage, 5); assert.equal(s.runStats.units[0].damage, 5); assert.equal(s.runStats.units[0].kills, 1);
  const second = spawn(s); second.hp = 10; s.damageEnemy(second, 50, 'skill', 'commander'); assert.equal(s.runStats.commanderDamage, 10); assert.equal(s.runStats.kills, 2);
});

test('테스트 범위는 기본·보스만·라인만으로 최종 웨이브 편성을 나눈다', () => {
  const all = rules.wavePlan(50), line = rules.wavePlan(50, 'line');
  assert.deepEqual(rules.wavePlan(50, 'boss'), ['boss']); assert.ok(!line.includes('boss')); assert.deepEqual([...line, 'boss'], all);
  const s = setup(); s.testMode = true; s.wave = 50; s.testScope = 'line'; s.startWave(); assert.deepEqual(s.spawnQ, line);
  s.testScope = 'boss'; assert.equal(s.testScope, 'boss');
});

test('전투 통계는 보스 피해를 종합 피해 안에서 따로 센다', () => {
  const s = setup(), t = place(s, 'marine'), boss = spawn(s, 'boss'), grunt = spawn(s); boss.shield = 0;
  s.damageEnemy(boss, 40, 'normal', t.id); s.damageEnemy(grunt, 7, 'normal', t.id);
  const u = s.runStats.units[0]; assert.equal(u.boss, 40); assert.equal(u.damage, 40 + Math.min(7, grunt.max));
  assert.equal(s.runStats.bossDamage, 40); assert.equal(s.runStats.damage, u.damage);
  const old = rules.newStats(); delete old.bossDamage; old.units.push({ id: '1', k: 'marine', damage: 3, kills: 0 });
  assert.equal(rules.normalizeStats(old).bossDamage, 0); assert.equal(old.units[0].boss, 0);
});

test('자동 스킬·지속 영역·화상 피해는 발사한 병력의 전과에 귀속된다', () => {
  const s = setup(), f = place(s, 'firebat'), e = spawn(s, 'tank', f.x, f.y + 30);
  s.autoSkill(f, 'inferno', e); assert.equal(e.burnSource, f.id); assert.ok(s.runStats.units[0].damage > 0);
  const before = s.runStats.units[0].damage; s.towerAct = () => {}; s.step(.1); assert.ok(s.runStats.units[0].damage > before);
  const a = place(s, 'templar', 7); s.autoSkill(a, 'storm', e); assert.equal(s.fields[0].source, a.id);
  s.step(.5); assert.ok(s.runStats.units.find(u => u.id === a.id).damage > 0);
});

test('재배치는 빈 칸 확정 시만 차감하고 벙커와 주둔 병력의 위치·강화·스킬을 보존한다', () => {
  const s = setup(), b = place(s, 'bunker'); s.recruit(b.id, 2, 'marine'); const m = b.passengers[2];
  m.lvl = 3; m.skills = [{ key: 'stim', cd: 5 }]; m.branch = 'rapid'; s.selected = b;
  const gold = s.gold; assert.equal(s.beginRelocate(), true); assert.equal(s.gold, gold);
  s.finishRelocate(0, 2); assert.equal(s.gold, gold); assert.equal(b.c, 6);
  s.finishRelocate(8, 1); assert.equal(s.gold, gold - 20); assert.equal(b.c, 8); assert.equal(m.c, 8); assert.equal(m.host, b); assert.equal(m.base.visible, false); assert.equal(m.lvl, 3); assert.equal(m.skills[0].cd, 5); assert.equal(m.branch, 'rapid');
  s.selected = b; s.waveActive = true; assert.equal(s.beginRelocate(), false);
});

test('재배치 취소는 돈과 위치를 바꾸지 않고 다른 건설 명령은 이동 대기를 해제한다', () => {
  const s = setup(), t = place(s, 'marine'); s.selected = t; const gold = s.gold;
  s.beginRelocate(); s.cancelCommand(); assert.equal(s.gold, gold); assert.equal(t.c, 6); assert.equal(s.relocating, null);
  s.selected = t; s.beginRelocate(); s.chooseBuild('cannon', true); assert.equal(s.relocating, null);
});

test('체크포인트는 주둔·특화·재사용 시간·버프·통계·보상을 손실 없이 복원한다', () => {
  const save = checkpoint(); assert.equal(rules.validateSave(save), true);
  const s = setup(); s.restoreCheckpoint(save);
  assert.deepEqual(JSON.parse(JSON.stringify(s.savedUnits())), save.units);
  assert.equal(s.towers[0].passengers[2], s.towers[1]); assert.equal(s.towers[1].base.visible, false); assert.equal(s.nextUnitId, 7);
  assert.deepEqual(s.pending, save.pending); assert.deepEqual(s.commander, save.commander); assert.deepEqual(s.bonuses, save.bonuses);
  s.towers[1].skills[0].cd = 0; assert.equal(save.units[1].skills[0].cd, 4);
  const next = place(s, 'marine', 8); assert.equal(next.id, '8');
});

test('저장 검증은 잘못된 경로 배치·슬롯 충돌·깨진 수치·스킬·보상 중복을 거부한다', () => {
  const mutations = [v => { v.version = 2; }, v => { v.gold = NaN; }, v => { v.units[0].r = 2; },
    v => { v.units[1].slot = 4; }, v => { v.units[1].hostId = '999'; }, v => { v.units[1].skills[0].key = 'storm'; },
    v => { v.pending = ['power', 'power', 'range']; }, v => { v.rewarded = 5; }, v => { v.pending = []; },
    v => { v.units.push({ ...v.units[1], id: '8' }); }, v => { v.units[1].lvl = 2; }, v => { v.commander.strike = Infinity; },
    v => { v.units[1].buffs[0].haste = -1; }, v => { v.stats.units = [{ id: '<img>', k: 'marine', damage: 0, kills: 0 }]; }];
  for (const mutate of mutations) { const v = checkpoint(); mutate(v); assert.equal(rules.validateSave(v), false); }
});

test('저장소 사용 불가와 손상된 JSON은 예외 없이 처리하고 유효한 저장만 제공한다', () => {
  const store = memory(), save = checkpoint(); assert.equal(rules.writeStored(rules.SAVE_KEY, save, store), true);
  assert.deepEqual(rules.readSave(store), save); store.setItem(rules.SAVE_KEY, '{broken'); assert.equal(rules.readSave(store), null);
  const denied = { getItem() { throw new Error(); }, setItem() { throw new Error(); }, removeItem() { throw new Error(); } };
  assert.equal(rules.readSave(denied), null); assert.equal(rules.writeStored('x', save, denied), false); assert.doesNotThrow(() => rules.clearSave(denied));
});

test('업적은 클리어 조건에 따라 한 번씩 해금되고 외형을 잠금 없이 조작할 수 없다', () => {
  const p = rules.readProfile(memory()), stats = rules.newStats();
  assert.deepEqual(rules.awardAchievements(p, 10, false, stats, rules.DEFAULT_OPTIONS, []), ['first']);
  const earned = rules.awardAchievements(p, 50, true, stats, { ...rules.DEFAULT_OPTIONS, mode: 'bunker' }, ['marine', 'frost']);
  assert.deepEqual(earned.sort(), ['combined', 'flawless', 'infantry', 'victory']); assert.equal(p.wins, 1);
  assert.deepEqual(rules.awardAchievements(p, 50, true, stats, rules.DEFAULT_OPTIONS, ['marine']), []);
  const store = memory(); store.setItem(rules.PROFILE_KEY, JSON.stringify({ version: 1, skin: 'gold', achievements: [] })); assert.equal(rules.readProfile(store).skin, 'standard');
  p.skin = 'ion'; rules.writeStored(rules.PROFILE_KEY, p, store); assert.equal(rules.readProfile(store).skin, 'ion');
});

test('게임 종료는 체크포인트를 정리하고 실패한 웨이브로 클리어 업적을 주지 않는다', () => {
  const store = memory(), oldStorage = global.localStorage; global.localStorage = store;
  try {
    rules.writeStored(rules.SAVE_KEY, checkpoint(), store);
    const s = setup(); s.wave = 10; s.waveActive = true; s.endGame(false);
    assert.equal(rules.readSave(store), null); assert.ok(!s.profile.achievements.includes('first')); assert.equal(s.runStats.waves.length, 1);
    const v = setup(); v.wave = 50; v.endGame(true); assert.ok(v.profile.achievements.includes('victory')); assert.ok(v.profile.achievements.includes('flawless'));
    v.profile.skin = 'gold'; const m = place(setup(), 'marine'); v.towers = [m]; v.applySkin(); assert.equal(m.base.tint, 0xffdb85);
  } finally { if (oldStorage === undefined) delete global.localStorage; else global.localStorage = oldStorage; }
});

test('50웨이브 승리 후 계속 플레이는 병력·자원·원래 작전 규칙과 승리 기록을 보존한다', () => {
  const store = memory(), oldStorage = global.localStorage; global.localStorage = store;
  try {
    for (const mode of ['standard', 'bunker', 'budget', 'augment']) {
      const s = setup(mode), marine = place(s, 'marine'); s.wave = 50; s.rewarded = 45;
      s.runLaunched = true; const gold = s.gold; s.endGame(true); const wins = s.profile.wins;
      let closed = 0, awake = 0; s.closeResult = () => closed++; s.stopIdleSleep = () => awake++;
      s.continuePlaying();
      assert.equal(s.over, false); assert.equal(s.continued, true); assert.equal(s.options.mode, mode);
      assert.equal(s.towers[0], marine); assert.equal(s.lives, 20); assert.equal(s.profile.wins, wins);
      assert.equal(closed, 1); assert.equal(awake, 1); assert.equal(s.waveActive, false);
      assert.equal(s.gold, gold + (mode === 'budget' ? 0 : config.CLEAR_BONUS_BASE + 50 * config.CLEAR_BONUS_PER_WAVE));
      assert.equal(s.pending.length, 3); if (mode === 'budget') assert.ok(!s.pending.includes('supply'));
      const save = rules.readSave(store); assert.ok(save); assert.equal(save.continued, true); assert.equal(save.options.mode, mode);
      s.continuePlaying(); assert.equal(closed, 1); assert.equal(s.gold, save.gold);
      s.startWave(); assert.equal(s.wave, 50); // 50웨이브 보상을 먼저 고른다.
      s.takeReward(s.pending[0]); s.startWave(); assert.equal(s.wave, 51);
      s.spawnQ = []; s.step(.01); assert.equal(s.over, false); assert.equal(s.profile.wins, wins);
      s.startWave(); assert.equal(s.wave, 52);
      s.endGame(false); assert.equal(s.profile.wins, wins); assert.equal(s.profile.bestWave, 51);
    }
  } finally { if (oldStorage === undefined) delete global.localStorage; else global.localStorage = oldStorage; }
});

test('계속 플레이 체크포인트는 보상 선택 전후와 55웨이브에서 복원되어 다음 웨이브를 연다', () => {
  for (const wave of [50, 55, 101]) for (const pending of [[], ['power', 'haste', 'range']]) {
    if (pending.length && wave % 5 !== 0) continue;
    const save = checkpoint(); save.wave = wave; save.continued = true; save.pending = pending;
    save.rewarded = Math.floor(wave / 5) * 5 - (pending.length ? 5 : 0);
    assert.equal(rules.validateSave(save), true);
    const s = setup(); s.restoreCheckpoint(save); assert.equal(s.continued, true);
    if (s.pending.length) s.takeReward(s.pending[0]);
    s.startWave(); assert.equal(s.wave, wave + 1); assert.deepEqual(s.spawnQ, rules.wavePlan(wave + 1));
  }
});

test('승리 전·패배·테스트에서는 계속 플레이를 열지 않고 잘못된 연장 저장은 거부한다', () => {
  const s = setup(); s.wave = 50; s.startWave(); assert.equal(s.wave, 50);
  s.continuePlaying(); assert.equal(s.continued, false);
  s.endGame(false); s.continuePlaying(); assert.equal(s.over, true); assert.equal(s.continued, false);
  const t = setup(); t.testMode = true; t.wave = 50; t.endGame(true); t.continuePlaying(); assert.equal(t.continued, false);
  for (const value of ['true', 1, {}, null, true]) {
    const save = checkpoint(); save.continued = value; assert.equal(rules.validateSave(save), false);
  }
  const save = checkpoint(); save.wave = 50; save.pending = []; save.rewarded = 50;
  assert.equal(rules.validateSave(save), false); save.options.mode = 'endless'; assert.equal(rules.validateSave(save), true);
});

test('튜토리얼은 실제 배치·강화·스킬·탑승 완료로만 진행한다', () => {
  const s = setup(); s.advanceTutorial(); assert.equal(s.tutorial, 0);
  const m = place(s, 'marine'); s.advanceTutorial(); assert.equal(s.tutorial, 1);
  s.upgradeUnit(m.id); s.advanceTutorial(); assert.equal(s.tutorial, 2);
  s.equipSkill('stim', m.id); s.advanceTutorial(); assert.equal(s.tutorial, 3);
  const b = place(s, 'bunker', 7); s.board(b.id, 0, m.id); s.advanceTutorial(); assert.equal(s.tutorial, 4); assert.equal(s.profile.tutorialDone, true);
});

test('테스트 모드는 실제 작전 저장과 영구 업적에 영향을 주지 않는다', () => {
  const store = memory(), oldStorage = global.localStorage; global.localStorage = store;
  try {
    rules.writeStored(rules.SAVE_KEY, checkpoint(), store); const before = store.getItem(rules.SAVE_KEY);
    const s = setup(); s.testMode = true; s.runLaunched = true; s.saveCheckpoint(true); s.wave = 50; s.endGame(true);
    assert.equal(store.getItem(rules.SAVE_KEY), before); assert.equal(store.getItem(rules.PROFILE_KEY), null);
  } finally { if (oldStorage === undefined) delete global.localStorage; else global.localStorage = oldStorage; }
});

test('테란과 프로토스는 각각 고유한 9종을 제공하고 전체 18종에 누락·중복이 없다', () => {
  const all = Object.values(config.FACTION_TOWERS).flat();
  assert.equal(all.length, 18); assert.equal(new Set(all).size, 18);
  assert.deepEqual([...all].sort(), [...config.TOWER_KEYS].sort());
  for (const [faction, keys] of Object.entries(config.FACTION_TOWERS)) {
    assert.equal(keys.length, 9);
    for (const key of keys) assert.equal(config.TOWER_DEFS[key].faction, faction);
  }
  assert.equal(config.TOWER_DEFS.support.name, '사이언스 베슬');
});

test('종족 전환은 3×3 명령과 1~9 단축키를 같은 순서로 전환하고 지원 병력도 직접 배치한다', () => {
  const s = setup();
  for (const [faction, hotkey] of [['terran', 't'], ['protoss', 'r']]) {
    s.onKey({ key: hotkey }); assert.equal(s.faction, faction);
    assert.deepEqual(s.commands().map(c => c.id), config.FACTION_TOWERS[faction].map(k => 'build:' + k));
    for (let i = 0; i < 9; i++) {
      s.onKey({ key: String(i + 1) });
      assert.equal(s.building, config.FACTION_TOWERS[faction][i]);
    }
    s.cancelCommand(); s.commands()[8].run(); assert.equal(s.building, config.FACTION_TOWERS[faction][8]);
  }
  assert.equal(s.building, 'observer');
  s.chooseBuild('support', true); assert.equal(s.faction, 'terran'); assert.equal(s.building, 'support');
});

test('종족 선택은 진행 중 배치·하차·재배치를 비용 없이 취소하고 벙커 모드와 종료 상태를 지킨다', () => {
  const s = setup(), unit = place(s, 'marine'), gold = s.gold;
  s.selected = unit; s.relocating = unit; s.unloading = unit; s.building = 'marine';
  s.selectFaction('protoss');
  for (const key of ['selected', 'building', 'relocating', 'unloading']) assert.equal(s[key], null);
  assert.equal(s.gold, gold); assert.equal(s.towers.length, 1);
  const bunker = setup('bunker'); bunker.selectFaction('protoss');
  assert.equal(bunker.faction, 'terran');
  assert.deepEqual(bunker.commands().filter(c => c.enabled).map(c => c.id), ['build:marine', 'build:firebat', 'build:bunker']);
  s.over = true; s.selectFaction('terran'); assert.equal(s.faction, 'protoss');
});

test('질럿은 사거리 밖을 공격하지 않고 근접 표적을 투사체 없이 즉시 베어 자신의 전과에 기록한다', () => {
  const s = setup(), unit = place(s, 'zealot');
  const enemy = spawn(s, 'tank', unit.x + 90, unit.y); enemy.hp = enemy.max = 10000;
  s.towerAct(unit, .01); assert.equal(enemy.hp, 10000);
  enemy.x = unit.x + 50; s.towerAct(unit, .01);
  assert.equal(enemy.hp, 10000 - s.stats(unit).dmg); assert.equal(s.projs.length, 0);
  assert.equal(s.runStats.units.find(u => u.id === unit.id).damage, s.stats(unit).dmg);
});

test('하이 템플러는 무기 대신 지속 폭풍을 시전하고 범위 안의 적만 시전자 전과로 타격한다', () => {
  const s = setup(), unit = place(s, 'highTemplar');
  const center = spawn(s, 'tank', unit.x + 60, unit.y), near = spawn(s, 'tank', unit.x + 70, unit.y), far = spawn(s, 'tank', unit.x + 200, unit.y);
  for (const enemy of [center, near, far]) { enemy.hp = enemy.max = 10000; enemy.speed = 0; }
  s.towerAct(unit, .01); assert.equal(s.fields.length, 1); assert.equal(s.projs.length, 0);
  assert.equal(center.hp, 10000); s.step(.5);
  assert.equal(center.hp, 10000 - s.stats(unit).dmg); assert.equal(near.hp, center.hp); assert.equal(far.hp, 10000);
  assert.equal(s.runStats.units.find(u => u.id === unit.id).damage, s.stats(unit).dmg * 2);
});

test('골리앗·스카우트의 쌍열 사격은 피해를 분배하고 캐리어는 독립된 인터셉터 8기를 발사한다', () => {
  for (const [key, count, multiplier] of [['goliath', 2, 1], ['scout', 2, 1], ['carrier', 8, 8]]) {
    const s = setup(), unit = place(s, key), enemy = spawn(s, 'tank', unit.x + 60, unit.y);
    enemy.hp = enemy.max = 10000;
    s.towerAct(unit, .01); assert.equal(s.projs.length, count);
    assert.equal(new Set(s.projs.map(p => p.y)).size, count);
    for (const p of s.projs) { assert.equal(p.source, unit.id); s.hit(p); }
    assert.ok(Math.abs(enemy.hp - (10000 - s.stats(unit).dmg * multiplier)) < 1e-8);
    assert.ok(Math.abs(s.runStats.units[0].damage - config.attackDamage(key, s.stats(unit).dmg)) < 1e-8);
  }
});

test('표적을 처치한 뒤 남은 인터셉터는 다음 적에게 명중하고 일반 탄환은 소멸한다', () => {
  for (const key of ['carrier', 'scout']) {
    const s = setup(), unit = place(s, key), first = spawn(s, 'tank', unit.x + 60, unit.y);
    const second = spawn(s, 'tank', unit.x + 85, unit.y);
    first.hp = 1; second.hp = second.max = 10000;
    first.speed = second.speed = 0; unit.target = 'weak';
    s.towerAct(unit, .01); unit.cd = 100;
    for (let i = 0; i < 60; i++) s.step(1 / 60);
    const remaining = key === 'carrier' ? s.stats(unit).dmg * 7 : 0;
    assert.equal(first.dead, true); assert.equal(second.hp, 10000 - remaining);
    assert.equal(s.projs.length, 0);
    assert.equal(s.runStats.units[0].damage, 1 + remaining);
    assert.equal(s.runStats.units[0].kills, 1);
  }
});

test('인터셉터 재탐색은 캐리어의 보스 우선 명령과 사거리 제한을 따른다', () => {
  const s = setup(), unit = place(s, 'carrier'), first = spawn(s, 'tank', unit.x + 60, unit.y);
  s.fire(unit, first, s.stats(unit)); unit.cd = 100;
  const weak = spawn(s, 'tank', unit.x + 40, unit.y), boss = spawn(s, 'boss', unit.x + 150, unit.y);
  const outside = spawn(s, 'boss', unit.x + s.stats(unit).range + 1, unit.y);
  for (const e of [first, weak, boss, outside]) e.speed = 0;
  s.damageEnemy(first, first.hp); unit.target = 'boss'; s.step(1 / 60);
  assert.equal(s.projs.length, 8);
  assert.ok(s.projs.every(p => p.tgt === boss && p.source === unit.id));
  assert.equal(weak.hp, weak.max); assert.equal(outside.hp, outside.max);
});

test('재탐색할 적이 없거나 캐리어가 회수되면 남은 인터셉터를 정리한다', () => {
  for (const removed of [false, true]) {
    const s = setup(), unit = place(s, 'carrier'), first = spawn(s, 'tank', unit.x + 60, unit.y);
    const other = spawn(s, 'tank', unit.x + (removed ? 100 : s.stats(unit).range + 1), unit.y);
    first.speed = other.speed = 0;
    s.fire(unit, first, s.stats(unit)); unit.cd = 100;
    s.damageEnemy(first, first.hp);
    if (removed) s.towers = [];
    s.step(1 / 60);
    assert.equal(s.projs.length, 0); assert.equal(other.hp, other.max);
  }
});

test('인터셉터 집중 공격은 처치 후 다음 적으로 이어지고 단일 표적 피해를 중복 배율 없이 계산한다', () => {
  for (const lvl of [1, 3, 5]) {
    const s = setup(), unit = place(s, 'carrier'); unit.lvl = lvl; unit.branch = 'power';
    unit.buffs = [{ left: 6, haste: 2, power: 1.3 }]; s.bonuses.power = .12;
    const first = spawn(s, 'tank', unit.x + 60, unit.y), second = spawn(s, 'tank', unit.x + 80, unit.y);
    first.hp = 1; second.hp = second.max = 100000;
    const damage = s.stats(unit).dmg * 2;
    s.autoSkill(unit, 'interceptors', first);
    assert.equal(first.dead, true);
    assert.ok(Math.abs(second.hp - (100000 - damage * 7)) < 1e-8);
    assert.ok(Math.abs(s.runStats.units[0].damage - (1 + damage * 7)) < 1e-8);
    second.hp = second.max; const before = s.runStats.units[0].damage;
    s.autoSkill(unit, 'interceptors', second);
    assert.ok(Math.abs(s.runStats.units[0].damage - before - damage * 8) < 1e-8);
  }
});

test('캐리어 강화·연사 특화·재출격이 실제 출격 주기를 줄이고 8기 합산 화력을 유지한다', () => {
  const s = setup(), unit = place(s, 'carrier'), enemy = spawn(s, 'tank', unit.x + 60, unit.y);
  enemy.hp = enemy.max = 1000000; enemy.speed = 0;
  unit.lvl = 3; unit.branch = 'rapid'; s.autoSkill(unit, 'carrierCapacity', enemy);
  let launches = 0;
  const fire = s.fire.bind(s); s.fire = (...args) => { launches++; fire(...args); };
  for (let i = 0; i < 120; i++) s.step(1 / 60);
  assert.ok(launches >= 9, '강화·연사·재출격으로 2초 안에 최소 9회 출격');
  unit.cd = 100;
  for (let i = 0; i < 60; i++) s.step(1 / 60);
  const { levelStats } = load('./management');
  assert.ok(Math.abs(s.runStats.units[0].damage - launches * config.attackDamage('carrier', levelStats('carrier', 3).dmg)) < 1e-7);
  assert.equal(s.projs.length, 0);
});

test('고스트의 락다운은 일반 적과 보스 정지 시간을 구분하고 리버의 스캐럽은 폭발 반경을 지킨다', () => {
  const s = setup(), ghost = place(s, 'ghost'), enemy = spawn(s, 'tank', ghost.x + 50, ghost.y), boss = spawn(s, 'boss', ghost.x + 60, ghost.y);
  for (const e of [enemy, boss]) e.hp = e.max = 10000;
  s.autoSkill(ghost, 'lockdown', enemy); s.autoSkill(ghost, 'lockdown', boss);
  assert.equal(enemy.stunT, 3); assert.equal(boss.stunT, .8);
  const r = setup(), reaver = place(r, 'reaver'), target = spawn(r, 'tank', reaver.x + 80, reaver.y);
  const inside = spawn(r, 'tank', target.x + 70, target.y), outside = spawn(r, 'tank', target.x + 90, target.y);
  for (const e of [target, inside, outside]) e.hp = e.max = 10000;
  r.fire(reaver, target, r.stats(reaver)); assert.equal(r.projs.length, 1); r.hit(r.projs[0]);
  assert.equal(target.hp, 9915); assert.equal(inside.hp, 9915); assert.equal(outside.hp, 10000);
});

test('새 7종은 전용 자동 스킬 2종을 구매하고 중복·타 유닛 장착 없이 재사용 제한을 따른다', () => {
  const { SKILL_DEFS, SKILL_KEYS } = load('./catalog');
  for (const key of ['ghost', 'goliath', 'zealot', 'highTemplar', 'reaver', 'scout', 'carrier']) {
    const s = setup(), unit = place(s, key), enemy = spawn(s, 'tank', unit.x + 50, unit.y);
    enemy.hp = enemy.max = 1000000;
    const skills = SKILL_KEYS.filter(k => SKILL_DEFS[k].unit === key), gold = s.gold;
    assert.equal(skills.length, 2);
    for (const skill of skills) { assert.equal(s.equipSkill(skill, unit.id), true); assert.equal(s.equipSkill(skill, unit.id), false); }
    assert.equal(s.equipSkill('stim', unit.id), false);
    assert.equal(s.gold, gold - skills.reduce((cost, skill) => cost + SKILL_DEFS[skill].cost, 0));
    s.towerAct(unit, .01);
    for (const skill of unit.skills) assert.equal(skill.cd, SKILL_DEFS[skill.key].cooldown);
    const damage = s.runStats.damage; s.towerAct(unit, .01);
    assert.equal(s.runStats.damage, damage);
    for (const skill of unit.skills) assert.ok(skill.cd < SKILL_DEFS[skill.key].cooldown);
  }
});

test('새 7종의 강화·특화·자동 스킬 저장은 기존 버전 형식으로 검증되고 손실 없이 복원된다', () => {
  const { SKILL_DEFS, SKILL_KEYS } = load('./catalog');
  for (const key of ['ghost', 'goliath', 'zealot', 'highTemplar', 'reaver', 'scout', 'carrier']) {
    const save = checkpoint();
    save.units = [{ ...save.units[0], k: key, lvl: 5, branch: 'power', skills: SKILL_KEYS.filter(k => SKILL_DEFS[k].unit === key).map(key => ({ key, cd: 2 })) }];
    save.usedKinds = [key];
    assert.equal(rules.validateSave(save), true);
    const s = setup(); s.restoreCheckpoint(save);
    assert.deepEqual(JSON.parse(JSON.stringify(s.savedUnits())), save.units);
  }
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Use the production scene and rules. Only rendering/DOM are replaced.
const modules = new Map();
function load(name) {
  if (name === 'phaser') return { Scene: class {} };
  if (['./shop', './textures', './ui', './operations'].includes(name)) return {};
  if (name === './unitArt') return { UNIT_WORLD_SCALE: {} };
  if (modules.has(name)) return modules.get(name);
  const filename = path.resolve(__dirname, '../src', name.slice(2) + '.ts');
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  const mod = { exports: {} }; modules.set(name, mod.exports);
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename })(load, mod, mod.exports);
  return mod.exports;
}
const rules = load('./campaign'), config = load('./config'), { GameScene } = load('./GameScene');
function sprite(x = 0, y = 0) {
  const s = { x, y, visible: true, tint: 0xffffff };
  for (const k of ['setDepth', 'setOrigin', 'setScale', 'setRotation', 'setStrokeStyle', 'setAlpha', 'setLetterSpacing', 'setInteractive', 'on', 'destroy', 'setText']) s[k] = () => s;
  s.setPosition = (x, y) => { s.x = x; s.y = y; return s; };
  s.setVisible = v => { s.visible = v; return s; };
  s.setTint = t => { s.tint = t; return s; }; s.clearTint = () => s;
  return s;
}
function setup(mode = 'standard') {
  config.configureMap('frontier');
  const s = new GameScene();
  s.options = { ...rules.DEFAULT_OPTIONS, mode }; s.gold = 10000;
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

test('각 전장의 경로 전체가 건설 금지이고 전장 변경 시 이전 경로를 비운다', () => {
  for (const key of Object.keys(config.MAP_DEFS)) {
    config.configureMap(key);
    assert.equal(config.ROUTES.length, key === 'junction' ? 2 : 1);
    for (const route of config.ROUTES) for (let i = 1; i < route.length; i++) {
      const a = route[i - 1], b = route[i]; assert.ok(a.x === b.x || a.y === b.y);
      for (let c = Math.min(a.x, b.x) / config.T - .5; c <= Math.max(a.x, b.x) / config.T - .5; c++)
        for (let r = (Math.min(a.y, b.y) - config.MAP_Y) / config.T - .5; r <= (Math.max(a.y, b.y) - config.MAP_Y) / config.T - .5; r++) assert.ok(config.pathCells.has(`${c},${r}`));
    }
  }
  config.configureMap('frontier'); assert.ok(!config.pathCells.has('10,1'));
});

test('합류 지대의 적은 두 입구를 번갈아 사용하고 자신의 경로를 따라 이동한다', () => {
  const s = setup(); config.configureMap('junction'); s.spawn('grunt'); s.spawn('grunt');
  const [a, b] = s.enemies; assert.notEqual(a.y, b.y); assert.notEqual(a.route, b.route);
  const bx = b.x; s.step(.1); assert.ok(b.x > bx); assert.equal(b.y, config.ROUTES[1][0].y);
});

test('타겟 우선순위는 체력·보스·도착까지 남은 거리로 적을 고르고 범위 밖은 제외한다', () => {
  const s = setup(), t = place(s, 'sniper');
  const a = spawn(s, 'grunt', t.x, t.y + 30), b = spawn(s, 'boss', t.x + 20, t.y + 30);
  a.hp = 300; b.hp = 100; a.seg = b.seg = 1;
  t.target = 'strong'; assert.equal(s.findTarget(t), a);
  t.target = 'weak'; assert.equal(s.findTarget(t), b);
  t.target = 'boss'; assert.equal(s.findTarget(t), b);
  b.x = 2000; assert.equal(s.findTarget(t), a);
  config.configureMap('junction'); a.route = config.ROUTES[0]; a.seg = 1; a.x = 0; a.y = config.ROUTES[0][0].y;
  b.route = config.ROUTES[1]; b.seg = 1; b.x = 0; b.y = config.ROUTES[1][0].y;
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

test('지원기 공속 오라는 같은 효과를 중첩하지 않고 강화한 지원기를 우선한다', () => {
  const s = setup(), m = place(s, 'marine'), base = s.stats(m).rate;
  place(s, 'support', 7); assert.ok(Math.abs(s.stats(m).rate - base / 1.2) < 1e-9);
  const support = place(s, 'support', 8); assert.ok(Math.abs(s.stats(m).rate - base / 1.2) < 1e-9);
  support.lvl = 3; assert.ok(Math.abs(s.stats(m).rate - base / 1.3) < 1e-9);
  assert.equal(s.runStats.damage, 0);
});

test('옵저버는 직접 피해 없이 취약을 부여하며 재사용 대기시간을 지킨다', () => {
  const s = setup(), o = place(s, 'observer'), e = spawn(s, 'tank', o.x, o.y + 30);
  s.towerAct(o, .01); assert.equal(e.vulnerableT, 3); assert.equal(s.projs.length, 0);
  e.vulnerableT = 0; s.towerAct(o, .01); assert.equal(e.vulnerableT, 0);
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

test('골리앗·스카우트의 쌍열 사격은 피해를 분배하고 캐리어는 독립된 인터셉터 4기를 발사한다', () => {
  for (const [key, count, multiplier] of [['goliath', 2, 1], ['scout', 2, 1], ['carrier', 4, 4]]) {
    const s = setup(), unit = place(s, key), enemy = spawn(s, 'tank', unit.x + 60, unit.y);
    enemy.hp = enemy.max = 10000;
    s.towerAct(unit, .01); assert.equal(s.projs.length, count);
    assert.equal(new Set(s.projs.map(p => p.y)).size, count);
    for (const p of s.projs) { assert.equal(p.source, unit.id); s.hit(p); }
    assert.ok(Math.abs(enemy.hp - (10000 - s.stats(unit).dmg * multiplier)) < 1e-8);
  }
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

const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { createSourceLoader } = require('./helpers/load-source.cjs');

const load = createSourceLoader({
  phaser: { Scene: class {} },
  './missionResult': { showMissionResult: () => () => {} },
  ...Object.fromEntries(['./shop', './textures', './ui', './operations'].map(name => [name, {}])),
});
const { GameScene } = load('./GameScene');
const { RouteDistances, VisualBudget } = load('./game/performance');
const { DamageNumbers } = load('./damageNumbers');
const { createMapRuntime } = load('./game/map');
const { MAP_Y, STEP_SEC, MAX_CATCHUP_SEC, MAX_STEPS_PER_FRAME, SIMULATION_BUDGET_MS } = load('./config');
const { weaknessBonus, observationCount, OBSERVATION_BONUSES } = load('./support');

test('60초가 밀린 3배속도 한 프레임의 스텝 상한을 지키고 나머지 시간은 보존한다', () => {
  const clock = mock.method(performance, 'now', () => 0);
  try {
    const s = new GameScene(); s.speed = 3;
    let simulated = 0;
    s.step = dt => { assert.equal(dt, STEP_SEC); simulated += dt; };
    s.advanceSimulation(MAX_CATCHUP_SEC);
    assert.ok(Math.abs(simulated - MAX_STEPS_PER_FRAME * STEP_SEC) < 1e-9);
    assert.ok(Math.abs(simulated + s.stepAcc - MAX_CATCHUP_SEC * 3) < 1e-9);
    const pending = s.stepAcc;
    s.advanceSimulation(0);
    assert.ok(s.stepAcc < pending, 'later frames continue the queued battle');
    s.advanceSimulation(MAX_CATCHUP_SEC * 100);
    assert.ok(s.stepAcc <= MAX_CATCHUP_SEC * 3, 'sustained overload cannot grow an infinite queue');
  } finally { clock.mock.restore(); }
});

test('계산이 느리면 시간 예산에서 양보하되 최소 한 스텝은 진행한다', () => {
  let now = 0, calls = 0;
  const clock = mock.method(performance, 'now', () => now);
  try {
    const s = new GameScene();
    s.step = () => { calls++; now += SIMULATION_BUDGET_MS; };
    s.advanceSimulation(1);
    assert.equal(calls, 1);
    assert.ok(Math.abs(s.stepAcc - (1 - STEP_SEC)) < 1e-9);
  } finally { clock.mock.restore(); }
});

test('정상 프레임은 배속만큼 진행하고 전투 도중 열린 정지·상점·작전실·종료를 즉시 따른다', () => {
  const clock = mock.method(performance, 'now', () => 0);
  try {
    for (const speed of [1, 2, 3]) {
      const s = new GameScene(); s.speed = speed;
      let simulated = 0; s.step = dt => simulated += dt;
      s.advanceSimulation(STEP_SEC);
      assert.ok(Math.abs(simulated - STEP_SEC * speed) < 1e-9);
    }
    for (const flag of ['paused', 'shopOpen', 'operationsOpen', 'over']) {
      const s = new GameScene(); let calls = 0;
      s.step = () => { calls++; s[flag] = true; };
      s.advanceSimulation(1);
      assert.equal(calls, 1, flag);
    }
  } finally { clock.mock.restore(); }
});

function referenceTarget(s, t, eligible) {
  const range = s.stats(t).range;
  let best = null, score = -Infinity, rank = Infinity;
  for (const e of s.enemies) {
    if (e.dead || Math.hypot(e.x - t.x, e.y - t.y) > range || !eligible(e)) continue;
    const route = e.route ?? s.map.waypoints, next = route[Math.min(e.seg, route.length - 1)];
    let remaining = Math.hypot(next.x - e.x, next.y - e.y);
    for (let i = e.seg; i < route.length - 1; i++) remaining += Math.hypot(route[i + 1].x - route[i].x, route[i + 1].y - route[i].y);
    const p = t.target === 'strong' ? e.hp : t.target === 'weak' ? -e.hp : t.target === 'boss' ? (e.type === 'boss' ? 1e9 : 0) - remaining : -remaining;
    const r = t.k !== 'observer' ? 0 : weaknessBonus(e) === 0 ? -1
      : (e.observations?.some(mark => mark.source === t.id && mark.left > 0) ? OBSERVATION_BONUSES.length + 1 : 0)
        + Math.min(observationCount(e), OBSERVATION_BONUSES.length);
    if (r < rank || r === rank && p > score) { rank = r; score = p; best = e; }
  }
  return best;
}

test('타워 240기·적 600기의 표적이 세 전장·우선순위·관측·지원·주둔 조건에서 기존 계산과 같다', () => {
  for (const map of ['frontier', 'canyon', 'junction']) {
    const s = new GameScene(); s.map = createMapRuntime(map, MAP_Y);
    s.towers = Array.from({ length: 240 }, (_, i) => ({ id: String(i), k: ['marine', 'observer', 'support', 'cannon'][i % 4],
      c: i % 20, r: Math.floor(i / 20), x: (i % 20 + .5) * 48, y: MAP_Y + (Math.floor(i / 20) + .5) * 48,
      lvl: i % 5 + 1, target: 'first', buffs: [], host: i % 7 === 0 ? {} : undefined }));
    s.enemies = Array.from({ length: 600 }, (_, i) => {
      const route = s.map.routes[i % s.map.routes.length], seg = i % (route.length - 1) + 1;
      const a = route[seg - 1], b = route[seg], t = (i % 97) / 97;
      return { route, seg, x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t,
        hp: i % 103 + 1, shield: i % 2, type: i % 31 === 0 ? 'boss' : 'grunt', dead: i % 29 === 0,
        observations: i % 3 ? [] : [{ source: String(i % 240), left: 2 }] };
    });
    for (const target of ['first', 'strong', 'weak', 'boss']) for (const t of s.towers) {
      t.target = target;
      const eligible = t.k === 'support' ? e => e.shield > 0 : () => true;
      assert.equal(s.findTarget(t, eligible), referenceTarget(s, t, eligible), `${map}/${target}/${t.id}`);
    }
    s.stats = () => { throw new Error('targeting must not recalculate damage or scan support auras'); };
    assert.doesNotThrow(() => s.findTarget(s.towers[0]));
  }
});

test('경로 거리 캐시는 이동·구간 변경·분기 전환·도착을 반영한다', () => {
  const cache = new RouteDistances(), route = [{ x: 0, y: 0 }, { x: 30, y: 0 }, { x: 30, y: 40 }];
  const e = { x: 10, y: 0, seg: 1 };
  assert.equal(cache.remaining(e, route), 60);
  e.x = 20; assert.equal(cache.remaining(e, route), 50);
  e.x = 30; e.y = 10; e.seg = 2; assert.equal(cache.remaining(e, route), 30);
  assert.equal(cache.remaining(e, [{ x: 0, y: 0 }, { x: 30, y: 0 }, { x: 30, y: 50 }]), 40);
  e.y = 40; e.seg = route.length; assert.equal(cache.remaining(e, route), 0);
});

test('이펙트는 프레임 생성량·동시 개체 수를 지키고 종료 후 다시 허용한다', () => {
  const budget = new VisualBudget(3, 2), first = budget.acquire(), second = budget.acquire();
  assert.ok(first && second); assert.equal(budget.acquire(), undefined);
  first(); first(); assert.equal(budget.acquire(), undefined, 'release does not reset this frame’s creation quota');
  budget.beginFrame(); const third = budget.acquire(), fourth = budget.acquire();
  assert.ok(third && fourth);
  budget.beginFrame(); assert.equal(budget.acquire(), undefined, 'live visuals remain bounded across frames');
  second(); assert.ok(budget.acquire());
});

test('프레임마다 수천 발을 쏴도 효과 포화가 근접 공격 피해에 영향을 주지 않는다', () => {
  const s = new GameScene(), tweens = [], views = [];
  const view = () => {
    const v = { destroyed: false, destroy() { this.destroyed = true; } };
    for (const key of ['setStrokeStyle', 'setDepth', 'lineStyle', 'lineBetween']) v[key] = () => v;
    views.push(v); return v;
  };
  s.add = { graphics: view, circle: view }; s.tweens = { add(tween) { tweens.push(tween); } };
  s.audio = { play() {} };
  const tower = { id: '1', k: 'zealot', x: 100, y: 100 }, target = { x: 110, y: 100, hp: 1000000 };
  let damage = 0; s.damageEnemy = (e, amount) => damage += amount;
  for (let frame = 0; frame < 10; frame++) {
    s.visualBudget.beginFrame();
    for (let i = 0; i < 1000; i++) s.fire(tower, target, { dmg: 10, splash: 0 });
  }
  assert.equal(damage, 100000);
  assert.equal(views.length, 128, 'visual allocation stops at the live cap');
  for (const tween of tweens) tween.onComplete();
  assert.ok(views.every(v => v.destroyed));
  s.visualBudget.beginFrame(); s.fire(tower, target, { dmg: 10, splash: 0 });
  assert.equal(views.length, 130, 'completed visuals release slots');
});

test('벙커의 일괄 강화 명령은 부대 전체 전투 수치를 계산하지 않고 같은 견적을 낸다', () => {
  const s = new GameScene();
  const bunker = { id: 'b', k: 'bunker', lvl: 1, spent: 100, skills: [], passengers: [null, null, null, null] };
  const crew = { id: 'c', k: 'marine', lvl: 1, skills: [], host: bunker };
  bunker.passengers[0] = crew;
  s.towers = [bunker, crew]; s.selected = bunker;
  const expected = load('./management').planOrder([{ ...crew, hostId: bunker.id }], { type: 'upgrade' }, { bunkerId: bunker.id });
  s.shopState = s.stats = () => { throw new Error('command rendering must not build the shop preview'); };
  const commands = s.commands();
  assert.equal(commands[6].price, expected.cost);
  assert.equal(expected.ids.length, 1);
});

test('집중 피해 숫자는 프레임당 32개·동시 160개를 지키며 만료 뒤 재사용한다', () => {
  const views = [], scene = { cache: { bitmapFont: { exists: () => true } }, add: { bitmapText() {
    const v = { destroy() {} };
    for (const key of ['setOrigin', 'setDepth', 'setText', 'setFontSize', 'setPosition', 'setTint', 'setAlpha', 'setScale', 'setVisible', 'setActive']) v[key] = () => v;
    views.push(v); return v;
  } } };
  const numbers = new DamageNumbers(scene), target = { x: 0, y: 0 };
  for (let frame = 0; frame < 10; frame++) {
    numbers.beginFrame();
    const count = numbers.active.length;
    for (let i = 0; i < 1000; i++) numbers.hit(target, 5);
    assert.ok(numbers.active.length - count <= 32);
  }
  assert.equal(views.length, 160);
  const oldest = numbers.active[0]; numbers.hit(target, 9);
  assert.equal(numbers.active[0], oldest);
  numbers.update(2); assert.equal(numbers.active.length, 0);
  numbers.beginFrame(); numbers.hit(target, 4);
  assert.equal(views.length, 160);
  assert.equal(numbers.active.length, 1);
});

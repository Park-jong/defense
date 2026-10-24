const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createSourceLoader } = require('./helpers/load-source.cjs');

// No Phaser or DOM substitutes: map data, geometry and layout are usable in Node.
const load = createSourceLoader();
const { MAP_DEFS } = load('./data/maps');
const { createMapRuntime } = load('./game/map');
const { createLayoutConfig } = load('./interface/layout');

test('기존 세 전장의 입구·출구 좌표와 모바일의 경로·건설 제한을 보존한다', () => {
  const entries = { frontier: [176], canyon: [128], junction: [128, 512] };
  const exits = { frontier: 512, canyon: 560, junction: 512 };
  for (const key of Object.keys(MAP_DEFS)) {
    const desktop = createMapRuntime(key, createLayoutConfig('desktop').mapY);
    const mobile = createMapRuntime(key, createLayoutConfig('mobile').mapY);
    assert.deepEqual(desktop.routes.map(route => route[0]), entries[key].map(y => ({ x: -24, y })));
    for (const route of desktop.routes) assert.deepEqual(route.at(-1), { x: 984, y: exits[key] });
    assert.deepEqual(desktop.pathCells, mobile.pathCells);
    assert.deepEqual(mobile.routes, desktop.routes.map(route => route.map(p => ({ x: p.x, y: p.y - 56 }))));
  }
});

test('같은 전장을 여러 번 만들어도 경로와 건설 제한을 공유하지 않고 원본 정의를 보존한다', () => {
  const definition = structuredClone(MAP_DEFS.frontier);
  const first = createMapRuntime('frontier', 56), second = createMapRuntime('frontier', 56);
  assert.notEqual(first.routes, second.routes);
  assert.notEqual(first.routes[0][0], second.routes[0][0]);
  first.routes[0][0].x = 999;
  first.pathCells.clear();
  assert.equal(second.routes[0][0].x, -24);
  assert.ok(second.pathCells.has('0,2'));
  assert.deepEqual(createMapRuntime('frontier', 56), second);
  assert.deepEqual(MAP_DEFS.frontier, definition);
});

test('화면 배치 생성과 배율 변경은 이미 만든 전장의 경로를 바꾸지 않는다', () => {
  const local = createSourceLoader(), config = local('./config');
  const { createMapRuntime } = local('./game/map');
  const map = createMapRuntime('junction', config.MAP_Y), snapshot = structuredClone(map);
  config.createLayoutConfig('mobile');
  assert.equal(config.MAP_Y, 56);
  config.useMobileLayout(); config.setRenderScale(2.5);
  assert.equal(config.MAP_Y, 0);
  assert.deepEqual(map, snapshot);
  assert.deepEqual(createMapRuntime('junction', config.MAP_Y).pathCells, map.pathCells);
});

test('원점 오프셋 없이 만든 경로는 화면과 독립된 맵 좌표로 사용할 수 있다', () => {
  const map = createMapRuntime('junction');
  assert.equal(map.mapY, 0);
  assert.deepEqual(map.routes.map(route => route[0]), [{ x: -24, y: 72 }, { x: -24, y: 456 }]);
  assert.ok(map.pathCells.has('10,1'));
  assert.ok(map.pathCells.has('1,9'));
  assert.ok(map.pathCells.has('4,7'));
  assert.ok(!map.pathCells.has('6,3'));
});

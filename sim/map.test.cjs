const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createSourceLoader } = require('./helpers/load-source.cjs');

// No Phaser or DOM substitutes: map data, geometry and layout are usable in Node.
const load = createSourceLoader();
const { MAP_DEFS } = load('./data/maps');
const { createMapRuntime, highGroundRangeBonus } = load('./game/map');
const { createLayoutConfig } = load('./interface/layout');

test('기존 세 전장의 입구·출구 좌표와 모바일의 경로·건설 제한을 보존한다', () => {
  const entries = { frontier: [176], canyon: [128], junction: [128, 512] };
  const exits = { frontier: 512, canyon: 560, junction: 512 };
  const top = createLayoutConfig('desktop').mapY - 56; // 데스크톱 전술 띠만큼 내려간 높이
  for (const key of Object.keys(MAP_DEFS)) {
    const desktop = createMapRuntime(key, createLayoutConfig('desktop').mapY);
    const mobile = createMapRuntime(key, createLayoutConfig('mobile').mapY);
    assert.deepEqual(desktop.routes.map(route => route[0]), entries[key].map(y => ({ x: -24, y: y + top })));
    for (const route of desktop.routes) assert.deepEqual(route.at(-1), { x: 984, y: exits[key] + top });
    assert.deepEqual(desktop.pathCells, mobile.pathCells);
    assert.deepEqual(mobile.routes, desktop.routes.map(route => route.map(p => ({ x: p.x, y: p.y - createLayoutConfig('desktop').mapY }))));
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
  assert.equal(config.MAP_Y, 112);
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

test('협곡 고지는 경로와 겹치지 않는 46칸이며 화면 배치와 다른 전장에 영향을 받지 않는다', () => {
  const desktop = createMapRuntime('canyon', createLayoutConfig('desktop').mapY);
  const mobile = createMapRuntime('canyon', createLayoutConfig('mobile').mapY);
  assert.equal(desktop.highGroundCells.size, 46);
  assert.deepEqual(desktop.highGroundCells, mobile.highGroundCells);
  for (const cell of desktop.highGroundCells) {
    assert.ok(!desktop.pathCells.has(cell));
    const [c, r] = cell.split(',').map(Number);
    assert.ok(c >= 0 && c < 20 && r >= 0 && r < 12);
    assert.equal(highGroundRangeBonus(desktop, c, r), 24);
  }
  for (const [c, r] of [[4, 2], [13, 2], [6, 1], [6, 4], [5, 5], [6, 7], [6, 10]])
    assert.equal(highGroundRangeBonus(desktop, c, r), 0);
  for (const key of ['frontier', 'junction']) {
    const map = createMapRuntime(key);
    assert.equal(map.highGroundCells.size, 0);
    assert.equal(highGroundRangeBonus(map, 6, 2), 0);
  }
  desktop.highGroundCells.clear();
  assert.equal(mobile.highGroundCells.size, 46);
  assert.equal(createMapRuntime('canyon').highGroundCells.size, 46);
});

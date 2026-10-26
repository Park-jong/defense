const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createSourceLoader } = require('./helpers/load-source.cjs');

function withStorage(value, run, unavailable = false) {
  const previous = global.window;
  const writes = [], events = [];
  global.window = {
    localStorage: {
      getItem() { if (unavailable) throw Error('unavailable'); return value; },
      setItem(...args) { if (unavailable) throw Error('unavailable'); writes.push(args); },
    },
    dispatchEvent(event) { events.push(event.type); },
  };
  try { run(createSourceLoader()('./themes'), { writes, events }); }
  finally { if (previous === undefined) delete global.window; else global.window = previous; }
}

test('저장된 테마만 복원하고 알 수 없는 값은 기본 테마로 복귀한다', () => {
  for (const value of [null, '', 'gold', '<script>', 'toString']) withStorage(value, t => assert.equal(t.activeTheme(), 'frontier'));
  withStorage('bishoujo', t => assert.equal(t.activeTheme(), 'bishoujo'));
});

test('테마 전환은 별도 키에만 저장하고 실제 변경에 한 번만 알린다', () => {
  withStorage(null, (t, { writes, events }) => {
    t.selectTheme('bishoujo'); t.selectTheme('bishoujo'); t.selectTheme('__proto__');
    assert.equal(t.activeTheme(), 'bishoujo');
    assert.deepEqual(writes, [[t.THEME_STORAGE_KEY, 'bishoujo']]);
    assert.deepEqual(events, [t.THEME_CHANGED]);
    t.selectTheme('frontier');
    assert.equal(t.activeTheme(), 'frontier');
    assert.equal(events.length, 2);
  });
});

test('저장소를 사용할 수 없어도 기본값과 현재 세션의 테마 전환을 지원한다', () => {
  withStorage(null, t => {
    assert.equal(t.activeTheme(), 'frontier');
    assert.doesNotThrow(() => t.selectTheme('bishoujo'));
    assert.equal(t.activeTheme(), 'bishoujo');
  }, true);
});

test('기존 유닛·초상화·콘솔만 테마를 바꾸고 적·무기 효과는 원래 키를 유지한다', () => {
  withStorage('bishoujo', t => {
    for (const key of ['base_marine', 'barrel_cannon', 'unit_zealot', 'portrait', 'console-chrome']) {
      assert.equal(t.themeTexture(key), 'bishoujo:' + key);
      assert.equal(t.themeTexture(t.themeTexture(key)), 'bishoujo:' + key);
      t.selectTheme('frontier');
      assert.equal(t.themeTexture('bishoujo:' + key), key);
      t.selectTheme('bishoujo');
    }
    for (const key of ['enemy_boss', 'shot_marine', 'cmd_storm', 'battlefield_canyon']) assert.equal(t.themeTexture(key), key);
  });
});

test('18종의 캐릭터가 기존 유닛 키와 일치하고 두 테마의 그림을 따로 캐시한다', () => {
  const load = createSourceLoader();
  const { TOWER_KEYS } = load('./data/units');
  const { HEROINES, bishoujoLayers } = load('./bishoujoArt');
  const { unitImageUrl, loadUnitArt } = load('./unitArt');
  assert.deepEqual(Object.keys(HEROINES).sort(), [...TOWER_KEYS].sort());
  const loaded = new Map();
  loadUnitArt({ textures: { exists: () => false }, load: { svg(key, url) { assert.ok(!loaded.has(key)); loaded.set(key, url); } } });
  assert.equal(loaded.size, 18 * 3 * 2 + 1);
  for (const key of TOWER_KEYS) {
    assert.ok(bishoujoLayers(key).base.includes('<ellipse'));
    assert.notEqual(unitImageUrl(key, 'frontier'), unitImageUrl(key, 'bishoujo'));
    assert.equal(loaded.get('bishoujo:unit_' + key), unitImageUrl(key, 'bishoujo'));
  }
});

test('초상화 파일을 모두 등록한 뒤에는 본문과 아이콘을 구분해 실제 이미지로 불러온다', () => {
  const load = createSourceLoader();
  const { TOWER_KEYS } = load('./data/units');
  const { registerBishoujoPortraits } = load('./bishoujoPortraitAssets');
  const { unitPortraitUrl, loadUnitArt } = load('./unitArt');
  const files = Object.fromEntries(TOWER_KEYS.flatMap(key => [
    [`./assets/bishoujo/${key}.webp`, `/assets/${key}.webp`],
    [`./assets/bishoujo/${key}-icon.webp`, `/assets/${key}-icon.webp`],
  ]));
  assert.throws(() => registerBishoujoPortraits({}), /Missing bishoujo portrait assets/);
  registerBishoujoPortraits(files);
  const loaded = new Map();
  loadUnitArt({ textures: { exists: () => false }, load: { svg() {}, image(key, url) { loaded.set(key, url); } } });
  assert.equal(loaded.size, 19);
  assert.equal(loaded.get('bishoujo:portrait'), '/assets/marine.webp');
  for (const key of TOWER_KEYS) {
    assert.equal(unitPortraitUrl(key, 'bishoujo'), `/assets/${key}.webp`);
    assert.equal(loaded.get('bishoujo:unit_' + key), `/assets/${key}-icon.webp`);
  }
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createSourceLoader } = require('./helpers/load-source.cjs');

test('연속 처치는 4초 안의 처치만 잇고 5·10·20 이후 10회마다 연출하며 초기화한다', () => {
  const { MoeStreak } = createSourceLoader()('./moeCharacters');
  const streak = new MoeStreak(), milestones = [];
  for (let i = 0; i < 41; i++) { const n = streak.kill(i * .1); if (n) milestones.push(n); }
  assert.deepEqual(milestones, [5, 10, 20, 30, 40]);
  assert.equal(streak.alive(8), true); assert.equal(streak.alive(8.01), false);
  assert.equal(streak.kill(8.01), 0); assert.equal(streak.count, 1);
  streak.reset(); assert.equal(streak.alive(8.01), false);
  streak.kill(8.1); assert.equal(streak.count, 1);
});

function withView(run) {
  const previous = { document: global.document, window: global.window };
  class Element {
    children = []; style = { setProperty() {} }; dataset = {}; hidden = false;
    classList = { toggle() {} };
    setAttribute() {}
    append(...nodes) { for (const node of nodes) { node.parent = this; this.children.push(node); } }
    remove() { if (this.parent) this.parent.children = this.parent.children.filter(n => n !== this); }
  }
  const body = new Element();
  global.window = new EventTarget(); global.window.localStorage = { getItem: () => null, setItem() {} };
  global.document = { body, documentElement: { dataset: {} }, createElement: () => new Element(), querySelector: () => null, getElementById: () => null };
  const load = createSourceLoader();
  try { run(load('./moePresentation').MoePresentation, load('./themes'), body); }
  finally {
    for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete global[key]; else global[key] = value; }
  }
}
const actor = { id: 'unit-1', k: 'marine', x: 200, y: 200 };

test('원본 스킨에는 연출·대사가 없고 테마 전환은 이전 연출을 즉시 정리한다', () => withView((View, theme, body) => {
  const view = new View(), root = body.children[0];
  view.start(1, false, actor); view.say(actor, 'deploy'); view.kill(1, actor, true);
  view.update(.1, false, 1, true, [actor]);
  assert.equal(root.hidden, true); assert.equal(root.children.length, 1);
  theme.selectTheme('bishoujo'); view.start(1, false, actor);
  assert.equal(root.children.length, 2);
  theme.selectTheme('frontier'); assert.equal(root.hidden, true); assert.equal(root.children.length, 1);
  theme.selectTheme('bishoujo'); assert.equal(root.children.length, 1);
  view.destroy(); assert.equal(body.children.length, 0);
  assert.doesNotThrow(() => theme.selectTheme('frontier'));
}));

test('일시정지·모달은 연출을 숨기고 읽을 시간을 보존하며 복귀 후 유한한 시간에 정리한다', () => withView((View, theme, body) => {
  theme.selectTheme('bishoujo'); const view = new View(), root = body.children[0];
  view.start(1, false, actor); view.update(10, true, 0, true, [actor]);
  assert.equal(root.hidden, true); assert.equal(root.children.length, 2);
  view.update(1, false, 0, true, [actor]); assert.equal(root.hidden, false); assert.equal(root.children.length, 2);
  view.update(3, false, 0, false, [actor]); assert.equal(root.children.length, 1);
  view.destroy();
}));

test('집중 처치에도 컷인은 하나·대사는 제한되며 보스 격파가 웨이브 연출보다 우선한다', () => withView((View, theme, body) => {
  theme.selectTheme('bishoujo'); const view = new View(), root = body.children[0];
  view.start(10, true, actor);
  for (let i = 0; i < 100; i++) view.kill(i / 100, actor, false);
  assert.equal(root.children.length, 2);
  view.kill(1, actor, true);
  assert.equal(root.children.length, 2);
  assert.equal(root.children[1].dataset.kind, 'boss-clear');
  view.update(5, false, 6, false, [actor]);
  view.say(actor, 'idle'); view.say(actor, 'idle');
  assert.equal(root.children.length, 2);
  view.update(.1, false, 6, false, []); assert.equal(root.children.length, 1);
  view.destroy();
}));

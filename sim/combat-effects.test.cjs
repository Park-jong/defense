const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createSourceLoader } = require('./helpers/load-source.cjs');

const load = createSourceLoader({
  phaser: { Scene: class {} },
  ...Object.fromEntries(['./shop', './textures', './ui', './operations'].map(name => [name, {}])),
});
const { GameScene } = load('./GameScene');
const { CombatEffects } = load('./combatEffects');
const { BattleAudio } = load('./audio');

function fixture() {
  const views = [];
  function image(x = 0, y = 0, key = '') {
    const view = {
      x, y, active: true, visible: true, rotation: 0, scaleX: 1, scaleY: 1, texture: { key },
      setPosition(x, y) { this.x = x; this.y = y; return this; },
      setRotation(value) { this.rotation = value; return this; },
      setScale(x, y = x) { this.scaleX = x; this.scaleY = y; return this; },
      setFrame(frame) { this.frame = frame; return this; },
      setTexture(key) { this.texture = { key }; return this; },
      setDisplaySize(w, h) { this.width = w; this.height = h; return this; },
      setAlpha(value) { this.alpha = value; return this; },
      setVisible(value) { this.visible = value; return this; },
      setActive(value) { this.active = value; return this; },
      setTint(value) { this.tint = value; return this; },
      setTintFill(value) { this.tint = value; return this; },
      clearTint() { return this; }, setOrigin() { return this; }, setDepth() { return this; }, setBlendMode() { return this; },
      destroy() { this.active = false; this.destroyed = true; },
    };
    views.push(view); return view;
  }
  const s = new GameScene();
  s.add = { image, circle: image }; s.textures = { exists() { return true; } };
  s.tweens = { add() {} }; s.fxPlace = { explode() {} }; s.audio = { play() {}, impact() {} };
  s.floatText = () => {};
  return { s, image, views };
}

function enemy(image, x, y, shield = 0) {
  return { x, y, type: 'tank', sprite: image(x, y, 'enemy_tank'), seg: 1, speed: 0, r: 14,
    hp: 1000, max: 1000, shield, slow: 1, slowT: 0, burnT: 0, vulnerableT: 0,
    stunT: 0, pulse: 999, route: [{ x: 0, y }, { x: 5000, y }] };
}

test('세 무기의 효과를 켜도 매 스텝의 충돌 위치·명중 시점·보호막·범위 피해·전과가 같다', () => {
  for (const key of ['marine', 'arrow', 'cannon']) {
    function run(effects) {
      const { s, image } = fixture();
      if (effects) s.combatEffects = new CombatEffects(s);
      const t = s.createTower(key, 5, 3); t.cd = 999;
      s.enemies = [enemy(image, t.x + 110, t.y, 5), enemy(image, t.x + 140, t.y), enemy(image, t.x + 170, t.y)];
      s.fire(t, s.enemies[0], s.stats(t));
      const trace = [];
      for (let i = 0; i < 60 && s.projs.length; i++) {
        s.step(1 / 60);
        trace.push({ projectile: s.projs.map(p => [p.x, p.y]), targets: s.enemies.map(e => [e.hp, e.shield]), damage: s.runStats.damage });
      }
      return trace;
    }
    assert.deepEqual(run(true), run(false), key);
  }
});

test('미사일의 휘어진 표시와 연기는 실제 투사체 좌표·표적 위치를 바꾸지 않는다', () => {
  const { s, image } = fixture(), fx = new CombatEffects(s);
  const view = image(0, 0, 'shot_arrow'), gun = { x: 0, y: 0, barrel: image() };
  const from = Object.freeze({ x: 0, y: 0 }), to = Object.freeze({ x: 50, y: 0 }), target = Object.freeze({ x: 100, y: 0 });
  fx.launch('arrow', from, 0, view, gun); fx.move(view, from, to, target);
  assert.equal(view.x, 50); assert.ok(Math.abs(view.y) > 5);
  assert.equal(to.y, 0); assert.equal(target.y, 0);
  fx.forget(view); assert.equal(fx.flights.size, 0);
});

test('효과 시간 0은 잔상·반동·피격 표시를 멈추고 같은 전투 시간은 배속과 무관하게 같은 나이를 갖는다', () => {
  const { s, image } = fixture(), fx = new CombatEffects(s);
  const gun = { x: 20, y: 30, barrel: image(20, 30) }, target = enemy(image, 100, 30, 20);
  fx.launch('cannon', gun, 0, image(), gun); fx.hitTarget('cannon', target);
  const snapshot = () => JSON.stringify({ particles: fx.particles.map(p => [p.age, p.view.x, p.view.alpha]),
    barrel: [gun.barrel.x, gun.barrel.y], flashes: [...fx.flashes.values()].map(f => [f.age, f.view.alpha]) });
  const frozen = snapshot(); fx.update(0); assert.equal(snapshot(), frozen);
  for (let i = 0; i < 3; i++) fx.update(1 / 60);
  assert.ok(Math.abs(fx.recoils.get(gun.barrel).age - .05) < 1e-9);
  assert.ok(gun.barrel.x < gun.x);
  fx.render(); assert.ok(target.sprite.x > target.x); assert.equal(target.x, 100);
  fx.update(1); assert.equal(gun.barrel.x, gun.x); assert.equal(gun.barrel.y, gun.y);
  assert.equal(target.sprite.x, target.x);
  assert.equal(fx.flashes.size, 0);
  assert.equal(target.sprite.tint, undefined, 'hit flash never overwrites status tint');
});

test('집중 포격에도 효과 이미지는 상한 안에서 재사용하고 만료·장면 종료 때 모두 정리한다', () => {
  const { s, image, views } = fixture(), fx = new CombatEffects(s);
  const targets = Array.from({ length: 100 }, () => enemy(image, 100, 100));
  const gun = { x: 0, y: 0, barrel: image() }, shot = image(), external = views.length;
  for (let i = 0; i < 500; i++) {
    fx.launch('cannon', gun, 0, shot, gun);
    fx.impact('cannon', targets[i % 100], gun, 55); fx.hitTarget('cannon', targets[i % 100]);
  }
  assert.ok(views.length - external <= 320 + 64);
  fx.forget(shot); fx.update(2);
  assert.equal(fx.particles.length, 0); assert.equal(fx.flights.size, 0); assert.equal(fx.flashes.size, 0);
  const allocated = views.length;
  fx.impact('cannon', targets[0], gun, 55); assert.equal(views.length, allocated);
  fx.destroy(); assert.ok(views.slice(external).every(v => v.destroyed));
  assert.equal(fx.recoils.size, 0);
});

test('비행 중 표적이 먼저 죽으면 실제 투사체와 연결된 표시 상태를 함께 제거한다', () => {
  const { s, image } = fixture(); s.combatEffects = new CombatEffects(s);
  const t = s.createTower('arrow', 5, 3); t.cd = 999;
  const target = enemy(image, t.x + 110, t.y); s.enemies = [target];
  s.fire(t, target, s.stats(t)); const view = s.projs[0].s;
  assert.equal(s.combatEffects.flights.size, 1);
  target.dead = true; s.step(1 / 60);
  assert.equal(s.projs.length, 0); assert.equal(s.combatEffects.flights.size, 0); assert.equal(view.destroyed, true);
});

test('발사음과 착탄음은 서로 차단하지 않으며 연속 재생 상한·음소거·종료를 지킨다', () => {
  const voices = [], param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} });
  const node = () => ({ connect() {}, disconnect() {} });
  const source = () => { const s = { ...node(), frequency: param(), start() {}, stop() {} }; voices.push(s); return s; };
  const ctx = { currentTime: 0, state: 'running', sampleRate: 8000,
    createGain: () => ({ ...node(), gain: param() }), createOscillator: source, createBufferSource: source,
    createBiquadFilter: () => ({ ...node(), frequency: param(), Q: param() }),
    createBuffer: () => ({ getChannelData: () => new Float32Array(8000) }), close: () => Promise.resolve() };
  const audio = new BattleAudio(); audio.context = ctx; audio.gain = ctx.createGain();
  audio.play('marine'); audio.impact('marine'); assert.equal(voices.length, 4);
  audio.impact('marine'); assert.equal(voices.length, 4, 'repeated impacts are throttled');
  for (let i = 0; i < 100; i++) { ctx.currentTime += .2; audio.play('cannon'); audio.impact('cannon'); }
  assert.equal(audio.voices.size, 32);
  for (const voice of voices) voice.onended(); assert.equal(audio.voices.size, 0);
  const before = voices.length; audio.volume = 0; ctx.currentTime += 1; audio.play('arrow'); audio.impact('arrow');
  assert.equal(voices.length, before); audio.destroy(); assert.equal(audio.context, undefined);
});

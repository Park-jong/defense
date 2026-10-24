// Optional browser QA: install Playwright outside the repo and set PLAYWRIGHT_MODULE
// to its package directory. Run the Vite dev server before this script.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const base = process.env.FRONTIER_URL || 'http://127.0.0.1:5173';
const artifacts = path.resolve(__dirname, '../node_modules/.cache/frontier-qa');
fs.mkdirSync(artifacts, { recursive: true });

async function instrument(page, errors) {
  page.on('pageerror', e => { errors.push(e.message); console.log('PAGE ERROR:', e.message); });
  // A handle injected into the dev response, never into the shipped application.
  await page.route('**/src/main.ts*', async route => {
    const response = await route.fetch();
    const source = await response.text();
    assert.ok(source.includes('const game = new Phaser.Game('));
    await route.fulfill({ response, body: source.replace('const game = new Phaser.Game(', 'const game = window.__frontierQA = new Phaser.Game(') });
  });
}
const scene = (page, fn, arg) => page.evaluate(({ fn, arg }) => {
  const s = window.__frontierQA.scene.getScene('game');
  return (0, eval)('(' + fn + ')')(s, arg);
}, { fn: fn.toString(), arg });
const press = (page, key) => page.keyboard.press(key, { delay: 50 });
async function cellClick(page, c, r, mobile = false) {
  const canvas = await page.locator('canvas').boundingBox();
  const scale = canvas.width / (mobile ? 1280 : 960);
  const x = canvas.x + (c + .5) * 48 * scale, y = canvas.y + ((mobile ? 0 : 56) + (r + .5) * 48) * scale;
  if (mobile) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y);
}
async function shot(page, name) { await page.screenshot({ path: path.join(artifacts, name + '.png') }); }

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const errors = [];
  let lastPage;
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage(); lastPage = page; await instrument(page, errors); page.setDefaultTimeout(7000);
    await page.goto(base); await page.getByRole('heading', { name: '작전실', exact: true }).waitFor();
    await page.locator('#run-map').selectOption('junction'); await page.locator('#run-difficulty').selectOption('easy');
    await shot(page, 'desktop-setup');
    await page.getByRole('button', { name: '새 작전 시작', exact: true }).click();
    await page.waitForFunction(() => !document.querySelector('dialog[open]'));
    await page.waitForFunction(() => window.__frontierQA?.scene.getScene('game').options.map === 'junction');
    assert.deepEqual(await scene(page, s => s.options), { map: 'junction', difficulty: 'easy', mode: 'standard' });
    await page.getByRole('button', { name: '훈련 건너뛰기', exact: true }).click();
    await page.getByRole('button', { name: '프로토스 병력 9종 [R]', exact: true }).click();
    assert.deepEqual(await scene(page, s => s.commands().map(c => c.id)), ['frost', 'sniper', 'zealot', 'highTemplar', 'templar', 'reaver', 'scout', 'carrier', 'observer'].map(k => 'build:' + k));
    await press(page, '9'); assert.equal(await scene(page, s => s.building), 'observer');
    await page.getByRole('button', { name: '테란 병력 9종 [T]', exact: true }).click();
    assert.deepEqual(await scene(page, s => s.commands().map(c => c.id)), ['arrow', 'cannon', 'marine', 'firebat', 'ghost', 'goliath', 'cruiser', 'bunker', 'support'].map(k => 'build:' + k));
    await press(page, '1'); await cellClick(page, 6, 3);
    assert.equal(await scene(page, s => s.towers.length), 1);
    await cellClick(page, 6, 3);
    // Fund a QA fixture to exercise all purchase controls in one session.
    await scene(page, s => { s.gold = 10000; });
    await press(page, 'u'); await press(page, 'u');
    assert.equal(await scene(page, s => s.selected.lvl), 3);
    await press(page, 'o');
    await page.getByRole('heading', { name: '작전실', exact: true }).waitFor();
    await page.getByRole('button', { name: '보스 우선', exact: true }).click();
    await page.getByRole('button', { name: '집중 화력 선택', exact: true }).click();
    assert.equal(await scene(page, s => s.selected.target), 'boss');
    assert.equal(await scene(page, s => s.selected.branch), 'power');
    await page.getByRole('button', { name: '전장 복귀', exact: true }).click();
    await press(page, 'u'); await press(page, 'u');
    assert.equal(await scene(page, s => s.selected.lvl), 5);
    assert.equal(await scene(page, s => s.selected.branch), 'power');
    assert.equal(await scene(page, s => s.commands()[0].enabled), false);
    const maxGold = await scene(page, s => s.gold); await press(page, 'u');
    assert.equal(await scene(page, s => s.gold), maxGold);
    await press(page, 'o');
    await page.getByRole('button', { name: '미사일 터렛 #1 · Lv.5', exact: true }).waitFor();
    await shot(page, 'desktop-tactics');
    await page.getByRole('button', { name: '선택 병력 재배치 · ◆ 20', exact: true }).click();
    await cellClick(page, 8, 3); assert.equal(await scene(page, s => s.selected.c), 8);
    await press(page, 'o');
    await page.getByRole('button', { name: '배치 · ◆ 160', exact: true }).click();
    await cellClick(page, 9, 3); assert.equal(await scene(page, s => s.towers.at(-1).k), 'support');
    // Exercise an actual wave-completion boundary without waiting five full battles.
    await scene(page, s => { s.wave = 4; s.startWave(); s.spawnQ = []; for (const e of s.enemies) e.sprite.destroy(); s.enemies = []; s.step(1 / 60); });
    await page.getByRole('heading', { name: '전장 보상 선택', exact: true }).waitFor();
    assert.equal(await scene(page, s => s.pending.length), 3);
    await shot(page, 'desktop-reward');
    const pendingBefore = await scene(page, s => s.pending);
    await page.reload(); await page.getByRole('button', { name: '저장된 작전 이어하기', exact: true }).click();
    await page.getByRole('heading', { name: '전장 보상 선택', exact: true }).waitFor();
    assert.deepEqual(await scene(page, s => s.pending), pendingBefore);
    const reward = await scene(page, s => s.pending.find(k => ['power', 'haste', 'range'].includes(k)));
    await page.locator(`button[data-action="reward"][data-key="${reward}"]`).click();
    await scene(page, s => s.saveCheckpoint(true));
    const checkpoint = await scene(page, s => ({ units: s.savedUnits(), bonuses: s.bonuses, wave: s.wave }));
    await page.reload(); await page.getByRole('button', { name: '저장된 작전 이어하기', exact: true }).waitFor();
    await page.getByRole('button', { name: '저장된 작전 이어하기', exact: true }).click();
    await page.waitForFunction(() => !document.querySelector('dialog[open]'));
    assert.deepEqual(await scene(page, s => ({ units: s.savedUnits(), bonuses: s.bonuses, wave: s.wave })), checkpoint);
    await press(page, 'Space');
    await scene(page, s => { s.spawn('tank'); const e = s.enemies.at(-1); e.x = 400; e.y = 200; e.hp = e.max = 10000; });
    await page.getByRole('button', { name: '궤도 폭격', exact: true }).click();
    assert.ok(await scene(page, s => s.runStats.commanderDamage > 0));
    await press(page, 'o'); await page.getByRole('button', { name: '전투 통계', exact: true }).click();
    const time = await scene(page, s => s.runStats.seconds); await page.waitForTimeout(150);
    assert.equal(await scene(page, s => s.runStats.seconds), time);
    await shot(page, 'desktop-stats');
    await page.getByRole('button', { name: '전장 복귀', exact: true }).click();
    await scene(page, s => { s.wave = 50; s.waveActive = false; s.runStats.lost = 0; s.endGame(true); });
    await page.getByRole('button', { name: '작전실 [O]', exact: true }).click();
    await page.getByRole('button', { name: '업적 / 외형', exact: true }).click();
    await page.getByRole('button', { name: '황금 외형', exact: true }).click();
    assert.equal(await scene(page, s => s.towers[0].base.tintTopLeft), 0xffdb85);
    await shot(page, 'desktop-medals');
    await page.reload(); await page.getByRole('heading', { name: '작전실', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: '저장된 작전 이어하기', exact: true }).count(), 0);
    assert.equal(await scene(page, s => s.profile.skin), 'gold');
    await context.close();

    const mobileContext = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const mobile = await mobileContext.newPage(); lastPage = mobile; await instrument(mobile, errors); mobile.setDefaultTimeout(7000);
    await mobile.goto(base + '/?layout=mobile'); await mobile.getByRole('heading', { name: '작전실', exact: true }).waitFor();
    await mobile.locator('#run-map').selectOption('canyon'); await mobile.locator('#run-difficulty').selectOption('hard'); await mobile.locator('#run-mode').selectOption('bunker');
    await shot(mobile, 'mobile-setup');
    await mobile.getByRole('button', { name: '새 작전 시작', exact: true }).click();
    await mobile.waitForFunction(() => !document.querySelector('dialog[open]'));
    await mobile.getByRole('button', { name: '훈련 건너뛰기', exact: true }).click();
    assert.equal(await mobile.getByRole('button', { name: '프로토스 병력 9종 [R]', exact: true }).isDisabled(), true);
    await scene(mobile, s => s.openShop('units'));
    assert.equal(await mobile.locator('button[data-action="choose"]').count(), 3);
    await mobile.locator('button[data-action="choose"][data-key="bunker"]').click();
    await cellClick(mobile, 6, 3, true); await cellClick(mobile, 6, 3, true);
    assert.equal(await scene(mobile, s => s.towers[0].k), 'bunker');
    await mobile.getByRole('button', { name: '작전실 [O]', exact: true }).click();
    await mobile.getByRole('button', { name: '도감 / 훈련', exact: true }).click(); await shot(mobile, 'mobile-codex');
    assert.ok(await mobile.evaluate(() => { const r = document.querySelector('dialog[open]').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight; }));
    await mobile.getByRole('button', { name: '전장 복귀', exact: true }).click(); await shot(mobile, 'mobile-battlefield');
    await mobileContext.close();
    assert.deepEqual(errors, []);
    console.log('Browser QA passed: faction icons, nine units per faction, faction hotkeys, desktop/mobile setup, targeting, specialization, relocation, support, reward, resume, commander, pause, statistics, medals, skin persistence, bunker restriction, touch placement; no page errors.');
    console.log('Screenshots:', artifacts);
  } finally {
    if (lastPage && !lastPage.isClosed()) {
      console.log('Last UI:', await lastPage.evaluate(() => ({ focus: document.activeElement?.outerHTML.slice(0, 250), dialogs: [...document.querySelectorAll('dialog')].map(d => ({ open: d.open, text: d.innerText.slice(0, 300) })) })));
      await shot(lastPage, 'last-ui');
    }
    await browser.close();
  }
})().catch(e => { console.error(e); process.exitCode = 1; });

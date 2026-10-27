// Optional browser QA: install Playwright outside the repo and set PLAYWRIGHT_MODULE.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createSourceLoader } = require('./helpers/load-source.cjs');
const load = createSourceLoader(), { SPECIALIZATIONS } = load('./specializations'), { TOWER_DEFS } = load('./data/units');
const base = process.env.FRONTIER_URL || 'http://127.0.0.1:5173';
const artifacts = path.resolve(__dirname, '../node_modules/.cache/frontier-qa');
fs.mkdirSync(artifacts, { recursive: true });

async function fixture(page, key, gold = 100000, dual = false) {
  await page.evaluate(async ({ key, gold, dual }) => {
    const s = window.__frontierQA.scene.getScene('game');
    s.shop.close();
    for (const t of s.towers) { t.base.destroy(); t.barrel.destroy(); }
    s.towers = []; s.runStats.units = []; s.gold = 100000; s.over = false;
    s.augments = dual ? ['dualBranch'] : [];
    (await import('/src/augments.ts')).setActiveAugments(s.augments);
    const a = s.createTower(key, 6, 1), b = s.createTower(key, 7, 1), low = s.createTower(key, 8, 1);
    a.lvl = 3; b.lvl = 5; low.lvl = 2;
    if (key === 'marine') {
      const bunker = s.createTower('bunker', 9, 1);
      s.board(bunker.id, 0, b.id);
    }
    s.selected = low; s.gold = gold;
    s.openShop('manage');
  }, { key, gold, dual });
}
async function state(page) {
  return page.evaluate(() => {
    const s = window.__frontierQA.scene.getScene('game');
    return { gold: s.gold, branches: s.towers.filter(t => t.k !== 'bunker').map(t => t.branch ?? null), selected: s.selected.lvl };
  });
}
async function fits(page) {
  assert.equal(await page.locator('dialog[open]').evaluate(dialog => {
    const r = dialog.getBoundingClientRect(), content = dialog.querySelector('.shop-content');
    return r.left >= 0 && r.top >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1
      && content.scrollWidth <= content.clientWidth + 1;
  }), true, '일괄 관리 창이 화면 안에 들어간다');
}
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const errors = [];
  try {
    for (const mobile of [false, true]) {
      const context = await browser.newContext({ viewport: mobile ? { width: 844, height: 390 } : { width: 1440, height: 1000 }, isMobile: mobile, hasTouch: mobile });
      const page = await context.newPage(); page.setDefaultTimeout(7000);
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/src/main.ts*', async route => {
        const response = await route.fetch();
        await route.fulfill({ response, body: (await response.text()).replace('const game = new Phaser.Game(', 'const game = window.__frontierQA = new Phaser.Game(') });
      });
      await page.goto(base);
      await page.getByRole('button', { name: '새 작전 시작', exact: true }).click();
      await page.waitForFunction(() => window.__frontierQA?.scene.getScene('game').runLaunched);
      const key = mobile ? 'rapid' : 'power';
      for (const [kind, pair] of Object.entries(SPECIALIZATIONS)) {
        await fixture(page, kind);
        const button = page.locator(`[data-action="batch-branch"][data-kind="${kind}"][data-key="${key}"]`);
        assert.equal(await button.isEnabled(), true);
        assert.ok((await button.getAttribute('aria-label')).includes(pair[key].desc));
        assert.ok((await button.textContent()).includes(`2기 ◆ ${TOWER_DEFS[kind].cost * 2}`));
        await fits(page); await button.click();
        assert.deepEqual(await state(page), { gold: 100000 - TOWER_DEFS[kind].cost * 2, branches: [key, key, null], selected: 2 });
        assert.equal(await button.isEnabled(), false);
        assert.equal(await page.locator(`[data-action="batch-branch"][data-kind="${kind}"][data-key="${key === 'power' ? 'rapid' : 'power'}"]`).isEnabled(), false);
      }
      await fixture(page, 'marine', 129);
      assert.equal(await page.locator('[data-action="batch-branch"][data-key="power"]').isEnabled(), false);
      assert.deepEqual(await state(page), { gold: 129, branches: [null, null, null], selected: 2 });
      await fixture(page, 'marine', 130);
      await page.locator('[data-action="batch-branch"][data-key="power"]').click();
      assert.deepEqual(await state(page), { gold: 0, branches: ['power', 'power', null], selected: 2 });
      await fixture(page, 'marine', 100000, true);
      await page.locator('[data-action="batch-branch"][data-key="power"]').click();
      await page.locator('[data-action="batch-branch"][data-key="rapid"]').click();
      assert.deepEqual(await state(page), { gold: 100000 - 260, branches: ['both', 'both', null], selected: 2 });
      await fixture(page, 'marine');
      await fits(page);
      await page.screenshot({ path: path.join(artifacts, `batch-specializations-${mobile ? 'mobile' : 'desktop'}.png`) });
      if (mobile) {
        await page.setViewportSize({ width: 390, height: 844 }); await fits(page);
        await page.screenshot({ path: path.join(artifacts, 'batch-specializations-portrait.png') });
      }
      await context.close();
    }
    assert.deepEqual(errors, []);
    console.log('PASS: 17종 양 갈래 일괄 특화·주둔·비용 부족·이중 특화·선택 유지·데스크톱/가로/세로 화면, 브라우저 오류 없음');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

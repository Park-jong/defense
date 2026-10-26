const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { createSourceLoader } = require('./helpers/load-source.cjs');
const load = createSourceLoader(), { SPECIALIZATIONS } = load('./specializations'), { TOWER_DEFS } = load('./data/units');
const base = process.env.FRONTIER_URL || 'http://127.0.0.1:5173';
const artifacts = path.resolve(__dirname, '../node_modules/.cache/frontier-qa');
fs.mkdirSync(artifacts, { recursive: true });

async function fixture(page, key, level = 3) {
  return page.evaluate(({ key, level }) => {
    const s = window.__frontierQA.scene.getScene('game');
    for (const t of s.towers) { t.base.destroy(); t.barrel.destroy(); }
    s.towers = []; s.runStats.units = []; s.gold = 100000; s.over = false;
    const t = s.createTower(key, 6, 1); t.lvl = level; s.selected = t;
    s.operations.show('tactics');
    return { gold: s.gold, id: t.id };
  }, { key, level });
}
async function fits(page) {
  assert.ok(await page.locator('dialog[open]').evaluate(dialog => {
    const r = dialog.getBoundingClientRect(), content = dialog.querySelector('.ops-content');
    return r.left >= 0 && r.top >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1
      && content.scrollWidth <= content.clientWidth + 1;
  }), '특화 창이 화면 너비 안에 들어간다');
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
      await page.goto(base); await page.getByRole('button', { name: '새 작전 시작', exact: true }).click();
      await page.waitForFunction(() => window.__frontierQA?.scene.getScene('game').runLaunched);
      const branch = mobile ? 'rapid' : 'power';
      for (const [key, pair] of Object.entries(SPECIALIZATIONS)) {
        const before = await fixture(page, key), def = pair[branch];
        const button = page.getByRole('button', { name: def.name + ' 선택', exact: true });
        assert.equal(await button.isEnabled(), true); await fits(page);
        await button.click();
        assert.deepEqual(await page.evaluate(() => {
          const s = window.__frontierQA.scene.getScene('game'); return { branch: s.selected.branch, gold: s.gold };
        }), { branch, gold: before.gold - TOWER_DEFS[key].cost });
        assert.equal(await page.getByRole('button', { name: def.name + ' 선택 완료', exact: true }).isEnabled(), false);
        const other = pair[branch === 'power' ? 'rapid' : 'power'];
        assert.equal(await page.getByRole('button', { name: other.name + ' 선택', exact: true }).isEnabled(), false);
      }
      await fixture(page, 'cannon');
      if (mobile) {
        await page.getByLabel('공성 저격포 효과', { exact: true }).click();
        await page.getByText(SPECIALIZATIONS.cannon.power.desc, { exact: true }).waitFor();
        assert.equal(await page.evaluate(() => window.__frontierQA.scene.getScene('game').selected.branch), undefined);
      }
      if (!mobile) {
        await page.getByRole('button', { name: '공성 저격포 선택', exact: true }).hover();
        await page.getByText('공격력 +120%', { exact: true }).waitFor();
      }
      await page.locator('.ops-branches').scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(artifacts, `specializations-${mobile ? 'mobile' : 'desktop'}.png`) });
      await fixture(page, 'marine', 2);
      assert.equal(await page.getByRole('button', { name: '주둔 사수 선택', exact: true }).isEnabled(), false);
      await page.getByRole('button', { name: '도감 / 훈련', exact: true }).click();
      await page.getByText('테란 병력', { exact: true }).click();
      await page.getByText('주둔 사수', { exact: true }).waitFor();
      const codexEffect = page.getByLabel('주둔 사수 효과', { exact: true });
      await codexEffect.click();
      await page.getByText(SPECIALIZATIONS.marine.power.desc, { exact: true }).waitFor();
      await fits(page);
      if (mobile) {
        await page.setViewportSize({ width: 390, height: 844 }); await fixture(page, 'support'); await fits(page);
        await page.locator('.ops-branches').scrollIntoViewIfNeeded();
        await page.screenshot({ path: path.join(artifacts, 'specializations-portrait.png') });
      }
      await context.close();
    }
    assert.deepEqual(errors, []);
    console.log('PASS: 34개 특화 선택·비용·잠금, Lv.2 제한, 도감, 데스크톱·모바일·세로 화면, 브라우저 오류 없음');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

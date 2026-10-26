// Optional browser QA, using the same external Playwright setup as browser-smoke.cjs.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const base = process.env.FRONTIER_URL || 'http://127.0.0.1:5173';
const artifacts = path.resolve(__dirname, '../node_modules/.cache/frontier-qa');
fs.mkdirSync(artifacts, { recursive: true });
const state = (page, fn) => page.evaluate(code => (0, eval)(`(${code})`)(window.__frontierQA.scene.getScene('game')), fn.toString());

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const errors = [];
  try {
    for (const mobile of [false, true]) {
      const context = await browser.newContext({ viewport: mobile ? { width: 844, height: 390 } : { width: 1440, height: 1000 }, hasTouch: mobile });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/src/main.ts*', async route => {
        const response = await route.fetch(), body = await response.text();
        assert.ok(body.includes('const game = new Phaser.Game('));
        await route.fulfill({ response, body: body.replace('const game = new Phaser.Game(', 'const game = window.__frontierQA = new Phaser.Game(') });
      });
      await page.goto(base + (mobile ? '/?layout=mobile' : '/'));
      await page.getByRole('button', { name: '새 작전 시작', exact: true }).click();
      await page.waitForFunction(() => { const s = window.__frontierQA.scene.getScene('game'); return s.runLaunched && !s.operationsOpen && s.wave === 0; });
      await state(page, s => {
        s.gold = 1000; s.building = 'marine'; s.placeTower(6, 1);
        s.wave = 50; s.rewarded = 45; s.waveActive = true;
        s.spawnQ = []; s.step(1 / 60);
      });
      await page.getByRole('heading', { name: '방어 작전 성공', exact: true }).waitFor();
      if (!mobile) await page.waitForFunction(() => !window.__frontierQA.loop.running);
      await page.screenshot({ path: path.join(artifacts, `continue-${mobile ? 'mobile' : 'desktop'}.png`) });
      assert.equal(await page.getByRole('button', { name: '계속 플레이', exact: true }).count(), 1);
      assert.ok(await page.locator('.mission-result-panel').evaluate(el => {
        const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight && el.scrollWidth <= el.clientWidth;
      }));
      await page.getByRole('button', { name: '전투 통계 / 업적', exact: true }).click();
      await page.getByRole('heading', { name: '작전실', exact: true }).waitFor();
      await page.getByRole('button', { name: '전장 복귀', exact: true }).click();
      const before = await state(page, s => ({ units: s.savedUnits(), wins: s.profile.wins }));
      await page.getByRole('button', { name: '계속 플레이', exact: true }).click();
      await page.getByRole('heading', { name: '전장 보상 선택', exact: true }).waitFor();
      assert.deepEqual(await state(page, s => s.savedUnits()), before.units);
      assert.equal(await state(page, s => s.continued && !s.over && s.game.loop.running), true);
      // Resume at the newly created 50-wave checkpoint, with its reward still pending.
      await page.reload();
      await page.getByRole('button', { name: '저장된 작전 이어하기', exact: true }).click();
      await page.getByRole('heading', { name: '전장 보상 선택', exact: true }).waitFor();
      const reward = await state(page, s => s.pending[0]);
      await page.locator(`button[data-action="reward"][data-key="${reward}"]`).click();
      assert.equal(await state(page, s => s.hud.text.includes('∞')), true);
      await page.keyboard.press('Space');
      assert.equal(await state(page, s => s.wave), 51);
      await state(page, s => { s.spawnQ = []; for (const e of s.enemies) e.sprite.destroy(); s.enemies = []; s.step(1 / 60); });
      assert.equal(await state(page, s => s.over), false);
      assert.equal(await state(page, s => s.profile.wins), before.wins);
      await page.waitForTimeout(2700); // The old result-screen idle timer must not pause the resumed run.
      assert.equal(await state(page, s => s.game.loop.running), true);
      await state(page, s => s.endGame(false));
      assert.equal(await page.getByRole('button', { name: '계속 플레이', exact: true }).count(), 0);
      await page.getByRole('button', { name: '작전 재시작', exact: true }).click();
      await page.waitForFunction(() => window.__frontierQA.scene.getScene('game').wave === 0);
      assert.equal(await page.locator('.mission-result').count(), 0);
      assert.equal(await state(page, s => s.continued), false);
      await context.close();
      console.log(`${mobile ? 'Mobile' : 'Desktop'}: victory → idle → report → continue → save/resume → wave 51 → defeat/restart passed`);
    }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

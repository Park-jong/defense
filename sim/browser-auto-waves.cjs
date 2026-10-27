// Optional browser QA: install Playwright outside the repo and set PLAYWRIGHT_MODULE.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.FRONTIER_URL || 'http://127.0.0.1:5173';
const artifacts = path.resolve(__dirname, '../node_modules/.cache/frontier-qa');
fs.mkdirSync(artifacts, { recursive: true });

async function finishWave(page) {
  await page.evaluate(() => {
    const s = window.__frontierQA.scene.getScene('game');
    for (const e of s.enemies) e.sprite.destroy();
    for (const p of s.projs) p.s.destroy();
    s.enemies = []; s.spawnQ = []; s.projs = []; s.step(0);
  });
}
async function current(page) {
  return page.evaluate(() => {
    const s = window.__frontierQA.scene.getScene('game');
    return { wave: s.wave, active: s.waveActive, auto: s.autoWave, left: s.autoWaveLeft };
  });
}
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true }), errors = [];
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
      const toggle = page.locator('[data-action="auto-wave"]');
      assert.equal(await toggle.getAttribute('aria-pressed'), 'false');
      assert.equal(await page.locator('.mission-toolbar').evaluate(toolbar => {
        const strip = toolbar.closest('.mission-strip').getBoundingClientRect();
        return [...toolbar.querySelectorAll('button')].every(button => {
          const r = button.getBoundingClientRect();
          return r.left >= strip.left && r.right <= strip.right + 1 && r.top >= strip.top && r.bottom <= strip.bottom + 1;
        });
      }), true, '모든 상황판 버튼이 띠 안에 들어간다');
      await toggle.click(); assert.equal(await toggle.getAttribute('aria-pressed'), 'true');
      await page.screenshot({ path: path.join(artifacts, `auto-wave-${mobile ? 'mobile' : 'desktop'}.png`) });
      await page.waitForFunction(() => window.__frontierQA.scene.getScene('game').wave === 1);
      await finishWave(page);
      await page.evaluate(() => window.__frontierQA.scene.getScene('game').openShop('manage'));
      const paused = await current(page);
      // Exceed the full countdown to verify that the open shop freezes it.
      await page.waitForTimeout(3200);
      assert.deepEqual(await current(page), paused);
      await page.getByRole('button', { name: '전장 복귀', exact: true }).click();
      await page.waitForFunction(() => window.__frontierQA.scene.getScene('game').wave === 2);
      await finishWave(page);
      await toggle.click(); assert.equal((await current(page)).auto, false);
      await toggle.click();
      await page.reload(); await page.locator('[data-action="resume"]').click();
      await page.waitForFunction(() => window.__frontierQA.scene.getScene('game').runLaunched && !document.querySelector('dialog[open]'));
      assert.equal((await current(page)).auto, true); assert.equal((await current(page)).wave, 2);
      await page.evaluate(() => {
        const s = window.__frontierQA.scene.getScene('game');
        s.options.mode = 'augment'; s.wave = 9; s.rewarded = 5; s.startWave();
      });
      await finishWave(page);
      await page.getByRole('heading', { name: '전장 보상 선택', exact: true }).waitFor();
      await page.waitForTimeout(3200); assert.equal((await current(page)).wave, 10);
      assert.equal(await page.locator('[data-action="reward"]').count(), 3);
      await page.locator('[data-action="reward"]').first().click();
      await page.getByRole('heading', { name: '증강 선택', exact: true }).waitFor();
      await page.waitForTimeout(3200); assert.equal((await current(page)).wave, 10);
      assert.equal(await page.locator('[data-action="augment"]').count(), 3);
      await page.locator('[data-action="augment"]').first().click();
      await page.waitForFunction(() => window.__frontierQA.scene.getScene('game').wave === 11);
      await toggle.click(); assert.equal(await toggle.getAttribute('aria-pressed'), 'false');
      await context.close();
    }
    assert.deepEqual(errors, []);
    console.log('PASS: 자동 토글·3초 출격·관리 중 대기·이어하기 복원·보상/증강 후 재개·해제·데스크톱/모바일 배치, 브라우저 오류 없음');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

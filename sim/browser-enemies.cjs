// Optional visual QA. Run Vite, then set PLAYWRIGHT_MODULE to an external playwright package.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.FRONTIER_URL || 'http://127.0.0.1:5173';
const output = path.resolve(__dirname, '../node_modules/.cache/zerg-qa');
fs.mkdirSync(output, { recursive: true });
const inspect = (page, fn) => page.evaluate(fn);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  try {
    for (const mobile of [false, true]) {
      const context = await browser.newContext({ viewport: mobile ? { width: 1024, height: 576 } : { width: 1440, height: 1100 },
        isMobile: mobile, hasTouch: mobile });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/src/main.ts*', async route => {
        const response = await route.fetch();
        const source = await response.text();
        assert.ok(source.includes('const game = new Phaser.Game('));
        await route.fulfill({ response, body: source.replace('const game = new Phaser.Game(', 'const game = window.__zergQA = new Phaser.Game(') });
      });
      await page.goto(`${base}/?test&layout=${mobile ? 'mobile' : 'desktop'}`);
      await page.getByRole('heading', { name: '작전실', exact: true }).waitFor();
      await page.getByRole('button', { name: '기본 테스트 시작', exact: true }).click();
      await page.waitForFunction(() => !document.querySelector('dialog[open]'));
      // Exercise the actual atlas slicing, including alpha margins in all 56 generated frames.
      const textures = await inspect(page, () => {
        const s = window.__zergQA.scene.getScene('game');
        return ['grunt', 'runner', 'tank', 'boss', 'medic', 'splitter', 'shielder'].map(type => {
          const texture = s.textures.get('enemy_' + type), source = texture.getSourceImage();
          const ctx = source.getContext('2d'), margins = [], signatures = [];
          for (let frame = 0; frame < 8; frame++) {
            const f = texture.get(frame), data = ctx.getImageData(f.cutX, f.cutY, f.width, f.height).data;
            let l = 160, t = 160, r = 0, b = 0, signature = 0;
            for (let y = 0; y < 160; y++) for (let x = 0; x < 160; x++) {
              const i = (y * 160 + x) * 4;
              if (data[i + 3] < 24) continue;
              l = Math.min(l, x); r = Math.max(r, x); t = Math.min(t, y); b = Math.max(b, y);
              signature = (signature + data[i] * (x + 1) + data[i + 1] * (y + 1)) >>> 0;
            }
            margins.push(Math.min(l, t, 159 - r, 159 - b)); signatures.push(signature);
          }
          return { type, margins, signatures };
        });
      });
      for (const texture of textures) {
        assert.ok(texture.margins.every(margin => margin >= 5), `${texture.type}: no clipped legs or tusks`);
        assert.ok(new Set(texture.signatures).size >= 4, `${texture.type}: distinct walking frames`);
      }
      await page.getByRole('button', { name: '작전실 [O]', exact: true }).click();
      await page.getByRole('button', { name: '도감 / 훈련', exact: true }).click();
      await page.getByText('적 도감', { exact: true }).click();
      assert.equal(await page.locator('#ops-enemy-codex .ops-enemy-art').count(), 7);
      assert.equal(await page.locator('#ops-enemy-codex .ops-enemy-art').evaluateAll(imgs => imgs.filter(img => img.complete && img.naturalWidth > 0).length), 7);
      await page.screenshot({ path: path.join(output, `${mobile ? 'mobile' : 'desktop'}-codex.png`) });
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('dialog[open]'));
      await inspect(page, () => {
        const s = window.__zergQA.scene.getScene('game');
        s.startWave();
        for (const type of ['grunt', 'runner', 'tank', 'boss', 'medic', 'splitter', 'shielder']) s.spawn(type);
      });
      await page.waitForFunction(() => {
        const s = window.__zergQA.scene.getScene('game');
        return s.enemies.length >= 24 && s.enemies.some(e => e.sprite.frame.name !== 0);
      });
      await page.screenshot({ path: path.join(output, `${mobile ? 'mobile' : 'desktop'}-swarm.png`) });
      await inspect(page, () => {
        const s = window.__zergQA.scene.getScene('game');
        s.setMapView(2, 330, s.map.mapY + 170);
      });
      await page.waitForFunction(() => window.__zergQA.scene.getScene('game').mapCam.worldView.width < 500);
      await page.screenshot({ path: path.join(output, `${mobile ? 'mobile' : 'desktop'}-detail.png`) });
      // A large swarm stays within one set of cached textures, and real pause freezes animation.
      const before = await inspect(page, () => {
        const s = window.__zergQA.scene.getScene('game');
        const keys = s.textures.getTextureKeys().length;
        while (s.enemies.length < 160) s.spawn('grunt');
        s.paused = true;
        return { keys, nextKeys: s.textures.getTextureKeys().length, frame: s.enemies[0].sprite.frame.name, x: s.enemies[0].x };
      });
      assert.equal(before.keys, before.nextKeys);
      await page.waitForTimeout(150);
      const after = await inspect(page, () => {
        const s = window.__zergQA.scene.getScene('game');
        return { frame: s.enemies[0].sprite.frame.name, x: s.enemies[0].x };
      });
      assert.deepEqual(after, { frame: before.frame, x: before.x });
      await inspect(page, () => { window.__zergQA.scene.getScene('game').paused = false; });
      await page.waitForFunction(() => window.__zergQA.scene.getScene('game').enemies[0].sprite.frame.name !== 0);
      console.log(`${mobile ? 'mobile' : 'desktop'}: 7 species, 56 unclipped walking frames, codex images, 160 enemies and pause verified`);
      await context.close();
    }
    assert.deepEqual(errors, []);
    console.log('Screenshots:', output);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

const { test, expect } = require('@playwright/test');
const fs = require('fs');

test('exports a deck with dom-to-pptx', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });

  const deck = {
    themeName: 'test',
    baseCss: `
.slide{width:1280px;height:720px;position:relative;overflow:hidden;background:#f7f8fb;color:#172033;font-family:Arial,sans-serif}
.panel{position:absolute;left:80px;top:76px;width:1120px;height:568px;background:linear-gradient(135deg,#ffffff,#e9f2ff);border:3px solid #2f68ff;border-radius:28px;box-shadow:0 18px 42px rgba(24,42,90,.22);padding:54px}
.title{font-size:64px;font-weight:800;margin:0 0 18px;color:#172033}
.lead{font-size:28px;line-height:1.35;width:760px;margin:0;color:#42526e}
.badge{position:absolute;right:76px;bottom:58px;background:#00b894;color:#ffffff;border-radius:999px;padding:18px 28px;font-size:22px;font-weight:700}
.metric{position:absolute;right:92px;top:128px;font-size:88px;font-weight:800;color:#2f68ff}
`,
    css: '',
    slides: [
      '<div class="panel"><h1 class="title">Export test</h1><p class="lead">Editable PowerPoint output from a rendered DOM slide.</p><div class="metric">42%</div><div class="badge">dom-to-pptx</div></div>',
      '<div class="panel"><h1 class="title">Second slide</h1><p class="lead">Checks multi-slide export, rounded panels, gradients, shadows and positioned text.</p><div class="metric">2</div><div class="badge">PPTX</div></div>',
    ],
    loadedCss: '',
  };

  await page.addInitScript(sampleDeck => {
    localStorage.setItem('ms_deck2', JSON.stringify(sampleDeck));
  }, deck);

  await page.goto('/');
  await page.locator('[data-tab="export"]').click();

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 90000 }),
    page.locator('#exportPptxDomBtn').click(),
  ]);

  const target = testInfo.outputPath('MagicSlider-dom-to-pptx.pptx');
  await download.saveAs(target);

  const stat = fs.statSync(target);
  expect(stat.size).toBeGreaterThan(10000);
  expect(fs.readFileSync(target).subarray(0, 2).toString('utf8')).toBe('PK');
  expect(errors).toEqual([]);
});


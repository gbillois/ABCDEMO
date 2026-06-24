const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

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

test('exports a deck with the local browser html2pptx port', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });

  const deck = {
    themeName: 'test',
    baseCss: `
.slide{width:1280px;height:720px;position:relative;overflow:hidden;background:#ffffff;color:#172033;font-family:Arial,sans-serif}
.box{position:absolute;left:90px;top:80px;width:1100px;height:560px;background:#f4f7ff;border:2px solid #451DC7;border-radius:20px;padding:64px}
h1{font-size:58px;margin:0 0 24px;color:#451DC7}
p{font-size:28px;line-height:1.35;width:760px;margin:0}
.tag{position:absolute;right:70px;bottom:60px;background:#04F06A;color:#06311a;padding:16px 24px;border-radius:8px;font-size:22px;font-weight:700}
table{position:absolute;left:154px;bottom:90px;border-collapse:collapse;font-size:18px}
td,th{border:1px solid #451DC7;padding:8px 14px}
th{background:#451DC7;color:white}
`,
    css: '',
    slides: [
      '<div class="box"><h1>Local html2pptx export</h1><p>This slide is converted directly in the browser from rendered HTML.</p><div class="tag">browser port</div><table><tr><th>Mode</th><th>Status</th></tr><tr><td>local HTML</td><td>ready</td></tr></table></div>',
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
    page.locator('#exportPptxBrowserBtn').click(),
  ]);

  const pptxPath = testInfo.outputPath('MagicSlider-html2pptx-local.pptx');
  await download.saveAs(pptxPath);

  const stat = fs.statSync(pptxPath);
  expect(stat.size).toBeGreaterThan(10000);
  expect(fs.readFileSync(pptxPath).subarray(0, 2).toString('utf8')).toBe('PK');
  expect(errors).toEqual([]);
});

test('exports a deck with the PPTX Converter v4 browser engine', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });

  const deck = {
    themeName: 'test',
    baseCss: `
.slide{width:1280px;height:720px;position:relative;overflow:hidden;background:#ffffff;color:#172033;font-family:Arial,sans-serif}
.box{position:absolute;left:86px;top:72px;width:1108px;height:570px;background:linear-gradient(135deg,#ffffff,#eef4ff);border:2px solid #2454d6;border-radius:18px;padding:56px}
h1{font-size:56px;margin:0 0 20px;color:#2454d6}
p{font-size:25px;line-height:1.35;width:760px;margin:0 0 26px}
.pill{display:inline-block;background:#04F06A;color:#073318;padding:14px 22px;border-radius:999px;font-size:20px;font-weight:700}
table{position:absolute;left:142px;bottom:92px;border-collapse:collapse;font-size:18px}
td,th{border:1px solid #2454d6;padding:9px 16px}
th{background:#2454d6;color:white}
`,
    css: '',
    slides: [
      '<div class="box"><h1>PPTX Converter v4</h1><p>This slide checks the browser-wrapped converter from the local PPTXConverter app.</p><a class="pill" href="https://example.com">editable link</a><table><tr><th>Feature</th><th>Status</th></tr><tr><td>tables</td><td>native</td></tr></table></div>',
    ],
    loadedCss: '',
  };

  await page.addInitScript(sampleDeck => {
    localStorage.setItem('ms_deck2', JSON.stringify(sampleDeck));
  }, deck);

  await page.goto('/');
  await page.locator('[data-tab="export"]').click();

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 120000 }),
    page.locator('#exportPptxFullBrowserBtn').click(),
  ]);

  const pptxPath = testInfo.outputPath('MagicSlider-pptx-converter-v4.pptx');
  await download.saveAs(pptxPath);

  const stat = fs.statSync(pptxPath);
  expect(stat.size).toBeGreaterThan(10000);
  expect(fs.readFileSync(pptxPath).subarray(0, 2).toString('utf8')).toBe('PK');
  expect(errors).toEqual([]);
});

test('exports with the local browser html2pptx port from file protocol', async ({ page }, testInfo) => {
  const deck = {
    themeName: 'file-test',
    baseCss: `
.slide{width:1280px;height:720px;position:relative;overflow:hidden;background:#ffffff;color:#172033;font-family:Arial,sans-serif}
.box{position:absolute;left:100px;top:100px;width:1000px;height:500px;background:#eef3ff;border:2px solid #451DC7;padding:60px}
h1{font-size:56px;margin:0 0 24px;color:#451DC7}
p{font-size:28px;line-height:1.35;margin:0}
`,
    css: '',
    slides: [
      '<div class="box"><h1>file local export</h1><p>Runs directly from a local HTML file.</p></div>',
    ],
    loadedCss: '',
  };

  await page.addInitScript(sampleDeck => {
    localStorage.setItem('ms_deck2', JSON.stringify(sampleDeck));
  }, deck);

  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await page.locator('[data-tab="export"]').click();

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 90000 }),
    page.locator('#exportPptxBrowserBtn').click(),
  ]);

  const pptxPath = testInfo.outputPath('MagicSlider-file-html2pptx-local.pptx');
  await download.saveAs(pptxPath);

  const stat = fs.statSync(pptxPath);
  expect(stat.size).toBeGreaterThan(10000);
  expect(fs.readFileSync(pptxPath).subarray(0, 2).toString('utf8')).toBe('PK');
});

test('exports with the PPTX Converter v4 engine from file protocol', async ({ page }, testInfo) => {
  const deck = {
    themeName: 'file-v4-test',
    baseCss: `
.slide{width:1280px;height:720px;position:relative;overflow:hidden;background:#ffffff;color:#172033;font-family:Arial,sans-serif}
.box{position:absolute;left:100px;top:96px;width:1040px;height:500px;background:#f5f8ff;border:2px solid #2454d6;border-radius:16px;padding:58px}
h1{font-size:54px;margin:0 0 24px;color:#2454d6}
p{font-size:27px;line-height:1.35;margin:0}
`,
    css: '',
    slides: [
      '<div class="box"><h1>file v4 export</h1><p>Runs the PPTX Converter v4 engine directly from a local HTML file.</p></div>',
    ],
    loadedCss: '',
  };

  await page.addInitScript(sampleDeck => {
    localStorage.setItem('ms_deck2', JSON.stringify(sampleDeck));
  }, deck);

  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await page.locator('[data-tab="export"]').click();

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 120000 }),
    page.locator('#exportPptxFullBrowserBtn').click(),
  ]);

  const pptxPath = testInfo.outputPath('MagicSlider-file-pptx-converter-v4.pptx');
  await download.saveAs(pptxPath);

  const stat = fs.statSync(pptxPath);
  expect(stat.size).toBeGreaterThan(10000);
  expect(fs.readFileSync(pptxPath).subarray(0, 2).toString('utf8')).toBe('PK');
});

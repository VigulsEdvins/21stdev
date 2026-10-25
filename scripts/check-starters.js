#!/usr/bin/env node
// Builds every starter project in the real builder, opens the export modal and records the page checks
// (alt text, headings, links, labels, title) in reports/starter-checks.json. Fails when a starter has an error.
//   npm run check-starters
const fs = require('fs');
const path = require('path');
const { startServer, launchBrowser } = require('./lib/browser');

(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const results = {};
  await page.goto(srv.url + '/builder.html');
  await page.waitForFunction(() => document.querySelector('iframe').contentDocument.querySelector('.page-section'));
  await page.click('#projectsBtn');
  await page.waitForSelector('#projStarterSelect');
  const industries = await page.$$eval('#projStarterSelect option', os => os.map(o => o.value).filter(Boolean));
  await page.click('#closeProjectsModalBtn');
  let failed = 0;
  for (const industry of industries) {
    await page.click('#projectsBtn');
    await page.selectOption('#projStarterSelect', industry);
    page.once('dialog', d => d.accept('Check ' + industry));
    await page.click('#projStarterBtn');
    await page.waitForFunction(n => document.getElementById('projectNameLabel').textContent === n, 'Check ' + industry);
    await page.click('#closeProjectsModalBtn');
    await page.waitForTimeout(800);
    await page.click('#openExportModalBtn');
    await page.waitForSelector('#exportChecks .export-checks-head', { timeout: 30000 });
    const issues = await page.$$eval('#exportChecks .export-check span', els => els.map(e => e.textContent));
    results[industry] = issues;
    const errors = issues.filter(t => t.startsWith('error'));
    if (errors.length) failed++;
    console.log(`${errors.length ? '✗' : '✓'} ${industry}: ${issues.length} findings, ${errors.length} errors`);
    errors.forEach(e => console.log('    ' + e));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  }
  fs.mkdirSync(path.join(__dirname, '..', 'reports'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, '..', 'reports', 'starter-checks.json'), JSON.stringify(results, null, 2));
  await browser.close();
  await srv.close();
  if (failed) { console.error(`${failed} starter(s) have errors`); process.exit(1); }
})().catch(e => { console.error(e); process.exit(1); });

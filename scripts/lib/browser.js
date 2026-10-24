/**
 * Shared helpers for scripts and tests that need a real browser: an in-process vault server on a
 * free port and a headless Chromium (playwright-core; uses the Chromium that Playwright installed).
 */
const { server } = require('../serve');

function startServer() {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve({ url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise(r => server.close(r)) });
    });
  });
}

/** Newest Chromium already present in the Playwright cache, for when its revision differs from the installed library. */
function findCachedChromium() {
  const fs = require('fs');
  const path = require('path');
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(require('os').homedir(), '.cache', 'ms-playwright');
  if (!fs.existsSync(base)) return null;
  const dirs = fs.readdirSync(base).filter(d => /^chromium-\d+$/.test(d)).sort().reverse();
  for (const d of dirs) {
    const exe = path.join(base, d, 'chrome-linux64', 'chrome');
    if (fs.existsSync(exe)) return exe;
  }
  return null;
}

async function launchBrowser() {
  // BROWSER=firefox or BROWSER=webkit runs the same scripts and tests in another engine (see scripts/check-cross-browser.js)
  const engine = process.env.BROWSER;
  if (engine === 'firefox' || engine === 'webkit') return require('playwright-core')[engine].launch({ headless: true });
  const { chromium } = require('playwright-core');
  const executablePath = process.env.CHROMIUM_PATH || undefined;
  try {
    return await chromium.launch({ headless: true, executablePath });
  } catch (err) {
    const cached = findCachedChromium();
    if (!cached) throw err;
    return chromium.launch({ headless: true, executablePath: cached });
  }
}

module.exports = { startServer, launchBrowser };

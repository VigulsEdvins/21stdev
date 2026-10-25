/**
 * Starts the WebKit that Playwright cached, on machines whose system libraries are newer than the build expects
 * (Playwright's WebKit wants ICU 74, libxml2.so.2 and libjxl 0.8; Ubuntu 26.04 has newer ones). The extra libraries
 * live in `WEBKIT_LIBS` or ~/.cache/web-for-options/webkit-libs (made by `npm run setup-webkit-libs`); a small
 * wrapper script puts them on the library path. Returns undefined when there is nothing to adapt.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

function libsDir() {
  const dir = process.env.WEBKIT_LIBS || path.join(os.homedir(), '.cache', 'web-for-options', 'webkit-libs');
  return fs.existsSync(dir) ? dir : null;
}

function cachedWebkitDir() {
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(os.homedir(), '.cache', 'ms-playwright');
  if (!fs.existsSync(base)) return null;
  const dirs = fs.readdirSync(base).filter(d => /^webkit-\d+$/.test(d)).sort().reverse();
  for (const d of dirs) if (fs.existsSync(path.join(base, d, 'minibrowser-wpe', 'bin', 'MiniBrowser'))) return path.join(base, d);
  return null;
}

/** Path of a launcher script for the cached headless WebKit with the extra libraries, or undefined. */
function webkitExecutable() {
  const libs = libsDir();
  const dir = cachedWebkitDir();
  if (!libs || !dir) return undefined;
  const mb = path.join(dir, 'minibrowser-wpe');
  const script = path.join(os.tmpdir(), `webkit-run-${process.getuid ? process.getuid() : 0}.sh`);
  fs.writeFileSync(script, `#!/bin/sh
export WEBKIT_EXEC_PATH="${mb}/bin"
export WEBKIT_INJECTED_BUNDLE_PATH="${mb}/lib"
export WEBKIT_INSPECTOR_RESOURCES_PATH="${mb}/share"
export LD_LIBRARY_PATH="${mb}/lib:${mb}/sys/lib:${libs}"
exec "${mb}/bin/MiniBrowser" "$@"
`, { mode: 0o755 });
  return script;
}

module.exports = { webkitExecutable, libsDir };

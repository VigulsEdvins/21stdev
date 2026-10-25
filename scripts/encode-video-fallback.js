#!/usr/bin/env node
/**
 * Writes an H.264 MP4 next to every bundled WebM in assets/library that has none, so browsers without VP8 support
 * can play it (a component picks the MP4 when `canPlayType` says no). Uses the ffmpeg from @ffmpeg-installer
 * (a dev-only tool; nothing from it ends up in an export).  node scripts/encode-video-fallback.js [--force]
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const lib = path.resolve(__dirname, '..', 'assets', 'library');
const ffmpeg = require('@ffmpeg-installer/ffmpeg').path;
const force = process.argv.includes('--force');
let made = 0;
for (const f of fs.readdirSync(lib).filter(n => n.endsWith('.webm'))) {
  const out = path.join(lib, f.replace(/\.webm$/, '.mp4'));
  if (fs.existsSync(out) && !force) continue;
  // short keyframe interval keeps scrubbing smooth; yuv420p + faststart play everywhere
  const r = spawnSync(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', '-i', path.join(lib, f), '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-g', '4', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', out], { stdio: 'inherit' });
  if (r.status !== 0) { console.error('✗ ' + f); process.exit(1); }
  made++;
  console.log('✓ ' + path.basename(out) + ' (' + Math.round(fs.statSync(out).size / 1024) + ' KB)');
}
console.log(made ? `${made} MP4 written.` : 'Every WebM already has an MP4.');

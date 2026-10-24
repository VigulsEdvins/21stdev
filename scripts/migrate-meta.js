#!/usr/bin/env node
/**
 * One-off, idempotent migration: brings every features/<slug>/meta.json up to the schema in scripts/schema.js.
 * Existing values are never overwritten once a field is set, so hand-edits survive re-runs.
 *   node scripts/migrate-meta.js [--dry]
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { CATEGORIES, LEGACY_CATEGORY_MAP } = require('./schema');

const ROOT = path.resolve(__dirname, '..');
const dry = process.argv.includes('--dry');

const SLUG_CATEGORY_OVERRIDES = [
  [/footer/, 'Footers & Endings'],
  [/pricing|testimonials?$/, 'Cards & Tiles'],
  [/resume|keyword-matcher|star-verb/, 'Interactions & Physics'],
  [/preloader/, 'Preloaders & Shaders']
];

const MOOD_KEYWORDS = {
  dark: ['dark', 'midnight', 'noir', 'neon', 'cyber', 'obsidian', 'onyx'],
  light: ['light', 'pastel', 'cream', 'airy', 'paper', 'clean white'],
  playful: ['playful', 'fun', 'sticker', 'cute', 'bouncy', 'whimsical', 'coquette', 'mascot', 'zine'],
  editorial: ['editorial', 'magazine', 'typograph', 'serif', 'journal', 'folio', 'poster'],
  luxury: ['luxury', 'premium', 'elegant', 'couture', 'fashion', 'gold', 'chrome', 'engraved'],
  futuristic: ['futur', 'webgl', 'shader', 'particle', 'holo', '3d', 'sci-fi', 'glitch', 'hud', 'terminal'],
  retro: ['retro', 'vintage', 'vinyl', 'crt', 'halftone', 'film', 'analog', 'grain', 'ticket'],
  minimal: ['minimal', 'monochrome', 'hairline', 'simple', 'quiet']
};

const INDUSTRY_KEYWORDS = {
  portfolio: ['portfolio', 'resume', 'cv', 'folio', 'gallery', 'photograph'],
  agency: ['agency', 'studio', 'creative', 'brand'],
  saas: ['saas', 'dashboard', 'app', 'platform', 'waitlist', 'agent', 'developer', 'code'],
  ecommerce: ['shop', 'store', 'product', 'cart', 'checkout', 'pricing'],
  hospitality: ['restaurant', 'hotel', 'sauna', 'travel', 'trek', 'cafe', 'menu', 'booking'],
  fintech: ['fintech', 'payroll', 'finance', 'bank', 'payment'],
  education: ['course', 'learn', 'school', 'academy', 'education'],
  media: ['music', 'audio', 'radio', 'film', 'cinema', 'podcast', 'news', 'article']
};

function pick(text, table, fallback) {
  const hits = Object.entries(table)
    .map(([k, words]) => [k, words.filter(w => text.includes(w)).length])
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([k]) => k);
  return hits.length ? hits : [fallback];
}

function canonicalCategory(slug, legacy) {
  for (const [re, cat] of SLUG_CATEGORY_OVERRIDES) if (re.test(slug)) return cat;
  const mapped = LEGACY_CATEGORY_MAP[legacy] || legacy;
  return CATEGORIES.includes(mapped) ? mapped : 'Interactions & Physics';
}

function weightOf(code) {
  if (/webgl|THREE\.|getContext\(\s*['"](webgl|experimental-webgl)|shader/i.test(code)) return 'heavy';
  if (/<canvas|getContext\(\s*['"]2d|gsap|requestAnimationFrame/i.test(code)) return 'medium';
  return 'light';
}

function updatedAt(dir, slug) {
  try {
    const d = execSync(`git log -1 --format=%cs -- "features/${slug}"`, { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    if (d) return d;
  } catch (_) { /* fall through */ }
  return new Date().toISOString().slice(0, 10);
}

const featuresDir = path.join(ROOT, 'features');
let changed = 0;

for (const slug of fs.readdirSync(featuresDir).sort()) {
  const dir = path.join(featuresDir, slug);
  const metaPath = path.join(dir, 'meta.json');
  if (!fs.existsSync(metaPath)) continue;

  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  const read = f => (fs.existsSync(path.join(dir, f)) ? fs.readFileSync(path.join(dir, f), 'utf8') : '');
  const code = read('index.html') + read('style.css') + read('script.js');
  const text = [slug, meta.title, meta.name, meta.description, (meta.tags || []).join(' ')].join(' ').toLowerCase();
  const before = JSON.stringify(meta);

  if (!meta.slug) meta.slug = slug;
  if (!meta.type) meta.type = 'component';
  if (!meta.dependencies || !meta.dependencies.length) meta.dependencies = ['Vanilla HTML/CSS/JS'];

  if (!meta.legacyCategory) meta.legacyCategory = meta.category || 'Components';
  if (!CATEGORIES.includes(meta.category)) meta.category = canonicalCategory(slug, meta.legacyCategory);

  if (!meta.status) meta.status = (meta.source === '21st.dev') ? 'draft' : 'stable';
  if (!meta.weight) meta.weight = weightOf(code);
  if (!meta.mood) meta.mood = pick(text, MOOD_KEYWORDS, 'minimal');
  if (!meta.industry) meta.industry = pick(text, INDUSTRY_KEYWORDS, 'general');
  if (typeof meta.needsAssets !== 'boolean') {
    meta.needsAssets = /(["'(=]\s*)\/[A-Za-z0-9_\-]+\/[^"')\s]*\.(png|jpe?g|webp|gif|svg|avif|mp4|webm|mp3|wav|woff2?)/i.test(code);
  }
  if (!meta.origin) {
    meta.origin = {
      source: meta.source || 'custom',
      license: meta.source === '21st.dev' ? 'unverified' : 'own'
    };
  }
  if (!meta.updatedAt) meta.updatedAt = updatedAt(dir, slug);
  if (!Array.isArray(meta.customizable)) meta.customizable = [];

  if (JSON.stringify(meta) !== before) {
    changed++;
    if (!dry) fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n', 'utf8');
  }
}

console.log(`${dry ? '[dry run] would update' : 'Updated'} ${changed} meta.json files`);

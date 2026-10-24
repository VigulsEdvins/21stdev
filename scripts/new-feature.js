#!/usr/bin/env node
/**
 * Scaffolds a new feature folder that already satisfies the meta.json schema, then syncs the registry.
 *   npm run new-feature -- my-slug --category "Heroes" --title "My Hero" [--type component|template]
 */
const fs = require('fs');
const path = require('path');
const { CATEGORIES, TYPES, validateMeta } = require('./schema');
const { syncRegistry } = require('./sync-registry');

const ROOT = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) out[argv[i].slice(2)] = argv[++i];
    else out._.push(argv[i]);
  }
  return out;
}

function titleCase(slug) {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function scaffold(args, rootDir = ROOT) {
  const slug = args._[0];
  if (!slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    throw new Error('Usage: npm run new-feature -- <kebab-case-slug> [--category "<one of the fixed categories>"] [--title "Title"] [--type component|template]');
  }
  const category = args.category || 'Interactions & Physics';
  if (!CATEGORIES.includes(category)) throw new Error(`Unknown category "${category}". Use one of: ${CATEGORIES.join(', ')}`);
  const type = args.type || 'component';
  if (!TYPES.includes(type)) throw new Error(`Unknown type "${type}". Use one of: ${TYPES.join(', ')}`);

  const dir = path.join(rootDir, 'features', slug);
  if (fs.existsSync(dir)) throw new Error(`features/${slug} already exists`);

  const title = args.title || titleCase(slug);
  const meta = {
    slug,
    title,
    category,
    source: 'custom',
    type,
    description: `${title}: describe the visual effect and interaction here.`,
    tags: [slug.split('-')[0], category.split(' ')[0].toLowerCase(), 'custom'],
    dependencies: ['Vanilla HTML/CSS/JS'],
    status: 'draft',
    mood: ['minimal'],
    industry: ['general'],
    weight: 'light',
    needsAssets: false,
    origin: { source: 'custom', license: 'own' },
    updatedAt: new Date().toISOString().slice(0, 10),
    customizable: [],
    order: 999
  };
  const problems = validateMeta(meta);
  if (problems.length) throw new Error('Generated meta is invalid: ' + problems.join('; '));

  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2) + '\n');
  fs.writeFileSync(path.join(dir, 'index.html'), `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <section class="${slug}">
    <h2>${title}</h2>
  </section>
  <script src="script.js"></script>
</body>
</html>
`);
  fs.writeFileSync(path.join(dir, 'style.css'), `/* Use the standard tokens so themes apply: --bg, --text, --accent, --radius, --font-display, --font-body */\n.${slug} {\n  background: var(--bg, #0b0f19);\n  color: var(--text, #f3f4f6);\n  padding: 4rem 1.5rem;\n}\n`);
  fs.writeFileSync(path.join(dir, 'script.js'), `// ${title}\n`);
  return { slug, dir };
}

if (require.main === module) {
  try {
    const { slug } = scaffold(parseArgs(process.argv.slice(2)));
    const res = syncRegistry();
    console.log(`Created features/${slug} (status: draft). Registry now has ${res.count} features.`);
    console.log('Next: edit meta.json (description, tags, mood, industry), then run `npm run check-features -- --slug ' + slug + '`.');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

module.exports = { scaffold, parseArgs };

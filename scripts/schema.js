/**
 * Feature metadata schema: the single source of truth for categories and filterable attributes.
 * Used by sync-registry.js (to normalise), verify-registry.js (to enforce) and new-feature.js (to scaffold).
 */

const CATEGORIES = [
  'Heroes',
  'Headers & Nav',
  'Footers & Endings',
  'Buttons & UI',
  'Cards & Tiles',
  'Galleries & Bento',
  '3D & Carousels',
  'Scroll & Parallax',
  'Interactions & Physics',
  'Audio & Shaders',
  'Audio',
  '404 Page',
  'Preloaders & Shaders',
  'Landing Pages',
  'Full Websites'
];

const STATUSES = ['draft', 'stable', 'deprecated'];
const WEIGHTS = ['light', 'medium', 'heavy'];
const MOODS = ['dark', 'light', 'playful', 'editorial', 'luxury', 'futuristic', 'retro', 'minimal'];
const INDUSTRIES = ['general', 'portfolio', 'agency', 'saas', 'ecommerce', 'hospitality', 'fintech', 'education', 'media'];
const TYPES = ['component', 'template'];

/** Maps pre-schema category names to the fixed list. */
const LEGACY_CATEGORY_MAP = {
  'Full Templates': 'Landing Pages',
  'Cursors & Physics': 'Interactions & Physics',
  'Forms & Inputs': 'Interactions & Physics',
  'Galleries & Grids': 'Galleries & Bento',
  'Galleries & Portfolios': 'Galleries & Bento',
  'Layouts & Grids': 'Galleries & Bento',
  'Navigation & UI': 'Headers & Nav',
  'Navigation & Headers': 'Headers & Nav'
};

/**
 * Validates a meta.json object. Returns a list of human-readable problems (empty when valid).
 * @param {object} meta
 * @returns {string[]}
 */
function validateMeta(meta) {
  const errors = [];
  const oneOf = (field, list) => {
    if (!list.includes(meta[field])) errors.push(`${field} must be one of [${list.join(', ')}], got ${JSON.stringify(meta[field])}`);
  };
  const listOf = (field, list, min = 1) => {
    const v = meta[field];
    if (!Array.isArray(v) || v.length < min) errors.push(`${field} must be an array with at least ${min} entr${min === 1 ? 'y' : 'ies'}`);
    else v.filter(x => !list.includes(x)).forEach(x => errors.push(`${field} has unknown value ${JSON.stringify(x)}`));
  };

  if (!meta.slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(meta.slug)) errors.push('slug must be kebab-case');
  if (!meta.title && !meta.name) errors.push('title is required');
  if (!meta.description || meta.description.length < 20) errors.push('description must be at least 20 characters');
  if (!Array.isArray(meta.tags) || meta.tags.length < 3) errors.push('tags must have at least 3 entries');
  if (!Array.isArray(meta.dependencies) || meta.dependencies.length < 1) errors.push('dependencies must list at least one entry');
  oneOf('category', CATEGORIES);
  oneOf('type', TYPES);
  oneOf('status', STATUSES);
  oneOf('weight', WEIGHTS);
  listOf('mood', MOODS);
  listOf('industry', INDUSTRIES);
  if (typeof meta.needsAssets !== 'boolean') errors.push('needsAssets must be true or false');
  if (!meta.origin || typeof meta.origin !== 'object' || !meta.origin.source || !meta.origin.license) errors.push('origin must be { source, license }');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.updatedAt || '')) errors.push('updatedAt must be YYYY-MM-DD');
  if (meta.nativeWhen !== undefined && (!Array.isArray(meta.nativeWhen) || meta.nativeWhen.some(x => x !== 'light' && x !== 'dark'))) errors.push('nativeWhen must be a list of "light" and/or "dark"');
  if (meta.ownPalette !== undefined && typeof meta.ownPalette !== 'boolean') errors.push('ownPalette must be true or false');
  if (meta.exportAssets !== undefined && (!Array.isArray(meta.exportAssets) || meta.exportAssets.some(x => typeof x !== 'string' || !x.startsWith('/')))) errors.push('exportAssets must be a list of root-relative paths such as "/features/<slug>/img/a.webp"');
  if (!Array.isArray(meta.customizable)) errors.push('customizable must be an array (may be empty)');
  return errors;
}

module.exports = { CATEGORIES, STATUSES, WEIGHTS, MOODS, INDUSTRIES, TYPES, LEGACY_CATEGORY_MAP, validateMeta };

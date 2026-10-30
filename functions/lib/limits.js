/* Limits for everyone, more for those who pay (plan 2026-10-30-account-limits.md). Pure: no database, no clock.
   defaultsFrom(env) -> the limits everyone gets: the built-in numbers, or the Worker settings DEFAULT_PUBLISHES_PER_HOUR, DEFAULT_RENAMES_PER_30_DAYS, DEFAULT_SITE_MB when they are
   whole numbers inside the allowed range (anything else is ignored, so a typo cannot switch a limit off).
   resolve(defaults, row) -> what one person gets: a number in their account_limits row replaces the default for that one limit. */
const BUILT_IN = { publishesPerHour: 10, renamesPer30Days: 2, siteMb: 10 };
const RANGE = { publishesPerHour: [1, 200], renamesPer30Days: [0, 100], siteMb: [1, 20] }; // the most an upgrade can set; the same numbers are checked in the database
const ENV = { publishesPerHour: 'DEFAULT_PUBLISHES_PER_HOUR', renamesPer30Days: 'DEFAULT_RENAMES_PER_30_DAYS', siteMb: 'DEFAULT_SITE_MB' };
const COLUMN = { publishesPerHour: 'publishes_per_hour', renamesPer30Days: 'renames_per_30_days', siteMb: 'max_site_mb' };

/** A whole number inside the range, or null (an empty setting counts as missing, not as zero). */
function whole(value, name) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= RANGE[name][0] && n <= RANGE[name][1] ? n : null;
}

function defaultsFrom(env) {
  const out = {};
  for (const name of Object.keys(BUILT_IN)) { const n = whole(env && env[ENV[name]], name); out[name] = n === null ? BUILT_IN[name] : n; }
  return out;
}

function resolve(defaults, row) {
  const base = Object.assign({}, BUILT_IN, defaults || {});
  const out = {};
  for (const name of Object.keys(BUILT_IN)) { const n = whole(row && row[COLUMN[name]], name); out[name] = n === null ? base[name] : n; }
  out.fileMb = Math.max(5, Math.floor(out.siteMb / 2)); // the biggest single file: half the site, never below 5 MB
  out.canBuyMore = { publishesPerHour: out.publishesPerHour < RANGE.publishesPerHour[1], renamesPer30Days: out.renamesPer30Days < RANGE.renamesPer30Days[1], siteMb: out.siteMb < RANGE.siteMb[1] };
  return out;
}

module.exports = { BUILT_IN, RANGE, COLUMN, defaultsFrom, resolve, whole };

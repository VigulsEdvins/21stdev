/**
 * Catalog search, filtering and personal-library helpers for the builder sidebar.
 * Pure functions (plus a small storage wrapper) so they can be unit-tested in Node.
 * Exposed as window.CatalogSearch in the browser and via module.exports in Node.
 */
(function (root) {
  const FIELD_WEIGHTS = { title: 5, slug: 4, tags: 3, category: 2, attrs: 2, description: 1 };

  // Words people use for the same thing; a query word also finds its group (a synonym match counts a little less than the word itself)
  const SYNONYM_GROUPS = [
    ['pricing', 'plans', 'price', 'prices', 'tiers'], ['nav', 'navbar', 'navigation', 'menu', 'header'], ['hero', 'banner', 'intro'],
    ['footer', 'ending', 'closing'], ['faq', 'questions', 'accordion'], ['testimonial', 'testimonials', 'reviews', 'quotes'],
    ['form', 'forms', 'input', 'contact'], ['login', 'signin', 'auth', 'account', 'password'], ['cookie', 'cookies', 'consent', 'gdpr', 'privacy'],
    ['stats', 'numbers', 'metrics', 'counter', 'statistics'], ['team', 'people', 'staff', 'members'], ['404', 'notfound', 'error'],
    ['cta', 'callout', 'conversion', 'banner'], ['logos', 'logo', 'clients', 'partners', 'brands'], ['gallery', 'photos', 'images', 'portfolio'],
    ['upload', 'dropzone', 'files', 'attach'], ['search', 'find', 'autocomplete', 'suggestions'], ['newsletter', 'subscribe', 'signup', 'email']
  ];
  const SYNONYMS = new Map();
  SYNONYM_GROUPS.forEach(group => group.forEach(w => { SYNONYMS.set(w, group.filter(x => x !== w)); }));

  function normalize(s) {
    return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  function tokenize(s) {
    return normalize(s).split(/[^a-z0-9]+/).filter(Boolean);
  }

  /** Damerau-Levenshtein distance, early-exit when above max. */
  function editDistance(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    const rows = [];
    for (let i = 0; i <= a.length; i++) {
      rows[i] = [i];
      for (let j = 1; j <= b.length; j++) rows[i][j] = i === 0 ? j : 0;
    }
    for (let i = 1; i <= a.length; i++) {
      let rowMin = Infinity;
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        let v = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, rows[i - 2][j - 2] + 1);
        rows[i][j] = v;
        rowMin = Math.min(rowMin, v);
      }
      if (rowMin > max) return max + 1;
    }
    return rows[a.length][b.length];
  }

  /** How well a query token matches a word: 1 exact, 0.8 prefix, 0.6 substring, 0.4 typo, 0 none. */
  function tokenScore(token, word) {
    if (word === token) return 1;
    if (word.startsWith(token)) return 0.8;
    if (token.length >= 3 && word.includes(token)) return 0.6;
    if (token.length >= 4) {
      const max = token.length >= 8 ? 2 : 1;
      if (editDistance(token, word.slice(0, token.length + 1), max) <= max) return 0.4;
      if (editDistance(token, word, max) <= max) return 0.4;
    }
    return 0;
  }

  function itemFields(item) {
    const asList = v => (Array.isArray(v) ? v : v ? [v] : []);
    return {
      title: tokenize(item.title || item.name),
      slug: tokenize(item.slug),
      tags: asList(item.tags).flatMap(tokenize),
      category: tokenize(item.category),
      attrs: [...asList(item.mood), ...asList(item.industry), item.weight, item.type].flatMap(tokenize),
      description: tokenize(item.description || item.desc)
    };
  }

  /** Best score of one token across every field of an item (0 when it matches nothing). */
  function scoreToken(token, fields) {
    let best = 0;
    for (const [field, words] of Object.entries(fields)) {
      for (const w of words) {
        const s = tokenScore(token, w) * FIELD_WEIGHTS[field];
        if (s > best) best = s;
      }
    }
    return best;
  }

  /**
   * Returns items matching every query token, best first. Empty query returns items unchanged.
   * @returns {Array<object>}
   */
  function searchItems(items, query) {
    const tokens = tokenize(query);
    if (!tokens.length) return items.slice();
    const scored = [];
    for (const item of items) {
      const fields = itemFields(item);
      let total = 0;
      let ok = true;
      for (const t of tokens) {
        let s = scoreToken(t, fields);
        (SYNONYMS.get(t) || []).forEach(alt => { s = Math.max(s, scoreToken(alt, fields) * 0.7); });
        if (s === 0) { ok = false; break; }
        total += s;
      }
      if (ok) scored.push({ item, score: total });
    }
    return scored.sort((a, b) => b.score - a.score).map(x => x.item);
  }

  function shared(a, b) {
    const set = new Set((Array.isArray(b) ? b : []).map(normalize));
    return (Array.isArray(a) ? a : []).filter(x => set.has(normalize(x))).length;
  }

  /** Components most like `target`, best first (excludes the target itself). */
  function similarItems(items, target, limit = 8) {
    return items
      .filter(i => !i.isWidget && i.slug !== target.slug)
      .map(i => ({
        item: i,
        score: (i.category === target.category ? 3 : 0)
          + shared(i.tags, target.tags) * 2
          + shared(i.mood, target.mood) * 2
          + shared(i.industry, target.industry) * 1.5
          + (i.weight && i.weight === target.weight ? 0.5 : 0)
          + (i.type === target.type ? 0.5 : 0)
      }))
      .filter(x => x.score > 3)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(x => x.item);
  }

  /**
   * Attribute filters. Widgets carry no mood/industry/weight, so they are hidden whenever one of
   * those filters is active; onlySlugs (favourites/recents) applies to widgets too. Drafts and deprecated items are hidden unless showDrafts is set.
   */
  function matchesFilters(item, f = {}) {
    if (item.isWidget) {
      if (f.mood || f.industry || f.weight) return false;
      return !f.onlySlugs || f.onlySlugs.includes(item.slug);
    }
    if (!f.showDrafts && (item.status === 'draft' || item.status === 'deprecated')) return false;
    if (f.mood && !(item.mood || []).includes(f.mood)) return false;
    if (f.industry && !(item.industry || []).includes(f.industry)) return false;
    if (f.weight && item.weight !== f.weight) return false;
    if (f.onlySlugs && !f.onlySlugs.includes(item.slug)) return false;
    return true;
  }

  /** Favourites and recently used slugs, persisted through any localStorage-like object. */
  function createLibraryStore(storage, keys = {}) {
    const FAV = keys.favourites || 'web_builder_favourites_v1';
    const REC = keys.recents || 'web_builder_recents_v1';
    const MAX_RECENTS = 10;
    const read = k => {
      try {
        const v = JSON.parse(storage.getItem(k) || '[]');
        return Array.isArray(v) ? v.filter(x => typeof x === 'string') : [];
      } catch (_) { return []; }
    };
    const write = (k, v) => { try { storage.setItem(k, JSON.stringify(v)); } catch (_) { /* quota or private mode */ } };
    return {
      favourites: () => read(FAV),
      recents: () => read(REC),
      isFavourite: slug => read(FAV).includes(slug),
      toggleFavourite(slug) {
        const cur = read(FAV);
        const next = cur.includes(slug) ? cur.filter(s => s !== slug) : [slug, ...cur];
        write(FAV, next);
        return next.includes(slug);
      },
      /** Adds slugs (e.g. from an imported project file) without duplicating or reordering existing ones. */
      mergeFavourites(slugs) {
        const cur = read(FAV);
        const extra = (Array.isArray(slugs) ? slugs : []).filter(x => typeof x === 'string' && x && x.length <= 120 && !cur.includes(x)).slice(0, 500);
        if (extra.length) write(FAV, [...cur, ...extra]);
        return extra.length;
      },
      addRecent(slug) {
        write(REC, [slug, ...read(REC).filter(s => s !== slug)].slice(0, MAX_RECENTS));
      }
    };
  }

  const api = { normalize, tokenize, editDistance, searchItems, similarItems, matchesFilters, createLibraryStore };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.CatalogSearch = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

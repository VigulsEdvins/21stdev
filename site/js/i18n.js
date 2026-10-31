/* Words on the screen in two languages. The page says which one in <html lang>; English is the default and the text the scripts are written in.
   EdvI18n.t('English text') gives the Latvian text for it when the page is Latvian (js/lang-lv.js holds them, keyed by the English sentence)
   and the English text itself otherwise or when there is no translation yet, so a missing line shows English and never breaks a page.
   {name} in a text is replaced from the second argument: t('From {price}', { price: '€39' }). */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api; else root.EdvI18n = api;
})(typeof self !== 'undefined' ? self : this, function () {
  const dicts = {};
  let forced = null; // tests

  /** The language of the page: the first part of <html lang>, "en" when there is none. */
  function lang() {
    if (forced) return forced;
    try { return (document.documentElement.getAttribute('lang') || 'en').slice(0, 2).toLowerCase(); } catch (_) { return 'en'; }
  }
  function add(code, table) { dicts[code] = Object.assign(dicts[code] || {}, table); }
  function fill(text, vars) { return vars ? text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : text; }
  function t(en, vars) {
    const d = dicts[lang()];
    return fill(d && Object.prototype.hasOwnProperty.call(d, en) ? d[en] : en, vars);
  }
  /** A text with a number in it, in the right form: nt(3, '{n} block', '{n} blocks'). English takes the first form for 1 and the second otherwise.
      Latvian has three forms, kept in the dictionary as an array under the English "many" text: [ends in 1 (not 11): "21 bloks", other: "3 bloki", zero or 11–19: "10 bloku"]. */
  function nt(n, one, many) {
    const d = dicts[lang()], v = d && Object.prototype.hasOwnProperty.call(d, many) ? d[many] : null;
    if (!Array.isArray(v)) return fill(n === 1 ? one : many, { n });
    const k = n % 10 === 1 && n % 100 !== 11 ? 0 : (n % 10 === 0 || (n % 100 >= 11 && n % 100 <= 19) ? 2 : 1);
    return fill(v[k], { n });
  }
  return { t, nt, add, lang, force(code) { forced = code; } };
});

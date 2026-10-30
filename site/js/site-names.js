/* Names for published sites, <name>.edvlabs.com (plan 2026-10-30-publish-subdomain.md). The browser (live check while typing) and the
   server (the real check at publish time) use this same file, so they cannot disagree.
   check(input) -> { ok: true, name } or { ok: false, reason, message }; reason is one of: empty, short, long, characters, hyphen, reserved, lookalike, blocked.
   Whether a name is already taken is not decided here; that needs the database. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api; else root.EdvSiteNames = api;
})(typeof self !== 'undefined' ? self : this, function () {
  const MIN = 3, MAX = 30;

  /* Addresses with a job of their own now or later; nobody may claim them. */
  const RESERVED = ['www', 'api', 'app', 'admin', 'administrator', 'root', 'mail', 'email', 'smtp', 'imap', 'pop', 'ftp', 'ns', 'ns1', 'ns2', 'mx', 'dns',
    'static', 'assets', 'cdn', 'media', 'img', 'images', 'files', 'download', 'downloads', 'blog', 'news', 'shop', 'store', 'pay', 'payment', 'payments',
    'billing', 'checkout', 'status', 'support', 'help', 'contact', 'about', 'legal', 'privacy', 'terms', 'account', 'accounts', 'login', 'signin', 'signup',
    'register', 'auth', 'oauth', 'sso', 'dashboard', 'builder', 'editor', 'preview', 'demo', 'test', 'staging', 'dev', 'beta', 'sandbox', 'localhost',
    'edvlabs', 'edv', 'sites', 'site', 'web', 'webmail', 'secure', 'security', 'abuse', 'postmaster', 'hostmaster', 'webmaster', 'noreply', 'info', 'sales',
    'examples', 'example', 'yearbook', 'arena', 'roster',
    'send', 'rsend', 'resend']; // send and rsend are the sending-mail records of Resend in the DNS (DNS only, never a site)

  /* Brand names that would make a page look like a bank, shop or payment page. Matched anywhere in the name (hyphens removed); short everyday words such as “apple” or “visa” are left out so ordinary names are not caught. */
  const LOOKALIKES = ['paypal', 'stripe', 'swedbank', 'revolut', 'citadele', 'luminor', 'mastercard', 'amazon', 'google', 'microsoft',
    'facebook', 'instagram', 'whatsapp', 'binance', 'coinbase', 'metamask'];

  /* Words that do not belong in the name of a normal business. Long words are matched anywhere in the name; short ones (SHORT) only as a
     whole piece between hyphens, so ordinary names such as "essex" or "classic" are not caught. The list is plain on purpose: extend it as needed. */
  const BLOCKED = ['porn', 'pornhub', 'xxx', 'nude', 'nudes', 'naked', 'escort', 'hentai', 'fetish', 'orgasm', 'milf', 'cumshot', 'blowjob', 'fuck', 'shit', 'cunt',
    'bitch', 'whore', 'slut', 'nigger', 'nigga', 'faggot', 'nazi', 'hitler', 'isis', 'rape', 'pedo', 'paedo', 'childporn', 'terror', 'jihad',
    'scam', 'scammer', 'fraud', 'phishing', 'carding', 'cocaine', 'heroin', 'meth', 'killer', 'gore', 'sex', 'sexy', 'sexcam', 'camgirl'];
  const SHORT = new Set(BLOCKED.filter((w) => w.length <= 5));
  const LONG = BLOCKED.filter((w) => w.length > 5);

  /* Common look-alike characters people use to slip past a filter. "1" can be an i or an l, so both are tried. */
  const LEET = { '0': 'o', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '9': 'g', '@': 'a', '$': 's', '!': 'i' };
  function variants(text) {
    const base = text.replace(/[0345789@$!]/g, (c) => LEET[c]);
    return [base.replace(/1/g, 'i'), base.replace(/1/g, 'l')];
  }

  function normalise(input) {
    return String(input == null ? '' : input).trim().toLowerCase();
  }

  /* Letters spelled out with hyphens ("f-u-c-k") count as one word. */
  const joinSpelled = (t) => t.replace(/(^|-)([a-z0-9](?:-[a-z0-9])+)(?=-|$)/g, (m, lead, run) => lead + run.replace(/-/g, ''));

  function blocked(name) {
    name = joinSpelled(name);
    for (const text of new Set([name, ...variants(name)])) {
      const parts = text.split('-'), joined = text.replace(/-/g, '');
      if (parts.some((p) => SHORT.has(p))) return true;
      if (LONG.some((w) => joined.includes(w))) return true;
    }
    /* letters repeated to dodge a match: "poooorn", "fuuuck". Repeats are squeezed in the name and in each listed word, then both checks run again. */
    const squeeze = (t) => t.replace(/(.)\1+/g, '$1');
    const squeezedShort = new Set([...SHORT].map(squeeze));
    for (const text of new Set([name, ...variants(name)])) {
      if (text.split('-').some((p) => p.length >= 3 && squeezedShort.has(squeeze(p)))) return true; // (a lone “x” in a name is fine; “xxx” and its stretched forms are not)
      if (LONG.some((w) => squeeze(text.replace(/-/g, '')).includes(squeeze(w)))) return true;
    }
    return false;
  }

  function fail(reason, message) { return { ok: false, reason, message }; }

  function check(input) {
    const name = normalise(input);
    if (!name) return fail('empty', 'Type the name you want.');
    if (name.length < MIN) return fail('short', 'Use at least ' + MIN + ' characters.');
    if (name.length > MAX) return fail('long', 'Use at most ' + MAX + ' characters.');
    if (!/^[a-z0-9-]+$/.test(name)) return fail('characters', 'Use only letters a to z, digits and hyphens. No spaces or accents.');
    if (name.startsWith('-') || name.endsWith('-') || name.includes('--')) return fail('hyphen', 'A hyphen cannot be first, last or doubled.');
    if (name.startsWith('xn')) return fail('characters', 'This name cannot start with “xn”.');
    if (RESERVED.includes(name)) return fail('reserved', 'This name is kept for edvlabs. Please choose another.');
    if (blocked(name)) return fail('blocked', 'This name is not allowed. Please choose a name that fits a normal business.');
    const forms = [name, ...variants(name)].map((t) => t.replace(/-/g, ''));
    if (LOOKALIKES.some((w) => forms.some((f) => f.includes(w)))) return fail('lookalike', 'This name looks like another company’s name. Please choose another.');
    return { ok: true, name };
  }

  return { check, normalise, MIN, MAX, RESERVED, LOOKALIKES, BLOCKED };
});

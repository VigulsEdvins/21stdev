/* Password rules and strength for edvlabs accounts. One piece of code for the page, the sign-in library and the tests.
   A new password must meet every rule (length 10 to 72, a lowercase letter, a capital, a number, a symbol).
   Strength then says how good it is: Low, Medium or High. Longer is stronger; common words, repeats and runs (aaa, 1234, qwer),
   and the first part of your own email address pull it down. Nothing here leaves the browser: the password is never sent anywhere by this file. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api; else root.EdvPassword = api;
})(typeof self !== 'undefined' ? self : this, function () {
  const MIN = 10, MAX = 72; // 72: the service keeps only the first 72 bytes of a password
  const RULES = [
    { id: 'length', label: 'At least ' + MIN + ' characters', test: (p) => p.length >= MIN },
    { id: 'lower', label: 'A lowercase letter (a to z)', test: (p) => /[a-z]/.test(p) },
    { id: 'upper', label: 'A capital letter (A to Z)', test: (p) => /[A-Z]/.test(p) },
    { id: 'digit', label: 'A number (0 to 9)', test: (p) => /[0-9]/.test(p) },
    { id: 'symbol', label: 'A symbol, like ! ? - _ # @ or a space', test: (p) => /[^A-Za-z0-9]/.test(p) }
  ];
  // the words people pick most; a password built on one of them is Low however it is dressed up
  const COMMON = ['password', 'passw0rd', 'qwerty', 'qwertyuiop', 'letmein', 'welcome', 'admin', 'iloveyou', 'monkey', 'dragon', 'football', 'baseball', 'sunshine', 'princess', 'master', 'shadow', 'trustno1', 'abc123', 'login', 'edvlabs', 'changeme', 'whatever', 'superman', 'freedom', 'starwars'];
  const RUNS = ['abcd', 'bcde', 'cdef', 'defg', 'efgh', 'fghi', 'ghij', 'hijk', 'ijkl', 'jklm', 'klmn', 'lmno', 'mnop', 'nopq', 'opqr', 'pqrs', 'qrst', 'rstu', 'stuv', 'tuvw', 'uvwx', 'vwxy', 'wxyz', '0123', '1234', '2345', '3456', '4567', '5678', '6789', 'qwer', 'wert', 'erty', 'asdf', 'sdfg', 'dfgh', 'zxcv', 'xcvb'];

  const leet = (s) => s.toLowerCase().replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't').replace(/@/g, 'a').replace(/\$/g, 's').replace(/[^a-z]/g, '');

  /** check(password, { email }) -> { rules: [{ id, label, ok }], allOk, tooLong, level: 'empty'|'low'|'medium'|'high', score, notes: [plain-words advice] } */
  function check(password, opts) {
    const p = String(password == null ? '' : password), email = String((opts && opts.email) || '');
    const rules = RULES.map((r) => ({ id: r.id, label: r.label, ok: r.test(p) }));
    const tooLong = p.length > MAX, allOk = rules.every((r) => r.ok) && !tooLong;
    if (!p) return { rules, allOk: false, tooLong: false, level: 'empty', score: 0, notes: [] };

    const classes = ['lower', 'upper', 'digit', 'symbol'].filter((id) => rules.find((r) => r.id === id).ok).length;
    let score = (p.length >= 16 ? 4 : p.length >= 12 ? 3 : p.length >= MIN ? 2 : 0) + classes; // at most 8
    const notes = [];
    const lowered = p.toLowerCase(), plain = leet(p);
    const common = COMMON.some((w) => plain === w || plain.startsWith(w) || plain.endsWith(w) || (plain.length <= w.length + 4 && plain.includes(w)));
    if (common) notes.push('This is built on a very common word. Choose something only you would think of.');
    if (/(.)\1\1/.test(p)) { score -= 1; notes.push('Avoid the same character three times in a row, like aaa or 111.'); }
    if (RUNS.some((r) => lowered.includes(r) || lowered.includes(r.split('').reverse().join('')))) { score -= 1; notes.push('Avoid runs like abcd, 1234 or qwer.'); }
    const local = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    if (local.length >= 3 && lowered.replace(/[^a-z0-9]/g, '').includes(local)) { score -= 2; notes.push('Do not use the first part of your email address in your password.'); }
    if (p.length < 16 && allOk && !common) notes.push('A longer password is stronger: 12 or more characters, and 16 or more is best.');

    let level = 'low';
    if (allOk && !common) level = score >= 7 ? 'high' : score >= 5 ? 'medium' : 'low';
    return { rules, allOk, tooLong, level, score: Math.max(0, score), notes };
  }

  /** The one sentence to show under the box when a new password is not good enough yet (a rule is missing, or it is Low); '' when it is fine. */
  function problem(password, opts) {
    const c = check(password, opts);
    if (c.tooLong) return 'That password is too long. Use at most ' + MAX + ' characters.';
    if (c.allOk) return c.level === 'low' ? 'That password is too easy to guess. ' + (c.notes[0] || 'Make it longer or less predictable.') : ''; // passes the checklist, but a common word or a pattern gives it away
    const missing = c.rules.filter((r) => !r.ok).map((r) => r.label.charAt(0).toLowerCase() + r.label.slice(1));
    return 'Make the password stronger. It still needs: ' + missing.join('; ') + '.';
  }

  return { check, problem, RULES, MIN, MAX };
});

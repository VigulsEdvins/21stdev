/**
 * Plain-language labels for history entries ("Added section Hero", "Changed theme"), worked out by comparing a
 * snapshot with the one before it. Pure, so it can be unit-tested.
 *   HistoryLabels.describeChange(previousSnapshot, snapshot) -> string
 */
(function () {
  'use strict';

  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const nameOf = (s) => (s && (s.title || s.slug)) || 'section';

  function describeChange(prev, next) {
    if (!prev) return 'Start';
    const a = prev.stack || [];
    const b = next.stack || [];
    if (b.length > a.length) {
      const ids = new Set(a.map(s => s.id));
      const added = b.find(s => !ids.has(s.id));
      return added ? `Added "${nameOf(added)}"` : 'Added a section';
    }
    if (b.length < a.length) {
      const ids = new Set(b.map(s => s.id));
      const gone = a.find(s => !ids.has(s.id));
      return gone ? `Removed "${nameOf(gone)}"` : 'Removed a section';
    }
    if (!same(a.map(s => s.id), b.map(s => s.id))) {
      const moved = b.find((s, i) => a[i] && a[i].id !== s.id);
      return moved ? `Moved "${nameOf(moved)}"` : 'Reordered sections';
    }
    for (let i = 0; i < b.length; i++) {
      if (same(a[i], b[i])) continue;
      const x = a[i];
      const y = b[i];
      const name = nameOf(y);
      if (!!x.locked !== !!y.locked) return `${y.locked ? 'Locked' : 'Unlocked'} "${name}"`;
      if (!!x.hidden !== !!y.hidden) return `${y.hidden ? 'Hid' : 'Showed'} "${name}"`;
      if (!same(x.hideOn, y.hideOn)) return `Changed where "${name}" is hidden`;
      if (!same(x.sizing, y.sizing)) return `Resized "${name}"`;
      if (!same(x.overrides, y.overrides)) return `Edited content in "${name}"`;
      if (!same(x.elements, y.elements)) return `Edited widgets in "${name}"`;
      if (x.slug !== y.slug) return `Replaced "${nameOf(x)}" with "${name}"`;
      return `Changed "${name}"`;
    }
    if (prev.theme !== next.theme || !same(prev.customColors, next.customColors)) return 'Changed theme';
    if (!same(prev.page, next.page)) return 'Changed page settings';
    if (prev.viewport !== next.viewport) return `Switched to ${next.viewport} view`;
    return 'Changed the page';
  }

  const api = { describeChange };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.HistoryLabels = api;
})();

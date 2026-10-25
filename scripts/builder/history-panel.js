/**
 * History panel: lists every change of this session in plain words and jumps to any of them.
 *   BuilderHistoryPanel.init({ history }) where history has listHistory(), jumpToHistory(i), clearHistory(), state
 */
(function () {
  'use strict';

  function timeText(at) {
    if (!at) return '';
    const d = new Date(at);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function init({ history, doc = document }) {
    const btn = doc.getElementById('historyBtn');
    const panel = doc.getElementById('historyPanel');
    const list = doc.getElementById('historyList');
    const clear = doc.getElementById('historyClearBtn');
    if (!btn || !panel || !list) return null;

    function render() {
      list.textContent = '';
      history.listHistory().slice().reverse().forEach(entry => {
        const li = doc.createElement('li');
        const b = doc.createElement('button');
        b.type = 'button';
        b.className = 'history-item';
        if (entry.current) b.setAttribute('aria-current', 'true');
        const label = doc.createElement('span');
        label.textContent = entry.label;
        const t = doc.createElement('time');
        t.textContent = timeText(entry.at);
        b.append(label, t);
        b.addEventListener('click', () => { history.jumpToHistory(entry.index); render(); });
        li.appendChild(b);
        list.appendChild(li);
      });
    }
    function open() { render(); panel.hidden = false; btn.setAttribute('aria-expanded', 'true'); }
    function close() { panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); }

    btn.addEventListener('click', () => (panel.hidden ? open() : close()));
    if (clear) clear.addEventListener('click', () => { history.clearHistory(); render(); });
    doc.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) { close(); btn.focus(); } });
    doc.addEventListener('click', e => { const path = e.composedPath ? e.composedPath() : []; if (!panel.hidden && !path.includes(panel) && !path.includes(btn)) close(); });
    return { open, close, render };
  }

  const api = { init };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.BuilderHistoryPanel = api;
})();

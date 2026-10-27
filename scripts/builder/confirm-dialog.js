/**
 * In-app confirm dialog: BuilderConfirm.ask({ title, message, details, confirmLabel, cancelLabel }) -> Promise<boolean>.
 * A real dialog (focus moves into it, Escape or the backdrop cancels, focus returns afterwards), not window.confirm.
 */
(function () {
  function ask(opts) {
    const o = Object.assign({ title: 'Are you sure?', message: '', details: [], confirmLabel: 'Yes, continue', cancelLabel: 'Cancel' }, opts || {});
    return new Promise(resolve => {
      const previous = document.activeElement;
      const backdrop = document.createElement('div');
      backdrop.className = 'confirm-backdrop';
      const dialog = document.createElement('div');
      dialog.className = 'confirm-dialog';
      dialog.setAttribute('role', 'alertdialog');
      dialog.setAttribute('aria-modal', 'true');
      const titleEl = document.createElement('h2');
      titleEl.className = 'confirm-title';
      titleEl.id = 'confirmTitle';
      titleEl.textContent = o.title;
      dialog.setAttribute('aria-labelledby', titleEl.id);
      const msg = document.createElement('p');
      msg.className = 'confirm-message';
      msg.id = 'confirmMessage';
      msg.textContent = o.message;
      dialog.setAttribute('aria-describedby', msg.id);
      dialog.append(titleEl, msg);
      if (o.details && o.details.length) {
        const list = document.createElement('ul');
        list.className = 'confirm-details';
        o.details.forEach(d => { const li = document.createElement('li'); li.textContent = d; list.appendChild(li); });
        dialog.appendChild(list);
      }
      const row = document.createElement('div');
      row.className = 'confirm-actions';
      const cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.className = 'confirm-btn confirm-btn-cancel';
      cancel.id = 'confirmCancelBtn';
      cancel.textContent = o.cancelLabel;
      const ok = document.createElement('button');
      ok.type = 'button';
      ok.className = 'confirm-btn confirm-btn-danger';
      ok.id = 'confirmOkBtn';
      ok.textContent = o.confirmLabel;
      row.append(cancel, ok);
      dialog.appendChild(row);
      backdrop.appendChild(dialog);
      document.body.appendChild(backdrop);

      let done = false;
      const finish = (value) => {
        if (done) return;
        done = true;
        document.removeEventListener('keydown', onKey, true);
        backdrop.remove();
        if (previous && typeof previous.focus === 'function') { try { previous.focus(); } catch (_) { /* element gone */ } }
        resolve(value);
      };
      const onKey = (e) => {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(false); }
        else if (e.key === 'Tab') {
          // keep focus inside the dialog
          const items = [cancel, ok];
          const i = items.indexOf(document.activeElement);
          e.preventDefault();
          items[(i + (e.shiftKey ? items.length - 1 : 1)) % items.length].focus();
        }
      };
      document.addEventListener('keydown', onKey, true);
      cancel.addEventListener('click', () => finish(false));
      ok.addEventListener('click', () => finish(true));
      backdrop.addEventListener('mousedown', (e) => { if (e.target === backdrop) finish(false); });
      cancel.focus(); // the safe choice has focus, so Enter never discards work by accident
    });
  }

  const api = { ask };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.BuilderConfirm = api;
})();

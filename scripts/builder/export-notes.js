/**
 * Export modal helpers that list things to look at: the page-check list above the export tabs and the reviewer
 * comments loaded from a review JSON file. Both can jump to the section a note is about.
 */
(function () {
  'use strict';

  function createExportNotes(ctx, { closeExportModal, getBundle }) {
    const { stackManager } = ctx;

    function showSection(sectionId) {
      closeExportModal();
      if (typeof ctx.setActiveSection === 'function') ctx.setActiveSection(sectionId);
      const frame = document.querySelector('iframe');
      const el = frame && frame.contentDocument && frame.contentDocument.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function showSectionButton(sectionId) {
      const go = document.createElement('button');
      go.type = 'button';
      go.className = 'builder-btn-subtle';
      go.textContent = 'Show section';
      go.addEventListener('click', () => showSection(sectionId));
      return go;
    }

    /** Lists page problems (alt text, headings, links, labels) above the export tabs; never blocks an export. */
    function renderPageChecks() {
      const box = document.getElementById('exportChecks');
      if (!box) return;
      box.textContent = '';
      const checks = window.PageChecks;
      const bundle = getBundle();
      const html = bundle && bundle['index.html'];
      if (!checks || !html) return;
      const altFixed = {};
      stackManager.getStack().forEach(s => { const n = Object.values(s.overrides || {}).filter(o => o && o.type === 'alt' && o.value).length; if (n) altFixed[s.id] = n; });
      const issues = checks.checkPage(html, stackManager.getState().page, altFixed);
      const head = document.createElement('div');
      head.className = 'export-checks-head';
      head.textContent = issues.length ? `Page check: ${issues.length} thing${issues.length === 1 ? '' : 's'} to look at (you can still export)` : 'Page check: nothing to fix';
      box.appendChild(head);
      if (!issues.length) return;
      const list = document.createElement('ul');
      list.className = 'export-checks-list';
      issues.slice(0, 40).forEach(issue => {
        const li = document.createElement('li');
        li.className = 'export-check is-' + issue.severity;
        const label = document.createElement('span');
        label.textContent = `${issue.severity}: ${issue.message}${issue.slug ? ' (' + issue.slug + ')' : ''}`;
        li.appendChild(label);
        if (issue.sectionId) li.appendChild(showSectionButton(issue.sectionId));
        list.appendChild(li);
      });
      box.appendChild(list);
    }

    // Reviewer comments come back as a JSON file: list them and jump to the section each one is about.
    const reviewFileInput = document.getElementById('reviewFileInput');
    const reviewList = document.getElementById('reviewCommentList');
    function renderReviewComments(data) {
      if (!reviewList) return;
      reviewList.innerHTML = '';
      const comments = Array.isArray(data.comments) ? data.comments : [];
      if (!comments.length) { reviewList.textContent = 'That file has no comments.'; return; }
      const stack = stackManager.getStack();
      comments.forEach((c, i) => {
        const li = document.createElement('li');
        const where = (c.section && c.section.slug) || 'page';
        const sec = stack.find(s => s.id === (c.section && c.section.id)) || stack.find(s => s.slug === where);
        const text = document.createElement('span');
        text.textContent = `${i + 1}. ${c.comment}${c.author ? ' (' + c.author + ')' : ''} `;
        const small = document.createElement('small');
        small.textContent = `on ${(sec && (sec.title || sec.slug)) || where}${c.text ? ': "' + c.text + '"' : ''}`;
        li.append(text, small);
        if (sec) li.appendChild(showSectionButton(sec.id));
        reviewList.appendChild(li);
      });
    }
    if (reviewFileInput) {
      reviewFileInput.addEventListener('change', async () => {
        const file = reviewFileInput.files[0];
        if (!file) return;
        try {
          const data = JSON.parse(await file.text());
          if (!data || data.format !== 'web-builder-review') throw new Error('not a review file');
          renderReviewComments(data);
        } catch (err) {
          if (reviewList) reviewList.textContent = 'That file is not a review comments file from this builder.';
        }
        reviewFileInput.value = '';
      });
    }

    return { renderPageChecks, renderReviewComments };
  }

  const api = { createExportNotes };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.BuilderExportNotes = api;
})();

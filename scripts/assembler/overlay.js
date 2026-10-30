/**
 * The freeform overlay for a section: the HTML for the elements placed on it and the CSS that positions them.
 * Part of the split of scripts/assembler.js (docs/superpowers/plans/2026-10-30-split-assembler.md).
 * Loaded by builder.html before assembler.js; also usable from Node via require().
 * The code between the braces is not indented, so the template strings in it stay byte for byte as they were.
 */
(function () {
const { escapeHtml } = (typeof window !== 'undefined' && window.AsmUtil) || require('./util.js');

/**
 * Renders the draggable overlay elements for a section.
 */
function renderSectionOverlayHtml(elements) {
  if (!Array.isArray(elements) || elements.length === 0) return '';

  const elementHtmls = elements.map(el => {
    const id = escapeHtml(String(el.id || 'el'));
    const left = typeof el.x === 'number' ? `${el.x}%` : '50%';
    const top = typeof el.y === 'number' ? `${el.y}%` : '50%';
    let styleAttr = `left: ${left}; top: ${top};`;
    if (el.width !== undefined && el.width !== null && el.width !== '') {
      styleAttr += ` width: ${typeof el.width === 'number' ? el.width + 'px' : escapeHtml(String(el.width))};`;
    }
    if (el.height !== undefined && el.height !== null && el.height !== '') {
      styleAttr += ` height: ${typeof el.height === 'number' ? el.height + 'px' : escapeHtml(String(el.height))};`;
    }

    if (el.type === 'table') {
      const tableType = el.tableType || 'pricing';
      const title = el.title || 'Pro Plan';
      const price = el.price || '$29/mo';
      const features = Array.isArray(el.features) ? el.features : ['Unlimited Projects', 'Custom Domains', '24/7 Priority Support'];
      const ctaText = el.ctaText || 'Get Started';
      const ctaLink = el.ctaLink || '#';

      if (tableType === 'comparison') {
        const headers = Array.isArray(el.headers) ? el.headers : ['Feature', 'Free', 'Pro'];
        const rows = Array.isArray(el.rows) ? el.rows : [
          ['Storage', '5 GB', '500 GB'],
          ['Bandwidth', '10 GB/mo', 'Unlimited'],
          ['Support', 'Community', '24/7 Priority']
        ];
        return `      <div class="canvas-element element-table element-table-comparison" id="${id}" data-element-id="${id}" style="${styleAttr}" tabindex="0">
        <table class="canvas-matrix-table">
          <thead>
            <tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${rows.map(row => `<tr>${row.map((cell, idx) => `<td>${idx === 0 ? `<strong>${escapeHtml(cell)}</strong>` : escapeHtml(cell)}</td>`).join('')}</tr>`).join('\n            ')}
          </tbody>
        </table>
      </div>`;
      }

      // Default: pricing table card
      return `      <div class="canvas-element element-table element-table-pricing" id="${id}" data-element-id="${id}" style="${styleAttr}" tabindex="0">
        <div class="pricing-card-header">
          <div class="pricing-card-title">${escapeHtml(title)}</div>
          <div class="pricing-card-price">${escapeHtml(price)}</div>
        </div>
        <ul class="pricing-card-features">
          ${features.map(f => `<li><span class="feature-check">✓</span> ${escapeHtml(f)}</li>`).join('\n          ')}
        </ul>
        <a href="${escapeHtml(ctaLink)}" class="pricing-card-cta">${escapeHtml(ctaText)}</a>
      </div>`;
    }

    if (el.type === 'file-card' || el.cardType === 'file') {
      const fileType = el.fileType || 'pdf';
      const fileName = el.fileName || el.name || el.title || 'Document.pdf';
      const fileSize = el.fileSize || el.size || el.meta || '240 KB';
      const badge = el.badge || fileType.toUpperCase();
      let iconSvg = '';
      if (fileType === 'pdf') {
        iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line></svg>';
      } else if (fileType === 'code') {
        iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>';
      } else if (fileType === 'doc') {
        iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>';
      } else if (fileType === 'media' || fileType === 'img') {
        iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>';
      } else {
        iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8v13H3V8"></path><path d="M1 3h22v5H1z"></path><path d="M10 12h4"></path></svg>';
      }

      return `      <div class="canvas-element element-card element-card-file file-type-${escapeHtml(fileType)}" id="${id}" data-element-id="${id}" style="${styleAttr}" tabindex="0">
        <div class="file-card-content">
          <div class="file-card-icon-wrap">
            ${iconSvg}
          </div>
          <div class="file-card-meta">
            <div class="file-card-name" title="${escapeHtml(fileName)}">${escapeHtml(fileName)}</div>
            <div class="file-card-sub">
              <span class="file-card-size">${escapeHtml(fileSize)}</span>
            </div>
          </div>
          <span class="file-badge file-badge-${escapeHtml(fileType)}">${escapeHtml(badge)}</span>
        </div>
      </div>`;
    }

    if (el.type === 'folder-card' || el.cardType === 'folder') {
      const art = el.art || 'aurora';
      const label = el.label || el.title || 'Project Folder';
      const badge = el.badge || art.toUpperCase();
      const itemCount = el.itemCount || el.meta || '12 items';

      return `      <div class="canvas-element element-card element-card-folder folder-art-${escapeHtml(art)}" id="${id}" data-element-id="${id}" style="${styleAttr}" tabindex="0">
        <div class="folder-glass-tab">
          <span class="folder-tab-badge">${escapeHtml(badge)}</span>
        </div>
        <div class="folder-art-header folder-art-${escapeHtml(art)}">
          <div class="folder-art-glow"></div>
        </div>
        <div class="folder-body">
          <div class="folder-label">${escapeHtml(label)}</div>
          <div class="folder-meta-row">
            <span class="folder-item-count">${escapeHtml(itemCount)}</span>
            <span class="folder-arrow">→</span>
          </div>
        </div>
      </div>`;
    }

    if (el.type === 'card') {
      const cardType = el.cardType || 'feature';
      const title = el.title || 'Real-time Analytics';
      const subtitle = el.subtitle || '';
      const description = el.description || 'Track conversion rates and user telemetry with sub-millisecond precision.';
      const badgeText = el.badgeText || (cardType === 'feature' ? 'HOT' : '');
      const link = el.link || '#';
      const ctaText = el.ctaText || 'Learn More →';

      if (cardType === 'testimonial') {
        const author = el.author || 'Sarah Jenkins';
        const role = el.role || 'VP of Product, Apex Digital';
        const avatar = el.avatarUrl || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&q=80';
        const rating = el.rating || 5;
        const stars = '★'.repeat(rating);
        return `      <div class="canvas-element element-card element-card-testimonial" id="${id}" data-element-id="${id}" style="${styleAttr}" tabindex="0">
        <div class="testimonial-stars">${stars}</div>
        <p class="testimonial-quote">"${escapeHtml(description)}"${badgeText ? ` <span class="card-badge">${escapeHtml(badgeText)}</span>` : ''}</p>
        <div class="testimonial-author-row">
          <img src="${escapeHtml(avatar)}" alt="${escapeHtml(author)}" class="testimonial-avatar" loading="lazy" />
          <div class="testimonial-meta">
            <div class="testimonial-name">${escapeHtml(author)}</div>
            <div class="testimonial-role">${escapeHtml(role)}</div>
          </div>
        </div>
      </div>`;
      }

      // Default: feature card
      return `      <div class="canvas-element element-card element-card-feature" id="${id}" data-element-id="${id}" style="${styleAttr}" tabindex="0">
        <div class="feature-card-header">
          <div class="feature-card-title">${escapeHtml(title)}</div>
          ${badgeText ? `<span class="card-badge">${escapeHtml(badgeText)}</span>` : ''}
        </div>
        ${subtitle ? `<div class="feature-card-subtitle">${escapeHtml(subtitle)}</div>` : ''}
        <p class="feature-card-desc">${escapeHtml(description)}</p>
        <a href="${escapeHtml(link)}" class="feature-card-link">${escapeHtml(ctaText)}</a>
      </div>`;
    }

    if (el.type === 'image') {
      const url = el.imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&q=80';
      const sizeClass = el.imageSize ? `img-size-${el.imageSize}` : 'img-size-medium';
      return `      <div class="canvas-element element-image ${sizeClass}" id="${id}" data-element-id="${id}" style="${styleAttr}" tabindex="0">
        <img src="${escapeHtml(url)}" alt="Custom overlay image" loading="lazy" />
      </div>`;
    }

    if (el.type === 'badge') {
      const text = el.text || 'FEATURED';
      const badgeStyle = el.badgeStyle || el.style || 'pulse';
      return `      <div class="canvas-element element-badge badge-style-${badgeStyle}" id="${id}" data-element-id="${id}" style="${styleAttr}" tabindex="0">
        <span class="badge-dot"></span>
        <span class="badge-text">${escapeHtml(text)}</span>
      </div>`;
    }

    // Default: button
    const text = el.text || 'Click Me →';
    const link = el.link || '#';
    const btnStyle = el.style || 'solid';
    return `      <div class="canvas-element element-button btn-style-${btnStyle}" id="${id}" data-element-id="${id}" style="${styleAttr}" tabindex="0">
        <a href="${escapeHtml(link)}" class="canvas-btn-link"><span class="btn-shine-effect"></span><span class="btn-label">${escapeHtml(text)}</span></a>
      </div>`;
  });

  return `\n    <div class="section-overlay-layer">\n${elementHtmls.join('\n')}\n    </div>`;
}

const OVERLAY_ELEMENT_CSS = `
    /* ==========================================================================
       Freeform Canvas Overlay Elements
       ========================================================================== */
    .section-overlay-layer {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 25;
      overflow: visible;
    }

    .canvas-element {
      position: absolute;
      transform: translate(-50%, -50%);
      pointer-events: auto;
      cursor: grab;
      user-select: none;
      transition: box-shadow 0.15s ease;
    }

    .canvas-element:active {
      cursor: grabbing;
    }

    .canvas-element.is-selected {
      outline: 2px dashed var(--preview-accent, #6366f1);
      outline-offset: 4px;
      box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.2);
    }

    /* Resize Handles for Canvas Elements */
    .el-resize-handle {
      display: none;
      position: absolute;
      width: 10px;
      height: 10px;
      background: #ffffff;
      border: 2px solid var(--preview-accent, #a855f7);
      border-radius: 3px;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
      z-index: 100;
      box-sizing: border-box;
      pointer-events: auto;
    }
    .el-resize-handle::after {
      content: '';
      position: absolute;
      inset: -6px;
    }
    .canvas-element.is-selected .el-resize-handle {
      display: block;
    }
    .el-resize-handle.handle-nw, .el-resize-handle.handle-top-left {
      top: -5px;
      left: -5px;
      cursor: nwse-resize;
    }
    .el-resize-handle.handle-ne, .el-resize-handle.handle-top-right {
      top: -5px;
      right: -5px;
      cursor: nesw-resize;
    }
    .el-resize-handle.handle-se, .el-resize-handle.handle-bottom-right {
      bottom: -5px;
      right: -5px;
      cursor: nwse-resize;
    }
    .el-resize-handle.handle-sw, .el-resize-handle.handle-bottom-left {
      bottom: -5px;
      left: -5px;
      cursor: nesw-resize;
    }
    .el-resize-handle.handle-n, .el-resize-handle.handle-top {
      top: -5px;
      left: 50%;
      transform: translateX(-50%);
      cursor: ns-resize;
    }
    .el-resize-handle.handle-s, .el-resize-handle.handle-bottom {
      bottom: -5px;
      left: 50%;
      transform: translateX(-50%);
      cursor: ns-resize;
    }
    .el-resize-handle.handle-w, .el-resize-handle.handle-left {
      top: 50%;
      left: -5px;
      transform: translateY(-50%);
      cursor: ew-resize;
    }
    .el-resize-handle.handle-e, .el-resize-handle.handle-right {
      top: 50%;
      right: -5px;
      transform: translateY(-50%);
      cursor: ew-resize;
    }

    /* Button Variants */
    .element-button .canvas-btn-link {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 24px;
      font-size: 14px;
      font-weight: 600;
      font-family: inherit;
      text-decoration: none;
      border-radius: 9999px;
      white-space: nowrap;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .element-button[style*="width"] .canvas-btn-link,
    .element-button[style*="height"] .canvas-btn-link {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
    }

    .btn-style-solid .canvas-btn-link {
      background: var(--preview-accent, #6366f1);
      color: #ffffff;
      border: 1px solid transparent;
      box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35);
    }
    .btn-style-solid .canvas-btn-link:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(99, 102, 241, 0.45);
    }

    .btn-style-glass .canvas-btn-link {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      color: var(--preview-text, #ffffff);
      border: 1px solid rgba(255, 255, 255, 0.25);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    }
    .btn-style-glass .canvas-btn-link:hover {
      background: rgba(255, 255, 255, 0.18);
      border-color: rgba(255, 255, 255, 0.4);
      transform: translateY(-2px);
    }

    .btn-style-neon .canvas-btn-link {
      background: #09090b;
      color: #a855f7;
      border: 1.5px solid #a855f7;
      box-shadow: 0 0 16px rgba(168, 85, 247, 0.4), inset 0 0 8px rgba(168, 85, 247, 0.2);
    }
    .btn-style-neon .canvas-btn-link:hover {
      box-shadow: 0 0 24px rgba(168, 85, 247, 0.7), inset 0 0 12px rgba(168, 85, 247, 0.4);
      transform: translateY(-2px);
    }

    .btn-style-outline .canvas-btn-link {
      background: transparent;
      color: var(--preview-text, #ffffff);
      border: 1.5px solid var(--preview-text, #ffffff);
    }
    .btn-style-outline .canvas-btn-link:hover {
      background: rgba(255, 255, 255, 0.08);
      transform: translateY(-2px);
    }

    .btn-style-shine .canvas-btn-link {
      position: relative;
      overflow: hidden;
      background: linear-gradient(135deg, #6366f1, #a855f7);
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 4px 18px rgba(168, 85, 247, 0.4);
    }
    .btn-style-shine .btn-shine-effect {
      position: absolute;
      top: -50%;
      left: -60%;
      width: 40%;
      height: 200%;
      background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.4), transparent);
      transform: rotate(25deg);
      transition: all 0.75s ease;
      pointer-events: none;
    }
    .btn-style-shine:hover .btn-shine-effect {
      left: 120%;
    }
    .btn-style-shine .canvas-btn-link:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 24px rgba(168, 85, 247, 0.6);
    }

    /* Table Widgets */
    .element-table {
      min-width: 280px;
      max-width: 420px;
      border-radius: 16px;
      padding: 24px;
      background: var(--preview-card-bg, rgba(24, 24, 27, 0.9));
      border: 1px solid var(--preview-border, rgba(255, 255, 255, 0.12));
      backdrop-filter: blur(16px);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
      color: var(--preview-text, #fafafa);
    }

    .element-table-pricing .pricing-card-header {
      margin-bottom: 20px;
      border-bottom: 1px solid var(--preview-border, rgba(255, 255, 255, 0.1));
      padding-bottom: 16px;
    }
    .element-table-pricing .pricing-card-title {
      font-size: 18px;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin-bottom: 6px;
    }
    .element-table-pricing .pricing-card-price {
      font-size: 32px;
      font-weight: 800;
      color: var(--preview-accent, #6366f1);
    }
    .element-table-pricing .pricing-card-features {
      list-style: none;
      padding: 0;
      margin: 0 0 24px 0;
      display: flex;
      flex-direction: column;
      gap: 10px;
      font-size: 13px;
    }
    .element-table-pricing .pricing-card-features li {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .element-table-pricing .feature-check {
      color: #10b981;
      font-weight: 700;
    }
    .element-table-pricing .pricing-card-cta {
      display: block;
      text-align: center;
      padding: 12px 20px;
      border-radius: 10px;
      background: var(--preview-accent, #6366f1);
      color: #ffffff;
      font-weight: 600;
      font-size: 13px;
      text-decoration: none;
      transition: all 0.2s ease;
      box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35);
    }
    .element-table-pricing .pricing-card-cta:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(99, 102, 241, 0.5);
    }

    .element-table-comparison .canvas-matrix-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    .element-table-comparison th {
      text-align: left;
      padding: 8px 10px;
      border-bottom: 2px solid var(--preview-border, rgba(255, 255, 255, 0.15));
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--preview-accent, #6366f1);
    }
    .element-table-comparison td {
      padding: 10px;
      border-bottom: 1px solid var(--preview-border, rgba(255, 255, 255, 0.08));
    }

    /* Card Widgets */
    .element-card {
      min-width: 260px;
      max-width: 360px;
      padding: 22px;
      border-radius: 16px;
      background: var(--preview-card-bg, rgba(24, 24, 27, 0.85));
      border: 1px solid var(--preview-border, rgba(255, 255, 255, 0.12));
      backdrop-filter: blur(16px);
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.35);
      color: var(--preview-text, #fafafa);
    }
    .element-card-feature .feature-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 8px;
    }
    .element-card-feature .feature-card-title {
      font-size: 16px;
      font-weight: 700;
    }
    .element-card-feature .card-badge {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 3px 8px;
      border-radius: 999px;
      background: rgba(239, 68, 68, 0.15);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }
    .element-card-feature .feature-card-subtitle {
      font-size: 12px;
      color: var(--preview-accent, #6366f1);
      margin-bottom: 6px;
    }
    .element-card-feature .feature-card-desc {
      font-size: 13px;
      line-height: 1.5;
      opacity: 0.85;
      margin: 0 0 16px 0;
    }
    .element-card-feature .feature-card-link {
      display: inline-flex;
      align-items: center;
      font-size: 13px;
      font-weight: 600;
      color: var(--preview-accent, #6366f1);
      text-decoration: none;
      transition: gap 0.2s ease;
    }
    .element-card-feature .feature-card-link:hover {
      text-decoration: underline;
    }

    /* Testimonial Card */
    .element-card-testimonial .testimonial-stars {
      color: #fbbf24;
      font-size: 14px;
      letter-spacing: 2px;
      margin-bottom: 8px;
    }
    .element-card-testimonial .testimonial-quote {
      font-size: 13px;
      font-style: italic;
      line-height: 1.6;
      margin: 0 0 14px 0;
      opacity: 0.9;
    }
    .element-card-testimonial .testimonial-author-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .element-card-testimonial .testimonial-avatar {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      object-fit: cover;
      border: 1.5px solid var(--preview-accent, #6366f1);
    }
    .element-card-testimonial .testimonial-name {
      font-size: 13px;
      font-weight: 700;
    }
    .element-card-testimonial .testimonial-role {
      font-size: 11px;
      opacity: 0.65;
    }

    /* File Card Widget */
    .element-card-file {
      min-width: 260px;
      padding: 14px 18px;
      border-radius: 14px;
      background: var(--preview-card-bg, rgba(20, 20, 26, 0.85));
      border: 1px solid var(--preview-border, rgba(255, 255, 255, 0.12));
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.35);
      color: var(--preview-text, #fafafa);
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .element-card-file:hover {
      border-color: rgba(255, 255, 255, 0.22);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.45);
    }
    .file-card-content {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .file-card-icon-wrap {
      width: 38px;
      height: 38px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      flex-shrink: 0;
      color: var(--preview-accent, #6366f1);
    }
    .file-card-meta {
      flex: 1;
      min-width: 0;
    }
    .file-card-name {
      font-size: 13px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: var(--preview-text, #fafafa);
    }
    .file-card-sub {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: #a1a1aa;
      margin-top: 2px;
    }
    .file-card-size {
      font-weight: 500;
    }
    .file-badge {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.04em;
      padding: 3px 8px;
      border-radius: 6px;
      text-transform: uppercase;
      flex-shrink: 0;
    }
    .file-badge-pdf {
      background: rgba(239, 68, 68, 0.18);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.35);
    }
    .file-badge-code {
      background: rgba(59, 130, 246, 0.18);
      color: #60a5fa;
      border: 1px solid rgba(59, 130, 246, 0.35);
    }
    .file-badge-doc {
      background: rgba(99, 102, 241, 0.18);
      color: #818cf8;
      border: 1px solid rgba(99, 102, 241, 0.35);
    }
    .file-badge-media {
      background: rgba(16, 185, 129, 0.18);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.35);
    }
    .file-badge-zip {
      background: rgba(245, 158, 11, 0.18);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.35);
    }

    /* Glass Folder Card Widget */
    .element-card-folder {
      position: relative;
      min-width: 240px;
      padding: 0;
      border-radius: 16px;
      background: var(--preview-card-bg, rgba(20, 20, 26, 0.85));
      border: 1px solid var(--preview-border, rgba(255, 255, 255, 0.14));
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      box-shadow: 0 20px 48px rgba(0, 0, 0, 0.4);
      color: var(--preview-text, #fafafa);
      overflow: visible;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .element-card-folder:hover {
      border-color: rgba(255, 255, 255, 0.25);
      box-shadow: 0 24px 54px rgba(0, 0, 0, 0.5);
    }
    .folder-glass-tab {
      position: absolute;
      top: -14px;
      left: 16px;
      padding: 3px 12px;
      border-radius: 8px 8px 0 0;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-bottom: none;
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 0.06em;
      color: #fafafa;
      z-index: 2;
    }
    .folder-tab-badge {
      display: inline-block;
      text-transform: uppercase;
    }
    .folder-art-header {
      height: 90px;
      border-radius: 15px 15px 0 0;
      position: relative;
      overflow: hidden;
    }
    .folder-art-aurora {
      background: linear-gradient(135deg, #06b6d4 0%, #8b5cf6 50%, #ec4899 100%);
    }
    .folder-art-dusk {
      background: linear-gradient(135deg, #1e1b4b 0%, #3b82f6 50%, #6366f1 100%);
    }
    .folder-art-ember {
      background: linear-gradient(135deg, #18181b 0%, #f97316 60%, #ef4444 100%);
    }
    .folder-art-glow {
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 70% 30%, rgba(255, 255, 255, 0.25), transparent 70%);
      mix-blend-mode: overlay;
    }
    .folder-body {
      padding: 14px 18px 16px 18px;
    }
    .folder-label {
      font-size: 14px;
      font-weight: 700;
      color: var(--preview-text, #fafafa);
      margin-bottom: 4px;
    }
    .folder-meta-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11px;
      color: #a1a1aa;
    }
    .folder-item-count {
      font-weight: 500;
    }
    .folder-arrow {
      color: var(--preview-accent, #6366f1);
      font-weight: 700;
      transition: transform 0.2s ease;
    }
    .element-card-folder:hover .folder-arrow {
      transform: translateX(3px);
    }

    /* Image Sizes */
    .element-image img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 12px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
      border: 1px solid var(--preview-border, rgba(255, 255, 255, 0.1));
    }

    .element-image.img-size-small { width: 140px; height: 140px; }
    .element-image.img-size-medium { width: 240px; height: 240px; }
    .element-image.img-size-large { width: 360px; height: 360px; }

    .element-image[style*="width"] img,
    .element-image[style*="height"] img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    /* Badge */
    .element-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      border-radius: 9999px;
      backdrop-filter: blur(8px);
      white-space: nowrap;
    }
    .badge-style-pulse {
      background: rgba(99, 102, 241, 0.15);
      color: var(--preview-accent, #6366f1);
      border: 1px solid var(--preview-accent, #6366f1);
    }
    .badge-style-pulse .badge-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--preview-accent, #6366f1);
      box-shadow: 0 0 8px var(--preview-accent, #6366f1);
      animation: badgePulse 1.8s infinite;
    }
    @keyframes badgePulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.8); }
    }
    .badge-style-pill {
      background: var(--preview-card-bg, rgba(255, 255, 255, 0.1));
      color: var(--preview-text, #fafafa);
      border: 1px solid var(--preview-border, rgba(255, 255, 255, 0.2));
    }
    .badge-style-accent {
      background: var(--preview-accent, #6366f1);
      color: #ffffff;
      border: 1px solid transparent;
      box-shadow: 0 2px 10px rgba(99, 102, 241, 0.4);
    }

    /* Section Resize Handle */
    .section-resize-handle {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      height: 14px;
      cursor: ns-resize;
      background: transparent;
      z-index: 40;
      transition: background-color 0.15s ease;
      touch-action: none;
    }
    .section-resize-handle::after {
      content: '';
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 56px;
      height: 5px;
      border-radius: 9999px;
      background: rgba(255, 255, 255, 0.35);
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
      transition: all 0.15s ease;
      opacity: 0;
    }
    .page-section:hover .section-resize-handle::after,
    .section-resize-handle:hover::after,
    .section-resize-handle.is-resizing::after {
      opacity: 1;
      background: var(--preview-accent, #a855f7);
      width: 72px;
      height: 6px;
      box-shadow: 0 0 14px var(--preview-accent, #a855f7);
    }
    .section-resize-handle:hover,
    .section-resize-handle.is-resizing {
      background: rgba(168, 85, 247, 0.15);
    }

    /* Drag and Drop Canvas Indicators */
    .page-section.is-drop-target {
      outline: 2px dashed rgba(168, 85, 247, 0.8) !important;
      outline-offset: -3px;
      background-color: rgba(168, 85, 247, 0.05) !important;
      transition: outline 0.15s ease;
    }

    .section-drop-indicator {
      position: absolute;
      left: 0;
      right: 0;
      height: 3px;
      background: #a855f7;
      box-shadow: 0 0 12px #a855f7;
      z-index: 9999;
      pointer-events: none;
    }

    .section-drop-indicator.drop-above {
      top: 0;
    }

    .section-drop-indicator.drop-below {
      bottom: 0;
    }
`;

const api = { renderSectionOverlayHtml, OVERLAY_ELEMENT_CSS };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
if (typeof window !== 'undefined') window.AsmOverlay = api;
})();

/**
 * Page Preview & Assemble Studio Controller (builder.js)
 * Manages active section stack, component picker drawer, theming, and preview integration.
 */

(function () {
  'use strict';

  // Helper: HTML escaping
  function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Helper: Toast Notifications
  function showToast(message, duration = 2200) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'builder-toast';
    toast.style.cssText = `
      background: rgba(18, 18, 24, 0.95);
      border: 1px solid rgba(168, 85, 247, 0.4);
      color: #fafafa;
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 500;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
      animation: fadeIn 0.2s ease-out;
      pointer-events: auto;
    `;
    toast.innerHTML = `
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#a855f7" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
      <span>${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.25s ease';
      setTimeout(() => toast.remove(), 260);
    }, duration);
  }

  // Normalized Category Resolver
  function getNormalizedCategory(feature) {
    if (!feature) return 'Component';
    const cat = (feature.category || '').trim();
    const slug = (feature.slug || '').toLowerCase();
    const title = (feature.title || feature.name || '').toLowerCase();

    // 1. Footers & Endings
    if (slug.includes('footer') || title.includes('footer') || cat.toLowerCase().includes('footer')) {
      return 'Footers & Endings';
    }

    // 2. Pricing & Tables
    if (slug.includes('pricing') || title.includes('pricing') || slug.includes('turntable') || title.includes('turntable') || slug.includes('matrix')) {
      return 'Pricing & Tables';
    }

    // 3. Headers & Nav
    if (slug.includes('nav') || slug.includes('menu') || slug.includes('burger') || slug.includes('header') || slug.includes('lang-switcher') || cat.toLowerCase().includes('navigation')) {
      return 'Headers & Nav';
    }

    // 4. Heroes
    if (slug.includes('hero') || title.includes('hero') || cat.toLowerCase() === 'heroes') {
      return 'Heroes';
    }

    // 5. Buttons & UI
    if (cat.toLowerCase().includes('button') || slug.includes('btn') || slug.includes('button') || slug.includes('cta') || slug.includes('drawer') || slug.includes('accordion') || slug.includes('tabs')) {
      return 'Buttons & UI';
    }

    // 6. Cards & Tiles
    if (cat.toLowerCase().includes('cards') || slug.includes('card') || slug.includes('ticket') || slug.includes('testimonial')) {
      return 'Cards & Tiles';
    }

    // 7. Galleries & Bento
    if (cat.toLowerCase().includes('galleries') || cat.toLowerCase().includes('layouts') || slug.includes('bento') || slug.includes('gallery') || slug.includes('marquee') || slug.includes('showcase')) {
      return 'Galleries & Bento';
    }

    // 8. 3D & Carousels
    if (cat.toLowerCase().includes('3d') || cat.toLowerCase().includes('carousel') || slug.includes('carousel') || slug.includes('3d') || slug.includes('wheel')) {
      return '3D & Carousels';
    }

    // 9. Scroll & Parallax
    if (cat.toLowerCase().includes('scroll') || cat.toLowerCase().includes('parallax') || slug.includes('parallax') || slug.includes('scroll') || slug.includes('timeline')) {
      return 'Scroll & Parallax';
    }

    // 10. Preloaders & Shaders
    if (cat.toLowerCase().includes('preloader') || slug.includes('preloader')) {
      return 'Preloaders & Shaders';
    }

    // 11. Audio & Shaders
    if (cat.toLowerCase().includes('audio') || slug.includes('audio') || slug.includes('sound') || slug.includes('shader')) {
      return 'Audio & Shaders';
    }

    // 12. Full Templates
    if (cat.toLowerCase().includes('full') || slug.includes('template') || slug.includes('landing')) {
      return 'Full Templates';
    }

    // 13. Interactions & Physics / Cursors
    if (cat.toLowerCase().includes('physics') || cat.toLowerCase().includes('cursor') || cat.toLowerCase().includes('form')) {
      return 'Interactions & Physics';
    }

    return cat || 'Component';
  }

  // Category matching rule: maps registry categories/tags to drawer and sidebar categories
  function matchesCategory(feature, targetCategory) {
    if (!targetCategory || targetCategory === 'all') return true;
    const norm = getNormalizedCategory(feature);
    const targetNorm = targetCategory.toLowerCase().trim();
    const currentNorm = norm.toLowerCase().trim();

    if (currentNorm === targetNorm) return true;
    if ((targetNorm === 'footers' || targetNorm === 'footers & endings') && currentNorm.includes('footer')) return true;
    if ((targetNorm === 'headers & nav' || targetNorm === 'navigation & headers') && currentNorm.includes('nav')) return true;
    if ((targetNorm === 'pricing & tables' || targetNorm === 'tables & pricing') && (currentNorm.includes('pricing') || currentNorm.includes('table'))) return true;
    if (targetNorm === 'buttons & ui' && (currentNorm.includes('button') || currentNorm.includes('ui'))) return true;
    if (targetNorm === 'cards & tiles' && currentNorm.includes('card')) return true;
    if ((targetNorm === 'galleries & bento' || targetNorm === 'galleries & grids') && (currentNorm.includes('galleries') || currentNorm.includes('grid') || currentNorm.includes('bento'))) return true;
    if (targetNorm === '3d & carousels' && (currentNorm.includes('3d') || currentNorm.includes('carousel'))) return true;
    if (targetNorm === 'scroll & parallax' && (currentNorm.includes('scroll') || currentNorm.includes('parallax'))) return true;
    if (targetNorm === 'audio & shaders' && (currentNorm.includes('audio') || currentNorm.includes('shader'))) return true;
    if ((targetNorm === 'interactions & physics' || targetNorm === 'physics & cursors') && currentNorm.includes('physics')) return true;
    if ((targetNorm === 'preloaders & shaders' || targetNorm === 'preloaders') && currentNorm.includes('preloader')) return true;
    if (targetNorm === 'full templates' && currentNorm.includes('template')) return true;

    return currentNorm.includes(targetNorm);
  }

  // -------------------------------------------------------------
  // 20 Insertable In-Section Widgets with Real Rendered HTML Previews
  // -------------------------------------------------------------
  const WIDGET_CATALOG_ITEMS = [
    {
      id: 'btn-neon',
      slug: 'btn-neon',
      type: 'button',
      isWidget: true,
      title: 'Neon Glow Button',
      desc: 'Cyberpunk animated neon glow button with glowing aura',
      category: 'Buttons & UI',
      tags: ['button', 'neon', 'glow', 'cyberpunk', 'cta'],
      previewHtml: '<div class="mini-widget-preview-box"><div class="mini-preview-btn btn-style-neon"><span>Launch Terminal ⚡</span></div></div>',
      elData: { type: 'button', text: 'Launch Terminal ⚡', style: 'neon', link: '#' }
    },
    {
      id: 'btn-glass',
      slug: 'btn-glass',
      type: 'button',
      isWidget: true,
      title: 'Frosted Glass Button',
      desc: 'Backdrop blur with glass reflection and sleek border',
      category: 'Buttons & UI',
      tags: ['button', 'glass', 'frosted', 'minimal', 'blur'],
      previewHtml: '<div class="mini-widget-preview-box"><div class="mini-preview-btn btn-style-glass"><span>Glass Action 💎</span></div></div>',
      elData: { type: 'button', text: 'Explore Platform →', style: 'glass', link: '#' }
    },
    {
      id: 'btn-shine',
      slug: 'btn-shine',
      type: 'button',
      isWidget: true,
      title: 'Gradient Shine Button',
      desc: 'Animated gradient light sheen across vibrant background',
      category: 'Buttons & UI',
      tags: ['button', 'shine', 'gradient', 'animated', 'cta'],
      previewHtml: '<div class="mini-widget-preview-box"><div class="mini-preview-btn btn-style-shine"><span class="mini-shine-sweep"></span><span>Upgrade to Pro ✨</span></div></div>',
      elData: { type: 'button', text: 'Upgrade to Pro ✨', style: 'shine', link: '#' }
    },
    {
      id: 'btn-solid',
      slug: 'btn-solid',
      type: 'button',
      isWidget: true,
      title: 'Pill Accent Button',
      desc: 'High-contrast solid primary CTA with rounded pill shape',
      category: 'Buttons & UI',
      tags: ['button', 'pill', 'solid', 'primary', 'cta'],
      previewHtml: '<div class="mini-widget-preview-box"><div class="mini-preview-btn btn-style-solid"><span>Get Started 🟣</span></div></div>',
      elData: { type: 'button', text: 'Get Started', style: 'solid', link: '#' }
    },
    {
      id: 'btn-outline',
      slug: 'btn-outline',
      type: 'button',
      isWidget: true,
      title: 'Minimal Outline Button',
      desc: 'Clean subtle border with smooth hover background fill',
      category: 'Buttons & UI',
      tags: ['button', 'outline', 'minimal', 'border', 'cta'],
      previewHtml: '<div class="mini-widget-preview-box"><div class="mini-preview-btn btn-style-outline"><span>Documentation ⭕</span></div></div>',
      elData: { type: 'button', text: 'Documentation →', style: 'outline', link: '#' }
    },
    {
      id: 'table-pricing',
      slug: 'table-pricing',
      type: 'table',
      isWidget: true,
      title: 'Pricing Tier Card',
      desc: 'Floating card with price, feature checkmarks & CTA',
      category: 'Pricing & Tables',
      tags: ['table', 'pricing', 'card', 'tier', 'saas'],
      previewHtml: '<div class="mini-widget-preview-box"><div class="mini-pricing-card"><div class="mini-pricing-header"><span class="mini-plan-badge">PRO PLAN</span><div class="mini-pricing-val">$29<span class="mini-per">/mo</span></div></div><div class="mini-pricing-features"><div>✓ Unlimited Projects</div><div>✓ Priority Support</div></div></div></div>',
      elData: {
        type: 'table',
        tableType: 'pricing',
        title: 'Pro Plan',
        price: '$29/mo',
        features: ['Unlimited Projects', 'Custom Domains', '24/7 Priority Support'],
        ctaText: 'Get Started',
        ctaLink: '#pricing'
      }
    },
    {
      id: 'table-comparison',
      slug: 'table-comparison',
      type: 'table',
      isWidget: true,
      title: 'Comparison Matrix',
      desc: 'Clean feature comparison matrix table with checkmarks',
      category: 'Pricing & Tables',
      tags: ['table', 'comparison', 'matrix', 'features'],
      previewHtml: '<div class="mini-widget-preview-box"><div class="mini-matrix-box"><div class="mini-matrix-row mini-matrix-head"><span>Feature</span><span>Free</span><span>Pro</span></div><div class="mini-matrix-row"><span>Storage</span><span>5 GB</span><span class="mini-hl">500 GB</span></div><div class="mini-matrix-row"><span>Speed</span><span>1x</span><span class="mini-hl">10x</span></div></div></div>',
      elData: {
        type: 'table',
        tableType: 'comparison',
        headers: ['Feature', 'Free', 'Pro'],
        rows: [
          ['Storage', '5 GB', '500 GB'],
          ['Bandwidth', '10 GB/mo', 'Unlimited'],
          ['Support', 'Community', '24/7 Priority']
        ]
      }
    },
    {
      id: 'card-feature',
      slug: 'card-feature',
      type: 'card',
      isWidget: true,
      title: 'Feature Card',
      desc: 'Glassmorphic card with badge, title, desc & link',
      category: 'Cards & Tiles',
      tags: ['card', 'feature', 'glass', 'bento', 'badge'],
      previewHtml: '<div class="mini-widget-preview-box"><div class="mini-feature-card"><div class="mini-card-head"><span class="mini-feature-badge">HOT</span><span class="mini-card-title">Real-time Analytics</span></div><p class="mini-card-desc">Telemetry with sub-millisecond precision.</p></div></div>',
      elData: {
        type: 'card',
        cardType: 'feature',
        title: 'Real-time Analytics',
        description: 'Track conversion rates and user telemetry with sub-millisecond precision.',
        badgeText: 'HOT',
        ctaText: 'Learn More →',
        link: '#features'
      }
    },
    {
      id: 'card-testimonial',
      slug: 'card-testimonial',
      type: 'card',
      isWidget: true,
      title: 'Testimonial Card',
      desc: 'Quote card with author avatar, rating stars & company',
      category: 'Cards & Tiles',
      tags: ['card', 'testimonial', 'review', 'quote', 'stars'],
      previewHtml: '<div class="mini-widget-preview-box"><div class="mini-testimonial-card"><div class="mini-stars">★★★★★</div><p class="mini-quote">"Boosted conversions by 48% within hours."</p><div class="mini-author">— Sarah J., VP Product</div></div></div>',
      elData: {
        type: 'card',
        cardType: 'testimonial',
        author: 'Sarah Jenkins',
        role: 'VP of Product, Apex Digital',
        avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&q=80',
        description: 'This platform transformed our landing page conversion rates within 48 hours.',
        rating: 5
      }
    },
    {
      id: 'card-file-pdf',
      slug: 'card-file-pdf',
      type: 'file-card',
      isWidget: true,
      title: 'PDF Document Card',
      desc: 'Discrete PDF document card with red badge and file metadata',
      category: 'Cards & Tiles',
      tags: ['card', 'file', 'pdf', 'document', 'download'],
      previewHtml: '<div class="mini-widget-preview-box"><div class="mini-file-card"><span class="mini-file-badge mini-file-badge-pdf">PDF</span><div class="mini-file-info"><div class="mini-file-name">Contract-2026.pdf</div><div class="mini-file-size">320 KB</div></div></div></div>',
      elData: {
        type: 'file-card',
        fileType: 'pdf',
        badge: 'PDF',
        fileName: 'Contract-2026.pdf',
        fileSize: '320 KB'
      }
    },
    {
      id: 'card-file-code',
      slug: 'card-file-code',
      type: 'file-card',
      isWidget: true,
      title: 'Code Source Card',
      desc: 'Developer code source card with blue badge and size badge',
      category: 'Cards & Tiles',
      tags: ['card', 'file', 'code', 'source', 'developer', 'script'],
      previewHtml: '<div class="mini-widget-preview-box"><div class="mini-file-card"><span class="mini-file-badge mini-file-badge-code">CODE</span><div class="mini-file-info"><div class="mini-file-name">app.tsx</div><div class="mini-file-size">14 KB</div></div></div></div>',
      elData: {
        type: 'file-card',
        fileType: 'code',
        badge: 'CODE',
        fileName: 'app.tsx',
        fileSize: '14 KB'
      }
    },
    {
      id: 'card-file-doc',
      slug: 'card-file-doc',
      type: 'file-card',
      isWidget: true,
      title: 'Word Document Card',
      desc: 'Rich document card with indigo badge and document specs',
      category: 'Cards & Tiles',
      tags: ['card', 'file', 'doc', 'word', 'document', 'brief'],
      previewHtml: '<div class="mini-widget-preview-box"><div class="mini-file-card"><span class="mini-file-badge mini-file-badge-doc">DOC</span><div class="mini-file-info"><div class="mini-file-name">Project-Brief.docx</div><div class="mini-file-size">85 KB</div></div></div></div>',
      elData: {
        type: 'file-card',
        fileType: 'doc',
        badge: 'DOC',
        fileName: 'Project-Brief.docx',
        fileSize: '85 KB'
      }
    },
    {
      id: 'card-file-media',
      slug: 'card-file-media',
      type: 'file-card',
      isWidget: true,
      title: 'Media Assets Card',
      desc: 'Image and media card with emerald badge and preview meta',
      category: 'Cards & Tiles',
      tags: ['card', 'file', 'media', 'image', 'photo', 'png'],
      previewHtml: '<div class="mini-widget-preview-box"><div class="mini-file-card"><span class="mini-file-badge mini-file-badge-media">IMG</span><div class="mini-file-info"><div class="mini-file-name">Hero-Visual.png</div><div class="mini-file-size">2.4 MB</div></div></div></div>',
      elData: {
        type: 'file-card',
        fileType: 'media',
        badge: 'IMG',
        fileName: 'Hero-Visual.png',
        fileSize: '2.4 MB'
      }
    },
    {
      id: 'card-file-zip',
      slug: 'card-file-zip',
      type: 'file-card',
      isWidget: true,
      title: 'Compressed Archive Card',
      desc: 'Compressed archive bundle card with amber badge and size',
      category: 'Cards & Tiles',
      tags: ['card', 'file', 'zip', 'archive', 'tar', 'bundle'],
      previewHtml: '<div class="mini-widget-preview-box"><div class="mini-file-card"><span class="mini-file-badge mini-file-badge-zip">ZIP</span><div class="mini-file-info"><div class="mini-file-name">Source-Bundle.zip</div><div class="mini-file-size">48 MB</div></div></div></div>',
      elData: {
        type: 'file-card',
        fileType: 'zip',
        badge: 'ZIP',
        fileName: 'Source-Bundle.zip',
        fileSize: '48 MB'
      }
    },
    {
      id: 'card-folder-aurora',
      slug: 'card-folder-aurora',
      type: 'folder-card',
      isWidget: true,
      title: 'Aurora Glass Folder',
      desc: 'Aurora liquid art frosted glass folder with tab and item count',
      category: 'Cards & Tiles',
      tags: ['card', 'folder', 'glass', 'aurora', 'frosted', 'vault'],
      previewHtml: '<div class="mini-widget-preview-box"><div class="mini-folder-card mini-folder-aurora"><div class="mini-folder-tab"><span class="mini-folder-badge">AURORA</span></div><div class="mini-folder-header"></div><div class="mini-folder-body"><div class="mini-folder-title">Aurora Project</div><div class="mini-folder-meta">12 items</div></div></div></div>',
      elData: {
        type: 'folder-card',
        art: 'aurora',
        label: 'Aurora Project',
        badge: 'AURORA',
        itemCount: '12 items'
      }
    },
    {
      id: 'card-folder-archive',
      slug: 'card-folder-archive',
      type: 'folder-card',
      isWidget: true,
      title: 'Archive Glass Folder',
      desc: 'Production archives frosted glass folder with dusk art header',
      category: 'Cards & Tiles',
      tags: ['card', 'folder', 'glass', 'archive', 'dusk', 'files'],
      previewHtml: '<div class="mini-widget-preview-box"><div class="mini-folder-card mini-folder-dusk"><div class="mini-folder-tab"><span class="mini-folder-badge">ARCHIVE</span></div><div class="mini-folder-header"></div><div class="mini-folder-body"><div class="mini-folder-title">Production Archives</div><div class="mini-folder-meta">48 items</div></div></div></div>',
      elData: {
        type: 'folder-card',
        art: 'dusk',
        label: 'Production Archives',
        badge: 'ARCHIVE',
        itemCount: '48 items'
      }
    },
    {
      id: 'card-folder-ember',
      slug: 'card-folder-ember',
      type: 'folder-card',
      isWidget: true,
      title: 'Smoked Ember Glass Folder',
      desc: 'Smoked dark ember glass folder with red ink art and tab',
      category: 'Cards & Tiles',
      tags: ['card', 'folder', 'glass', 'ember', 'smoke', 'vault'],
      previewHtml: '<div class="mini-widget-preview-box"><div class="mini-folder-card mini-folder-ember"><div class="mini-folder-tab"><span class="mini-folder-badge">EMBER</span></div><div class="mini-folder-header"></div><div class="mini-folder-body"><div class="mini-folder-title">Creative Vault</div><div class="mini-folder-meta">24 items</div></div></div></div>',
      elData: {
        type: 'folder-card',
        art: 'ember',
        label: 'Creative Vault',
        badge: 'EMBER',
        itemCount: '24 items'
      }
    },
    {
      id: 'badge-pulse',
      slug: 'badge-pulse',
      type: 'badge',
      isWidget: true,
      title: 'Pulse Glow Badge',
      desc: 'Live pulsing neon indicator dot with status text pill',
      category: 'Cards & Tiles',
      tags: ['badge', 'pulse', 'status', 'tag', 'live'],
      previewHtml: '<div class="mini-widget-preview-box"><div class="mini-badge-pulse"><span class="mini-pulse-dot"></span><span>v2.0 LIVE</span></div></div>',
      elData: {
        type: 'badge',
        text: 'v2.0 LIVE',
        badgeStyle: 'pulse'
      }
    },
    {
      id: 'badge-pill',
      slug: 'badge-pill',
      type: 'badge',
      isWidget: true,
      title: 'Metric Pill Tag',
      desc: 'Glassmorphic badge for stats, versions & highlights',
      category: 'Cards & Tiles',
      tags: ['badge', 'pill', 'metric', 'tag', 'glass'],
      previewHtml: '<div class="mini-widget-preview-box"><div class="mini-badge-pill"><span>+99.8% Faster</span></div></div>',
      elData: {
        type: 'badge',
        text: '+99.8% Faster',
        badgeStyle: 'pill'
      }
    },
    {
      id: 'image-custom',
      slug: 'image-custom',
      type: 'image',
      isWidget: true,
      title: 'Custom Floating Image',
      desc: 'Free-floating framed media with subtle rounded shadow',
      category: 'Cards & Tiles',
      tags: ['image', 'photo', 'media', 'custom', 'floating'],
      previewHtml: '<div class="mini-widget-preview-box"><div class="mini-image-card"><img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&q=80" alt="Thumbnail" /></div></div>',
      elData: {
        type: 'image',
        imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&q=80',
        imageSize: 'medium'
      }
    }
  ];

  function initBuilder() {
    // 1. Initialize State Manager
    const stackManager = typeof window.createStackManager === 'function'
      ? window.createStackManager()
      : (window.StackManager && window.StackManager.createStackManager ? window.StackManager.createStackManager() : null);

    if (!stackManager) {
      console.error('StackManager not found. Ensure scripts/stack-manager.js is loaded.');
      return;
    }

    // Expose on window for tests and other scripts
    window.builderManager = stackManager;

    // Cache features from window.FEATURE_REGISTRY
    const featuresMap = new Map();
    const featuresData = {};
    const featureCache = new Map();
    const registry = Array.isArray(window.FEATURE_REGISTRY) ? window.FEATURE_REGISTRY : [];

    registry.forEach(feature => {
      featuresMap.set(feature.slug, feature);
      if (feature.files && (feature.files.html || feature.files.css || feature.files.js)) {
        featuresData[feature.slug] = {
          html: feature.files.html || '',
          css: feature.files.css || '',
          js: feature.files.js || ''
        };
        featureCache.set(feature.slug, featuresData[feature.slug]);
      }
    });

    // Landing Page Singleton Rules:
    // Singletons: Preloader (Optional, index 0), Header (Essential, top), Hero (Essential, after header), Footer (Essential, bottom).
    const LANDING_PAGE_SINGLETONS = {
      preloader: {
        type: 'preloader',
        name: 'Preloader',
        category: 'Preloaders & Shaders',
        necessity: 'optional',
        needLabel: 'Optional',
        match: (slug, title, cat) => {
          const s = (slug || '').toLowerCase();
          const t = (title || '').toLowerCase();
          const c = (cat || '').toLowerCase();
          return c.includes('preloader') || s.includes('preloader') || t.includes('preloader');
        }
      },
      header: {
        type: 'header',
        name: 'Header',
        category: 'Headers & Nav',
        necessity: 'required',
        needLabel: 'Essential',
        match: (slug, title, cat) => {
          const s = (slug || '').toLowerCase();
          const t = (title || '').toLowerCase();
          const c = (cat || '').toLowerCase();
          return c.includes('nav') || c.includes('header') || s.includes('header') || s.includes('nav') || s.includes('burger') || s.includes('menu') || t.includes('header') || t.includes('navbar') || t.includes('navigation');
        }
      },
      hero: {
        type: 'hero',
        name: 'Hero Section',
        category: 'Heroes',
        necessity: 'required',
        needLabel: 'Essential',
        match: (slug, title, cat) => {
          const s = (slug || '').toLowerCase();
          const t = (title || '').toLowerCase();
          const c = (cat || '').toLowerCase();
          return c === 'heroes' || c.includes('hero') || s.includes('hero') || t.includes('hero');
        }
      },
      footer: {
        type: 'footer',
        name: 'Footer',
        category: 'Footers & Endings',
        necessity: 'required',
        needLabel: 'Essential',
        match: (slug, title, cat) => {
          const s = (slug || '').toLowerCase();
          const t = (title || '').toLowerCase();
          const c = (cat || '').toLowerCase();
          return c.includes('footer') || s.includes('footer') || t.includes('footer');
        }
      }
    };

    function getSingletonType(slug, title, cat) {
      if (!slug && !title && !cat) return null;
      for (const [key, def] of Object.entries(LANDING_PAGE_SINGLETONS)) {
        if (def.match(slug, title, cat)) return key;
      }
      return null;
    }

    function findExistingSingleton(type) {
      if (!type || !stackManager) return null;
      const stack = stackManager.getStack();
      return stack.find(sec => {
        const feat = featuresMap.get(sec.slug);
        const title = sec.title || (feat ? (feat.title || feat.name) : '');
        const cat = sec.category || (feat ? feat.category : '');
        return getSingletonType(sec.slug, title, cat) === type;
      }) || null;
    }

    // Preloader play state tracking:
    // "It need to play once after I add it and other times only if I run it"
    let playedPreloaderId = null;
    let preloaderForceReplay = false;

    function addOrReplaceLandingSection(slug, extraProps = {}, preferredIndex = null) {
      const title = extraProps.title || slug;
      const category = extraProps.category || '';
      const singletonType = getSingletonType(slug, title, category);

      if (singletonType === 'preloader') {
        // Explicitly added or replaced preloader: play once
        preloaderForceReplay = true;
        playedPreloaderId = null;
      }

      if (singletonType) {
        const singletonDef = LANDING_PAGE_SINGLETONS[singletonType];
        const existing = findExistingSingleton(singletonType);

        if (existing) {
          // Landing page can only have one! Replace the existing singleton in place
          let replaced;
          if (typeof stackManager.replaceSection === 'function') {
            replaced = stackManager.replaceSection(existing.id, slug, extraProps);
          } else {
            const stack = stackManager.getStack();
            const idx = stack.findIndex(s => s.id === existing.id);
            stackManager.removeSection(existing.id);
            replaced = stackManager.insertSection(idx >= 0 ? idx : stackManager.getStack().length, slug, extraProps);
          }

          // Ensure proper canonical position if needed (Preloader at 0, Header at 0/1, Footer at bottom)
          if (singletonType === 'preloader') {
            const stack = stackManager.getStack();
            const currIdx = stack.findIndex(s => s.id === (replaced ? replaced.id : existing.id));
            if (currIdx > 0) {
              stackManager.moveSection(replaced ? replaced.id : existing.id, -currIdx);
            }
          } else if (singletonType === 'header') {
            const stack = stackManager.getStack();
            const preloader = findExistingSingleton('preloader');
            const targetPos = preloader ? 1 : 0;
            const currIdx = stack.findIndex(s => s.id === (replaced ? replaced.id : existing.id));
            if (currIdx !== targetPos && currIdx >= 0) {
              stackManager.moveSection(replaced ? replaced.id : existing.id, targetPos - currIdx);
            }
          } else if (singletonType === 'footer') {
            const stack = stackManager.getStack();
            const currIdx = stack.findIndex(s => s.id === (replaced ? replaced.id : existing.id));
            if (currIdx >= 0 && currIdx < stack.length - 1) {
              stackManager.moveSection(replaced ? replaced.id : existing.id, (stack.length - 1) - currIdx);
            }
          }

          showToast(`Landing page can only have one ${singletonDef.name}. Replaced with "${title}".`);
          return { section: replaced, replaced: true, singletonType };
        } else {
          // No existing singleton: insert at canonical position
          let targetIndex = preferredIndex;
          if (singletonType === 'preloader') {
            targetIndex = 0; // Preloaders always go at the very top (entry screen)
          } else if (singletonType === 'header') {
            const preloader = findExistingSingleton('preloader');
            targetIndex = preloader ? 1 : 0; // Header goes after preloader if present, else 0
          } else if (singletonType === 'hero') {
            const header = findExistingSingleton('header');
            if (header) {
              const stack = stackManager.getStack();
              const headerIdx = stack.findIndex(s => s.id === header.id);
              targetIndex = headerIdx >= 0 ? headerIdx + 1 : 1;
            } else {
              const preloader = findExistingSingleton('preloader');
              targetIndex = preloader ? 1 : 0;
            }
          } else if (singletonType === 'footer') {
            targetIndex = stackManager.getStack().length;
          } else if (targetIndex === null || targetIndex === undefined) {
            const footer = findExistingSingleton('footer');
            if (footer) {
              const stack = stackManager.getStack();
              const footerIdx = stack.findIndex(s => s.id === footer.id);
              targetIndex = footerIdx >= 0 ? footerIdx : stack.length;
            } else {
              targetIndex = stackManager.getStack().length;
            }
          }

          const newSec = stackManager.insertSection(targetIndex, slug, extraProps);
          showToast(`Added ${singletonDef.name}: "${title}"`);
          return { section: newSec, replaced: false, singletonType };
        }
      }

      // Non-singleton component: if footer exists at end, keep footer at bottom by inserting before it
      let targetIndex = preferredIndex;
      if (targetIndex === null || targetIndex === undefined) {
        const footer = findExistingSingleton('footer');
        if (footer) {
          const stack = stackManager.getStack();
          const footerIdx = stack.findIndex(s => s.id === footer.id);
          targetIndex = footerIdx >= 0 ? footerIdx : stack.length;
        } else {
          targetIndex = stackManager.getStack().length;
        }
      }

      const newSec = stackManager.insertSection(targetIndex, slug, extraProps);
      showToast(`Added "${title}"`);
      return { section: newSec, replaced: false, singletonType: null };
    }

    /**
     * Client-side memory cache for feature source files.
     * Fetches features/<slug>/index.html, style.css, script.js if not yet cached.
     */
    async function fetchFeatureFiles(slug) {
      if (!slug) return { html: '', css: '', js: '' };

      if (featureCache.has(slug)) {
        return featureCache.get(slug);
      }

      if (featuresData[slug] && (featuresData[slug].html || featuresData[slug].css || featuresData[slug].js)) {
        featureCache.set(slug, featuresData[slug]);
        return featuresData[slug];
      }

      let html = '';
      let css = '';
      let js = '';

      // Node.js fallback (for tests and headless environments)
      if (typeof process !== 'undefined' && process.versions && process.versions.node) {
        try {
          const fs = require('fs');
          const path = require('path');
          const dir = path.resolve(process.cwd(), 'features', slug);
          if (fs.existsSync(path.join(dir, 'index.html'))) {
            html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
          }
          if (fs.existsSync(path.join(dir, 'style.css'))) {
            css = fs.readFileSync(path.join(dir, 'style.css'), 'utf8');
          }
          if (fs.existsSync(path.join(dir, 'script.js'))) {
            js = fs.readFileSync(path.join(dir, 'script.js'), 'utf8');
          }
        } catch (_) {}
      }

      // Browser HTTP fetch
      if (!html && !css && !js && typeof fetch === 'function') {
        try {
          const [htmlRes, cssRes, jsRes] = await Promise.all([
            fetch(`features/${slug}/index.html`).catch(() => null),
            fetch(`features/${slug}/style.css`).catch(() => null),
            fetch(`features/${slug}/script.js`).catch(() => null)
          ]);

          if (htmlRes && htmlRes.ok) html = await htmlRes.text();
          if (cssRes && cssRes.ok) css = await cssRes.text();
          if (jsRes && jsRes.ok) js = await jsRes.text();
        } catch (err) {
          console.warn(`Could not fetch sources for feature "${slug}":`, err);
        }
      }

      const files = { html, css, js };
      featureCache.set(slug, files);
      featuresData[slug] = files;
      return files;
    }

    // 2. DOM Elements
    const pageStackList = document.getElementById('pageStackList');
    const stackEmptyPlaceholder = document.getElementById('stackEmptyPlaceholder');
    const stackCountBadge = document.getElementById('stackCountBadge');
    const clearStackBtn = document.getElementById('clearStackBtn');
    const loadStarterBtn = document.getElementById('loadStarterBtn');
    const resetCanvasBtn = document.getElementById('resetCanvasBtn');
    const openDrawerBtn = document.getElementById('openDrawerBtn');
    const emptyBrowseBtn = document.getElementById('emptyBrowseBtn');
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');

    // Drawer Elements
    const componentDrawer = document.getElementById('componentDrawer');
    const drawerBackdrop = document.getElementById('drawerBackdrop');
    const closeDrawerBtn = document.getElementById('closeDrawerBtn');
    const drawerSearchInput = document.getElementById('drawerSearchInput');
    const clearDrawerSearchBtn = document.getElementById('clearDrawerSearchBtn');
    const drawerCategories = document.getElementById('drawerCategories');
    const drawerFeatureGrid = document.getElementById('drawerFeatureGrid');
    const drawerCountBadge = document.getElementById('drawerCountBadge');
    const viewVisualBtn = document.getElementById('viewVisualBtn');
    const viewCompactBtn = document.getElementById('viewCompactBtn');

    // Viewport & Preview Elements
    const previewFrame = document.getElementById('previewFrame');
    const viewportStage = document.getElementById('viewportStage');
    const viewportDimensionLabel = document.getElementById('viewportDimensionLabel');
    const viewportDesktopBtn = document.getElementById('viewportDesktopBtn');
    const viewportTabletBtn = document.getElementById('viewportTabletBtn');
    const viewportMobileBtn = document.getElementById('viewportMobileBtn');

    // Theme Elements
    const themePresetSelect = document.getElementById('themePresetSelect');
    const customThemeToggle = document.getElementById('customThemeToggle');
    const customColorsControls = document.getElementById('customColorsControls');
    const bgColorInput = document.getElementById('bgColor');
    const textColorInput = document.getElementById('textColor');
    const accentColorInput = document.getElementById('accentColor');

    // Sidebar 3-Tab Elements
    const tabElementsBtn = document.getElementById('tabElementsBtn');
    const tabSectionsBtn = document.getElementById('tabSectionsBtn');
    const tabStylingBtn = document.getElementById('tabStylingBtn');
    const paneElements = document.getElementById('paneElements');
    const paneSections = document.getElementById('paneSections');
    const paneStyling = document.getElementById('paneStyling');
    const tabSectionsCount = document.getElementById('tabSectionsCount');

    // Creative Elements Sidebar Catalog Elements
    const elementsSearchInput = document.getElementById('elementsSearchInput');
    const clearElementsSearchBtn = document.getElementById('clearElementsSearchBtn');
    const elementsCategoryPills = document.getElementById('elementsCategoryPills');
    const elementsCardsGrid = document.getElementById('elementsCardsGrid');
    const elementsTotalCount = document.getElementById('elementsTotalCount');
    const elementsViewVisualBtn = document.getElementById('elementsViewVisualBtn');
    const elementsViewCompactBtn = document.getElementById('elementsViewCompactBtn');
    const elementsTargetBanner = document.getElementById('elementsTargetBanner');
    const elementsTargetSectionName = document.getElementById('elementsTargetSectionName');
    const elementsScopeToggle = document.querySelector('.elements-scope-toggle');

    // Elements Sidebar State
    let elementsCategory = 'all';
    let elementsSearch = '';
    let elementsScope = 'all'; // 'all' | 'widgets' | 'sections'
    let elementsVisualMode = true; // true = visual with live previews
    let activeTargetSectionId = null;

    // Styling Tab Elements
    const themePresetCards = document.getElementById('themePresetCards');
    const sidebarBgColor = document.getElementById('sidebarBgColor');
    const sidebarTextColor = document.getElementById('sidebarTextColor');
    const sidebarAccentColor = document.getElementById('sidebarAccentColor');

    // Canvas Context Menu & Freeform Element Edit Toolbar Elements
    const canvasContextMenu = document.getElementById('canvasContextMenu');
    const elementEditToolbar = document.getElementById('elementEditToolbar');
    const toolbarTypeBadge = document.getElementById('toolbarTypeBadge');
    const toolbarCloseBtn = document.getElementById('toolbarCloseBtn');

    // Toolbar Table Fields
    const toolbarGroupTable = document.getElementById('toolbarGroupTable');
    const toolbarTableTitle = document.getElementById('toolbarTableTitle');
    const toolbarTablePrice = document.getElementById('toolbarTablePrice');
    const toolbarTableWidth = document.getElementById('toolbarTableWidth');
    const toolbarTableHeight = document.getElementById('toolbarTableHeight');
    const toolbarTableFeatures = document.getElementById('toolbarTableFeatures');
    const toolbarTableCtaText = document.getElementById('toolbarTableCtaText');
    const toolbarTableCtaLink = document.getElementById('toolbarTableCtaLink');

    // Toolbar Card Fields
    const toolbarGroupCard = document.getElementById('toolbarGroupCard');
    const toolbarCardTitle = document.getElementById('toolbarCardTitle');
    const toolbarCardSubtitle = document.getElementById('toolbarCardSubtitle');
    const toolbarCardWidth = document.getElementById('toolbarCardWidth');
    const toolbarCardHeight = document.getElementById('toolbarCardHeight');
    const toolbarCardDesc = document.getElementById('toolbarCardDesc');
    const toolbarCardBadge = document.getElementById('toolbarCardBadge');
    const toolbarCardLinkText = document.getElementById('toolbarCardLinkText');

    // Toolbar Button Fields
    const toolbarGroupButton = document.getElementById('toolbarGroupButton');
    const toolbarBtnText = document.getElementById('toolbarBtnText');
    const toolbarBtnLink = document.getElementById('toolbarBtnLink');
    const toolbarBtnWidth = document.getElementById('toolbarBtnWidth');
    const toolbarBtnHeight = document.getElementById('toolbarBtnHeight');
    const toolbarBtnStylePills = document.getElementById('toolbarBtnStylePills');

    // Toolbar Image Fields
    const toolbarGroupImage = document.getElementById('toolbarGroupImage');
    const toolbarImgUrl = document.getElementById('toolbarImgUrl');
    const toolbarImgWidth = document.getElementById('toolbarImgWidth');
    const toolbarImgHeight = document.getElementById('toolbarImgHeight');
    const toolbarImgSizePills = document.getElementById('toolbarImgSizePills');

    // Toolbar Badge Fields
    const toolbarGroupBadge = document.getElementById('toolbarGroupBadge');
    const toolbarBadgeText = document.getElementById('toolbarBadgeText');
    const toolbarBadgeStylePills = document.getElementById('toolbarBadgeStylePills');
    const toolbarDeleteBtn = document.getElementById('toolbarDeleteBtn');

    // Drawer state
    let activeCategory = 'all';
    let searchQuery = '';

    // =========================================================================
    // History Stack Engine (Undo / Redo) & Continuous LocalStorage Persistence
    // =========================================================================
    const MAX_HISTORY = 50;
    const STORAGE_KEY = 'web_builder_state_v2';
    let historyStack = [];
    let historyIndex = -1;
    let isApplyingHistory = false;
    let currentViewport = 'desktop';
    let autoSaveTimer = null;

    function updateHistoryUI() {
      const currentUndoBtn = document.getElementById('undoBtn') || undoBtn;
      const currentRedoBtn = document.getElementById('redoBtn') || redoBtn;
      if (currentUndoBtn) {
        currentUndoBtn.disabled = historyIndex <= 0;
      }
      if (currentRedoBtn) {
        currentRedoBtn.disabled = historyIndex >= historyStack.length - 1;
      }
    }

    function saveStateToStorage() {
      if (typeof localStorage === 'undefined') return;
      try {
        const currentState = {
          stack: stackManager.getStack(),
          theme: stackManager.getState().theme || 'midnight-dark',
          customColors: { ...(stackManager.getState().customColors || {}) },
          viewport: currentViewport
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(currentState));
      } catch (err) {
        console.warn('Failed to save builder state to localStorage:', err);
      }
    }

    function scheduleAutoSave() {
      if (autoSaveTimer) clearTimeout(autoSaveTimer);
      autoSaveTimer = setTimeout(() => {
        saveStateToStorage();
      }, 200);
    }

    function pushHistorySnapshot() {
      if (isApplyingHistory) return;
      const currentSnapshot = {
        stack: JSON.parse(JSON.stringify(stackManager.getStack())),
        theme: stackManager.getState().theme || 'midnight-dark',
        customColors: { ...(stackManager.getState().customColors || {}) },
        viewport: currentViewport
      };

      // If current state matches last snapshot, skip duplicate
      if (historyStack.length > 0 && historyIndex >= 0 && historyIndex < historyStack.length) {
        const lastSnapshot = historyStack[historyIndex];
        if (JSON.stringify(lastSnapshot) === JSON.stringify(currentSnapshot)) {
          return;
        }
      }

      // Discards future redo states
      historyStack = historyStack.slice(0, historyIndex + 1);

      // Appends snapshot, trims to MAX_HISTORY
      historyStack.push(currentSnapshot);
      if (historyStack.length > MAX_HISTORY) {
        historyStack = historyStack.slice(historyStack.length - MAX_HISTORY);
      }
      historyIndex = historyStack.length - 1;
      updateHistoryUI();
    }

    function applyHistoryState(snapshot) {
      if (!snapshot) return;
      isApplyingHistory = true;

      try {
        // Restore stack
        if (typeof stackManager.setStack === 'function') {
          stackManager.setStack(snapshot.stack || []);
        } else {
          stackManager.clearStack();
          (snapshot.stack || []).forEach(sec => {
            stackManager.insertSection(stackManager.getStack().length, sec);
          });
        }

        // Restore theme & custom colors
        const theme = snapshot.theme || 'midnight-dark';
        stackManager.setTheme(theme);
        if (themePresetSelect) {
          themePresetSelect.value = theme;
        }

        const customColors = snapshot.customColors || {};
        stackManager.setCustomColors(customColors);

        if (theme === 'custom') {
          if (customColorsControls) customColorsControls.style.display = 'inline-flex';
          if (customThemeToggle) customThemeToggle.classList.add('is-active');
          if (bgColorInput && customColors.bg) bgColorInput.value = customColors.bg;
          if (textColorInput && customColors.text) textColorInput.value = customColors.text;
          if (accentColorInput && customColors.accent) accentColorInput.value = customColors.accent;
          applyDynamicTheme(customColors);
        } else {
          if (customColorsControls) customColorsControls.style.display = 'none';
          if (customThemeToggle) customThemeToggle.classList.remove('is-active');
          const presets = (window.Assembler && window.Assembler.THEME_PRESETS) || {};
          const preset = presets[theme];
          if (preset) {
            if (bgColorInput) bgColorInput.value = preset.bg;
            if (textColorInput) textColorInput.value = preset.text;
            if (accentColorInput) accentColorInput.value = preset.accent;
            applyDynamicTheme(preset);
          }
        }

        // Restore viewport
        if (snapshot.viewport) {
          setViewportMode(snapshot.viewport);
        }

        // Update UI and preview frame
        renderStackList();
        updatePreview();
      } finally {
        isApplyingHistory = false;
      }
    }

    function undoAction() {
      if (historyIndex > 0) {
        historyIndex--;
        applyHistoryState(historyStack[historyIndex]);
        saveStateToStorage();
        updateHistoryUI();
        showToast('Undo');
      }
    }

    function redoAction() {
      if (historyIndex < historyStack.length - 1) {
        historyIndex++;
        applyHistoryState(historyStack[historyIndex]);
        saveStateToStorage();
        updateHistoryUI();
        showToast('Redo');
      }
    }

    function handleHistoryKeydown(e) {
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable)) {
        return;
      }

      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      if (!isCtrlOrMeta) return;

      const key = (e.key || '').toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undoAction();
      } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
        e.preventDefault();
        redoAction();
      }
    }

    if (undoBtn) {
      undoBtn.addEventListener('click', undoAction);
    }
    if (redoBtn) {
      redoBtn.addEventListener('click', redoAction);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleHistoryKeydown);
    }

    // 3. Render Stack List
    function renderStackList() {
      if (!pageStackList) return;

      const stack = stackManager.getStack();
      if (stackCountBadge) {
        stackCountBadge.textContent = String(stack.length);
      }
      if (tabSectionsCount) {
        tabSectionsCount.textContent = String(stack.length);
      }

      // Remove existing item cards
      const existingCards = pageStackList.querySelectorAll('.stack-item-card');
      existingCards.forEach(card => card.remove());

      if (stack.length === 0) {
        if (stackEmptyPlaceholder) stackEmptyPlaceholder.style.display = 'flex';
        return;
      }

      if (stackEmptyPlaceholder) {
        stackEmptyPlaceholder.style.display = 'none';
      }

      // Drag and drop tracking
      let draggedId = null;

      stack.forEach((item, index) => {
        const feature = featuresMap.get(item.slug);
        const title = item.title || (feature ? (feature.title || feature.name) : item.slug);
        const category = item.category || (feature ? feature.category : 'Component');
        const sizing = item.sizing || { heightMode: 'auto', customHeight: 600, paddingY: 'none' };

        const singletonType = getSingletonType(item.slug, title, category);
        const singletonDef = singletonType ? LANDING_PAGE_SINGLETONS[singletonType] : null;
        const singletonLabel = singletonDef ? singletonDef.name : null;
        const isOptional = singletonDef && singletonDef.necessity === 'optional';
        const badgeClass = isOptional ? 'singleton-badge badge-optional' : 'singleton-badge badge-required';
        const badgeText = isOptional ? 'Need: Optional · 1 Only' : 'Need: Essential · 1 Only';

        const card = document.createElement('div');
        card.className = 'stack-item-card';
        card.setAttribute('role', 'listitem');
        card.setAttribute('data-section-id', item.id);
        card.setAttribute('draggable', 'true');

        card.innerHTML = `
          <div class="stack-item-top-row">
            <div class="stack-item-main">
              <span class="stack-item-order">${index + 1}</span>
              <div class="stack-item-info">
                <div class="stack-item-title" title="${escapeHtml(title)}">${escapeHtml(title)}</div>
                <div class="stack-item-category">
                  <span>${escapeHtml(category)}</span>
                  ${singletonDef ? `<span class="${badgeClass}" title="${isOptional ? 'Optional: Use when heavy 3D or assets need loading' : 'Essential component for landing pages'}">${badgeText}</span>` : ''}
                </div>
              </div>
            </div>
            <div class="stack-item-tools">
              ${singletonType === 'preloader' ? `
                <button type="button" class="stack-tool-btn btn-replay" title="Replay Preloader Intro Animation" aria-label="Replay preloader animation">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                </button>
              ` : `
                <button type="button" class="stack-tool-btn btn-sizing" title="Adjust Sizing" aria-label="Adjust section sizing">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 3L3 21"></path>
                    <path d="M14 3h7v7"></path>
                    <path d="M10 21H3v-7"></path>
                  </svg>
                </button>
              `}
              <button type="button" class="stack-tool-btn btn-move-up" title="Move Up" aria-label="Move section up" ${index === 0 ? 'disabled' : ''}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="18 15 12 9 6 15"></polyline>
                </svg>
              </button>
              <button type="button" class="stack-tool-btn btn-move-down" title="Move Down" aria-label="Move section down" ${index === stack.length - 1 ? 'disabled' : ''}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
              <button type="button" class="stack-tool-btn btn-duplicate ${singletonType ? 'is-disabled' : ''}" title="${singletonType ? `Landing page can only have one ${singletonLabel}` : 'Duplicate Section'}" aria-label="Duplicate section" ${singletonType ? 'disabled' : ''}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </button>
              <button type="button" class="stack-tool-btn btn-remove" title="Remove Section" aria-label="Remove section">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          </div>
          <div class="stack-item-sizing-drawer" style="display: none;">
            <div class="sizing-row">
              <span class="sizing-label">Height:</span>
              <div class="sizing-pills height-mode-pills">
                <button type="button" class="sizing-pill ${sizing.heightMode === 'auto' ? 'is-active' : ''}" data-mode="auto">Auto</button>
                <button type="button" class="sizing-pill ${sizing.heightMode === 'screen' ? 'is-active' : ''}" data-mode="screen">100vh</button>
                <button type="button" class="sizing-pill ${sizing.heightMode === 'custom' ? 'is-active' : ''}" data-mode="custom">Custom</button>
              </div>
            </div>
            <div class="sizing-row custom-height-row" style="${sizing.heightMode === 'custom' ? 'display:flex;' : 'display:none;'}">
              <span class="sizing-label">Height (px):</span>
              <input type="range" class="custom-height-slider" min="200" max="1400" step="20" value="${sizing.customHeight || 600}" />
              <span class="custom-height-val">${sizing.customHeight || 600}px</span>
            </div>
            <div class="sizing-row">
              <span class="sizing-label">Padding:</span>
              <div class="sizing-pills padding-pills">
                <button type="button" class="sizing-pill ${sizing.paddingY === 'none' ? 'is-active' : ''}" data-pad="none">0px</button>
                <button type="button" class="sizing-pill ${sizing.paddingY === 'compact' ? 'is-active' : ''}" data-pad="compact">32px</button>
                <button type="button" class="sizing-pill ${sizing.paddingY === 'medium' ? 'is-active' : ''}" data-pad="medium">64px</button>
                <button type="button" class="sizing-pill ${sizing.paddingY === 'large' ? 'is-active' : ''}" data-pad="large">120px</button>
              </div>
            </div>
          </div>
        `;

        // Wire Action Buttons
        const sizingBtn = card.querySelector('.btn-sizing');
        const sizingDrawer = card.querySelector('.stack-item-sizing-drawer');
        if (sizingBtn && sizingDrawer) {
          sizingBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isHidden = sizingDrawer.style.display === 'none';
            sizingDrawer.style.display = isHidden ? 'flex' : 'none';
            sizingBtn.classList.toggle('is-active', isHidden);
          });
        }

        // Height Mode Pills
        const heightPills = card.querySelectorAll('.height-mode-pills .sizing-pill');
        const customHeightRow = card.querySelector('.custom-height-row');
        heightPills.forEach(pill => {
          pill.addEventListener('click', (e) => {
            e.stopPropagation();
            const mode = pill.dataset.mode;
            heightPills.forEach(p => p.classList.remove('is-active'));
            pill.classList.add('is-active');
            if (customHeightRow) customHeightRow.style.display = (mode === 'custom') ? 'flex' : 'none';
            stackManager.updateSectionSizing(item.id, { heightMode: mode });
          });
        });

        // Custom Height Slider
        const slider = card.querySelector('.custom-height-slider');
        const valLabel = card.querySelector('.custom-height-val');
        if (slider && valLabel) {
          slider.addEventListener('input', (e) => {
            const val = e.target.value;
            valLabel.textContent = `${val}px`;
            try {
              const doc = previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document);
              const secEl = doc.getElementById(item.id);
              if (secEl) {
                secEl.style.height = `${val}px`;
                secEl.style.minHeight = `${val}px`;
                secEl.style.overflow = 'hidden';
                const contentEl = secEl.querySelector(':scope > div[id^="root-"], :scope > :first-child:not(.section-overlay-layer):not(.section-resize-handle)');
                if (contentEl) {
                  contentEl.style.flex = '1 1 auto';
                  contentEl.style.height = '100%';
                  contentEl.style.minHeight = '100%';
                  if (contentEl.firstElementChild) {
                    contentEl.firstElementChild.style.flex = '1 1 auto';
                    contentEl.firstElementChild.style.height = '100%';
                    contentEl.firstElementChild.style.minHeight = '100%';
                  }
                }
              }
            } catch (_) {}
          });
          slider.addEventListener('change', (e) => {
            stackManager.updateSectionSizing(item.id, { heightMode: 'custom', customHeight: Number(e.target.value) });
          });
        }

        // Padding Pills
        const paddingPills = card.querySelectorAll('.padding-pills .sizing-pill');
        paddingPills.forEach(pill => {
          pill.addEventListener('click', (e) => {
            e.stopPropagation();
            const pad = pill.dataset.pad;
            paddingPills.forEach(p => p.classList.remove('is-active'));
            pill.classList.add('is-active');
            stackManager.updateSectionSizing(item.id, { paddingY: pad });
          });
        });

        const moveUpBtn = card.querySelector('.btn-move-up');
        if (moveUpBtn) {
          moveUpBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            stackManager.moveSection(item.id, -1);
          });
        }

        const moveDownBtn = card.querySelector('.btn-move-down');
        if (moveDownBtn) {
          moveDownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            stackManager.moveSection(item.id, 1);
          });
        }

        const replayBtn = card.querySelector('.btn-replay');
        if (replayBtn) {
          replayBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showToast('Running preloader intro animation...');
            preloaderForceReplay = true;
            forceFullPreviewReload = true;
            updatePreview();
          });
        }

        const duplicateBtn = card.querySelector('.btn-duplicate');
        if (duplicateBtn) {
          duplicateBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (singletonType) {
              showToast(`A landing page can only have one ${singletonLabel}.`);
              return;
            }
            stackManager.duplicateSection(item.id);
            showToast(`Duplicated "${title}"`);
          });
        }

        const removeBtn = card.querySelector('.btn-remove');
        if (removeBtn) {
          removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            stackManager.removeSection(item.id);
            showToast(`Removed "${title}"`);
          });
        }

        // Drag and drop reordering
        card.addEventListener('dragstart', (e) => {
          draggedId = item.id;
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', item.id);
          card.style.opacity = '0.5';
        });

        card.addEventListener('dragend', () => {
          card.style.opacity = '1';
          const cards = pageStackList.querySelectorAll('.stack-item-card');
          cards.forEach(c => c.classList.remove('is-drag-over'));
        });

        card.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          card.classList.add('is-drag-over');
        });

        card.addEventListener('dragleave', () => {
          card.classList.remove('is-drag-over');
        });

        card.addEventListener('drop', (e) => {
          e.preventDefault();
          card.classList.remove('is-drag-over');
          const sourceId = e.dataTransfer.getData('text/plain') || draggedId;
          if (sourceId && sourceId !== item.id) {
            const currentStack = stackManager.getStack();
            const fromIndex = currentStack.findIndex(s => s.id === sourceId);
            const toIndex = currentStack.findIndex(s => s.id === item.id);
            if (fromIndex !== -1 && toIndex !== -1) {
              stackManager.reorderStack(fromIndex, toIndex);
            }
          }
        });

        // Click card to select as target section for widgets
        card.addEventListener('click', () => {
          setActiveSection(item.id);
        });

        pageStackList.appendChild(card);
      });

      updateActiveSectionUI();
    }

    // Listen for section clicks inside live preview frame
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'SECTION_CLICKED' && event.data.sectionId) {
        setActiveSection(event.data.sectionId);
      }
    });

    /**
     * Propagates theme variables to the live preview iframe.
     * Uses postMessage and direct DOM property injection for instantaneous 60fps color updates without reload flicker.
     */
    function applyDynamicTheme(themeConfig) {
      const theme = (window.Assembler && typeof window.Assembler.resolveTheme === 'function')
        ? window.Assembler.resolveTheme(themeConfig)
        : themeConfig;

      if (!theme) return;

      // 1. PostMessage to iframe for dynamic zero-flicker update
      if (previewFrame && previewFrame.contentWindow) {
        try {
          previewFrame.contentWindow.postMessage({
            type: 'UPDATE_THEME',
            theme: theme
          }, '*');
        } catch (_) {}
      }

      // 2. Direct style property update on iframe documentElement if same-origin accessible
      try {
        const doc = previewFrame && (previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document));
        if (doc) {
          if (window.Assembler && typeof window.Assembler.applyThemeToDocument === 'function') {
            window.Assembler.applyThemeToDocument(doc, theme);
          } else if (doc.documentElement) {
            if (theme.bg) {
              doc.documentElement.style.setProperty('--preview-bg', theme.bg);
              doc.querySelectorAll('.page-section').forEach(s => s.style.backgroundColor = theme.bg);
            }
            if (theme.text) {
              doc.documentElement.style.setProperty('--preview-text', theme.text);
              doc.querySelectorAll('.page-section').forEach(s => s.style.color = theme.text);
            }
            if (theme.accent) doc.documentElement.style.setProperty('--preview-accent', theme.accent);
            if (theme.cardBg) doc.documentElement.style.setProperty('--preview-card-bg', theme.cardBg);
            if (theme.border) doc.documentElement.style.setProperty('--preview-border', theme.border);
          }
        }
      } catch (_) {}
    }

    // 4. Update Live Preview Iframe
    let isUpdatingPreview = false;
    let pendingPreviewUpdate = false;

    async function updatePreview() {
      if (!previewFrame) return;

      if (!window.Assembler || typeof window.Assembler.assemblePreviewDocument !== 'function') {
        return;
      }

      const state = stackManager.getState();
      const currentStack = state.stack;

      // Identify any sections whose source files need fetching
      const missingSlugs = currentStack
        .map(item => item.slug)
        .filter(slug => slug && !featureCache.has(slug));

      if (missingSlugs.length > 0) {
        if (isUpdatingPreview) {
          pendingPreviewUpdate = true;
          return;
        }
        isUpdatingPreview = true;
        try {
          await Promise.all(missingSlugs.map(slug => fetchFeatureFiles(slug)));
        } catch (err) {
          console.error('Error fetching feature files for preview:', err);
        } finally {
          isUpdatingPreview = false;
          if (pendingPreviewUpdate) {
            pendingPreviewUpdate = false;
            updatePreview();
            return;
          }
        }
      }

      // Re-read latest state and assemble preview document
      const latestState = stackManager.getState();
      const themeConfig = latestState.theme === 'custom' ? latestState.customColors : latestState.theme;

      // Preloader play-state tracking:
      // Requirement: Play ONCE when newly added; suppressed on subsequent section additions/modifications
      // and runs again only when user explicitly runs it via the Replay (▶) button.
      const preloaderSection = latestState.stack.find(s => {
        const slug = s.slug || '';
        const cat = s.category || '';
        return slug.includes('preloader') || cat.toLowerCase().includes('preloader');
      });

      let suppressPreloader = false;
      if (preloaderSection) {
        if (preloaderForceReplay) {
          // Explicitly triggered via Run/Replay button
          suppressPreloader = false;
          preloaderForceReplay = false;
          playedPreloaderId = preloaderSection.id;
        } else if (playedPreloaderId === preloaderSection.id) {
          // Already played: suppress on subsequent section additions/modifications
          suppressPreloader = true;
        } else {
          // Newly added preloader: play once
          suppressPreloader = false;
          playedPreloaderId = preloaderSection.id;
        }
      } else {
        playedPreloaderId = null;
        preloaderForceReplay = false;
      }

      // Only sizing and overlay elements are patched in place; anything else (sections, their
      // source, theme, preloader state) changes this key and triggers a full reload.
      // Yield so callers can set pendingSelectedElement right after the state change that notified us
      await Promise.resolve();
      const structureKey = JSON.stringify({
        theme: themeConfig,
        suppressPreloader,
        stack: latestState.stack.map(({ elements, sizing, ...rest }) => rest)
      });
      const canPatch = !forceFullPreviewReload && structureKey === lastPreviewStructureKey;
      forceFullPreviewReload = false;
      if (canPatch && patchPreviewInPlace(latestState.stack)) {
        return;
      }

      const assembledHtml = window.Assembler.assemblePreviewDocument(
        latestState.stack,
        themeConfig,
        featuresData,
        { suppressPreloader }
      );

      lastPreviewStructureKey = structureKey;
      previewFrame.srcdoc = assembledHtml;
    }

    let lastPreviewStructureKey = null;
    let forceFullPreviewReload = false;
    const SECTION_SIZING_PROPS = ['min-height', 'height', 'overflow', 'padding-top', 'padding-bottom'];

    /**
     * Applies sizing and overlay-element changes directly to the loaded preview document, so
     * section scripts, animations and scroll position survive. Returns false when the preview
     * is not ready or out of sync, in which case the caller does a full reload.
     */
    function patchPreviewInPlace(stack) {
      let doc;
      try {
        doc = previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document);
      } catch (_) {
        return false;
      }
      if (!doc || doc.readyState !== 'complete' || stack.length === 0) return false;

      const sectionEls = stack.map(sec => doc.getElementById(sec.id));
      if (sectionEls.some(el => !el || !el.classList.contains('page-section'))) return false;

      stack.forEach((sec, i) => {
        const secEl = sectionEls[i];
        if (!secEl.classList.contains('is-preloader')) {
          SECTION_SIZING_PROPS.forEach(prop => secEl.style.removeProperty(prop));
          window.Assembler.computeSectionSizingStyles(sec.sizing).split(';').forEach(decl => {
            const idx = decl.indexOf(':');
            if (idx > 0) secEl.style.setProperty(decl.slice(0, idx).trim(), decl.slice(idx + 1).trim());
          });
        }

        const overlayHtml = window.Assembler.renderSectionOverlayHtml(sec.elements);
        const layer = secEl.querySelector(':scope > .section-overlay-layer');
        if (!overlayHtml) {
          if (layer) layer.remove();
        } else {
          const tpl = doc.createElement('template');
          tpl.innerHTML = overlayHtml.trim();
          const fresh = tpl.content.firstElementChild;
          if (layer) {
            layer.replaceWith(fresh);
          } else {
            secEl.insertBefore(fresh, secEl.querySelector(':scope > .section-resize-handle'));
          }
        }
      });

      // Restore selection on the rebuilt overlay (mirrors the iframe load handler)
      if (pendingSelectedElement) {
        const el = doc.getElementById(pendingSelectedElement.elementId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          selectCanvasElement(pendingSelectedElement.sectionId, pendingSelectedElement.elementId);
          closeToolbarPopup();
        }
        pendingSelectedElement = null;
      } else if (selectedElementState) {
        const el = doc.getElementById(selectedElementState.elementId);
        if (el) {
          el.classList.add('is-selected');
          ensureResizeHandles(el);
          if (elementEditToolbar && elementEditToolbar.style.display !== 'none') updateToolbarPosition();
        } else {
          clearElementSelection();
        }
      }
      return true;
    }

    // ==========================================================================
    // Freeform Canvas Overlay Elements & Context Menu Controller
    // ==========================================================================
    let activeCanvasContext = null; // { sectionId, xPct, yPct }
    let selectedElementState = null; // { sectionId, elementId, type }
    let pendingSelectedElement = null; // { sectionId, elementId }
    let pendingSelectedSection = null; // sectionId
    let currentDragPayload = null; // In-memory drag payload for DnD

    function hideContextMenu() {
      if (canvasContextMenu) {
        canvasContextMenu.style.display = 'none';
      }
      activeCanvasContext = null;
    }

    function closeToolbarPopup() {
      if (elementEditToolbar) {
        elementEditToolbar.style.display = 'none';
      }
    }

    function clearElementSelection() {
      closeToolbarPopup();
      selectedElementState = null;
      try {
        const doc = previewFrame && (previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document));
        if (doc) {
          doc.querySelectorAll('.canvas-element.is-selected').forEach(el => el.classList.remove('is-selected'));
        }
      } catch (_) {}
    }

    function hideEditToolbar() {
      clearElementSelection();
    }

    function selectCanvasElement(sectionId, elementId, showHandles = true) {
      try {
        const doc = previewFrame && (previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document));
        if (!doc) return;
        doc.querySelectorAll('.canvas-element.is-selected').forEach(el => el.classList.remove('is-selected'));
        const el = doc.getElementById(elementId);
        if (el) {
          el.classList.add('is-selected');
          if (showHandles) ensureResizeHandles(el);
          const elements = stackManager.getSectionElements(sectionId);
          const elData = elements.find(e => e.id === elementId);
          selectedElementState = { sectionId, elementId, type: elData ? elData.type : 'button' };
        }
      } catch (_) {}
    }

    function updateToolbarPosition() {
      if (!selectedElementState || !elementEditToolbar || elementEditToolbar.style.display === 'none') return;
      try {
        const doc = previewFrame && (previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document));
        if (!doc) return;
        const el = doc.getElementById(selectedElementState.elementId);
        if (!el) {
          closeToolbarPopup();
          return;
        }
        const elRect = el.getBoundingClientRect();
        const frameRect = previewFrame.getBoundingClientRect();

        const left = frameRect.left + elRect.left + (elRect.width / 2) - 140;
        let top = frameRect.top + elRect.top - 240;

        if (top < 70) {
          top = frameRect.top + elRect.bottom + 20;
        }

        const clampedLeft = Math.max(10, Math.min(window.innerWidth - 300, left));
        const clampedTop = Math.max(70, Math.min(window.innerHeight - 260, top));

        elementEditToolbar.style.left = `${clampedLeft}px`;
        elementEditToolbar.style.top = `${clampedTop}px`;
      } catch (_) {}
    }

    function ensureResizeHandles(elementEl) {
      if (!elementEl || elementEl.querySelector('.el-resize-handle')) return;
      const positions = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
      positions.forEach(pos => {
        const handle = elementEl.ownerDocument.createElement('div');
        handle.className = `el-resize-handle handle-${pos}`;
        handle.dataset.handle = pos;
        elementEl.appendChild(handle);
      });
    }

    function openEditToolbar(sectionId, elementId) {
      const elements = stackManager.getSectionElements(sectionId);
      const elData = elements.find(e => e.id === elementId);
      if (!elData) return;

      selectCanvasElement(sectionId, elementId, true);
      if (toolbarTypeBadge) {
        toolbarTypeBadge.textContent = elData.type.toUpperCase();
      }

      if (toolbarGroupTable) toolbarGroupTable.style.display = elData.type === 'table' ? 'flex' : 'none';
      if (toolbarGroupCard) toolbarGroupCard.style.display = (elData.type === 'card' || elData.type === 'file-card' || elData.type === 'folder-card') ? 'flex' : 'none';
      if (toolbarGroupButton) toolbarGroupButton.style.display = elData.type === 'button' ? 'flex' : 'none';
      if (toolbarGroupImage) toolbarGroupImage.style.display = elData.type === 'image' ? 'flex' : 'none';
      if (toolbarGroupBadge) toolbarGroupBadge.style.display = elData.type === 'badge' ? 'flex' : 'none';

      // Measure current rendered element dimensions if not explicitly set
      let curWidth = (elData.width !== undefined && elData.width !== null) ? parseInt(elData.width, 10) : '';
      let curHeight = (elData.height !== undefined && elData.height !== null) ? parseInt(elData.height, 10) : '';
      try {
        const doc = previewFrame && (previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document));
        if (doc) {
          const el = doc.getElementById(elementId);
          if (el) {
            ensureResizeHandles(el);
            const r = el.getBoundingClientRect();
            if (!curWidth) curWidth = Math.round(r.width);
            if (!curHeight) curHeight = Math.round(r.height);
          }
        }
      } catch (_) {}

      if (toolbarTableWidth) toolbarTableWidth.value = curWidth || '';
      if (toolbarTableHeight) toolbarTableHeight.value = curHeight || '';
      if (toolbarCardWidth) toolbarCardWidth.value = curWidth || '';
      if (toolbarCardHeight) toolbarCardHeight.value = curHeight || '';
      if (toolbarBtnWidth) toolbarBtnWidth.value = curWidth || '';
      if (toolbarBtnHeight) toolbarBtnHeight.value = curHeight || '';
      if (toolbarImgWidth) toolbarImgWidth.value = curWidth || '';
      if (toolbarImgHeight) toolbarImgHeight.value = curHeight || '';

      if (elData.type === 'table') {
        if (toolbarTableTitle) toolbarTableTitle.value = elData.title || '';
        if (toolbarTablePrice) toolbarTablePrice.value = elData.price || '';
        if (toolbarTableFeatures) toolbarTableFeatures.value = Array.isArray(elData.features) ? elData.features.join('\n') : '';
        if (toolbarTableCtaText) toolbarTableCtaText.value = elData.ctaText || 'Get Started';
        if (toolbarTableCtaLink) toolbarTableCtaLink.value = elData.ctaLink || '#';
      } else if (elData.type === 'card' || elData.type === 'file-card' || elData.type === 'folder-card') {
        if (toolbarCardTitle) toolbarCardTitle.value = elData.title || elData.fileName || elData.label || '';
        if (toolbarCardSubtitle) toolbarCardSubtitle.value = elData.subtitle || elData.author || elData.fileSize || elData.itemCount || '';
        if (toolbarCardDesc) toolbarCardDesc.value = elData.description || '';
        if (toolbarCardBadge) toolbarCardBadge.value = elData.badgeText || elData.badge || '';
        if (toolbarCardLinkText) toolbarCardLinkText.value = elData.ctaText || 'Learn More →';
      } else if (elData.type === 'button') {
        if (toolbarBtnText) toolbarBtnText.value = elData.text || '';
        if (toolbarBtnLink) toolbarBtnLink.value = elData.link || '#';
        if (toolbarBtnStylePills) {
          toolbarBtnStylePills.querySelectorAll('.style-pill').forEach(pill => {
            pill.classList.toggle('is-active', pill.dataset.style === (elData.style || 'solid'));
          });
        }
      } else if (elData.type === 'image') {
        if (toolbarImgUrl) toolbarImgUrl.value = elData.imageUrl || '';
        if (toolbarImgSizePills) {
          toolbarImgSizePills.querySelectorAll('.size-pill').forEach(pill => {
            pill.classList.toggle('is-active', pill.dataset.size === (elData.imageSize || 'medium'));
          });
        }
      } else if (elData.type === 'badge') {
        if (toolbarBadgeText) toolbarBadgeText.value = elData.text || '';
        if (toolbarBadgeStylePills) {
          toolbarBadgeStylePills.querySelectorAll('.style-pill').forEach(pill => {
            pill.classList.toggle('is-active', pill.dataset.style === (elData.badgeStyle || elData.style || 'pulse'));
          });
        }
      }

      elementEditToolbar.style.display = 'flex';
      updateToolbarPosition();
    }

    function focusElementPrimaryText(sectionId, elementId) {
      if (!sectionId || !elementId) return;
      openEditToolbar(sectionId, elementId);

      const elements = stackManager.getSectionElements(sectionId);
      const elData = elements.find(e => e.id === elementId);
      const elType = elData ? elData.type : (selectedElementState ? selectedElementState.type : null);

      setTimeout(() => {
        let inputToFocus = null;
        if (elType === 'button') {
          inputToFocus = toolbarBtnText;
        } else if (elType === 'card' || elType === 'file-card' || elType === 'folder-card') {
          inputToFocus = toolbarCardTitle;
        } else if (elType === 'table') {
          inputToFocus = toolbarTableTitle;
        } else if (elType === 'badge') {
          inputToFocus = toolbarBadgeText;
        } else if (elType === 'image') {
          inputToFocus = toolbarImgUrl;
        } else {
          inputToFocus = toolbarCardTitle || toolbarBtnText;
        }

        if (inputToFocus) {
          inputToFocus.focus();
          if (typeof inputToFocus.select === 'function') {
            inputToFocus.select();
          }
        }
      }, 50);

      // Brief visual focus ring on canvas element in preview frame
      try {
        const doc = previewFrame && (previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document));
        if (doc) {
          const el = doc.getElementById(elementId);
          if (el) {
            doc.querySelectorAll('.canvas-element.is-selected').forEach(e => e.classList.remove('is-selected'));
            el.classList.add('is-selected');
            ensureResizeHandles(el);
            el.style.outline = '2px solid #a855f7';
            el.style.outlineOffset = '2px';
            setTimeout(() => {
              el.style.outline = '';
              el.style.outlineOffset = '';
            }, 1200);
          }
        }
      } catch (_) {}

      showToast('Editing element text');
    }

    // Toolbar Input Event Listeners
    if (toolbarCloseBtn) {
      toolbarCloseBtn.addEventListener('click', hideEditToolbar);
    }

    // Table Toolbar Inputs
    if (toolbarTableTitle) {
      toolbarTableTitle.addEventListener('input', (e) => {
        if (!selectedElementState) return;
        const val = e.target.value;
        stackManager.updateElement(selectedElementState.sectionId, selectedElementState.elementId, { title: val }, true);
        try {
          const doc = previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document);
          const el = doc.getElementById(selectedElementState.elementId);
          if (el) {
            const titleEl = el.querySelector('.pricing-card-title');
            if (titleEl) titleEl.textContent = val;
          }
        } catch (_) {}
      });
    }

    if (toolbarTablePrice) {
      toolbarTablePrice.addEventListener('input', (e) => {
        if (!selectedElementState) return;
        const val = e.target.value;
        stackManager.updateElement(selectedElementState.sectionId, selectedElementState.elementId, { price: val }, true);
        try {
          const doc = previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document);
          const el = doc.getElementById(selectedElementState.elementId);
          if (el) {
            const priceEl = el.querySelector('.pricing-card-price');
            if (priceEl) priceEl.textContent = val;
          }
        } catch (_) {}
      });
    }

    if (toolbarTableFeatures) {
      toolbarTableFeatures.addEventListener('input', (e) => {
        if (!selectedElementState) return;
        const features = e.target.value.split('\n').map(s => s.trim()).filter(Boolean);
        stackManager.updateElement(selectedElementState.sectionId, selectedElementState.elementId, { features }, true);
        try {
          const doc = previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document);
          const el = doc.getElementById(selectedElementState.elementId);
          if (el) {
            const listEl = el.querySelector('.pricing-card-features');
            if (listEl) {
              listEl.innerHTML = features.map(f => `<li><span class="feature-check">✓</span> ${escapeHtml(f)}</li>`).join('');
            }
          }
        } catch (_) {}
      });
    }

    if (toolbarTableCtaText) {
      toolbarTableCtaText.addEventListener('input', (e) => {
        if (!selectedElementState) return;
        const val = e.target.value;
        stackManager.updateElement(selectedElementState.sectionId, selectedElementState.elementId, { ctaText: val }, true);
        try {
          const doc = previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document);
          const el = doc.getElementById(selectedElementState.elementId);
          if (el) {
            const ctaEl = el.querySelector('.pricing-card-cta');
            if (ctaEl) ctaEl.textContent = val;
          }
        } catch (_) {}
      });
    }

    if (toolbarTableCtaLink) {
      toolbarTableCtaLink.addEventListener('input', (e) => {
        if (!selectedElementState) return;
        const val = e.target.value;
        stackManager.updateElement(selectedElementState.sectionId, selectedElementState.elementId, { ctaLink: val }, true);
        try {
          const doc = previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document);
          const el = doc.getElementById(selectedElementState.elementId);
          if (el) {
            const ctaEl = el.querySelector('.pricing-card-cta');
            if (ctaEl) ctaEl.href = val;
          }
        } catch (_) {}
      });
    }

    // Card Toolbar Inputs
    if (toolbarCardTitle) {
      toolbarCardTitle.addEventListener('input', (e) => {
        if (!selectedElementState) return;
        const val = e.target.value;
        const updates = { title: val, fileName: val, label: val };
        stackManager.updateElement(selectedElementState.sectionId, selectedElementState.elementId, updates, true);
        try {
          const doc = previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document);
          const el = doc.getElementById(selectedElementState.elementId);
          if (el) {
            const titleEl = el.querySelector('.feature-card-title') ||
                            el.querySelector('.testimonial-name') ||
                            el.querySelector('.file-card-name') ||
                            el.querySelector('.folder-label');
            if (titleEl) {
              titleEl.textContent = val;
              if (titleEl.hasAttribute('title')) titleEl.setAttribute('title', val);
            }
          }
        } catch (_) {}
      });
    }

    if (toolbarCardSubtitle) {
      toolbarCardSubtitle.addEventListener('input', (e) => {
        if (!selectedElementState) return;
        const val = e.target.value;
        const updates = { subtitle: val, author: val, fileSize: val, itemCount: val };
        stackManager.updateElement(selectedElementState.sectionId, selectedElementState.elementId, updates, true);
        try {
          const doc = previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document);
          const el = doc.getElementById(selectedElementState.elementId);
          if (el) {
            const subEl = el.querySelector('.feature-card-subtitle') ||
                          el.querySelector('.testimonial-role') ||
                          el.querySelector('.file-card-size') ||
                          el.querySelector('.folder-item-count');
            if (subEl) subEl.textContent = val;
          }
        } catch (_) {}
      });
    }

    if (toolbarCardDesc) {
      toolbarCardDesc.addEventListener('input', (e) => {
        if (!selectedElementState) return;
        const val = e.target.value;
        stackManager.updateElement(selectedElementState.sectionId, selectedElementState.elementId, { description: val }, true);
        try {
          const doc = previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document);
          const el = doc.getElementById(selectedElementState.elementId);
          if (el) {
            const descEl = el.querySelector('.feature-card-desc') || el.querySelector('.testimonial-quote');
            if (descEl) descEl.textContent = val;
          }
        } catch (_) {}
      });
    }

    if (toolbarCardBadge) {
      toolbarCardBadge.addEventListener('input', (e) => {
        if (!selectedElementState) return;
        const val = e.target.value;
        const updates = { badgeText: val, badge: val };
        stackManager.updateElement(selectedElementState.sectionId, selectedElementState.elementId, updates, true);
        try {
          const doc = previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document);
          const el = doc.getElementById(selectedElementState.elementId);
          if (el) {
            let badgeEl = el.querySelector('.card-badge') ||
                          el.querySelector('.file-badge') ||
                          el.querySelector('.folder-tab-badge');
            if (!badgeEl && val) {
              const header = el.querySelector('.feature-card-header');
              if (header) {
                badgeEl = document.createElement('span');
                badgeEl.className = 'card-badge';
                header.appendChild(badgeEl);
              }
            }
            if (badgeEl) {
              badgeEl.textContent = val;
              badgeEl.style.display = val ? '' : 'none';
            }
          }
        } catch (_) {}
      });
    }

    // Button Toolbar Inputs
    if (toolbarBtnText) {
      toolbarBtnText.addEventListener('input', (e) => {
        if (!selectedElementState) return;
        const val = e.target.value;
        stackManager.updateElement(selectedElementState.sectionId, selectedElementState.elementId, { text: val }, true);
        try {
          const doc = previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document);
          const el = doc.getElementById(selectedElementState.elementId);
          if (el) {
            const link = el.querySelector('.canvas-btn-link .btn-label') || el.querySelector('.canvas-btn-link');
            if (link) link.textContent = val;
          }
        } catch (_) {}
      });
    }

    if (toolbarBtnLink) {
      toolbarBtnLink.addEventListener('input', (e) => {
        if (!selectedElementState) return;
        const val = e.target.value;
        stackManager.updateElement(selectedElementState.sectionId, selectedElementState.elementId, { link: val }, true);
        try {
          const doc = previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document);
          const el = doc.getElementById(selectedElementState.elementId);
          if (el) {
            const link = el.querySelector('.canvas-btn-link');
            if (link) link.href = val;
          }
        } catch (_) {}
      });
    }

    if (toolbarBtnStylePills) {
      toolbarBtnStylePills.addEventListener('click', (e) => {
        const pill = e.target.closest('.style-pill');
        if (!pill || !selectedElementState) return;
        const style = pill.dataset.style;
        toolbarBtnStylePills.querySelectorAll('.style-pill').forEach(p => p.classList.remove('is-active'));
        pill.classList.add('is-active');

        stackManager.updateElement(selectedElementState.sectionId, selectedElementState.elementId, { style }, true);
        try {
          const doc = previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document);
          const el = doc.getElementById(selectedElementState.elementId);
          if (el) {
            el.className = el.className.replace(/btn-style-[a-z]+/g, '').trim() + ` btn-style-${style}`;
          }
        } catch (_) {}
      });
    }

    if (toolbarImgUrl) {
      toolbarImgUrl.addEventListener('input', (e) => {
        if (!selectedElementState) return;
        const val = e.target.value;
        stackManager.updateElement(selectedElementState.sectionId, selectedElementState.elementId, { imageUrl: val }, true);
        try {
          const doc = previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document);
          const el = doc.getElementById(selectedElementState.elementId);
          if (el) {
            const img = el.querySelector('img');
            if (img) img.src = val;
          }
        } catch (_) {}
      });
    }

    if (toolbarImgSizePills) {
      toolbarImgSizePills.addEventListener('click', (e) => {
        const pill = e.target.closest('.size-pill');
        if (!pill || !selectedElementState) return;
        const size = pill.dataset.size;
        toolbarImgSizePills.querySelectorAll('.size-pill').forEach(p => p.classList.remove('is-active'));
        pill.classList.add('is-active');

        stackManager.updateElement(selectedElementState.sectionId, selectedElementState.elementId, { imageSize: size }, true);
        try {
          const doc = previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document);
          const el = doc.getElementById(selectedElementState.elementId);
          if (el) {
            el.className = el.className.replace(/img-size-[a-z]+/g, '').trim() + ` img-size-${size}`;
          }
        } catch (_) {}
        updateToolbarPosition();
      });
    }

    if (toolbarBadgeText) {
      toolbarBadgeText.addEventListener('input', (e) => {
        if (!selectedElementState) return;
        const val = e.target.value;
        stackManager.updateElement(selectedElementState.sectionId, selectedElementState.elementId, { text: val }, true);
        try {
          const doc = previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document);
          const el = doc.getElementById(selectedElementState.elementId);
          if (el) {
            const badgeSpan = el.querySelector('.badge-text');
            if (badgeSpan) badgeSpan.textContent = val;
          }
        } catch (_) {}
      });
    }

    if (toolbarBadgeStylePills) {
      toolbarBadgeStylePills.addEventListener('click', (e) => {
        const pill = e.target.closest('.style-pill');
        if (!pill || !selectedElementState) return;
        const style = pill.dataset.style;
        toolbarBadgeStylePills.querySelectorAll('.style-pill').forEach(p => p.classList.remove('is-active'));
        pill.classList.add('is-active');

        stackManager.updateElement(selectedElementState.sectionId, selectedElementState.elementId, { badgeStyle: style }, true);
        try {
          const doc = previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document);
          const el = doc.getElementById(selectedElementState.elementId);
          if (el) {
            el.className = el.className.replace(/badge-style-[a-z]+/g, '').trim() + ` badge-style-${style}`;
          }
        } catch (_) {}
      });
    }

    // Wire Width and Height dimension input listeners
    function wireDimensionInput(inputEl, property) {
      if (!inputEl) return;
      inputEl.addEventListener('input', (e) => {
        if (!selectedElementState) return;
        const val = parseInt(e.target.value, 10);
        const minVal = property === 'width' ? 30 : 20;
        const updates = {};
        if (!isNaN(val) && val > 0) {
          updates[property] = Math.max(minVal, val);
        } else {
          updates[property] = undefined;
        }
        stackManager.updateElement(selectedElementState.sectionId, selectedElementState.elementId, updates, true);
        try {
          const doc = previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document);
          const el = doc.getElementById(selectedElementState.elementId);
          if (el) {
            if (updates[property]) {
              el.style[property] = `${updates[property]}px`;
            } else {
              el.style[property] = '';
            }
          }
        } catch (_) {}
        updateToolbarPosition();
      });
    }

    wireDimensionInput(toolbarTableWidth, 'width');
    wireDimensionInput(toolbarTableHeight, 'height');
    wireDimensionInput(toolbarCardWidth, 'width');
    wireDimensionInput(toolbarCardHeight, 'height');
    wireDimensionInput(toolbarBtnWidth, 'width');
    wireDimensionInput(toolbarBtnHeight, 'height');
    wireDimensionInput(toolbarImgWidth, 'width');
    wireDimensionInput(toolbarImgHeight, 'height');

    if (toolbarDeleteBtn) {
      toolbarDeleteBtn.addEventListener('click', () => {
        if (!selectedElementState) return;
        const { sectionId, elementId } = selectedElementState;
        stackManager.removeElement(sectionId, elementId);
        hideEditToolbar();
        showToast('Element removed');
      });
    }

    // Context Menu Action Listeners
    if (canvasContextMenu) {
      canvasContextMenu.addEventListener('click', (e) => {
        const itemBtn = e.target.closest('.context-menu-item');
        if (!itemBtn) return;
        const action = itemBtn.dataset.action;

        if (action === 'edit-text') {
          hideContextMenu();
          const targetSectionId = (activeCanvasContext && activeCanvasContext.sectionId) || (selectedElementState && selectedElementState.sectionId);
          let targetElementId = selectedElementState ? selectedElementState.elementId : null;
          if (!targetElementId && targetSectionId) {
            const elements = stackManager.getSectionElements(targetSectionId);
            if (elements.length > 0) targetElementId = elements[elements.length - 1].id;
          }
          if (targetSectionId && targetElementId) {
            focusElementPrimaryText(targetSectionId, targetElementId);
          }
          return;
        }

        if (action === 'resize-element') {
          hideContextMenu();
          const targetSectionId = (activeCanvasContext && activeCanvasContext.sectionId) || (selectedElementState && selectedElementState.sectionId);
          let targetElementId = (activeCanvasContext && activeCanvasContext.elementId) || (selectedElementState ? selectedElementState.elementId : null);
          if (!targetElementId && targetSectionId) {
            const elements = stackManager.getSectionElements(targetSectionId);
            if (elements.length > 0) targetElementId = elements[elements.length - 1].id;
          }
          if (targetSectionId && targetElementId) {
            openEditToolbar(targetSectionId, targetElementId);
            setTimeout(() => {
              const elType = selectedElementState ? selectedElementState.type : null;
              if (elType === 'button' && toolbarBtnWidth) toolbarBtnWidth.focus();
              else if (elType === 'image' && toolbarImgWidth) toolbarImgWidth.focus();
              else if (elType === 'card' && toolbarCardWidth) toolbarCardWidth.focus();
              else if (elType === 'table' && toolbarTableWidth) toolbarTableWidth.focus();
              else if (toolbarBtnWidth) toolbarBtnWidth.focus();
            }, 60);
          }
          return;
        }

        if (action === 'duplicate-element') {
          hideContextMenu();
          const targetSectionId = (activeCanvasContext && activeCanvasContext.sectionId) || (selectedElementState && selectedElementState.sectionId);
          let targetElementId = (activeCanvasContext && activeCanvasContext.elementId) || (selectedElementState ? selectedElementState.elementId : null);
          if (!targetElementId && targetSectionId) {
            const elements = stackManager.getSectionElements(targetSectionId);
            if (elements.length > 0) targetElementId = elements[elements.length - 1].id;
          }
          if (targetSectionId && targetElementId) {
            const elements = stackManager.getSectionElements(targetSectionId);
            const orig = elements.find(el => el.id === targetElementId);
            if (orig) {
              pushHistorySnapshot();
              const clone = JSON.parse(JSON.stringify(orig));
              delete clone.id;
              clone.x = Math.min(96, (clone.x || 50) + 3);
              clone.y = Math.min(96, (clone.y || 50) + 3);
              const newEl = stackManager.addElement(targetSectionId, clone);
              if (newEl) {
                pendingSelectedElement = { sectionId: targetSectionId, elementId: newEl.id };
                showToast(`Duplicated ${newEl.type || 'element'}`);
              }
            }
          }
          return;
        }

        if (action === 'delete-element') {
          hideContextMenu();
          const targetSectionId = (activeCanvasContext && activeCanvasContext.sectionId) || (selectedElementState && selectedElementState.sectionId);
          let targetElementId = (activeCanvasContext && activeCanvasContext.elementId) || (selectedElementState ? selectedElementState.elementId : null);
          if (!targetElementId && targetSectionId) {
            const elements = stackManager.getSectionElements(targetSectionId);
            if (elements.length > 0) targetElementId = elements[elements.length - 1].id;
          }
          if (targetSectionId && targetElementId) {
            pushHistorySnapshot();
            stackManager.removeElement(targetSectionId, targetElementId);
            clearElementSelection();
            showToast('Element removed');
          }
          return;
        }

        if (!activeCanvasContext) return;
        let elData = { x: activeCanvasContext.xPct, y: activeCanvasContext.yPct };

        if (action === 'add-table-pricing') {
          elData = {
            ...elData,
            type: 'table',
            tableType: 'pricing',
            title: 'Pro Plan',
            price: '$29/mo',
            features: ['Unlimited Projects', 'Custom Domains', '24/7 Priority Support'],
            ctaText: 'Get Started',
            ctaLink: '#pricing'
          };
        } else if (action === 'add-table-comparison') {
          elData = {
            ...elData,
            type: 'table',
            tableType: 'comparison',
            headers: ['Feature', 'Free', 'Pro'],
            rows: [
              ['Storage', '5 GB', '500 GB'],
              ['Bandwidth', '10 GB/mo', 'Unlimited'],
              ['Support', 'Community', '24/7 Priority']
            ]
          };
        } else if (action === 'add-card-feature') {
          elData = {
            ...elData,
            type: 'card',
            cardType: 'feature',
            title: 'Real-time Analytics',
            description: 'Track conversion rates and user telemetry with sub-millisecond precision.',
            badgeText: 'HOT',
            ctaText: 'Learn More →',
            link: '#features'
          };
        } else if (action === 'add-card-testimonial') {
          elData = {
            ...elData,
            type: 'card',
            cardType: 'testimonial',
            author: 'Sarah Jenkins',
            role: 'VP of Product, Apex Digital',
            avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&q=80',
            description: 'This platform transformed our landing page conversion rates within 48 hours.',
            rating: 5
          };
        } else if (action === 'add-image') {
          elData = {
            ...elData,
            type: 'image',
            imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&q=80',
            imageSize: 'medium'
          };
        } else if (action === 'add-badge') {
          elData = {
            ...elData,
            type: 'badge',
            text: 'v2.0 LIVE',
            badgeStyle: 'pulse'
          };
        } else {
          elData = {
            ...elData,
            type: 'button',
            text: 'Click Me →',
            style: 'solid'
          };
        }

        const targetSectionId = activeCanvasContext.sectionId;
        const newEl = stackManager.addElement(targetSectionId, elData);

        hideContextMenu();
        if (newEl) {
          pendingSelectedElement = { sectionId: targetSectionId, elementId: newEl.id };
          showToast(`Added ${newEl.type} to section`);
        }
      });
    }

    function handleCanvasElementKeydown(e) {
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable)) {
        return;
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElementState) {
        const { sectionId, elementId } = selectedElementState;
        const elements = stackManager.getSectionElements(sectionId);
        if (elements && elements.some(el => el.id === elementId)) {
          e.preventDefault();
          pushHistorySnapshot();
          stackManager.removeElement(sectionId, elementId);
          clearElementSelection();
          showToast('Element deleted');
        }
      }
    }

    // Global click, window resize, and keydown listeners
    window.addEventListener('click', (e) => {
      if (canvasContextMenu && !canvasContextMenu.contains(e.target)) {
        hideContextMenu();
      }
    });

    window.addEventListener('resize', updateToolbarPosition);
    window.addEventListener('scroll', updateToolbarPosition, true);
    window.addEventListener('keydown', handleCanvasElementKeydown);

    // Preview Frame load handler: wire dragging & context menu inside iframe
    if (previewFrame) {
      previewFrame.addEventListener('load', () => {
        let doc;
        try {
          doc = previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document);
        } catch (_) {
          return;
        }
        if (!doc) return;

        // Wire history keyboard shortcuts and canvas element deletion inside preview iframe document
        doc.addEventListener('keydown', handleHistoryKeydown);
        doc.addEventListener('keydown', handleCanvasElementKeydown);

        // Auto-select and scroll to pending element (e.g. newly created widget)
        if (pendingSelectedElement) {
          const el = doc.getElementById(pendingSelectedElement.elementId);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            selectCanvasElement(pendingSelectedElement.sectionId, pendingSelectedElement.elementId);
            closeToolbarPopup();
          }
          pendingSelectedElement = null;
        } else if (pendingSelectedSection) {
          const sec = doc.getElementById(pendingSelectedSection);
          if (sec) {
            sec.scrollIntoView({ behavior: 'smooth', block: 'center' });
            sec.style.transition = 'box-shadow 0.4s ease';
            sec.style.boxShadow = '0 0 0 3px #a855f7, 0 0 24px rgba(168, 85, 247, 0.5)';
            setTimeout(() => { sec.style.boxShadow = ''; }, 2000);
          }
          pendingSelectedSection = null;
        } else if (selectedElementState) {
          const el = doc.getElementById(selectedElementState.elementId);
          if (el) {
            el.classList.add('is-selected');
            ensureResizeHandles(el);
            if (elementEditToolbar && elementEditToolbar.style.display !== 'none') {
              updateToolbarPosition();
            }
          } else {
            clearElementSelection();
          }
        }

        doc.addEventListener('scroll', updateToolbarPosition, true);

        // Right-Click Context Menu inside Iframe
        doc.addEventListener('contextmenu', (e) => {
          const sectionEl = e.target.closest('.page-section');
          if (!sectionEl) return;

          e.preventDefault();
          const targetEl = e.target.closest('.canvas-element');
          const isElementTarget = !!targetEl;

          if (targetEl) {
            const elId = targetEl.dataset.elementId;
            selectCanvasElement(sectionEl.id, elId);
          } else {
            clearElementSelection();
          }

          const secRect = sectionEl.getBoundingClientRect();
          const xPct = Math.max(2, Math.min(98, ((e.clientX - secRect.left) / secRect.width) * 100));
          const yPct = Math.max(2, Math.min(98, ((e.clientY - secRect.top) / secRect.height) * 100));

          activeCanvasContext = {
            sectionId: sectionEl.id,
            elementId: targetEl ? targetEl.dataset.elementId : null,
            xPct: Math.round(xPct * 10) / 10,
            yPct: Math.round(yPct * 10) / 10
          };

          const contextMenuTitle = document.getElementById('contextMenuTitle');
          const contextElementActionsGroup = document.getElementById('contextElementActionsGroup');
          const contextCanvasAddGroup = document.getElementById('contextCanvasAddGroup');

          if (isElementTarget) {
            if (contextMenuTitle) contextMenuTitle.textContent = 'Element Actions';
            if (contextElementActionsGroup) contextElementActionsGroup.style.display = 'block';
            if (contextCanvasAddGroup) contextCanvasAddGroup.style.display = 'none';
          } else {
            if (contextMenuTitle) contextMenuTitle.textContent = 'Add to Section';
            if (contextElementActionsGroup) contextElementActionsGroup.style.display = 'none';
            if (contextCanvasAddGroup) contextCanvasAddGroup.style.display = 'block';
          }

          const frameRect = previewFrame.getBoundingClientRect();
          const menuLeft = Math.min(window.innerWidth - 220, frameRect.left + e.clientX);
          const menuTop = Math.min(window.innerHeight - 240, frameRect.top + e.clientY);

          if (canvasContextMenu) {
            canvasContextMenu.style.left = `${menuLeft}px`;
            canvasContextMenu.style.top = `${menuTop}px`;
            canvasContextMenu.style.display = 'block';
          }
        });

        // Click inside iframe
        doc.addEventListener('click', (e) => {
          hideContextMenu();
          const elementEl = e.target.closest('.canvas-element');
          if (elementEl) {
            e.preventDefault();
          } else {
            clearElementSelection();
          }
        });

        // Double-click on canvas element for instant direct text editing
        doc.addEventListener('dblclick', (e) => {
          const elementEl = e.target.closest('.canvas-element');
          if (!elementEl) return;
          e.preventDefault();
          e.stopPropagation();

          const elementId = elementEl.dataset.elementId;
          const sectionEl = elementEl.closest('.page-section');
          if (!sectionEl || !elementId) return;

          focusElementPrimaryText(sectionEl.id, elementId);
        });

        // Canvas Element Mousedown Handler: Resize Handles & Dragging
        doc.addEventListener('mousedown', (e) => {
          if (e.button !== 0) return;

          // 1. Live Interactive Resize Handles for Canvas Elements
          const resizeHandleEl = e.target.closest('.el-resize-handle');
          if (resizeHandleEl) {
            pushHistorySnapshot();
            e.preventDefault();
            e.stopPropagation();

            const elementEl = resizeHandleEl.closest('.canvas-element');
            if (!elementEl) return;
            const elementId = elementEl.dataset.elementId;
            const sectionEl = elementEl.closest('.page-section');
            if (!sectionEl) return;
            const sectionId = sectionEl.id;

            selectCanvasElement(sectionId, elementId);
            closeToolbarPopup();

            const handleType = resizeHandleEl.dataset.handle;
            const elRect = elementEl.getBoundingClientRect();
            const secRect = sectionEl.getBoundingClientRect();

            const initialBox = {
              left: elRect.left - secRect.left,
              top: elRect.top - secRect.top,
              right: elRect.right - secRect.left,
              bottom: elRect.bottom - secRect.top,
              width: elRect.width,
              height: elRect.height
            };
            const startMouseX = e.clientX;
            const startMouseY = e.clientY;

            let finalWidth = initialBox.width;
            let finalHeight = initialBox.height;
            let finalXPct = parseFloat(elementEl.style.left) || 50;
            let finalYPct = parseFloat(elementEl.style.top) || 50;

            function onElementResizeMove(moveEvent) {
              const frameRect = previewFrame.getBoundingClientRect();
              const mouseX = (moveEvent.view === window) ? (moveEvent.clientX - frameRect.left) : moveEvent.clientX;
              const mouseY = (moveEvent.view === window) ? (moveEvent.clientY - frameRect.top) : moveEvent.clientY;

              const deltaX = mouseX - startMouseX;
              const deltaY = mouseY - startMouseY;

              let newWidth = initialBox.width;
              let newHeight = initialBox.height;
              let newCenterX = initialBox.left + initialBox.width / 2;
              let newCenterY = initialBox.top + initialBox.height / 2;

              if (handleType.includes('e')) {
                newWidth = Math.max(30, initialBox.width + deltaX);
                newCenterX = initialBox.left + (newWidth / 2);
              } else if (handleType.includes('w')) {
                newWidth = Math.max(30, initialBox.width - deltaX);
                newCenterX = initialBox.right - (newWidth / 2);
              }

              if (handleType.includes('s')) {
                newHeight = Math.max(20, initialBox.height + deltaY);
                newCenterY = initialBox.top + (newHeight / 2);
              } else if (handleType.includes('n')) {
                newHeight = Math.max(20, initialBox.height - deltaY);
                newCenterY = initialBox.bottom - (newHeight / 2);
              }

              finalWidth = Math.round(newWidth);
              finalHeight = Math.round(newHeight);
              finalXPct = Math.max(2, Math.min(98, Math.round(((newCenterX / secRect.width) * 100) * 10) / 10));
              finalYPct = Math.max(2, Math.min(98, Math.round(((newCenterY / secRect.height) * 100) * 10) / 10));

              elementEl.style.width = `${finalWidth}px`;
              elementEl.style.height = `${finalHeight}px`;
              elementEl.style.left = `${finalXPct}%`;
              elementEl.style.top = `${finalYPct}%`;

              if (toolbarBtnWidth) toolbarBtnWidth.value = finalWidth;
              if (toolbarBtnHeight) toolbarBtnHeight.value = finalHeight;
              if (toolbarImgWidth) toolbarImgWidth.value = finalWidth;
              if (toolbarImgHeight) toolbarImgHeight.value = finalHeight;
              if (toolbarCardWidth) toolbarCardWidth.value = finalWidth;
              if (toolbarCardHeight) toolbarCardHeight.value = finalHeight;
              if (toolbarTableWidth) toolbarTableWidth.value = finalWidth;
              if (toolbarTableHeight) toolbarTableHeight.value = finalHeight;

              stackManager.updateElement(sectionId, elementId, {
                width: finalWidth,
                height: finalHeight,
                x: finalXPct,
                y: finalYPct
              }, true);

              if (elementEditToolbar && elementEditToolbar.style.display !== 'none') {
                updateToolbarPosition();
              }
            }

            function onElementResizeUp() {
              doc.removeEventListener('mousemove', onElementResizeMove);
              doc.removeEventListener('mouseup', onElementResizeUp);
              window.removeEventListener('mousemove', onElementResizeMove);
              window.removeEventListener('mouseup', onElementResizeUp);

              stackManager.updateElement(sectionId, elementId, {
                width: finalWidth,
                height: finalHeight,
                x: finalXPct,
                y: finalYPct
              }, false);
              if (elementEditToolbar && elementEditToolbar.style.display !== 'none') {
                updateToolbarPosition();
              }
            }

            doc.addEventListener('mousemove', onElementResizeMove);
            doc.addEventListener('mouseup', onElementResizeUp);
            window.addEventListener('mousemove', onElementResizeMove);
            window.addEventListener('mouseup', onElementResizeUp);
            return;
          }

          // 2. Element Dragging & Selection
          const elementEl = e.target.closest('.canvas-element');
          if (!elementEl) return;

          e.preventDefault();
          const elementId = elementEl.dataset.elementId;
          const sectionEl = elementEl.closest('.page-section');
          if (!sectionEl) return;
          const sectionId = sectionEl.id;

          if (e.detail === 2) {
            e.stopPropagation();
            focusElementPrimaryText(sectionId, elementId);
            return;
          }

          selectCanvasElement(sectionId, elementId);
          closeToolbarPopup();

          pushHistorySnapshot();
          let isDragging = false;
          const startX = e.clientX;
          const startY = e.clientY;
          const secRect = sectionEl.getBoundingClientRect();

          const startXPct = parseFloat(elementEl.style.left) || 50;
          const startYPct = parseFloat(elementEl.style.top) || 50;
          let currentXPct = startXPct;
          let currentYPct = startYPct;

          function onMouseMove(moveEvent) {
            const frameRect = previewFrame.getBoundingClientRect();
            const mouseX = (moveEvent.view === window) ? (moveEvent.clientX - frameRect.left) : moveEvent.clientX;
            const mouseY = (moveEvent.view === window) ? (moveEvent.clientY - frameRect.top) : moveEvent.clientY;

            const deltaX = mouseX - startX;
            const deltaY = mouseY - startY;

            if (!isDragging && Math.hypot(deltaX, deltaY) > 3) {
              isDragging = true;
            }

            if (isDragging) {
              currentXPct = Math.max(2, Math.min(98, startXPct + (deltaX / secRect.width) * 100));
              currentYPct = Math.max(2, Math.min(98, startYPct + (deltaY / secRect.height) * 100));

              elementEl.style.left = `${currentXPct}%`;
              elementEl.style.top = `${currentYPct}%`;
              updateToolbarPosition();
            }
          }

          function onMouseUp() {
            doc.removeEventListener('mousemove', onMouseMove);
            doc.removeEventListener('mouseup', onMouseUp);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);

            if (isDragging) {
              stackManager.updateElement(sectionId, elementId, {
                x: Math.round(currentXPct * 10) / 10,
                y: Math.round(currentYPct * 10) / 10
              }, false);
            }
          }

          doc.addEventListener('mousemove', onMouseMove);
          doc.addEventListener('mouseup', onMouseUp);
          window.addEventListener('mousemove', onMouseMove);
          window.addEventListener('mouseup', onMouseUp);
        });

        // Section Bottom Resize Handle Drag Handler
        doc.addEventListener('mousedown', (e) => {
          if (e.button !== 0) return;
          const handleEl = e.target.closest('.section-resize-handle');
          if (!handleEl) return;

          e.preventDefault();
          pushHistorySnapshot();
          const sectionId = handleEl.dataset.resizeSection;
          const sectionEl = doc.getElementById(sectionId);
          if (!sectionEl) return;

          handleEl.classList.add('is-resizing');
          const startY = e.clientY;
          const initialHeight = sectionEl.getBoundingClientRect().height;
          let newHeight = initialHeight;

          // Prepare section & children for live stretching without blank gaps
          sectionEl.style.display = 'flex';
          sectionEl.style.flexDirection = 'column';
          const contentEl = sectionEl.querySelector(':scope > div[id^="root-"], :scope > :first-child:not(.section-overlay-layer):not(.section-resize-handle)');
          if (contentEl) {
            contentEl.style.flex = '1 1 auto';
            contentEl.style.height = '100%';
            contentEl.style.minHeight = '100%';
            if (contentEl.firstElementChild) {
              contentEl.firstElementChild.style.flex = '1 1 auto';
              contentEl.firstElementChild.style.height = '100%';
              contentEl.firstElementChild.style.minHeight = '100%';
            }
          }

          function onSectionResizeMove(moveEvent) {
            const frameRect = previewFrame.getBoundingClientRect();
            const mouseY = (moveEvent.view === window) ? (moveEvent.clientY - frameRect.top) : moveEvent.clientY;
            const deltaY = mouseY - startY;
            newHeight = Math.max(48, Math.min(2600, Math.round(initialHeight + deltaY)));
            sectionEl.style.height = `${newHeight}px`;
            sectionEl.style.minHeight = `${newHeight}px`;
            sectionEl.style.overflow = 'hidden';

            // Show live height floating tooltip inside the iframe
            let sizeTooltip = doc.getElementById('sectionResizeTooltip');
            if (!sizeTooltip) {
              sizeTooltip = doc.createElement('div');
              sizeTooltip.id = 'sectionResizeTooltip';
              sizeTooltip.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:rgba(15,15,22,0.92);color:#fafafa;padding:6px 14px;border-radius:20px;font-size:12px;font-weight:600;font-family:monospace;border:1px solid rgba(168,85,247,0.5);box-shadow:0 8px 24px rgba(0,0,0,0.6);z-index:99999;pointer-events:none;';
              doc.body.appendChild(sizeTooltip);
            }
            sizeTooltip.textContent = `Section Height: ${newHeight}px`;
            sizeTooltip.style.display = 'block';

            updateToolbarPosition();
          }

          function onSectionResizeUp() {
            handleEl.classList.remove('is-resizing');
            doc.removeEventListener('mousemove', onSectionResizeMove);
            doc.removeEventListener('mouseup', onSectionResizeUp);
            window.removeEventListener('mousemove', onSectionResizeMove);
            window.removeEventListener('mouseup', onSectionResizeUp);

            const sizeTooltip = doc.getElementById('sectionResizeTooltip');
            if (sizeTooltip) sizeTooltip.style.display = 'none';

            stackManager.updateSectionSizing(sectionId, {
              heightMode: 'custom',
              customHeight: newHeight
            });
            showToast(`Section height updated: ${newHeight}px`);
          }

          doc.addEventListener('mousemove', onSectionResizeMove);
          doc.addEventListener('mouseup', onSectionResizeUp);
          window.addEventListener('mousemove', onSectionResizeMove);
          window.addEventListener('mouseup', onSectionResizeUp);
        });

        // =============================================================
        // Drag-and-Drop from Sidebar onto Canvas & Positional Section Dropping
        // =============================================================
        let dropIndicatorEl = null;

        function cleanupDropIndicators() {
          doc.querySelectorAll('.page-section.is-drop-target').forEach(sec => sec.classList.remove('is-drop-target'));
          if (dropIndicatorEl) {
            dropIndicatorEl.remove();
            dropIndicatorEl = null;
          }
          doc.querySelectorAll('.section-drop-indicator').forEach(el => el.remove());
        }

        doc.addEventListener('dragover', (e) => {
          e.preventDefault();
          if (e.dataTransfer) {
            e.dataTransfer.dropEffect = 'copy';
          }

          const targetSection = e.target.closest('.page-section');
          const isWidget = currentDragPayload ? currentDragPayload.isWidget : false;

          if (isWidget) {
            if (dropIndicatorEl) {
              dropIndicatorEl.remove();
              dropIndicatorEl = null;
            }
            doc.querySelectorAll('.page-section.is-drop-target').forEach(sec => {
              if (sec !== targetSection) sec.classList.remove('is-drop-target');
            });
            if (targetSection) {
              targetSection.classList.add('is-drop-target');
            }
          } else {
            doc.querySelectorAll('.page-section.is-drop-target').forEach(sec => sec.classList.remove('is-drop-target'));

            if (targetSection) {
              const secRect = targetSection.getBoundingClientRect();
              const isUpper = (e.clientY - secRect.top) < (secRect.height / 2);

              if (!dropIndicatorEl || dropIndicatorEl.parentElement !== targetSection) {
                if (dropIndicatorEl) dropIndicatorEl.remove();
                dropIndicatorEl = doc.createElement('div');
                dropIndicatorEl.className = 'section-drop-indicator';
                targetSection.appendChild(dropIndicatorEl);
              }

              if (isUpper) {
                dropIndicatorEl.classList.remove('drop-below');
                dropIndicatorEl.classList.add('drop-above');
              } else {
                dropIndicatorEl.classList.remove('drop-above');
                dropIndicatorEl.classList.add('drop-below');
              }
            } else {
              if (dropIndicatorEl) {
                dropIndicatorEl.remove();
                dropIndicatorEl = null;
              }
            }
          }
        });

        doc.addEventListener('dragleave', (e) => {
          if (!e.relatedTarget || e.relatedTarget === doc.documentElement || e.relatedTarget === doc.body || !doc.contains(e.relatedTarget)) {
            cleanupDropIndicators();
          }
        });

        doc.addEventListener('drop', (e) => {
          e.preventDefault();

          let payload = null;
          try {
            const rawData = e.dataTransfer && e.dataTransfer.getData('application/json');
            if (rawData) {
              payload = JSON.parse(rawData);
            }
          } catch (_) {}

          if (!payload && e.dataTransfer) {
            try {
              const rawText = e.dataTransfer.getData('text/plain');
              if (rawText) {
                payload = JSON.parse(rawText);
              }
            } catch (_) {}
          }

          if (!payload && currentDragPayload) {
            payload = currentDragPayload;
          }

          cleanupDropIndicators();

          if (!payload) return;

          const targetSection = e.target.closest('.page-section');

          if (payload.isWidget) {
            let sec = targetSection;
            if (!sec) {
              const active = getActiveSection();
              if (active) {
                sec = doc.getElementById(active.id);
              }
            }

            if (!sec) {
              const newSec = stackManager.addSection('oklch-ambient-glow-hero', {
                title: 'Hero Section',
                category: 'Heroes'
              });
              setActiveSection(newSec.id);
              const newEl = stackManager.addElement(newSec.id, {
                ...(payload.elData || {}),
                x: 50,
                y: 50
              });
              if (newEl) {
                pendingSelectedElement = { sectionId: newSec.id, elementId: newEl.id };
                showToast(`Added ${payload.title || 'widget'} to ${newSec.title || newSec.id}`);
              }
              return;
            }

            const secRect = sec.getBoundingClientRect();
            const rawX = ((e.clientX - secRect.left) / secRect.width) * 100;
            const rawY = ((e.clientY - secRect.top) / secRect.height) * 100;
            const x = Math.round(Math.max(5, Math.min(95, rawX)) * 10) / 10;
            const y = Math.round(Math.max(5, Math.min(95, rawY)) * 10) / 10;

            const newEl = stackManager.addElement(sec.id, {
              ...(payload.elData || {}),
              x,
              y
            });

            if (newEl) {
              pendingSelectedElement = { sectionId: sec.id, elementId: newEl.id };
              showToast(`Added ${payload.title || 'widget'} at (${x}%, ${y}%)`);
            }
          } else {
            const currentStack = stackManager.getStack();
            let targetIndex = currentStack.length;

            if (targetSection) {
              const secRect = targetSection.getBoundingClientRect();
              const isUpper = (e.clientY - secRect.top) < (secRect.height / 2);
              const secIndex = currentStack.findIndex(s => s.id === targetSection.id);
              if (secIndex !== -1) {
                targetIndex = isUpper ? secIndex : secIndex + 1;
              }
            }

            const res = addOrReplaceLandingSection(payload.slug, {
              title: payload.title,
              category: payload.normCat
            }, targetIndex);

            if (res && res.section) {
              setActiveSection(res.section.id);
              pendingSelectedSection = res.section.id;
            }
          }
        });
      });
    }

    // Sidebar 3-Tab Controller
    function switchSidebarTab(tabName) {
      [tabElementsBtn, tabSectionsBtn, tabStylingBtn].forEach(btn => {
        if (btn) {
          const isActive = btn.dataset.tab === tabName;
          btn.classList.toggle('is-active', isActive);
          btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
        }
      });
      if (paneElements) paneElements.classList.toggle('is-active', tabName === 'elements');
      if (paneSections) paneSections.classList.toggle('is-active', tabName === 'sections');
      if (paneStyling) paneStyling.classList.toggle('is-active', tabName === 'styling');
    }

    if (tabElementsBtn) tabElementsBtn.addEventListener('click', () => switchSidebarTab('elements'));
    if (tabSectionsBtn) tabSectionsBtn.addEventListener('click', () => switchSidebarTab('sections'));
    if (tabStylingBtn) tabStylingBtn.addEventListener('click', () => switchSidebarTab('styling'));

    // -------------------------------------------------------------
    // Active Target Section Management (for in-section widgets)
    // -------------------------------------------------------------
    function getActiveSection() {
      const stack = stackManager.getStack();
      if (!Array.isArray(stack) || stack.length === 0) return null;
      if (activeTargetSectionId) {
        const found = stack.find(s => s.id === activeTargetSectionId);
        if (found) return found;
      }
      return stack[stack.length - 1]; // Fallback to last section
    }

    function setActiveSection(id) {
      activeTargetSectionId = id;
      updateActiveSectionUI();
    }

    function updateActiveSectionUI() {
      const sec = getActiveSection();
      if (elementsTargetSectionName) {
        if (sec) {
          elementsTargetSectionName.textContent = `${sec.title || sec.slug} (${sec.id})`;
        } else {
          elementsTargetSectionName.textContent = 'None (auto-creates section)';
        }
      }
      if (pageStackList) {
        pageStackList.querySelectorAll('.stack-item-card').forEach(card => {
          const isTarget = sec && card.dataset.sectionId === sec.id;
          card.classList.toggle('is-selected-target', isTarget);
        });
      }
    }

    if (elementsTargetBanner) {
      elementsTargetBanner.addEventListener('click', () => {
        const stack = stackManager.getStack();
        if (stack.length <= 1) return;
        const cur = getActiveSection();
        const curIdx = cur ? stack.findIndex(s => s.id === cur.id) : -1;
        const nextIdx = (curIdx + 1) % stack.length;
        setActiveSection(stack[nextIdx].id);
        showToast(`Target section switched to: ${stack[nextIdx].title || stack[nextIdx].slug}`);
      });
    }

    // -------------------------------------------------------------
    // View Switcher (Visual Cards with live previews vs Compact list)
    // -------------------------------------------------------------
    if (elementsViewVisualBtn && elementsViewCompactBtn) {
      elementsViewVisualBtn.addEventListener('click', () => {
        elementsVisualMode = true;
        elementsViewVisualBtn.classList.add('is-active');
        elementsViewCompactBtn.classList.remove('is-active');
        if (elementsCardsGrid) elementsCardsGrid.classList.remove('is-compact');
        renderElementsCatalog();
      });

      elementsViewCompactBtn.addEventListener('click', () => {
        elementsVisualMode = false;
        elementsViewCompactBtn.classList.add('is-active');
        elementsViewVisualBtn.classList.remove('is-active');
        if (elementsCardsGrid) elementsCardsGrid.classList.add('is-compact');
        renderElementsCatalog();
      });
    }

    // -------------------------------------------------------------
    // Scope Switcher (All vs In-Section Widgets vs Full-Row Sections)
    // -------------------------------------------------------------
    if (elementsScopeToggle) {
      const scopePills = elementsScopeToggle.querySelectorAll('.scope-pill');
      scopePills.forEach(pill => {
        pill.addEventListener('click', () => {
          scopePills.forEach(p => p.classList.remove('is-active'));
          pill.classList.add('is-active');
          elementsScope = pill.dataset.scope || 'all';
          renderElementsCatalog();
        });
      });
    }

    // Lazy Preview Observer for Sidebar Section Cards
    const elementsPreviewObserver = typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            const box = entry.target;
            const slug = box.getAttribute('data-slug');
            if (!slug) return;
            let iframe = box.querySelector('iframe');
            if (entry.isIntersecting) {
              if (!iframe) {
                iframe = document.createElement('iframe');
                iframe.title = slug;
                iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups');
                iframe.setAttribute('loading', 'lazy');
                iframe.src = `features/${slug}/index.html`;
                const placeholder = box.querySelector('.element-card-preview-placeholder');
                iframe.addEventListener('load', () => {
                  if (placeholder) placeholder.style.display = 'none';
                });
                iframe.addEventListener('error', () => {
                  if (placeholder) placeholder.innerHTML = `<span style="font-size:10px;color:#a1a1aa;">Preview unavailable</span>`;
                });
                box.appendChild(iframe);
              }
            } else if (iframe) {
              iframe.remove();
              const placeholder = box.querySelector('.element-card-preview-placeholder');
              if (placeholder) placeholder.style.display = '';
            }
          });
        }, { root: document.getElementById('elementsCatalogScroll') || null, rootMargin: '350px 0px' })
      : null;

    // -------------------------------------------------------------
    // Unified Creative Elements Catalog Render Engine
    // -------------------------------------------------------------
    function renderElementsCatalog() {
      if (!elementsCardsGrid) return;

      if (elementsPreviewObserver) {
        elementsPreviewObserver.disconnect();
      }

      updateActiveSectionUI();

      const q = elementsSearch.toLowerCase().trim();

      // Collect items matching scope
      let itemsToFilter = [];
      if (elementsScope === 'widgets') {
        itemsToFilter = WIDGET_CATALOG_ITEMS;
      } else if (elementsScope === 'sections') {
        itemsToFilter = registry;
      } else {
        itemsToFilter = [...WIDGET_CATALOG_ITEMS, ...registry];
      }

      const filtered = itemsToFilter.filter(item => {
        // Category matching
        const matchesCat = item.isWidget
          ? (elementsCategory === 'all' || matchesCategory({ category: item.category }, elementsCategory))
          : matchesCategory(item, elementsCategory);

        if (!matchesCat) return false;
        if (!q) return true;

        const slug = (item.slug || '').toLowerCase();
        const title = (item.title || item.name || '').toLowerCase();
        const desc = (item.desc || item.description || '').toLowerCase();
        const normCat = item.isWidget ? item.category.toLowerCase() : getNormalizedCategory(item).toLowerCase();
        const tags = Array.isArray(item.tags) ? item.tags.map(t => String(t).toLowerCase()) : [];

        return (
          slug.includes(q) ||
          title.includes(q) ||
          desc.includes(q) ||
          normCat.includes(q) ||
          tags.some(t => t.includes(q))
        );
      });

      if (elementsTotalCount) {
        elementsTotalCount.textContent = `${filtered.length} items`;
      }

      if (filtered.length === 0) {
        elementsCardsGrid.innerHTML = `
          <div style="padding: 36px 14px; text-align: center; color: var(--text-muted, #a1a1aa);">
            <div style="font-size: 13px; font-weight: 500; margin-bottom: 4px; color: var(--text-main, #fafafa);">No items found</div>
            <div style="font-size: 11px; color: var(--text-dim, #71717a);">Try clearing search query or switching scope/categories</div>
          </div>
        `;
        return;
      }

      elementsCardsGrid.innerHTML = '';
      const fragment = document.createDocumentFragment();

      filtered.forEach(item => {
        const card = document.createElement('div');
        card.className = 'element-feature-card';
        card.setAttribute('role', 'listitem');
        card.setAttribute('data-slug', item.slug);
        card.setAttribute('draggable', 'true');

        const title = item.title || item.name || item.slug;
        const desc = item.desc || item.description || (item.isWidget ? 'In-section interactive widget' : 'Production-ready vault component');
        const normCat = item.isWidget ? item.category : getNormalizedCategory(item);
        const tags = Array.isArray(item.tags) ? item.tags.slice(0, 3) : [];

        let badgeClass = 'badge-templates';
        const catLower = normCat.toLowerCase();
        if (catLower.includes('hero')) badgeClass = 'badge-heroes';
        else if (catLower.includes('nav') || catLower.includes('header')) badgeClass = 'badge-nav';
        else if (catLower.includes('pricing') || catLower.includes('table')) badgeClass = 'badge-pricing';
        else if (catLower.includes('button') || catLower.includes('ui')) badgeClass = 'badge-buttons';
        else if (catLower.includes('footer')) badgeClass = 'badge-footers';
        else if (catLower.includes('card')) badgeClass = 'badge-cards';
        else if (catLower.includes('galleries') || catLower.includes('bento')) badgeClass = 'badge-galleries';
        else if (catLower.includes('3d') || catLower.includes('carousel')) badgeClass = 'badge-3d';
        else if (catLower.includes('scroll') || catLower.includes('parallax')) badgeClass = 'badge-scroll';
        else if (catLower.includes('audio') || catLower.includes('shader')) badgeClass = 'badge-shaders';
        else if (catLower.includes('physics') || catLower.includes('cursor')) badgeClass = 'badge-physics';

        const scopeBadgeHtml = item.isWidget
          ? '<span class="element-scope-badge scope-widget">Widget</span>'
          : '<span class="element-scope-badge scope-section">Section</span>';

        const btnLabel = item.isWidget ? '+ Add to Section' : '+ Add Section';

        // Preview box HTML: rendered widget preview for widgets, live iframe box for sections
        const previewBoxHtml = item.isWidget
          ? `<div class="element-widget-preview">${item.previewHtml || ''}</div>`
          : `
            <div class="element-card-preview-box" data-slug="${item.slug}">
              <div class="element-card-preview-placeholder">
                <div class="spinner-ring"></div>
                <span>Live Preview</span>
              </div>
            </div>
          `;

        card.innerHTML = `
          ${previewBoxHtml}
          <div class="element-card-content">
            <div class="element-card-header">
              <div style="display:flex;align-items:center;gap:6px;">
                ${scopeBadgeHtml}
                <span class="element-card-badge ${badgeClass}">${escapeHtml(normCat)}</span>
              </div>
              <button type="button" class="element-add-btn" aria-label="${escapeHtml(btnLabel)}">
                <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                <span>${escapeHtml(btnLabel)}</span>
              </button>
            </div>
            <div class="element-card-title">${escapeHtml(title)}</div>
            <div class="element-card-desc" title="${escapeHtml(desc)}">${escapeHtml(desc)}</div>
            ${tags.length ? `
              <div class="element-card-tags">
                ${tags.map(t => `<span class="element-tag">#${escapeHtml(t)}</span>`).join('')}
              </div>
            ` : ''}
          </div>
        `;

        if (!item.isWidget && elementsPreviewObserver) {
          const previewBox = card.querySelector('.element-card-preview-box');
          if (previewBox) {
            elementsPreviewObserver.observe(previewBox);
          }
        }

        const addBtn = card.querySelector('.element-add-btn');

        const triggerAction = () => {
          if (item.isWidget) {
            // Add directly into active section
            let targetSec = getActiveSection();
            if (!targetSec) {
              targetSec = stackManager.addSection('oklch-ambient-glow-hero', {
                title: 'Hero Section',
                category: 'Heroes'
              });
              setActiveSection(targetSec.id);
            }

            const newEl = stackManager.addElement(targetSec.id, item.elData);
            if (newEl) {
              pendingSelectedElement = { sectionId: targetSec.id, elementId: newEl.id };
              showToast(`Added ${title} into ${targetSec.title || targetSec.id}`);
            }
          } else {
            // Add as new page section row
            const res = addOrReplaceLandingSection(item.slug, {
              title: title,
              category: normCat
            });
            if (res && res.section) {
              setActiveSection(res.section.id);
              pendingSelectedSection = res.section.id;
            }
          }

          if (addBtn) {
            if (!addBtn.dataset.originalHtml) {
              addBtn.dataset.originalHtml = addBtn.innerHTML;
            }
            if (addBtn._restoreTimer) {
              clearTimeout(addBtn._restoreTimer);
            }
            addBtn.innerHTML = `<span>✓ Added!</span>`;
            addBtn.style.background = '#10b981';
            addBtn.style.borderColor = '#10b981';
            addBtn.style.color = '#ffffff';

            addBtn._restoreTimer = setTimeout(() => {
              if (addBtn.dataset.originalHtml) {
                addBtn.innerHTML = addBtn.dataset.originalHtml;
                delete addBtn.dataset.originalHtml;
              }
              addBtn.style.background = '';
              addBtn.style.borderColor = '';
              addBtn.style.color = '';
              addBtn._restoreTimer = null;
            }, 900);
          }
        };

        if (addBtn) {
          addBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            triggerAction();
          });
        }

        card.addEventListener('click', () => {
          triggerAction();
        });

        card.addEventListener('dragstart', (e) => {
          const payload = {
            isWidget: !!item.isWidget,
            slug: item.slug,
            title: item.title || item.name || item.slug,
            normCat: normCat,
            elData: item.elData || null
          };
          currentDragPayload = payload;
          if (e.dataTransfer) {
            try {
              e.dataTransfer.setData('application/json', JSON.stringify(payload));
              e.dataTransfer.setData('text/plain', JSON.stringify(payload));
            } catch (_) {}
            e.dataTransfer.effectAllowed = 'copy';
          }
          card.classList.add('is-dragging');
        });

        card.addEventListener('dragend', () => {
          card.classList.remove('is-dragging');
          currentDragPayload = null;
          try {
            const doc = previewFrame && (previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document));
            if (doc) {
              doc.querySelectorAll('.page-section.is-drop-target').forEach(sec => sec.classList.remove('is-drop-target'));
              doc.querySelectorAll('.section-drop-indicator').forEach(el => el.remove());
            }
          } catch (_) {}
        });

        fragment.appendChild(card);
      });

      elementsCardsGrid.appendChild(fragment);
    }

    // Elements Sidebar Search & Filters
    if (elementsSearchInput) {
      elementsSearchInput.addEventListener('input', () => {
        elementsSearch = elementsSearchInput.value;
        if (clearElementsSearchBtn) {
          clearElementsSearchBtn.style.display = elementsSearch.length ? 'inline-flex' : 'none';
        }
        renderElementsCatalog();
      });
    }

    if (clearElementsSearchBtn) {
      clearElementsSearchBtn.addEventListener('click', () => {
        if (elementsSearchInput) elementsSearchInput.value = '';
        elementsSearch = '';
        clearElementsSearchBtn.style.display = 'none';
        renderElementsCatalog();
      });
    }

    if (elementsCategoryPills) {
      const pills = elementsCategoryPills.querySelectorAll('.elements-cat-pill');
      pills.forEach(pill => {
        pill.addEventListener('click', () => {
          pills.forEach(p => p.classList.remove('is-active'));
          pill.classList.add('is-active');
          elementsCategory = pill.dataset.category || 'all';
          renderElementsCatalog();
        });
      });
    }

    // Styling Tab Theme Preset & Color Handling
    if (themePresetCards) {
      themePresetCards.addEventListener('click', (e) => {
        const btn = e.target.closest('.theme-card-btn');
        if (!btn) return;
        const theme = btn.dataset.theme;
        themePresetCards.querySelectorAll('.theme-card-btn').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        if (themePresetSelect) themePresetSelect.value = theme;
        stackManager.setTheme(theme);
        const name = btn.querySelector('.theme-name') ? btn.querySelector('.theme-name').textContent : theme;
        showToast(`Theme changed to ${name}`);
      });
    }

    function syncColorsFromSidebar(colors) {
      if (colors.bg && bgColorInput) bgColorInput.value = colors.bg;
      if (colors.text && textColorInput) textColorInput.value = colors.text;
      if (colors.accent && accentColorInput) accentColorInput.value = colors.accent;
      stackManager.setCustomColors(colors);
      if (stackManager.getState().theme !== 'custom') {
        stackManager.setTheme('custom');
        if (themePresetSelect) themePresetSelect.value = 'custom';
        if (themePresetCards) themePresetCards.querySelectorAll('.theme-card-btn').forEach(b => b.classList.remove('is-active'));
      }
    }

    if (sidebarBgColor) sidebarBgColor.addEventListener('input', (e) => syncColorsFromSidebar({ bg: e.target.value }));
    if (sidebarTextColor) sidebarTextColor.addEventListener('input', (e) => syncColorsFromSidebar({ text: e.target.value }));
    if (sidebarAccentColor) sidebarAccentColor.addEventListener('input', (e) => syncColorsFromSidebar({ accent: e.target.value }));

    // Subscribe to stack changes
    stackManager.subscribe(() => {
      renderStackList();
      updatePreview();
      if (!isApplyingHistory) {
        pushHistorySnapshot();
        scheduleAutoSave();
      }
    });

    // Clear Stack Action
    if (clearStackBtn) {
      clearStackBtn.addEventListener('click', () => {
        if (stackManager.getStack().length > 0) {
          stackManager.clearStack();
          showToast('Cleared all sections from page stack');
        }
      });
    }

    // Complete High-Converting Landing Page Architecture (10 Sections)
    // Structure: 1 Header (top) -> 1 Hero -> Social Proof Marquee -> Features -> Showcase -> Testimonials -> Pricing -> FAQ -> Final CTA -> 1 Footer (bottom)
    const STARTER_SECTIONS = [
      { slug: 'responsive-burger-menu', title: 'Morphing Burger & Staggered Overlay Menu', category: 'Headers & Nav' },
      { slug: 'oklch-ambient-glow-hero', title: 'OKLCH Ambient Aurora Hero', category: 'Heroes' },
      { slug: 'client-logo-marquee', title: 'Infinite Dual-Direction Partner Logo Marquee', category: 'Galleries & Bento' },
      { slug: 'ink-orbit-features', title: 'Ink Orbit Features & Benefits', category: 'Interactions & Physics' },
      { slug: 'polaroid-string-carousel', title: 'Polaroid Sagging String & Breeze Physics Carousel', category: '3D & Carousels' },
      { slug: 'stagger-testimonials', title: 'Staggered Customer Testimonials', category: 'Cards & Tiles' },
      { slug: 'ink-orbit-pricing', title: 'Interactive Tiered Pricing Matrix', category: 'Pricing & Tables' },
      { slug: 'faq-accordion-smooth', title: 'Editorial Smooth-Height FAQ Accordion', category: 'Buttons & UI' },
      { slug: 'postmark-cta', title: 'Postmark High-Conversion Final CTA', category: 'Buttons & UI' },
      { slug: 'beam-wordmark-footer', title: 'Beam Wordmark Footer', category: 'Footers & Endings' }
    ];

    function loadStarterTemplate(silent = false) {
      const prevApplying = isApplyingHistory;
      isApplyingHistory = true;
      stackManager.clearStack();
      STARTER_SECTIONS.forEach(item => {
        stackManager.addSection(item.slug, {
          title: item.title,
          category: item.category
        });
      });
      isApplyingHistory = prevApplying;
      pushHistorySnapshot();
      saveStateToStorage();
      if (!silent) {
        showToast('Loaded complete 10-section landing page template');
      }
    }

    if (loadStarterBtn) {
      loadStarterBtn.addEventListener('click', () => {
        loadStarterTemplate();
      });
    }

    if (resetCanvasBtn) {
      resetCanvasBtn.addEventListener('click', () => {
        const confirmed = typeof window.confirm === 'function'
          ? window.confirm('Reset canvas to starter template? Any unsaved changes will be replaced.')
          : true;
        if (confirmed) {
          loadStarterTemplate(false);
        }
      });
    }

    // 5. Component Drawer Controller
    function openDrawer() {
      if (!componentDrawer) return;
      componentDrawer.classList.add('is-open');
      componentDrawer.setAttribute('aria-hidden', 'false');
      if (drawerSearchInput) {
        drawerSearchInput.focus();
      }
    }

    function closeDrawer() {
      if (!componentDrawer) return;
      componentDrawer.classList.remove('is-open');
      componentDrawer.setAttribute('aria-hidden', 'true');
    }

    if (openDrawerBtn) openDrawerBtn.addEventListener('click', openDrawer);
    if (emptyBrowseBtn) emptyBrowseBtn.addEventListener('click', openDrawer);
    if (closeDrawerBtn) closeDrawerBtn.addEventListener('click', closeDrawer);
    if (drawerBackdrop) drawerBackdrop.addEventListener('click', closeDrawer);

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (componentDrawer && componentDrawer.classList.contains('is-open')) {
          closeDrawer();
        }
      }
    });

    // Drawer Filtering Logic
    function getFilteredFeatures() {
      const query = searchQuery.trim().toLowerCase();

      return registry.filter(feature => {
        const matchedCategory = matchesCategory(feature, activeCategory);
        if (!matchedCategory) return false;

        if (!query) return true;

        const title = (feature.title || feature.name || '').toLowerCase();
        const slug = (feature.slug || '').toLowerCase();
        const desc = (feature.description || '').toLowerCase();
        const tags = Array.isArray(feature.tags) ? feature.tags.map(t => String(t).toLowerCase()) : [];

        return (
          title.includes(query) ||
          slug.includes(query) ||
          desc.includes(query) ||
          tags.some(t => t.includes(query))
        );
      });
    }

    // Drawer live preview observer (lazy mounts iframes into visible cards)
    const drawerPreviewObserver = typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            const box = entry.target;
            const slug = box.getAttribute('data-slug');
            const feature = featuresMap.get(slug);
            if (!feature) return;

            let iframe = box.querySelector('iframe');
            if (entry.isIntersecting) {
              if (!iframe) {
                iframe = document.createElement('iframe');
                iframe.title = feature.title || slug;
                iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups');
                iframe.setAttribute('loading', 'lazy');
                if (feature.files && feature.files.combined) {
                  iframe.srcdoc = feature.files.combined;
                } else {
                  iframe.src = `features/${slug}/index.html`;
                }
                const placeholder = box.querySelector('.drawer-card-preview-placeholder');
                iframe.addEventListener('load', () => {
                  if (placeholder) placeholder.style.display = 'none';
                });
                box.appendChild(iframe);
              }
            } else if (iframe) {
              iframe.remove();
              const placeholder = box.querySelector('.drawer-card-preview-placeholder');
              if (placeholder) placeholder.style.display = '';
            }
          });
        }, { rootMargin: '250px 0px' })
      : null;

    function renderDrawerFeatures() {
      if (!drawerFeatureGrid) return;

      if (drawerPreviewObserver) {
        drawerPreviewObserver.disconnect();
      }

      const filtered = getFilteredFeatures();
      if (drawerCountBadge) {
        drawerCountBadge.textContent = `${filtered.length} Blocks`;
      }

      if (filtered.length === 0) {
        drawerFeatureGrid.innerHTML = `
          <div style="padding: 40px 16px; text-align: center; color: var(--text-muted, #a1a1aa);">
            <div style="font-size: 14px; font-weight: 500; margin-bottom: 4px; color: var(--text-main, #fafafa);">No components found</div>
            <div style="font-size: 12px; color: var(--text-dim, #71717a);">Try clearing your search query or picking another category</div>
          </div>
        `;
        return;
      }

      drawerFeatureGrid.innerHTML = '';
      const fragment = document.createDocumentFragment();

      filtered.forEach(feature => {
        const card = document.createElement('div');
        card.className = 'drawer-feature-card';
        card.setAttribute('role', 'listitem');
        card.setAttribute('data-slug', feature.slug);

        const title = feature.title || feature.name || feature.slug;
        const desc = feature.description || (feature.tags ? feature.tags.join(', ') : 'Ready to stack component');
        const category = feature.category || 'Component';
        const tags = Array.isArray(feature.tags) ? feature.tags.slice(0, 3) : [];

        const singletonType = getSingletonType(feature.slug, title, category);
        const singletonDef = singletonType ? LANDING_PAGE_SINGLETONS[singletonType] : null;
        const existingSingleton = singletonType ? findExistingSingleton(singletonType) : null;
        const isCurrentItem = existingSingleton && existingSingleton.slug === feature.slug;
        const singletonLabel = singletonDef ? singletonDef.name : null;
        const isOptional = singletonDef && singletonDef.necessity === 'optional';
        const addBtnText = isCurrentItem ? 'In Page' : (existingSingleton ? `Replace ${singletonLabel}` : '+ Add to Stack');
        const badgeNeed = singletonDef ? (isOptional ? ' · Optional' : ' · Essential') : '';

        card.innerHTML = `
          <div class="drawer-card-preview-box" data-slug="${feature.slug}">
            <div class="drawer-card-preview-placeholder">Live Preview</div>
          </div>
          <div class="drawer-card-body">
            <div class="drawer-card-header-row">
              <div class="drawer-card-title-group">
                <span class="drawer-card-badge">${escapeHtml(category)}${badgeNeed}</span>
                <div class="drawer-card-title" title="${escapeHtml(title)}">${escapeHtml(title)}</div>
              </div>
              <button type="button" class="drawer-add-btn" aria-label="Add ${escapeHtml(title)} to page stack">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                <span>${addBtnText}</span>
              </button>
            </div>
            <div class="drawer-card-desc" title="${escapeHtml(desc)}">${escapeHtml(desc)}</div>
            ${tags.length ? `
              <div class="drawer-card-footer-row">
                <div class="drawer-card-tags">
                  ${tags.map(t => `<span class="drawer-card-tag">#${escapeHtml(t)}</span>`).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        `;

        const previewBox = card.querySelector('.drawer-card-preview-box');
        if (previewBox && drawerPreviewObserver) {
          drawerPreviewObserver.observe(previewBox);
        }

        const addBtn = card.querySelector('.drawer-add-btn');

        const triggerAdd = () => {
          const res = addOrReplaceLandingSection(feature.slug, {
            title: feature.title || feature.name || feature.slug,
            category: feature.category || 'Component'
          });

          if (res && res.section) {
            setActiveSection(res.section.id);
          }

          if (addBtn) {
            if (!addBtn.dataset.originalHtml) {
              addBtn.dataset.originalHtml = addBtn.innerHTML;
            }
            if (addBtn._restoreTimer) {
              clearTimeout(addBtn._restoreTimer);
            }
            addBtn.innerHTML = res && res.replaced ? `<span>✓ Replaced!</span>` : `<span>✓ Added!</span>`;
            addBtn.style.background = '#10b981';
            addBtn.style.borderColor = '#10b981';
            addBtn.style.color = '#ffffff';

            addBtn._restoreTimer = setTimeout(() => {
              if (addBtn.dataset.originalHtml) {
                addBtn.innerHTML = addBtn.dataset.originalHtml;
                delete addBtn.dataset.originalHtml;
              }
              addBtn.style.background = '';
              addBtn.style.borderColor = '';
              addBtn.style.color = '';
              addBtn._restoreTimer = null;
            }, 900);
          }

          showToast(`Added "${title}" to page stack`);
        };

        if (addBtn) {
          addBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            triggerAdd();
          });
        }

        card.addEventListener('click', () => {
          triggerAdd();
        });

        fragment.appendChild(card);
      });

      drawerFeatureGrid.appendChild(fragment);
    }

    // Category Filter Buttons
    if (drawerCategories) {
      const catPills = drawerCategories.querySelectorAll('.drawer-cat-pill');
      catPills.forEach(pill => {
        pill.addEventListener('click', () => {
          catPills.forEach(p => p.classList.remove('is-active'));
          pill.classList.add('is-active');
          activeCategory = pill.getAttribute('data-category') || 'all';
          renderDrawerFeatures();
        });
      });
    }

    // Live Search Input Filtering
    if (drawerSearchInput) {
      drawerSearchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        if (clearDrawerSearchBtn) {
          clearDrawerSearchBtn.style.display = searchQuery ? 'inline-block' : 'none';
        }
        renderDrawerFeatures();
      });
    }

    if (clearDrawerSearchBtn) {
      clearDrawerSearchBtn.addEventListener('click', () => {
        if (drawerSearchInput) {
          drawerSearchInput.value = '';
          searchQuery = '';
          clearDrawerSearchBtn.style.display = 'none';
          drawerSearchInput.focus();
          renderDrawerFeatures();
        }
      });
    }

    // Drawer View Mode Toggle (Visual vs Compact)
    if (viewVisualBtn && viewCompactBtn && drawerFeatureGrid) {
      viewVisualBtn.addEventListener('click', () => {
        viewVisualBtn.classList.add('is-active');
        viewCompactBtn.classList.remove('is-active');
        drawerFeatureGrid.classList.remove('is-compact');
      });

      viewCompactBtn.addEventListener('click', () => {
        viewCompactBtn.classList.add('is-active');
        viewVisualBtn.classList.remove('is-active');
        drawerFeatureGrid.classList.add('is-compact');
      });
    }

    // 6. Viewport Controls
    function setViewportMode(mode) {
      currentViewport = mode;
      stackManager.setViewport(mode);
      if (viewportStage) {
        viewportStage.setAttribute('data-active-viewport', mode);
      }

      const frameWrapper = document.getElementById('viewportFrameWrapper');
      if (frameWrapper) {
        frameWrapper.classList.remove('is-desktop', 'is-tablet', 'is-mobile');
        frameWrapper.classList.add(`is-${mode}`);
      }

      const buttons = [
        { el: viewportDesktopBtn, mode: 'desktop', label: 'Desktop (100%)' },
        { el: viewportTabletBtn, mode: 'tablet', label: 'Tablet (768px)' },
        { el: viewportMobileBtn, mode: 'mobile', label: 'Mobile (375px)' }
      ];

      buttons.forEach(b => {
        if (b.el) {
          if (b.mode === mode) {
            b.el.classList.add('is-active');
            b.el.setAttribute('aria-pressed', 'true');
            if (viewportDimensionLabel) viewportDimensionLabel.textContent = b.label;
          } else {
            b.el.classList.remove('is-active');
            b.el.setAttribute('aria-pressed', 'false');
          }
        }
      });
    }

    if (viewportDesktopBtn) {
      viewportDesktopBtn.addEventListener('click', () => setViewportMode('desktop'));
    }
    if (viewportTabletBtn) {
      viewportTabletBtn.addEventListener('click', () => setViewportMode('tablet'));
    }
    if (viewportMobileBtn) {
      viewportMobileBtn.addEventListener('click', () => setViewportMode('mobile'));
    }

    // 7. Theme Controls
    if (themePresetSelect) {
      themePresetSelect.addEventListener('change', (e) => {
        const themeKey = e.target.value;
        if (themeKey === 'custom') {
          if (customColorsControls) customColorsControls.style.display = 'inline-flex';
          if (customThemeToggle) customThemeToggle.classList.add('is-active');
          const customColors = {
            bg: bgColorInput ? bgColorInput.value : '#0b0f19',
            text: textColorInput ? textColorInput.value : '#f3f4f6',
            accent: accentColorInput ? accentColorInput.value : '#6366f1'
          };
          applyDynamicTheme(customColors);
          if (stackManager.getState().theme !== 'custom') {
            stackManager.setTheme('custom');
          }
          stackManager.setCustomColors(customColors);
        } else {
          const presets = (window.Assembler && window.Assembler.THEME_PRESETS) || {};
          const preset = presets[themeKey];
          if (preset) {
            if (bgColorInput) bgColorInput.value = preset.bg;
            if (textColorInput) textColorInput.value = preset.text;
            if (accentColorInput) accentColorInput.value = preset.accent;
            applyDynamicTheme(preset);
          }
          stackManager.setTheme(themeKey);
        }
      });
    }

    if (customThemeToggle) {
      customThemeToggle.addEventListener('click', () => {
        if (customColorsControls) {
          const isShown = customColorsControls.style.display !== 'none';
          customColorsControls.style.display = isShown ? 'none' : 'inline-flex';
          customThemeToggle.classList.toggle('is-active', !isShown);
        }
      });
    }

    let themeDebounceTimer = null;

    function handleCustomColorInput() {
      const colors = {
        bg: bgColorInput ? bgColorInput.value : '#0b0f19',
        text: textColorInput ? textColorInput.value : '#f3f4f6',
        accent: accentColorInput ? accentColorInput.value : '#6366f1'
      };

      if (themePresetSelect && themePresetSelect.value !== 'custom') {
        themePresetSelect.value = 'custom';
      }

      // Immediately propagate theme variables to iframe in real time via postMessage/DOM
      applyDynamicTheme(colors);

      // Debounce updating state and srcdoc to prevent lag during rapid slider dragging
      clearTimeout(themeDebounceTimer);
      themeDebounceTimer = setTimeout(() => {
        if (stackManager.getState().theme !== 'custom') {
          stackManager.setTheme('custom');
        }
        stackManager.setCustomColors(colors);
      }, 120);
    }

    function handleCustomColorChange() {
      clearTimeout(themeDebounceTimer);
      const colors = {
        bg: bgColorInput ? bgColorInput.value : '#0b0f19',
        text: textColorInput ? textColorInput.value : '#f3f4f6',
        accent: accentColorInput ? accentColorInput.value : '#6366f1'
      };

      if (themePresetSelect && themePresetSelect.value !== 'custom') {
        themePresetSelect.value = 'custom';
      }

      applyDynamicTheme(colors);

      // Consolidate updates: set theme only if needed, setCustomColors triggers notify() once
      if (stackManager.getState().theme !== 'custom') {
        stackManager.setTheme('custom');
      }
      stackManager.setCustomColors(colors);
    }

    if (bgColorInput) {
      bgColorInput.addEventListener('input', handleCustomColorInput);
      bgColorInput.addEventListener('change', handleCustomColorChange);
    }
    if (textColorInput) {
      textColorInput.addEventListener('input', handleCustomColorInput);
      textColorInput.addEventListener('change', handleCustomColorChange);
    }
    if (accentColorInput) {
      accentColorInput.addEventListener('input', handleCustomColorInput);
      accentColorInput.addEventListener('change', handleCustomColorChange);
    }

    // 8. Open in New Tab Action
    const openInTabBtn = document.getElementById('openInTabBtn') || document.getElementById('openNewTabBtn');
    if (openInTabBtn) {
      openInTabBtn.addEventListener('click', async () => {
        if (!window.Assembler || typeof window.Assembler.assemblePreviewDocument !== 'function') {
          showToast('Assembler engine not available');
          return;
        }

        const state = stackManager.getState();
        const missingSlugs = state.stack
          .map(s => s.slug)
          .filter(slug => slug && !featureCache.has(slug));

        if (missingSlugs.length > 0) {
          await Promise.all(missingSlugs.map(slug => fetchFeatureFiles(slug)));
        }

        const themeConfig = state.theme === 'custom' ? state.customColors : state.theme;
        const fullDoc = window.Assembler.assemblePreviewDocument(state.stack, themeConfig, featuresData);

        try {
          const blob = new Blob([fullDoc], { type: 'text/html;charset=utf-8' });
          const blobUrl = URL.createObjectURL(blob);
          const newTab = window.open(blobUrl, '_blank');
          if (newTab) {
            showToast('Opened live assembled preview in new tab');
            setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
          } else {
            showToast('Pop-up was blocked. Please allow pop-ups for this page.');
          }
        } catch (err) {
          console.error('Error opening preview in new tab:', err);
          showToast('Failed to open preview tab');
        }
      });
    }

    // 9. Export Modal & Project ZIP Generator Controller
    const exportModal = document.getElementById('exportModal');
    const exportModalBackdrop = document.getElementById('exportModalBackdrop');
    const openExportModalBtn = document.getElementById('openExportModalBtn');
    const closeExportModalBtn = document.getElementById('closeExportModalBtn');
    const exportEmptyGuard = document.getElementById('exportEmptyGuard');
    const exportPanelsWrapper = document.getElementById('exportPanelsWrapper');
    const exportEmptyAddBtn = document.getElementById('exportEmptyAddBtn');

    // Export navigation tabs
    const tabZip = document.getElementById('tabZip');
    const tabCode = document.getElementById('tabCode');
    const tabSingleHtml = document.getElementById('tabSingleHtml');
    const panelZip = document.getElementById('panelZip');
    const panelCode = document.getElementById('panelCode');
    const panelSingleHtml = document.getElementById('panelSingleHtml');

    // Code viewer elements
    const exportCodeViewer = document.getElementById('exportCodeViewer');
    const copyCodeBtn = document.getElementById('copyCodeBtn');
    const copyBtnText = document.getElementById('copyBtnText');
    const downloadCurrentCodeBtn = document.getElementById('downloadCurrentCodeBtn');

    // Actions
    const downloadZipBtn = document.getElementById('downloadZipBtn');
    const downloadSingleHtmlBtn = document.getElementById('downloadSingleHtmlBtn');
    const copySingleBundleBtn = document.getElementById('copySingleBundleBtn');
    const copyBundleBtnText = document.getElementById('copyBundleBtnText');

    let activeExportTab = 'zip';
    let activeCodeFile = 'index.html';
    let currentExportBundle = null;
    let currentExportAssets = {};
    let currentSingleHtml = '';

    /**
     * Helper: triggers a browser file download of a Blob or text.
     */
    function triggerDownload(content, filename, mimeType = 'application/octet-stream') {
      try {
        const blob = content instanceof Blob
          ? content
          : new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      } catch (err) {
        console.error('Download error:', err);
        showToast('Download failed');
      }
    }

    /**
     * Helper: Copies text to clipboard with animated visual feedback.
     */
    async function copyToClipboard(text, buttonEl, labelEl, defaultLabel, successLabel = '✓ Copied!') {
      if (!text) {
        showToast('No content to copy');
        return;
      }

      let copied = false;
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        try {
          await navigator.clipboard.writeText(text);
          copied = true;
        } catch (_) {}
      }

      if (!copied && typeof document !== 'undefined') {
        try {
          const tempArea = document.createElement('textarea');
          tempArea.value = text;
          tempArea.style.position = 'fixed';
          tempArea.style.left = '-9999px';
          document.body.appendChild(tempArea);
          tempArea.focus();
          tempArea.select();
          copied = document.execCommand('copy');
          document.body.removeChild(tempArea);
        } catch (_) {}
      }

      if (copied) {
        if (labelEl) labelEl.textContent = successLabel;
        if (buttonEl) {
          buttonEl.classList.add('is-copied');
          buttonEl.style.borderColor = '#10b981';
          buttonEl.style.color = '#10b981';
        }
        showToast('Copied to clipboard!');
        setTimeout(() => {
          if (labelEl) labelEl.textContent = defaultLabel;
          if (buttonEl) {
            buttonEl.classList.remove('is-copied');
            buttonEl.style.borderColor = '';
            buttonEl.style.color = '';
          }
        }, 1500);
      } else {
        showToast('Could not copy to clipboard');
      }
    }

    /**
     * Generates export bundle & single file bundle from current stack and theme.
     */
    async function prepareExportData() {
      const state = stackManager.getState();
      const currentStack = state.stack;

      if (!Array.isArray(currentStack) || currentStack.length === 0) {
        currentExportBundle = null;
        currentExportAssets = {};
        currentSingleHtml = '';
        return null;
      }

      // Ensure all section files are cached
      const missingSlugs = currentStack
        .map(s => s.slug)
        .filter(slug => slug && !featureCache.has(slug));

      if (missingSlugs.length > 0) {
        await Promise.all(missingSlugs.map(slug => fetchFeatureFiles(slug)));
      }

      const themeConfig = state.theme === 'custom' ? state.customColors : state.theme;

      if (window.Assembler && typeof window.Assembler.generateExportBundle === 'function') {
        currentExportBundle = window.Assembler.generateExportBundle(currentStack, themeConfig, featuresData);
      }

      if (window.Assembler && typeof window.Assembler.generateSingleFileBundle === 'function') {
        currentSingleHtml = window.Assembler.generateSingleFileBundle(currentStack, themeConfig, featuresData);
      } else if (window.Assembler && typeof window.Assembler.assemblePreviewDocument === 'function') {
        currentSingleHtml = window.Assembler.assemblePreviewDocument(currentStack, themeConfig, featuresData);
      }

      await bundleLocalAssets();

      return { bundle: currentExportBundle, singleHtml: currentSingleHtml, assets: currentExportAssets };
    }

    const ASSET_MIME_TYPES = {
      png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif',
      svg: 'image/svg+xml', avif: 'image/avif', ico: 'image/x-icon', mp4: 'video/mp4', webm: 'video/webm',
      mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', woff: 'font/woff', woff2: 'font/woff2',
      ttf: 'font/ttf', otf: 'font/otf'
    };
    const assetFetchCache = new Map();

    async function fetchLocalAsset(url) {
      if (assetFetchCache.has(url)) return assetFetchCache.get(url);
      let result = null;
      try {
        const res = await fetch(url);
        if (res.ok) {
          const ext = url.split('.').pop().toLowerCase();
          result = { bytes: new Uint8Array(await res.arrayBuffer()), mime: ASSET_MIME_TYPES[ext] || 'application/octet-stream' };
        }
      } catch (err) {
        console.warn('Could not fetch asset for export:', url, err);
      }
      assetFetchCache.set(url, result);
      return result;
    }

    function bytesToDataUri(bytes, mime) {
      let bin = '';
      for (let i = 0; i < bytes.length; i += 0x8000) {
        bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      }
      return `data:${mime};base64,${btoa(bin)}`;
    }

    /**
     * Root-relative assets (e.g. /vivmgmt/assets/images/a.jpg) only resolve on the dev server.
     * Copies them into the ZIP under assets/ and inlines them as data URIs in the single-file HTML.
     * Assets that cannot be fetched are left untouched and reported in a toast.
     */
    async function bundleLocalAssets() {
      currentExportAssets = {};
      const A = window.Assembler;
      if (!A || !A.findLocalAssetUrls) return;

      const textKeys = ['index.html', 'style.css', 'script.js'];
      const urls = new Set();
      if (currentExportBundle) textKeys.forEach(k => A.findLocalAssetUrls(currentExportBundle[k]).forEach(u => urls.add(u)));
      A.findLocalAssetUrls(currentSingleHtml).forEach(u => urls.add(u));
      if (urls.size === 0) return;

      const list = Array.from(urls);
      const fetched = await Promise.all(list.map(fetchLocalAsset));
      const zipMap = {};
      const inlineMap = {};
      const missing = [];
      list.forEach((url, i) => {
        const asset = fetched[i];
        if (!asset) { missing.push(url); return; }
        const zipPath = 'assets' + decodeURIComponent(url);
        currentExportAssets[zipPath] = asset.bytes;
        zipMap[url] = zipPath;
        inlineMap[url] = bytesToDataUri(asset.bytes, asset.mime);
      });

      if (currentExportBundle) {
        textKeys.forEach(k => {
          if (typeof currentExportBundle[k] === 'string') currentExportBundle[k] = A.rewriteLocalAssetUrls(currentExportBundle[k], zipMap);
        });
      }
      currentSingleHtml = A.rewriteLocalAssetUrls(currentSingleHtml, inlineMap);

      if (missing.length) {
        console.warn('Export: assets not found and left as-is:', missing);
        showToast(`${missing.length} asset(s) could not be bundled (see console)`, 4000);
      }
    }

    /**
     * Updates the code viewer content and button labels based on activeCodeFile.
     */
    function updateCodeView() {
      if (!exportCodeViewer) return;

      if (!currentExportBundle && !currentSingleHtml) {
        exportCodeViewer.value = '// Stack is empty. Add sections to generate code.';
        return;
      }

      const copyLabelMap = {
        'index.html': 'Copy HTML',
        'style.css': 'Copy CSS',
        'script.js': 'Copy JS',
        'single-html': 'Copy Bundle'
      };

      if (copyBtnText) {
        copyBtnText.textContent = copyLabelMap[activeCodeFile] || 'Copy Code';
      }

      if (downloadCurrentCodeBtn) {
        downloadCurrentCodeBtn.style.display = activeCodeFile === 'single-html' ? 'inline-flex' : 'none';
      }

      if (activeCodeFile === 'single-html') {
        exportCodeViewer.value = currentSingleHtml || '';
      } else if (currentExportBundle && currentExportBundle[activeCodeFile] !== undefined) {
        exportCodeViewer.value = currentExportBundle[activeCodeFile] || '';
      } else {
        exportCodeViewer.value = '';
      }
    }

    /**
     * Switches the active export modal tab (zip, code, single-html).
     */
    async function setActiveExportTab(tabName) {
      activeExportTab = tabName;

      const tabs = [
        { el: tabZip, panel: panelZip, name: 'zip' },
        { el: tabCode, panel: panelCode, name: 'code' },
        { el: tabSingleHtml, panel: panelSingleHtml, name: 'single-html' }
      ];

      tabs.forEach(t => {
        if (!t.el) return;
        const isActive = t.name === tabName;
        t.el.classList.toggle('is-active', isActive);
        t.el.setAttribute('aria-selected', isActive ? 'true' : 'false');
        if (t.panel) {
          t.panel.style.display = isActive ? 'block' : 'none';
          t.panel.classList.toggle('is-active', isActive);
        }
      });

      if (tabName === 'code' || tabName === 'single-html') {
        if (!currentExportBundle) {
          await prepareExportData();
        }
        if (tabName === 'code') {
          updateCodeView();
        }
      }
    }

    /**
     * Switches code file subtab (index.html, style.css, script.js, single-html).
     */
    function setActiveCodeSubtab(fileKey) {
      activeCodeFile = fileKey;

      const subtabButtons = document.querySelectorAll('.code-subtabs .subtab-btn');
      subtabButtons.forEach(btn => {
        const key = btn.getAttribute('data-code-file');
        btn.classList.toggle('is-active', key === fileKey);
      });

      updateCodeView();
    }

    /**
     * Opens the Export Modal with zero-section guard check.
     */
    async function openExportModal() {
      if (!exportModal) return;

      const stack = stackManager.getStack();
      const isEmpty = !Array.isArray(stack) || stack.length === 0;

      if (isEmpty) {
        showToast('Please add at least one section before exporting.');
        if (exportEmptyGuard) exportEmptyGuard.style.display = 'flex';
        if (exportPanelsWrapper) exportPanelsWrapper.style.display = 'none';
      } else {
        if (exportEmptyGuard) exportEmptyGuard.style.display = 'none';
        if (exportPanelsWrapper) exportPanelsWrapper.style.display = 'block';
        await prepareExportData();
        updateCodeView();
      }

      exportModal.classList.add('is-open');
      exportModal.setAttribute('aria-hidden', 'false');
    }

    function closeExportModal() {
      if (!exportModal) return;
      exportModal.classList.remove('is-open');
      exportModal.setAttribute('aria-hidden', 'true');
    }

    // Modal Triggers
    if (openExportModalBtn) {
      openExportModalBtn.addEventListener('click', openExportModal);
    }
    if (closeExportModalBtn) {
      closeExportModalBtn.addEventListener('click', closeExportModal);
    }
    if (exportModalBackdrop) {
      exportModalBackdrop.addEventListener('click', closeExportModal);
    }
    if (exportEmptyAddBtn) {
      exportEmptyAddBtn.addEventListener('click', () => {
        closeExportModal();
        openDrawer();
      });
    }

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (exportModal && exportModal.classList.contains('is-open')) {
          closeExportModal();
        }
      }
    });

    // Tab buttons wiring
    if (tabZip) tabZip.addEventListener('click', () => setActiveExportTab('zip'));
    if (tabCode) tabCode.addEventListener('click', () => setActiveExportTab('code'));
    if (tabSingleHtml) tabSingleHtml.addEventListener('click', () => setActiveExportTab('single-html'));

    // Code subtabs wiring
    const codeSubtabs = document.querySelectorAll('.code-subtabs .subtab-btn');
    codeSubtabs.forEach(btn => {
      btn.addEventListener('click', () => {
        const fileKey = btn.getAttribute('data-code-file');
        if (fileKey) setActiveCodeSubtab(fileKey);
      });
    });

    // Copy Code Button (on code subtabs panel)
    if (copyCodeBtn) {
      copyCodeBtn.addEventListener('click', () => {
        const text = exportCodeViewer ? exportCodeViewer.value : '';
        const labelMap = {
          'index.html': 'Copy HTML',
          'style.css': 'Copy CSS',
          'script.js': 'Copy JS',
          'single-html': 'Copy Bundle'
        };
        const defaultLabel = labelMap[activeCodeFile] || 'Copy Code';
        copyToClipboard(text, copyCodeBtn, copyBtnText, defaultLabel, '✓ Copied!');
      });
    }

    // Download Current Code (on Single-File subtab)
    if (downloadCurrentCodeBtn) {
      downloadCurrentCodeBtn.addEventListener('click', () => {
        if (!currentSingleHtml) {
          showToast('No bundle to download');
          return;
        }
        triggerDownload(currentSingleHtml, 'assembled-page.html', 'text/html;charset=utf-8');
        showToast('Downloaded assembled-page.html');
      });
    }

    // Copy Single File Bundle Button (on panelSingleHtml)
    if (copySingleBundleBtn) {
      copySingleBundleBtn.addEventListener('click', () => {
        copyToClipboard(currentSingleHtml, copySingleBundleBtn, copyBundleBtnText, 'Copy Bundle', '✓ Copied!');
      });
    }

    // Download Single File .html Button (on panelSingleHtml)
    if (downloadSingleHtmlBtn) {
      downloadSingleHtmlBtn.addEventListener('click', async () => {
        if (!currentSingleHtml) {
          await prepareExportData();
        }
        if (!currentSingleHtml) {
          showToast('Please add sections before downloading');
          return;
        }
        triggerDownload(currentSingleHtml, 'assembled-page.html', 'text/html;charset=utf-8');
        showToast('Downloaded assembled-page.html');
      });
    }

    /**
     * Download Project ZIP generator.
     * Generates a clean archive with index.html, style.css, script.js, and README.md.
     * Uses window.JSZip if available, otherwise uses native pure-JS zip creator.
     */
    async function handleDownloadZip() {
      const stack = stackManager.getStack();
      if (!Array.isArray(stack) || stack.length === 0) {
        showToast('Please add at least one section before downloading ZIP.');
        return;
      }

      const originalBtnText = downloadZipBtn ? downloadZipBtn.innerHTML : '';
      if (downloadZipBtn) {
        downloadZipBtn.disabled = true;
        downloadZipBtn.innerHTML = `
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" class="spin-icon">
            <line x1="12" y1="2" x2="12" y2="6"></line>
            <line x1="12" y1="18" x2="12" y2="22"></line>
            <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
            <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
            <line x1="2" y1="12" x2="6" y2="12"></line>
            <line x1="18" y1="12" x2="22" y2="12"></line>
            <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
            <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
          </svg>
          <span>Packaging ZIP...</span>
        `;
      }

      try {
        await prepareExportData();
        if (!currentExportBundle) {
          throw new Error('Could not generate export bundle');
        }

        const zipFilename = 'my-assembled-page.zip';

        if (typeof window.JSZip !== 'undefined') {
          // 1. Client-side JSZip
          const zip = new window.JSZip();
          zip.file('index.html', currentExportBundle['index.html']);
          zip.file('style.css', currentExportBundle['style.css']);
          zip.file('script.js', currentExportBundle['script.js']);
          zip.file('README.md', currentExportBundle['README.md']);
          Object.entries(currentExportAssets).forEach(([name, bytes]) => zip.file(name, bytes));
          const blob = await zip.generateAsync({ type: 'blob' });
          triggerDownload(blob, zipFilename, 'application/zip');
        } else if (window.Assembler && typeof window.Assembler.createZipArchive === 'function') {
          // 2. Native Pure-JS ZIP Generator
          const zipBytes = window.Assembler.createZipArchive(Object.assign({}, currentExportBundle, currentExportAssets));
          const blob = new Blob([zipBytes], { type: 'application/zip' });
          triggerDownload(blob, zipFilename, 'application/zip');
        } else {
          throw new Error('No zip generator available');
        }

        if (downloadZipBtn) {
          downloadZipBtn.innerHTML = `<span>✓ Downloaded!</span>`;
          downloadZipBtn.style.background = '#10b981';
        }
        showToast('Downloaded my-assembled-page.zip');

        setTimeout(() => {
          if (downloadZipBtn) {
            downloadZipBtn.innerHTML = originalBtnText;
            downloadZipBtn.style.background = '';
            downloadZipBtn.disabled = false;
          }
        }, 1500);
      } catch (err) {
        console.error('Error generating project ZIP:', err);
        showToast('Failed to generate project ZIP');
        if (downloadZipBtn) {
          downloadZipBtn.innerHTML = originalBtnText;
          downloadZipBtn.disabled = false;
        }
      }
    }

    if (downloadZipBtn) {
      downloadZipBtn.addEventListener('click', handleDownloadZip);
    }

    // Check localStorage for saved builder state
    let hasLoadedSavedState = false;
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.stack) && parsed.stack.length > 0) {
            const prevApplying = isApplyingHistory;
            isApplyingHistory = true;
            if (typeof stackManager.setStack === 'function') {
              stackManager.setStack(parsed.stack);
            } else {
              stackManager.clearStack();
              parsed.stack.forEach(sec => stackManager.insertSection(stackManager.getStack().length, sec));
            }
            if (parsed.theme) {
              stackManager.setTheme(parsed.theme);
            }
            if (parsed.customColors) {
              stackManager.setCustomColors(parsed.customColors);
            }
            if (parsed.viewport) {
              setViewportMode(parsed.viewport);
            }
            isApplyingHistory = prevApplying;
            hasLoadedSavedState = true;

            // If the restored stack already contains a preloader, mark as already played
            const restoredPreloader = stackManager.getStack().find(s => {
              const slug = s.slug || '';
              const cat = s.category || '';
              return slug.includes('preloader') || cat.toLowerCase().includes('preloader');
            });
            if (restoredPreloader) {
              playedPreloaderId = restoredPreloader.id;
            }
          }
        }
      } catch (err) {
        console.warn('Failed to parse saved builder state from localStorage:', err);
        isApplyingHistory = false;
      }
    }

    // Auto-seed starter website template on empty initial stack
    if (!hasLoadedSavedState) {
      if (!stackManager.getStack() || stackManager.getStack().length === 0) {
        loadStarterTemplate(true);
      }
    }

    // Initial sync
    const initialState = stackManager.getState();
    setViewportMode(initialState.viewport || 'desktop');
    if (themePresetSelect) {
      themePresetSelect.value = initialState.theme || 'midnight-dark';
    }
    const currentTheme = initialState.theme === 'custom'
      ? initialState.customColors
      : ((window.Assembler && window.Assembler.THEME_PRESETS && window.Assembler.THEME_PRESETS[initialState.theme]) || null);
    if (currentTheme) {
      if (bgColorInput && currentTheme.bg) bgColorInput.value = currentTheme.bg;
      if (textColorInput && currentTheme.text) textColorInput.value = currentTheme.text;
      if (accentColorInput && currentTheme.accent) accentColorInput.value = currentTheme.accent;
    }

    // Initialize history stack with baseline snapshot
    historyStack = [];
    historyIndex = -1;
    pushHistorySnapshot();

    renderStackList();
    renderElementsCatalog();
    renderDrawerFeatures();
    updatePreview();

    const controller = {
      stackManager,
      featureCache,
      featuresData,
      fetchFeatureFiles,
      updatePreview,
      setViewportMode,
      applyDynamicTheme,
      openExportModal,
      closeExportModal,
      setActiveExportTab,
      setActiveCodeSubtab,
      prepareExportData,
      handleDownloadZip,
      loadStarterTemplate,
      STARTER_SECTIONS,
      renderElementsCatalog,
      getNormalizedCategory,
      matchesCategory,
      WIDGET_CATALOG_ITEMS,
      // Task 5: History Stack Engine & Persistence
      MAX_HISTORY,
      STORAGE_KEY,
      pushHistorySnapshot,
      applyHistoryState,
      undoAction,
      redoAction,
      updateHistoryUI,
      saveStateToStorage,
      getHistoryStack: () => [...historyStack],
      getHistoryIndex: () => historyIndex
    };

    if (typeof window !== 'undefined') {
      window.builderPreview = controller;
      window.builderExport = controller;
      window.builderHistory = controller;
      window.WIDGET_CATALOG_ITEMS = WIDGET_CATALOG_ITEMS;
    }

    return controller;
  }

  // Auto-run when DOM is ready
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initBuilder);
    } else {
      initBuilder();
    }
  }

  // Export for testing or modular environments
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initBuilder, matchesCategory, WIDGET_CATALOG_ITEMS };
  }
})();

/**
 * Insertable in-section widgets (buttons, tables, cards, badges, images) with rendered previews.
 * Loaded by builder.html before builder.js; also usable from Node via require().
 */
(function () {
  'use strict';

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

  if (typeof module !== 'undefined' && module.exports) module.exports = WIDGET_CATALOG_ITEMS;
  if (typeof window !== 'undefined') window.WidgetCatalog = WIDGET_CATALOG_ITEMS;
})();

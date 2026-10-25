/**
 * edvlabs Arena — Centralized CMS Data Store & Default Content (`site-data.js`)
 *
 * Provides:
 * - `window.EDV_MEDIA_LIBRARY`: Catalog of all local images/SVGs in `./assets/`
 * - `window.EDV_DEFAULT_DATA`: Complete default content matching https://edvlabs.example
 * - `window.EDVStore`: Load, save, reset, export/import, image upload, and real-time BroadcastChannel sync
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'edv_site_data_v1';
  const DRAFT_STORAGE_KEY = 'edv_site_draft_v1';
  const CHANNEL_NAME = 'edv_cms_sync_channel';

  const RAW_MEDIA_LIBRARY = [
  {
    "path": "./assets/images/art-01.svg",
    "label": "Harbour Derby",
    "category": "Projects"
  },
  {
    "path": "./assets/images/art-02.svg",
    "label": "Anniversary Campaign",
    "category": "Projects"
  },
  {
    "path": "./assets/images/art-03.svg",
    "label": "Media Day",
    "category": "Projects"
  },
  {
    "path": "./assets/images/art-04.svg",
    "label": "Home Opener",
    "category": "Projects"
  },
  {
    "path": "./assets/images/art-05.svg",
    "label": "Season Launch",
    "category": "Projects"
  },
  {
    "path": "./assets/images/art-06.svg",
    "label": "National Squad",
    "category": "Projects"
  },
  {
    "path": "./assets/images/art-07.svg",
    "label": "Grand Prix Weekend",
    "category": "Projects"
  },
  {
    "path": "./assets/images/art-08.svg",
    "label": "Boot Drop",
    "category": "Projects"
  },
  {
    "path": "./assets/images/art-09.svg",
    "label": "Off-Season Retreat",
    "category": "Projects"
  },
  {
    "path": "./assets/images/art-10.svg",
    "label": "Striker Profile",
    "category": "Projects"
  },
  {
    "path": "./assets/images/art-11.svg",
    "label": "Tennis Open",
    "category": "Projects"
  },
  {
    "path": "./assets/images/art-12.svg",
    "label": "Rivalry Match",
    "category": "Projects"
  },
  {
    "path": "./assets/images/art-13.svg",
    "label": "Kit Reveal",
    "category": "Projects"
  },
  {
    "path": "./assets/images/art-14.svg",
    "label": "Cup Run",
    "category": "Projects"
  },
  {
    "path": "./assets/images/art-15.svg",
    "label": "Night Fixture",
    "category": "Projects"
  },
  {
    "path": "./assets/images/art-16.svg",
    "label": "Capsule Collection",
    "category": "Projects"
  },
  {
    "path": "./assets/images/art-17.svg",
    "label": "Training Camp",
    "category": "Projects"
  },
  {
    "path": "./assets/images/art-18.svg",
    "label": "Supporters Day",
    "category": "Projects"
  },
  {
    "path": "./assets/images/client-1.svg",
    "label": "Northport FC Logo",
    "category": "Logos"
  },
  {
    "path": "./assets/images/client-2.svg",
    "label": "Classic Kits Logo",
    "category": "Logos"
  },
  {
    "path": "./assets/images/client-3.svg",
    "label": "Lumen Sport Logo",
    "category": "Logos"
  },
  {
    "path": "./assets/images/client-4.svg",
    "label": "Broadcast One Logo",
    "category": "Logos"
  },
  {
    "path": "./assets/images/client-5.svg",
    "label": "Media Group Logo",
    "category": "Logos"
  },
  {
    "path": "./assets/images/client-6.svg",
    "label": "Stride Logo",
    "category": "Logos"
  },
  {
    "path": "./assets/images/client-7.svg",
    "label": "Atelier J Logo",
    "category": "Logos"
  },
  {
    "path": "./assets/images/client-8.svg",
    "label": "Kappa Group Logo",
    "category": "Logos"
  },
  {
    "path": "./assets/images/client-9.svg",
    "label": "Rivermouth Logo",
    "category": "Logos"
  },
  {
    "path": "./assets/images/client-10.svg",
    "label": "Nova Labs Logo",
    "category": "Logos"
  },
  {
    "path": "./assets/images/client-11.svg",
    "label": "Pennant Logo",
    "category": "Logos"
  },
  {
    "path": "./assets/images/client-12.svg",
    "label": "Harbour United Logo",
    "category": "Logos"
  },
  {
    "path": "./assets/images/client-13.svg",
    "label": "Fieldwork Logo",
    "category": "Logos"
  }
];

  const EDV_MEDIA_LIBRARY = RAW_MEDIA_LIBRARY.map((item) => ({
    label: item.label,
    src: item.path,
    category: item.category,
  }));

  const EDV_DEFAULT_DATA = {
  "hero": {
    "title": "BOLD CREATIVITY\nFOR THE\nWORLD OF SPORTS",
    "subtitle": "We craft campaigns, stories and collaborations that move sport and culture forward. This is sample copy: replace it with your own.",
    "ctaText": "Get in touch",
    "ctaLink": "#contact",
    "bgImage": "./assets/images/wide-1.svg"
  },
  "clients": [
    {
      "id": "c1",
      "name": "Northport FC",
      "logo": "./assets/images/client-1.svg"
    },
    {
      "id": "c2",
      "name": "Classic Kits",
      "logo": "./assets/images/client-2.svg"
    },
    {
      "id": "c3",
      "name": "Lumen Sport",
      "logo": "./assets/images/client-3.svg"
    },
    {
      "id": "c4",
      "name": "Broadcast One",
      "logo": "./assets/images/client-4.svg"
    },
    {
      "id": "c5",
      "name": "Media Group",
      "logo": "./assets/images/client-5.svg"
    },
    {
      "id": "c6",
      "name": "Stride",
      "logo": "./assets/images/client-6.svg"
    },
    {
      "id": "c7",
      "name": "Atelier J",
      "logo": "./assets/images/client-7.svg"
    },
    {
      "id": "c8",
      "name": "Kappa Group",
      "logo": "./assets/images/client-8.svg"
    },
    {
      "id": "c9",
      "name": "Rivermouth",
      "logo": "./assets/images/client-9.svg"
    },
    {
      "id": "c10",
      "name": "Nova Labs",
      "logo": "./assets/images/client-10.svg"
    },
    {
      "id": "c11",
      "name": "Pennant",
      "logo": "./assets/images/client-11.svg"
    },
    {
      "id": "c12",
      "name": "Harbour United",
      "logo": "./assets/images/client-12.svg"
    },
    {
      "id": "c13",
      "name": "Fieldwork",
      "logo": "./assets/images/client-13.svg"
    }
  ],
  "about": {
    "text": "Rooted in top-level sport, fluent in branding, content and campaigns. edvlabs Arena positions athletes, clubs and brands where they belong: at the heart of culture.",
    "ctaPrimaryText": "Start the conversation",
    "ctaPrimaryLink": "#contact",
    "ctaSecondaryText": "Explore projects",
    "ctaSecondaryLink": "#work",
    "bgImage": "./assets/images/wide-2.svg"
  },
  "projectsSection": {
    "heading": "WORK THAT SPEAKS\nLOUDER THAN WORDS.",
    "footerText": "From kit launches and announcements to player branding and cultural collaborations. Our work tells stories that last beyond the game.",
    "ctaPrimaryText": "Get in touch",
    "ctaPrimaryLink": "#contact",
    "ctaSecondaryText": "Learn more",
    "ctaSecondaryLink": "#services"
  },
  "carouselProjects": [
    {
      "id": "p1",
      "title": "Harbour Derby",
      "image": "./assets/images/art-01.svg",
      "ctaLabel": "LEARN MORE",
      "link": "#contact"
    },
    {
      "id": "p2",
      "title": "Anniversary Campaign",
      "image": "./assets/images/art-02.svg",
      "ctaLabel": "LEARN MORE",
      "link": "#contact"
    },
    {
      "id": "p3",
      "title": "Media Day",
      "image": "./assets/images/art-03.svg",
      "ctaLabel": "LEARN MORE",
      "link": "#contact"
    },
    {
      "id": "p4",
      "title": "Home Opener",
      "image": "./assets/images/art-04.svg",
      "ctaLabel": "LEARN MORE",
      "link": "#contact"
    },
    {
      "id": "p5",
      "title": "Season Launch",
      "image": "./assets/images/art-05.svg",
      "ctaLabel": "LEARN MORE",
      "link": "#contact"
    },
    {
      "id": "p6",
      "title": "National Squad",
      "image": "./assets/images/art-06.svg",
      "ctaLabel": "LEARN MORE",
      "link": "#contact"
    },
    {
      "id": "p7",
      "title": "Grand Prix Weekend",
      "image": "./assets/images/art-07.svg",
      "ctaLabel": "LEARN MORE",
      "link": "#contact"
    },
    {
      "id": "p8",
      "title": "Boot Drop",
      "image": "./assets/images/art-08.svg",
      "ctaLabel": "LEARN MORE",
      "link": "#contact"
    },
    {
      "id": "p9",
      "title": "Off-Season Retreat",
      "image": "./assets/images/art-09.svg",
      "ctaLabel": "LEARN MORE",
      "link": "#contact"
    },
    {
      "id": "p10",
      "title": "Striker Profile",
      "image": "./assets/images/art-10.svg",
      "ctaLabel": "LEARN MORE",
      "link": "#contact"
    },
    {
      "id": "p11",
      "title": "Tennis Open",
      "image": "./assets/images/art-11.svg",
      "ctaLabel": "LEARN MORE",
      "link": "#contact"
    },
    {
      "id": "p12",
      "title": "Rivalry Match",
      "image": "./assets/images/art-12.svg",
      "ctaLabel": "LEARN MORE",
      "link": "#contact"
    },
    {
      "id": "p13",
      "title": "Kit Reveal",
      "image": "./assets/images/art-13.svg",
      "ctaLabel": "LEARN MORE",
      "link": "#contact"
    },
    {
      "id": "p14",
      "title": "Cup Run",
      "image": "./assets/images/art-14.svg",
      "ctaLabel": "LEARN MORE",
      "link": "#contact"
    },
    {
      "id": "p15",
      "title": "Night Fixture",
      "image": "./assets/images/art-15.svg",
      "ctaLabel": "LEARN MORE",
      "link": "#contact"
    },
    {
      "id": "p16",
      "title": "Capsule Collection",
      "image": "./assets/images/art-16.svg",
      "ctaLabel": "LEARN MORE",
      "link": "#contact"
    },
    {
      "id": "p17",
      "title": "Training Camp",
      "image": "./assets/images/art-17.svg",
      "ctaLabel": "LEARN MORE",
      "link": "#contact"
    },
    {
      "id": "p18",
      "title": "Supporters Day",
      "image": "./assets/images/art-18.svg",
      "ctaLabel": "LEARN MORE",
      "link": "#contact"
    }
  ],
  "servicesSection": {
    "heading": "CREATIVE PRECISION.\nCULTURAL DEPTH.",
    "subtitle": "We tailor every collaboration to the client: brands, athletes, clubs and federations.",
    "ctaText": "Let's get started",
    "ctaLink": "#contact",
    "cards": [
      {
        "id": "s1",
        "title": "For Brands",
        "description": "Sport brands live and die by their imagery, from product launches to campaigns that carry a season.",
        "bullets": [
          "Shot from the inside, close to the game",
          "Visual identity that holds up drop after drop",
          "Built to grow with your brand, not restart"
        ],
        "image": "./assets/images/art-03.svg"
      },
      {
        "id": "s2",
        "title": "For Athletes",
        "description": "We look past the transfer and the season, to the person carrying the game.",
        "bullets": [
          "Fewer names, more craft",
          "From one-off shoots to years-long collaborations",
          "Work that grows with your career"
        ],
        "image": "./assets/images/art-08.svg"
      },
      {
        "id": "s3",
        "title": "For Clubs & Federations",
        "description": "Clubs sit on more history than they ever get to show, and most of it never makes it past the archive.",
        "bullets": [
          "Shot with the weight it deserves",
          "Craft that treats identity like it matters",
          "History turned into something worth watching"
        ],
        "image": "./assets/images/art-13.svg"
      }
    ]
  },
  "athletesSection": {
    "heading": "PLAYERS WE'VE\nWORKED WITH",
    "tabAllLabel": "All Athletes",
    "tabExclusiveLabel": "edvlabs Exclusive",
    "athletes": [
      {
        "id": "a1",
        "name": "Luca Ferrand",
        "role": "Northport FC",
        "category": "exclusive",
        "image": "./assets/images/art-04.svg"
      },
      {
        "id": "a2",
        "name": "Jonas Weller",
        "role": "Kestrel United",
        "category": "all",
        "image": "./assets/images/art-05.svg"
      },
      {
        "id": "a3",
        "name": "Mateo Brandt",
        "role": "Harbour United",
        "category": "all",
        "image": "./assets/images/art-06.svg"
      },
      {
        "id": "a4",
        "name": "Sam Okoro",
        "role": "Rivermouth FC",
        "category": "all",
        "image": "./assets/images/art-07.svg"
      },
      {
        "id": "a5",
        "name": "Tobias Lind",
        "role": "Eastgate SC",
        "category": "all",
        "image": "./assets/images/art-08.svg"
      },
      {
        "id": "a6",
        "name": "Marcus Hale",
        "role": "Summit Hoops",
        "category": "all",
        "image": "./assets/images/art-09.svg"
      },
      {
        "id": "a7",
        "name": "Noah Verbeek",
        "role": "Westfield FC",
        "category": "all",
        "image": "./assets/images/art-10.svg"
      },
      {
        "id": "a8",
        "name": "Elias Marten",
        "role": "Dunmore Town",
        "category": "all",
        "image": "./assets/images/art-11.svg"
      },
      {
        "id": "a9",
        "name": "Dries Hollander",
        "role": "Lakeside FC",
        "category": "exclusive",
        "image": "./assets/images/art-12.svg"
      },
      {
        "id": "a10",
        "name": "Rafael Costa",
        "role": "Northport FC",
        "category": "exclusive",
        "image": "./assets/images/art-13.svg"
      },
      {
        "id": "a11",
        "name": "Remy Dalton",
        "role": "Pennant City",
        "category": "exclusive",
        "image": "./assets/images/art-14.svg"
      },
      {
        "id": "a12",
        "name": "Tristan Voss",
        "role": "Eastgate SC",
        "category": "exclusive",
        "image": "./assets/images/art-15.svg"
      },
      {
        "id": "a13",
        "name": "Theo Vandermeer",
        "role": "Old Mill FC",
        "category": "all",
        "image": "./assets/images/art-16.svg"
      },
      {
        "id": "a14",
        "name": "Kaan Ferro",
        "role": "Northport FC",
        "category": "all",
        "image": "./assets/images/art-17.svg"
      }
    ]
  },
  "trailSection": {
    "heading": "edvlabs Arena is building a creative platform where sport meets fashion, art, design and lifestyle. From iconic campaigns to cultural collaborations, our ambition is to shape the next era of sports communication.",
    "ctaPrimaryText": "Get in touch",
    "ctaPrimaryLink": "#contact",
    "ctaSecondaryText": "Check out FAQ",
    "ctaSecondaryLink": "#faq",
    "images": [
      "./assets/images/art-02.svg",
      "./assets/images/art-03.svg",
      "./assets/images/art-04.svg",
      "./assets/images/art-05.svg",
      "./assets/images/art-06.svg",
      "./assets/images/art-07.svg",
      "./assets/images/art-08.svg",
      "./assets/images/art-09.svg",
      "./assets/images/art-10.svg",
      "./assets/images/art-11.svg"
    ]
  },
  "teamSection": {
    "heading": "MEET THE TEAM",
    "members": [
      {
        "id": "t1",
        "name": "Alex Marlowe",
        "role": "Creative Director",
        "email": "alex@edvlabs.example",
        "phone": "+00 000 00 00 00",
        "image": "./assets/images/art-06.svg"
      },
      {
        "id": "t2",
        "name": "Sky Rourke",
        "role": "Content Creator",
        "email": "sky@edvlabs.example",
        "phone": "+00 000 00 00 01",
        "image": "./assets/images/art-11.svg"
      }
    ]
  },
  "readySection": {
    "heading": "READY TO PLAY\nAT THE HIGHEST\nLEVEL?",
    "ctaText": "Start the conversation",
    "ctaLink": "#contact",
    "image": "./assets/images/wide-3.svg"
  },
  "contactSection": {
    "heading": "LET'S BRING YOUR\nVISION TO LIFE",
    "submitText": "Send"
  },
  "faqSection": {
    "heading": "FAQ",
    "items": [
      {
        "id": "f1",
        "question": "Who do we work with?",
        "answer": "Our work combines content, marketing and positioning in a way that feels natural and aligned. We help shape how partners are seen, how they communicate and how they grow. If this resonates, start a conversation."
      },
      {
        "id": "f2",
        "question": "Is edvlabs Arena a social media agency?",
        "answer": "It is more than that. We help players, brands, clubs and federations think about how they present themselves, and we create content that reflects who they are. Social media is often one of the outputs, not the whole plan."
      },
      {
        "id": "f3",
        "question": "What makes edvlabs Arena different?",
        "answer": "We work with a small number of partners who match our standards. With expertise in video, photography, creative direction and production, we turn ideas into well-crafted work."
      },
      {
        "id": "f4",
        "question": "Do you work directly with players or with agencies?",
        "answer": "We work directly with players and stay in close contact with agents, managers and the wider team around them, because strong communication is essential."
      },
      {
        "id": "f5",
        "question": "How many athletes do you work with?",
        "answer": "We collaborate with a range of athletes, through long-term partnerships and project-based work. Every collaboration is built on mutual trust, whatever its length."
      }
    ]
  }
};

  /* ==========================================================================
     Shared Security & Formatting Utilities
     ========================================================================== */
  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatMultilineHtml(str) {
    return escapeHtml(str).replace(/\n/g, '<br>');
  }

  /**
   * Validates a URL/href to prevent javascript:, vbscript:, or unsafe data: URI injection.
   * Allows hash anchors (#...), relative paths (./, ../, /), http:, https:, mailto:, tel:,
   * and safe image data: URLs when allowDataImage is true.
   */
  function sanitizeUrl(rawUrl, fallback = '#', allowDataImage = false) {
    const trimmed = String(rawUrl ?? '').trim();
    if (!trimmed) return fallback;

    // Strip control characters and whitespace tricks
    const cleaned = trimmed.replace(/[\u0000-\u001F\u007F]+/g, '');
    if (cleaned.startsWith('#') || cleaned.startsWith('./') || cleaned.startsWith('../') || cleaned.startsWith('/')) {
      return cleaned;
    }
    if (allowDataImage && /^data:image\/(webp|png|jpeg|jpg|gif|avif);base64,[a-zA-Z0-9+/=]+$/i.test(cleaned)) {
      return cleaned;
    }
    if (/^(https?:|mailto:|tel:)/i.test(cleaned)) {
      return cleaned;
    }
    // Allow plain relative asset paths like "assets/images/foo.webp"
    if (/^[a-zA-Z0-9_\-./]+$/.test(cleaned) && !cleaned.includes(':')) {
      return cleaned;
    }
    return fallback;
  }

  /**
   * Sanitizes a URL for safe interpolation inside CSS `url('...')`
   * Prevents breaking out of quotes or parens.
   */
  function sanitizeCssUrl(rawUrl) {
    const safe = sanitizeUrl(rawUrl, '', true);
    if (!safe) return '';
    return safe.replace(/['"()\\]/g, (ch) => '%' + ch.charCodeAt(0).toString(16).toUpperCase());
  }

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function normalizeSiteData(raw) {
    const base = deepClone(EDV_DEFAULT_DATA);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base;

    const safeStr = (val, fallback) => (typeof val === 'string' ? val : fallback);

    const hero = raw.hero && typeof raw.hero === 'object' ? raw.hero : {};
    base.hero = {
      title: safeStr(hero.title, base.hero.title),
      subtitle: safeStr(hero.subtitle, base.hero.subtitle),
      ctaText: safeStr(hero.ctaText, base.hero.ctaText),
      ctaLink: sanitizeUrl(hero.ctaLink, base.hero.ctaLink),
      bgImage: sanitizeUrl(hero.bgImage, base.hero.bgImage, true),
    };

    if (Array.isArray(raw.clients)) {
      base.clients = raw.clients
        .filter((c) => c && typeof c === 'object')
        .map((c, i) => ({
          id: safeStr(c.id, `c-${i + 1}`),
          name: safeStr(c.name, 'Partner'),
          logo: sanitizeUrl(c.logo || c.image, './assets/images/art-15.svg', true),
        }));
    }

    const about = raw.about && typeof raw.about === 'object' ? raw.about : {};
    base.about = {
      text: safeStr(about.text, base.about.text),
      ctaPrimaryText: safeStr(about.ctaPrimaryText, base.about.ctaPrimaryText),
      ctaPrimaryLink: sanitizeUrl(about.ctaPrimaryLink, base.about.ctaPrimaryLink),
      ctaSecondaryText: safeStr(about.ctaSecondaryText, base.about.ctaSecondaryText),
      ctaSecondaryLink: sanitizeUrl(about.ctaSecondaryLink, base.about.ctaSecondaryLink),
      bgImage: sanitizeUrl(about.bgImage, base.about.bgImage, true),
    };

    const projSec = raw.projectsSection && typeof raw.projectsSection === 'object' ? raw.projectsSection : {};
    base.projectsSection = {
      heading: safeStr(projSec.heading, base.projectsSection.heading),
      footerText: safeStr(projSec.footerText, base.projectsSection.footerText),
      ctaPrimaryText: safeStr(projSec.ctaPrimaryText, base.projectsSection.ctaPrimaryText),
      ctaPrimaryLink: sanitizeUrl(projSec.ctaPrimaryLink, base.projectsSection.ctaPrimaryLink),
      ctaSecondaryText: safeStr(projSec.ctaSecondaryText, base.projectsSection.ctaSecondaryText),
      ctaSecondaryLink: sanitizeUrl(projSec.ctaSecondaryLink, base.projectsSection.ctaSecondaryLink),
    };

    const rawProjects = Array.isArray(raw.carouselProjects)
      ? raw.carouselProjects
      : Array.isArray(projSec.items)
      ? projSec.items
      : null;

    if (rawProjects && rawProjects.length > 0) {
      base.carouselProjects = rawProjects
        .filter((p) => p && typeof p === 'object')
        .map((p, i) => ({
          id: safeStr(p.id, `p-${i + 1}`),
          title: safeStr(p.title, 'Project'),
          alt: safeStr(p.alt || p.title, 'Project'),
          image: sanitizeUrl(p.image, './assets/images/art-08.svg', true),
          ctaLabel: safeStr(p.ctaLabel, 'LEARN MORE'),
          link: sanitizeUrl(p.link, '#contact'),
        }));
    }

    const srv = (raw.servicesSection || raw.services) && typeof (raw.servicesSection || raw.services) === 'object'
      ? (raw.servicesSection || raw.services)
      : {};
    base.servicesSection = {
      heading: safeStr(srv.heading, base.servicesSection.heading),
      subtitle: safeStr(srv.subtitle, base.servicesSection.subtitle),
      ctaText: safeStr(srv.ctaText, base.servicesSection.ctaText),
      ctaLink: sanitizeUrl(srv.ctaLink, base.servicesSection.ctaLink),
      cards: Array.isArray(srv.cards)
        ? srv.cards
            .filter((c) => c && typeof c === 'object')
            .map((c, i) => ({
              id: safeStr(c.id, `s-${i + 1}`),
              title: safeStr(c.title, 'Service'),
              description: safeStr(c.description, ''),
              bullets: Array.isArray(c.bullets) ? c.bullets.map((b) => String(b ?? '')).filter(Boolean) : [],
              image: sanitizeUrl(c.image, './assets/images/art-03.svg', true),
            }))
        : base.servicesSection.cards,
    };

    const ath = (raw.athletesSection || raw.athletes) && typeof (raw.athletesSection || raw.athletes) === 'object'
      ? (raw.athletesSection || raw.athletes)
      : {};
    const rawAthList = Array.isArray(ath.athletes) ? ath.athletes : Array.isArray(ath.items) ? ath.items : null;
    base.athletesSection = {
      heading: safeStr(ath.heading, base.athletesSection.heading),
      tabAllLabel: safeStr(ath.tabAllLabel, base.athletesSection.tabAllLabel),
      tabExclusiveLabel: safeStr(ath.tabExclusiveLabel, base.athletesSection.tabExclusiveLabel),
      athletes: rawAthList
        ? rawAthList
            .filter((a) => a && typeof a === 'object')
            .map((a, i) => ({
              id: safeStr(a.id, `a-${i + 1}`),
              name: safeStr(a.name, 'Athlete'),
              role: safeStr(a.role, ''),
              category: a.category === 'exclusive' ? 'exclusive' : 'all',
              image: sanitizeUrl(a.image, './assets/images/art-10.svg', true),
            }))
        : base.athletesSection.athletes,
    };

    const trail = (raw.trailSection || raw.imageTrail) && typeof (raw.trailSection || raw.imageTrail) === 'object'
      ? (raw.trailSection || raw.imageTrail)
      : {};
    base.trailSection = {
      heading: safeStr(trail.heading || trail.text, base.trailSection.heading),
      ctaPrimaryText: safeStr(trail.ctaPrimaryText, base.trailSection.ctaPrimaryText),
      ctaPrimaryLink: sanitizeUrl(trail.ctaPrimaryLink, base.trailSection.ctaPrimaryLink),
      ctaSecondaryText: safeStr(trail.ctaSecondaryText, base.trailSection.ctaSecondaryText),
      ctaSecondaryLink: sanitizeUrl(trail.ctaSecondaryLink, base.trailSection.ctaSecondaryLink),
      images: Array.isArray(trail.images)
        ? trail.images.map((img) => sanitizeUrl(img, './assets/images/art-12.svg', true)).filter(Boolean)
        : base.trailSection.images,
    };

    const team = (raw.teamSection || raw.team) && typeof (raw.teamSection || raw.team) === 'object'
      ? (raw.teamSection || raw.team)
      : {};
    base.teamSection = {
      heading: safeStr(team.heading, base.teamSection.heading),
      members: Array.isArray(team.members)
        ? team.members
            .filter((m) => m && typeof m === 'object')
            .map((m, i) => ({
              id: safeStr(m.id, `t-${i + 1}`),
              name: safeStr(m.name, 'Team Member'),
              role: safeStr(m.role, ''),
              email: safeStr(m.email, '').replace(/[^\w.+@-]/g, ''),
              phone: safeStr(m.phone, '').replace(/[^\d+\s()-]/g, ''),
              image: sanitizeUrl(m.image, './assets/images/art-09.svg', true),
            }))
        : base.teamSection.members,
    };

    const ready = (raw.readySection || raw.readyToPlay) && typeof (raw.readySection || raw.readyToPlay) === 'object'
      ? (raw.readySection || raw.readyToPlay)
      : {};
    base.readySection = {
      heading: safeStr(ready.heading, base.readySection.heading),
      ctaText: safeStr(ready.ctaText, base.readySection.ctaText),
      ctaLink: sanitizeUrl(ready.ctaLink, base.readySection.ctaLink),
      image: sanitizeUrl(ready.image, base.readySection.image, true),
    };

    const contact = (raw.contactSection || raw.contact) && typeof (raw.contactSection || raw.contact) === 'object'
      ? (raw.contactSection || raw.contact)
      : {};
    base.contactSection = {
      heading: safeStr(contact.heading, base.contactSection.heading),
      submitText: safeStr(contact.submitText, base.contactSection.submitText),
    };

    const faq = (raw.faqSection || raw.faq) && typeof (raw.faqSection || raw.faq) === 'object'
      ? (raw.faqSection || raw.faq)
      : {};
    base.faqSection = {
      heading: safeStr(faq.heading, base.faqSection.heading),
      items: Array.isArray(faq.items)
        ? faq.items
            .filter((f) => f && typeof f === 'object')
            .map((f, i) => ({
              id: safeStr(f.id, `f-${i + 1}`),
              question: safeStr(f.question, 'Question'),
              answer: safeStr(f.answer, ''),
            }))
        : base.faqSection.items,
    };

    return base;
  }

  let syncChannel = null;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      syncChannel = new BroadcastChannel(CHANNEL_NAME);
    }
  } catch (_) {}

  const EDVStore = {
    STORAGE_KEY,
    DRAFT_STORAGE_KEY,
    escapeHtml,
    formatMultilineHtml,
    sanitizeUrl,
    sanitizeCssUrl,
    deepClone,
    normalizeSiteData,

    getDefaultData() {
      return normalizeSiteData(EDV_DEFAULT_DATA);
    },

    getMediaLibrary() {
      const customUploads = this.getCustomUploads();
      return [...customUploads, ...EDV_MEDIA_LIBRARY];
    },

    getCustomUploads() {
      try {
        const raw = localStorage.getItem('edv_custom_uploads_v1');
        const list = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(list)) return [];
        return list
          .filter((item) => item && typeof item === 'object')
          .map((item, idx) => {
            const safeSrc = sanitizeUrl(item.src || item.path, '', true);
            return {
              id: item.id || `upload-${idx}`,
              label: String(item.label || 'Uploaded Image'),
              src: safeSrc,
              category: 'Uploaded',
              custom: true,
            };
          })
          .filter((item) => Boolean(item.src));
      } catch (_) {
        return [];
      }
    },

    addCustomUpload(item) {
      try {
        const safeSrc = sanitizeUrl(item.src || item.path, '', true);
        if (!safeSrc) return null;
        const list = this.getCustomUploads();
        const entry = {
          id: `upload-${Date.now()}`,
          label: String(item.label || 'Uploaded Image'),
          src: safeSrc,
          category: 'Uploaded',
          custom: true,
        };
        list.unshift(entry);
        localStorage.setItem('edv_custom_uploads_v1', JSON.stringify(list));
        return entry;
      } catch (err) {
        console.warn('Could not store uploaded media (storage quota reached):', err);
        return null;
      }
    },

    addUploadedMedia(label, dataUrl) {
      return this.addCustomUpload({ label, src: dataUrl, category: 'Uploaded' });
    },

    deleteCustomUpload(srcOrId) {
      try {
        const list = this.getCustomUploads().filter((item) => item.id !== srcOrId && item.src !== srcOrId);
        localStorage.setItem('edv_custom_uploads_v1', JSON.stringify(list));
        return true;
      } catch (_) {
        return false;
      }
    },

    /**
     * Loads the PUBLISHED site data (visible on index.html and live preview).
     */
    load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return this.getDefaultData();
        return normalizeSiteData(JSON.parse(raw));
      } catch (err) {
        console.warn('Failed to parse published site data, using defaults:', err);
        return this.getDefaultData();
      }
    },

    /**
     * Loads the Admin Panel working draft if one exists, otherwise falls back to published data.
     */
    loadDraft() {
      try {
        const rawDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (rawDraft) {
          return normalizeSiteData(JSON.parse(rawDraft));
        }
      } catch (err) {
        console.warn('Failed to parse draft site data, falling back to published data:', err);
      }
      return this.load();
    },

    /**
     * Checks whether the current draft differs from the published site data.
     */
    hasUnpublishedChanges(candidateDraft) {
      try {
        const draft = candidateDraft ? normalizeSiteData(candidateDraft) : this.loadDraft();
        const published = this.load();
        return JSON.stringify(draft) !== JSON.stringify(published);
      } catch (_) {
        return false;
      }
    },

    /**
     * Saves edits as an unpublished draft in localStorage WITHOUT updating the live website.
     */
    saveDraft(data) {
      const normalized = normalizeSiteData(data);
      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(normalized));
      } catch (err) {
        console.warn('localStorage quota exceeded while saving draft:', err);
      }
      return normalized;
    },

    /**
     * Publishes data to the live website (STORAGE_KEY), clears draft divergence, and notifies all open tabs/previews.
     */
    publish(data) {
      const normalized = normalizeSiteData(data);
      const serialized = JSON.stringify(normalized);
      try {
        localStorage.setItem(STORAGE_KEY, serialized);
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch (err) {
        console.warn('localStorage quota exceeded while publishing site data:', err);
      }

      if (syncChannel) {
        try {
          syncChannel.postMessage({ type: 'EDV_DATA_UPDATED', data: normalized });
        } catch (_) {}
      }
      window.dispatchEvent(new CustomEvent('gp:data-updated', { detail: normalized }));
      return normalized;
    },

    save(data) {
      return this.publish(data);
    },

    onUpdate(callback) {
      let lastHash = '';
      const notifyDeduped = (raw) => {
        const normalized = normalizeSiteData(raw);
        const hash = JSON.stringify(normalized);
        if (hash === lastHash) return;
        lastHash = hash;
        callback(normalized);
      };

      if (syncChannel) {
        syncChannel.addEventListener('message', (e) => {
          if (e.data && e.data.type === 'EDV_DATA_UPDATED') {
            notifyDeduped(e.data.data);
          }
        });
      }
      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY) {
          notifyDeduped(this.load());
        }
      });
      window.addEventListener('gp:data-updated', (e) => {
        if (e.detail) notifyDeduped(e.detail);
      });
    },
  };

  window.EDV_MEDIA_LIBRARY = EDV_MEDIA_LIBRARY;
  window.EDV_DEFAULT_DATA = normalizeSiteData(EDV_DEFAULT_DATA);
  window.EDVStore = EDVStore;
})();

/**
 * Gallery Play — Centralized CMS Data Store & Default Content (`site-data.js`)
 *
 * Provides:
 * - `window.GP_MEDIA_LIBRARY`: Catalog of all local images/SVGs in `./assets/`
 * - `window.GP_DEFAULT_DATA`: Complete default content matching https://gallery-play.be
 * - `window.GPStore`: Load, save, reset, export/import, image upload, and real-time BroadcastChannel sync
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'gp_site_data_v1';
  const DRAFT_STORAGE_KEY = 'gp_site_draft_v1';
  const CHANNEL_NAME = 'gp_cms_sync_channel';

  const RAW_MEDIA_LIBRARY = [
    // Carousel Projects
    { path: './assets/images/20250328_Pieter-Slembrouck-AJAX-Dolberg-115.webp', label: '125 Years of AFC Ajax', category: 'Projects' },
    { path: './assets/images/20240421_HSV-Pieter-Slembrouck-106.webp', label: 'Hamburger Derby (HSV)', category: 'Projects' },
    { path: './assets/images/20240903_Pieter-Slembrouck-Donar-101.webp', label: 'BNXT League Media Day', category: 'Projects' },
    { path: './assets/images/20260730_Gallery-Play_Nova-Beerschot_Home-219.webp', label: 'NOVA x Beerschot', category: 'Projects' },
    { path: './assets/images/20250125_Pieter-Slembrouck-COMO1907-104.webp', label: 'Como 1907', category: 'Projects' },
    { path: './assets/images/20260603_Pieter-Slembrouck_BRD-104.webp', label: 'Belgian Red Devils', category: 'Projects' },
    { path: './assets/images/20240726-Pieter-Slembrouck-SPA-GP-131.webp', label: 'Formula 1 Spa GP', category: 'Projects' },
    { path: './assets/images/20260506_Gallery-Play-ATS-Brugge_Tzolis_Adidas-124-scaled.webp', label: 'Adidas x Tzolis', category: 'Projects' },
    { path: './assets/images/20240806-Pieter-Slembrouck-IBZ-Woodwork-110.webp', label: 'Ibiza Off-Season', category: 'Projects' },
    { path: './assets/images/20250226_Pieter-Slembrouck-Tolu-100.webp', label: 'Tolu Arokodare', category: 'Projects' },
    { path: './assets/images/20260430_Pieter-Slembrouck-Mille-Tennis-107.webp', label: 'Tomorrowland x Belgian Tennis', category: 'Projects' },
    { path: './assets/images/20260503_Pieter-Slembrouck_MANUTD-LIV-108.webp', label: 'Manchester United', category: 'Projects' },
    { path: './assets/images/20250728_Pieter-Slembrouck-Skechers-Steven-Berghuis-PR-Retouches-106.webp', label: 'Skechers Football', category: 'Projects' },
    { path: './assets/images/20241103_Pieter-Slembrouck-LEGIA-131.webp', label: 'Legia Warsaw', category: 'Projects' },
    { path: './assets/images/20250219_Pieter-Slembrouck-PSG-148.webp', label: 'PSG / Champions League', category: 'Projects' },
    { path: './assets/images/20250226_Pieter-Slembrouck-JOUER-135.webp', label: 'Jouer. – à L’aise', category: 'Projects' },
    { path: './assets/images/20240609_pieter-Slembrouck-AL-QADSIAH-118.webp', label: 'Al Qadsiah FC', category: 'Projects' },
    { path: './assets/images/20230318_Rosemary_Pieter.Slembrouck-56.webp', label: 'Rosemary FC', category: 'Projects' },

    // Hero, About, Services & CTA
    { path: './assets/images/gallery-play-hero.webp', label: 'Hero Background', category: 'Sections' },
    { path: './assets/images/galleryplay_about.webp', label: 'About Background', category: 'Sections' },
    { path: './assets/images/ready-to-play.webp', label: 'Ready to Play Portrait', category: 'Sections' },
    { path: './assets/images/20250328_Pieter-Slembrouck-AJAX-Dolberg-110.webp', label: 'Ajax Dolberg (Services)', category: 'Sections' },
    { path: './assets/images/20260603_Pieter-Slembrouck_BRD-101-1.webp', label: 'Belgian Red Devils / Senne Lammens', category: 'Athletes' },

    // Athletes & Team
    { path: './assets/images/20251117_Gallery-Play-Ignace-Content-Day-179-scaled.webp', label: 'Ignace Van der Brempt', category: 'Athletes' },
    { path: './assets/images/20251007_Pieter-Slembrouck-Jerry-selection-119-scaled.webp', label: 'Jerry Afriyie', category: 'Athletes' },
    { path: './assets/images/20260727_Gallery-Play-Ce-Swinnen-KDW-113.webp', label: 'Koni De Winter', category: 'Athletes' },
    { path: './assets/images/20250630_Pieter-Slembrouck-Sebastiaan-Bornauw-323.webp', label: 'Sebastiaan Bornauw', category: 'Athletes' },
    { path: './assets/images/20251003_Pieter-Slembrouck-LIMBXL-106-scaled.jpg', label: 'Jalen Blackmon (LIMBXL)', category: 'Athletes' },
    { path: './assets/images/20260710_Gallery-Play_Nathan-De-Cat_Hoffenheim-164.webp', label: 'Nathan De Cat', category: 'Athletes' },
    { path: './assets/images/20240723-MD17-103.webp', label: 'Mathias Delorge', category: 'Athletes' },
    { path: './assets/images/2025-RUBEN-SIERENS-DAAN-DIERCKX-100-scaled.jpg', label: 'Daan Dierckx', category: 'Athletes' },
    { path: './assets/images/20260813_Gallery-Play_Romeo-Vermant-183-scaled.webp', label: 'Romeo Vermant', category: 'Athletes' },
    { path: './assets/images/20260122_Pieter-Slembrouck-Rein-Van-Helden-R-Antwerp-FC-168.webp', label: 'Rein Van Helden', category: 'Athletes' },
    { path: './assets/images/20260403_Gallery-Play-Tristan-Degreef-Play-Offs-26-287-scaled.webp', label: 'Tristan Degreef', category: 'Athletes' },
    { path: './assets/images/20240612_Thibaud-Verlinden-121.webp', label: 'Thibaud Verlinden', category: 'Athletes' },
    { path: './assets/images/20241106_Pieter-Slembrouck-KAYE-100.webp', label: 'Kaye Furo', category: 'Athletes' },
    { path: './assets/images/20260813_Gallery-Play_Romeo-Vermant-108.webp', label: 'Pieter Slembrouck (Team)', category: 'Team' },
    { path: './assets/images/image00001.webp', label: 'Yaro Mazelyne (Team)', category: 'Team' },

    // Cursor Trail
    { path: './assets/images/case-example-1.webp', label: 'Trail Image 1', category: 'Trail' },
    { path: './assets/images/case-example-2.webp', label: 'Trail Image 2', category: 'Trail' },
    { path: './assets/images/case-example-3.webp', label: 'Trail Image 3', category: 'Trail' },
    { path: './assets/images/case-example-4.webp', label: 'Trail Image 4', category: 'Trail' },
    { path: './assets/images/case-example-5.webp', label: 'Trail Image 5', category: 'Trail' },
    { path: './assets/images/case-example-6.webp', label: 'Trail Image 6', category: 'Trail' },
    { path: './assets/images/case-example-7.webp', label: 'Trail Image 7', category: 'Trail' },
    { path: './assets/images/case-example-8.webp', label: 'Trail Image 8', category: 'Trail' },
    { path: './assets/images/case-example-9.webp', label: 'Trail Image 9', category: 'Trail' },
    { path: './assets/images/case-example-10.webp', label: 'Trail Image 10', category: 'Trail' },

    // Client Logos
    { path: './assets/images/ClubBrugge_logo_Monochrome-White_2stars_RGB.webp.png', label: 'Club Brugge Logo', category: 'Logos' },
    { path: './assets/images/Belgian-Football-Classics.webp', label: 'Belgian Football Classics Logo', category: 'Logos' },
    { path: './assets/images/como.webp', label: 'Como 1907 Logo', category: 'Logos' },
    { path: './assets/images/DAZN.webp', label: 'DAZN Logo', category: 'Logos' },
    { path: './assets/images/dpg.webp', label: 'DPG Media Logo', category: 'Logos' },
    { path: './assets/images/Hoka.webp', label: 'HOKA Logo', category: 'Logos' },
    { path: './assets/images/jouer.webp', label: 'Jouer Logo', category: 'Logos' },
    { path: './assets/images/kgroup.webp', label: 'K Group Logo', category: 'Logos' },
    { path: './assets/images/losc.webp', label: 'LOSC Lille Logo', category: 'Logos' },
    { path: './assets/images/nga.webp', label: 'NGA Logo', category: 'Logos' },
    { path: './assets/images/nova.webp', label: 'NOVA Logo', category: 'Logos' },
    { path: './assets/images/psg.webp', label: 'PSG Logo', category: 'Logos' },
    { path: './assets/images/skechersfootball.webp', label: 'Skechers Football Logo', category: 'Logos' },
  ];

  const GP_MEDIA_LIBRARY = RAW_MEDIA_LIBRARY.map((item) => ({
    label: item.label,
    src: item.path,
    category: item.category,
  }));

  const DEFAULT_CAROUSEL_PROJECTS = [
    { id: 'p1', title: '125 Years of AFC Ajax', image: './assets/images/20250328_Pieter-Slembrouck-AJAX-Dolberg-115.webp', ctaLabel: 'LEARN MORE', link: '#contact' },
    { id: 'p2', title: 'Hamburger Derby', image: './assets/images/20240421_HSV-Pieter-Slembrouck-106.webp', ctaLabel: 'LEARN MORE', link: '#contact' },
    { id: 'p3', title: 'BNXT League Media Day', image: './assets/images/20240903_Pieter-Slembrouck-Donar-101.webp', ctaLabel: 'LEARN MORE', link: '#contact' },
    { id: 'p4', title: 'NOVA x Beerschot', image: './assets/images/20260730_Gallery-Play_Nova-Beerschot_Home-219.webp', ctaLabel: 'LEARN MORE', link: '#contact' },
    { id: 'p5', title: 'Como 1907', image: './assets/images/20250125_Pieter-Slembrouck-COMO1907-104.webp', ctaLabel: 'LEARN MORE', link: '#contact' },
    { id: 'p6', title: 'Belgian Red Devils', image: './assets/images/20260603_Pieter-Slembrouck_BRD-104.webp', ctaLabel: 'LEARN MORE', link: '#contact' },
    { id: 'p7', title: 'Formula 1', image: './assets/images/20240726-Pieter-Slembrouck-SPA-GP-131.webp', ctaLabel: 'LEARN MORE', link: '#contact' },
    { id: 'p8', title: 'Adidas x Tzolis', image: './assets/images/20260506_Gallery-Play-ATS-Brugge_Tzolis_Adidas-124-scaled.webp', ctaLabel: 'LEARN MORE', link: '#contact' },
    { id: 'p9', title: 'Ibiza Off-Season', image: './assets/images/20240806-Pieter-Slembrouck-IBZ-Woodwork-110.webp', ctaLabel: 'LEARN MORE', link: '#contact' },
    { id: 'p10', title: 'Tolu Arokodare', image: './assets/images/20250226_Pieter-Slembrouck-Tolu-100.webp', ctaLabel: 'LEARN MORE', link: '#contact' },
    { id: 'p11', title: 'Tomorrowland x Belgian Tennis', image: './assets/images/20260430_Pieter-Slembrouck-Mille-Tennis-107.webp', ctaLabel: 'LEARN MORE', link: '#contact' },
    { id: 'p12', title: 'Manchester United', image: './assets/images/20260503_Pieter-Slembrouck_MANUTD-LIV-108.webp', ctaLabel: 'LEARN MORE', link: '#contact' },
    { id: 'p13', title: 'Skechers Football', image: './assets/images/20250728_Pieter-Slembrouck-Skechers-Steven-Berghuis-PR-Retouches-106.webp', ctaLabel: 'LEARN MORE', link: '#contact' },
    { id: 'p14', title: 'Legia Warsaw', image: './assets/images/20241103_Pieter-Slembrouck-LEGIA-131.webp', ctaLabel: 'LEARN MORE', link: '#contact' },
    { id: 'p15', title: 'PSG / Champions League', image: './assets/images/20250219_Pieter-Slembrouck-PSG-148.webp', ctaLabel: 'LEARN MORE', link: '#contact' },
    { id: 'p16', title: 'Jouer. – à L’aise', image: './assets/images/20250226_Pieter-Slembrouck-JOUER-135.webp', ctaLabel: 'LEARN MORE', link: '#contact' },
    { id: 'p17', title: 'Al Qadsiah FC', image: './assets/images/20240609_pieter-Slembrouck-AL-QADSIAH-118.webp', ctaLabel: 'LEARN MORE', link: '#contact' },
    { id: 'p18', title: 'Rosemary FC', image: './assets/images/20230318_Rosemary_Pieter.Slembrouck-56.webp', ctaLabel: 'LEARN MORE', link: '#contact' },
  ];

  const GP_DEFAULT_DATA = {
    hero: {
      title: 'CULTURE-SHIFTING\nCREATIVITY FOR THE\nWORLD OF SPORTS',
      subtitle: 'We craft bold campaigns, authentic stories and premium collaborations that move sport and culture forward.',
      ctaText: 'Get in touch',
      ctaLink: '#contact',
      bgImage: './assets/images/gallery-play-hero.webp',
    },
    clients: [
      { id: 'c1', name: 'Club Brugge', logo: './assets/images/ClubBrugge_logo_Monochrome-White_2stars_RGB.webp.png' },
      { id: 'c2', name: 'Belgian Football Classics', logo: './assets/images/Belgian-Football-Classics.webp' },
      { id: 'c3', name: 'Como 1907', logo: './assets/images/como.webp' },
      { id: 'c4', name: 'DAZN', logo: './assets/images/DAZN.webp' },
      { id: 'c5', name: 'DPG Media', logo: './assets/images/dpg.webp' },
      { id: 'c6', name: 'HOKA', logo: './assets/images/Hoka.webp' },
      { id: 'c7', name: 'Jouer', logo: './assets/images/jouer.webp' },
      { id: 'c8', name: 'K Group', logo: './assets/images/kgroup.webp' },
      { id: 'c9', name: 'LOSC Lille', logo: './assets/images/losc.webp' },
      { id: 'c10', name: 'NGA', logo: './assets/images/nga.webp' },
      { id: 'c11', name: 'NOVA', logo: './assets/images/nova.webp' },
      { id: 'c12', name: 'Paris Saint-Germain', logo: './assets/images/psg.webp' },
      { id: 'c13', name: 'Skechers Football', logo: './assets/images/skechersfootball.webp' },
    ],
    about: {
      text: 'Rooted in top-level football, fluent in branding, PR, content, campaigns. Gallery Play positions athletes, clubs, brands where they belong: at the heart of culture.',
      ctaPrimaryText: 'Start the conversation',
      ctaPrimaryLink: '#contact',
      ctaSecondaryText: 'Explore projects',
      ctaSecondaryLink: '#work',
      bgImage: './assets/images/galleryplay_about.webp',
    },
    projectsSection: {
      heading: 'WORK THAT SPEAKS\nLOUDER THAN WORDS.',
      footerText: 'From shirt launches and transfer announcements to player branding and cultural collaborations. Our work tells stories that last beyond the game.',
      ctaPrimaryText: 'Get in touch',
      ctaPrimaryLink: '#contact',
      ctaSecondaryText: 'Learn more',
      ctaSecondaryLink: '#services',
    },
    carouselProjects: DEFAULT_CAROUSEL_PROJECTS,
    servicesSection: {
      heading: 'CREATIVE PRECISION.\nCULTURAL DEPTH.',
      subtitle: 'We tailor every collaboration to the client. Brands, athletes, clubs and federations.',
      ctaText: "Let's get started",
      ctaLink: '#contact',
      cards: [
        {
          id: 's1',
          title: 'For Brands',
          description: 'Football brands live and die by their imagery, from boot launches to kit drops to campaigns that carry a season.',
          bullets: [
            'Shot from the inside, close to the game',
            'Visual identity that holds up drop after drop',
            'Built to grow with your brand, not restart',
          ],
          image: './assets/images/20250728_Pieter-Slembrouck-Skechers-Steven-Berghuis-PR-Retouches-106.webp',
        },
        {
          id: 's2',
          title: 'For Athletes',
          description: 'We don’t work with everyone. We look past the transfer and the season, to the person carrying the game.',
          bullets: [
            'Fewer names, more craft',
            'From transfer shoots to years-long collaborations',
            'Work that grows with your career',
          ],
          image: './assets/images/20260503_Pieter-Slembrouck_MANUTD-LIV-108.webp',
        },
        {
          id: 's3',
          title: 'For Clubs & Federations',
          description: 'Clubs sit on more history than they ever get to show, and most of it never makes it past the archive.',
          bullets: [
            'Shot with the weight it deserves',
            'Craft that treats identity like it matters',
            'History turned into something worth watching',
          ],
          image: './assets/images/20250328_Pieter-Slembrouck-AJAX-Dolberg-110.webp',
        },
      ],
    },
    athletesSection: {
      heading: "PLAYERS WE'VE\nWORKED WITH",
      tabAllLabel: 'All Athletes',
      tabExclusiveLabel: 'Gallery Play Exclusive',
      athletes: [
        { id: 'a1', name: 'Ignace Van der Brempt', role: 'Como 1907', category: 'exclusive', image: './assets/images/20251117_Gallery-Play-Ignace-Content-Day-179-scaled.webp' },
        { id: 'a2', name: 'Jerry Afriyie', role: 'Al Qadsiah FC', category: 'all', image: './assets/images/20251007_Pieter-Slembrouck-Jerry-selection-119-scaled.webp' },
        { id: 'a3', name: 'Koni De Winter', role: 'Genoa CFC / Belgian Red Devils', category: 'all', image: './assets/images/20260727_Gallery-Play-Ce-Swinnen-KDW-113.webp' },
        { id: 'a4', name: 'Senne Lammens', role: 'Royal Antwerp FC', category: 'all', image: './assets/images/20260603_Pieter-Slembrouck_BRD-101-1.webp' },
        { id: 'a5', name: 'Sebastiaan Bornauw', role: 'VfL Wolfsburg', category: 'all', image: './assets/images/20250630_Pieter-Slembrouck-Sebastiaan-Bornauw-323.webp' },
        { id: 'a6', name: 'Jalen Blackmon', role: 'Limburg United', category: 'all', image: './assets/images/20251003_Pieter-Slembrouck-LIMBXL-106-scaled.jpg' },
        { id: 'a7', name: 'Nathan De Cat', role: 'RSC Anderlecht', category: 'all', image: './assets/images/20260710_Gallery-Play_Nathan-De-Cat_Hoffenheim-164.webp' },
        { id: 'a8', name: 'Mathias Delorge', role: 'KAA Gent', category: 'all', image: './assets/images/20240723-MD17-103.webp' },
        { id: 'a9', name: 'Daan Dierckx', role: 'Standard Liège', category: 'exclusive', image: './assets/images/2025-RUBEN-SIERENS-DAAN-DIERCKX-100-scaled.jpg' },
        { id: 'a10', name: 'Romeo Vermant', role: 'Club Brugge', category: 'exclusive', image: './assets/images/20260813_Gallery-Play_Romeo-Vermant-183-scaled.webp' },
        { id: 'a11', name: 'Rein Van Helden', role: 'STVV', category: 'exclusive', image: './assets/images/20260122_Pieter-Slembrouck-Rein-Van-Helden-R-Antwerp-FC-168.webp' },
        { id: 'a12', name: 'Tristan Degreef', role: 'RSC Anderlecht', category: 'exclusive', image: './assets/images/20260403_Gallery-Play-Tristan-Degreef-Play-Offs-26-287-scaled.webp' },
        { id: 'a13', name: 'Thibaud Verlinden', role: 'OH Leuven', category: 'all', image: './assets/images/20240612_Thibaud-Verlinden-121.webp' },
        { id: 'a14', name: 'Kaye Furo', role: 'Club Brugge', category: 'all', image: './assets/images/20241106_Pieter-Slembrouck-KAYE-100.webp' },
      ],
    },
    trailSection: {
      heading: 'Gallery Play is building a creative platform where sport intersects with fashion, art, design and lifestyle. From iconic campaigns to cultural collaborations — our ambition is to shape the next era of sports communication.',
      ctaPrimaryText: 'Get in touch',
      ctaPrimaryLink: '#contact',
      ctaSecondaryText: 'Check out FAQ',
      ctaSecondaryLink: '#faq',
      images: [
        './assets/images/case-example-1.webp',
        './assets/images/case-example-2.webp',
        './assets/images/case-example-3.webp',
        './assets/images/case-example-4.webp',
        './assets/images/case-example-5.webp',
        './assets/images/case-example-6.webp',
        './assets/images/case-example-7.webp',
        './assets/images/case-example-8.webp',
        './assets/images/case-example-9.webp',
        './assets/images/case-example-10.webp',
      ],
    },
    teamSection: {
      heading: 'MEET THE TEAM',
      members: [
        {
          id: 't1',
          name: 'Pieter Slembrouck',
          role: 'Creative Director & Photographer',
          email: 'pieter@gallery-play.com',
          phone: '+32 478 84 29 53',
          image: './assets/images/20260813_Gallery-Play_Romeo-Vermant-108.webp',
        },
        {
          id: 't2',
          name: 'Yaro Mazelyne',
          role: 'Content Creator',
          email: 'yaro@gallery-play.com',
          phone: '+32 468 16 14 29',
          image: './assets/images/image00001.webp',
        },
      ],
    },
    readySection: {
      heading: 'READY TO PLAY\nAT THE HIGHEST\nLEVEL?',
      ctaText: 'Start the conversation',
      ctaLink: '#contact',
      image: './assets/images/ready-to-play.webp',
    },
    contactSection: {
      heading: "LET'S BRING YOUR\nVISION TO LIFE",
      submitText: 'Send',
    },
    faqSection: {
      heading: 'FAQ',
      items: [
        {
          id: 'f1',
          question: 'Who do we work with?',
          answer: 'Our work combines content, marketing and positioning in a way that feels natural and aligned. We help shape how our partners are seen, how they communicate and how they grow over time. If this resonates, let’s start a conversation.',
        },
        {
          id: 'f2',
          question: 'Is Gallery Play a social media agency?',
          answer: 'Gallery Play is more than just a social media agency. We help players, brands, clubs and federations think about how they present themselves, and we create content that reflects who they are. Social media is often one of the outputs, not the starting point.',
        },
        {
          id: 'f3',
          question: 'What makes Gallery Play different?',
          answer: 'We work with a carefully selected number of partners who align with our standards and values. With expertise in video, photography, VFX, creative direction and production, supported by a strong creative network, we turn ideas into well-crafted work. The result is reflected across our projects.',
        },
        {
          id: 'f4',
          question: 'Do you work directly with players or with agencies?',
          answer: 'We work directly with players and stay in close contact with agents, managers and the wider team around them. We believe strong communication is essential, which is why we collaborate closely with everyone involved to create the best possible outcome.',
        },
        {
          id: 'f5',
          question: 'How many athletes do you work with?',
          answer: 'We collaborate with a wide range of athletes, both through long-term partnerships and project-based work. Every collaboration is built on mutual trust and recognition, regardless of its duration. If you feel aligned with our approach or have a unique idea in mind, let’s start the conversation.',
        },
      ],
    },
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
    const base = deepClone(GP_DEFAULT_DATA);
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
          logo: sanitizeUrl(c.logo || c.image, './assets/images/psg.webp', true),
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
          image: sanitizeUrl(p.image, './assets/images/20250328_Pieter-Slembrouck-AJAX-Dolberg-115.webp', true),
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
              image: sanitizeUrl(c.image, './assets/images/20250328_Pieter-Slembrouck-AJAX-Dolberg-110.webp', true),
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
              image: sanitizeUrl(a.image, './assets/images/20260813_Gallery-Play_Romeo-Vermant-183-scaled.webp', true),
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
        ? trail.images.map((img) => sanitizeUrl(img, './assets/images/case-example-1.webp', true)).filter(Boolean)
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
              image: sanitizeUrl(m.image, './assets/images/image00001.webp', true),
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

  const GPStore = {
    STORAGE_KEY,
    DRAFT_STORAGE_KEY,
    escapeHtml,
    formatMultilineHtml,
    sanitizeUrl,
    sanitizeCssUrl,
    deepClone,
    normalizeSiteData,

    getDefaultData() {
      return normalizeSiteData(GP_DEFAULT_DATA);
    },

    getMediaLibrary() {
      const customUploads = this.getCustomUploads();
      return [...customUploads, ...GP_MEDIA_LIBRARY];
    },

    getCustomUploads() {
      try {
        const raw = localStorage.getItem('gp_custom_uploads_v1');
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
        localStorage.setItem('gp_custom_uploads_v1', JSON.stringify(list));
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
        localStorage.setItem('gp_custom_uploads_v1', JSON.stringify(list));
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
          syncChannel.postMessage({ type: 'GP_DATA_UPDATED', data: normalized });
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
          if (e.data && e.data.type === 'GP_DATA_UPDATED') {
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

  window.GP_MEDIA_LIBRARY = GP_MEDIA_LIBRARY;
  window.GP_DEFAULT_DATA = normalizeSiteData(GP_DEFAULT_DATA);
  window.GPStore = GPStore;
})();

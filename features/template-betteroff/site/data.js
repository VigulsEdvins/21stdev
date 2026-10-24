/**
 * Better Off® — THE LOOKBACK Centralized CMS Store & Default Content ()
 *
 * Provides:
 * - : Pre-cataloged local assets in 
 * - : Full baseline content matching https://tlb.betteroff.studio
 * - : Reactive data access, LocalStorage persistence, BroadcastChannel real-time sync,
 *                     JSON export/import, article and track CRUD operations.
 */

(function (global) {
  'use strict';

  var STORAGE_KEY = 'tlb_site_data_v1';
  var DRAFT_STORAGE_KEY = 'tlb_site_draft_v1';
  var CHANNEL_NAME = 'tlb_cms_sync_channel';

  var TLB_MEDIA_LIBRARY = [
  {
    "path": "./assets/images/99-cents-only-store-gallery-exhibition.webp",
    "label": "99 Cents Only Store Gallery Exhibition",
    "category": "Covers"
  },
  {
    "path": "./assets/images/asap-x-rayban.webp",
    "label": "Asap X Rayban",
    "category": "Covers"
  },
  {
    "path": "./assets/images/broncho-jams.webp",
    "label": "Broncho Jams",
    "category": "Covers"
  },
  {
    "path": "./assets/images/ch-11-shit-waves-hawaii.webp",
    "label": "Ch 11 Shit Waves Hawaii",
    "category": "Covers"
  },
  {
    "path": "./assets/images/converse-shoe-drop-by-works-studio.webp",
    "label": "Converse Shoe Drop By Works Studio",
    "category": "Covers"
  },
  {
    "path": "./assets/images/defective-units-vol-1.webp",
    "label": "Defective Units Vol 1",
    "category": "Covers"
  },
  {
    "path": "./assets/images/fashion.webp",
    "label": "Fashion",
    "category": "Covers"
  },
  {
    "path": "./assets/images/favicon.gif",
    "label": "Favicon",
    "category": "System"
  },
  {
    "path": "./assets/images/helge-tscharn-capsule.webp",
    "label": "Helge Tscharn Capsule",
    "category": "Covers"
  },
  {
    "path": "./assets/images/kelly-slater-retires.webp",
    "label": "Kelly Slater Retires",
    "category": "Covers"
  },
  {
    "path": "./assets/images/kendrick-lamar-taps-willy-chavarria-for-super-bowl-halftime-collection.webp",
    "label": "Kendrick Lamar Taps Willy Chavarria For Super Bowl Halftime Collection",
    "category": "Covers"
  },
  {
    "path": "./assets/images/mascot-book.webp",
    "label": "Mascot Book",
    "category": "Covers"
  },
  {
    "path": "./assets/images/neon-pill.webp",
    "label": "Neon Pill",
    "category": "Covers"
  },
  {
    "path": "./assets/images/new-balance-933-andrew-reynolds.webp",
    "label": "New Balance 933 Andrew Reynolds",
    "category": "Covers"
  },
  {
    "path": "./assets/images/nigo-and-pharrell-williams-appointed-as-creative-advisors-for-not-a-hotel.webp",
    "label": "Nigo And Pharrell Williams Appointed As Creative Advisors For Not A Hotel",
    "category": "Covers"
  },
  {
    "path": "./assets/images/noise.png",
    "label": "Noise",
    "category": "System"
  },
  {
    "path": "./assets/images/north-face-in-early-days.webp",
    "label": "North Face In Early Days",
    "category": "Covers"
  },
  {
    "path": "./assets/images/off-white-state-of-resistance.webp",
    "label": "Off White State Of Resistance",
    "category": "Covers"
  },
  {
    "path": "./assets/images/pocket-vol-12.webp",
    "label": "Pocket Vol 12",
    "category": "Covers"
  },
  {
    "path": "./assets/images/post-malone-at-wild-horses-festival-in-san-diego.webp",
    "label": "Post Malone At Wild Horses Festival In San Diego",
    "category": "Covers"
  },
  {
    "path": "./assets/images/post-malone-f1-trillion.webp",
    "label": "Post Malone F1 Trillion",
    "category": "Covers"
  },
  {
    "path": "./assets/images/redman-muddy-water-too-album-drop.webp",
    "label": "Redman Muddy Water Too Album Drop",
    "category": "Covers"
  },
  {
    "path": "./assets/images/sora-launches.webp",
    "label": "Sora Launches",
    "category": "Covers"
  },
  {
    "path": "./assets/images/stab-high-japan.webp",
    "label": "Stab High Japan",
    "category": "Covers"
  },
  {
    "path": "./assets/images/stussy-autumn-drop.webp",
    "label": "Stussy Autumn Drop",
    "category": "Covers"
  },
  {
    "path": "./assets/images/surfer-aloslebir-108-foot-monster-wave.webp",
    "label": "Surfer Aloslebir 108 Foot Monster Wave",
    "category": "Covers"
  },
  {
    "path": "./assets/images/the-kate-bellm-interview.webp",
    "label": "The Kate Bellm Interview",
    "category": "Covers"
  },
  {
    "path": "./assets/images/the-legend-of-phil-shao.webp",
    "label": "The Legend Of Phil Shao",
    "category": "Covers"
  },
  {
    "path": "./assets/images/the-sprawl.webp",
    "label": "The Sprawl",
    "category": "Covers"
  },
  {
    "path": "./assets/images/track_1.webp",
    "label": "Track_1",
    "category": "Tracks"
  },
  {
    "path": "./assets/images/track_10.webp",
    "label": "Track_10",
    "category": "Tracks"
  },
  {
    "path": "./assets/images/track_11.webp",
    "label": "Track_11",
    "category": "Tracks"
  },
  {
    "path": "./assets/images/track_12.webp",
    "label": "Track_12",
    "category": "Tracks"
  },
  {
    "path": "./assets/images/track_13.webp",
    "label": "Track_13",
    "category": "Tracks"
  },
  {
    "path": "./assets/images/track_14.webp",
    "label": "Track_14",
    "category": "Tracks"
  },
  {
    "path": "./assets/images/track_15.webp",
    "label": "Track_15",
    "category": "Tracks"
  },
  {
    "path": "./assets/images/track_2.webp",
    "label": "Track_2",
    "category": "Tracks"
  },
  {
    "path": "./assets/images/track_3.webp",
    "label": "Track_3",
    "category": "Tracks"
  },
  {
    "path": "./assets/images/track_4.webp",
    "label": "Track_4",
    "category": "Tracks"
  },
  {
    "path": "./assets/images/track_5.webp",
    "label": "Track_5",
    "category": "Tracks"
  },
  {
    "path": "./assets/images/track_6.webp",
    "label": "Track_6",
    "category": "Tracks"
  },
  {
    "path": "./assets/images/track_7.webp",
    "label": "Track_7",
    "category": "Tracks"
  },
  {
    "path": "./assets/images/track_8.webp",
    "label": "Track_8",
    "category": "Tracks"
  },
  {
    "path": "./assets/images/track_9.webp",
    "label": "Track_9",
    "category": "Tracks"
  },
  {
    "path": "./assets/images/welcome-to-the-team.webp",
    "label": "Welcome To The Team",
    "category": "Covers"
  },
  {
    "path": "./assets/images/will-ai-kill-the-creative-business-or-save-it.webp",
    "label": "Will Ai Kill The Creative Business Or Save It",
    "category": "Covers"
  },
  {
    "path": "./assets/images/zipper-surf-film.webp",
    "label": "Zipper Surf Film",
    "category": "Covers"
  }
];

  var TLB_DEFAULT_DATA = {
  "meta": {
    "siteTitle": "THE LOOKBACK \u2014 Better Off\u00ae",
    "headerTitle": "Better Off\u00ae",
    "headerSubtitle": "THE LOOKBACK",
    "headerYear": "(BO\u00aeS/2026)",
    "description": "Welcome to The Lookback \u2014 a digital reflection of our pulse, taste, and personality. Moments, music, and work that keep us moving.",
    "noiseOverlay": true,
    "soundEnabledByDefault": true
  },
  "about": {
    "badgeLeft": "( TLB )",
    "badgeRight": "( 24-26 )",
    "title": "\"THE LOOKBACK\"",
    "yearLabel": "(TLB/2026)",
    "heroHeading": "YOUR LIVING ARCHIVE OF BETTER OFF\u00ae",
    "manifesto1": "WELCOME TO THE LOOKBACK \u2014 A DIGITAL REFLECTION OF OUR PULSE AND PERSONALITY. THIS IS WHERE WE LOG THE MOMENTS THAT MOVED US, INDUSTRY DROPS THAT HIT OUR RADAR, MUSIC THAT KEPT THE STUDIO LOUD, AND WORK WE BELIEVE DESERVES THE WORLD. IT'S HAPPENINGS, FILTERED THROUGH OUR LENS. A REPOSITORY OF TASTE. A FLEX, IF WE'RE BEING HONEST.",
    "manifesto2": "IT'S NOT SO MUCH NOSTALGIA. IT'S AN ONGOING EQUATION. WE LOOK BACK TO MOVE FORWARD WITH CLARITY. EVERY MILESTONE, EVERY SPARK, EVERY OBSESSION ARCHIVED HERE MAPS THE EVOLUTION OF BETTER OFF\u00ae. WHAT INSPIRED US. WHAT CHALLENGED US. WHAT WE BUILT BECAUSE WE HAD TO BUILD IT. THE PAST SHAPES THE PRESENT. THE PRESENT BUILDS THE FUTURE. AND WE CHOOSE TO MOVE WITH INTENTION.",
    "pillars": [
      {
        "num": "(1)",
        "title": "OUR HIGHLIGHTS",
        "text": "THE WINS, THE WORK, THE MOMENTS THAT DEFINED THE YEAR\u2014SIGNATURE PROJECTS, RECOGNITIONS, AND MILESTONES TO SHOWCASE WHAT PUSHES US FORWARD."
      },
      {
        "num": "(2)",
        "title": "WHAT INSPIRED US",
        "text": "THE INSPIRATIONAL CURRENTS, PRODUCT DROPS, COLLABORATIONS, AND SOUNDS THAT KEPT OUR THINKING SHARP AND OUR KEYBOARDS HUMMING."
      },
      {
        "num": "(3)",
        "title": "LOOKING FORWARD",
        "text": "WHAT'S NEXT. THE IDEAS IN MOTION, THE VISION IN DEVELOPMENT, AND THE DIRECTION WE'RE STEPPING TOWARD\u2014ON PURPOSE."
      }
    ],
    "thanksHeading": "THANK YOU FOR TAPPING IN WITH US. THE LOOKBACK IS ONLY PART OF THE STORY. WE'RE BUILDING WHAT'S NEXT IN REAL TIME.",
    "tagline": "STAY MOVING. STAY BETTER OFF\u00ae.",
    "copyright": "\u00a9Better Off\u00ae/2026",
    "videoSrc": "./assets/videos/render-big.mp4",
    "contactEmail": "hello@betteroff.studio"
  },
  "tracks": [
    {
      "id": "SyUnLLK4RkyQPEB8qSYvhQ",
      "title": "Easy Way Out",
      "artist": "Broncho",
      "audioUrl": "https://www.datocms-assets.com/106915/1771680462-easy-way-out.mp3",
      "thumbnail": "./assets/images/track_1.webp"
    },
    {
      "id": "PQKEBbECTSekZqT6x6Pr-g",
      "title": "21st Century (Digital Boy)",
      "artist": "Bad Religion",
      "audioUrl": "https://www.datocms-assets.com/106915/1771680027-21st-century-digital-boy.mp3",
      "thumbnail": "./assets/images/track_2.webp"
    },
    {
      "id": "JUpFEIeETnCmDK1T94fIjw",
      "title": "Famous (ft. Rihanna)",
      "artist": "Kanye West",
      "audioUrl": "https://www.datocms-assets.com/106915/1771680679-kanye-west-famous-ft-rihanna.mp3",
      "thumbnail": "./assets/images/track_3.webp"
    },
    {
      "id": "NvX_e94KR7ynxSt0Hzlwbw",
      "title": "Wrong Ones (ft. Tim McGraw)",
      "artist": "Post Malone",
      "audioUrl": "https://www.datocms-assets.com/106915/1771680836-post-malone-wrong-ones-lyric-video-ft-tim-mcgraw.mp3",
      "thumbnail": "./assets/images/track_4.webp"
    },
    {
      "id": "e8FAAZdOQA-FaG_5mtks6g",
      "title": "All Choked Up",
      "artist": "Broncho",
      "audioUrl": "https://www.datocms-assets.com/106915/1771680127-broncho-all-choked-up.mp3",
      "thumbnail": "./assets/images/track_5.webp"
    },
    {
      "id": "D9JlSiCiSoiXjO4I8yIPQA",
      "title": "Chrome Dipped",
      "artist": "Civic",
      "audioUrl": "https://www.datocms-assets.com/106915/1771680231-civic-chrome-dipped-official-video.mp3",
      "thumbnail": "./assets/images/track_6.webp"
    },
    {
      "id": "Dg_eWD6zT8-GyFELmBRbdA",
      "title": "Overdrive",
      "artist": "Post Malone",
      "audioUrl": "https://www.datocms-assets.com/106915/1771680925-post-malone-overdrive-official-live-performance-vevo.mp3",
      "thumbnail": "./assets/images/track_7.webp"
    },
    {
      "id": "E724kNNkS7uwX3d8Urmikg",
      "title": "Feel the Pain",
      "artist": "Dinosaur Jr.",
      "audioUrl": "https://www.datocms-assets.com/106915/1771680355-dinosaur-jr-feel-the-pain.mp3",
      "thumbnail": "./assets/images/track_8.webp"
    },
    {
      "id": "Ly-P6Hr-RFOPrU16ZxJB-A",
      "title": "Father Stretch My Hands Pt. 1",
      "artist": "Kanye West",
      "audioUrl": "https://www.datocms-assets.com/106915/1771680590-father-stretch-my-hands-pt-1.mp3",
      "thumbnail": "./assets/images/track_9.webp"
    },
    {
      "id": "XPze56ETQ4aWaf_DP7gSkg",
      "title": "Hide My Gun",
      "artist": "Post Malone (ft. Hardy)",
      "audioUrl": "https://www.datocms-assets.com/106915/1771680773-post-malone-hide-my-gun-lyrics-ft-hardy.mp3",
      "thumbnail": "./assets/images/track_10.webp"
    },
    {
      "id": "cp0oebaQRJ2j-1qO0n09rw",
      "title": "Start Choppin'",
      "artist": "Dinosaur Jr",
      "audioUrl": "https://www.datocms-assets.com/106915/1772288217-start-choppin.mp3",
      "thumbnail": "./assets/images/track_11.webp"
    },
    {
      "id": "Yqfa43YhTeObiPbFypDSbg",
      "title": "Dynomite ft. Sheek Louch ",
      "artist": "Redman",
      "audioUrl": "https://www.datocms-assets.com/106915/1772288270-redman-dynomite-ft-sheek-louch-audio.mp3",
      "thumbnail": "./assets/images/track_12.webp"
    },
    {
      "id": "G6BuiHR2RESqrpDpCWCBnw",
      "title": "Looka Here ft. KRS-One ",
      "artist": "Redman",
      "audioUrl": "https://www.datocms-assets.com/106915/1772288326-redman-looka-here-ft-krs-one-audio.mp3",
      "thumbnail": "./assets/images/track_13.webp"
    },
    {
      "id": "ApSvZ-zsQTWwUh87BVN8rw",
      "title": "For Heavens Sake",
      "artist": "Wu-Tang Clan",
      "audioUrl": "https://www.datocms-assets.com/106915/1772372077-wu-tang-clan-for-heavens-sake-visual-playlist.mp3",
      "thumbnail": "./assets/images/track_14.webp"
    },
    {
      "id": "G4PFVek2SMSFbD1w_z7pEA",
      "title": "Waiting Room",
      "artist": "Fugazi",
      "audioUrl": "https://www.datocms-assets.com/106915/1772377620-waiting-room.mp3",
      "thumbnail": "./assets/images/track_15.webp"
    }
  ],
  "articles": [
    {
      "id": "biwttKZlSUGqPmg1TwC3dA",
      "index": 1,
      "title": "99 Cents Only Store Gallery exhibition",
      "slug": "99-cents-only-store-gallery-exhibition",
      "month": "MARCH",
      "tag": "INSPIRE",
      "date": "2026-03-02",
      "cover": "https://www.datocms-assets.com/106915/1773067116-99cent_grid-1.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://www.youtube.com/watch?v=JRjg9YrF7X4",
      "aspect": 1.25,
      "excerpt": "99 Cents Only Store Gallery exhibition: curated insight from March archive.",
      "content": "<p>Welcome to <strong>99 Cents Only Store Gallery exhibition</strong>, featured in our MARCH INSPIRE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "ISDkJ8yBT0OwPIOMaQF_NQ",
      "index": 2,
      "title": "DEFECTIVE UNITS \u2014 VOL. 1",
      "slug": "defective-units-vol-1",
      "month": "MARCH",
      "tag": "INSPIRE",
      "date": "2026-03-09",
      "cover": "https://www.datocms-assets.com/106915/1773065938-defectiveunits_grid-1.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://www.formermerchandise.com/pages/defect?_kx=LGM6Nq0y4vOW5sStIWIwcBKFOu59f9WSTH6Xo6I-ubE.TEk4uh",
      "aspect": 0.8,
      "excerpt": "DEFECTIVE UNITS \u2014 VOL. 1: curated insight from March archive.",
      "content": "<p>Welcome to <strong>DEFECTIVE UNITS \u2014 VOL. 1</strong>, featured in our MARCH INSPIRE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "SG_kQZzmTfK6E6fqLn5jIg",
      "index": 3,
      "title": "Welcome To The Team",
      "slug": "welcome-to-the-team",
      "month": "JULY",
      "tag": "SHOWCASE",
      "date": "2025-07-01",
      "cover": "./assets/images/welcome-to-the-team.webp",
      "url": "https://betteroff.studio",
      "aspect": 1.25,
      "excerpt": "Welcome To The Team: curated insight from July archive.",
      "content": "<p>Welcome to <strong>Welcome To The Team</strong>, featured in our JULY SHOWCASE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "RuD1wwnBSx-NOVatXVbPag",
      "index": 4,
      "title": "THE LEGEND OF PHIL SHAO",
      "slug": "the-legend-of-phil-shao",
      "month": "FEBRUARY",
      "tag": "INSPIRE",
      "date": "2026-02-23",
      "cover": "https://www.datocms-assets.com/106915/1771606145-tlb-cover-8.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://www.thrashermagazine.com/articles/videos/the-legend-of-phil-shao-documentary/#more-videos",
      "aspect": 0.8,
      "excerpt": "THE LEGEND OF PHIL SHAO: curated insight from February archive.",
      "content": "<p>Welcome to <strong>THE LEGEND OF PHIL SHAO</strong>, featured in our FEBRUARY INSPIRE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "NC5c8kArSJSZOiW3srGg_w",
      "index": 5,
      "title": "NEW BALANCE 933 ANDREW REYNOLDS",
      "slug": "new-balance-933-andrew-reynolds",
      "month": "AUGUST",
      "tag": "INSPIRE",
      "date": "2025-08-16",
      "cover": "https://www.datocms-assets.com/106915/1771602036-tlb-cover-5.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://www.youtube.com/watch?v=PwNr4oCCJ7Q",
      "aspect": 1.25,
      "excerpt": "NEW BALANCE 933 ANDREW REYNOLDS: curated insight from August archive.",
      "content": "<p>Welcome to <strong>NEW BALANCE 933 ANDREW REYNOLDS</strong>, featured in our AUGUST INSPIRE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "CjzOszBzTguGLbF9L6iOsg",
      "index": 6,
      "title": "CH. 11  SHIT WAVES HAWAII ",
      "slug": "ch-11-shit-waves-hawaii",
      "month": "JUNE",
      "tag": "INSPIRE",
      "date": "2025-06-04",
      "cover": "https://www.datocms-assets.com/106915/1771601329-tlb-cover-3.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://www.youtube.com/watch?v=f0mw6F0eSq8&list=RDf0mw6F0eSq8&start_radio=1",
      "aspect": 0.8,
      "excerpt": "CH. 11  SHIT WAVES HAWAII : curated insight from June archive.",
      "content": "<p>Welcome to <strong>CH. 11  SHIT WAVES HAWAII </strong>, featured in our JUNE INSPIRE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "VDhH9Ut3SmiAW-vTjA1BkQ",
      "index": 7,
      "title": "Post Malone F1 Trillion ",
      "slug": "post-malone-f1-trillion",
      "month": "AUGUST",
      "tag": "INSPIRE",
      "date": "2024-08-01",
      "cover": "https://www.datocms-assets.com/106915/1739993017-tlb_betteroffstudio_aug-2024_inspire-8.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://www.youtube.com/watch?v=1T6w0OLwXwA&list=PLxA687tYuMWhBkBH4njwSXvU0q-HCkK8Q",
      "aspect": 1.25,
      "excerpt": "Post Malone F1 Trillion : curated insight from August archive.",
      "content": "<p>Welcome to <strong>Post Malone F1 Trillion </strong>, featured in our AUGUST INSPIRE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "TeBqtsVKSjyXJY26veqivg",
      "index": 8,
      "title": "Neon Pill",
      "slug": "neon-pill",
      "month": "MAY",
      "tag": "INSPIRE",
      "date": "2024-05-16",
      "cover": "https://www.datocms-assets.com/106915/1739986602-tlb_betteroffstudio_may-2024_inspire-8.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://www.youtube.com/watch?v=_Xxu62OAovQ&list=PLxA687tYuMWixYmA4m28dmFeTJO7LVRjV",
      "aspect": 0.8,
      "excerpt": "Neon Pill: curated insight from May archive.",
      "content": "<p>Welcome to <strong>Neon Pill</strong>, featured in our MAY INSPIRE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "IynEMY6hSrGbtqb4P8UNgw",
      "index": 9,
      "title": "Redman muddy water too album drop",
      "slug": "redman-muddy-water-too-album-drop",
      "month": "MARCH",
      "tag": "INSPIRE",
      "date": "2025-03-30",
      "cover": "https://www.datocms-assets.com/106915/1744300638-mar-tlb-cover-8.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://www.youtube.com/watch?v=ej1ZewP4iAs&list=PLY-jtzy1SX_TNQzBG_t-nRQqrvPZS9t7p&index=2",
      "aspect": 1.25,
      "excerpt": "Redman muddy water too album drop: curated insight from March archive.",
      "content": "<p>Welcome to <strong>Redman muddy water too album drop</strong>, featured in our MARCH INSPIRE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "fs5HsRn8TTWaV43XLYYZtQ",
      "index": 10,
      "title": "surfer\u00a0@aloslebir, 108-foot monster wave ",
      "slug": "surfer-aloslebir-108-foot-monster-wave",
      "month": "FEBRUARY",
      "tag": "INSPIRE",
      "date": "2025-02-26",
      "cover": "https://www.datocms-assets.com/106915/1744299935-feb-tlb-cover-7.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://www.youtube.com/watch?v=9JmN8_zUY1w",
      "aspect": 0.8,
      "excerpt": "surfer\u00a0@aloslebir, 108-foot monster wave : curated insight from February archive.",
      "content": "<p>Welcome to <strong>surfer\u00a0@aloslebir, 108-foot monster wave </strong>, featured in our FEBRUARY INSPIRE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "fShh-RbjQ_qq9TqO3tRcfQ",
      "index": 11,
      "title": "Broncho Jams",
      "slug": "broncho-jams",
      "month": "FEBRUARY",
      "tag": "INSPIRE",
      "date": "2024-02-14",
      "cover": "https://www.datocms-assets.com/106915/1739979301-tlb_betteroffstudio_jan-2024_inspire-7.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://www.youtube.com/watch?v=Y7LhF1YYyxM&list=OLAK5uy_mpmmDT9GlOuU2RBDB0HFB3y0GcUvbGPQU",
      "aspect": 1.25,
      "excerpt": "Broncho Jams: curated insight from February archive.",
      "content": "<p>Welcome to <strong>Broncho Jams</strong>, featured in our FEBRUARY INSPIRE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "EBnFGVFXTxyylGS-dBeU_A",
      "index": 12,
      "title": "Zipper Surf Film",
      "slug": "zipper-surf-film",
      "month": "APRIL",
      "tag": "INSPIRE",
      "date": "2024-04-08",
      "cover": "https://www.datocms-assets.com/106915/1739979824-tlb_betteroffstudio_apr-2024_inspire-7.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://www.youtube.com/watch?v=1IuMiLPSyss",
      "aspect": 0.8,
      "excerpt": "Zipper Surf Film: curated insight from April archive.",
      "content": "<p>Welcome to <strong>Zipper Surf Film</strong>, featured in our APRIL INSPIRE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "fg5QqUC4QHuR6ENoOzulyQ",
      "index": 13,
      "title": "Kelly Slater Retires",
      "slug": "kelly-slater-retires",
      "month": "APRIL",
      "tag": "EDUCATE",
      "date": "2024-04-01",
      "cover": "https://www.datocms-assets.com/106915/1739979747-tlb_betteroffstudio_apr-2024_inspire-1.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://www.youtube.com/watch?v=KwjQftM8yj4",
      "aspect": 1.25,
      "excerpt": "Kelly Slater Retires: curated insight from April archive.",
      "content": "<p>Welcome to <strong>Kelly Slater Retires</strong>, featured in our APRIL EDUCATE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "DbPmluCrT5OxO75M3BbwUg",
      "index": 14,
      "title": "Stussy Autumn Drop",
      "slug": "stussy-autumn-drop",
      "month": "MARCH",
      "tag": "INSPIRE",
      "date": "2024-03-07",
      "cover": "https://www.datocms-assets.com/106915/1739979495-tlb_betteroffstudio_mar-2024_inspire-6.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://www.stussy.com/blogs/news/stussy-fall-25-collection",
      "aspect": 0.8,
      "excerpt": "Stussy Autumn Drop: curated insight from March archive.",
      "content": "<p>Welcome to <strong>Stussy Autumn Drop</strong>, featured in our MARCH INSPIRE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "QcDRwLNTQvOPli4Ne8jiSQ",
      "index": 15,
      "title": "Sora Launches",
      "slug": "sora-launches",
      "month": "FEBRUARY",
      "tag": "EDUCATE",
      "date": "2024-02-01",
      "cover": "https://www.datocms-assets.com/106915/1739979088-tlb_betteroffstudio_jan-2024_educate-1.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://sora.chatgpt.com",
      "aspect": 1.25,
      "excerpt": "Sora Launches: curated insight from February archive.",
      "content": "<p>Welcome to <strong>Sora Launches</strong>, featured in our FEBRUARY EDUCATE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "Jicjls8RTOOILEK7_A1GGw",
      "index": 16,
      "title": "Fashion Jan",
      "slug": "fashion",
      "month": "JANUARY",
      "tag": "INSPIRE",
      "date": "2024-01-10",
      "cover": "https://www.datocms-assets.com/106915/1739977590-tlb_betteroffstudio_jan-2024_inspire-1.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://www.freundevonfreunden.com/fashion/jan-jan-van-essche/",
      "aspect": 0.8,
      "excerpt": "Fashion Jan: curated insight from January archive.",
      "content": "<p>Welcome to <strong>Fashion Jan</strong>, featured in our JANUARY INSPIRE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "Vt_LcgZxSe650Hm2CEGBLw",
      "index": 17,
      "title": "The Kate Bellm Interview",
      "slug": "the-kate-bellm-interview",
      "month": "FEBRUARY",
      "tag": "INSPIRE",
      "date": "2025-02-05",
      "cover": "https://www.datocms-assets.com/106915/1744299741-feb-tlb-cover-1.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://www.monsterchildren.com/articles/revisit-the-kate-bellm-interview",
      "aspect": 1.25,
      "excerpt": "The Kate Bellm Interview: curated insight from February archive.",
      "content": "<p>Welcome to <strong>The Kate Bellm Interview</strong>, featured in our FEBRUARY INSPIRE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "AaiHy3osS0-z2yOzsQveJw",
      "index": 18,
      "title": "NIGO\u00ae\ufe0e and Pharrell Williams appointed as creative advisors for Not a hotel",
      "slug": "nigo-and-pharrell-williams-appointed-as-creative-advisors-for-not-a-hotel",
      "month": "FEBRUARY",
      "tag": "INSPIRE",
      "date": "2025-02-11",
      "cover": "https://www.datocms-assets.com/106915/1744299803-feb-tlb-cover-3.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://notahotel.com/en/news/creative-advisor",
      "aspect": 0.8,
      "excerpt": "NIGO\u00ae\ufe0e and Pharrell Williams appointed as creative advisors for Not a hotel: curated insight from February archive.",
      "content": "<p>Welcome to <strong>NIGO\u00ae\ufe0e and Pharrell Williams appointed as creative advisors for Not a hotel</strong>, featured in our FEBRUARY INSPIRE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "eN8EqF5_ScyvktctA90WNQ",
      "index": 19,
      "title": "Post Malone at Wild Horses Festival in San Diego",
      "slug": "post-malone-at-wild-horses-festival-in-san-diego",
      "month": "JANUARY",
      "tag": "INSPIRE",
      "date": "2025-01-05",
      "cover": "https://www.datocms-assets.com/106915/1744299669-jan-tlb-cover-1.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://www.instagram.com/p/DEX4PMOy867/",
      "aspect": 1.25,
      "excerpt": "Post Malone at Wild Horses Festival in San Diego: curated insight from January archive.",
      "content": "<p>Welcome to <strong>Post Malone at Wild Horses Festival in San Diego</strong>, featured in our JANUARY INSPIRE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "EP-YNf7_SfOmw3tO0xSawA",
      "index": 20,
      "title": "Kendrick Lamar taps Willy Chavarria for super bowl halftime collection",
      "slug": "kendrick-lamar-taps-willy-chavarria-for-super-bowl-halftime-collection",
      "month": "JANUARY",
      "tag": "INSPIRE",
      "date": "2025-01-13",
      "cover": "https://www.datocms-assets.com/106915/1744300059-jan-tlb-cover-3.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://hypebeast.com/2025/1/kendrick-lamar-willy-chavarria-super-bowl-lix-collection-release-info",
      "aspect": 0.8,
      "excerpt": "Kendrick Lamar taps Willy Chavarria for super bowl halftime collection: curated insight from January archive.",
      "content": "<p>Welcome to <strong>Kendrick Lamar taps Willy Chavarria for super bowl halftime collection</strong>, featured in our JANUARY INSPIRE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "F_cQtiEdTbasRo3zP5ypnA",
      "index": 21,
      "title": "Pocket vol.12",
      "slug": "pocket-vol-12",
      "month": "JANUARY",
      "tag": "INSPIRE",
      "date": "2025-01-28",
      "cover": "https://www.datocms-assets.com/106915/1744300232-jan-tlb-cover-6.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://pocketskatemag.com/product/pocket-vol-12/",
      "aspect": 1.25,
      "excerpt": "Pocket vol.12: curated insight from January archive.",
      "content": "<p>Welcome to <strong>Pocket vol.12</strong>, featured in our JANUARY INSPIRE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "IxVw34v6Q0KDcbFlJDTJ9Q",
      "index": 22,
      "title": "off white - State of resistance ",
      "slug": "off-white-state-of-resistance",
      "month": "MARCH",
      "tag": "INSPIRE",
      "date": "2025-03-02",
      "cover": "https://www.datocms-assets.com/106915/1744300334-mar-tlb-cover-1.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://www.off---white.com/en-us/fw25-show-recap/",
      "aspect": 0.8,
      "excerpt": "off white - State of resistance : curated insight from March archive.",
      "content": "<p>Welcome to <strong>off white - State of resistance </strong>, featured in our MARCH INSPIRE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "EETzY3b_TJaomOf4Grqotg",
      "index": 23,
      "title": "Helge Tscharn CAPSULE",
      "slug": "helge-tscharn-capsule",
      "month": "MARCH",
      "tag": "INSPIRE",
      "date": "2025-03-11",
      "cover": "https://www.datocms-assets.com/106915/1744300408-mar-tlb-cover-4.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://www.thrashermagazine.com/articles/trash/helge-tscharn-s-capsule-photo-book/",
      "aspect": 1.25,
      "excerpt": "Helge Tscharn CAPSULE: curated insight from March archive.",
      "content": "<p>Welcome to <strong>Helge Tscharn CAPSULE</strong>, featured in our MARCH INSPIRE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "Cr2eiymZRByVV2TTe9mh6Q",
      "index": 24,
      "title": "Mascot Book",
      "slug": "mascot-book",
      "month": "MARCH",
      "tag": "EDUCATE",
      "date": "2025-03-20",
      "cover": "https://www.datocms-assets.com/106915/1744300484-mar-tlb-cover-7.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://www.amazon.com/Mascot-Mascots-Contemporary-Graphic-anglais/dp/1915392047",
      "aspect": 0.8,
      "excerpt": "Mascot Book: curated insight from March archive.",
      "content": "<p>Welcome to <strong>Mascot Book</strong>, featured in our MARCH EDUCATE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "YeasvFKPQa2OSR1YsTIuxg",
      "index": 25,
      "title": "North Face in early days",
      "slug": "north-face-in-early-days",
      "month": "APRIL",
      "tag": "INSPIRE",
      "date": "2025-04-03",
      "cover": "https://www.datocms-assets.com/106915/1746532360-tlb-cover-1.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://www.thenorthface.com/en-us/about-us/our-story",
      "aspect": 1.25,
      "excerpt": "North Face in early days: curated insight from April archive.",
      "content": "<p>Welcome to <strong>North Face in early days</strong>, featured in our APRIL INSPIRE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "A_iaX8LURMiwP0kqA9bCtw",
      "index": 26,
      "title": "The Sprawl",
      "slug": "the-sprawl",
      "month": "APRIL",
      "tag": "INSPIRE",
      "date": "2025-04-10",
      "cover": "https://www.datocms-assets.com/106915/1746532641-tlb-cover-4.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://hypebeast.com/2024/11/ed-templeton-sprawl-tim-van-laere-gallery-antwerp",
      "aspect": 0.8,
      "excerpt": "The Sprawl: curated insight from April archive.",
      "content": "<p>Welcome to <strong>The Sprawl</strong>, featured in our APRIL INSPIRE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "cc2ErBxMRRac8OjGjKoUQQ",
      "index": 27,
      "title": "Converse Shoe Drop by Works.studio",
      "slug": "converse-shoe-drop-by-works-studio",
      "month": "APRIL",
      "tag": "INSPIRE",
      "date": "2025-04-19",
      "cover": "https://www.datocms-assets.com/106915/1746532775-tlb-cover-6.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://works.studio/work/converse-heritage-david-carson",
      "aspect": 1.25,
      "excerpt": "Converse Shoe Drop by Works.studio: curated insight from April archive.",
      "content": "<p>Welcome to <strong>Converse Shoe Drop by Works.studio</strong>, featured in our APRIL INSPIRE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "FP7-XwF9RmCS-cxRkG5C8Q",
      "index": 28,
      "title": "A$AP X Rayban",
      "slug": "asap-x-rayban",
      "month": "APRIL",
      "tag": "INSPIRE",
      "date": "2025-04-24",
      "cover": "https://www.datocms-assets.com/106915/1746532969-tlb-cover-8.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://www.ray-ban.com/usa/sunglasses/asap-rocky-collection?cid=PM-SGA_300419-1.US-RayBan-EN-B-NA-ASAPRocky-Exact-Prs-NA-Ecom-NA_ASAPRocky_asap+raybans&s_kwcid=AL!16196!3!744013068848!e!!g!!asap%20raybans!22257927966!180901521248&gclsrc=aw.ds&gad_source=1&gad_campaignid=22257927966&gbraid=0AAAAACyJz6_nBcQ6lmX1CIGb1p9VQ6WQK&gclid=CjwKCAiAkvDMBhBMEiwAnUA9BUXqug0j_oLumE4pf3Cvz-jf5k4BNccQ7rhUzjMMCtDglwxOMroPeBoCe8cQAvD_BwE",
      "aspect": 0.8,
      "excerpt": "A$AP X Rayban: curated insight from April archive.",
      "content": "<p>Welcome to <strong>A$AP X Rayban</strong>, featured in our APRIL INSPIRE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "IK-fI1_USr2vn9Y4wVjz7Q",
      "index": 29,
      "title": "Will AI Kill the Creative Business, or Save It?",
      "slug": "will-ai-kill-the-creative-business-or-save-it",
      "month": "MAY",
      "tag": "EDUCATE",
      "date": "2024-05-01",
      "cover": "https://www.datocms-assets.com/106915/1744293233-may-tlb-cover-1.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://betteroff.studio/feed/how-will-ai-impact-creativity",
      "aspect": 1.25,
      "excerpt": "Will AI Kill the Creative Business, or Save It?: curated insight from May archive.",
      "content": "<p>Welcome to <strong>Will AI Kill the Creative Business, or Save It?</strong>, featured in our MAY EDUCATE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "I_xgRrouTcGMOoyy9LhzrQ",
      "index": 30,
      "title": "Stab High Japan",
      "slug": "stab-high-japan",
      "month": "JUNE",
      "tag": "INSPIRE",
      "date": "2024-06-01",
      "cover": "https://www.datocms-assets.com/106915/1739986856-tlb_betteroffstudio_jun-2024_inspire-1.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://www.youtube.com/watch?v=5CSLq_0-J3c",
      "aspect": 0.8,
      "excerpt": "Stab High Japan: curated insight from June archive.",
      "content": "<p>Welcome to <strong>Stab High Japan</strong>, featured in our JUNE INSPIRE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "Sf6CrL0gRSyhdF18mY0MPA",
      "index": 31,
      "title": "How storytelling strengthens brand campaigns",
      "slug": "how-storytelling-strengthens-brand-campaigns",
      "month": "JUNE",
      "tag": "SHOWCASE",
      "date": "2024-06-28",
      "cover": "https://www.datocms-assets.com/106915/1744292493-jun-tlb-cover-5.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://betteroff.studio",
      "aspect": 1.25,
      "excerpt": "How storytelling strengthens brand campaigns: curated insight from June archive.",
      "content": "<p>Welcome to <strong>How storytelling strengthens brand campaigns</strong>, featured in our JUNE SHOWCASE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "UYv0STvPS8qb4O1-uV2XQw",
      "index": 32,
      "title": "Gabriel Medina Olympics ",
      "slug": "gabriel-medina-olympics",
      "month": "JUNE",
      "tag": "INSPIRE",
      "date": "2024-06-20",
      "cover": "https://www.datocms-assets.com/106915/1739987023-tlb_betteroffstudio_jun-2024_inspire-7.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://www.youtube.com/watch?v=VC8CqkNyZpI",
      "aspect": 0.8,
      "excerpt": "Gabriel Medina Olympics : curated insight from June archive.",
      "content": "<p>Welcome to <strong>Gabriel Medina Olympics </strong>, featured in our JUNE INSPIRE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "CQucWWygQFWuaPVqa6FuIA",
      "index": 33,
      "title": "Vans\u2019 Always Pushing",
      "slug": "vans-always-pushing",
      "month": "JULY",
      "tag": "INSPIRE",
      "date": "2024-07-05",
      "cover": "https://www.datocms-assets.com/106915/1739988348-tlb_betteroffstudio_jul-2024_inspire-1.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://www.youtube.com/watch?v=RhKnkB0KQIo&list=RDRhKnkB0KQIo&start_radio=1",
      "aspect": 1.25,
      "excerpt": "Vans\u2019 Always Pushing: curated insight from July archive.",
      "content": "<p>Welcome to <strong>Vans\u2019 Always Pushing</strong>, featured in our JULY INSPIRE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "bTdBO4baRZqzAFXnre5lGA",
      "index": 34,
      "title": "Better Off\u00ae Studio Website Awards",
      "slug": "better-off-studio-website-awards",
      "month": "AUGUST",
      "tag": "SHOWCASE",
      "date": "2024-08-14",
      "cover": "https://www.datocms-assets.com/106915/1739993114-tlb_betteroffstudio_aug-2024_showcase-1.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://www.awwwards.com/sites/better-off-r",
      "aspect": 0.8,
      "excerpt": "Better Off\u00ae Studio Website Awards: curated insight from August archive.",
      "content": "<p>Welcome to <strong>Better Off\u00ae Studio Website Awards</strong>, featured in our AUGUST SHOWCASE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "IU1XvFxeSV6EYk5u9FZ2ow",
      "index": 35,
      "title": "How Awards Impact Brand Trust",
      "slug": "how-awards-impact-brand-trust",
      "month": "AUGUST",
      "tag": "EDUCATE",
      "date": "2024-08-16",
      "cover": "https://www.datocms-assets.com/106915/1744291164-aug-tlb-cover-6.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://www.awwwards.com/sites/better-off-r",
      "aspect": 1.25,
      "excerpt": "How Awards Impact Brand Trust: curated insight from August archive.",
      "content": "<p>Welcome to <strong>How Awards Impact Brand Trust</strong>, featured in our AUGUST EDUCATE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "IZEllU8YTSKnI-mreOrmJw",
      "index": 36,
      "title": "Epicly Later\u2019d Book Drop",
      "slug": "epicly-later-book-drop",
      "month": "SEPTEMBER",
      "tag": "INSPIRE",
      "date": "2024-09-03",
      "cover": "https://www.datocms-assets.com/106915/1739993259-tlb_betteroffstudio_sep-2024_educate-1.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://www.amazon.com/Epicly-Laterd-Patrick-ODell/dp/1944860614",
      "aspect": 0.8,
      "excerpt": "Epicly Later\u2019d Book Drop: curated insight from September archive.",
      "content": "<p>Welcome to <strong>Epicly Later\u2019d Book Drop</strong>, featured in our SEPTEMBER INSPIRE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "YWCz92WwR6OSkLF2-0kmiA",
      "index": 37,
      "title": "Offshore Talent, On-Budget Creative",
      "slug": "offshore-talent-on-budget-creative",
      "month": "SEPTEMBER",
      "tag": "EDUCATE",
      "date": "2024-09-17",
      "cover": "https://www.datocms-assets.com/106915/1739993374-tlb_betteroffstudio_sep-2024_educate-7.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://betteroff.studio/feed/offshore-talent-for-on-budget-creative",
      "aspect": 1.25,
      "excerpt": "Offshore Talent, On-Budget Creative: curated insight from September archive.",
      "content": "<p>Welcome to <strong>Offshore Talent, On-Budget Creative</strong>, featured in our SEPTEMBER EDUCATE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "TRTIcRPKSCKxJ0RDCQBW9g",
      "index": 38,
      "title": "WSL World Champs 2024",
      "slug": "wsl-world-champs-2024",
      "month": "SEPTEMBER",
      "tag": "INSPIRE",
      "date": "2024-09-23",
      "cover": "https://www.datocms-assets.com/106915/1739993433-tlb_betteroffstudio_sep-2024_inspire-3.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://www.youtube.com/watch?v=UYrG7fY-JXc",
      "aspect": 0.8,
      "excerpt": "WSL World Champs 2024: curated insight from September archive.",
      "content": "<p>Welcome to <strong>WSL World Champs 2024</strong>, featured in our SEPTEMBER INSPIRE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "FQUg0avyTPq2tUj5n2a7fw",
      "index": 39,
      "title": "Atiba Jefferson Epicly Later\u2019d",
      "slug": "atiba-jefferson-epicly-later-d",
      "month": "OCTOBER",
      "tag": "INSPIRE",
      "date": "2024-10-02",
      "cover": "https://www.datocms-assets.com/106915/1739994230-tlb_betteroffstudio_oct-2024_inspire-1.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://www.youtube.com/watch?v=Qw7-hCfxRV4",
      "aspect": 1.25,
      "excerpt": "Atiba Jefferson Epicly Later\u2019d: curated insight from October archive.",
      "content": "<p>Welcome to <strong>Atiba Jefferson Epicly Later\u2019d</strong>, featured in our OCTOBER INSPIRE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "IRf8Z2FFSWmvfcsLLiL8Zw",
      "index": 40,
      "title": "Swatch the Nines",
      "slug": "swatch-the-nines",
      "month": "OCTOBER",
      "tag": "INSPIRE",
      "date": "2024-10-14",
      "cover": "https://www.datocms-assets.com/106915/1739994375-tlb_betteroffstudio_oct-2024_inspire-3.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://www.youtube.com/watch?v=idhi90_xRJc&list=RDidhi90_xRJc&start_radio=1",
      "aspect": 0.8,
      "excerpt": "Swatch the Nines: curated insight from October archive.",
      "content": "<p>Welcome to <strong>Swatch the Nines</strong>, featured in our OCTOBER INSPIRE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "QWyA34zXTfCyPluI72rHZQ",
      "index": 41,
      "title": "Stab Electric Acid",
      "slug": "stab-electric-acid",
      "month": "NOVEMBER",
      "tag": "INSPIRE",
      "date": "2024-11-08",
      "cover": "https://www.datocms-assets.com/106915/1739994689-tlb_betteroffstudio_nov-2024_inspire-1.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://www.youtube.com/watch?v=wDQP3aXaKOg",
      "aspect": 1.25,
      "excerpt": "Stab Electric Acid: curated insight from November archive.",
      "content": "<p>Welcome to <strong>Stab Electric Acid</strong>, featured in our NOVEMBER INSPIRE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "Y-iJMBBHThKMKzcZBC1Mxw",
      "index": 42,
      "title": "Revival Surf Park",
      "slug": "revival-surf-park",
      "month": "NOVEMBER",
      "tag": "INSPIRE",
      "date": "2024-11-11",
      "cover": "https://www.datocms-assets.com/106915/1739994752-tlb_betteroffstudio_nov-2024_inspire-4.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://revelsurf.com",
      "aspect": 0.8,
      "excerpt": "Revival Surf Park: curated insight from November archive.",
      "content": "<p>Welcome to <strong>Revival Surf Park</strong>, featured in our NOVEMBER INSPIRE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "WFREHV7IQk-HxGUD1Zv7Mw",
      "index": 43,
      "title": "Vans OTW Pushes into Premium to Spark Turnaround",
      "slug": "vans-otw-pushes-into-premium-to-spark-turnaround",
      "month": "DECEMBER",
      "tag": "EDUCATE",
      "date": "2024-12-02",
      "cover": "https://www.datocms-assets.com/106915/1739994838-tlb_betteroffstudio_dec-2024_educate-7.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://betteroff.studio/feed/vans-otw-pushes-into-premium-to-spark-turnaround",
      "aspect": 1.25,
      "excerpt": "Vans OTW Pushes into Premium to Spark Turnaround: curated insight from December archive.",
      "content": "<p>Welcome to <strong>Vans OTW Pushes into Premium to Spark Turnaround</strong>, featured in our DECEMBER EDUCATE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "bV7esa5WRu2z88Jo5moRwg",
      "index": 44,
      "title": "Meat Head",
      "slug": "meat-head",
      "month": "DECEMBER",
      "tag": "INSPIRE",
      "date": "2024-12-16",
      "cover": "https://www.datocms-assets.com/106915/1739994880-tlb_betteroffstudio_dec-2024_inspire-1.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://www.youtube.com/watch?v=11fGTJvk8dQ&list=RD11fGTJvk8dQ&start_radio=1&t=106s",
      "aspect": 0.8,
      "excerpt": "Meat Head: curated insight from December archive.",
      "content": "<p>Welcome to <strong>Meat Head</strong>, featured in our DECEMBER INSPIRE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "NLtZpsRUSAac7LegYVndRA",
      "index": 45,
      "title": "Motive Energy Case",
      "slug": "motive-energy-case",
      "month": "DECEMBER",
      "tag": "SHOWCASE",
      "date": "2024-12-23",
      "cover": "https://www.datocms-assets.com/106915/1739994930-tlb_betteroffstudio_dec-2024_showcase-3.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://betteroff.studio/work/motive-energy",
      "aspect": 1.25,
      "excerpt": "Motive Energy Case: curated insight from December archive.",
      "content": "<p>Welcome to <strong>Motive Energy Case</strong>, featured in our DECEMBER SHOWCASE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "encCSe6YRgqZve989qpGHg",
      "index": 46,
      "title": "Better Off\u00ae Studio Launches",
      "slug": "better-off-studio-launches",
      "month": "JANUARY",
      "tag": "SHOWCASE",
      "date": "2024-01-01",
      "cover": "https://www.datocms-assets.com/106915/1739977416-tlb_betteroffstudio_jan-2024_brand-launch-1.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://betteroff.studio",
      "aspect": 0.8,
      "excerpt": "Better Off\u00ae Studio Launches: curated insight from January archive.",
      "content": "<p>Welcome to <strong>Better Off\u00ae Studio Launches</strong>, featured in our JANUARY SHOWCASE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "WeSWSWV4SSirFC67kJ2xYw",
      "index": 47,
      "title": "Supreme x Margiela Wallet",
      "slug": "supreme-x-margiela-wallet",
      "month": "MAY",
      "tag": "INSPIRE",
      "date": "2025-05-03",
      "cover": "https://www.datocms-assets.com/106915/1771599654-tlb-cover-1.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://www.goat.com/apparel/supreme-x-mm6-maison-margiela-receipt-wallet-white-0052-1ss240604mm6rw-whit",
      "aspect": 1.25,
      "excerpt": "Supreme x Margiela Wallet: curated insight from May archive.",
      "content": "<p>Welcome to <strong>Supreme x Margiela Wallet</strong>, featured in our MAY INSPIRE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "bomWHdHKQ_-nWBK1nG1-8Q",
      "index": 48,
      "title": "Devin Booker's Nike x Chevrolet Collection",
      "slug": "devin-bookers-nike-x-chevrolet-collection",
      "month": "MAY",
      "tag": "INSPIRE",
      "date": "2025-05-11",
      "cover": "https://www.datocms-assets.com/106915/1771600028-tlb-cover-2.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://about.nike.com/en/newsroom/collections/devin-booker-nike-look-book",
      "aspect": 0.8,
      "excerpt": "Devin Booker's Nike x Chevrolet Collection: curated insight from May archive.",
      "content": "<p>Welcome to <strong>Devin Booker's Nike x Chevrolet Collection</strong>, featured in our MAY INSPIRE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "J87NTfgpQpCIaeXnn_YmWQ",
      "index": 49,
      "title": "Fugazi Photo Shooting ",
      "slug": "fugazi-photo-shooting",
      "month": "MAY",
      "tag": "INSPIRE",
      "date": "2025-05-18",
      "cover": "https://www.datocms-assets.com/106915/1771600266-tlb-cover-5.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://fugazi.net",
      "aspect": 1.25,
      "excerpt": "Fugazi Photo Shooting : curated insight from May archive.",
      "content": "<p>Welcome to <strong>Fugazi Photo Shooting </strong>, featured in our MAY INSPIRE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "EX-pguGeR7-dUXlotmy5NQ",
      "index": 50,
      "title": "Turnstile Never Enough",
      "slug": "turnstile-never-enough",
      "month": "JUNE",
      "tag": "INSPIRE",
      "date": "2025-06-19",
      "cover": "https://www.datocms-assets.com/106915/1771601447-tlb-cover-5.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://www.youtube.com/watch?v=0ICCvzZ7kbY&list=PLxA687tYuMWiQvKF0IMS8Adv1UHvCOYYJ",
      "aspect": 0.8,
      "excerpt": "Turnstile Never Enough: curated insight from June archive.",
      "content": "<p>Welcome to <strong>Turnstile Never Enough</strong>, featured in our JUNE INSPIRE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "GIpz9eiYQBehOLAfxjTWcg",
      "index": 51,
      "title": "Viamundi Spirits",
      "slug": "viamundi-spirits",
      "month": "FEBRUARY",
      "tag": "SHOWCASE",
      "date": "2024-02-19",
      "cover": "https://www.datocms-assets.com/106915/1739979375-tlb_betteroffstudio_jan-2024_showcase-4.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://viamundispirits.com",
      "aspect": 1.25,
      "excerpt": "Viamundi Spirits: curated insight from February archive.",
      "content": "<p>Welcome to <strong>Viamundi Spirits</strong>, featured in our FEBRUARY SHOWCASE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "BpsDZcMjRSOQ1u66z5QMCA",
      "index": 52,
      "title": "Rick Rubin and the Art of Being",
      "slug": "rick-rubin-and-the-art-of-being",
      "month": "AUGUST",
      "tag": "INSPIRE",
      "date": "2025-08-07",
      "cover": "https://www.datocms-assets.com/106915/1771601956-tlb-cover-2.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://www.youtube.com/watch?v=qkwISstQQVw",
      "aspect": 0.8,
      "excerpt": "Rick Rubin and the Art of Being: curated insight from August archive.",
      "content": "<p>Welcome to <strong>Rick Rubin and the Art of Being</strong>, featured in our AUGUST INSPIRE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "HIFheQ86QuGmhWTveWqeLg",
      "index": 53,
      "title": "Carpet Company for Living Proof Magazine, Issue 11.",
      "slug": "carpet-company-for-living-proof-magazine-issue-11",
      "month": "SEPTEMBER",
      "tag": "INSPIRE",
      "date": "2025-09-15",
      "cover": "https://www.datocms-assets.com/106915/1771603524-tlb-cover-1.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://www.instagram.com/p/DOoItKXlDmm/?hl=en",
      "aspect": 1.25,
      "excerpt": "Carpet Company for Living Proof Magazine, Issue 11.: curated insight from September archive.",
      "content": "<p>Welcome to <strong>Carpet Company for Living Proof Magazine, Issue 11.</strong>, featured in our SEPTEMBER INSPIRE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "VC8ZukT5R6WJuTmStVDnBw",
      "index": 54,
      "title": "Bo\u00aeS Culture",
      "slug": "better-off-culture",
      "month": "FEBRUARY",
      "tag": "INSPIRE",
      "date": "2024-02-11",
      "cover": "https://www.datocms-assets.com/106915/1739979230-tlb_betteroffstudio_jan-2024_inspire-6.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://www.instagram.com/betteroff.studio/?hl=en",
      "aspect": 0.8,
      "excerpt": "Bo\u00aeS Culture: curated insight from February archive.",
      "content": "<p>Welcome to <strong>Bo\u00aeS Culture</strong>, featured in our FEBRUARY INSPIRE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "MHzMa9mvQSW4d-WRQ_XvSA",
      "index": 55,
      "title": "How Subscriptions End Agency Excess",
      "slug": "how-subscriptions-end-agency-excess",
      "month": "MARCH",
      "tag": "EDUCATE",
      "date": "2024-03-01",
      "cover": "https://www.datocms-assets.com/106915/1739979448-tlb_betteroffstudio_mar-2024_educate-1.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://betteroff.studio/feed/design-subscriptions-end-agency-excess",
      "aspect": 1.25,
      "excerpt": "How Subscriptions End Agency Excess: curated insight from March archive.",
      "content": "<p>Welcome to <strong>How Subscriptions End Agency Excess</strong>, featured in our MARCH EDUCATE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "d1TkTSZ2TtCerWO8NyYD_Q",
      "index": 56,
      "title": "Olipop Case Study",
      "slug": "olipop-case-study",
      "month": "MARCH",
      "tag": "SHOWCASE",
      "date": "2024-03-18",
      "cover": "https://www.datocms-assets.com/106915/1739979604-tlb_betteroffstudio_mar-2024_showcase-2.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://drinkolipop.com",
      "aspect": 0.8,
      "excerpt": "Olipop Case Study: curated insight from March archive.",
      "content": "<p>Welcome to <strong>Olipop Case Study</strong>, featured in our MARCH SHOWCASE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "ThN99J5VR0mjEU-0OY16LQ",
      "index": 57,
      "title": "CarharttWIP skate jam in Milan",
      "slug": "carharttwip-skate-jam-in-milan",
      "month": "SEPTEMBER",
      "tag": "INSPIRE",
      "date": "2025-09-16",
      "cover": "https://www.datocms-assets.com/106915/1771603685-tlb-cover-4.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://www.instagram.com/p/DOlpD-MCgED/?hl=en&img_index=1",
      "aspect": 1.25,
      "excerpt": "CarharttWIP skate jam in Milan: curated insight from September archive.",
      "content": "<p>Welcome to <strong>CarharttWIP skate jam in Milan</strong>, featured in our SEPTEMBER INSPIRE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "UQM-nV2RSa2HEUOIYg4G9g",
      "index": 58,
      "title": "STREETPLAZA SOKOLOV",
      "slug": "streetplaza-sokolov",
      "month": "SEPTEMBER",
      "tag": "INSPIRE",
      "date": "2025-09-21",
      "cover": "https://www.datocms-assets.com/106915/1771603759-tlb-cover-7.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://uustudio.cz/project/streetplaza-sokolov-eng",
      "aspect": 0.8,
      "excerpt": "STREETPLAZA SOKOLOV: curated insight from September archive.",
      "content": "<p>Welcome to <strong>STREETPLAZA SOKOLOV</strong>, featured in our SEPTEMBER INSPIRE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "VvpIaTkJT_60B-GVrGfidg",
      "index": 59,
      "title": "Adidas and Brain Dead present the Barricade 13",
      "slug": "adidas-and-brain-dead-present-the-barricade-13",
      "month": "OCTOBER",
      "tag": "INSPIRE",
      "date": "2025-10-02",
      "cover": "https://www.datocms-assets.com/106915/1771603851-tlb-cover-2.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://wearebraindead.com/blogs/archive/brain-dead-x-adidas-barricade?srsltid=AfmBOor4SLprl8mMHFrP13PwfwBohBx7Z4ECPsCulEwQR1JoTw2Nt7sf",
      "aspect": 1.25,
      "excerpt": "Adidas and Brain Dead present the Barricade 13: curated insight from October archive.",
      "content": "<p>Welcome to <strong>Adidas and Brain Dead present the Barricade 13</strong>, featured in our OCTOBER INSPIRE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "eiAJQ4wOTWOVzQqb96Dhuw",
      "index": 60,
      "title": "They said no drum machines...",
      "slug": "they-said-no-drum-machines",
      "month": "OCTOBER",
      "tag": "INSPIRE",
      "date": "2025-10-19",
      "cover": "https://www.datocms-assets.com/106915/1771603955-tlb-cover-4.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://www.instagram.com/tameimpala/?hl=en",
      "aspect": 0.8,
      "excerpt": "They said no drum machines...: curated insight from October archive.",
      "content": "<p>Welcome to <strong>They said no drum machines...</strong>, featured in our OCTOBER INSPIRE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "Ox8Nj5RrQQ2U08W07sCj8w",
      "index": 61,
      "title": "Erl drops new vamp boot",
      "slug": "erl-drops-new-vamp-boot",
      "month": "OCTOBER",
      "tag": "INSPIRE",
      "date": "2025-10-24",
      "cover": "https://www.datocms-assets.com/106915/1771604071-tlb-cover-8.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://hypebeast.com/2025/10/erl-vamp-boots-release-info",
      "aspect": 1.25,
      "excerpt": "Erl drops new vamp boot: curated insight from October archive.",
      "content": "<p>Welcome to <strong>Erl drops new vamp boot</strong>, featured in our OCTOBER INSPIRE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "f2nRK6ZEQ6yP9-Cd7oLUlw",
      "index": 62,
      "title": "Works by oezase",
      "slug": "works-by-oezase",
      "month": "NOVEMBER",
      "tag": "INSPIRE",
      "date": "2025-11-04",
      "cover": "https://www.datocms-assets.com/106915/1771604163-tlb-cover-1.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://www.instagram.com/oezase/",
      "aspect": 0.8,
      "excerpt": "Works by oezase: curated insight from November archive.",
      "content": "<p>Welcome to <strong>Works by oezase</strong>, featured in our NOVEMBER INSPIRE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "deZims2nTrCsqKHi5vRO1Q",
      "index": 63,
      "title": "TwoJeys Headwear by New Era",
      "slug": "twojeys-headwear-by-new-era",
      "month": "NOVEMBER",
      "tag": "INSPIRE",
      "date": "2025-11-25",
      "cover": "https://www.datocms-assets.com/106915/1771604262-tlb-cover-5.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://twojeys.com/collections/headwear",
      "aspect": 1.25,
      "excerpt": "TwoJeys Headwear by New Era: curated insight from November archive.",
      "content": "<p>Welcome to <strong>TwoJeys Headwear by New Era</strong>, featured in our NOVEMBER INSPIRE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "euSohP_bRPSbcemzC_nI3w",
      "index": 64,
      "title": "Wu-Nopoly is officially out (duplicate)",
      "slug": "wu-nopoly-is-officially-out",
      "month": "NOVEMBER",
      "tag": "INSPIRE",
      "date": "2025-11-30",
      "cover": "https://www.datocms-assets.com/106915/1771604334-tlb-cover-7.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://www.hiphopmuseumdc.org/product-page/wu-tang-official-monopoly-board-game?srsltid=AfmBOoqa0CVMEZD1LJNBcjD5Y3gG86F1Sshr4j2LdtgnRUbD6t6tJ25P",
      "aspect": 0.8,
      "excerpt": "Wu-Nopoly is officially out (duplicate): curated insight from November archive.",
      "content": "<p>Welcome to <strong>Wu-Nopoly is officially out (duplicate)</strong>, featured in our NOVEMBER INSPIRE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "SV5SMn69RziIjIOdesLPlQ",
      "index": 65,
      "title": "Skateboard culture book finally out",
      "slug": "skateboard-culture-book-finally-out",
      "month": "DECEMBER",
      "tag": "INSPIRE",
      "date": "2025-12-06",
      "cover": "https://www.datocms-assets.com/106915/1771604414-tlb-cover-3.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://www.amazon.com/Skateboard-Culture-Skateboarding-1970s-Today/dp/0593839498",
      "aspect": 1.25,
      "excerpt": "Skateboard culture book finally out: curated insight from December archive.",
      "content": "<p>Welcome to <strong>Skateboard culture book finally out</strong>, featured in our DECEMBER INSPIRE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "PE36A1hHRuirGFEK810Eew",
      "index": 66,
      "title": "Photography by Estevan Oriol",
      "slug": "photography-by-estevan-oriol",
      "month": "DECEMBER",
      "tag": "INSPIRE",
      "date": "2025-12-15",
      "cover": "https://www.datocms-assets.com/106915/1771604522-tlb-cover-6.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://www.estevanoriol.com",
      "aspect": 0.8,
      "excerpt": "Photography by Estevan Oriol: curated insight from December archive.",
      "content": "<p>Welcome to <strong>Photography by Estevan Oriol</strong>, featured in our DECEMBER INSPIRE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "Gmy8HQQlTkeAox1HQ8JcQQ",
      "index": 67,
      "title": "Andrew Dutton Sneaker shots",
      "slug": "andrew-dutton-sneaker-shots",
      "month": "DECEMBER",
      "tag": "INSPIRE",
      "date": "2025-12-23",
      "cover": "https://www.datocms-assets.com/106915/1771604616-tlb-cover-8.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://www.instagram.com/ad__sneaks/",
      "aspect": 1.25,
      "excerpt": "Andrew Dutton Sneaker shots: curated insight from December archive.",
      "content": "<p>Welcome to <strong>Andrew Dutton Sneaker shots</strong>, featured in our DECEMBER INSPIRE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "dmavSlDHSAST6OXTSzAENw",
      "index": 68,
      "title": "Built Things Rebrand ",
      "slug": "built-things-rebrand",
      "month": "APRIL",
      "tag": "SHOWCASE",
      "date": "2024-04-15",
      "cover": "https://www.datocms-assets.com/106915/1739979894-tlb_betteroffstudio_apr-2024_showcase-3.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://betteroff.studio",
      "aspect": 0.8,
      "excerpt": "Built Things Rebrand : curated insight from April archive.",
      "content": "<p>Welcome to <strong>Built Things Rebrand </strong>, featured in our APRIL SHOWCASE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "Zi4eknz0QZ2c4M6vH9BhXQ",
      "index": 69,
      "title": "American Gun Owners",
      "slug": "american-gun-owners",
      "month": "MAY",
      "tag": "SHOWCASE",
      "date": "2024-05-21",
      "cover": "https://www.datocms-assets.com/106915/1739986705-tlb_betteroffstudio_may-2024_showcase-3.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://betteroff.studio",
      "aspect": 1.25,
      "excerpt": "American Gun Owners: curated insight from May archive.",
      "content": "<p>Welcome to <strong>American Gun Owners</strong>, featured in our MAY SHOWCASE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "NzTSn35bQ0K92kLAvttVhA",
      "index": 70,
      "title": "Better Off\u00ae Studio Submission",
      "slug": "better-off-studio-submission",
      "month": "JULY",
      "tag": "SHOWCASE",
      "date": "2024-07-15",
      "cover": "https://www.datocms-assets.com/106915/1739990585-tlb_betteroffstudio_jul-2024_showcase-4.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://www.awwwards.com/sites/better-off-r",
      "aspect": 0.8,
      "excerpt": "Better Off\u00ae Studio Submission: curated insight from July archive.",
      "content": "<p>Welcome to <strong>Better Off\u00ae Studio Submission</strong>, featured in our JULY SHOWCASE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "ZVo_Q3oARKyCCZLDOkF-NA",
      "index": 71,
      "title": "Atiba Jefferson Solo Show",
      "slug": "atiba-jefferson-profile",
      "month": "OCTOBER",
      "tag": "INSPIRE",
      "date": "2024-10-21",
      "cover": "https://www.datocms-assets.com/106915/1739994434-tlb_betteroffstudio_oct-2024_inspire-7.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://www.highsnobiety.com/p/atiba-jefferson-s-solo-show-was-27-years-in-the-making/",
      "aspect": 1.25,
      "excerpt": "Atiba Jefferson Solo Show: curated insight from October archive.",
      "content": "<p>Welcome to <strong>Atiba Jefferson Solo Show</strong>, featured in our OCTOBER INSPIRE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "bfEXlyWRTP-30b4V3F8Emw",
      "index": 72,
      "title": "This Color Story Stays Quiet ",
      "slug": "this-color-story-stays-quiet",
      "month": "NOVEMBER",
      "tag": "EDUCATE",
      "date": "2024-11-01",
      "cover": "https://www.datocms-assets.com/106915/1739994618-tlb_betteroffstudio_nov-2024_educate-8.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://betteroff.studio/feed/better-off-studio-talks-color-story",
      "aspect": 0.8,
      "excerpt": "This Color Story Stays Quiet : curated insight from November archive.",
      "content": "<p>Welcome to <strong>This Color Story Stays Quiet </strong>, featured in our NOVEMBER EDUCATE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "Crv6u174ToOo1trFlvKZeA",
      "index": 73,
      "title": "Stab High Japan \ud83c\uddef\ud83c\uddf5",
      "slug": "stab-high-japan-may",
      "month": "MAY",
      "tag": "INSPIRE",
      "date": "2025-05-24",
      "cover": "https://www.datocms-assets.com/106915/1771600434-tlb-cover-8.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://www.youtube.com/watch?v=Gh5kL5yGlUo",
      "aspect": 1.25,
      "excerpt": "Stab High Japan \ud83c\uddef\ud83c\uddf5: curated insight from May archive.",
      "content": "<p>Welcome to <strong>Stab High Japan \ud83c\uddef\ud83c\uddf5</strong>, featured in our MAY INSPIRE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "Pbp-0z2pSTO62PWOQEOslA",
      "index": 74,
      "title": "\u201cLET GOD SORT EM OUT\u201d \u2014 album from CLIPSE",
      "slug": "let-god-sort-em-out-album-from-clipse",
      "month": "JULY",
      "tag": "INSPIRE",
      "date": "2025-07-24",
      "cover": "https://www.datocms-assets.com/106915/1771601665-tlb-cover-6.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://www.youtube.com/watch?v=-_Rfbp14owA",
      "aspect": 0.8,
      "excerpt": "\u201cLET GOD SORT EM OUT\u201d \u2014 album from CLIPSE: curated insight from July archive.",
      "content": "<p>Welcome to <strong>\u201cLET GOD SORT EM OUT\u201d \u2014 album from CLIPSE</strong>, featured in our JULY INSPIRE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "JZLYcw3NRCyxu4qmmR46Fg",
      "index": 75,
      "title": "A$AP ROCKY \u2014 PUNK ROCKY",
      "slug": "adollarap-rocky-punk-rocky",
      "month": "FEBRUARY",
      "tag": "INSPIRE",
      "date": "2026-02-05",
      "cover": "https://www.datocms-assets.com/106915/1771605815-tlb-cover-1.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://www.youtube.com/watch?v=lCp0BmcFPQ8",
      "aspect": 1.25,
      "excerpt": "A$AP ROCKY \u2014 PUNK ROCKY: curated insight from February archive.",
      "content": "<p>Welcome to <strong>A$AP ROCKY \u2014 PUNK ROCKY</strong>, featured in our FEBRUARY INSPIRE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "fcRI5KHpSamcaImD8cFudA",
      "index": 76,
      "title": "PHARRELL LAUNCHES VIRGINIA",
      "slug": "pharrell-launches-virginia",
      "month": "AUGUST",
      "tag": "INSPIRE",
      "date": "2025-08-25",
      "cover": "https://www.datocms-assets.com/106915/1771602109-tlb-cover-7.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://blackyachtrock.com",
      "aspect": 0.8,
      "excerpt": "PHARRELL LAUNCHES VIRGINIA: curated insight from August archive.",
      "content": "<p>Welcome to <strong>PHARRELL LAUNCHES VIRGINIA</strong>, featured in our AUGUST INSPIRE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "RPB_0OBnQSi-Ewhw88wI5Q",
      "index": 77,
      "title": "BO\u00ae \u2014 RESET THE STANDARD",
      "slug": "bo-reset-the-standard",
      "month": "JANUARY",
      "tag": "SHOWCASE",
      "date": "2026-01-10",
      "cover": "https://www.datocms-assets.com/106915/1771865782-better-off-studio_animated-comp.mp4?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://www.instagram.com/betteroff.studio/",
      "aspect": 1.25,
      "excerpt": "BO\u00ae \u2014 RESET THE STANDARD: curated insight from January archive.",
      "content": "<p>Welcome to <strong>BO\u00ae \u2014 RESET THE STANDARD</strong>, featured in our JANUARY SHOWCASE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "GNkwW0iyQaagLnOLf5nybQ",
      "index": 78,
      "title": "WINTER X GAMES 2026",
      "slug": "winter-x-games-2026",
      "month": "JANUARY",
      "tag": "INSPIRE",
      "date": "2026-01-27",
      "cover": "https://www.datocms-assets.com/106915/1771605547-tlb-cover-4.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://www.xgames.com/events/aspen-2026/",
      "aspect": 0.8,
      "excerpt": "WINTER X GAMES 2026: curated insight from January archive.",
      "content": "<p>Welcome to <strong>WINTER X GAMES 2026</strong>, featured in our JANUARY INSPIRE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "eUSjrAH7RPSKZ5F9y8SLiQ",
      "index": 79,
      "title": "JELLYFISH BY PHARRELL FROM VIRGINIA",
      "slug": "jellyfish-by-pharrell-from-virginia",
      "month": "FEBRUARY",
      "tag": "INSPIRE",
      "date": "2026-02-21",
      "cover": "https://www.datocms-assets.com/106915/1771606032-tlb-cover-5.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://www.adidas.com/us/virginia-adistar-jellyfish-by-pharrell/JP9263.html",
      "aspect": 1.25,
      "excerpt": "JELLYFISH BY PHARRELL FROM VIRGINIA: curated insight from February archive.",
      "content": "<p>Welcome to <strong>JELLYFISH BY PHARRELL FROM VIRGINIA</strong>, featured in our FEBRUARY INSPIRE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "cgIwwRXUQW-vqtEX5u14ag",
      "index": 80,
      "title": "GET HAPPLY",
      "slug": "get-happly",
      "month": "JANUARY",
      "tag": "SHOWCASE",
      "date": "2026-01-30",
      "cover": "https://www.datocms-assets.com/106915/1771848862-tlb-cover-8.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://gethapply.com",
      "aspect": 0.8,
      "excerpt": "GET HAPPLY: curated insight from January archive.",
      "content": "<p>Welcome to <strong>GET HAPPLY</strong>, featured in our JANUARY SHOWCASE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    },
    {
      "id": "a0kpiu_OS7m02uozqvvJYQ",
      "index": 81,
      "title": "Tripleswitch Partnership",
      "slug": "tripleswitch-partnership",
      "month": "JULY",
      "tag": "SHOWCASE",
      "date": "2024-07-22",
      "cover": "https://www.datocms-assets.com/106915/1771850507-tlb-cover-8.jpg?auto=format&fit=max&h=600&q=85&w=600",
      "url": "https://tripleswitchbrewing.com",
      "aspect": 1.25,
      "excerpt": "Tripleswitch Partnership: curated insight from July archive.",
      "content": "<p>Welcome to <strong>Tripleswitch Partnership</strong>, featured in our JULY SHOWCASE collection.</p><p>A reflection of our pulse, taste, and personality \u2014 capturing moments that keep Better Off moving forward.</p>"
    }
  ]
};

  var broadcastChannel = null;
  var _memData = null;
  var _memDraft = null;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
    }
  } catch (e) {
    console.warn('BroadcastChannel not supported in this environment');
  }

  var listeners = [];
  var _customMediaItems = [];
  var idbPromise = null;

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, function (m) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[m];
    });
  }

  function sanitizeUrl(url, allowDataImage) {
    if (typeof url !== 'string') return '';
    var trimmed = url.trim();
    if (!trimmed) return '';
    // Block dangerous pseudo-protocols
    if (/^(?:javascript|vbscript|file):/i.test(trimmed)) return '';
    if (/^data:/i.test(trimmed)) {
      if (allowDataImage && /^data:image\/(?:png|jpeg|webp|gif|svg\+xml);base64,/i.test(trimmed)) {
        return trimmed;
      }
      return '';
    }
    // Relative paths
    if (/^(?:\/|\.\/|\.\.\/|#)/.test(trimmed)) return trimmed;
    // Absolute http/https URLs
    try {
      var parsed = new URL(trimmed, 'https://dummy-base.local');
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return trimmed;
      }
    } catch (e) {}
    return '';
  }

  function sanitizeHtml(dirty) {
    if (typeof dirty !== 'string') return '';
    if (!dirty.trim()) return '';

    // Fast browser DOMParser-based sanitization
    if (typeof DOMParser !== 'undefined' && typeof document !== 'undefined') {
      try {
        var parser = new DOMParser();
        var doc = parser.parseFromString(dirty, 'text/html');
        var allowedTags = [
          'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'span', 'div',
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li',
          'blockquote', 'a', 'iframe', 'img', 'figure', 'figcaption'
        ];

        function cleanNode(node) {
          var children = Array.from(node.childNodes);
          for (var i = 0; i < children.length; i++) {
            var child = children[i];
            if (child.nodeType === 1) { // ELEMENT_NODE
              var tag = child.tagName.toLowerCase();
              if (allowedTags.indexOf(tag) === -1) {
                node.removeChild(child);
                continue;
              }
              // Clean attributes
              var attrs = Array.from(child.attributes);
              for (var j = 0; j < attrs.length; j++) {
                var attrName = attrs[j].name.toLowerCase();
                var attrVal = attrs[j].value;

                if (attrName.startsWith('on')) {
                  child.removeAttribute(attrs[j].name);
                  continue;
                }
                if (attrName === 'href' || attrName === 'src') {
                  var safe = sanitizeUrl(attrVal, tag === 'img');
                  if (!safe) {
                    child.removeAttribute(attrs[j].name);
                  } else {
                    if (tag === 'iframe') {
                      if (!/^https:\/\/(?:www\.youtube\.com|player\.vimeo\.com)\//i.test(safe)) {
                        child.removeAttribute(attrs[j].name);
                      } else {
                        child.setAttribute('src', safe);
                      }
                    } else {
                      child.setAttribute(attrs[j].name, safe);
                    }
                  }
                  continue;
                }
                if (['class', 'id', 'title', 'alt', 'target', 'rel', 'allow', 'allowfullscreen'].indexOf(attrName) === -1) {
                  child.removeAttribute(attrs[j].name);
                }
              }

              if (tag === 'iframe' && !child.getAttribute('src')) {
                node.removeChild(child);
                continue;
              }

              cleanNode(child);
            }
          }
        }

        cleanNode(doc.body);
        return doc.body.innerHTML;
      } catch (e) {
        console.warn('[TLBStore] DOMParser sanitize failed, using fallback:', e);
      }
    }

    // Node.js or fallback regex sanitizer
    var clean = dirty
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<(object|embed|applet|form|input|base|link|meta)\b[^>]*>/gi, '')
      .replace(/<\/(object|embed|applet|form|input|base|link|meta)>/gi, '')
      .replace(/\s+on\w+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?/gi, '')
      .replace(/href\s*=\s*["']?\s*javascript:[^"'\s>]+/gi, 'href="#"')
      .replace(/src\s*=\s*["']?\s*javascript:[^"'\s>]+/gi, 'src=""');
    return clean;
  }

  function sanitize(str) {
    if (typeof str !== 'string') return '';
    return str.trim();
  }

  // IndexedDB Storage Engine for Custom Media Uploads
  function openMediaDB() {
    if (idbPromise) return idbPromise;
    idbPromise = new Promise(function (resolve) {
      if (typeof indexedDB === 'undefined') {
        resolve(null);
        return;
      }
      var req = indexedDB.open('tlb_cms_db', 1);
      req.onupgradeneeded = function (ev) {
        var db = ev.target.result;
        if (!db.objectStoreNames.contains('media_items')) {
          db.createObjectStore('media_items', { keyPath: 'id' });
        }
      };
      req.onsuccess = function (ev) {
        resolve(ev.target.result);
      };
      req.onerror = function () {
        console.warn('[TLBStore] IndexedDB failed to open, using memory fallback');
        resolve(null);
      };
    });
    return idbPromise;
  }

  function loadCustomMediaFromDB(callback) {
    openMediaDB().then(function (db) {
      if (!db) {
        if (callback) callback(_customMediaItems);
        return;
      }
      try {
        var tx = db.transaction('media_items', 'readonly');
        var store = tx.objectStore('media_items');
        var req = store.getAll();
        req.onsuccess = function () {
          _customMediaItems = req.result || [];
          if (callback) callback(_customMediaItems);
        };
        req.onerror = function () {
          if (callback) callback(_customMediaItems);
        };
      } catch (err) {
        if (callback) callback(_customMediaItems);
      }
    });
  }

  // Preload custom media from IndexedDB if in browser
  if (typeof window !== 'undefined' && typeof indexedDB !== 'undefined') {
    loadCustomMediaFromDB();
  }

  var TLBStore = {
    STORAGE_KEY: STORAGE_KEY,
    DRAFT_STORAGE_KEY: DRAFT_STORAGE_KEY,
    CHANNEL_NAME: CHANNEL_NAME,
    escapeHtml: escapeHtml,
    sanitizeHtml: sanitizeHtml,
    sanitizeUrl: sanitizeUrl,

    getDefaultData: function () {
      return JSON.parse(JSON.stringify(TLB_DEFAULT_DATA));
    },

    getMediaLibrary: function () {
      return _customMediaItems.concat(TLB_MEDIA_LIBRARY);
    },

    addMediaItem: function (item, callback) {
      if (!item || !item.path) return;
      var record = {
        id: item.id || ('media_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)),
        path: item.path,
        label: escapeHtml(item.label || 'Uploaded Asset'),
        category: item.category || 'Uploads',
        createdAt: Date.now()
      };
      _customMediaItems.unshift(record);

      openMediaDB().then(function (db) {
        if (db) {
          try {
            var tx = db.transaction('media_items', 'readwrite');
            tx.objectStore('media_items').put(record);
          } catch (e) {
            console.warn('[TLBStore] Failed to write media to IndexedDB:', e);
          }
        }
        if (typeof callback === 'function') callback(record);
      });
      return record;
    },

    loadCustomMedia: loadCustomMediaFromDB,

    get: function () {
      try {
        if (typeof localStorage !== 'undefined') {
          var raw = localStorage.getItem(STORAGE_KEY);
          if (!raw) return this.getDefaultData();
          var parsed = JSON.parse(raw);
          if (!parsed || !parsed.articles || !parsed.tracks) return this.getDefaultData();
          return parsed;
        }
        return _memData ? JSON.parse(JSON.stringify(_memData)) : this.getDefaultData();
      } catch (err) {
        console.error('[TLBStore] Failed to read stored data, using default:', err);
        return this.getDefaultData();
      }
    },

    save: function (data) {
      if (!data) return false;
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } else {
          _memData = JSON.parse(JSON.stringify(data));
        }
        this._notify(data, 'publish');
        return true;
      } catch (err) {
        console.error('[TLBStore] Failed to save data (quota or serialization):', err);
        return false;
      }
    },

    publish: function (data) {
      if (!data) return false;
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
          localStorage.removeItem(DRAFT_STORAGE_KEY);
        } else {
          _memData = JSON.parse(JSON.stringify(data));
          _memDraft = null;
        }
        this._notify(data, 'publish');
        return true;
      } catch (err) {
        console.error('[TLBStore] Failed to publish data (quota or serialization):', err);
        return false;
      }
    },

    saveDraft: function (data) {
      if (!data) return false;
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(data));
        } else {
          _memDraft = JSON.parse(JSON.stringify(data));
        }
        return true;
      } catch (err) {
        console.error('[TLBStore] Failed to save draft:', err);
        return false;
      }
    },

    getDraft: function () {
      try {
        if (typeof localStorage !== 'undefined') {
          var raw = localStorage.getItem(DRAFT_STORAGE_KEY);
          if (!raw) return this.get();
          return JSON.parse(raw);
        }
        return _memDraft ? JSON.parse(JSON.stringify(_memDraft)) : this.get();
      } catch (err) {
        return this.get();
      }
    },

    loadDraft: function () {
      return this.getDraft();
    },

    hasUnpublishedChanges: function (candidateDraft) {
      try {
        var draft = candidateDraft ? candidateDraft : this.loadDraft();
        var published = this.get();
        return JSON.stringify(draft) !== JSON.stringify(published);
      } catch (_) {
        return false;
      }
    },

    reset: function () {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(DRAFT_STORAGE_KEY);
        }
        _memData = null;
        _memDraft = null;
        var def = this.getDefaultData();
        this._notify(def, 'reset');
        return def;
      } catch (err) {
        console.error('[TLBStore] Reset failed:', err);
        return this.getDefaultData();
      }
    },

    exportJSON: function () {
      var data = this.get();
      return JSON.stringify(data, null, 2);
    },

    importJSON: function (jsonStr) {
      try {
        if (typeof jsonStr !== 'string' || jsonStr.length > 15 * 1024 * 1024) {
          throw new Error('Payload too large or invalid string');
        }
        var raw = JSON.parse(jsonStr);
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
          throw new Error('Invalid JSON structure: expected root object');
        }

        // Clean object without prototype pollution
        var parsed = Object.create(null);
        var def = this.getDefaultData();

        // 1. Articles validation
        parsed.articles = [];
        if (Array.isArray(raw.articles)) {
          parsed.articles = raw.articles.map(function (a, i) {
            return {
              id: (typeof a.id === 'string' && a.id) ? sanitize(a.id) : ('art_' + (Date.now() + i)),
              index: parseInt(a.index, 10) || (i + 1),
              title: typeof a.title === 'string' ? sanitize(a.title) : 'Untitled Drop',
              slug: (typeof a.slug === 'string' && a.slug) ? sanitize(a.slug) : ('art-' + (Date.now() + i)),
              month: typeof a.month === 'string' ? sanitize(a.month).toUpperCase() : 'MARCH',
              tag: typeof a.tag === 'string' ? sanitize(a.tag).toUpperCase() : 'INSPIRE',
              date: typeof a.date === 'string' ? sanitize(a.date) : '',
              cover: sanitizeUrl(a.cover, true) || './assets/images/defective-units-vol-1.webp',
              url: sanitizeUrl(a.url) || '',
              aspect: typeof a.aspect === 'number' ? a.aspect : 1.25,
              excerpt: typeof a.excerpt === 'string' ? sanitize(a.excerpt) : '',
              content: typeof a.content === 'string' ? sanitizeHtml(a.content) : ''
            };
          });
        } else {
          parsed.articles = def.articles;
        }

        // 2. Tracks validation
        parsed.tracks = [];
        if (Array.isArray(raw.tracks)) {
          parsed.tracks = raw.tracks.map(function (t, i) {
            return {
              id: (typeof t.id === 'string' && t.id) ? sanitize(t.id) : ('track_' + (i + 1)),
              title: typeof t.title === 'string' ? sanitize(t.title) : 'Track',
              artist: typeof t.artist === 'string' ? sanitize(t.artist) : 'Better Off Sound',
              audioUrl: sanitizeUrl(t.audioUrl) || '',
              thumbnail: sanitizeUrl(t.thumbnail, true) || './assets/images/favicon.gif'
            };
          });
        } else {
          parsed.tracks = def.tracks;
        }

        // 3. Meta validation
        var rawMeta = raw.meta || {};
        parsed.meta = {
          siteTitle: typeof rawMeta.siteTitle === 'string' ? sanitize(rawMeta.siteTitle) : def.meta.siteTitle,
          description: typeof rawMeta.description === 'string' ? sanitize(rawMeta.description) : def.meta.description,
          headerTitle: typeof rawMeta.headerTitle === 'string' ? sanitize(rawMeta.headerTitle) : def.meta.headerTitle,
          headerSubtitle: typeof rawMeta.headerSubtitle === 'string' ? sanitize(rawMeta.headerSubtitle) : def.meta.headerSubtitle,
          headerYear: typeof rawMeta.headerYear === 'string' ? sanitize(rawMeta.headerYear) : def.meta.headerYear,
          noiseOverlay: rawMeta.noiseOverlay !== undefined ? !!rawMeta.noiseOverlay : def.meta.noiseOverlay,
          soundEnabledByDefault: rawMeta.soundEnabledByDefault !== undefined ? !!rawMeta.soundEnabledByDefault : def.meta.soundEnabledByDefault
        };

        // 4. About validation
        var rawAbout = raw.about || {};
        var defAbout = def.about || {};
        var validPillars = [];
        if (Array.isArray(rawAbout.pillars)) {
          validPillars = rawAbout.pillars.map(function (p, i) {
            return {
              num: typeof p.num === 'string' ? sanitize(p.num) : '(' + (i + 1) + ')',
              title: typeof p.title === 'string' ? sanitize(p.title) : 'PILLAR',
              text: typeof p.text === 'string' ? sanitize(p.text) : ''
            };
          });
        } else {
          validPillars = defAbout.pillars || [];
        }

        parsed.about = {
          badgeLeft: typeof rawAbout.badgeLeft === 'string' ? sanitize(rawAbout.badgeLeft) : defAbout.badgeLeft,
          badgeRight: typeof rawAbout.badgeRight === 'string' ? sanitize(rawAbout.badgeRight) : defAbout.badgeRight,
          title: typeof rawAbout.title === 'string' ? sanitize(rawAbout.title) : defAbout.title,
          yearLabel: typeof rawAbout.yearLabel === 'string' ? sanitize(rawAbout.yearLabel) : defAbout.yearLabel,
          videoSrc: sanitizeUrl(rawAbout.videoSrc) || defAbout.videoSrc,
          heroHeading: typeof rawAbout.heroHeading === 'string' ? sanitize(rawAbout.heroHeading) : defAbout.heroHeading,
          manifesto1: typeof rawAbout.manifesto1 === 'string' ? sanitize(rawAbout.manifesto1) : defAbout.manifesto1,
          manifesto2: typeof rawAbout.manifesto2 === 'string' ? sanitize(rawAbout.manifesto2) : defAbout.manifesto2,
          pillars: validPillars,
          thanksHeading: typeof rawAbout.thanksHeading === 'string' ? sanitize(rawAbout.thanksHeading) : defAbout.thanksHeading,
          tagline: typeof rawAbout.tagline === 'string' ? sanitize(rawAbout.tagline) : defAbout.tagline,
          copyright: typeof rawAbout.copyright === 'string' ? sanitize(rawAbout.copyright) : defAbout.copyright,
          contactEmail: typeof rawAbout.contactEmail === 'string' ? sanitize(rawAbout.contactEmail) : defAbout.contactEmail
        };

        var valid = this.save(parsed);
        if (valid) {
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem(DRAFT_STORAGE_KEY);
          }
        }
        return valid;
      } catch (err) {
        console.error('[TLBStore] importJSON failed:', err);
        throw err;
      }
    },

    subscribe: function (callback) {
      if (typeof callback !== 'function') return function () {};
      listeners.push(callback);
      return function () {
        var idx = listeners.indexOf(callback);
        if (idx !== -1) listeners.splice(idx, 1);
      };
    },

    _notify: function (data, action) {
      var payload = {
        action: action || 'update',
        timestamp: Date.now(),
        data: data
      };
      if (broadcastChannel) {
        try {
          broadcastChannel.postMessage(payload);
        } catch (err) {
          console.warn('[TLBStore] BroadcastChannel postMessage failed:', err);
        }
      }
      listeners.forEach(function (cb) {
        try { cb(data, payload); } catch (e) { console.error(e); }
      });
    },

    // Article helpers
    getArticleBySlug: function (slug) {
      var data = this.get();
      return (data.articles || []).find(function (a) { return a.slug === slug; }) || null;
    },

    updateArticle: function (id, patch) {
      var data = this.get();
      var found = false;
      data.articles = (data.articles || []).map(function (a) {
        if (a.id === id) {
          found = true;
          return Object.assign({}, a, patch);
        }
        return a;
      });
      if (found) {
        this.save(data);
        return true;
      }
      return false;
    },

    addArticle: function (article) {
      var data = this.get();
      if (!article.id) article.id = 'art_' + Date.now();
      if (!article.index) article.index = (data.articles || []).length + 1;
      data.articles = [article].concat(data.articles || []);
      this.save(data);
      return article;
    },

    deleteArticle: function (id) {
      var data = this.get();
      var initialLen = (data.articles || []).length;
      data.articles = (data.articles || []).filter(function (a) { return a.id !== id; });
      if (data.articles.length !== initialLen) {
        this.save(data);
        return true;
      }
      return false;
    }
  };

  // Listen for broadcast messages from other tabs
  if (broadcastChannel) {
    broadcastChannel.onmessage = function (ev) {
      if (ev && ev.data && ev.data.data) {
        listeners.forEach(function (cb) {
          try { cb(ev.data.data, ev.data); } catch (e) { console.error(e); }
        });
      }
    };
  }

  // Also listen for cross-window storage events as fallback
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', function (e) {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          var updated = JSON.parse(e.newValue);
          listeners.forEach(function (cb) {
            try { cb(updated, { action: 'storage-event', data: updated }); } catch (err) {}
          });
        } catch (err) {}
      }
    });
  }

  global.TLB_DEFAULT_DATA = TLB_DEFAULT_DATA;
  global.TLB_MEDIA_LIBRARY = TLB_MEDIA_LIBRARY;
  global.TLBStore = TLBStore;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      TLB_DEFAULT_DATA: TLB_DEFAULT_DATA,
      TLB_MEDIA_LIBRARY: TLB_MEDIA_LIBRARY,
      TLBStore: TLBStore
    };
  }
})(typeof window !== 'undefined' ? window : global);

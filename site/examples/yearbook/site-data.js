/**
 * edvlabs — THE YEARBOOK Centralized CMS Store & Default Content ()
 *
 * Provides:
 * - : Pre-cataloged local assets in 
 * - : Full baseline content matching https://yb.edvlabs.example
 * - : Reactive data access, LocalStorage persistence, BroadcastChannel real-time sync,
 *                     JSON export/import, article and track CRUD operations.
 */

(function (global) {
  'use strict';

  var STORAGE_KEY = 'yb_site_data_v1';
  var DRAFT_STORAGE_KEY = 'yb_site_draft_v1';
  var CHANNEL_NAME = 'yb_cms_sync_channel';

  var YB_MEDIA_LIBRARY = [
  {
    "path": "./assets/images/cover-01.svg",
    "label": "Cover 1",
    "category": "Covers"
  },
  {
    "path": "./assets/images/cover-02.svg",
    "label": "Cover 2",
    "category": "Covers"
  },
  {
    "path": "./assets/images/cover-03.svg",
    "label": "Cover 3",
    "category": "Covers"
  },
  {
    "path": "./assets/images/cover-04.svg",
    "label": "Cover 4",
    "category": "Covers"
  },
  {
    "path": "./assets/images/cover-05.svg",
    "label": "Cover 5",
    "category": "Covers"
  },
  {
    "path": "./assets/images/cover-06.svg",
    "label": "Cover 6",
    "category": "Covers"
  },
  {
    "path": "./assets/images/cover-07.svg",
    "label": "Cover 7",
    "category": "Covers"
  },
  {
    "path": "./assets/images/cover-08.svg",
    "label": "Cover 8",
    "category": "Covers"
  },
  {
    "path": "./assets/images/cover-09.svg",
    "label": "Cover 9",
    "category": "Covers"
  },
  {
    "path": "./assets/images/cover-10.svg",
    "label": "Cover 10",
    "category": "Covers"
  },
  {
    "path": "./assets/images/cover-11.svg",
    "label": "Cover 11",
    "category": "Covers"
  },
  {
    "path": "./assets/images/cover-12.svg",
    "label": "Cover 12",
    "category": "Covers"
  },
  {
    "path": "./assets/images/track-1.svg",
    "label": "Track 1",
    "category": "Tracks"
  },
  {
    "path": "./assets/images/track-2.svg",
    "label": "Track 2",
    "category": "Tracks"
  },
  {
    "path": "./assets/images/track-3.svg",
    "label": "Track 3",
    "category": "Tracks"
  },
  {
    "path": "./assets/images/track-4.svg",
    "label": "Track 4",
    "category": "Tracks"
  },
  {
    "path": "./assets/images/track-5.svg",
    "label": "Track 5",
    "category": "Tracks"
  },
  {
    "path": "./assets/images/track-6.svg",
    "label": "Track 6",
    "category": "Tracks"
  },
  {
    "path": "./assets/images/track-7.svg",
    "label": "Track 7",
    "category": "Tracks"
  },
  {
    "path": "./assets/images/track-8.svg",
    "label": "Track 8",
    "category": "Tracks"
  },
  {
    "path": "./assets/images/track-9.svg",
    "label": "Track 9",
    "category": "Tracks"
  },
  {
    "path": "./assets/images/track-10.svg",
    "label": "Track 10",
    "category": "Tracks"
  },
  {
    "path": "./assets/images/track-11.svg",
    "label": "Track 11",
    "category": "Tracks"
  },
  {
    "path": "./assets/images/track-12.svg",
    "label": "Track 12",
    "category": "Tracks"
  },
  {
    "path": "./assets/images/track-13.svg",
    "label": "Track 13",
    "category": "Tracks"
  },
  {
    "path": "./assets/images/track-14.svg",
    "label": "Track 14",
    "category": "Tracks"
  },
  {
    "path": "./assets/images/track-15.svg",
    "label": "Track 15",
    "category": "Tracks"
  },
  {
    "path": "./assets/images/favicon.svg",
    "label": "Favicon",
    "category": "System"
  },
  {
    "path": "./assets/images/noise.svg",
    "label": "Noise",
    "category": "System"
  }
];

  var YB_DEFAULT_DATA = {
  "meta": {
    "siteTitle": "THE YEARBOOK — edvlabs",
    "headerTitle": "edvlabs",
    "headerSubtitle": "THE YEARBOOK",
    "headerYear": "(EDV/2026)",
    "description": "Welcome to The Yearbook, a sample annual review site: moments, music and work from a made-up studio. Replace this text with your own.",
    "noiseOverlay": true,
    "soundEnabledByDefault": true
  },
  "about": {
    "badgeLeft": "( YB )",
    "badgeRight": "( 24-26 )",
    "title": "\"THE YEARBOOK\"",
    "yearLabel": "(YB/2026)",
    "heroHeading": "YOUR LIVING ARCHIVE OF EDVLABS",
    "manifesto1": "WELCOME TO THE YEARBOOK, A SAMPLE ANNUAL REVIEW. THIS IS WHERE A STUDIO CAN LOG THE MOMENTS THAT MOVED IT, THE WORK IT IS PROUD OF AND THE MUSIC THAT KEPT THE ROOM LOUD. EVERYTHING HERE IS PLACEHOLDER COPY: SWAP IT FOR YOUR OWN STORY IN THE ADMIN PANEL.",
    "manifesto2": "IT IS NOT NOSTALGIA, IT IS A HABIT OF LOOKING BACK TO MOVE FORWARD WITH CLARITY. EVERY MILESTONE, EVERY SPARK AND EVERY EXPERIMENT ARCHIVED HERE SHOWS HOW A TEAM GREW. WHAT INSPIRED IT. WHAT CHALLENGED IT. WHAT IT BUILT BECAUSE IT HAD TO.",
    "pillars": [
      {
        "num": "(1)",
        "title": "OUR HIGHLIGHTS",
        "text": "THE WINS, THE WORK AND THE MOMENTS THAT DEFINED THE YEAR, FROM LAUNCHES TO SMALL EXPERIMENTS."
      },
      {
        "num": "(2)",
        "title": "WHAT INSPIRED US",
        "text": "THE IDEAS, TOOLS, COLLABORATIONS AND SOUNDS THAT KEPT THE THINKING SHARP."
      },
      {
        "num": "(3)",
        "title": "LOOKING FORWARD",
        "text": "WHAT IS NEXT: THE IDEAS IN MOTION AND THE DIRECTION WE ARE STEPPING TOWARD."
      }
    ],
    "thanksHeading": "THANK YOU FOR STOPPING BY. THE YEARBOOK IS ONLY PART OF THE STORY.",
    "tagline": "STAY CURIOUS. KEEP BUILDING.",
    "copyright": "©edvlabs/2026",
    "videoSrc": "",
    "contactEmail": "hello@edvlabs.example"
  },
  "tracks": [
    {
      "id": "SyUnLLK4RkyQPEB8qSYvhQ",
      "title": "Daybreak Loop",
      "artist": "edvlabs Sound",
      "audioUrl": "./assets/audio/track-1.wav",
      "thumbnail": "./assets/images/track-1.svg"
    },
    {
      "id": "PQKEBbECTSekZqT6x6Pr-g",
      "title": "Paper Planes",
      "artist": "edvlabs Sound",
      "audioUrl": "./assets/audio/track-2.wav",
      "thumbnail": "./assets/images/track-2.svg"
    },
    {
      "id": "JUpFEIeETnCmDK1T94fIjw",
      "title": "Low Tide",
      "artist": "edvlabs Sound",
      "audioUrl": "./assets/audio/track-3.wav",
      "thumbnail": "./assets/images/track-3.svg"
    },
    {
      "id": "NvX_e94KR7ynxSt0Hzlwbw",
      "title": "Glasshouse",
      "artist": "edvlabs Sound",
      "audioUrl": "./assets/audio/track-4.wav",
      "thumbnail": "./assets/images/track-4.svg"
    },
    {
      "id": "e8FAAZdOQA-FaG_5mtks6g",
      "title": "Night Shift",
      "artist": "edvlabs Sound",
      "audioUrl": "./assets/audio/track-5.wav",
      "thumbnail": "./assets/images/track-5.svg"
    },
    {
      "id": "D9JlSiCiSoiXjO4I8yIPQA",
      "title": "Slow Orbit",
      "artist": "edvlabs Sound",
      "audioUrl": "./assets/audio/track-6.wav",
      "thumbnail": "./assets/images/track-6.svg"
    },
    {
      "id": "Dg_eWD6zT8-GyFELmBRbdA",
      "title": "Warm Static",
      "artist": "edvlabs Sound",
      "audioUrl": "./assets/audio/track-7.wav",
      "thumbnail": "./assets/images/track-7.svg"
    },
    {
      "id": "E724kNNkS7uwX3d8Urmikg",
      "title": "Corner Cafe",
      "artist": "edvlabs Sound",
      "audioUrl": "./assets/audio/track-8.wav",
      "thumbnail": "./assets/images/track-8.svg"
    },
    {
      "id": "Ly-P6Hr-RFOPrU16ZxJB-A",
      "title": "Blue Hour",
      "artist": "edvlabs Sound",
      "audioUrl": "./assets/audio/track-9.wav",
      "thumbnail": "./assets/images/track-9.svg"
    },
    {
      "id": "XPze56ETQ4aWaf_DP7gSkg",
      "title": "Tape Hiss",
      "artist": "edvlabs Sound",
      "audioUrl": "./assets/audio/track-10.wav",
      "thumbnail": "./assets/images/track-10.svg"
    },
    {
      "id": "cp0oebaQRJ2j-1qO0n09rw",
      "title": "Open Road",
      "artist": "edvlabs Sound",
      "audioUrl": "./assets/audio/track-11.wav",
      "thumbnail": "./assets/images/track-11.svg"
    },
    {
      "id": "Yqfa43YhTeObiPbFypDSbg",
      "title": "Soft Landing",
      "artist": "edvlabs Sound",
      "audioUrl": "./assets/audio/track-12.wav",
      "thumbnail": "./assets/images/track-12.svg"
    },
    {
      "id": "G6BuiHR2RESqrpDpCWCBnw",
      "title": "Echo Park Walk",
      "artist": "edvlabs Sound",
      "audioUrl": "./assets/audio/track-13.wav",
      "thumbnail": "./assets/images/track-13.svg"
    },
    {
      "id": "ApSvZ-zsQTWwUh87BVN8rw",
      "title": "Small Hours",
      "artist": "edvlabs Sound",
      "audioUrl": "./assets/audio/track-14.wav",
      "thumbnail": "./assets/images/track-14.svg"
    },
    {
      "id": "G4PFVek2SMSFbD1w_z7pEA",
      "title": "After Rain",
      "artist": "edvlabs Sound",
      "audioUrl": "./assets/audio/track-15.wav",
      "thumbnail": "./assets/images/track-15.svg"
    }
  ],
  "articles": [
    {
      "id": "biwttKZlSUGqPmg1TwC3dA",
      "index": 1,
      "title": "Quiet Mixtape 01",
      "slug": "quiet-mixtape-01",
      "month": "MARCH",
      "tag": "INSPIRE",
      "date": "2026-03-02",
      "cover": "./assets/images/cover-01.svg",
      "url": "#",
      "aspect": 1.25,
      "excerpt": "Quiet Mixtape 01: a placeholder entry from the March archive.",
      "content": "<p>Welcome to <strong>Quiet Mixtape 01</strong>, filed under MARCH INSPIRE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "ISDkJ8yBT0OwPIOMaQF_NQ",
      "index": 2,
      "title": "Golden Case File 02",
      "slug": "golden-case-file-02",
      "month": "MARCH",
      "tag": "INSPIRE",
      "date": "2026-03-09",
      "cover": "./assets/images/cover-02.svg",
      "url": "#",
      "aspect": 0.8,
      "excerpt": "Golden Case File 02: a placeholder entry from the March archive.",
      "content": "<p>Welcome to <strong>Golden Case File 02</strong>, filed under MARCH INSPIRE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "SG_kQZzmTfK6E6fqLn5jIg",
      "index": 3,
      "title": "Paper Field Report 03",
      "slug": "paper-field-report-03",
      "month": "JULY",
      "tag": "SHOWCASE",
      "date": "2025-07-01",
      "cover": "./assets/images/cover-03.svg",
      "url": "#",
      "aspect": 1.25,
      "excerpt": "Paper Field Report 03: a placeholder entry from the July archive.",
      "content": "<p>Welcome to <strong>Paper Field Report 03</strong>, filed under JULY SHOWCASE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "RuD1wwnBSx-NOVatXVbPag",
      "index": 4,
      "title": "Signal Looking Glass 04",
      "slug": "signal-looking-glass-04",
      "month": "FEBRUARY",
      "tag": "INSPIRE",
      "date": "2026-02-23",
      "cover": "./assets/images/cover-04.svg",
      "url": "#",
      "aspect": 0.8,
      "excerpt": "Signal Looking Glass 04: a placeholder entry from the February archive.",
      "content": "<p>Welcome to <strong>Signal Looking Glass 04</strong>, filed under FEBRUARY INSPIRE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "NC5c8kArSJSZOiW3srGg_w",
      "index": 5,
      "title": "Midnight Interview 05",
      "slug": "midnight-interview-05",
      "month": "AUGUST",
      "tag": "INSPIRE",
      "date": "2025-08-16",
      "cover": "./assets/images/cover-05.svg",
      "url": "#",
      "aspect": 1.25,
      "excerpt": "Midnight Interview 05: a placeholder entry from the August archive.",
      "content": "<p>Welcome to <strong>Midnight Interview 05</strong>, filed under AUGUST INSPIRE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "CjzOszBzTguGLbF9L6iOsg",
      "index": 6,
      "title": "Open Workshop 06",
      "slug": "open-workshop-06",
      "month": "JUNE",
      "tag": "INSPIRE",
      "date": "2025-06-04",
      "cover": "./assets/images/cover-06.svg",
      "url": "#",
      "aspect": 0.8,
      "excerpt": "Open Workshop 06: a placeholder entry from the June archive.",
      "content": "<p>Welcome to <strong>Open Workshop 06</strong>, filed under JUNE INSPIRE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "VDhH9Ut3SmiAW-vTjA1BkQ",
      "index": 7,
      "title": "Soft Archive Card 07",
      "slug": "soft-archive-card-07",
      "month": "AUGUST",
      "tag": "INSPIRE",
      "date": "2024-08-01",
      "cover": "./assets/images/cover-07.svg",
      "url": "#",
      "aspect": 1.25,
      "excerpt": "Soft Archive Card 07: a placeholder entry from the August archive.",
      "content": "<p>Welcome to <strong>Soft Archive Card 07</strong>, filed under AUGUST INSPIRE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "TeBqtsVKSjyXJY26veqivg",
      "index": 8,
      "title": "Neon Prototype 08",
      "slug": "neon-prototype-08",
      "month": "MAY",
      "tag": "INSPIRE",
      "date": "2024-05-16",
      "cover": "./assets/images/cover-08.svg",
      "url": "#",
      "aspect": 0.8,
      "excerpt": "Neon Prototype 08: a placeholder entry from the May archive.",
      "content": "<p>Welcome to <strong>Neon Prototype 08</strong>, filed under MAY INSPIRE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "IynEMY6hSrGbtqb4P8UNgw",
      "index": 9,
      "title": "Hollow Drop 09",
      "slug": "hollow-drop-09",
      "month": "MARCH",
      "tag": "INSPIRE",
      "date": "2025-03-30",
      "cover": "./assets/images/cover-09.svg",
      "url": "#",
      "aspect": 1.25,
      "excerpt": "Hollow Drop 09: a placeholder entry from the March archive.",
      "content": "<p>Welcome to <strong>Hollow Drop 09</strong>, filed under MARCH INSPIRE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "fs5HsRn8TTWaV43XLYYZtQ",
      "index": 10,
      "title": "Bright Sketchbook 10",
      "slug": "bright-sketchbook-10",
      "month": "FEBRUARY",
      "tag": "INSPIRE",
      "date": "2025-02-26",
      "cover": "./assets/images/cover-10.svg",
      "url": "#",
      "aspect": 0.8,
      "excerpt": "Bright Sketchbook 10: a placeholder entry from the February archive.",
      "content": "<p>Welcome to <strong>Bright Sketchbook 10</strong>, filed under FEBRUARY INSPIRE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "fShh-RbjQ_qq9TqO3tRcfQ",
      "index": 11,
      "title": "Slow Moodboard 11",
      "slug": "slow-moodboard-11",
      "month": "FEBRUARY",
      "tag": "INSPIRE",
      "date": "2024-02-14",
      "cover": "./assets/images/cover-11.svg",
      "url": "#",
      "aspect": 1.25,
      "excerpt": "Slow Moodboard 11: a placeholder entry from the February archive.",
      "content": "<p>Welcome to <strong>Slow Moodboard 11</strong>, filed under FEBRUARY INSPIRE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "EBnFGVFXTxyylGS-dBeU_A",
      "index": 12,
      "title": "Wild Studio Notes 12",
      "slug": "wild-studio-notes-12",
      "month": "APRIL",
      "tag": "INSPIRE",
      "date": "2024-04-08",
      "cover": "./assets/images/cover-12.svg",
      "url": "#",
      "aspect": 0.8,
      "excerpt": "Wild Studio Notes 12: a placeholder entry from the April archive.",
      "content": "<p>Welcome to <strong>Wild Studio Notes 12</strong>, filed under APRIL INSPIRE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "fg5QqUC4QHuR6ENoOzulyQ",
      "index": 13,
      "title": "Linen Playlist 13",
      "slug": "linen-playlist-13",
      "month": "APRIL",
      "tag": "EDUCATE",
      "date": "2024-04-01",
      "cover": "./assets/images/cover-01.svg",
      "url": "#",
      "aspect": 1.25,
      "excerpt": "Linen Playlist 13: a placeholder entry from the April archive.",
      "content": "<p>Welcome to <strong>Linen Playlist 13</strong>, filed under APRIL EDUCATE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "DbPmluCrT5OxO75M3BbwUg",
      "index": 14,
      "title": "Cobalt Pop-up 14",
      "slug": "cobalt-pop-up-14",
      "month": "MARCH",
      "tag": "INSPIRE",
      "date": "2024-03-07",
      "cover": "./assets/images/cover-02.svg",
      "url": "#",
      "aspect": 0.8,
      "excerpt": "Cobalt Pop-up 14: a placeholder entry from the March archive.",
      "content": "<p>Welcome to <strong>Cobalt Pop-up 14</strong>, filed under MARCH INSPIRE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "QcDRwLNTQvOPli4Ne8jiSQ",
      "index": 15,
      "title": "Amber Postcard 15",
      "slug": "amber-postcard-15",
      "month": "FEBRUARY",
      "tag": "EDUCATE",
      "date": "2024-02-01",
      "cover": "./assets/images/cover-03.svg",
      "url": "#",
      "aspect": 1.25,
      "excerpt": "Amber Postcard 15: a placeholder entry from the February archive.",
      "content": "<p>Welcome to <strong>Amber Postcard 15</strong>, filed under FEBRUARY EDUCATE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "Jicjls8RTOOILEK7_A1GGw",
      "index": 16,
      "title": "Velvet Residency 16",
      "slug": "velvet-residency-16",
      "month": "JANUARY",
      "tag": "INSPIRE",
      "date": "2024-01-10",
      "cover": "./assets/images/cover-04.svg",
      "url": "#",
      "aspect": 0.8,
      "excerpt": "Velvet Residency 16: a placeholder entry from the January archive.",
      "content": "<p>Welcome to <strong>Velvet Residency 16</strong>, filed under JANUARY INSPIRE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "Vt_LcgZxSe650Hm2CEGBLw",
      "index": 17,
      "title": "Static Mixtape 17",
      "slug": "static-mixtape-17",
      "month": "FEBRUARY",
      "tag": "INSPIRE",
      "date": "2025-02-05",
      "cover": "./assets/images/cover-05.svg",
      "url": "#",
      "aspect": 1.25,
      "excerpt": "Static Mixtape 17: a placeholder entry from the February archive.",
      "content": "<p>Welcome to <strong>Static Mixtape 17</strong>, filed under FEBRUARY INSPIRE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "AaiHy3osS0-z2yOzsQveJw",
      "index": 18,
      "title": "Tidal Case File 18",
      "slug": "tidal-case-file-18",
      "month": "FEBRUARY",
      "tag": "INSPIRE",
      "date": "2025-02-11",
      "cover": "./assets/images/cover-06.svg",
      "url": "#",
      "aspect": 0.8,
      "excerpt": "Tidal Case File 18: a placeholder entry from the February archive.",
      "content": "<p>Welcome to <strong>Tidal Case File 18</strong>, filed under FEBRUARY INSPIRE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "eN8EqF5_ScyvktctA90WNQ",
      "index": 19,
      "title": "Marble Field Report 19",
      "slug": "marble-field-report-19",
      "month": "JANUARY",
      "tag": "INSPIRE",
      "date": "2025-01-05",
      "cover": "./assets/images/cover-07.svg",
      "url": "#",
      "aspect": 1.25,
      "excerpt": "Marble Field Report 19: a placeholder entry from the January archive.",
      "content": "<p>Welcome to <strong>Marble Field Report 19</strong>, filed under JANUARY INSPIRE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "EP-YNf7_SfOmw3tO0xSawA",
      "index": 20,
      "title": "Ember Looking Glass 20",
      "slug": "ember-looking-glass-20",
      "month": "JANUARY",
      "tag": "INSPIRE",
      "date": "2025-01-13",
      "cover": "./assets/images/cover-08.svg",
      "url": "#",
      "aspect": 0.8,
      "excerpt": "Ember Looking Glass 20: a placeholder entry from the January archive.",
      "content": "<p>Welcome to <strong>Ember Looking Glass 20</strong>, filed under JANUARY INSPIRE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "F_cQtiEdTbasRo3zP5ypnA",
      "index": 21,
      "title": "Quiet Interview 21",
      "slug": "quiet-interview-21",
      "month": "JANUARY",
      "tag": "INSPIRE",
      "date": "2025-01-28",
      "cover": "./assets/images/cover-09.svg",
      "url": "#",
      "aspect": 1.25,
      "excerpt": "Quiet Interview 21: a placeholder entry from the January archive.",
      "content": "<p>Welcome to <strong>Quiet Interview 21</strong>, filed under JANUARY INSPIRE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "IxVw34v6Q0KDcbFlJDTJ9Q",
      "index": 22,
      "title": "Golden Workshop 22",
      "slug": "golden-workshop-22",
      "month": "MARCH",
      "tag": "INSPIRE",
      "date": "2025-03-02",
      "cover": "./assets/images/cover-10.svg",
      "url": "#",
      "aspect": 0.8,
      "excerpt": "Golden Workshop 22: a placeholder entry from the March archive.",
      "content": "<p>Welcome to <strong>Golden Workshop 22</strong>, filed under MARCH INSPIRE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "EETzY3b_TJaomOf4Grqotg",
      "index": 23,
      "title": "Paper Archive Card 23",
      "slug": "paper-archive-card-23",
      "month": "MARCH",
      "tag": "INSPIRE",
      "date": "2025-03-11",
      "cover": "./assets/images/cover-11.svg",
      "url": "#",
      "aspect": 1.25,
      "excerpt": "Paper Archive Card 23: a placeholder entry from the March archive.",
      "content": "<p>Welcome to <strong>Paper Archive Card 23</strong>, filed under MARCH INSPIRE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "Cr2eiymZRByVV2TTe9mh6Q",
      "index": 24,
      "title": "Signal Prototype 24",
      "slug": "signal-prototype-24",
      "month": "MARCH",
      "tag": "EDUCATE",
      "date": "2025-03-20",
      "cover": "./assets/images/cover-12.svg",
      "url": "#",
      "aspect": 0.8,
      "excerpt": "Signal Prototype 24: a placeholder entry from the March archive.",
      "content": "<p>Welcome to <strong>Signal Prototype 24</strong>, filed under MARCH EDUCATE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "YeasvFKPQa2OSR1YsTIuxg",
      "index": 25,
      "title": "Midnight Drop 25",
      "slug": "midnight-drop-25",
      "month": "APRIL",
      "tag": "INSPIRE",
      "date": "2025-04-03",
      "cover": "./assets/images/cover-01.svg",
      "url": "#",
      "aspect": 1.25,
      "excerpt": "Midnight Drop 25: a placeholder entry from the April archive.",
      "content": "<p>Welcome to <strong>Midnight Drop 25</strong>, filed under APRIL INSPIRE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "A_iaX8LURMiwP0kqA9bCtw",
      "index": 26,
      "title": "Open Sketchbook 26",
      "slug": "open-sketchbook-26",
      "month": "APRIL",
      "tag": "INSPIRE",
      "date": "2025-04-10",
      "cover": "./assets/images/cover-02.svg",
      "url": "#",
      "aspect": 0.8,
      "excerpt": "Open Sketchbook 26: a placeholder entry from the April archive.",
      "content": "<p>Welcome to <strong>Open Sketchbook 26</strong>, filed under APRIL INSPIRE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "cc2ErBxMRRac8OjGjKoUQQ",
      "index": 27,
      "title": "Soft Moodboard 27",
      "slug": "soft-moodboard-27",
      "month": "APRIL",
      "tag": "INSPIRE",
      "date": "2025-04-19",
      "cover": "./assets/images/cover-03.svg",
      "url": "#",
      "aspect": 1.25,
      "excerpt": "Soft Moodboard 27: a placeholder entry from the April archive.",
      "content": "<p>Welcome to <strong>Soft Moodboard 27</strong>, filed under APRIL INSPIRE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "FP7-XwF9RmCS-cxRkG5C8Q",
      "index": 28,
      "title": "Neon Studio Notes 28",
      "slug": "neon-studio-notes-28",
      "month": "APRIL",
      "tag": "INSPIRE",
      "date": "2025-04-24",
      "cover": "./assets/images/cover-04.svg",
      "url": "#",
      "aspect": 0.8,
      "excerpt": "Neon Studio Notes 28: a placeholder entry from the April archive.",
      "content": "<p>Welcome to <strong>Neon Studio Notes 28</strong>, filed under APRIL INSPIRE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "IK-fI1_USr2vn9Y4wVjz7Q",
      "index": 29,
      "title": "Hollow Playlist 29",
      "slug": "hollow-playlist-29",
      "month": "MAY",
      "tag": "EDUCATE",
      "date": "2024-05-01",
      "cover": "./assets/images/cover-05.svg",
      "url": "#",
      "aspect": 1.25,
      "excerpt": "Hollow Playlist 29: a placeholder entry from the May archive.",
      "content": "<p>Welcome to <strong>Hollow Playlist 29</strong>, filed under MAY EDUCATE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "I_xgRrouTcGMOoyy9LhzrQ",
      "index": 30,
      "title": "Bright Pop-up 30",
      "slug": "bright-pop-up-30",
      "month": "JUNE",
      "tag": "INSPIRE",
      "date": "2024-06-01",
      "cover": "./assets/images/cover-06.svg",
      "url": "#",
      "aspect": 0.8,
      "excerpt": "Bright Pop-up 30: a placeholder entry from the June archive.",
      "content": "<p>Welcome to <strong>Bright Pop-up 30</strong>, filed under JUNE INSPIRE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "Sf6CrL0gRSyhdF18mY0MPA",
      "index": 31,
      "title": "Slow Postcard 31",
      "slug": "slow-postcard-31",
      "month": "JUNE",
      "tag": "SHOWCASE",
      "date": "2024-06-28",
      "cover": "./assets/images/cover-07.svg",
      "url": "#",
      "aspect": 1.25,
      "excerpt": "Slow Postcard 31: a placeholder entry from the June archive.",
      "content": "<p>Welcome to <strong>Slow Postcard 31</strong>, filed under JUNE SHOWCASE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "UYv0STvPS8qb4O1-uV2XQw",
      "index": 32,
      "title": "Wild Residency 32",
      "slug": "wild-residency-32",
      "month": "JUNE",
      "tag": "INSPIRE",
      "date": "2024-06-20",
      "cover": "./assets/images/cover-08.svg",
      "url": "#",
      "aspect": 0.8,
      "excerpt": "Wild Residency 32: a placeholder entry from the June archive.",
      "content": "<p>Welcome to <strong>Wild Residency 32</strong>, filed under JUNE INSPIRE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "CQucWWygQFWuaPVqa6FuIA",
      "index": 33,
      "title": "Linen Mixtape 33",
      "slug": "linen-mixtape-33",
      "month": "JULY",
      "tag": "INSPIRE",
      "date": "2024-07-05",
      "cover": "./assets/images/cover-09.svg",
      "url": "#",
      "aspect": 1.25,
      "excerpt": "Linen Mixtape 33: a placeholder entry from the July archive.",
      "content": "<p>Welcome to <strong>Linen Mixtape 33</strong>, filed under JULY INSPIRE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "bTdBO4baRZqzAFXnre5lGA",
      "index": 34,
      "title": "Cobalt Case File 34",
      "slug": "cobalt-case-file-34",
      "month": "AUGUST",
      "tag": "SHOWCASE",
      "date": "2024-08-14",
      "cover": "./assets/images/cover-10.svg",
      "url": "#",
      "aspect": 0.8,
      "excerpt": "Cobalt Case File 34: a placeholder entry from the August archive.",
      "content": "<p>Welcome to <strong>Cobalt Case File 34</strong>, filed under AUGUST SHOWCASE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "IU1XvFxeSV6EYk5u9FZ2ow",
      "index": 35,
      "title": "Amber Field Report 35",
      "slug": "amber-field-report-35",
      "month": "AUGUST",
      "tag": "EDUCATE",
      "date": "2024-08-16",
      "cover": "./assets/images/cover-11.svg",
      "url": "#",
      "aspect": 1.25,
      "excerpt": "Amber Field Report 35: a placeholder entry from the August archive.",
      "content": "<p>Welcome to <strong>Amber Field Report 35</strong>, filed under AUGUST EDUCATE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "IZEllU8YTSKnI-mreOrmJw",
      "index": 36,
      "title": "Velvet Looking Glass 36",
      "slug": "velvet-looking-glass-36",
      "month": "SEPTEMBER",
      "tag": "INSPIRE",
      "date": "2024-09-03",
      "cover": "./assets/images/cover-12.svg",
      "url": "#",
      "aspect": 0.8,
      "excerpt": "Velvet Looking Glass 36: a placeholder entry from the September archive.",
      "content": "<p>Welcome to <strong>Velvet Looking Glass 36</strong>, filed under SEPTEMBER INSPIRE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "YWCz92WwR6OSkLF2-0kmiA",
      "index": 37,
      "title": "Static Interview 37",
      "slug": "static-interview-37",
      "month": "SEPTEMBER",
      "tag": "EDUCATE",
      "date": "2024-09-17",
      "cover": "./assets/images/cover-01.svg",
      "url": "#",
      "aspect": 1.25,
      "excerpt": "Static Interview 37: a placeholder entry from the September archive.",
      "content": "<p>Welcome to <strong>Static Interview 37</strong>, filed under SEPTEMBER EDUCATE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "TRTIcRPKSCKxJ0RDCQBW9g",
      "index": 38,
      "title": "Tidal Workshop 38",
      "slug": "tidal-workshop-38",
      "month": "SEPTEMBER",
      "tag": "INSPIRE",
      "date": "2024-09-23",
      "cover": "./assets/images/cover-02.svg",
      "url": "#",
      "aspect": 0.8,
      "excerpt": "Tidal Workshop 38: a placeholder entry from the September archive.",
      "content": "<p>Welcome to <strong>Tidal Workshop 38</strong>, filed under SEPTEMBER INSPIRE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "FQUg0avyTPq2tUj5n2a7fw",
      "index": 39,
      "title": "Marble Archive Card 39",
      "slug": "marble-archive-card-39",
      "month": "OCTOBER",
      "tag": "INSPIRE",
      "date": "2024-10-02",
      "cover": "./assets/images/cover-03.svg",
      "url": "#",
      "aspect": 1.25,
      "excerpt": "Marble Archive Card 39: a placeholder entry from the October archive.",
      "content": "<p>Welcome to <strong>Marble Archive Card 39</strong>, filed under OCTOBER INSPIRE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "IRf8Z2FFSWmvfcsLLiL8Zw",
      "index": 40,
      "title": "Ember Prototype 40",
      "slug": "ember-prototype-40",
      "month": "OCTOBER",
      "tag": "INSPIRE",
      "date": "2024-10-14",
      "cover": "./assets/images/cover-04.svg",
      "url": "#",
      "aspect": 0.8,
      "excerpt": "Ember Prototype 40: a placeholder entry from the October archive.",
      "content": "<p>Welcome to <strong>Ember Prototype 40</strong>, filed under OCTOBER INSPIRE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "QWyA34zXTfCyPluI72rHZQ",
      "index": 41,
      "title": "Quiet Drop 41",
      "slug": "quiet-drop-41",
      "month": "NOVEMBER",
      "tag": "INSPIRE",
      "date": "2024-11-08",
      "cover": "./assets/images/cover-05.svg",
      "url": "#",
      "aspect": 1.25,
      "excerpt": "Quiet Drop 41: a placeholder entry from the November archive.",
      "content": "<p>Welcome to <strong>Quiet Drop 41</strong>, filed under NOVEMBER INSPIRE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "Y-iJMBBHThKMKzcZBC1Mxw",
      "index": 42,
      "title": "Golden Sketchbook 42",
      "slug": "golden-sketchbook-42",
      "month": "NOVEMBER",
      "tag": "INSPIRE",
      "date": "2024-11-11",
      "cover": "./assets/images/cover-06.svg",
      "url": "#",
      "aspect": 0.8,
      "excerpt": "Golden Sketchbook 42: a placeholder entry from the November archive.",
      "content": "<p>Welcome to <strong>Golden Sketchbook 42</strong>, filed under NOVEMBER INSPIRE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "WFREHV7IQk-HxGUD1Zv7Mw",
      "index": 43,
      "title": "Paper Moodboard 43",
      "slug": "paper-moodboard-43",
      "month": "DECEMBER",
      "tag": "EDUCATE",
      "date": "2024-12-02",
      "cover": "./assets/images/cover-07.svg",
      "url": "#",
      "aspect": 1.25,
      "excerpt": "Paper Moodboard 43: a placeholder entry from the December archive.",
      "content": "<p>Welcome to <strong>Paper Moodboard 43</strong>, filed under DECEMBER EDUCATE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "bV7esa5WRu2z88Jo5moRwg",
      "index": 44,
      "title": "Signal Studio Notes 44",
      "slug": "signal-studio-notes-44",
      "month": "DECEMBER",
      "tag": "INSPIRE",
      "date": "2024-12-16",
      "cover": "./assets/images/cover-08.svg",
      "url": "#",
      "aspect": 0.8,
      "excerpt": "Signal Studio Notes 44: a placeholder entry from the December archive.",
      "content": "<p>Welcome to <strong>Signal Studio Notes 44</strong>, filed under DECEMBER INSPIRE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "NLtZpsRUSAac7LegYVndRA",
      "index": 45,
      "title": "Midnight Playlist 45",
      "slug": "midnight-playlist-45",
      "month": "DECEMBER",
      "tag": "SHOWCASE",
      "date": "2024-12-23",
      "cover": "./assets/images/cover-09.svg",
      "url": "#",
      "aspect": 1.25,
      "excerpt": "Midnight Playlist 45: a placeholder entry from the December archive.",
      "content": "<p>Welcome to <strong>Midnight Playlist 45</strong>, filed under DECEMBER SHOWCASE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "encCSe6YRgqZve989qpGHg",
      "index": 46,
      "title": "Open Pop-up 46",
      "slug": "open-pop-up-46",
      "month": "JANUARY",
      "tag": "SHOWCASE",
      "date": "2024-01-01",
      "cover": "./assets/images/cover-10.svg",
      "url": "#",
      "aspect": 0.8,
      "excerpt": "Open Pop-up 46: a placeholder entry from the January archive.",
      "content": "<p>Welcome to <strong>Open Pop-up 46</strong>, filed under JANUARY SHOWCASE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "WeSWSWV4SSirFC67kJ2xYw",
      "index": 47,
      "title": "Soft Postcard 47",
      "slug": "soft-postcard-47",
      "month": "MAY",
      "tag": "INSPIRE",
      "date": "2025-05-03",
      "cover": "./assets/images/cover-11.svg",
      "url": "#",
      "aspect": 1.25,
      "excerpt": "Soft Postcard 47: a placeholder entry from the May archive.",
      "content": "<p>Welcome to <strong>Soft Postcard 47</strong>, filed under MAY INSPIRE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "bomWHdHKQ_-nWBK1nG1-8Q",
      "index": 48,
      "title": "Neon Residency 48",
      "slug": "neon-residency-48",
      "month": "MAY",
      "tag": "INSPIRE",
      "date": "2025-05-11",
      "cover": "./assets/images/cover-12.svg",
      "url": "#",
      "aspect": 0.8,
      "excerpt": "Neon Residency 48: a placeholder entry from the May archive.",
      "content": "<p>Welcome to <strong>Neon Residency 48</strong>, filed under MAY INSPIRE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "J87NTfgpQpCIaeXnn_YmWQ",
      "index": 49,
      "title": "Hollow Mixtape 49",
      "slug": "hollow-mixtape-49",
      "month": "MAY",
      "tag": "INSPIRE",
      "date": "2025-05-18",
      "cover": "./assets/images/cover-01.svg",
      "url": "#",
      "aspect": 1.25,
      "excerpt": "Hollow Mixtape 49: a placeholder entry from the May archive.",
      "content": "<p>Welcome to <strong>Hollow Mixtape 49</strong>, filed under MAY INSPIRE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "EX-pguGeR7-dUXlotmy5NQ",
      "index": 50,
      "title": "Bright Case File 50",
      "slug": "bright-case-file-50",
      "month": "JUNE",
      "tag": "INSPIRE",
      "date": "2025-06-19",
      "cover": "./assets/images/cover-02.svg",
      "url": "#",
      "aspect": 0.8,
      "excerpt": "Bright Case File 50: a placeholder entry from the June archive.",
      "content": "<p>Welcome to <strong>Bright Case File 50</strong>, filed under JUNE INSPIRE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "GIpz9eiYQBehOLAfxjTWcg",
      "index": 51,
      "title": "Slow Field Report 51",
      "slug": "slow-field-report-51",
      "month": "FEBRUARY",
      "tag": "SHOWCASE",
      "date": "2024-02-19",
      "cover": "./assets/images/cover-03.svg",
      "url": "#",
      "aspect": 1.25,
      "excerpt": "Slow Field Report 51: a placeholder entry from the February archive.",
      "content": "<p>Welcome to <strong>Slow Field Report 51</strong>, filed under FEBRUARY SHOWCASE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "BpsDZcMjRSOQ1u66z5QMCA",
      "index": 52,
      "title": "Wild Looking Glass 52",
      "slug": "wild-looking-glass-52",
      "month": "AUGUST",
      "tag": "INSPIRE",
      "date": "2025-08-07",
      "cover": "./assets/images/cover-04.svg",
      "url": "#",
      "aspect": 0.8,
      "excerpt": "Wild Looking Glass 52: a placeholder entry from the August archive.",
      "content": "<p>Welcome to <strong>Wild Looking Glass 52</strong>, filed under AUGUST INSPIRE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "HIFheQ86QuGmhWTveWqeLg",
      "index": 53,
      "title": "Linen Interview 53",
      "slug": "linen-interview-53",
      "month": "SEPTEMBER",
      "tag": "INSPIRE",
      "date": "2025-09-15",
      "cover": "./assets/images/cover-05.svg",
      "url": "#",
      "aspect": 1.25,
      "excerpt": "Linen Interview 53: a placeholder entry from the September archive.",
      "content": "<p>Welcome to <strong>Linen Interview 53</strong>, filed under SEPTEMBER INSPIRE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "VC8ZukT5R6WJuTmStVDnBw",
      "index": 54,
      "title": "Cobalt Workshop 54",
      "slug": "cobalt-workshop-54",
      "month": "FEBRUARY",
      "tag": "INSPIRE",
      "date": "2024-02-11",
      "cover": "./assets/images/cover-06.svg",
      "url": "#",
      "aspect": 0.8,
      "excerpt": "Cobalt Workshop 54: a placeholder entry from the February archive.",
      "content": "<p>Welcome to <strong>Cobalt Workshop 54</strong>, filed under FEBRUARY INSPIRE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "MHzMa9mvQSW4d-WRQ_XvSA",
      "index": 55,
      "title": "Amber Archive Card 55",
      "slug": "amber-archive-card-55",
      "month": "MARCH",
      "tag": "EDUCATE",
      "date": "2024-03-01",
      "cover": "./assets/images/cover-07.svg",
      "url": "#",
      "aspect": 1.25,
      "excerpt": "Amber Archive Card 55: a placeholder entry from the March archive.",
      "content": "<p>Welcome to <strong>Amber Archive Card 55</strong>, filed under MARCH EDUCATE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "d1TkTSZ2TtCerWO8NyYD_Q",
      "index": 56,
      "title": "Velvet Prototype 56",
      "slug": "velvet-prototype-56",
      "month": "MARCH",
      "tag": "SHOWCASE",
      "date": "2024-03-18",
      "cover": "./assets/images/cover-08.svg",
      "url": "#",
      "aspect": 0.8,
      "excerpt": "Velvet Prototype 56: a placeholder entry from the March archive.",
      "content": "<p>Welcome to <strong>Velvet Prototype 56</strong>, filed under MARCH SHOWCASE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "ThN99J5VR0mjEU-0OY16LQ",
      "index": 57,
      "title": "Static Drop 57",
      "slug": "static-drop-57",
      "month": "SEPTEMBER",
      "tag": "INSPIRE",
      "date": "2025-09-16",
      "cover": "./assets/images/cover-09.svg",
      "url": "#",
      "aspect": 1.25,
      "excerpt": "Static Drop 57: a placeholder entry from the September archive.",
      "content": "<p>Welcome to <strong>Static Drop 57</strong>, filed under SEPTEMBER INSPIRE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "UQM-nV2RSa2HEUOIYg4G9g",
      "index": 58,
      "title": "Tidal Sketchbook 58",
      "slug": "tidal-sketchbook-58",
      "month": "SEPTEMBER",
      "tag": "INSPIRE",
      "date": "2025-09-21",
      "cover": "./assets/images/cover-10.svg",
      "url": "#",
      "aspect": 0.8,
      "excerpt": "Tidal Sketchbook 58: a placeholder entry from the September archive.",
      "content": "<p>Welcome to <strong>Tidal Sketchbook 58</strong>, filed under SEPTEMBER INSPIRE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "VvpIaTkJT_60B-GVrGfidg",
      "index": 59,
      "title": "Marble Moodboard 59",
      "slug": "marble-moodboard-59",
      "month": "OCTOBER",
      "tag": "INSPIRE",
      "date": "2025-10-02",
      "cover": "./assets/images/cover-11.svg",
      "url": "#",
      "aspect": 1.25,
      "excerpt": "Marble Moodboard 59: a placeholder entry from the October archive.",
      "content": "<p>Welcome to <strong>Marble Moodboard 59</strong>, filed under OCTOBER INSPIRE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "eiAJQ4wOTWOVzQqb96Dhuw",
      "index": 60,
      "title": "Ember Studio Notes 60",
      "slug": "ember-studio-notes-60",
      "month": "OCTOBER",
      "tag": "INSPIRE",
      "date": "2025-10-19",
      "cover": "./assets/images/cover-12.svg",
      "url": "#",
      "aspect": 0.8,
      "excerpt": "Ember Studio Notes 60: a placeholder entry from the October archive.",
      "content": "<p>Welcome to <strong>Ember Studio Notes 60</strong>, filed under OCTOBER INSPIRE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "Ox8Nj5RrQQ2U08W07sCj8w",
      "index": 61,
      "title": "Quiet Playlist 61",
      "slug": "quiet-playlist-61",
      "month": "OCTOBER",
      "tag": "INSPIRE",
      "date": "2025-10-24",
      "cover": "./assets/images/cover-01.svg",
      "url": "#",
      "aspect": 1.25,
      "excerpt": "Quiet Playlist 61: a placeholder entry from the October archive.",
      "content": "<p>Welcome to <strong>Quiet Playlist 61</strong>, filed under OCTOBER INSPIRE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "f2nRK6ZEQ6yP9-Cd7oLUlw",
      "index": 62,
      "title": "Golden Pop-up 62",
      "slug": "golden-pop-up-62",
      "month": "NOVEMBER",
      "tag": "INSPIRE",
      "date": "2025-11-04",
      "cover": "./assets/images/cover-02.svg",
      "url": "#",
      "aspect": 0.8,
      "excerpt": "Golden Pop-up 62: a placeholder entry from the November archive.",
      "content": "<p>Welcome to <strong>Golden Pop-up 62</strong>, filed under NOVEMBER INSPIRE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "deZims2nTrCsqKHi5vRO1Q",
      "index": 63,
      "title": "Paper Postcard 63",
      "slug": "paper-postcard-63",
      "month": "NOVEMBER",
      "tag": "INSPIRE",
      "date": "2025-11-25",
      "cover": "./assets/images/cover-03.svg",
      "url": "#",
      "aspect": 1.25,
      "excerpt": "Paper Postcard 63: a placeholder entry from the November archive.",
      "content": "<p>Welcome to <strong>Paper Postcard 63</strong>, filed under NOVEMBER INSPIRE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "euSohP_bRPSbcemzC_nI3w",
      "index": 64,
      "title": "Signal Residency 64",
      "slug": "signal-residency-64",
      "month": "NOVEMBER",
      "tag": "INSPIRE",
      "date": "2025-11-30",
      "cover": "./assets/images/cover-04.svg",
      "url": "#",
      "aspect": 0.8,
      "excerpt": "Signal Residency 64: a placeholder entry from the November archive.",
      "content": "<p>Welcome to <strong>Signal Residency 64</strong>, filed under NOVEMBER INSPIRE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "SV5SMn69RziIjIOdesLPlQ",
      "index": 65,
      "title": "Midnight Mixtape 65",
      "slug": "midnight-mixtape-65",
      "month": "DECEMBER",
      "tag": "INSPIRE",
      "date": "2025-12-06",
      "cover": "./assets/images/cover-05.svg",
      "url": "#",
      "aspect": 1.25,
      "excerpt": "Midnight Mixtape 65: a placeholder entry from the December archive.",
      "content": "<p>Welcome to <strong>Midnight Mixtape 65</strong>, filed under DECEMBER INSPIRE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "PE36A1hHRuirGFEK810Eew",
      "index": 66,
      "title": "Open Case File 66",
      "slug": "open-case-file-66",
      "month": "DECEMBER",
      "tag": "INSPIRE",
      "date": "2025-12-15",
      "cover": "./assets/images/cover-06.svg",
      "url": "#",
      "aspect": 0.8,
      "excerpt": "Open Case File 66: a placeholder entry from the December archive.",
      "content": "<p>Welcome to <strong>Open Case File 66</strong>, filed under DECEMBER INSPIRE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "Gmy8HQQlTkeAox1HQ8JcQQ",
      "index": 67,
      "title": "Soft Field Report 67",
      "slug": "soft-field-report-67",
      "month": "DECEMBER",
      "tag": "INSPIRE",
      "date": "2025-12-23",
      "cover": "./assets/images/cover-07.svg",
      "url": "#",
      "aspect": 1.25,
      "excerpt": "Soft Field Report 67: a placeholder entry from the December archive.",
      "content": "<p>Welcome to <strong>Soft Field Report 67</strong>, filed under DECEMBER INSPIRE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "dmavSlDHSAST6OXTSzAENw",
      "index": 68,
      "title": "Neon Looking Glass 68",
      "slug": "neon-looking-glass-68",
      "month": "APRIL",
      "tag": "SHOWCASE",
      "date": "2024-04-15",
      "cover": "./assets/images/cover-08.svg",
      "url": "#",
      "aspect": 0.8,
      "excerpt": "Neon Looking Glass 68: a placeholder entry from the April archive.",
      "content": "<p>Welcome to <strong>Neon Looking Glass 68</strong>, filed under APRIL SHOWCASE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "Zi4eknz0QZ2c4M6vH9BhXQ",
      "index": 69,
      "title": "Hollow Interview 69",
      "slug": "hollow-interview-69",
      "month": "MAY",
      "tag": "SHOWCASE",
      "date": "2024-05-21",
      "cover": "./assets/images/cover-09.svg",
      "url": "#",
      "aspect": 1.25,
      "excerpt": "Hollow Interview 69: a placeholder entry from the May archive.",
      "content": "<p>Welcome to <strong>Hollow Interview 69</strong>, filed under MAY SHOWCASE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "NzTSn35bQ0K92kLAvttVhA",
      "index": 70,
      "title": "Bright Workshop 70",
      "slug": "bright-workshop-70",
      "month": "JULY",
      "tag": "SHOWCASE",
      "date": "2024-07-15",
      "cover": "./assets/images/cover-10.svg",
      "url": "#",
      "aspect": 0.8,
      "excerpt": "Bright Workshop 70: a placeholder entry from the July archive.",
      "content": "<p>Welcome to <strong>Bright Workshop 70</strong>, filed under JULY SHOWCASE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "ZVo_Q3oARKyCCZLDOkF-NA",
      "index": 71,
      "title": "Slow Archive Card 71",
      "slug": "slow-archive-card-71",
      "month": "OCTOBER",
      "tag": "INSPIRE",
      "date": "2024-10-21",
      "cover": "./assets/images/cover-11.svg",
      "url": "#",
      "aspect": 1.25,
      "excerpt": "Slow Archive Card 71: a placeholder entry from the October archive.",
      "content": "<p>Welcome to <strong>Slow Archive Card 71</strong>, filed under OCTOBER INSPIRE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "bfEXlyWRTP-30b4V3F8Emw",
      "index": 72,
      "title": "Wild Prototype 72",
      "slug": "wild-prototype-72",
      "month": "NOVEMBER",
      "tag": "EDUCATE",
      "date": "2024-11-01",
      "cover": "./assets/images/cover-12.svg",
      "url": "#",
      "aspect": 0.8,
      "excerpt": "Wild Prototype 72: a placeholder entry from the November archive.",
      "content": "<p>Welcome to <strong>Wild Prototype 72</strong>, filed under NOVEMBER EDUCATE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "Crv6u174ToOo1trFlvKZeA",
      "index": 73,
      "title": "Linen Drop 73",
      "slug": "linen-drop-73",
      "month": "MAY",
      "tag": "INSPIRE",
      "date": "2025-05-24",
      "cover": "./assets/images/cover-01.svg",
      "url": "#",
      "aspect": 1.25,
      "excerpt": "Linen Drop 73: a placeholder entry from the May archive.",
      "content": "<p>Welcome to <strong>Linen Drop 73</strong>, filed under MAY INSPIRE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "Pbp-0z2pSTO62PWOQEOslA",
      "index": 74,
      "title": "Cobalt Sketchbook 74",
      "slug": "cobalt-sketchbook-74",
      "month": "JULY",
      "tag": "INSPIRE",
      "date": "2025-07-24",
      "cover": "./assets/images/cover-02.svg",
      "url": "#",
      "aspect": 0.8,
      "excerpt": "Cobalt Sketchbook 74: a placeholder entry from the July archive.",
      "content": "<p>Welcome to <strong>Cobalt Sketchbook 74</strong>, filed under JULY INSPIRE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "JZLYcw3NRCyxu4qmmR46Fg",
      "index": 75,
      "title": "Amber Moodboard 75",
      "slug": "amber-moodboard-75",
      "month": "FEBRUARY",
      "tag": "INSPIRE",
      "date": "2026-02-05",
      "cover": "./assets/images/cover-03.svg",
      "url": "#",
      "aspect": 1.25,
      "excerpt": "Amber Moodboard 75: a placeholder entry from the February archive.",
      "content": "<p>Welcome to <strong>Amber Moodboard 75</strong>, filed under FEBRUARY INSPIRE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "fcRI5KHpSamcaImD8cFudA",
      "index": 76,
      "title": "Velvet Studio Notes 76",
      "slug": "velvet-studio-notes-76",
      "month": "AUGUST",
      "tag": "INSPIRE",
      "date": "2025-08-25",
      "cover": "./assets/images/cover-04.svg",
      "url": "#",
      "aspect": 0.8,
      "excerpt": "Velvet Studio Notes 76: a placeholder entry from the August archive.",
      "content": "<p>Welcome to <strong>Velvet Studio Notes 76</strong>, filed under AUGUST INSPIRE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "RPB_0OBnQSi-Ewhw88wI5Q",
      "index": 77,
      "title": "Static Playlist 77",
      "slug": "static-playlist-77",
      "month": "JANUARY",
      "tag": "SHOWCASE",
      "date": "2026-01-10",
      "cover": "./assets/images/cover-05.svg",
      "url": "#",
      "aspect": 1.25,
      "excerpt": "Static Playlist 77: a placeholder entry from the January archive.",
      "content": "<p>Welcome to <strong>Static Playlist 77</strong>, filed under JANUARY SHOWCASE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "GNkwW0iyQaagLnOLf5nybQ",
      "index": 78,
      "title": "Tidal Pop-up 78",
      "slug": "tidal-pop-up-78",
      "month": "JANUARY",
      "tag": "INSPIRE",
      "date": "2026-01-27",
      "cover": "./assets/images/cover-06.svg",
      "url": "#",
      "aspect": 0.8,
      "excerpt": "Tidal Pop-up 78: a placeholder entry from the January archive.",
      "content": "<p>Welcome to <strong>Tidal Pop-up 78</strong>, filed under JANUARY INSPIRE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "eUSjrAH7RPSKZ5F9y8SLiQ",
      "index": 79,
      "title": "Marble Postcard 79",
      "slug": "marble-postcard-79",
      "month": "FEBRUARY",
      "tag": "INSPIRE",
      "date": "2026-02-21",
      "cover": "./assets/images/cover-07.svg",
      "url": "#",
      "aspect": 1.25,
      "excerpt": "Marble Postcard 79: a placeholder entry from the February archive.",
      "content": "<p>Welcome to <strong>Marble Postcard 79</strong>, filed under FEBRUARY INSPIRE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "cgIwwRXUQW-vqtEX5u14ag",
      "index": 80,
      "title": "Ember Residency 80",
      "slug": "ember-residency-80",
      "month": "JANUARY",
      "tag": "SHOWCASE",
      "date": "2026-01-30",
      "cover": "./assets/images/cover-08.svg",
      "url": "#",
      "aspect": 0.8,
      "excerpt": "Ember Residency 80: a placeholder entry from the January archive.",
      "content": "<p>Welcome to <strong>Ember Residency 80</strong>, filed under JANUARY SHOWCASE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
    },
    {
      "id": "a0kpiu_OS7m02uozqvvJYQ",
      "index": 81,
      "title": "Quiet Mixtape 81",
      "slug": "quiet-mixtape-81",
      "month": "JULY",
      "tag": "SHOWCASE",
      "date": "2024-07-22",
      "cover": "./assets/images/cover-09.svg",
      "url": "#",
      "aspect": 1.25,
      "excerpt": "Quiet Mixtape 81: a placeholder entry from the July archive.",
      "content": "<p>Welcome to <strong>Quiet Mixtape 81</strong>, filed under JULY SHOWCASE.</p><p>This is sample text. Replace it with your own notes, links and images from the admin panel.</p>"
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
        console.warn('[YBStore] DOMParser sanitize failed, using fallback:', e);
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
      var req = indexedDB.open('yb_cms_db', 1);
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
        console.warn('[YBStore] IndexedDB failed to open, using memory fallback');
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

  var YBStore = {
    STORAGE_KEY: STORAGE_KEY,
    DRAFT_STORAGE_KEY: DRAFT_STORAGE_KEY,
    CHANNEL_NAME: CHANNEL_NAME,
    escapeHtml: escapeHtml,
    sanitizeHtml: sanitizeHtml,
    sanitizeUrl: sanitizeUrl,

    getDefaultData: function () {
      return JSON.parse(JSON.stringify(YB_DEFAULT_DATA));
    },

    getMediaLibrary: function () {
      return _customMediaItems.concat(YB_MEDIA_LIBRARY);
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
            console.warn('[YBStore] Failed to write media to IndexedDB:', e);
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
        console.error('[YBStore] Failed to read stored data, using default:', err);
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
        console.error('[YBStore] Failed to save data (quota or serialization):', err);
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
        console.error('[YBStore] Failed to publish data (quota or serialization):', err);
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
        console.error('[YBStore] Failed to save draft:', err);
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
        console.error('[YBStore] Reset failed:', err);
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
              cover: sanitizeUrl(a.cover, true) || './assets/images/cover-01.svg',
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
              artist: typeof t.artist === 'string' ? sanitize(t.artist) : 'edvlabs Sound',
              audioUrl: sanitizeUrl(t.audioUrl) || '',
              thumbnail: sanitizeUrl(t.thumbnail, true) || './assets/images/favicon.svg'
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
        console.error('[YBStore] importJSON failed:', err);
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
          console.warn('[YBStore] BroadcastChannel postMessage failed:', err);
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

  global.YB_DEFAULT_DATA = YB_DEFAULT_DATA;
  global.YB_MEDIA_LIBRARY = YB_MEDIA_LIBRARY;
  global.YBStore = YBStore;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      YB_DEFAULT_DATA: YB_DEFAULT_DATA,
      YB_MEDIA_LIBRARY: YB_MEDIA_LIBRARY,
      YBStore: YBStore
    };
  }
})(typeof window !== 'undefined' ? window : global);

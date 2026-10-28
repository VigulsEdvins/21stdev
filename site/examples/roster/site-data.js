/**
 * edvlabs Roster — Centralized CMS Data Store & Default Content (`site-data.js`)
 *
 * Provides:
 * - `window.EDV_MEDIA_LIBRARY`: Catalog of all local images & videos in `./assets/images/`
 * - `window.EDV_DEFAULT_DATA`: Complete default content matching #
 * - `window.EDVStore`: Load, draft/publish, reset, export/import, image upload, and real-time BroadcastChannel sync
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'edv_roster_site_data_v1';
  const DRAFT_STORAGE_KEY = 'edv_roster_site_draft_v1';
  const UPLOADS_STORAGE_KEY = 'edv_roster_custom_uploads_v1';
  const CHANNEL_NAME = 'edv_roster_cms_sync_channel';

  const EDV_MEDIA_LIBRARY = [
  {
    "src": "./assets/images/art-01.svg",
    "label": "Artwork 1",
    "category": "Gallery",
    "type": "img",
    "poster": ""
  },
  {
    "src": "./assets/images/art-02.svg",
    "label": "Artwork 2",
    "category": "Gallery",
    "type": "img",
    "poster": ""
  },
  {
    "src": "./assets/images/art-03.svg",
    "label": "Artwork 3",
    "category": "Gallery",
    "type": "img",
    "poster": ""
  },
  {
    "src": "./assets/images/art-04.svg",
    "label": "Artwork 4",
    "category": "Gallery",
    "type": "img",
    "poster": ""
  },
  {
    "src": "./assets/images/art-05.svg",
    "label": "Artwork 5",
    "category": "Gallery",
    "type": "img",
    "poster": ""
  },
  {
    "src": "./assets/images/art-06.svg",
    "label": "Artwork 6",
    "category": "Gallery",
    "type": "img",
    "poster": ""
  },
  {
    "src": "./assets/images/art-07.svg",
    "label": "Artwork 7",
    "category": "Gallery",
    "type": "img",
    "poster": ""
  },
  {
    "src": "./assets/images/art-08.svg",
    "label": "Artwork 8",
    "category": "Gallery",
    "type": "img",
    "poster": ""
  },
  {
    "src": "./assets/images/art-09.svg",
    "label": "Artwork 9",
    "category": "Gallery",
    "type": "img",
    "poster": ""
  },
  {
    "src": "./assets/images/art-10.svg",
    "label": "Artwork 10",
    "category": "Gallery",
    "type": "img",
    "poster": ""
  },
  {
    "src": "./assets/images/art-11.svg",
    "label": "Artwork 11",
    "category": "Gallery",
    "type": "img",
    "poster": ""
  },
  {
    "src": "./assets/images/art-12.svg",
    "label": "Artwork 12",
    "category": "Gallery",
    "type": "img",
    "poster": ""
  },
  {
    "src": "./assets/images/art-13.svg",
    "label": "Artwork 13",
    "category": "Gallery",
    "type": "img",
    "poster": ""
  },
  {
    "src": "./assets/images/art-14.svg",
    "label": "Artwork 14",
    "category": "Gallery",
    "type": "img",
    "poster": ""
  },
  {
    "src": "./assets/images/art-15.svg",
    "label": "Artwork 15",
    "category": "Gallery",
    "type": "img",
    "poster": ""
  },
  {
    "src": "./assets/images/art-16.svg",
    "label": "Artwork 16",
    "category": "Gallery",
    "type": "img",
    "poster": ""
  }
];

  const EDV_DEFAULT_DATA = {
  "hero": {
    "srTitle": "edvlabs — artist management + production",
    "tagline": "Artist management + production.",
    "shuffleColumns": false
  },
  "navbar": {
    "leftLabel": "Artists",
    "leftHref": "#artists",
    "centerLinks": [
      {
        "id": "nav-1",
        "label": "News",
        "href": "#news"
      },
      {
        "id": "nav-2",
        "label": "About",
        "href": "#about"
      },
      {
        "id": "nav-3",
        "label": "All",
        "href": "#all"
      }
    ],
    "rightLabel": "Production",
    "rightHref": "#production",
    "mobileLinks": [
      {
        "id": "mob-1",
        "label": "Home",
        "href": "#top"
      },
      {
        "id": "mob-2",
        "label": "News",
        "href": "#news"
      },
      {
        "id": "mob-3",
        "label": "About",
        "href": "#about"
      },
      {
        "id": "mob-4",
        "label": "Contact",
        "href": "mailto:hello@edvlabs.example"
      }
    ]
  },
  "galleryColumns": [
    {
      "id": "col-1",
      "name": "Artist 01",
      "href": "#artist-artist-01",
      "media": [
        {
          "id": "col-1-m-1",
          "type": "img",
          "src": "./assets/images/art-01.svg",
          "poster": "",
          "color": "#BFBDC5",
          "width": 912,
          "height": 1140
        },
        {
          "id": "col-1-m-2",
          "type": "img",
          "src": "./assets/images/art-02.svg",
          "poster": "",
          "color": "#A8C5D2",
          "width": 1500,
          "height": 2048
        },
        {
          "id": "col-1-m-3",
          "type": "img",
          "src": "./assets/images/art-03.svg",
          "poster": "",
          "color": "#CEBCAE",
          "width": 2000,
          "height": 2500
        },
        {
          "id": "col-1-m-4",
          "type": "img",
          "src": "./assets/images/art-04.svg",
          "poster": "",
          "color": "#DCB7C8",
          "width": 1000,
          "height": 1500
        }
      ],
      "cycleMedia": [
        {
          "id": "col-1-c-1",
          "type": "img",
          "src": "./assets/images/art-05.svg",
          "poster": "",
          "color": "#D2B7A9"
        },
        {
          "id": "col-1-c-2",
          "type": "img",
          "src": "./assets/images/art-06.svg",
          "poster": "",
          "color": "#819D65"
        },
        {
          "id": "col-1-c-3",
          "type": "img",
          "src": "./assets/images/art-07.svg",
          "poster": "",
          "color": "#D5C3B8"
        }
      ]
    },
    {
      "id": "col-2",
      "name": "Artist 02",
      "href": "#artist-artist-02",
      "media": [
        {
          "id": "col-2-m-1",
          "type": "img",
          "src": "./assets/images/art-05.svg",
          "poster": "",
          "color": "#D2B7A9",
          "width": 760,
          "height": 1140
        },
        {
          "id": "col-2-m-2",
          "type": "img",
          "src": "./assets/images/art-06.svg",
          "poster": "",
          "color": "#819D65",
          "width": 760,
          "height": 1140
        },
        {
          "id": "col-2-m-3",
          "type": "img",
          "src": "./assets/images/art-08.svg",
          "poster": "",
          "color": "#D3B7A9",
          "width": 1140,
          "height": 1140
        },
        {
          "id": "col-2-m-4",
          "type": "img",
          "src": "./assets/images/art-07.svg",
          "poster": "",
          "color": "#D5C3B8",
          "width": 760,
          "height": 1140
        }
      ],
      "cycleMedia": [
        {
          "id": "col-2-c-1",
          "type": "img",
          "src": "./assets/images/art-09.svg",
          "poster": "",
          "color": "#D1C6AE"
        },
        {
          "id": "col-2-c-2",
          "type": "img",
          "src": "./assets/images/art-10.svg",
          "poster": "",
          "color": "#A7A1CF"
        },
        {
          "id": "col-2-c-3",
          "type": "img",
          "src": "./assets/images/art-11.svg",
          "poster": "",
          "color": "#BAADD1"
        }
      ]
    },
    {
      "id": "col-3",
      "name": "Artist 03",
      "href": "#artist-artist-03",
      "media": [
        {
          "id": "col-3-m-1",
          "type": "img",
          "src": "./assets/images/art-09.svg",
          "poster": "",
          "color": "#D1C6AE",
          "width": 1143,
          "height": 1600
        },
        {
          "id": "col-3-m-2",
          "type": "img",
          "src": "./assets/images/art-10.svg",
          "poster": "",
          "color": "#A7A1CF",
          "width": 2583,
          "height": 3228
        },
        {
          "id": "col-3-m-3",
          "type": "img",
          "src": "./assets/images/art-11.svg",
          "poster": "",
          "color": "#BAADD1",
          "width": 1280,
          "height": 1600
        },
        {
          "id": "col-3-m-4",
          "type": "img",
          "src": "./assets/images/art-12.svg",
          "poster": "",
          "color": "#B49B8A",
          "width": 4310,
          "height": 6034
        }
      ],
      "cycleMedia": [
        {
          "id": "col-3-c-1",
          "type": "img",
          "src": "./assets/images/art-13.svg",
          "poster": "",
          "color": "#AAC9DA"
        },
        {
          "id": "col-3-c-2",
          "type": "img",
          "src": "./assets/images/art-14.svg",
          "poster": "",
          "color": "#D4CAAF"
        },
        {
          "id": "col-3-c-3",
          "type": "img",
          "src": "./assets/images/art-15.svg",
          "poster": "",
          "color": "#AFCDD0"
        }
      ]
    },
    {
      "id": "col-4",
      "name": "Artist 04",
      "href": "#artist-artist-04",
      "media": [
        {
          "id": "col-4-m-1",
          "type": "img",
          "src": "./assets/images/art-16.svg",
          "poster": "",
          "color": "#1c1c1c",
          "width": 2048,
          "height": 1152
        },
        {
          "id": "col-4-m-2",
          "type": "img",
          "src": "./assets/images/art-01.svg",
          "poster": "",
          "color": "#1c1c1c",
          "width": 2048,
          "height": 1152
        },
        {
          "id": "col-4-m-3",
          "type": "img",
          "src": "./assets/images/art-02.svg",
          "poster": "",
          "color": "#1c1c1c",
          "width": 2048,
          "height": 1152
        },
        {
          "id": "col-4-m-4",
          "type": "img",
          "src": "./assets/images/art-03.svg",
          "poster": "",
          "color": "#1c1c1c",
          "width": 1920,
          "height": 1080
        }
      ],
      "cycleMedia": [
        {
          "id": "col-4-c-1",
          "type": "img",
          "src": "./assets/images/art-04.svg",
          "poster": "",
          "color": "#A9B4CB"
        },
        {
          "id": "col-4-c-2",
          "type": "img",
          "src": "./assets/images/art-05.svg",
          "poster": "",
          "color": "#D4ADB0"
        },
        {
          "id": "col-4-c-3",
          "type": "img",
          "src": "./assets/images/art-06.svg",
          "poster": "",
          "color": "#D7C7AF"
        }
      ]
    },
    {
      "id": "col-5",
      "name": "Artist 05",
      "href": "#artist-artist-05",
      "media": [
        {
          "id": "col-5-m-1",
          "type": "img",
          "src": "./assets/images/art-13.svg",
          "poster": "",
          "color": "#AAC9DA",
          "width": 800,
          "height": 1200
        },
        {
          "id": "col-5-m-2",
          "type": "img",
          "src": "./assets/images/art-14.svg",
          "poster": "",
          "color": "#D4CAAF",
          "width": 800,
          "height": 1200
        },
        {
          "id": "col-5-m-3",
          "type": "img",
          "src": "./assets/images/art-15.svg",
          "poster": "",
          "color": "#AFCDD0",
          "width": 880,
          "height": 1200
        },
        {
          "id": "col-5-m-4",
          "type": "img",
          "src": "./assets/images/art-04.svg",
          "poster": "",
          "color": "#A9B4CB",
          "width": 800,
          "height": 1200
        }
      ],
      "cycleMedia": [
        {
          "id": "col-5-c-1",
          "type": "img",
          "src": "./assets/images/art-07.svg",
          "poster": "",
          "color": "#CDBAAA"
        },
        {
          "id": "col-5-c-2",
          "type": "img",
          "src": "./assets/images/art-08.svg",
          "poster": "",
          "color": "#A85651"
        },
        {
          "id": "col-5-c-3",
          "type": "img",
          "src": "./assets/images/art-09.svg",
          "poster": "",
          "color": "#B9C1C0"
        }
      ]
    },
    {
      "id": "col-6",
      "name": "Artist 06",
      "href": "#artist-artist-06",
      "media": [
        {
          "id": "col-6-m-1",
          "type": "img",
          "src": "./assets/images/art-05.svg",
          "poster": "",
          "color": "#D4ADB0",
          "width": 5352,
          "height": 6690
        },
        {
          "id": "col-6-m-2",
          "type": "img",
          "src": "./assets/images/art-06.svg",
          "poster": "",
          "color": "#D7C7AF",
          "width": 912,
          "height": 1140
        },
        {
          "id": "col-6-m-3",
          "type": "img",
          "src": "./assets/images/art-07.svg",
          "poster": "",
          "color": "#CDBAAA",
          "width": 918,
          "height": 1140
        },
        {
          "id": "col-6-m-4",
          "type": "img",
          "src": "./assets/images/art-08.svg",
          "poster": "",
          "color": "#A85651",
          "width": 912,
          "height": 1140
        }
      ],
      "cycleMedia": [
        {
          "id": "col-6-c-1",
          "type": "img",
          "src": "./assets/images/art-10.svg",
          "poster": "",
          "color": "#C8B3B0"
        },
        {
          "id": "col-6-c-2",
          "type": "img",
          "src": "./assets/images/art-11.svg",
          "poster": "",
          "color": "#444444"
        },
        {
          "id": "col-6-c-3",
          "type": "img",
          "src": "./assets/images/art-12.svg",
          "poster": "",
          "color": "#D4B6A9"
        }
      ]
    },
    {
      "id": "col-7",
      "name": "Artist 07",
      "href": "#artist-artist-07",
      "media": [
        {
          "id": "col-7-m-1",
          "type": "img",
          "src": "./assets/images/art-09.svg",
          "poster": "",
          "color": "#B9C1C0",
          "width": 853,
          "height": 1140
        },
        {
          "id": "col-7-m-2",
          "type": "img",
          "src": "./assets/images/art-10.svg",
          "poster": "",
          "color": "#C8B3B0",
          "width": 759,
          "height": 1140
        },
        {
          "id": "col-7-m-3",
          "type": "img",
          "src": "./assets/images/art-11.svg",
          "poster": "",
          "color": "#444444",
          "width": 821,
          "height": 1000
        },
        {
          "id": "col-7-m-4",
          "type": "img",
          "src": "./assets/images/art-12.svg",
          "poster": "",
          "color": "#D4B6A9",
          "width": 500,
          "height": 750
        }
      ],
      "cycleMedia": [
        {
          "id": "col-7-c-1",
          "type": "img",
          "src": "./assets/images/art-13.svg",
          "poster": "",
          "color": "#BB827B"
        },
        {
          "id": "col-7-c-2",
          "type": "img",
          "src": "./assets/images/art-14.svg",
          "poster": "",
          "color": "#D6D0AE"
        },
        {
          "id": "col-7-c-3",
          "type": "img",
          "src": "./assets/images/art-15.svg",
          "poster": "",
          "color": "#D5CAAE"
        }
      ]
    },
    {
      "id": "col-8",
      "name": "Artist 08",
      "href": "#artist-artist-08",
      "media": [
        {
          "id": "col-8-m-1",
          "type": "img",
          "src": "./assets/images/art-13.svg",
          "poster": "",
          "color": "#BB827B",
          "width": 1500,
          "height": 2165
        },
        {
          "id": "col-8-m-2",
          "type": "img",
          "src": "./assets/images/art-14.svg",
          "poster": "",
          "color": "#D6D0AE",
          "width": 1500,
          "height": 2199
        },
        {
          "id": "col-8-m-3",
          "type": "img",
          "src": "./assets/images/art-15.svg",
          "poster": "",
          "color": "#D5CAAE",
          "width": 5462,
          "height": 8189
        },
        {
          "id": "col-8-m-4",
          "type": "img",
          "src": "./assets/images/art-16.svg",
          "poster": "",
          "color": "#434343",
          "width": 1024,
          "height": 1545
        }
      ],
      "cycleMedia": [
        {
          "id": "col-8-c-1",
          "type": "img",
          "src": "./assets/images/art-01.svg",
          "poster": "",
          "color": "#D1B7A7"
        },
        {
          "id": "col-8-c-2",
          "type": "img",
          "src": "./assets/images/art-02.svg",
          "poster": "",
          "color": "#444444"
        },
        {
          "id": "col-8-c-3",
          "type": "img",
          "src": "./assets/images/art-03.svg",
          "poster": "",
          "color": "#C5BEC4"
        }
      ]
    },
    {
      "id": "col-9",
      "name": "Artist 09",
      "href": "#artist-artist-09",
      "media": [
        {
          "id": "col-9-m-1",
          "type": "img",
          "src": "./assets/images/art-01.svg",
          "poster": "",
          "color": "#D1B7A7",
          "width": 1536,
          "height": 2048
        },
        {
          "id": "col-9-m-2",
          "type": "img",
          "src": "./assets/images/art-02.svg",
          "poster": "",
          "color": "#444444",
          "width": 1536,
          "height": 2048
        },
        {
          "id": "col-9-m-3",
          "type": "img",
          "src": "./assets/images/art-03.svg",
          "poster": "",
          "color": "#C5BEC4",
          "width": 1536,
          "height": 2048
        },
        {
          "id": "col-9-m-4",
          "type": "img",
          "src": "./assets/images/art-04.svg",
          "poster": "",
          "color": "#CCB3A8",
          "width": 1536,
          "height": 2048
        }
      ],
      "cycleMedia": [
        {
          "id": "col-9-c-1",
          "type": "img",
          "src": "./assets/images/art-01.svg",
          "poster": "",
          "color": "#BFBDC5"
        },
        {
          "id": "col-9-c-2",
          "type": "img",
          "src": "./assets/images/art-02.svg",
          "poster": "",
          "color": "#A8C5D2"
        },
        {
          "id": "col-9-c-3",
          "type": "img",
          "src": "./assets/images/art-03.svg",
          "poster": "",
          "color": "#CEBCAE"
        }
      ]
    }
  ],
  "straplineSection": {
    "text": "edvlabs is an artist management and production company.",
    "uprightWords": "is, an, and"
  },
  "newsSection": {
    "heading": "News",
    "allButtonText": "All News",
    "allButtonLink": "#news",
    "items": [
      {
        "id": "news-1",
        "title": "ARTIST 01 x CLIENT 01",
        "href": "#news-1",
        "type": "img",
        "src": "./assets/images/art-02.svg",
        "poster": "",
        "color": "#a8c5d2",
        "width": 1500,
        "height": 2048
      },
      {
        "id": "news-2",
        "title": "ARTIST 03 x CLIENT 02",
        "href": "#news-2",
        "type": "img",
        "src": "./assets/images/art-05.svg",
        "poster": "",
        "color": "#acb7d2",
        "width": 2250,
        "height": 2813
      },
      {
        "id": "news-3",
        "title": "ARTIST 04 x CLIENT 03",
        "href": "#news-3",
        "type": "img",
        "src": "./assets/images/art-06.svg",
        "poster": "",
        "color": "#1a1a1a",
        "width": 1080,
        "height": 1440
      },
      {
        "id": "news-4",
        "title": "ARTIST 06 x CLIENT 04",
        "href": "#news-4",
        "type": "img",
        "src": "./assets/images/art-07.svg",
        "poster": "",
        "color": "#d4ada5",
        "width": 1852,
        "height": 2314
      },
      {
        "id": "news-5",
        "title": "ARTIST 08 x CLIENT 05",
        "href": "#news-5",
        "type": "img",
        "src": "./assets/images/art-08.svg",
        "poster": "",
        "color": "#cbbaa8",
        "width": 760,
        "height": 1140
      },
      {
        "id": "news-6",
        "title": "ARTIST 02 x CLIENT 06",
        "href": "#news-6",
        "type": "img",
        "src": "./assets/images/art-09.svg",
        "poster": "",
        "color": "#ccbca7",
        "width": 1380,
        "height": 1731
      }
    ]
  },
  "footerSection": {
    "straplines": [
      "*edvlabs* is *artist management*.",
      "*edvlabs* is *production*.",
      "We make *beautiful* work.",
      "Come *create* with us."
    ],
    "artistsTitle": "Artists",
    "artists": [
      {
        "id": "fa-1",
        "name": "Artist 01",
        "href": "#artist-artist-01",
        "color": "#D3B6AA",
        "type": "img",
        "image": "./assets/images/art-10.svg",
        "video": ""
      },
      {
        "id": "fa-2",
        "name": "Artist 02",
        "href": "#artist-artist-02",
        "color": "#B1BDCA",
        "type": "img",
        "image": "./assets/images/art-11.svg",
        "video": ""
      },
      {
        "id": "fa-3",
        "name": "Artist 03",
        "href": "#artist-artist-03",
        "color": "#CE8EAC",
        "type": "img",
        "image": "./assets/images/art-12.svg",
        "video": ""
      },
      {
        "id": "fa-4",
        "name": "Artist 09",
        "href": "#artist-artist-09",
        "color": "#D3C4AD",
        "type": "img",
        "image": "./assets/images/art-13.svg",
        "video": ""
      },
      {
        "id": "fa-5",
        "name": "Artist 04",
        "href": "#artist-artist-04",
        "color": "#C2C6CC",
        "type": "img",
        "image": "./assets/images/art-14.svg",
        "video": ""
      },
      {
        "id": "fa-6",
        "name": "Artist 05",
        "href": "#artist-artist-05",
        "color": "#B4D0A7",
        "type": "img",
        "image": "./assets/images/art-15.svg",
        "video": ""
      },
      {
        "id": "fa-7",
        "name": "Artist 06",
        "href": "#artist-artist-06",
        "color": "#CEB5AC",
        "type": "img",
        "image": "./assets/images/art-16.svg",
        "video": ""
      },
      {
        "id": "fa-8",
        "name": "Artist 07",
        "href": "#artist-artist-07",
        "color": "#B1C3CE",
        "type": "img",
        "image": "./assets/images/art-01.svg",
        "video": ""
      },
      {
        "id": "fa-9",
        "name": "Artist 08",
        "href": "#artist-artist-08",
        "color": "#CDB398",
        "type": "img",
        "image": "./assets/images/art-02.svg",
        "video": ""
      }
    ],
    "exploreTitle": "Explore",
    "exploreLinks": [
      {
        "id": "ex-1",
        "label": "Production",
        "href": "#production"
      },
      {
        "id": "ex-2",
        "label": "News",
        "href": "#news"
      },
      {
        "id": "ex-3",
        "label": "About",
        "href": "#about"
      },
      {
        "id": "ex-4",
        "label": "All",
        "href": "#all"
      }
    ],
    "connectTitle": "Connect",
    "connectLinks": [
      {
        "id": "con-1",
        "label": "Contact",
        "href": "mailto:hello@edvlabs.example",
        "external": false
      },
      {
        "id": "con-2",
        "label": "LinkedIn",
        "href": "#",
        "external": false
      },
      {
        "id": "con-3",
        "label": "Instagram",
        "href": "#",
        "external": false
      }
    ],
    "copyright": "© 2026 edvlabs Roster, All Rights Reserved."
  }
}

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

  /**
   * Formats inline `*italic*` or `<em>italic</em>` safely into `<em>...</em>` HTML.
   */
  function formatEmphasisHtml(str) {
    const normalized = String(str ?? '').replace(/<\/?em>/gi, '*');
    const parts = normalized.split('*');
    return parts
      .map((part, idx) => (idx % 2 === 1 ? `<em>${escapeHtml(part)}</em>` : escapeHtml(part)))
      .join('');
  }

  /**
   * Validates a URL/href to prevent javascript:, vbscript:, or unsafe data: URI injection.
   */
  function sanitizeUrl(rawUrl, fallback = '#', allowDataImage = false) {
    const trimmed = String(rawUrl ?? '').trim();
    if (!trimmed) return fallback;

    const cleaned = trimmed.replace(/[\u0000-\u001F\u007F]+/g, '');
    if (cleaned.startsWith('//') || cleaned.startsWith('/\\') || cleaned.startsWith('\\\\')) {
      return fallback;
    }
    if (cleaned.startsWith('#') || cleaned.startsWith('./') || cleaned.startsWith('../') || cleaned.startsWith('/')) {
      return cleaned;
    }
    if (allowDataImage && /^data:image\/(webp|png|jpeg|jpg|gif|avif);base64,[a-zA-Z0-9+/=]+$/i.test(cleaned)) {
      return cleaned;
    }
    if (/^(https?:|mailto:|tel:)/i.test(cleaned)) {
      return cleaned;
    }
    if (/^[a-zA-Z0-9_\-./]+$/.test(cleaned) && !cleaned.includes(':')) {
      return cleaned;
    }
    return fallback;
  }

  function sanitizeCssUrl(rawUrl) {
    const safe = sanitizeUrl(rawUrl, '', true);
    if (!safe) return '';
    return safe.replace(/['"()\\]/g, (ch) => '%' + ch.charCodeAt(0).toString(16).toUpperCase());
  }

  function sanitizeHexColor(rawColor, fallback = '#d4c5b9') {
    const trimmed = String(rawColor ?? '').trim();
    if (/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(trimmed)) {
      return trimmed;
    }
    return fallback;
  }

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function normalizeSiteData(raw) {
    const base = deepClone(EDV_DEFAULT_DATA);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base;

    const safeStr = (val, fallback) => (typeof val === 'string' ? val : fallback);
    const safeNum = (val, fallback) => {
      const n = Number(val);
      return Number.isFinite(n) && n > 0 ? Math.round(n) : fallback;
    };

    // 1. Hero
    const hero = raw.hero && typeof raw.hero === 'object' ? raw.hero : {};
    base.hero = {
      srTitle: safeStr(hero.srTitle, base.hero.srTitle),
      tagline: safeStr(hero.tagline, base.hero.tagline),
      shuffleColumns: Boolean(hero.shuffleColumns),
    };

    // 2. Navbar
    const nav = raw.navbar && typeof raw.navbar === 'object' ? raw.navbar : {};
    base.navbar = {
      leftLabel: safeStr(nav.leftLabel, base.navbar.leftLabel),
      leftHref: sanitizeUrl(nav.leftHref, base.navbar.leftHref),
      centerLinks: Array.isArray(nav.centerLinks) && nav.centerLinks.length > 0
        ? nav.centerLinks
            .filter((l) => l && typeof l === 'object')
            .map((l, i) => ({
              id: safeStr(l.id, `nav-${i + 1}`),
              label: safeStr(l.label, 'Link'),
              href: sanitizeUrl(l.href, '#'),
            }))
        : base.navbar.centerLinks,
      rightLabel: safeStr(nav.rightLabel, base.navbar.rightLabel),
      rightHref: sanitizeUrl(nav.rightHref, base.navbar.rightHref),
      mobileLinks: Array.isArray(nav.mobileLinks) && nav.mobileLinks.length > 0
        ? nav.mobileLinks
            .filter((l) => l && typeof l === 'object')
            .map((l, i) => ({
              id: safeStr(l.id, `mob-${i + 1}`),
              label: safeStr(l.label, 'Link'),
              href: sanitizeUrl(l.href, '#'),
            }))
        : base.navbar.mobileLinks,
    };

    // 3. Gallery Columns
    if (Array.isArray(raw.galleryColumns) && raw.galleryColumns.length > 0) {
      base.galleryColumns = raw.galleryColumns
        .filter((col) => col && typeof col === 'object')
        .map((col, idx) => {
          const fallbackCol = base.galleryColumns[idx % base.galleryColumns.length];
          const rawMedia = Array.isArray(col.media) && col.media.length > 0 ? col.media : fallbackCol.media;
          const rawCycle = Array.isArray(col.cycleMedia) ? col.cycleMedia : fallbackCol.cycleMedia;
          return {
            id: safeStr(col.id, `col-${idx + 1}`),
            name: safeStr(col.name, 'Artist'),
            href: sanitizeUrl(col.href, '#artists'),
            media: rawMedia
              .filter((m) => m && typeof m === 'object')
              .map((m, mIdx) => {
                const isVid = m.type === 'video' || String(m.src || '').endsWith('.mp4');
                return {
                  id: safeStr(m.id, `col-${idx + 1}-m-${mIdx + 1}`),
                  type: isVid ? 'video' : 'img',
                  src: sanitizeUrl(m.src, fallbackCol.media[0].src, true),
                  poster: sanitizeUrl(m.poster, '', true),
                  color: sanitizeHexColor(m.color, '#d4c5b9'),
                  width: safeNum(m.width, 912),
                  height: safeNum(m.height, 1140),
                };
              }),
            cycleMedia: rawCycle
              .filter((c) => c && typeof c === 'object')
              .map((c, cIdx) => {
                const isVid = c.type === 'video' || String(c.src || '').endsWith('.mp4');
                return {
                  id: safeStr(c.id, `col-${idx + 1}-c-${cIdx + 1}`),
                  type: isVid ? 'video' : 'img',
                  src: sanitizeUrl(c.src, fallbackCol.media[0].src, true),
                  poster: sanitizeUrl(c.poster, '', true),
                  color: sanitizeHexColor(c.color, '#d4c5b9'),
                };
              }),
          };
        });
    }

    // 4. Strapline Section
    const strap = raw.straplineSection && typeof raw.straplineSection === 'object' ? raw.straplineSection : {};
    base.straplineSection = {
      text: safeStr(strap.text, base.straplineSection.text),
      uprightWords: safeStr(strap.uprightWords, base.straplineSection.uprightWords),
    };

    // 5. News Section
    const news = raw.newsSection && typeof raw.newsSection === 'object' ? raw.newsSection : {};
    base.newsSection = {
      heading: safeStr(news.heading, base.newsSection.heading),
      allButtonText: safeStr(news.allButtonText, base.newsSection.allButtonText),
      allButtonLink: sanitizeUrl(news.allButtonLink, base.newsSection.allButtonLink),
      items: Array.isArray(news.items) && news.items.length > 0
        ? news.items
            .filter((item) => item && typeof item === 'object')
            .map((item, idx) => {
              const isVid = item.type === 'video' || String(item.src || '').endsWith('.mp4');
              return {
                id: safeStr(item.id, `news-${idx + 1}`),
                title: safeStr(item.title, 'NEWS STORY'),
                href: sanitizeUrl(item.href, '#news'),
                type: isVid ? 'video' : 'img',
                src: sanitizeUrl(item.src, base.newsSection.items[0].src, true),
                poster: sanitizeUrl(item.poster, '', true),
                color: sanitizeHexColor(item.color, '#d4c5b9'),
                width: safeNum(item.width, 1500),
                height: safeNum(item.height, 2000),
              };
            })
        : base.newsSection.items,
    };

    // 6. Footer Section
    const foot = raw.footerSection && typeof raw.footerSection === 'object' ? raw.footerSection : {};
    base.footerSection = {
      straplines: Array.isArray(foot.straplines) && foot.straplines.length > 0
        ? foot.straplines.map((line) => String(line ?? '')).filter(Boolean)
        : base.footerSection.straplines,
      artistsTitle: safeStr(foot.artistsTitle, base.footerSection.artistsTitle),
      artists: Array.isArray(foot.artists) && foot.artists.length > 0
        ? foot.artists
            .filter((a) => a && typeof a === 'object')
            .map((a, idx) => {
              const isVid = a.type === 'video' || Boolean(a.video);
              return {
                id: safeStr(a.id, `fa-${idx + 1}`),
                name: safeStr(a.name, 'Artist'),
                href: sanitizeUrl(a.href, '#artists'),
                color: sanitizeHexColor(a.color, '#D3B6AA'),
                type: isVid ? 'video' : 'img',
                image: sanitizeUrl(a.image, base.footerSection.artists[0].image, true),
                video: sanitizeUrl(a.video, '', true),
              };
            })
        : base.footerSection.artists,
      exploreTitle: safeStr(foot.exploreTitle, base.footerSection.exploreTitle),
      exploreLinks: Array.isArray(foot.exploreLinks) && foot.exploreLinks.length > 0
        ? foot.exploreLinks
            .filter((l) => l && typeof l === 'object')
            .map((l, idx) => ({
              id: safeStr(l.id, `ex-${idx + 1}`),
              label: safeStr(l.label, 'Link'),
              href: sanitizeUrl(l.href, '#'),
            }))
        : base.footerSection.exploreLinks,
      connectTitle: safeStr(foot.connectTitle, base.footerSection.connectTitle),
      connectLinks: Array.isArray(foot.connectLinks) && foot.connectLinks.length > 0
        ? foot.connectLinks
            .filter((l) => l && typeof l === 'object')
            .map((l, idx) => ({
              id: safeStr(l.id, `con-${idx + 1}`),
              label: safeStr(l.label, 'Link'),
              href: sanitizeUrl(l.href, '#'),
              external: Boolean(l.external),
            }))
        : base.footerSection.connectLinks,
      copyright: safeStr(foot.copyright, base.footerSection.copyright),
    };

    return base;
  }

  let syncChannel = null;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      syncChannel = new BroadcastChannel(CHANNEL_NAME);
    }
  } catch (_) {}

  /* ==========================================================================
     IndexedDB Storage Engine for Custom Media (Bypasses ~5MB localStorage quota)
     ========================================================================== */
  const IDB_NAME = 'edv_roster_media_db_v1';
  const IDB_STORE = 'uploads';
  let idbInstance = null;
  let cachedUploads = null;

  function openIndexedDB() {
    if (idbInstance) return Promise.resolve(idbInstance);
    if (typeof indexedDB === 'undefined') return Promise.resolve(null);

    return new Promise((resolve) => {
      try {
        const req = indexedDB.open(IDB_NAME, 1);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(IDB_STORE)) {
            db.createObjectStore(IDB_STORE, { keyPath: 'id' });
          }
        };
        req.onsuccess = (e) => {
          idbInstance = e.target.result;
          resolve(idbInstance);
        };
        req.onerror = () => resolve(null);
      } catch (_) {
        resolve(null);
      }
    });
  }

  function idbGetAll() {
    return openIndexedDB().then((db) => {
      if (!db) return null;
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(IDB_STORE, 'readonly');
          const store = tx.objectStore(IDB_STORE);
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve(null);
        } catch (_) {
          resolve(null);
        }
      });
    });
  }

  function idbPut(entry) {
    return openIndexedDB().then((db) => {
      if (!db) return null;
      return new Promise((resolve, reject) => {
        try {
          const tx = db.transaction(IDB_STORE, 'readwrite');
          const store = tx.objectStore(IDB_STORE);
          const req = store.put(entry);
          req.onsuccess = () => resolve(entry);
          req.onerror = (e) => reject(e);
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  function idbDelete(id) {
    return openIndexedDB().then((db) => {
      if (!db) return false;
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(IDB_STORE, 'readwrite');
          const store = tx.objectStore(IDB_STORE);
          const req = store.delete(id);
          req.onsuccess = () => resolve(true);
          req.onerror = () => resolve(false);
        } catch (_) {
          resolve(false);
        }
      });
    });
  }

  function readUploadsFromLocalStorage() {
    try {
      const raw = localStorage.getItem(UPLOADS_STORAGE_KEY);
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
            type: 'img',
            poster: '',
            custom: true,
          };
        })
        .filter((item) => Boolean(item.src));
    } catch (_) {
      return [];
    }
  }

  cachedUploads = readUploadsFromLocalStorage();

  // Background IndexedDB initialization & automatic migration from localStorage
  if (typeof window !== 'undefined') {
    idbGetAll().then((idbList) => {
      if (Array.isArray(idbList) && idbList.length > 0) {
        cachedUploads = idbList;
        window.dispatchEvent(new CustomEvent('edv:uploads-synced', { detail: cachedUploads }));
      } else if (cachedUploads && cachedUploads.length > 0) {
        cachedUploads.forEach((item) => idbPut(item).catch(() => {}));
      }
    });
  }

  const EDVStore = {
    STORAGE_KEY,
    DRAFT_STORAGE_KEY,
    escapeHtml,
    formatEmphasisHtml,
    sanitizeUrl,
    sanitizeCssUrl,
    sanitizeHexColor,
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
      if (Array.isArray(cachedUploads)) return cachedUploads;
      cachedUploads = readUploadsFromLocalStorage();
      return cachedUploads;
    },

    async getCustomUploadsAsync() {
      const fromDb = await idbGetAll();
      if (Array.isArray(fromDb)) {
        cachedUploads = fromDb;
        return fromDb;
      }
      return this.getCustomUploads();
    },

    async addCustomUploadAsync(item) {
      const safeSrc = sanitizeUrl(item.src || item.path, '', true);
      if (!safeSrc) return null;
      const entry = {
        id: item.id || `upload-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        label: String(item.label || 'Uploaded Image'),
        src: safeSrc,
        category: 'Uploaded',
        type: 'img',
        poster: '',
        custom: true,
      };

      try {
        await idbPut(entry);
      } catch (err) {
        console.warn('IndexedDB write failed, falling back to cache:', err);
      }

      if (!Array.isArray(cachedUploads)) cachedUploads = [];
      cachedUploads = [entry, ...cachedUploads.filter((u) => u.id !== entry.id)];

      try {
        localStorage.setItem(UPLOADS_STORAGE_KEY, JSON.stringify(cachedUploads.slice(0, 10)));
      } catch (_) {}

      window.dispatchEvent(new CustomEvent('edv:uploads-synced', { detail: cachedUploads }));
      return entry;
    },

    addCustomUpload(item) {
      const safeSrc = sanitizeUrl(item.src || item.path, '', true);
      if (!safeSrc) return null;
      const entry = {
        id: item.id || `upload-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        label: String(item.label || 'Uploaded Image'),
        src: safeSrc,
        category: 'Uploaded',
        type: 'img',
        poster: '',
        custom: true,
      };

      if (!Array.isArray(cachedUploads)) cachedUploads = [];
      cachedUploads.unshift(entry);

      idbPut(entry).catch((err) => {
        console.warn('Async IndexedDB write error:', err);
      });

      try {
        localStorage.setItem(UPLOADS_STORAGE_KEY, JSON.stringify(cachedUploads.slice(0, 10)));
      } catch (_) {}

      window.dispatchEvent(new CustomEvent('edv:uploads-synced', { detail: cachedUploads }));
      return entry;
    },

    async addUploadedMedia(label, dataUrl) {
      return this.addCustomUploadAsync({ label, src: dataUrl, category: 'Uploaded' });
    },

    async deleteCustomUploadAsync(srcOrId) {
      const current = this.getCustomUploads();
      const target = current.find((item) => item.id === srcOrId || item.src === srcOrId);
      const idToDelete = target ? target.id : srcOrId;

      await idbDelete(idToDelete);
      cachedUploads = current.filter((item) => item.id !== idToDelete && item.src !== srcOrId);

      try {
        localStorage.setItem(UPLOADS_STORAGE_KEY, JSON.stringify(cachedUploads.slice(0, 10)));
      } catch (_) {}

      window.dispatchEvent(new CustomEvent('edv:uploads-synced', { detail: cachedUploads }));
      return true;
    },

    deleteCustomUpload(srcOrId) {
      this.deleteCustomUploadAsync(srcOrId).catch(() => {});
      const current = this.getCustomUploads();
      cachedUploads = current.filter((item) => item.id !== srcOrId && item.src !== srcOrId);
      return true;
    },

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

    hasUnpublishedChanges(candidateDraft) {
      try {
        const draft = candidateDraft ? normalizeSiteData(candidateDraft) : this.loadDraft();
        const published = this.load();
        return JSON.stringify(draft) !== JSON.stringify(published);
      } catch (_) {
        return false;
      }
    },

    saveDraft(data) {
      const normalized = normalizeSiteData(data);
      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(normalized));
      } catch (err) {
        console.warn('localStorage quota exceeded while saving draft:', err);
      }
      return normalized;
    },

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
      window.dispatchEvent(new CustomEvent('edv:data-updated', { detail: normalized }));
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
      window.addEventListener('edv:data-updated', (e) => {
        if (e.detail) notifyDeduped(e.detail);
      });
    },
  };

  window.EDV_MEDIA_LIBRARY = EDV_MEDIA_LIBRARY;
  window.EDV_DEFAULT_DATA = normalizeSiteData(EDV_DEFAULT_DATA);
  window.EDVStore = EDVStore;
})();

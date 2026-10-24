/**
 * ViV MGMT — Centralized CMS Data Store & Default Content (`site-data.js`)
 *
 * Provides:
 * - `window.VIV_MEDIA_LIBRARY`: Catalog of all local images & videos in `./assets/images/`
 * - `window.VIV_DEFAULT_DATA`: Complete default content matching https://vivmgmt.com/
 * - `window.VIVStore`: Load, draft/publish, reset, export/import, image upload, and real-time BroadcastChannel sync
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'viv_site_data_v1';
  const DRAFT_STORAGE_KEY = 'viv_site_draft_v1';
  const UPLOADS_STORAGE_KEY = 'viv_custom_uploads_v1';
  const CHANNEL_NAME = 'viv_cms_sync_channel';

  const VIV_MEDIA_LIBRARY = [
  {
    "src": "./assets/images/1778793995-arturo-torres-fashion-photography-advertising-photographer-15.jpg",
    "label": "Arturo Torres \u2014 Card #1",
    "category": "Gallery",
    "type": "img",
    "poster": ""
  },
  {
    "src": "./assets/images/1779142866-arturo-torres-advertising-photographer-lifestyle-fashion-sports88.jpg",
    "label": "Arturo Torres \u2014 Card #2",
    "category": "Gallery",
    "type": "img",
    "poster": ""
  },
  {
    "src": "./assets/images/1779142866-arturo-torres-advertising-photographer-lifestyle-fashion-sports30.jpg",
    "label": "Arturo Torres \u2014 Card #3",
    "category": "Gallery",
    "type": "img",
    "poster": ""
  },
  {
    "src": "./assets/images/1779142867-arturo-torres-advertising-photographer-lifestyle-fashion-sports13.jpg",
    "label": "Arturo Torres \u2014 Card #4",
    "category": "Gallery",
    "type": "img",
    "poster": ""
  },
  {
    "src": "./assets/images/1779918226-beauty-model-photography-beth-sternbaum-la-nyc-52.jpg",
    "label": "Arturo Torres \u2014 Cycle #1",
    "category": "Pool",
    "type": "img",
    "poster": ""
  },
  {
    "src": "./assets/images/1779918224-beauty-model-photography-beth-sternbaum-la-nyc-63.jpg",
    "label": "Arturo Torres \u2014 Cycle #2",
    "category": "Pool",
    "type": "img",
    "poster": ""
  },
  {
    "src": "./assets/images/1779918225-beauty-model-photography-beth-sternbaum-la-nyc-50.jpg",
    "label": "Arturo Torres \u2014 Cycle #3",
    "category": "Pool",
    "type": "img",
    "poster": ""
  },
  {
    "src": "./assets/images/1779918229-beauty-model-photography-beth-sternbaum-la-nyc-10.jpg",
    "label": "Beth Sternbaum \u2014 Card #3",
    "category": "Gallery",
    "type": "img",
    "poster": ""
  },
  {
    "src": "./assets/images/1777465143-20180623_foam_test_585.jpg",
    "label": "Beth Sternbaum \u2014 Cycle #1",
    "category": "Pool",
    "type": "img",
    "poster": ""
  },
  {
    "src": "./assets/images/1777466641-cera-hensley-beauty-photography-stilllife-cosmetics-21.jpg",
    "label": "Beth Sternbaum \u2014 Cycle #2",
    "category": "Pool",
    "type": "img",
    "poster": ""
  },
  {
    "src": "./assets/images/1778868514-cera-hensley-x-peaceout.jpg",
    "label": "Beth Sternbaum \u2014 Cycle #3",
    "category": "Pool",
    "type": "img",
    "poster": ""
  },
  {
    "src": "./assets/images/1777465200-cera-hensley-food-photography-beverage-stilllife-16.jpg",
    "label": "Cera Hensley \u2014 Card #4",
    "category": "Gallery",
    "type": "img",
    "poster": ""
  },
  {
    "src": "./assets/images/1774484687-221112_nike-hydrostrong_5316.jpg",
    "label": "Cera Hensley \u2014 Cycle #1",
    "category": "Pool",
    "type": "img",
    "poster": ""
  },
  {
    "src": "./assets/images/1774484866-byrum-191105-adidas-victor-702.jpg",
    "label": "Cera Hensley \u2014 Cycle #2",
    "category": "Pool",
    "type": "img",
    "poster": ""
  },
  {
    "src": "./assets/images/1774484653-byrum-20200305-nike-basketball-studio-0416.jpg",
    "label": "Cera Hensley \u2014 Cycle #3",
    "category": "Pool",
    "type": "img",
    "poster": ""
  },
  {
    "src": "./assets/images/mux-023u7rfeEpGMqj3RtVjZtvuPGQMnyWkNw.mp4",
    "label": "Edward Tran \u2014 Card #1",
    "category": "Videos",
    "type": "video",
    "poster": "./assets/images/mux-023u7rfeEpGMqj3RtVjZtvuPGQMnyWkNw.jpg"
  },
  {
    "src": "./assets/images/mux-Q2PGRS54ZVUS418j1vLtqaaoa01lAh5KM.mp4",
    "label": "Edward Tran \u2014 Card #2",
    "category": "Videos",
    "type": "video",
    "poster": "./assets/images/mux-Q2PGRS54ZVUS418j1vLtqaaoa01lAh5KM.jpg"
  },
  {
    "src": "./assets/images/mux-hXfMGSk00sYeao99EqE8eqg3lRjNXNrDE.mp4",
    "label": "Edward Tran \u2014 Card #3",
    "category": "Videos",
    "type": "video",
    "poster": "./assets/images/mux-hXfMGSk00sYeao99EqE8eqg3lRjNXNrDE.jpg"
  },
  {
    "src": "./assets/images/mux-moiR01sgh1u3bxRJ00nnzsQ202B7uZT7BX4.mp4",
    "label": "Edward Tran \u2014 Card #4",
    "category": "Videos",
    "type": "video",
    "poster": "./assets/images/mux-moiR01sgh1u3bxRJ00nnzsQ202B7uZT7BX4.jpg"
  },
  {
    "src": "./assets/images/1774485213-160609-harper-christian-1484-3.jpg",
    "label": "Edward Tran \u2014 Cycle #1",
    "category": "Pool",
    "type": "img",
    "poster": ""
  },
  {
    "src": "./assets/images/1782286850-photo-jan-07-2026-3-32-47-pm.jpg",
    "label": "Edward Tran \u2014 Cycle #2",
    "category": "Pool",
    "type": "img",
    "poster": ""
  },
  {
    "src": "./assets/images/1779948864-jason-kent-beauty-photographer-la-nyc-still-life107.jpg",
    "label": "Edward Tran \u2014 Cycle #3",
    "category": "Pool",
    "type": "img",
    "poster": ""
  },
  {
    "src": "./assets/images/1779948848-jason-kent-beauty-photographer-la-nyc-still-life71.jpg",
    "label": "Garrett Byrum \u2014 Cycle #1",
    "category": "Pool",
    "type": "img",
    "poster": ""
  },
  {
    "src": "./assets/images/1779948857-jason-kent-beauty-photographer-la-nyc-still-life74.jpg",
    "label": "Garrett Byrum \u2014 Cycle #2",
    "category": "Pool",
    "type": "img",
    "poster": ""
  },
  {
    "src": "./assets/images/1779144620-jonathan-mannion-hiphop-music-rap-photography-advertising-photographer-sports22.jpg",
    "label": "Garrett Byrum \u2014 Cycle #3",
    "category": "Pool",
    "type": "img",
    "poster": ""
  },
  {
    "src": "./assets/images/1779144620-jonathan-mannion-hiphop-music-rap-photography-advertising-photographer-sports48.jpg",
    "label": "Jason Kent \u2014 Cycle #1",
    "category": "Pool",
    "type": "img",
    "poster": ""
  },
  {
    "src": "./assets/images/1779144619-jonathan-mannion-advertising-photographer-lifestyle-celebrity-sports3.jpg",
    "label": "Jason Kent \u2014 Cycle #2",
    "category": "Pool",
    "type": "img",
    "poster": ""
  },
  {
    "src": "./assets/images/1779144620-jonathan-mannion-hiphop-music-rap-photography-advertising-photographer-sports32.jpg",
    "label": "Jason Kent \u2014 Cycle #3",
    "category": "Pool",
    "type": "img",
    "poster": ""
  },
  {
    "src": "./assets/images/1778795294-quinn-gravier-advertising-photographer-portraits-celebrity36.jpg",
    "label": "Jonathan Mannion \u2014 Cycle #1",
    "category": "Pool",
    "type": "img",
    "poster": ""
  },
  {
    "src": "./assets/images/1778795295-quinn-gravier-advertising-photographer-portraits-celebrity33.jpg",
    "label": "Jonathan Mannion \u2014 Cycle #2",
    "category": "Pool",
    "type": "img",
    "poster": ""
  },
  {
    "src": "./assets/images/1778795295-quinn-gravier-advertising-photographer-portraits-celebrity45.jpg",
    "label": "Jonathan Mannion \u2014 Cycle #3",
    "category": "Pool",
    "type": "img",
    "poster": ""
  },
  {
    "src": "./assets/images/1778795294-quinn-gravier-advertising-photographer-portraits-celebrity47.jpg",
    "label": "Quinn Gravier \u2014 Card #4",
    "category": "Gallery",
    "type": "img",
    "poster": ""
  },
  {
    "src": "./assets/images/1778184120-gap-studio-zac-posen-denim-portrait.jpg",
    "label": "Quinn Gravier \u2014 Cycle #1",
    "category": "Pool",
    "type": "img",
    "poster": ""
  },
  {
    "src": "./assets/images/1778184121-danielle-moore-tidal-magazine-black-and-white-fashion-portrait.jpg",
    "label": "Quinn Gravier \u2014 Cycle #2",
    "category": "Pool",
    "type": "img",
    "poster": ""
  },
  {
    "src": "./assets/images/1778184121-fashion-editorial-horse-barragan-stables-mexico.jpg",
    "label": "Quinn Gravier \u2014 Cycle #3",
    "category": "Pool",
    "type": "img",
    "poster": ""
  },
  {
    "src": "./assets/images/1778772904-danielle-moore-phils-skincare-mens-beauty-portrait.jpg",
    "label": "Danielle Moore \u2014 Card #4",
    "category": "Gallery",
    "type": "img",
    "poster": ""
  },
  {
    "src": "./assets/images/1784528935-danielle-moore-old-navy-kids-art-direction-product-styling-color-collection-instagram-03.jpg",
    "label": "News: DANIELLE MOORE x OLD NAVY BTS",
    "category": "News",
    "type": "img",
    "poster": ""
  },
  {
    "src": "./assets/images/mux-g01MHyRNqn01zJw6x81ckEU1CILwna5kTF.mp4",
    "label": "News: JONATHAN MANNION x NIKE",
    "category": "Videos",
    "type": "video",
    "poster": "./assets/images/mux-g01MHyRNqn01zJw6x81ckEU1CILwna5kTF.jpg"
  },
  {
    "src": "./assets/images/1782286849-morpheliplock3446.jpg",
    "label": "News: JASON KENT x MORPHE II",
    "category": "News",
    "type": "img",
    "poster": ""
  },
  {
    "src": "./assets/images/1773702313-danielle-moore-arturo-torres-summer-25-quay19.jpg",
    "label": "News: DANIELLE MOORE & ARTURO TORRES X QUAY",
    "category": "News",
    "type": "img",
    "poster": ""
  },
  {
    "src": "./assets/images/1784525114-arturo-torres-travis-matthew-catalog-photography-05.jpg",
    "label": "News: ARTURO TORRES x TRAVIS MATTHEW",
    "category": "News",
    "type": "img",
    "poster": ""
  },
  {
    "src": "./assets/images/1778793996-arturo-torres-fashion-photography-advertising-photographer-25.jpg",
    "label": "Footer Portrait: Arturo Torres",
    "category": "Footer",
    "type": "img",
    "poster": ""
  },
  {
    "src": "./assets/images/1779918227-beauty-model-photography-beth-sternbaum-la-nyc-46.jpg",
    "label": "Footer Portrait: Beth Sternbaum",
    "category": "Footer",
    "type": "img",
    "poster": ""
  },
  {
    "src": "./assets/images/1778275287-kinship-makeup-sunscreen-stilllife-photoshoot-production-6.jpg",
    "label": "Footer Portrait: Cera Hensley",
    "category": "Footer",
    "type": "img",
    "poster": ""
  },
  {
    "src": "./assets/images/1778184121-danielle-moore-desert-couture-fashion-editorial.jpg",
    "label": "Footer Portrait: Danielle Moore",
    "category": "Footer",
    "type": "img",
    "poster": ""
  },
  {
    "src": "./assets/images/mux-FHz8NP01m1g9j4zStyj1XZfio4fLsLkHz.mp4",
    "label": "Footer Hover Video: Edward Tran",
    "category": "Videos",
    "type": "video",
    "poster": "./assets/images/mux-FHz8NP01m1g9j4zStyj1XZfio4fLsLkHz.jpg"
  },
  {
    "src": "./assets/images/mux-FHz8NP01m1g9j4zStyj1XZfio4fLsLkHz.jpg",
    "label": "Footer Portrait: Edward Tran",
    "category": "Footer",
    "type": "img",
    "poster": ""
  },
  {
    "src": "./assets/images/1779483426-garrett-byrum-producion-photography-advertising-powerade-fifa-3.jpg",
    "label": "Footer Portrait: Garrett Byrum",
    "category": "Footer",
    "type": "img",
    "poster": ""
  },
  {
    "src": "./assets/images/1779948867-jason-kent-beauty-photographer-la-nyc-still-life141.jpg",
    "label": "Footer Portrait: Jason Kent",
    "category": "Footer",
    "type": "img",
    "poster": ""
  },
  {
    "src": "./assets/images/1779132350-jonathan-mannion-hiphop-music-rap-photography-advertising-photographer-archive-5.jpg",
    "label": "Footer Portrait: Jonathan Mannion",
    "category": "Footer",
    "type": "img",
    "poster": ""
  },
  {
    "src": "./assets/images/1778795293-quinn-gravier-advertising-photographer-portraits-celebrity26.jpg",
    "label": "Footer Portrait: Quinn Gravier",
    "category": "Footer",
    "type": "img",
    "poster": ""
  },
  {
    "src": "./assets/images/mux-023u7rfeEpGMqj3RtVjZtvuPGQMnyWkNw.jpg",
    "label": "023U7Rfeepgmqj3Rtvjztvupgqmnywknw",
    "category": "Pool",
    "type": "img",
    "poster": ""
  },
  {
    "src": "./assets/images/mux-Q2PGRS54ZVUS418j1vLtqaaoa01lAh5KM.jpg",
    "label": "Q2Pgrs54Zvus418J1Vltqaaoa01Lah5Km",
    "category": "Pool",
    "type": "img",
    "poster": ""
  },
  {
    "src": "./assets/images/mux-g01MHyRNqn01zJw6x81ckEU1CILwna5kTF.jpg",
    "label": "G01Mhyrnqn01Zjw6X81Ckeu1Cilwna5Ktf",
    "category": "Pool",
    "type": "img",
    "poster": ""
  },
  {
    "src": "./assets/images/mux-hXfMGSk00sYeao99EqE8eqg3lRjNXNrDE.jpg",
    "label": "Hxfmgsk00Syeao99Eqe8Eqg3Lrjnxnrde",
    "category": "Pool",
    "type": "img",
    "poster": ""
  },
  {
    "src": "./assets/images/mux-moiR01sgh1u3bxRJ00nnzsQ202B7uZT7BX4.jpg",
    "label": "Moir01Sgh1U3Bxrj00Nnzsq202B7Uzt7Bx4",
    "category": "Pool",
    "type": "img",
    "poster": ""
  }
];

  const VIV_DEFAULT_DATA = {
  "hero": {
    "srTitle": "ViV \u2014 artist management + production",
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
        "href": "mailto:katie@vivmgmt.com"
      }
    ]
  },
  "galleryColumns": [
    {
      "id": "col-1",
      "name": "Arturo Torres",
      "href": "/artist/arturo-torres",
      "media": [
        {
          "id": "col-1-m-1",
          "type": "img",
          "src": "./assets/images/1778793995-arturo-torres-fashion-photography-advertising-photographer-15.jpg",
          "poster": "",
          "color": "#BFBDC5",
          "width": 912,
          "height": 1140
        },
        {
          "id": "col-1-m-2",
          "type": "img",
          "src": "./assets/images/1779142866-arturo-torres-advertising-photographer-lifestyle-fashion-sports88.jpg",
          "poster": "",
          "color": "#A8C5D2",
          "width": 1500,
          "height": 2048
        },
        {
          "id": "col-1-m-3",
          "type": "img",
          "src": "./assets/images/1779142866-arturo-torres-advertising-photographer-lifestyle-fashion-sports30.jpg",
          "poster": "",
          "color": "#CEBCAE",
          "width": 2000,
          "height": 2500
        },
        {
          "id": "col-1-m-4",
          "type": "img",
          "src": "./assets/images/1779142867-arturo-torres-advertising-photographer-lifestyle-fashion-sports13.jpg",
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
          "src": "./assets/images/1779918226-beauty-model-photography-beth-sternbaum-la-nyc-52.jpg",
          "poster": "",
          "color": "#D2B7A9"
        },
        {
          "id": "col-1-c-2",
          "type": "img",
          "src": "./assets/images/1779918224-beauty-model-photography-beth-sternbaum-la-nyc-63.jpg",
          "poster": "",
          "color": "#819D65"
        },
        {
          "id": "col-1-c-3",
          "type": "img",
          "src": "./assets/images/1779918225-beauty-model-photography-beth-sternbaum-la-nyc-50.jpg",
          "poster": "",
          "color": "#D5C3B8"
        }
      ]
    },
    {
      "id": "col-2",
      "name": "Beth Sternbaum",
      "href": "/artist/beth-sternbaum",
      "media": [
        {
          "id": "col-2-m-1",
          "type": "img",
          "src": "./assets/images/1779918226-beauty-model-photography-beth-sternbaum-la-nyc-52.jpg",
          "poster": "",
          "color": "#D2B7A9",
          "width": 760,
          "height": 1140
        },
        {
          "id": "col-2-m-2",
          "type": "img",
          "src": "./assets/images/1779918224-beauty-model-photography-beth-sternbaum-la-nyc-63.jpg",
          "poster": "",
          "color": "#819D65",
          "width": 760,
          "height": 1140
        },
        {
          "id": "col-2-m-3",
          "type": "img",
          "src": "./assets/images/1779918229-beauty-model-photography-beth-sternbaum-la-nyc-10.jpg",
          "poster": "",
          "color": "#D3B7A9",
          "width": 1140,
          "height": 1140
        },
        {
          "id": "col-2-m-4",
          "type": "img",
          "src": "./assets/images/1779918225-beauty-model-photography-beth-sternbaum-la-nyc-50.jpg",
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
          "src": "./assets/images/1777465143-20180623_foam_test_585.jpg",
          "poster": "",
          "color": "#D1C6AE"
        },
        {
          "id": "col-2-c-2",
          "type": "img",
          "src": "./assets/images/1777466641-cera-hensley-beauty-photography-stilllife-cosmetics-21.jpg",
          "poster": "",
          "color": "#A7A1CF"
        },
        {
          "id": "col-2-c-3",
          "type": "img",
          "src": "./assets/images/1778868514-cera-hensley-x-peaceout.jpg",
          "poster": "",
          "color": "#BAADD1"
        }
      ]
    },
    {
      "id": "col-3",
      "name": "Cera Hensley",
      "href": "/artist/cera-hensley",
      "media": [
        {
          "id": "col-3-m-1",
          "type": "img",
          "src": "./assets/images/1777465143-20180623_foam_test_585.jpg",
          "poster": "",
          "color": "#D1C6AE",
          "width": 1143,
          "height": 1600
        },
        {
          "id": "col-3-m-2",
          "type": "img",
          "src": "./assets/images/1777466641-cera-hensley-beauty-photography-stilllife-cosmetics-21.jpg",
          "poster": "",
          "color": "#A7A1CF",
          "width": 2583,
          "height": 3228
        },
        {
          "id": "col-3-m-3",
          "type": "img",
          "src": "./assets/images/1778868514-cera-hensley-x-peaceout.jpg",
          "poster": "",
          "color": "#BAADD1",
          "width": 1280,
          "height": 1600
        },
        {
          "id": "col-3-m-4",
          "type": "img",
          "src": "./assets/images/1777465200-cera-hensley-food-photography-beverage-stilllife-16.jpg",
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
          "src": "./assets/images/1774484687-221112_nike-hydrostrong_5316.jpg",
          "poster": "",
          "color": "#AAC9DA"
        },
        {
          "id": "col-3-c-2",
          "type": "img",
          "src": "./assets/images/1774484866-byrum-191105-adidas-victor-702.jpg",
          "poster": "",
          "color": "#D4CAAF"
        },
        {
          "id": "col-3-c-3",
          "type": "img",
          "src": "./assets/images/1774484653-byrum-20200305-nike-basketball-studio-0416.jpg",
          "poster": "",
          "color": "#AFCDD0"
        }
      ]
    },
    {
      "id": "col-4",
      "name": "Edward Tran",
      "href": "/artist/edward-tran",
      "media": [
        {
          "id": "col-4-m-1",
          "type": "video",
          "src": "./assets/images/mux-023u7rfeEpGMqj3RtVjZtvuPGQMnyWkNw.mp4",
          "poster": "./assets/images/mux-023u7rfeEpGMqj3RtVjZtvuPGQMnyWkNw.jpg",
          "color": "#1c1c1c",
          "width": 2048,
          "height": 1152
        },
        {
          "id": "col-4-m-2",
          "type": "video",
          "src": "./assets/images/mux-Q2PGRS54ZVUS418j1vLtqaaoa01lAh5KM.mp4",
          "poster": "./assets/images/mux-Q2PGRS54ZVUS418j1vLtqaaoa01lAh5KM.jpg",
          "color": "#1c1c1c",
          "width": 2048,
          "height": 1152
        },
        {
          "id": "col-4-m-3",
          "type": "video",
          "src": "./assets/images/mux-hXfMGSk00sYeao99EqE8eqg3lRjNXNrDE.mp4",
          "poster": "./assets/images/mux-hXfMGSk00sYeao99EqE8eqg3lRjNXNrDE.jpg",
          "color": "#1c1c1c",
          "width": 2048,
          "height": 1152
        },
        {
          "id": "col-4-m-4",
          "type": "video",
          "src": "./assets/images/mux-moiR01sgh1u3bxRJ00nnzsQ202B7uZT7BX4.mp4",
          "poster": "./assets/images/mux-moiR01sgh1u3bxRJ00nnzsQ202B7uZT7BX4.jpg",
          "color": "#1c1c1c",
          "width": 1920,
          "height": 1080
        }
      ],
      "cycleMedia": [
        {
          "id": "col-4-c-1",
          "type": "img",
          "src": "./assets/images/1774485213-160609-harper-christian-1484-3.jpg",
          "poster": "",
          "color": "#A9B4CB"
        },
        {
          "id": "col-4-c-2",
          "type": "img",
          "src": "./assets/images/1782286850-photo-jan-07-2026-3-32-47-pm.jpg",
          "poster": "",
          "color": "#D4ADB0"
        },
        {
          "id": "col-4-c-3",
          "type": "img",
          "src": "./assets/images/1779948864-jason-kent-beauty-photographer-la-nyc-still-life107.jpg",
          "poster": "",
          "color": "#D7C7AF"
        }
      ]
    },
    {
      "id": "col-5",
      "name": "Garrett Byrum",
      "href": "/artist/garrett-byrum",
      "media": [
        {
          "id": "col-5-m-1",
          "type": "img",
          "src": "./assets/images/1774484687-221112_nike-hydrostrong_5316.jpg",
          "poster": "",
          "color": "#AAC9DA",
          "width": 800,
          "height": 1200
        },
        {
          "id": "col-5-m-2",
          "type": "img",
          "src": "./assets/images/1774484866-byrum-191105-adidas-victor-702.jpg",
          "poster": "",
          "color": "#D4CAAF",
          "width": 800,
          "height": 1200
        },
        {
          "id": "col-5-m-3",
          "type": "img",
          "src": "./assets/images/1774484653-byrum-20200305-nike-basketball-studio-0416.jpg",
          "poster": "",
          "color": "#AFCDD0",
          "width": 880,
          "height": 1200
        },
        {
          "id": "col-5-m-4",
          "type": "img",
          "src": "./assets/images/1774485213-160609-harper-christian-1484-3.jpg",
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
          "src": "./assets/images/1779948848-jason-kent-beauty-photographer-la-nyc-still-life71.jpg",
          "poster": "",
          "color": "#CDBAAA"
        },
        {
          "id": "col-5-c-2",
          "type": "img",
          "src": "./assets/images/1779948857-jason-kent-beauty-photographer-la-nyc-still-life74.jpg",
          "poster": "",
          "color": "#A85651"
        },
        {
          "id": "col-5-c-3",
          "type": "img",
          "src": "./assets/images/1779144620-jonathan-mannion-hiphop-music-rap-photography-advertising-photographer-sports22.jpg",
          "poster": "",
          "color": "#B9C1C0"
        }
      ]
    },
    {
      "id": "col-6",
      "name": "Jason Kent",
      "href": "/artist/jason-kent",
      "media": [
        {
          "id": "col-6-m-1",
          "type": "img",
          "src": "./assets/images/1782286850-photo-jan-07-2026-3-32-47-pm.jpg",
          "poster": "",
          "color": "#D4ADB0",
          "width": 5352,
          "height": 6690
        },
        {
          "id": "col-6-m-2",
          "type": "img",
          "src": "./assets/images/1779948864-jason-kent-beauty-photographer-la-nyc-still-life107.jpg",
          "poster": "",
          "color": "#D7C7AF",
          "width": 912,
          "height": 1140
        },
        {
          "id": "col-6-m-3",
          "type": "img",
          "src": "./assets/images/1779948848-jason-kent-beauty-photographer-la-nyc-still-life71.jpg",
          "poster": "",
          "color": "#CDBAAA",
          "width": 918,
          "height": 1140
        },
        {
          "id": "col-6-m-4",
          "type": "img",
          "src": "./assets/images/1779948857-jason-kent-beauty-photographer-la-nyc-still-life74.jpg",
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
          "src": "./assets/images/1779144620-jonathan-mannion-hiphop-music-rap-photography-advertising-photographer-sports48.jpg",
          "poster": "",
          "color": "#C8B3B0"
        },
        {
          "id": "col-6-c-2",
          "type": "img",
          "src": "./assets/images/1779144619-jonathan-mannion-advertising-photographer-lifestyle-celebrity-sports3.jpg",
          "poster": "",
          "color": "#444444"
        },
        {
          "id": "col-6-c-3",
          "type": "img",
          "src": "./assets/images/1779144620-jonathan-mannion-hiphop-music-rap-photography-advertising-photographer-sports32.jpg",
          "poster": "",
          "color": "#D4B6A9"
        }
      ]
    },
    {
      "id": "col-7",
      "name": "Jonathan Mannion",
      "href": "/artist/jonathan-mannion",
      "media": [
        {
          "id": "col-7-m-1",
          "type": "img",
          "src": "./assets/images/1779144620-jonathan-mannion-hiphop-music-rap-photography-advertising-photographer-sports22.jpg",
          "poster": "",
          "color": "#B9C1C0",
          "width": 853,
          "height": 1140
        },
        {
          "id": "col-7-m-2",
          "type": "img",
          "src": "./assets/images/1779144620-jonathan-mannion-hiphop-music-rap-photography-advertising-photographer-sports48.jpg",
          "poster": "",
          "color": "#C8B3B0",
          "width": 759,
          "height": 1140
        },
        {
          "id": "col-7-m-3",
          "type": "img",
          "src": "./assets/images/1779144619-jonathan-mannion-advertising-photographer-lifestyle-celebrity-sports3.jpg",
          "poster": "",
          "color": "#444444",
          "width": 821,
          "height": 1000
        },
        {
          "id": "col-7-m-4",
          "type": "img",
          "src": "./assets/images/1779144620-jonathan-mannion-hiphop-music-rap-photography-advertising-photographer-sports32.jpg",
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
          "src": "./assets/images/1778795294-quinn-gravier-advertising-photographer-portraits-celebrity36.jpg",
          "poster": "",
          "color": "#BB827B"
        },
        {
          "id": "col-7-c-2",
          "type": "img",
          "src": "./assets/images/1778795295-quinn-gravier-advertising-photographer-portraits-celebrity33.jpg",
          "poster": "",
          "color": "#D6D0AE"
        },
        {
          "id": "col-7-c-3",
          "type": "img",
          "src": "./assets/images/1778795295-quinn-gravier-advertising-photographer-portraits-celebrity45.jpg",
          "poster": "",
          "color": "#D5CAAE"
        }
      ]
    },
    {
      "id": "col-8",
      "name": "Quinn Gravier",
      "href": "/artist/quinn-gravier",
      "media": [
        {
          "id": "col-8-m-1",
          "type": "img",
          "src": "./assets/images/1778795294-quinn-gravier-advertising-photographer-portraits-celebrity36.jpg",
          "poster": "",
          "color": "#BB827B",
          "width": 1500,
          "height": 2165
        },
        {
          "id": "col-8-m-2",
          "type": "img",
          "src": "./assets/images/1778795295-quinn-gravier-advertising-photographer-portraits-celebrity33.jpg",
          "poster": "",
          "color": "#D6D0AE",
          "width": 1500,
          "height": 2199
        },
        {
          "id": "col-8-m-3",
          "type": "img",
          "src": "./assets/images/1778795295-quinn-gravier-advertising-photographer-portraits-celebrity45.jpg",
          "poster": "",
          "color": "#D5CAAE",
          "width": 5462,
          "height": 8189
        },
        {
          "id": "col-8-m-4",
          "type": "img",
          "src": "./assets/images/1778795294-quinn-gravier-advertising-photographer-portraits-celebrity47.jpg",
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
          "src": "./assets/images/1778184120-gap-studio-zac-posen-denim-portrait.jpg",
          "poster": "",
          "color": "#D1B7A7"
        },
        {
          "id": "col-8-c-2",
          "type": "img",
          "src": "./assets/images/1778184121-danielle-moore-tidal-magazine-black-and-white-fashion-portrait.jpg",
          "poster": "",
          "color": "#444444"
        },
        {
          "id": "col-8-c-3",
          "type": "img",
          "src": "./assets/images/1778184121-fashion-editorial-horse-barragan-stables-mexico.jpg",
          "poster": "",
          "color": "#C5BEC4"
        }
      ]
    },
    {
      "id": "col-9",
      "name": "Danielle Moore",
      "href": "/director/danielle-moore",
      "media": [
        {
          "id": "col-9-m-1",
          "type": "img",
          "src": "./assets/images/1778184120-gap-studio-zac-posen-denim-portrait.jpg",
          "poster": "",
          "color": "#D1B7A7",
          "width": 1536,
          "height": 2048
        },
        {
          "id": "col-9-m-2",
          "type": "img",
          "src": "./assets/images/1778184121-danielle-moore-tidal-magazine-black-and-white-fashion-portrait.jpg",
          "poster": "",
          "color": "#444444",
          "width": 1536,
          "height": 2048
        },
        {
          "id": "col-9-m-3",
          "type": "img",
          "src": "./assets/images/1778184121-fashion-editorial-horse-barragan-stables-mexico.jpg",
          "poster": "",
          "color": "#C5BEC4",
          "width": 1536,
          "height": 2048
        },
        {
          "id": "col-9-m-4",
          "type": "img",
          "src": "./assets/images/1778772904-danielle-moore-phils-skincare-mens-beauty-portrait.jpg",
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
          "src": "./assets/images/1778793995-arturo-torres-fashion-photography-advertising-photographer-15.jpg",
          "poster": "",
          "color": "#BFBDC5"
        },
        {
          "id": "col-9-c-2",
          "type": "img",
          "src": "./assets/images/1779142866-arturo-torres-advertising-photographer-lifestyle-fashion-sports88.jpg",
          "poster": "",
          "color": "#A8C5D2"
        },
        {
          "id": "col-9-c-3",
          "type": "img",
          "src": "./assets/images/1779142866-arturo-torres-advertising-photographer-lifestyle-fashion-sports30.jpg",
          "poster": "",
          "color": "#CEBCAE"
        }
      ]
    }
  ],
  "straplineSection": {
    "text": "ViV is an artist management and production company.",
    "uprightWords": "is, an, and"
  },
  "newsSection": {
    "heading": "News",
    "allButtonText": "All News",
    "allButtonLink": "#news",
    "items": [
      {
        "id": "news-1",
        "title": "ARTURO TORRES x MARINE LAYER",
        "href": "#news-arturo-torres-marine-layer",
        "type": "img",
        "src": "./assets/images/1779142866-arturo-torres-advertising-photographer-lifestyle-fashion-sports88.jpg",
        "poster": "",
        "color": "#a8c5d2",
        "width": 1500,
        "height": 2048
      },
      {
        "id": "news-2",
        "title": "DANIELLE MOORE x OLD NAVY BTS",
        "href": "#news-danielle-moore-old-navy",
        "type": "img",
        "src": "./assets/images/1784528935-danielle-moore-old-navy-kids-art-direction-product-styling-color-collection-instagram-03.jpg",
        "poster": "",
        "color": "#acb7d2",
        "width": 2250,
        "height": 2813
      },
      {
        "id": "news-3",
        "title": "JONATHAN MANNION x NIKE",
        "href": "#news-jonathan-mannion-nike",
        "type": "video",
        "src": "./assets/images/mux-g01MHyRNqn01zJw6x81ckEU1CILwna5kTF.mp4",
        "poster": "./assets/images/mux-g01MHyRNqn01zJw6x81ckEU1CILwna5kTF.jpg",
        "color": "#1a1a1a",
        "width": 1080,
        "height": 1440
      },
      {
        "id": "news-4",
        "title": "JASON KENT x MORPHE II",
        "href": "#news-jason-kent-morphe-ii",
        "type": "img",
        "src": "./assets/images/1782286849-morpheliplock3446.jpg",
        "poster": "",
        "color": "#d4ada5",
        "width": 1852,
        "height": 2314
      },
      {
        "id": "news-5",
        "title": "DANIELLE MOORE & ARTURO TORRES X QUAY",
        "href": "#news-quay-danielle-moore-arturo-torres",
        "type": "img",
        "src": "./assets/images/1773702313-danielle-moore-arturo-torres-summer-25-quay19.jpg",
        "poster": "",
        "color": "#cbbaa8",
        "width": 760,
        "height": 1140
      },
      {
        "id": "news-6",
        "title": "ARTURO TORRES x TRAVIS MATTHEW",
        "href": "#news-arturo-torres-travis-matthew",
        "type": "img",
        "src": "./assets/images/1784525114-arturo-torres-travis-matthew-catalog-photography-05.jpg",
        "poster": "",
        "color": "#ccbca7",
        "width": 1380,
        "height": 1731
      }
    ]
  },
  "footerSection": {
    "straplines": [
      "*ViV* is *artist management*.",
      "*ViV* is *production*.",
      "We make *beautiful* work.",
      "Come *create* with us."
    ],
    "artistsTitle": "Artists",
    "artists": [
      {
        "id": "fa-1",
        "name": "Arturo Torres",
        "href": "#artist-arturo-torres",
        "color": "#D3B6AA",
        "type": "img",
        "image": "./assets/images/1778793996-arturo-torres-fashion-photography-advertising-photographer-25.jpg",
        "video": ""
      },
      {
        "id": "fa-2",
        "name": "Beth Sternbaum",
        "href": "#artist-beth-sternbaum",
        "color": "#B1BDCA",
        "type": "img",
        "image": "./assets/images/1779918227-beauty-model-photography-beth-sternbaum-la-nyc-46.jpg",
        "video": ""
      },
      {
        "id": "fa-3",
        "name": "Cera Hensley",
        "href": "#artist-cera-hensley",
        "color": "#CE8EAC",
        "type": "img",
        "image": "./assets/images/1778275287-kinship-makeup-sunscreen-stilllife-photoshoot-production-6.jpg",
        "video": ""
      },
      {
        "id": "fa-4",
        "name": "Danielle Moore",
        "href": "#director-danielle-moore",
        "color": "#D3C4AD",
        "type": "img",
        "image": "./assets/images/1778184121-danielle-moore-desert-couture-fashion-editorial.jpg",
        "video": ""
      },
      {
        "id": "fa-5",
        "name": "Edward Tran",
        "href": "#artist-edward-tran",
        "color": "#C2C6CC",
        "type": "video",
        "image": "./assets/images/mux-FHz8NP01m1g9j4zStyj1XZfio4fLsLkHz.jpg",
        "video": "./assets/images/mux-FHz8NP01m1g9j4zStyj1XZfio4fLsLkHz.mp4"
      },
      {
        "id": "fa-6",
        "name": "Garrett Byrum",
        "href": "#artist-garrett-byrum",
        "color": "#B4D0A7",
        "type": "img",
        "image": "./assets/images/1779483426-garrett-byrum-producion-photography-advertising-powerade-fifa-3.jpg",
        "video": ""
      },
      {
        "id": "fa-7",
        "name": "Jason Kent",
        "href": "#artist-jason-kent",
        "color": "#CEB5AC",
        "type": "img",
        "image": "./assets/images/1779948867-jason-kent-beauty-photographer-la-nyc-still-life141.jpg",
        "video": ""
      },
      {
        "id": "fa-8",
        "name": "Jonathan Mannion",
        "href": "#artist-jonathan-mannion",
        "color": "#B1C3CE",
        "type": "img",
        "image": "./assets/images/1779132350-jonathan-mannion-hiphop-music-rap-photography-advertising-photographer-archive-5.jpg",
        "video": ""
      },
      {
        "id": "fa-9",
        "name": "Quinn Gravier",
        "href": "#artist-quinn-gravier",
        "color": "#CDB398",
        "type": "img",
        "image": "./assets/images/1778795293-quinn-gravier-advertising-photographer-portraits-celebrity26.jpg",
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
        "href": "mailto:katie@vivmgmt.com",
        "external": false
      },
      {
        "id": "con-2",
        "label": "LinkedIn",
        "href": "https://www.linkedin.com/company/vivmgmt",
        "external": true
      },
      {
        "id": "con-3",
        "label": "Instagram",
        "href": "https://www.instagram.com/vivmgmt_",
        "external": true
      }
    ],
    "copyright": "\u00a9 2026 ViV MGMT, All Rights Reserved."
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
    const base = deepClone(VIV_DEFAULT_DATA);
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
  const IDB_NAME = 'viv_media_db_v1';
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
        window.dispatchEvent(new CustomEvent('viv:uploads-synced', { detail: cachedUploads }));
      } else if (cachedUploads && cachedUploads.length > 0) {
        cachedUploads.forEach((item) => idbPut(item).catch(() => {}));
      }
    });
  }

  const VIVStore = {
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
      return normalizeSiteData(VIV_DEFAULT_DATA);
    },

    getMediaLibrary() {
      const customUploads = this.getCustomUploads();
      return [...customUploads, ...VIV_MEDIA_LIBRARY];
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

      window.dispatchEvent(new CustomEvent('viv:uploads-synced', { detail: cachedUploads }));
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

      window.dispatchEvent(new CustomEvent('viv:uploads-synced', { detail: cachedUploads }));
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

      window.dispatchEvent(new CustomEvent('viv:uploads-synced', { detail: cachedUploads }));
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
          syncChannel.postMessage({ type: 'VIV_DATA_UPDATED', data: normalized });
        } catch (_) {}
      }
      window.dispatchEvent(new CustomEvent('viv:data-updated', { detail: normalized }));
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
          if (e.data && e.data.type === 'VIV_DATA_UPDATED') {
            notifyDeduped(e.data.data);
          }
        });
      }
      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY) {
          notifyDeduped(this.load());
        }
      });
      window.addEventListener('viv:data-updated', (e) => {
        if (e.detail) notifyDeduped(e.detail);
      });
    },
  };

  window.VIV_MEDIA_LIBRARY = VIV_MEDIA_LIBRARY;
  window.VIV_DEFAULT_DATA = normalizeSiteData(VIV_DEFAULT_DATA);
  window.VIVStore = VIVStore;
})();

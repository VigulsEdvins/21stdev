#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { launchBrowser } = require('../lib/browser');

const SITE = path.resolve(__dirname, '..', '..', 'site');
const OUT_DIR = path.resolve(__dirname, '..', '..', 'google-ads');

function toDataUri(relPath, mimeType = 'image/webp') {
  const full = path.join(SITE, relPath);
  if (!fs.existsSync(full)) return '';
  const buf = fs.readFileSync(full);
  return `data:${mimeType};base64,${buf.toString('base64')}`;
}

const cobaltImg = toDataUri('img/examples/cobalt-toile-landing.webp', 'image/webp');

const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 34 34" width="36" height="36"><circle cx="17" cy="17" r="17" fill="#e2a627"/><path d="M0 17a17 17 0 0 0 34 0z" fill="#c4522a"/></svg>`;
const logoSvgLg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 34 34" width="46" height="46"><circle cx="17" cy="17" r="17" fill="#e2a627"/><path d="M0 17a17 17 0 0 0 34 0z" fill="#c4522a"/></svg>`;

// ==========================================
// 1. LANDSCAPE TEAL (1200 x 628)
// ==========================================
function getHtmlLandscapeTeal() {
  return `<!doctype html>
<html lang="lv">
<head>
<meta charset="utf-8">
<link rel="stylesheet" href="file://${SITE}/styles/fonts.css">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1200px;
    height: 628px;
    background: #1f5c5a;
    color: #f4ead3;
    font-family: 'Work Sans', system-ui, -apple-system, sans-serif;
    position: relative;
    overflow: hidden;
    padding: 44px 56px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .left {
    width: 580px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 100%;
    z-index: 2;
  }

  .brand-row {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .brand-logo {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .brand-name {
    font-family: 'Gloock', Georgia, serif;
    font-size: 34px;
    line-height: 1;
    color: #f4ead3;
    letter-spacing: -0.01em;
  }

  .tag-pill {
    background: rgba(244, 234, 211, 0.12);
    border: 1.5px solid rgba(226, 166, 39, 0.7);
    color: #e2a627;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    padding: 6px 14px;
    border-radius: 999px;
  }

  .headline-group {
    margin: 12px 0;
  }

  h1 {
    font-family: 'Gloock', Georgia, serif;
    font-size: 52px;
    line-height: 1.12;
    letter-spacing: -0.01em;
    color: #f4ead3;
    margin-bottom: 14px;
  }

  h1 em {
    font-style: normal;
    color: #e2a627;
  }

  .lede {
    font-size: 19px;
    line-height: 1.45;
    color: #e9dfc6;
    max-width: 520px;
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 22px;
  }

  .chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #fbf5e4;
    color: #1d2a33;
    font-size: 14px;
    font-weight: 600;
    padding: 8px 16px;
    border-radius: 999px;
    border: 1.5px solid #1d2a33;
  }

  .chip.chip-gold {
    background: #e2a627;
    color: #1d2a33;
    font-weight: 700;
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 20px;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: #c4522a;
    color: #ffffff;
    font-size: 18px;
    font-weight: 600;
    padding: 14px 28px;
    border-radius: 999px;
    border: 2px solid #1d2a33;
    box-shadow: 0 4px 14px rgba(0,0,0,0.25);
  }

  .url {
    font-size: 15px;
    font-weight: 600;
    color: #e9dfc6;
    letter-spacing: 0.04em;
    opacity: 0.9;
  }

  /* Right column */
  .right {
    width: 490px;
    height: 100%;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .sun {
    position: absolute;
    top: 15px;
    right: 40px;
    width: 250px;
    height: 250px;
    border-radius: 50%;
    background: #e2a627;
    z-index: 1;
  }

  .arch {
    position: absolute;
    bottom: -30px;
    right: 20px;
    width: 320px;
    height: 380px;
    background: #c4522a;
    border-radius: 160px 160px 0 0;
    z-index: 1;
  }

  .arch::after {
    content: "";
    position: absolute;
    inset: 16% 18% 0;
    background: #f4ead3;
    border-radius: 110px 110px 0 0;
  }

  .mockup-wrapper {
    position: absolute;
    z-index: 3;
    top: 75px;
    left: 20px;
    width: 430px;
    transform: rotate(-3deg);
  }

  .mockup-card {
    background: #fbf5e4;
    border: 2.5px solid #1d2a33;
    border-radius: 18px;
    overflow: hidden;
    box-shadow: 0 20px 40px rgba(0,0,0,0.35);
  }

  .mockup-bar {
    background: #f4ead3;
    padding: 11px 16px;
    border-bottom: 2px solid #1d2a33;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .dots { display: flex; gap: 5px; }
  .dot { width: 9px; height: 9px; border-radius: 50%; background: #1d2a33; opacity: 0.6; }
  .bar-title { font-size: 11px; color: #44505a; font-weight: 500; margin-left: 6px; }

  .mockup-content { padding: 14px 14px 18px; }
  .preview-img { width: 100%; height: 215px; object-fit: cover; border-radius: 10px; border: 1.5px solid #1d2a33; }
  
  .mockup-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 10px;
    padding: 0 4px;
  }
  .mockup-desc { font-size: 13px; font-weight: 700; color: #1d2a33; }
  .mockup-meta { font-size: 12px; font-weight: 600; color: #a8401a; }

  .badge-top {
    position: absolute;
    top: -14px;
    right: 20px;
    background: #e2a627;
    color: #1d2a33;
    border: 2px solid #1d2a33;
    border-radius: 999px;
    padding: 6px 14px;
    font-size: 12px;
    font-weight: 700;
    box-shadow: 0 4px 10px rgba(0,0,0,0.2);
    transform: rotate(4deg);
    z-index: 5;
  }

  .badge-bottom {
    position: absolute;
    bottom: -15px;
    right: 24px;
    background: #c4522a;
    color: #fff;
    border: 2px solid #1d2a33;
    border-radius: 999px;
    padding: 6px 14px;
    font-size: 12px;
    font-weight: 700;
    box-shadow: 0 4px 10px rgba(0,0,0,0.25);
    transform: rotate(-2deg);
    z-index: 5;
  }
</style>
</head>
<body>
  <div class="left">
    <div class="brand-row">
      <div class="brand-logo">
        ${logoSvg}
        <span class="brand-name">edvlabs</span>
      </div>
      <div class="tag-pill">Mājaslapas mazajam uzņēmumam</div>
    </div>

    <div class="headline-group">
      <h1>Laba lapa labam<br><em>mazajam uzņēmumam.</em></h1>
      <p class="lede">Atbildiet uz vienkāršiem jautājumiem. Gatavie faili paliek jums uz visiem laikiem.</p>
    </div>

    <div>
      <div class="chips">
        <span class="chip chip-gold">No €39</span>
        <span class="chip">Faili pieder jums</span>
        <span class="chip">Bez koda un stresa</span>
      </div>

      <div class="actions">
        <div class="btn">Sākt savu lapu →</div>
        <span class="url">edvlabs.com/lv</span>
      </div>
    </div>
  </div>

  <div class="right">
    <div class="sun"></div>
    <div class="arch"></div>

    <div class="mockup-wrapper">
      <div class="badge-top">Gatavs dažu dienu laikā</div>
      <div class="mockup-card">
        <div class="mockup-bar">
          <div class="dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
          <span class="bar-title">edvlabs.com/lv</span>
        </div>
        <div class="mockup-content">
          <img class="preview-img" src="${cobaltImg}" alt="Amatnieku studijas mājaslapa">
          <div class="mockup-footer">
            <span class="mockup-desc">Paraugs: Amatnieku studija</span>
            <span class="mockup-meta">200+ gatavu bloku</span>
          </div>
        </div>
      </div>
      <div class="badge-bottom">100% jūsu īpašums</div>
    </div>
  </div>
</body>
</html>`;
}

// ==========================================
// 2. SQUARE TEAL (1200 x 1200)
// ==========================================
function getHtmlSquareTeal() {
  return `<!doctype html>
<html lang="lv">
<head>
<meta charset="utf-8">
<link rel="stylesheet" href="file://${SITE}/styles/fonts.css">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1200px;
    height: 1200px;
    background: #1f5c5a;
    color: #f4ead3;
    font-family: 'Work Sans', system-ui, -apple-system, sans-serif;
    position: relative;
    overflow: hidden;
    padding: 64px 72px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
  }

  .header {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    z-index: 2;
  }

  .brand-logo {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .brand-name {
    font-family: 'Gloock', Georgia, serif;
    font-size: 46px;
    line-height: 1;
    color: #f4ead3;
    letter-spacing: -0.01em;
  }

  .tag-pill {
    background: rgba(244, 234, 211, 0.12);
    border: 2px solid rgba(226, 166, 39, 0.7);
    color: #e2a627;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    padding: 10px 22px;
    border-radius: 999px;
  }

  .hero-text {
    z-index: 2;
    text-align: center;
    margin-top: 10px;
  }

  h1 {
    font-family: 'Gloock', Georgia, serif;
    font-size: 68px;
    line-height: 1.14;
    letter-spacing: -0.01em;
    color: #f4ead3;
    margin-bottom: 16px;
  }

  h1 em {
    font-style: normal;
    color: #e2a627;
  }

  .lede {
    font-size: 24px;
    line-height: 1.45;
    color: #e9dfc6;
    max-width: 860px;
    margin: 0 auto;
  }

  /* Center Stage */
  .center-stage {
    position: relative;
    width: 100%;
    height: 520px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .sun {
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 340px;
    height: 340px;
    border-radius: 50%;
    background: #e2a627;
    z-index: 1;
  }

  .arch {
    position: absolute;
    bottom: -40px;
    left: 50%;
    transform: translateX(-50%);
    width: 480px;
    height: 500px;
    background: #c4522a;
    border-radius: 240px 240px 0 0;
    z-index: 1;
  }

  .arch::after {
    content: "";
    position: absolute;
    inset: 12% 16% 0;
    background: #f4ead3;
    border-radius: 160px 160px 0 0;
  }

  /* Mockup card wrapper */
  .mockup-wrapper {
    position: relative;
    z-index: 3;
    width: 680px;
  }

  .mockup-card {
    background: #fbf5e4;
    border: 3px solid #1d2a33;
    border-radius: 24px;
    overflow: hidden;
    box-shadow: 0 28px 56px rgba(0,0,0,0.4);
  }

  .mockup-bar {
    background: #f4ead3;
    padding: 14px 20px;
    border-bottom: 2.5px solid #1d2a33;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .dots { display: flex; gap: 6px; }
  .dot { width: 11px; height: 11px; border-radius: 50%; background: #1d2a33; opacity: 0.6; }
  .bar-title { font-size: 14px; color: #44505a; font-weight: 500; margin-left: 10px; }

  .mockup-content { padding: 18px 20px 22px; }
  .preview-img { width: 100%; height: 300px; object-fit: cover; border-radius: 14px; border: 2px solid #1d2a33; }
  
  .mockup-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 14px;
    padding: 0 4px;
  }
  .mockup-desc { font-size: 18px; font-weight: 700; color: #1d2a33; }
  .mockup-meta { font-size: 15px; font-weight: 700; color: #a8401a; }

  .badge-top {
    position: absolute;
    top: -16px;
    right: 28px;
    background: #e2a627;
    color: #1d2a33;
    border: 2.5px solid #1d2a33;
    border-radius: 999px;
    padding: 8px 22px;
    font-size: 16px;
    font-weight: 700;
    box-shadow: 0 6px 14px rgba(0,0,0,0.25);
    transform: rotate(4deg);
    z-index: 5;
  }

  .badge-bottom {
    position: absolute;
    bottom: -18px;
    right: 32px;
    background: #c4522a;
    color: #ffffff;
    border: 2.5px solid #1d2a33;
    border-radius: 999px;
    padding: 8px 22px;
    font-size: 16px;
    font-weight: 700;
    box-shadow: 0 6px 14px rgba(0,0,0,0.3);
    z-index: 5;
    transform: rotate(-2deg);
  }

  /* Bottom Area */
  .bottom-area {
    width: 100%;
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
  }

  .chips {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 14px;
  }

  .chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: #fbf5e4;
    color: #1d2a33;
    font-size: 18px;
    font-weight: 600;
    padding: 10px 24px;
    border-radius: 999px;
    border: 2px solid #1d2a33;
  }

  .chip.chip-gold {
    background: #e2a627;
    color: #1d2a33;
    font-weight: 700;
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 24px;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    background: #c4522a;
    color: #ffffff;
    font-size: 22px;
    font-weight: 600;
    padding: 18px 44px;
    border-radius: 999px;
    border: 2.5px solid #1d2a33;
    box-shadow: 0 6px 18px rgba(0,0,0,0.25);
  }

  .url {
    font-size: 20px;
    font-weight: 600;
    color: #e9dfc6;
    letter-spacing: 0.04em;
  }
</style>
</head>
<body>
  <div class="header">
    <div class="brand-logo">
      ${logoSvgLg}
      <span class="brand-name">edvlabs</span>
    </div>
    <div class="tag-pill">Mājaslapas mazajam uzņēmumam</div>
  </div>

  <div class="hero-text">
    <h1>Laba lapa labam<br><em>mazajam uzņēmumam.</em></h1>
    <p class="lede">Atbildiet uz vienkāršiem jautājumiem. Izveidojiet paši vai uzticiet mums.<br>Gatavie faili paliek jums uz visiem laikiem.</p>
  </div>

  <div class="center-stage">
    <div class="sun"></div>
    <div class="arch"></div>

    <div class="mockup-wrapper">
      <div class="badge-top">Gatavs dažu dienu laikā</div>
      <div class="mockup-card">
        <div class="mockup-bar">
          <div class="dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
          <span class="bar-title">edvlabs.com/lv</span>
        </div>
        <div class="mockup-content">
          <img class="preview-img" src="${cobaltImg}" alt="Amatnieku studijas mājaslapa">
          <div class="mockup-footer">
            <span class="mockup-desc">Paraugs: Amatnieku un pakalpojumu studija</span>
            <span class="mockup-meta">200+ gatavu bloku</span>
          </div>
        </div>
      </div>
      <div class="badge-bottom">100% jūsu īpašumā</div>
    </div>
  </div>

  <div class="bottom-area">
    <div class="chips">
      <span class="chip chip-gold">Cenas no €39</span>
      <span class="chip">Faili pieder jums</span>
      <span class="chip">Bez programmēšanas</span>
    </div>

    <div class="actions">
      <div class="btn">Sākt savu lapu →</div>
      <span class="url">edvlabs.com/lv</span>
    </div>
  </div>
</body>
</html>`;
}

// ==========================================
// 3. LANDSCAPE PAPER (1200 x 628)
// ==========================================
function getHtmlLandscapePaper() {
  return `<!doctype html>
<html lang="lv">
<head>
<meta charset="utf-8">
<link rel="stylesheet" href="file://${SITE}/styles/fonts.css">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1200px;
    height: 628px;
    background: #f4ead3;
    color: #1d2a33;
    font-family: 'Work Sans', system-ui, -apple-system, sans-serif;
    position: relative;
    overflow: hidden;
    padding: 44px 56px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border: 12px solid #1f5c5a;
  }

  .left {
    width: 580px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 100%;
    z-index: 2;
  }

  .brand-row {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .brand-logo {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .brand-name {
    font-family: 'Gloock', Georgia, serif;
    font-size: 34px;
    line-height: 1;
    color: #1d2a33;
    letter-spacing: -0.01em;
  }

  .tag-pill {
    background: #e2a627;
    color: #1d2a33;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    padding: 6px 14px;
    border-radius: 999px;
    border: 1.5px solid #1d2a33;
  }

  .headline-group {
    margin: 12px 0;
  }

  h1 {
    font-family: 'Gloock', Georgia, serif;
    font-size: 52px;
    line-height: 1.12;
    letter-spacing: -0.01em;
    color: #1d2a33;
    margin-bottom: 14px;
  }

  h1 em {
    font-style: normal;
    color: #c4522a;
  }

  .lede {
    font-size: 19px;
    line-height: 1.45;
    color: #44505a;
    max-width: 510px;
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 22px;
  }

  .chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #ffffff;
    color: #1d2a33;
    font-size: 14px;
    font-weight: 600;
    padding: 8px 16px;
    border-radius: 999px;
    border: 1.5px solid #1d2a33;
  }

  .chip.chip-teal {
    background: #1f5c5a;
    color: #f4ead3;
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 20px;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: #c4522a;
    color: #ffffff;
    font-size: 18px;
    font-weight: 600;
    padding: 14px 28px;
    border-radius: 999px;
    border: 2px solid #1d2a33;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }

  .url {
    font-size: 15px;
    font-weight: 600;
    color: #1d2a33;
    letter-spacing: 0.04em;
  }

  .right {
    width: 490px;
    height: 100%;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .sun {
    position: absolute;
    top: 15px;
    right: 40px;
    width: 250px;
    height: 250px;
    border-radius: 50%;
    background: #e2a627;
    z-index: 1;
  }

  .arch {
    position: absolute;
    bottom: -30px;
    right: 20px;
    width: 320px;
    height: 380px;
    background: #1f5c5a;
    border-radius: 160px 160px 0 0;
    z-index: 1;
  }

  .arch::after {
    content: "";
    position: absolute;
    inset: 16% 18% 0;
    background: #fbf5e4;
    border-radius: 110px 110px 0 0;
  }

  .mockup-wrapper {
    position: absolute;
    z-index: 3;
    top: 75px;
    left: 20px;
    width: 430px;
    transform: rotate(-3deg);
  }

  .mockup-card {
    background: #ffffff;
    border: 2.5px solid #1d2a33;
    border-radius: 18px;
    overflow: hidden;
    box-shadow: 0 18px 36px rgba(29,42,51,0.18);
  }

  .mockup-bar {
    background: #f4ead3;
    padding: 11px 16px;
    border-bottom: 2px solid #1d2a33;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .dots { display: flex; gap: 5px; }
  .dot { width: 9px; height: 9px; border-radius: 50%; background: #1d2a33; opacity: 0.6; }
  .bar-title { font-size: 11px; color: #44505a; font-weight: 500; margin-left: 6px; }

  .mockup-content { padding: 14px 14px 18px; }
  .preview-img { width: 100%; height: 215px; object-fit: cover; border-radius: 10px; border: 1.5px solid #1d2a33; }
  
  .mockup-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 10px;
    padding: 0 4px;
  }
  .mockup-desc { font-size: 13px; font-weight: 700; color: #1d2a33; }
  .mockup-meta { font-size: 12px; font-weight: 600; color: #a8401a; }

  .badge-top {
    position: absolute;
    top: -14px;
    right: 20px;
    background: #c4522a;
    color: #ffffff;
    border: 2px solid #1d2a33;
    border-radius: 999px;
    padding: 6px 14px;
    font-size: 12px;
    font-weight: 700;
    box-shadow: 0 4px 10px rgba(0,0,0,0.15);
    transform: rotate(4deg);
    z-index: 5;
  }

  .badge-bottom {
    position: absolute;
    bottom: -15px;
    right: 24px;
    background: #e2a627;
    color: #1d2a33;
    border: 2px solid #1d2a33;
    border-radius: 999px;
    padding: 6px 14px;
    font-size: 12px;
    font-weight: 700;
    box-shadow: 0 4px 10px rgba(0,0,0,0.15);
    transform: rotate(-2deg);
    z-index: 5;
  }
</style>
</head>
<body>
  <div class="left">
    <div class="brand-row">
      <div class="brand-logo">
        ${logoSvg}
        <span class="brand-name">edvlabs</span>
      </div>
      <div class="tag-pill">Mājaslapas mazajam uzņēmumam</div>
    </div>

    <div class="headline-group">
      <h1>Laba lapa labam<br><em>mazajam uzņēmumam.</em></h1>
      <p class="lede">Atbildiet uz vienkāršiem jautājumiem. Gatavie faili paliek jums uz visiem laikiem.</p>
    </div>

    <div>
      <div class="chips">
        <span class="chip chip-teal">No €39</span>
        <span class="chip">Faili pieder jums</span>
        <span class="chip">Bez programmēšanas</span>
      </div>

      <div class="actions">
        <div class="btn">Sākt savu lapu →</div>
        <span class="url">edvlabs.com/lv</span>
      </div>
    </div>
  </div>

  <div class="right">
    <div class="sun"></div>
    <div class="arch"></div>

    <div class="mockup-wrapper">
      <div class="badge-top">Gatavs dažu dienu laikā</div>
      <div class="mockup-card">
        <div class="mockup-bar">
          <div class="dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
          <span class="bar-title">edvlabs.com/lv</span>
        </div>
        <div class="mockup-content">
          <img class="preview-img" src="${cobaltImg}" alt="Amatnieku studijas mājaslapa">
          <div class="mockup-footer">
            <span class="mockup-desc">Paraugs: Amatnieku studija</span>
            <span class="mockup-meta">200+ gatavu bloku</span>
          </div>
        </div>
      </div>
      <div class="badge-bottom">100% jūsu īpašumā</div>
    </div>
  </div>
</body>
</html>`;
}

// ==========================================
// 4. SQUARE PAPER (1200 x 1200)
// ==========================================
function getHtmlSquarePaper() {
  return `<!doctype html>
<html lang="lv">
<head>
<meta charset="utf-8">
<link rel="stylesheet" href="file://${SITE}/styles/fonts.css">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1200px;
    height: 1200px;
    background: #f4ead3;
    color: #1d2a33;
    font-family: 'Work Sans', system-ui, -apple-system, sans-serif;
    position: relative;
    overflow: hidden;
    padding: 64px 72px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    border: 16px solid #1f5c5a;
  }

  .header {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    z-index: 2;
  }

  .brand-logo {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .brand-name {
    font-family: 'Gloock', Georgia, serif;
    font-size: 46px;
    line-height: 1;
    color: #1d2a33;
    letter-spacing: -0.01em;
  }

  .tag-pill {
    background: #e2a627;
    color: #1d2a33;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    padding: 10px 22px;
    border-radius: 999px;
    border: 2px solid #1d2a33;
  }

  .hero-text {
    z-index: 2;
    text-align: center;
    margin-top: 10px;
  }

  h1 {
    font-family: 'Gloock', Georgia, serif;
    font-size: 68px;
    line-height: 1.14;
    letter-spacing: -0.01em;
    color: #1d2a33;
    margin-bottom: 16px;
  }

  h1 em {
    font-style: normal;
    color: #c4522a;
  }

  .lede {
    font-size: 24px;
    line-height: 1.45;
    color: #44505a;
    max-width: 860px;
    margin: 0 auto;
  }

  .center-stage {
    position: relative;
    width: 100%;
    height: 520px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .sun {
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 340px;
    height: 340px;
    border-radius: 50%;
    background: #e2a627;
    z-index: 1;
  }

  .arch {
    position: absolute;
    bottom: -40px;
    left: 50%;
    transform: translateX(-50%);
    width: 480px;
    height: 500px;
    background: #1f5c5a;
    border-radius: 240px 240px 0 0;
    z-index: 1;
  }

  .arch::after {
    content: "";
    position: absolute;
    inset: 12% 16% 0;
    background: #fbf5e4;
    border-radius: 160px 160px 0 0;
  }

  .mockup-wrapper {
    position: relative;
    z-index: 3;
    width: 680px;
  }

  .mockup-card {
    background: #ffffff;
    border: 3px solid #1d2a33;
    border-radius: 24px;
    overflow: hidden;
    box-shadow: 0 28px 56px rgba(29,42,51,0.22);
  }

  .mockup-bar {
    background: #f4ead3;
    padding: 14px 20px;
    border-bottom: 2.5px solid #1d2a33;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .dots { display: flex; gap: 6px; }
  .dot { width: 11px; height: 11px; border-radius: 50%; background: #1d2a33; opacity: 0.6; }
  .bar-title { font-size: 14px; color: #44505a; font-weight: 500; margin-left: 10px; }

  .mockup-content { padding: 18px 20px 22px; }
  .preview-img { width: 100%; height: 300px; object-fit: cover; border-radius: 14px; border: 2px solid #1d2a33; }
  
  .mockup-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 14px;
    padding: 0 4px;
  }
  .mockup-desc { font-size: 18px; font-weight: 700; color: #1d2a33; }
  .mockup-meta { font-size: 15px; font-weight: 700; color: #a8401a; }

  .badge-top {
    position: absolute;
    top: -16px;
    right: 28px;
    background: #c4522a;
    color: #ffffff;
    border: 2.5px solid #1d2a33;
    border-radius: 999px;
    padding: 8px 22px;
    font-size: 16px;
    font-weight: 700;
    box-shadow: 0 6px 14px rgba(0,0,0,0.18);
    transform: rotate(4deg);
    z-index: 5;
  }

  .badge-bottom {
    position: absolute;
    bottom: -18px;
    right: 32px;
    background: #e2a627;
    color: #1d2a33;
    border: 2.5px solid #1d2a33;
    border-radius: 999px;
    padding: 8px 22px;
    font-size: 16px;
    font-weight: 700;
    box-shadow: 0 6px 14px rgba(0,0,0,0.2);
    z-index: 5;
    transform: rotate(-3deg);
  }

  .bottom-area {
    width: 100%;
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
  }

  .chips {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 14px;
  }

  .chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: #ffffff;
    color: #1d2a33;
    font-size: 18px;
    font-weight: 600;
    padding: 10px 24px;
    border-radius: 999px;
    border: 2px solid #1d2a33;
  }

  .chip.chip-teal {
    background: #1f5c5a;
    color: #f4ead3;
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 24px;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    background: #c4522a;
    color: #ffffff;
    font-size: 22px;
    font-weight: 600;
    padding: 18px 44px;
    border-radius: 999px;
    border: 2.5px solid #1d2a33;
    box-shadow: 0 6px 18px rgba(0,0,0,0.15);
  }

  .url {
    font-size: 20px;
    font-weight: 600;
    color: #1d2a33;
    letter-spacing: 0.04em;
  }
</style>
</head>
<body>
  <div class="header">
    <div class="brand-logo">
      ${logoSvgLg}
      <span class="brand-name">edvlabs</span>
    </div>
    <div class="tag-pill">Mājaslapas mazajam uzņēmumam</div>
  </div>

  <div class="hero-text">
    <h1>Laba lapa labam<br><em>mazajam uzņēmumam.</em></h1>
    <p class="lede">Atbildiet uz vienkāršiem jautājumiem. Izveidojiet paši vai uzticiet mums.<br>Gatavie faili paliek jums uz visiem laikiem.</p>
  </div>

  <div class="center-stage">
    <div class="sun"></div>
    <div class="arch"></div>

    <div class="mockup-wrapper">
      <div class="badge-top">Gatavs dažu dienu laikā</div>
      <div class="mockup-card">
        <div class="mockup-bar">
          <div class="dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
          <span class="bar-title">edvlabs.com/lv</span>
        </div>
        <div class="mockup-content">
          <img class="preview-img" src="${cobaltImg}" alt="Amatnieku studijas mājaslapa">
          <div class="mockup-footer">
            <span class="mockup-desc">Paraugs: Amatnieku un pakalpojumu studija</span>
            <span class="mockup-meta">200+ gatavu bloku</span>
          </div>
        </div>
      </div>
      <div class="badge-bottom">100% jūsu īpašumā</div>
    </div>
  </div>

  <div class="bottom-area">
    <div class="chips">
      <span class="chip chip-teal">Cenas no €39</span>
      <span class="chip">Faili pieder jums</span>
      <span class="chip">Bez programmēšanas</span>
    </div>

    <div class="actions">
      <div class="btn">Sākt savu lapu →</div>
      <span class="url">edvlabs.com/lv</span>
    </div>
  </div>
</body>
</html>`;
}

async function renderImage(browser, html, width, height, outFile) {
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 1
  });
  const tmp = path.join(OUT_DIR, `.tmp-${path.basename(outFile)}.html`);
  fs.writeFileSync(tmp, html, 'utf8');
  await page.goto('file://' + tmp, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  await page.screenshot({ path: outFile, type: 'png' });
  try { fs.unlinkSync(tmp); } catch (e) {}
  console.log(`Rendered ${path.relative(process.cwd(), outFile)}: ${fs.statSync(outFile).size} bytes`);
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await launchBrowser();
  try {
    await renderImage(
      browser,
      getHtmlLandscapeTeal(),
      1200,
      628,
      path.join(OUT_DIR, 'edvlabs-google-ads-landscape-1200x628.png')
    );

    await renderImage(
      browser,
      getHtmlSquareTeal(),
      1200,
      1200,
      path.join(OUT_DIR, 'edvlabs-google-ads-square-1200x1200.png')
    );

    await renderImage(
      browser,
      getHtmlLandscapePaper(),
      1200,
      628,
      path.join(OUT_DIR, 'edvlabs-google-ads-landscape-paper-1200x628.png')
    );

    await renderImage(
      browser,
      getHtmlSquarePaper(),
      1200,
      1200,
      path.join(OUT_DIR, 'edvlabs-google-ads-square-paper-1200x1200.png')
    );
  } finally {
    await browser.close();
  }
})();

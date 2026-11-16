#!/usr/bin/env node
/**
 * Personalised design previews for one client.
 *   node scripts/preview/make-preview.js [--brief file.json] [--host <label from the CRM> --reply-to <owner e-mail> --phone --email --address --city --services 'a;b' --accent '#rrggbb' --logo f --photos f1,f2 --lang lv] --company "SIA Example" --token <hex> --templates stay-sunnycamp,build-norrland
 * Writes previews/<token>/<slug>/ (index.html, style.css, script.js, thumb.webp), swaps the template's brand (meta.json title)
 * for the company name, adds noindex, and copies the /assets/library files the pages use to previews/assets/library/ once.
 * Also keeps previews/_hosts.json ({"<name>-<random>": "<token>"}): the Worker serves previews/<token>/ at https://<name>-<random>--pv.edvlabs.com/ (docs/superpowers/plans/2026-11-16-previews-subdomain-worker.md).
 * The brief, photos and logo are kept in previews-src/<token>/ (git-ignored, not deployed): --rebuild <token> or --rebuild all builds them again.
 * A rebuild keeps the client's address; other clients' folders and addresses are never touched. Deploy: npx wrangler deploy -c wrangler.previews.jsonc (owner's go-ahead first).
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { strings, translate } = require('./extract-strings.js');

const ROOT = path.join(__dirname, '..', '..');
const PF_PALETTE = fs.readFileSync(path.join(__dirname, 'form-palette.browser.js'), 'utf8').replace(/^\/\*[\s\S]*?\*\/\s*/, ''); // the browser part of the form's colour choice, inlined into every page
const SLUG = /^[a-z0-9][a-z0-9-]{0,79}$/;

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const re = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Brand swap in a page: the brand as typed and as HTML-escaped, any letter case, longest form first. */
function swapBrand(html, brand, company) {
  const forms = [...new Set([].concat(brand).flatMap(x => [x, esc(x)]))].sort((a, b) => b.length - a.length);
  return html.replace(new RegExp('(?<![A-Za-z])(?:' + forms.map(re).join('|') + ')(?![A-Za-z])', 'gi'), esc(company));
}

/** Logo elements (class xx-logo) hold split text such as <i>&amp;</i>; show the company name instead, keeping a leading inline svg mark. */
function swapLogos(html, company) {
  const fit = Math.max(0.5, Math.min(1, 14 / company.length)); // a long name shrinks (zoom) instead of wrapping over the page
  const style = ' style="white-space:nowrap' + (fit < 1 ? ';zoom:' + fit.toFixed(2) : '') + '"'; // zoom, not font-size: an em would be relative to the parent, not to the logo's own size
  return html.replace(/(<(a|b|span|div)\b)([^>]*class="[^"]*\b[a-z]{2}-logo\b[^"]*"[^>]*>)([\s\S]*?)(<\/\2>)/g, (m, o1, tag, o2, inner, close) => o1 + style + o2 + ((inner.match(/^\s*<svg[\s\S]*?<\/svg>/) || [''])[0]) + esc(company) + close);
}

const lum = h => { const [r, g, b] = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const WORDS = {
  lv: { contact: 'Kontakti', services: 'Pakalpojumi', hours: 'Darba laiks', phone: 'Tālrunis', email: 'E-pasts', address: 'Adrese', draft: 'Šis ir melnraksts, ko sagatavojām jums. Krāsas, bildes un tekstus pielāgosim.',
    form: { eyebrow: 'Pieraksts', h: 'Sāksim ar īsu sarunu', lead: 'Atbildiet uz diviem jautājumiem un atstājiet tālruni: mēs piezvanīsim un vienosimies par vizīti.', points: ['Bez saistībām', 'Jūs izvēlaties piemērotu laiku', 'Aizņem mazāk par minūti'], q1: 'Kas jūs interesē?', unsure: 'Vēl nezinu, vajag konsultāciju', q2: 'Kad ērtāk runāt?', times: ['Jebkurā laikā', 'No rīta', 'Dienā', 'Vakarā'], q3: 'Kur jums piezvanīt?', name: 'Vārds', phone: 'Tālrunis', consent: 'Piekrītu, ka ar mani sazinās par šo pieteikumu.', send: 'Pieprasīt zvanu', back: 'Atpakaļ', pick: 'Izvēlieties vienu variantu.', bad: 'Ievadiet derīgu tālruni un atzīmējiet piekrišanu.', doneH: 'Paldies, pieprasījums saņemts', ok: 'Šajā melnrakstā pieteikums netiek sūtīts; gatavajā lapā tas nonāks pie jums un jums piezvanīs.' } },
  en: { contact: 'Contact', services: 'Services', hours: 'Hours', phone: 'Phone', email: 'E-mail', address: 'Address', draft: 'A draft prepared for you. Colours, photos and texts will be adapted.',
    form: { eyebrow: 'Booking', h: 'Let us start with a short call', lead: 'Answer two questions and leave your number: we will call you and agree on a visit.', points: ['No obligation', 'You choose a time that suits you', 'Takes less than a minute'], q1: 'What are you interested in?', unsure: 'Not sure yet, I need advice', q2: 'When is best to talk?', times: ['Any time', 'Morning', 'Daytime', 'Evening'], q3: 'Where should we call you?', name: 'Name', phone: 'Phone', consent: 'I agree to be contacted about this request.', send: 'Request a call', back: 'Back', pick: 'Please choose one option.', bad: 'Enter a valid phone number and tick the consent box.', doneH: 'Thank you, request received', ok: 'In this draft the request is not sent; on the finished page it reaches you and you get a call.' } },
};
const one = (v, n, what) => { if (v == null || v === '') return ''; if (typeof v !== 'string' || /[\r\n]/.test(v) || v.length > n) throw new Error(what + ': one line, up to ' + n + ' characters'); return v; };
const IMG = /\.(png|jpe?g|webp|svg)$/i;

/** One neutral section with the client's facts, placed before the footer; scoped by .pv- so it cannot clash with a template. */
function contactSection(b, w, logoSrc) {
  const row = (k, v) => (v ? '<p><b>' + w[k] + '</b> ' + esc(v) + '</p>' : '');
  const sv = b.services.length ? '<h3>' + w.services + '</h3><ul>' + b.services.map(x => '<li>' + esc(x.name) + '</li>').join('') + '</ul>' : '';
  const ac = b.accent || '#333333', fg = lum(ac) > 0.55 ? '#111' : '#fff';
  return '<style>.pv{background:' + ac + ';color:' + fg + ';padding:56px 6vw;font:16px/1.6 system-ui,sans-serif}.pv *{box-sizing:border-box}.pv h2,.pv h3,.pv p,.pv ul{margin:0 0 12px;padding:0}.pv h2{font-size:32px;line-height:1.15}.pv h3{font-size:16px;text-transform:uppercase;letter-spacing:.08em;margin-top:22px}.pv ul{list-style:none;columns:2;max-width:640px}.pv li{padding:2px 0}.pv small{display:block;margin-top:26px;opacity:.75;font-size:13px}.pv img{display:block;max-height:64px;max-width:220px;margin-bottom:18px}@media(max-width:700px){.pv ul{columns:1}}</style>'
    + '<section class="pv">' + (logoSrc ? '<img src="' + logoSrc + '" alt="' + esc(b.company) + '">' : '') + '<h2>' + esc(b.company) + '</h2><h3>' + w.contact + '</h3>'
    + row('phone', b.phone) + row('email', b.email) + row('address', [b.address, b.city].filter(Boolean).join(', ')) + row('hours', b.hours) + sv + '<small>' + w.draft + '</small></section>';
}

/** The booking / call-back form every preview carries (the owner's rule: every site collects and qualifies leads). A short guided request on a dark panel:
 *  what are you interested in (the client's own services) -> when to call -> name + phone + consent. Scoped by .pf-; in a draft nothing is sent and the page says so.
 *  Colours and heading font come from the page it sits on: its script measures the template's own backgrounds (by area) and sets --pf-* (dark brand tone for the panel,
 *  the page's light tone for text, its most visible saturated colour for highlights), each checked for contrast; the values below are only the fallback.
 *  Without JavaScript all steps show at once in the fallback colours. Placed before the footer, after the contact block. */
function leadForm(b, w) {
  const f = w.form, e = esc;
  const hl = lum(b.accent || '#000000') >= 0.3 ? b.accent : '#f2ede4', hlfg = lum(hl) > 0.55 ? '#111' : '#fff'; // fallback: the accent must show on the dark panel, else a warm light tone
  const chip = (name, v, first) => '<label class="pf-chip"><input type="radio" name="' + name + '" value="' + e(v) + '"' + (first ? ' required' : '') + '><span>' + e(v) + '</span></label>';
  const svc = b.services.slice(0, 8).map(x => x.name).concat(f.unsure);
  const steps = [];
  if (b.services.length) steps.push('<fieldset data-step data-auto><legend tabindex="-1">' + f.q1 + '</legend><div class="pf-chips">' + svc.map((v, i) => chip('what', v, i === 0)).join('') + '</div></fieldset>');
  steps.push('<fieldset data-step data-auto><legend tabindex="-1">' + f.q2 + '</legend><div class="pf-chips">' + f.times.map((v, i) => chip('when', v, i === 0)).join('') + '</div></fieldset>');
  steps.push('<fieldset data-step><legend tabindex="-1">' + f.q3 + '</legend><div class="pf-fields"><input name="name" autocomplete="name" maxlength="80" placeholder="' + f.name + '" aria-label="' + f.name + '"><input name="phone" type="tel" autocomplete="tel" inputmode="tel" maxlength="30" required placeholder="' + f.phone + '" aria-label="' + f.phone + '"></div>'
    + '<label class="pf-ck"><input type="checkbox" name="consent" required><span>' + f.consent + '</span></label><button type="submit" class="pf-go">' + f.send + '</button></fieldset>');
  const bar = steps.map(() => '<i></i>').join('');
  const mix = (n) => 'color-mix(in srgb,var(--pf-fg) ' + n + '%,transparent)'; // borders and tints from the panel's own text tone, not plain white
  const css = '.pf{--pf-bg:#0f1113;--pf-fg:#f4f1ea;--pf-hl:' + hl + ';--pf-on:' + hlfg + ';--pf-d:inherit;background:var(--pf-bg);color:var(--pf-fg);padding:clamp(56px,9vw,120px) 6vw;font:inherit;font-size:16px;line-height:1.55;border-top:1px solid ' + mix(12) + '}.pf *{box-sizing:border-box}' // the line keeps the form apart when the band above has the same colour
    + '.pf-in{max-width:1080px;margin:0 auto;display:grid;gap:40px 72px;align-items:center}@media(min-width:900px){.pf-in{grid-template-columns:1fr 1fr}}'
    + '.pf-eye{margin:0 0 18px;font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:var(--pf-hl)}.pf h2{margin:0 0 18px;font-family:var(--pf-d);font-size:clamp(32px,4.4vw,58px);line-height:1.05;font-weight:400;letter-spacing:-.01em;color:var(--pf-fg)}.pf-lead{margin:0 0 26px;max-width:34em;opacity:.8}'
    + '.pf ul{list-style:none;margin:0;padding:0;display:grid;gap:10px}.pf li{display:flex;gap:12px;align-items:center;font-size:15px}.pf li svg{flex:none;width:18px;height:18px}.pf li circle{fill:var(--pf-hl)}.pf li path{fill:none;stroke:var(--pf-on);stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}'
    + '.pf-card{position:relative;padding:clamp(22px,3.4vw,38px);border:1px solid ' + mix(16) + ';border-radius:22px;background:var(--pf-card,linear-gradient(160deg,' + mix(8) + ',' + mix(2) + '));box-shadow:var(--pf-sh,0 30px 80px rgb(0 0 0/.3))}'
    + '.pf-bar{display:flex;gap:6px;margin:0 0 26px}.pf-bar i{flex:1;height:3px;border-radius:3px;background:' + mix(18) + ';transition:background .3s}.pf-bar i.on{background:var(--pf-hl)}'
    + '.pf fieldset{border:0;margin:0;padding:0;min-width:0;display:grid;gap:18px}.pf fieldset[hidden]{display:none}.pf legend{padding:0;margin:0 0 18px;font-family:var(--pf-d);font-size:clamp(21px,2.3vw,27px);line-height:1.2;color:var(--pf-fg);outline:0}'
    + '.pf-chips{display:flex;flex-wrap:wrap;gap:10px}.pf-chip{position:relative;cursor:pointer}.pf-chip input{position:absolute;opacity:0;inset:0;width:100%;height:100%;margin:0;cursor:pointer}'
    + '.pf-chip span{display:block;padding:12px 18px;border:1px solid ' + mix(30) + ';border-radius:99px;transition:background .2s,color .2s,border-color .2s}.pf-chip:hover span{border-color:var(--pf-hl)}'
    + '.pf-chip input:checked+span{background:var(--pf-hl);color:var(--pf-on);border-color:var(--pf-hl)}.pf-chip input:focus-visible+span,.pf-fields input:focus-visible,.pf-go:focus-visible,.pf-back:focus-visible,.pf-ck input:focus-visible{outline:2px solid var(--pf-fg);outline-offset:3px}'
    + '.pf-fields{display:grid;gap:12px}.pf-fields input{width:100%;font:inherit;color:var(--pf-fg);padding:15px 16px;border:1px solid ' + mix(26) + ';border-radius:12px;background:' + mix(6) + '}.pf-fields input::placeholder{color:var(--pf-fg);opacity:.55}.pf-fields input:focus{border-color:var(--pf-hl)}'
    + '.pf-ck{display:flex;gap:12px;align-items:flex-start;font-size:14px;opacity:.88;cursor:pointer}.pf-ck input{margin-top:3px;width:18px;height:18px;accent-color:var(--pf-hl)}'
    + '.pf-go{font:inherit;font-weight:600;padding:15px 24px;border:0;border-radius:99px;background:var(--pf-hl);color:var(--pf-on);cursor:pointer;transition:transform .2s,box-shadow .2s}.pf-go:hover{transform:translateY(-1px);box-shadow:0 10px 26px rgb(0 0 0/.3)}'
    + '.pf-back{font:inherit;font-size:14px;margin-top:20px;padding:6px 0;border:0;background:none;color:var(--pf-fg);opacity:.75;cursor:pointer;text-decoration:underline;text-underline-offset:3px}.pf-back[hidden]{display:none}'
    + '.pf [role=status]{min-height:1.5em;margin:14px 0 0;font-size:14px;font-weight:600;color:var(--pf-fg)}'
    + '.pf-done{display:none;text-align:left}.pf-done.on{display:block;animation:pf-in .5s ease both}.pf-done h3{margin:14px 0 10px;font-family:var(--pf-d);font-size:28px;font-weight:400;color:var(--pf-fg)}.pf-done p{margin:0 0 10px;opacity:.85}.pf-sum{font-weight:600;opacity:1!important;color:var(--pf-hl)}.pf-done svg{width:54px;height:54px}.pf-done circle,.pf-done path{fill:none;stroke:var(--pf-hl);stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:140;stroke-dashoffset:140;animation:pf-draw .8s .15s ease forwards}'
    + '.pf fieldset:not([hidden]){animation:pf-in .4s ease both}@keyframes pf-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}@keyframes pf-draw{to{stroke-dashoffset:0}}@media(prefers-reduced-motion:reduce){.pf *{animation:none!important;transition:none!important}.pf-done circle,.pf-done path{stroke-dashoffset:0}}';
  const script = String.raw`(function(){var s=document.currentScript.parentNode,f=s.querySelector("form"),st=[].slice.call(f.querySelectorAll("[data-step]")),bar=[].slice.call(s.querySelectorAll(".pf-bar i")),m=s.querySelector("[role=status]"),back=s.querySelector(".pf-back"),done=s.querySelector(".pf-done"),i=0,T=null;`
    // colours from the template, chosen by colour-harmony rules (scripts/preview/form-palette.browser.js); without a valid combination the neutral fallback stays
    + PF_PALETTE + String.raw`function pal(){var R=pfPick(s),k=R.combos[0],Lb=R.lib,css=function(c){return"rgb("+c.join(",")+")"},set=function(n,v){s.style.setProperty(n,v)};`
    // the contact block the preview adds above the form (older templates) takes its colour by the same rules, between the band above it and the form; then the form is picked again next to it
    + String.raw`var pv=Lb.sib(s.previousElementSibling,"previousElementSibling");if(k&&pv&&pv.classList.contains("pv")){var q=pfPick(s,{prev:Lb.edge(Lb.sib(pv.previousElementSibling,"previousElementSibling"),"lastElementChild"),next:k.bg}).combos[0];`
    + String.raw`if(q){pv.style.background=css(q.bg);pv.style.color=css(q.fg);pv.setAttribute("data-pal",q.harmony);k=pfPick(s).combos[0]||k}}if(!k)return;`
    + String.raw`set("--pf-bg",css(k.bg));set("--pf-fg",css(k.fg));set("--pf-hl",css(k.hl));set("--pf-on",css(k.on));if(!k.dark){set("--pf-card","rgb(255 255 255/.6)");set("--pf-sh","0 24px 60px rgb(0 0 0/.08)")}`
    + String.raw`var h=[].filter.call(document.querySelectorAll("h1,h2"),function(x){return!s.contains(x)&&!x.closest(".pv")})[0];if(h)set("--pf-d",getComputedStyle(h).fontFamily);s.setAttribute("data-pal",k.harmony)}`
    + String.raw`if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",pal);else pal();`
    + String.raw`function show(n,focus){i=n;st.forEach(function(x,k){x.hidden=k!==i});bar.forEach(function(b,k){b.className=k<=i?"on":""});back.hidden=i===0;m.textContent="";if(focus)st[i].querySelector("legend").focus()}`
    + String.raw`function val(n){var c=f.querySelector("[name="+n+"]:checked");return c?c.value:""}`
    + String.raw`f.addEventListener("click",function(e){if(e.target.type==="radio"&&i<st.length-1){clearTimeout(T);T=setTimeout(function(){show(i+1,true)},220)}});`
    + String.raw`back.addEventListener("click",function(){clearTimeout(T);show(i-1,true)});`
    + String.raw`f.addEventListener("submit",function(e){e.preventDefault();if(i<st.length-1){var c=st[i].querySelector("input:checked");if(c)show(i+1,true);else m.textContent=` + JSON.stringify(f.pick) + String.raw`;return}`
    + String.raw`var ok=/^\+?\d{6,15}$/.test(f.phone.value.replace(/[\s()-]/g,""))&&f.consent.checked;if(!ok){m.textContent=` + JSON.stringify(f.bad) + String.raw`;return}`
    + String.raw`s.querySelector(".pf-sum").textContent=[val("what"),val("when")].filter(Boolean).join(" · ");f.hidden=true;s.querySelector(".pf-bar").hidden=true;back.hidden=true;done.className="pf-done on";done.querySelector("h3").focus()});show(0,false)})()`;
  return '<style>' + css + '</style><section class="pf" id="pieteikums"><div class="pf-in"><div><p class="pf-eye">' + f.eyebrow + '</p><h2>' + f.h + '</h2><p class="pf-lead">' + f.lead + '</p><ul>' + f.points.map(p => '<li><svg viewBox="0 0 18 18" aria-hidden="true"><circle cx="9" cy="9" r="9"/><path d="M5 9.2l2.6 2.6L13 6.4"/></svg>' + p + '</li>').join('') + '</ul></div>'
    + '<div class="pf-card"><div class="pf-bar" aria-hidden="true">' + bar + '</div><form novalidate>' + steps.join('') + '</form><p role="status" aria-live="polite"></p><button type="button" class="pf-back" hidden>' + f.back + '</button>'
    + '<div class="pf-done"><svg viewBox="0 0 54 54" aria-hidden="true"><circle cx="27" cy="27" r="22"/><path d="M17 28l7 7 13-15"/></svg><h3 tabindex="-1">' + f.doneH + '</h3><p class="pf-sum"></p><p>' + f.ok + '</p></div></div></div>'
    + '<script>' + script + '</script></section>';
}

const SHELL_WORDS = {
  lv: { variant: 'Variants', desktop: 'Dators', phone: 'Telefons', full: 'Atvērt pilnā ekrānā', choose: 'Izvēlos šo variantu', subject: 'Izvēlos variantu', note: 'Melnraksti: krāsas, bildes un tekstus pielāgosim.', view: 'Skats' },
  en: { variant: 'Variant', desktop: 'Desktop', phone: 'Phone', full: 'Open full screen', choose: 'I choose this one', subject: 'I choose variant', note: 'Drafts: colours, photos and texts will be adapted.', view: 'View' },
};

/** previews/<token>/index.html: one link for the client, tabs for the variants, a phone-width switch; no external files. */
function shellPage({ company, slugs, lang, replyTo }) {
  const w = SHELL_WORDS[lang || 'en'], e = esc, js = v => JSON.stringify(v).replace(/</g, '\\u003c'); // company names come from scraped pages: nothing may close the script tag
  const tabs = slugs.map((s, i) => '<button type="button" role="tab" data-i="' + i + '" aria-selected="false">' + w.variant + ' ' + (i + 1) + '</button>').join('');
  const frames = slugs.map((s, i) => '<iframe title="' + e(company) + ' ' + w.variant + ' ' + (i + 1) + '" data-src="' + s + '/index.html" ' + (i ? 'loading="lazy" ' : '') + 'hidden></iframe>').join('');
  const mail = replyTo ? '<a class="pick" id="pick" href="#">' + w.choose + '</a>' : '';
  return '<!doctype html><html lang="' + (lang || 'en') + '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>' + e(company) + '</title>'
    + '<style>*{box-sizing:border-box}html,body{height:100%;margin:0}body{display:flex;flex-direction:column;background:#e9e7e2;font:14px/1.3 system-ui,sans-serif;color:#1c1c1c}'
    + 'header{display:flex;flex-wrap:wrap;align-items:center;gap:10px 16px;padding:10px 16px;background:#fff;border-bottom:1px solid #d6d3cc}header b{font-size:15px}.note{opacity:.65;font-size:12px}'
    + '.g{display:flex;gap:4px;padding:3px;border-radius:99px;background:#efede8}button,.pick,.full{font:inherit;border:0;border-radius:99px;padding:7px 14px;background:transparent;color:inherit;cursor:pointer;text-decoration:none}'
    + 'button[aria-selected=true]{background:#1c1c1c;color:#fff}button:focus-visible,a:focus-visible{outline:2px solid #2a6bd0;outline-offset:2px}.sp{flex:1}.full{border:1px solid #c8c5be}.pick{background:#2a6b46;color:#fff;font-weight:600}'
    + 'main{flex:1;display:flex;justify-content:center;min-height:0;padding:0}iframe{width:100%;height:100%;border:0;background:#fff;transition:width .25s ease,margin .25s ease}'
    + 'main.phone{padding:12px 0}main.phone iframe{width:390px;max-width:100%;border-radius:18px;box-shadow:0 8px 30px rgb(0 0 0 / .25)}@media(prefers-reduced-motion:reduce){iframe{transition:none}}@media(max-width:700px){.view{display:none}}</style></head><body>'
    + '<header><b>' + e(company) + '</b><div class="g" role="tablist" aria-label="' + w.variant + '">' + tabs + '</div><div class="g view" role="group" aria-label="' + w.view + '"><button type="button" data-v="desktop" aria-pressed="true">' + w.desktop + '</button><button type="button" data-v="phone" aria-pressed="false">' + w.phone + '</button></div>'
    + '<span class="sp note">' + w.note + '</span><a class="full" id="full" href="#" target="_blank" rel="noopener">' + w.full + '</a>' + mail + '</header><main id="m">' + frames + '</main>'
    + '<script>(function(){var T=' + js(slugs) + ',R=' + js(replyTo || '') + ',S=' + js(w.subject + ' ') + ',C=' + js(company) + ';'
    + 'var tabs=[].slice.call(document.querySelectorAll("[role=tab]")),fr=[].slice.call(document.querySelectorAll("iframe")),m=document.getElementById("m");'
    + 'function show(i){i=Math.max(0,Math.min(T.length-1,i));tabs.forEach(function(t,k){t.setAttribute("aria-selected",k===i)});fr.forEach(function(f,k){if(k===i&&!f.src)f.src=f.dataset.src;f.hidden=k!==i});'
    + 'document.getElementById("full").href=T[i]+"/index.html";var p=document.getElementById("pick");if(p)p.href="mailto:"+R+"?subject="+encodeURIComponent(S+(i+1)+" - "+C);'
    + 'try{localStorage.setItem("pv-"+location.pathname,i)}catch(e){}history.replaceState(null,"","#"+(i+1))}'
    + 'tabs.forEach(function(t){t.onclick=function(){show(+t.dataset.i)}});'
    + '[].slice.call(document.querySelectorAll("[data-v]")).forEach(function(b){b.onclick=function(){m.classList.toggle("phone",b.dataset.v==="phone");[].slice.call(document.querySelectorAll("[data-v]")).forEach(function(x){x.setAttribute("aria-pressed",x===b)})}});'
    + 'addEventListener("keydown",function(e){if(/^[1-9]$/.test(e.key)&&!e.target.closest("input,textarea"))show(+e.key-1)});'
    + 'var h=parseInt(location.hash.slice(1),10),s;try{s=parseInt(localStorage.getItem("pv-"+location.pathname),10)}catch(e){}show(h?h-1:isNaN(s)?0:s)})()</script></body></html>';
}

/** Native (client-safe) templates: data-slot / data-card / data-need marks are filled from the brief; what the client does not have is removed. */
function fillSlots(html, b, company) {
  const vals = { tagline: b.tagline, about: b.about, phone: b.phone, email: b.email, address: b.address, city: b.city, hours: b.hours };
  const has = k => k === 'services' ? b.services.length > 0 : !!vals[k];
  const svc = (k, n) => { const x = b.services[n - 1]; return x ? (k === 'service' ? x.name : x.text) : ''; };
  // leaf cards and sections first (article/li cards, sections with a need), so removed blocks never reach the slot pass
  html = html.replace(/<(article|li)\b[^>]*\sdata-card="service:(\d+)"[^>]*>[\s\S]*?<\/\1>/g, (m, t, n) => (b.services[n - 1] ? m : ''));
  html = html.replace(/<(section|article|li)\b[^>]*\sdata-need="([\w|]+)"[^>]*>[\s\S]*?<\/\1>/g, (m, t, need) => (need.split('|').every(has) ? m : ''));
  return html.replace(/<(\w+)\b([^>]*?)\sdata-slot="([\w:]+)"([^>]*)>([^<]*)<\/\1>/g, (m, tag, a1, name, a2, inner) => {
    const [k, n] = name.split(':'), v = k === 'service' || k === 'serviceText' ? svc(k, +n) : vals[k];
    if (!v) return /data-fallback="name"/.test(a1 + a2) ? '<' + tag + a1 + a2 + '>' + esc(company) + '</' + tag + '>' : '';
    const attrs = (a1 + a2).replace(/\sdata-href="(tel:|mailto:)"/, (mm, pre) => ' href="' + pre + (pre === 'tel:' ? v.replace(/[^\d+]/g, '') : v) + '"');
    return '<' + tag + attrs + '>' + esc(v) + '</' + tag + '>';
  });
}

/** The client's address label: the one given (the CRM makes it when the designs are chosen), else the same one as on the last build, else <company>-<6 random hex> (the random part keeps the address private). Never contains "--". */
function hostLabel(outDir, token, company, host) {
  const file = path.join(outDir, '_hosts.json');
  let map = {};
  try { map = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { /* first client: no map yet */ }
  if (host) {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(host) || host.length > 63 || host.length < 12) throw new Error('host: lowercase letters, digits and single hyphens, 12-63 characters (company name plus a random part)');
    if (map[host] && map[host] !== token) throw new Error('host: already used by another client');
    for (const k of Object.keys(map)) if (map[k] === token) delete map[k]; // one address per client
    map[host] = token;
  }
  let label = Object.keys(map).find(k => map[k] === token);
  if (!label) {
    const name = company.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30).replace(/-$/, '') || 'client';
    do label = name + '-' + crypto.randomBytes(3).toString('hex'); while (label in map);
    map[label] = token;
  }
  fs.writeFileSync(file, JSON.stringify(map, null, 1));
  return label;
}

function make({ company, token, host, templates, tagline, about, hours, replyTo, phone, email, address, city, services, accent, logo, photos, lang, outDir = path.join(ROOT, 'previews'), root = ROOT, srcDir = outDir === path.join(ROOT, 'previews') ? path.join(ROOT, 'previews-src') : undefined }) {
  if (!company || /[\r\n]/.test(company) || company.length > 120) throw new Error('company: 1-120 characters, one line');
  if (!/^[a-f0-9]{16,64}$/.test(token || '')) throw new Error('token: 16-64 hex characters');
  if (!templates || !templates.length || templates.length > 6) throw new Error('templates: 1-6 slugs');
  if (accent && !/^#[0-9a-f]{6}$/i.test(accent)) throw new Error('accent: #rrggbb');
  if (lang && !WORDS[lang]) throw new Error('lang: lv or en');
  services = (services || []).slice(0, 13).map(x => (typeof x === 'string' ? { name: one(x, 80, 'service') } : { name: one(x && x.name, 80, 'service'), text: one(x && x.text, 200, 'service text') }));
  const b = { tagline: one(tagline, 90, 'tagline'), about: one(about, 400, 'about'), hours: one(hours, 60, 'hours'), company, phone: one(phone, 40, 'phone'), email: one(email, 120, 'email'), address: one(address, 160, 'address'), city: one(city, 80, 'city'), services, accent: accent && accent.toLowerCase() };
  if (replyTo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyTo)) throw new Error('replyTo: an e-mail address');
  const w = WORDS[lang || 'en'];
  const files = [logo, ...(photos || [])].filter(Boolean);
  for (const f of files) if (!IMG.test(f) || !fs.existsSync(f)) throw new Error('image not found or not png/jpg/webp/svg: ' + f);
  const accents = JSON.parse(fs.readFileSync(path.join(__dirname, 'templates.json'), 'utf8'));
  const made = [], notes = [];
  for (const slug of templates) {
    if (!SLUG.test(slug)) throw new Error('bad slug: ' + slug);
    const src = path.join(root, 'features', slug);
    const meta = JSON.parse(fs.readFileSync(path.join(src, 'meta.json'), 'utf8'));
    const dest = path.join(outDir, token, slug);
    fs.mkdirSync(dest, { recursive: true });
    let html = fs.readFileSync(path.join(src, 'index.html'), 'utf8');
    const keys = strings(html), tpl = accents[slug] || {};
    let dict = null;
    if (lang === 'lv' && tpl.lang !== 'lv') {
      const file = path.join(__dirname, 'lv', slug + '.txt');
      const lv = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').replace(/\n$/, '').split('\n') : null; // one translation per line in extraction order
      if (lv && lv.length === keys.length) dict = Object.fromEntries(keys.map((k, i) => [k, lv[i]]));
      else notes.push(slug + (lv ? ': Latvian text out of date (page changed)' : ': no Latvian text yet'));
    }
    const slotsOk = !!tpl.slots && tpl.strings === keys.length;
    if (tpl.slots && !slotsOk) notes.push(slug + ': slots out of date (page changed)');
    if (slotsOk && (tpl.slots.service || []).length > b.services.length) notes.push(slug + ': template shows ' + tpl.slots.service.length + ' services, brief has ' + b.services.length + ' (the rest stay empty; add services or pick another template)');
    if (slotsOk) {
      dict = dict || Object.fromEntries(keys.map(k => [k, k]));
      const single = { tagline: b.tagline, about: b.about, city: b.city, address: b.address, email: b.email, hours: b.hours };
      for (const [kind, idx] of Object.entries(tpl.slots)) idx.forEach((k, i) => {
        const v = kind === 'service' ? (b.services[i] || {}).name : kind === 'serviceText' ? (b.services[i] || {}).text : single[kind];
        // invented facts (prices, hours, other branches) and another business's service copy must not show for a real client
        if (kind === 'blank' || (kind === 'ifHours' && !b.hours) || (!v && ['hours', 'email', 'address', 'city', 'service', 'serviceText'].includes(kind))) dict[keys[k]] = '';
        else if (v && kind !== 'ifHours') dict[keys[k]] = esc(v);
      });
    }
    if (dict) html = translate(html, dict);
    if (tpl.lang === 'lv') html = fillSlots(html, b, company);
    if (lang === 'lv' && dict) html = html.replace('<html lang="en">', '<html lang="lv">');
    html = swapLogos(swapBrand(html, (accents[slug] && accents[slug].names) || meta.title, company), company);
    let logoSrc = '';
    if (logo) { logoSrc = 'logo' + path.extname(logo).toLowerCase(); fs.copyFileSync(logo, path.join(dest, logoSrc)); }
    // Every placeholder picture is replaced from the pool (client's own photos first, then stock); none may stay as an empty gradient.
    let n = 0, left = 0;
    const pool = photos || [];
    html = html.replace(/<img\b[^>]*src="\/assets\/library\/spa-ph-[\w-]+\.svg"[^>]*>/g, tag => {
      if (!pool.length) { left++; return tag; }
      const f = pool[n++ % pool.length], name = 'photos/p' + (((n - 1) % pool.length) + 1) + path.extname(f).toLowerCase();
      fs.mkdirSync(path.join(dest, 'photos'), { recursive: true }); fs.copyFileSync(f, path.join(dest, name));
      return tag.replace(/src="[^"]*"/, 'src="' + name + '"').replace(/alt="[^"]*"/, 'alt="' + esc(company) + '"');
    });
    if (left) notes.push(slug + ': ' + left + ' placeholder pictures remain (no photos given)');
    else if (pool.length && n > pool.length * 2) notes.push(slug + ': ' + n + ' pictures from only ' + pool.length + ' photos: some repeat, add more');
    if (tpl.hide && tpl.hide.length) html = html.replace('</head>', '<style>' + tpl.hide.join(',') + '{display:none!important}</style></head>');
    html = html.replace('<head>', '<head>\n<meta name="robots" content="noindex, nofollow">');
    const sec = tpl.contact === false ? '' : contactSection(slotsOk && tpl.slots.service ? { ...b, services: [] } : b, w, logoSrc);
    const blocks = sec + leadForm(b, w); // the contact block is optional per template, the lead form never is
    const at = /<footer[\s>]/.test(html) ? /<footer[\s>]/ : html.includes('<script src="script.js">') ? '<script src="script.js">' : '</body>';
    html = html.replace(at, m => blocks + m);
    if (!html.includes('id="pieteikums"')) throw new Error(slug + ': nowhere to put the lead form (no footer, script or body end)');
    fs.writeFileSync(path.join(dest, 'index.html'), html);
    let css = fs.readFileSync(path.join(src, 'style.css'), 'utf8');
    // shortcut: fonts that place Latvian macrons badly are listed by hand (found by eye); a glyph audit would find the rest.
    if (lang === 'lv' && tpl.lvFont) css = css.replace(new RegExp('family=' + tpl.lvFont.from + ':[^&")]*'), 'family=' + tpl.lvFont.import).replace(new RegExp('"?' + re(tpl.lvFont.from) + '"?(?=\\s*[,;])', 'g'), '"' + tpl.lvFont.to + '"');
    const from = accents[slug] && accents[slug].accent;
    if (b.accent && from) { if ((lum(from) > 0.5) === (lum(b.accent) > 0.5)) css = css.replace(new RegExp(re(from), 'gi'), b.accent); else notes.push(slug + ': accent kept (light/dark mismatch)'); }
    fs.writeFileSync(path.join(dest, 'style.css'), css);
    if (fs.existsSync(path.join(src, 'script.js'))) fs.copyFileSync(path.join(src, 'script.js'), path.join(dest, 'script.js'));
    const thumb = path.join(root, 'thumbs', slug + '.webp');
    if (fs.existsSync(thumb)) fs.copyFileSync(thumb, path.join(dest, 'thumb.webp'));
    const lib = path.join(outDir, 'assets', 'library');
    for (const m of html.matchAll(/\/assets\/library\/([\w.-]+)/g)) {
      fs.mkdirSync(lib, { recursive: true });
      fs.copyFileSync(path.join(root, 'assets', 'library', m[1]), path.join(lib, m[1]));
    }
    made.push(slug);
  }
  const credits = [];
  for (const f of photos || []) { try { const c = JSON.parse(fs.readFileSync(path.join(path.dirname(f), 'credits.json'), 'utf8')).find(x => x.file === path.basename(f)); if (c) credits.push(c); } catch { /* the client's own photo: no credit file */ } }
  if (credits.length) fs.writeFileSync(path.join(outDir, token, 'credits.json'), JSON.stringify(credits, null, 1)); // stock licence/author record, kept with the client's folder
  fs.writeFileSync(path.join(outDir, token, 'index.html'), shellPage({ company, slugs: made, lang, replyTo }));
  fs.writeFileSync(path.join(outDir, '_headers'), '/*\n  X-Robots-Tag: noindex, nofollow\n');
  made.notes = notes;
  made.host = hostLabel(outDir, token, company, host);
  if (srcDir) saveBrief(srcDir, { company, token, host: made.host, templates: made.slice(), tagline, about, hours, replyTo, phone, email, address, city, services, accent, logo, photos, lang });
  return made;
}

/** Keeps what a client's preview was built from (brief, photos, logo, stock credits) in previews-src/<token>/, git-ignored and never deployed,
    so a template or form change can be rebuilt for every client with one command instead of collecting the facts again. */
function saveBrief(srcDir, brief) {
  const dir = path.join(srcDir, brief.token), files = path.join(dir, 'files');
  fs.mkdirSync(files, { recursive: true });
  const credits = [];
  const keep = (f, name) => {
    const to = path.join(files, name + path.extname(f).toLowerCase());
    if (path.resolve(f) !== path.resolve(to)) fs.copyFileSync(f, to);
    try { const c = JSON.parse(fs.readFileSync(path.join(path.dirname(f), 'credits.json'), 'utf8')).find(x => x.file === path.basename(f)); if (c) credits.push({ ...c, file: path.basename(to) }); } catch { /* the client's own photo */ }
    return path.basename(to);
  };
  const out = { ...brief, logo: brief.logo ? keep(brief.logo, 'logo') : undefined, photos: (brief.photos || []).map((f, i) => keep(f, 'p' + String(i + 1).padStart(2, '0'))) };
  if (credits.length) fs.writeFileSync(path.join(files, 'credits.json'), JSON.stringify(credits, null, 1));
  fs.writeFileSync(path.join(dir, 'brief.json'), JSON.stringify(out, null, 1));
}

/** Builds a client again from previews-src/<token>/brief.json (same address, templates, texts and photos). */
function rebuild(token, { srcDir = path.join(ROOT, 'previews-src'), outDir } = {}) {
  const dir = path.join(srcDir, token), b = JSON.parse(fs.readFileSync(path.join(dir, 'brief.json'), 'utf8')), at = f => path.join(dir, 'files', f);
  return make({ ...b, logo: b.logo ? at(b.logo) : undefined, photos: (b.photos || []).map(at), srcDir, ...(outDir ? { outDir } : {}) });
}

if (require.main === module) {
  const a = process.argv.slice(2), get = k => { const i = a.indexOf('--' + k); return i >= 0 ? a[i + 1] : undefined; };
  try {
    if (get('rebuild')) { // --rebuild <token> | --rebuild all: after a template or form change
      const src = path.join(ROOT, 'previews-src'), tokens = get('rebuild') === 'all' ? fs.readdirSync(src).filter(t => fs.existsSync(path.join(src, t, 'brief.json'))) : [get('rebuild')];
      for (const t of tokens) { const m = rebuild(t); console.log('ok ' + m.length + ' -> https://' + m.host + '--pv.edvlabs.com/' + (m.notes.length ? '\n  ' + m.notes.join('\n  ') : '')); }
      console.log('deploy (owner\'s go-ahead first): npx wrangler deploy -c wrangler.previews.jsonc');
      process.exit(0);
    }
    const brief = get('brief') ? JSON.parse(fs.readFileSync(get('brief'), 'utf8')) : {};
    const list = k => (get(k) || '').split(k === 'services' ? ';' : ',').map(x => x.trim()).filter(Boolean);
    const opt = { ...brief };
    for (const k of ['company', 'token', 'host', 'tagline', 'about', 'hours', 'replyTo', 'phone', 'email', 'address', 'city', 'accent', 'logo', 'lang']) if (get(k)) opt[k] = get(k);
    if (get('reply-to')) opt.replyTo = get('reply-to');
    if (get('templates')) opt.templates = list('templates'); if (get('services')) opt.services = list('services'); if (get('photos')) opt.photos = list('photos');
    const made = make(opt);
    console.log('ok ' + made.length + ' -> previews/' + opt.token + '/' + (made.notes.length ? '\n  ' + made.notes.join('\n  ') : '') + '\n  address: https://' + made.host + '--pv.edvlabs.com/\n  deploy (owner\'s go-ahead first): npx wrangler deploy -c wrangler.previews.jsonc');
  } catch (e) { console.error('error: ' + e.message); process.exit(1); }
}
module.exports = { make, rebuild, swapBrand, hostLabel };

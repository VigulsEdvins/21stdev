#!/usr/bin/env node
/**
 * Renders the scroll-scrubbed "magic hour" clip used by features/magic-hour: a silhouetted figure and car on a
 * ridge while the sun sets, the moon crosses a starry sky and dawn returns. Frames are drawn on a canvas in
 * headless Chromium and encoded with the ffmpeg that Playwright installs, as all-keyframe VP8 (GOP 1) so seeking
 * to any frame is instant, which the scrub needs.
 *   node scripts/media/make-magic-hour.js [--out dir] [--fps 48] [--seconds 6]
 * Writes magic-hour-scrub.webm and magic-hour-poster.jpg into --out (default assets/library, with a content hash in the name).
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { launchBrowser } = require('../lib/browser');

const ROOT = path.resolve(__dirname, '..', '..');
const argv = process.argv.slice(2);
const get = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const W = 540, H = 960;
const FPS = Number(get('fps', 48));
const SECONDS = Number(get('seconds', 4));
const OUT = path.resolve(get('out', path.join(ROOT, 'assets', 'library')));

function findFfmpeg() {
  const base = path.join(os.homedir(), '.cache', 'ms-playwright');
  const dirs = fs.existsSync(base) ? fs.readdirSync(base).filter(d => /^ffmpeg-\d+$/.test(d)).sort().reverse() : [];
  for (const d of dirs) { const f = path.join(base, d, 'ffmpeg-linux'); if (fs.existsSync(f)) return f; }
  throw new Error('No ffmpeg found in the Playwright cache (run: npx playwright-core install chromium ffmpeg)');
}

const PAGE = `<!doctype html><body style="margin:0;background:#000"><canvas id="c" width="${W}" height="${H}"></canvas><script>
const c=document.getElementById('c'),g=c.getContext('2d'),W=${W},H=${H};
const lerp=(a,b,t)=>a+(b-a)*t,clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const hex=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const mix=(a,b,t)=>hex(a).map((v,i)=>Math.round(lerp(v,hex(b)[i],t)));
// sky colour stops (top, horizon) from dusk, through night, to dawn
const KEYS=[[0,'#3b2a5c','#ff8a3d'],[0.16,'#1d1f4a','#c8505a'],[0.34,'#070b24','#1a2150'],[0.58,'#050818','#101a3d'],[0.78,'#1b2a5e','#7a4f7f'],[0.9,'#5a5f9c','#ff9d6a'],[1,'#8e86b8','#ffc98a']];
function sky(t){let i=0;while(i<KEYS.length-2&&t>KEYS[i+1][0])i++;const a=KEYS[i],b=KEYS[i+1],k=clamp((t-a[0])/(b[0]-a[0]));return[mix(a[1],b[1],k),mix(a[2],b[2],k)]}
let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
const STARS=Array.from({length:150},()=>({x:rnd()*W,y:rnd()*H*0.62,r:rnd()*1.3+0.3,p:rnd()*6.28}));
const HORIZON=H*0.72;
function ridge(x){return HORIZON+Math.sin(x*0.012)*10+Math.sin(x*0.031+1)*6+Math.max(0,(x-W*0.55))*0.0 }
window.render=function(t){
  const [top,hor]=sky(t);const gr=g.createLinearGradient(0,0,0,HORIZON);gr.addColorStop(0,'rgb('+top+')');gr.addColorStop(1,'rgb('+hor+')');g.fillStyle=gr;g.fillRect(0,0,W,H);
  // stars fade in and out around midnight
  const night=clamp(Math.sin(clamp((t-0.12)/0.72)*Math.PI)*1.6);
  STARS.forEach(s=>{g.globalAlpha=night*(0.45+0.55*Math.sin(t*40+s.p)*0.5+0.25);g.fillStyle='#fff';g.beginPath();g.arc(s.x,s.y,s.r,0,6.283);g.fill()});g.globalAlpha=1;
  // sun sets on the left, rises again at the right
  function disc(x,y,r,col,glow){const rg=g.createRadialGradient(x,y,r*0.2,x,y,r*glow);rg.addColorStop(0,col);rg.addColorStop(0.18,col);rg.addColorStop(1,'rgba(255,170,90,0)');g.fillStyle=rg;g.beginPath();g.arc(x,y,r*glow,0,6.283);g.fill();g.fillStyle=col;g.beginPath();g.arc(x,y,r,0,6.283);g.fill()}
  const set=clamp(t/0.3);if(set<1)disc(W*0.32,lerp(HORIZON*0.45,HORIZON+40,set*set),34,'#ffe3a8',4.2);
  const rise=clamp((t-0.8)/0.2);if(rise>0)disc(W*0.7,lerp(HORIZON+40,HORIZON*0.5,rise),34,'#fff0c4',4.2);
  // moon crosses the whole sky
  const m=clamp((t-0.25)/0.55);if(m>0&&m<1){const mx=lerp(W*0.12,W*0.88,m),my=HORIZON*0.78-Math.sin(m*Math.PI)*HORIZON*0.55;const rg=g.createRadialGradient(mx,my,6,mx,my,90);rg.addColorStop(0,'rgba(210,225,255,0.35)');rg.addColorStop(1,'rgba(210,225,255,0)');g.fillStyle=rg;g.beginPath();g.arc(mx,my,90,0,6.283);g.fill();g.fillStyle='#e8eeff';g.beginPath();g.arc(mx,my,22,0,6.283);g.fill();g.fillStyle='rgba(60,70,120,0.35)';[[-6,-4,5],[7,5,4],[2,-9,3]].forEach(([dx,dy,r])=>{g.beginPath();g.arc(mx+dx,my+dy,r,0,6.283);g.fill()})}
  // far hills, then the ridge
  g.fillStyle='rgba(8,10,30,0.55)';g.beginPath();g.moveTo(0,H);for(let x=0;x<=W;x+=6)g.lineTo(x,HORIZON-24+Math.sin(x*0.02+2)*16+Math.sin(x*0.007)*14);g.lineTo(W,H);g.fill();
  g.fillStyle='#04050c';g.beginPath();g.moveTo(0,H);for(let x=0;x<=W;x+=4)g.lineTo(x,ridge(x));g.lineTo(W,H);g.fill();
  // car on the ridge
  const cx=W*0.62,cy=ridge(cx);g.fillStyle='#04050c';g.beginPath();g.moveTo(cx-46,cy+2);g.lineTo(cx-44,cy-14);g.quadraticCurveTo(cx-30,cy-17,cx-18,cy-30);g.lineTo(cx+14,cy-30);g.quadraticCurveTo(cx+30,cy-20,cx+46,cy-14);g.lineTo(cx+48,cy+2);g.closePath();g.fill();[[-28],[30]].forEach(([dx])=>{g.beginPath();g.arc(cx+dx,cy+2,9,0,6.283);g.fill()});
  // figure beside it
  const fx=W*0.36,fy=ridge(fx);g.beginPath();g.arc(fx,fy-60,6.5,0,6.283);g.fill();g.fillRect(fx-5,fy-52,10,30);g.beginPath();g.moveTo(fx-5,fy-52);g.lineTo(fx-14,fy-30);g.lineTo(fx-9,fy-28);g.lineTo(fx-2,fy-44);g.fill();g.beginPath();g.moveTo(fx+5,fy-52);g.lineTo(fx+14,fy-34);g.lineTo(fx+9,fy-31);g.lineTo(fx+2,fy-44);g.fill();g.fillRect(fx-5,fy-24,4.5,24);g.fillRect(fx+0.5,fy-24,4.5,24);
  // slight film grain
  const img=g.getImageData(0,0,W,H),d=img.data;let s2=Math.floor(t*1e4)+3;for(let i=0;i<d.length;i+=4){s2=(s2*1103515245+12345)&0x7fffffff;const n=((s2>>16)&3)-1;d[i]+=n;d[i+1]+=n;d[i+2]+=n}g.putImageData(img,0,0);
};render(0);
</script>`;

(async () => {
  const frames = Math.round(FPS * SECONDS);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'magic-hour-'));
  const browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  await page.setContent(PAGE);
  const canvas = await page.$('#c');
  // Playwright's ffmpeg is a trimmed build: it reads JPEG frames from a pipe, not PNG files
  const webm = path.join(tmp, 'scrub.webm');
  const ff = spawn(findFfmpeg(), ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', 'pipe:0',
    '-c:v', 'libvpx', '-g', '1', '-crf', '24', '-b:v', '2M', '-pix_fmt', 'yuv420p', '-an', webm], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => { ff.on('exit', c => (c === 0 ? res() : rej(new Error('ffmpeg exited with ' + c)))); ff.on('error', rej); });
  for (let i = 0; i < frames; i++) {
    await page.evaluate(t => window.render(t), i / (frames - 1));
    const jpg = await canvas.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(jpg)) await new Promise(r => ff.stdin.once('drain', r));
  }
  ff.stdin.end();
  await page.evaluate(() => window.render(0.04));
  const posterBytes = await canvas.screenshot({ type: 'jpeg', quality: 86 });
  await browser.close();

  await done;
  const hash = (b) => crypto.createHash('sha1').update(b).digest('hex').slice(0, 8);
  const videoBytes = fs.readFileSync(webm);
  fs.mkdirSync(OUT, { recursive: true });
  const videoName = `magic-hour-scrub-${hash(videoBytes)}.webm`;
  const posterName = `magic-hour-poster-${hash(posterBytes)}.jpg`;
  fs.writeFileSync(path.join(OUT, videoName), videoBytes);
  fs.writeFileSync(path.join(OUT, posterName), posterBytes);
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`${videoName} (${(videoBytes.length / 1e6).toFixed(1)} MB, ${frames} frames @ ${FPS} fps)\n${posterName} (${(posterBytes.length / 1e3).toFixed(0)} KB)`);
})().catch(e => { console.error(e); process.exit(1); });

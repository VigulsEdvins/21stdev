(function () {
  var gal = document.getElementById("mgGal"), cv = document.getElementById("mgCanvas"), thumbs = document.getElementById("mgThumbs");
  var num = document.getElementById("mgNum"), title = document.getElementById("mgTitle"), timer = document.getElementById("mgTimer");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var SCENES = [
    { n: "Amber Ridge", sky: ["#f9d9b4", "#f1a77a"], sun: [0.7, 0.34, 0.07, "#fff1cf"], ridges: ["#e0a089", "#b97a7c", "#8a5a6e", "#4f3a5a", "#2a2040"], seed: 3 },
    { n: "Night Tide", sky: ["#0a1030", "#2c3a78"], sun: [0.25, 0.22, 0.05, "#e8efff"], stars: true, ridges: ["#26356b", "#1c2857", "#131c40", "#0b1230"], seed: 8 },
    { n: "Pine Fog", sky: ["#dfe8e4", "#a9bfb8"], sun: [0.5, 0.3, 0.05, "#ffffff"], ridges: ["#b4c8c0", "#8ea99f", "#668479", "#44625a", "#2a4540"], seed: 14 },
    { n: "Dune Hour", sky: ["#ffe7b0", "#ff9d6b"], sun: [0.3, 0.45, 0.09, "#fff6dc"], ridges: ["#f1b36d", "#d98852", "#b8643f", "#8a4631"], seed: 21 },
    { n: "Glass Lake", sky: ["#bfe2f2", "#7fb4d6"], sun: [0.78, 0.25, 0.04, "#ffffff"], ridges: ["#6b92b2", "#4f7898", "#34596f", "#1f3e50"], seed: 29 },
    { n: "Rose Valley", sky: ["#3a1d4f", "#d9608d"], sun: [0.55, 0.5, 0.1, "#ffd1c4"], ridges: ["#a24a7b", "#7b3a6d", "#582c5c", "#331a42"], seed: 36 }
  ];
  var TW = 960, TH = 540;

  function rnd(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
  function paint(s, w, h) {
    var c = document.createElement("canvas"); c.width = w; c.height = h; var x = c.getContext("2d"), r = rnd(s.seed * 97 + 5);
    var g = x.createLinearGradient(0, 0, 0, h * 0.8); g.addColorStop(0, s.sky[0]); g.addColorStop(1, s.sky[1]); x.fillStyle = g; x.fillRect(0, 0, w, h);
    if (s.stars) { x.fillStyle = "#fff"; for (var i = 0; i < 90; i++) { x.globalAlpha = r() * 0.8 + 0.2; x.fillRect(r() * w, r() * h * 0.55, 1.6, 1.6); } x.globalAlpha = 1; }
    var sx = s.sun[0] * w, sy = s.sun[1] * h, sr = s.sun[2] * h * 2.2, gg = x.createRadialGradient(sx, sy, 0, sx, sy, sr * 4);
    gg.addColorStop(0, s.sun[3]); gg.addColorStop(0.2, s.sun[3] + "99"); gg.addColorStop(1, s.sun[3] + "00"); x.fillStyle = gg; x.fillRect(0, 0, w, h);
    x.fillStyle = s.sun[3]; x.beginPath(); x.arc(sx, sy, sr * 0.45, 0, 6.283); x.fill();
    s.ridges.forEach(function (col, k) {
      var base = h * (0.5 + k * (0.42 / s.ridges.length)), amp = h * (0.16 - k * 0.018), f1 = r() * 2 + 1.5, f2 = r() * 5 + 4, p1 = r() * 6, p2 = r() * 6;
      x.fillStyle = col; x.beginPath(); x.moveTo(0, h);
      for (var px = 0; px <= w; px += 6) { var t = px / w * 6.283; x.lineTo(px, base - amp * (0.6 + 0.4 * Math.sin(t * f1 + p1)) * 0.6 - amp * 0.3 * Math.sin(t * f2 + p2) - amp * 0.2); }
      x.lineTo(w, h); x.fill();
    });
    return c;
  }
  var art = SCENES.map(function (s) { return paint(s, TW, TH); });

  var gl = cv.getContext("webgl", { antialias: false, alpha: false }), ctx2 = null, prog, uP, uTex = [], tex = [];
  if (!gl) ctx2 = cv.getContext("2d");
  else {
    var VS = "attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;v.y=1.-v.y;gl_Position=vec4(p,0.,1.);}";
    var FS = "precision mediump float;varying vec2 v;uniform sampler2D a,b;uniform float t;uniform float k;" +
      "float h(vec2 p){return fract(sin(dot(p,vec2(41.3,289.1)))*43758.5453);}" +
      "float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}" +
      "float fb(vec2 p){return .55*n(p)+.3*n(p*2.1+3.)+.15*n(p*4.3+7.);}" +
      "void main(){float q=fb(v*vec2(4.,2.5)+k);float e=t*1.3-.15-q;" +
      "vec2 w=vec2(0.,e>0.&&e<.12?e*.08:0.);" +
      "vec4 A=texture2D(a,v+w),B=texture2D(b,v-w);float m=smoothstep(0.,.025,e);" +
      "vec3 c=mix(A.rgb,B.rgb,m);float band=smoothstep(0.,.02,e)*(1.-smoothstep(.02,.1,e));" +
      "c+=vec3(1.,.82,.55)*band*.6*sin(t*3.1416);gl_FragColor=vec4(c,1.);}";
    var mk = function (type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    prog = gl.createProgram(); gl.attachShader(prog, mk(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, mk(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { gl = null; ctx2 = null; }
    else {
      gl.useProgram(prog);
      var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      var loc = gl.getAttribLocation(prog, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      art.forEach(function (c, i) {
        var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); tex.push(t);
      });
      gl.uniform1i(gl.getUniformLocation(prog, "a"), 0); gl.uniform1i(gl.getUniformLocation(prog, "b"), 1);
      uP = gl.getUniformLocation(prog, "t");
    }
  }
  var cur = 0, from = 0, prog01 = 1, anim = 0, seed = 0;
  function render(a, b, t) {
    if (gl) {
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex[a]); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tex[b]);
      gl.uniform1f(uP, t); gl.uniform1f(gl.getUniformLocation(prog, "k"), seed); gl.viewport(0, 0, cv.width, cv.height); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    } else if (ctx2) { ctx2.globalAlpha = 1; ctx2.drawImage(art[a], 0, 0); ctx2.globalAlpha = t; ctx2.drawImage(art[b], 0, 0); ctx2.globalAlpha = 1; }
  }
  function go(i) {
    i = (i + SCENES.length) % SCENES.length; if (i === cur && prog01 >= 1) return;
    from = cur; cur = i; seed = Math.random() * 40; var t0 = performance.now(), dur = reduce ? 250 : 1400; prog01 = 0; cancelAnimationFrame(anim);
    (function step(now) {
      prog01 = Math.min(1, (now - t0) / dur); var e = prog01 < 0.5 ? 2 * prog01 * prog01 : 1 - Math.pow(-2 * prog01 + 2, 2) / 2;
      render(from, cur, e); if (prog01 < 1) anim = requestAnimationFrame(step);
    })(t0);
    label(); restartTimer();
  }
  function label() {
    num.textContent = String(cur + 1).padStart(2, "0") + " / " + String(SCENES.length).padStart(2, "0"); title.textContent = SCENES[cur].n;
    Array.prototype.forEach.call(thumbs.children, function (b, j) { b.setAttribute("aria-current", j === cur ? "true" : "false"); });
  }
  SCENES.forEach(function (s, i) {
    var b = document.createElement("button"); b.type = "button"; b.setAttribute("aria-label", "Show " + s.n);
    var c = document.createElement("canvas"); c.width = 128; c.height = 72; c.getContext("2d").drawImage(art[i], 0, 0, 128, 72); b.appendChild(c);
    b.addEventListener("click", function () { go(i); }); thumbs.appendChild(b);
  });
  document.getElementById("mgPrev").addEventListener("click", function () { go(cur - 1); });
  document.getElementById("mgNext").addEventListener("click", function () { go(cur + 1); });
  gal.addEventListener("keydown", function (e) { if (e.key === "ArrowLeft") go(cur - 1); else if (e.key === "ArrowRight") go(cur + 1); });
  var sx = null;
  gal.addEventListener("pointerdown", function (e) { sx = e.clientX; });
  gal.addEventListener("pointerup", function (e) { if (sx !== null && Math.abs(e.clientX - sx) > 45) go(cur + (e.clientX < sx ? 1 : -1)); sx = null; });

  // autoplay with a progress bar, paused on hover, focus or when offscreen
  var DELAY = 5500, tStart = 0, paused = false, onscreen = true, tRaf = 0, elapsed = 0;
  function tick(now) {
    if (!paused && onscreen) { elapsed += now - tStart; }
    tStart = now; timer.style.width = Math.min(100, elapsed / DELAY * 100) + "%";
    if (elapsed >= DELAY) { elapsed = 0; go(cur + 1); }
    tRaf = requestAnimationFrame(tick);
  }
  function restartTimer() { elapsed = 0; timer.style.width = "0"; }
  if (!reduce) { tStart = performance.now(); tRaf = requestAnimationFrame(tick); }
  gal.addEventListener("pointerenter", function () { paused = true; }); gal.addEventListener("pointerleave", function () { paused = false; });
  gal.addEventListener("focusin", function () { paused = true; }); gal.addEventListener("focusout", function () { paused = false; });
  if ("IntersectionObserver" in window) new IntersectionObserver(function (en) { onscreen = en[0].isIntersecting; }).observe(gal);
  prog01 = 1; label(); render(0, 0, 1);
})();

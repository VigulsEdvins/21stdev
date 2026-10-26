(function () {
  var stage = document.getElementById("wrStage"), cv = document.getElementById("wrCv");
  var titleEl = document.getElementById("wrTitle"), countEl = document.getElementById("wrCount");
  var TW = 1280, TH = 800;
  var NAMES = ["Dune light", "Night harbour", "Pine ridge", "Glass city"];
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function grad(x, stops, y0, y1) { var g = x.createLinearGradient(0, y0, 0, y1); stops.forEach(function (s, i) { g.addColorStop(i / (stops.length - 1), s); }); return g; }
  function rnd(seed) { var s = seed; return function () { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
  var SCENES = [
    function (x) {
      x.fillStyle = grad(x, ["#ffd08a", "#ff8f6b", "#b04a7a", "#3b2a63"], 0, TH); x.fillRect(0, 0, TW, TH);
      x.fillStyle = "#fff4cf"; x.beginPath(); x.arc(TW * .7, TH * .36, 110, 0, 7); x.fill();
      ["#7a3a6e", "#5a2a5e", "#3a1c4a", "#22102f"].forEach(function (c, i) {
        x.fillStyle = c; x.beginPath(); x.moveTo(0, TH);
        for (var px = 0; px <= TW; px += 20) x.lineTo(px, TH * (.55 + i * .1) + Math.sin(px * .005 + i * 2) * 40 + Math.sin(px * .013 + i) * 14);
        x.lineTo(TW, TH); x.fill();
      });
    },
    function (x) {
      x.fillStyle = grad(x, ["#050b1f", "#12285a", "#2a4a8a"], 0, TH * .6); x.fillRect(0, 0, TW, TH * .6);
      var r = rnd(7); x.fillStyle = "#fff"; for (var i = 0; i < 160; i++) { x.globalAlpha = .3 + r() * .7; x.fillRect(r() * TW, r() * TH * .55, 2, 2); } x.globalAlpha = 1;
      x.fillStyle = "#f4f1dd"; x.beginPath(); x.arc(TW * .25, TH * .22, 56, 0, 7); x.fill();
      x.fillStyle = grad(x, ["#1c3a74", "#08122c"], TH * .6, TH); x.fillRect(0, TH * .6, TW, TH * .4);
      x.fillStyle = "#f4f1dd55"; for (var j = 0; j < 14; j++) x.fillRect(TW * .25 - 40 + r() * 20 - j * 2, TH * .62 + j * 22, 80 - j * 3, 3);
      x.fillStyle = "#050b1f"; [[.62, .6, 90], [.8, .61, 60]].forEach(function (b) { var bx = TW * b[0], by = TH * b[1], w = b[2]; x.beginPath(); x.moveTo(bx - w, by); x.lineTo(bx + w, by); x.lineTo(bx + w * .6, by + 22); x.lineTo(bx - w * .6, by + 22); x.fill(); x.fillRect(bx - 2, by - w * .9, 4, w * .9); x.beginPath(); x.moveTo(bx + 4, by - w * .85); x.lineTo(bx + w * .6, by - 6); x.lineTo(bx + 4, by - 6); x.fill(); });
    },
    function (x) {
      x.fillStyle = grad(x, ["#cfe9d8", "#8cc2a0", "#4c8a6c"], 0, TH); x.fillRect(0, 0, TW, TH);
      var cols = ["#6fae8a", "#3f8062", "#255a45", "#123628"], r = rnd(11);
      cols.forEach(function (c, L) {
        x.fillStyle = c; var base = TH * (.5 + L * .14);
        for (var px = -20; px < TW + 40; px += 34 - L * 5) {
          var h = 90 + L * 40 + r() * 70; x.beginPath(); x.moveTo(px - 26, base + 140); x.lineTo(px, base - h); x.lineTo(px + 26, base + 140); x.fill();
        }
        x.fillRect(0, base + 100, TW, TH);
      });
    },
    function (x) {
      x.fillStyle = grad(x, ["#1b0f3f", "#6a2a8f", "#ff6aa8", "#ffc371"], 0, TH * .75); x.fillRect(0, 0, TW, TH);
      var r = rnd(23), px = 0;
      while (px < TW) { var w = 50 + r() * 90, h = 160 + r() * 360; x.fillStyle = r() > .5 ? "#140a2c" : "#1f1040"; x.fillRect(px, TH - h, w, h);
        x.fillStyle = "#ffd98a"; for (var wy = TH - h + 14; wy < TH - 10; wy += 22) for (var wx = px + 8; wx < px + w - 10; wx += 16) if (r() > .6) x.fillRect(wx, wy, 6, 10);
        px += w + 4 + r() * 8; }
    }
  ];
  var cans = SCENES.map(function (f) { var c = document.createElement("canvas"); c.width = TW; c.height = TH; f(c.getContext("2d")); return c; });

  var idx = 0, nxt = 0, busy = false, prog = 1, ox = .5, oy = .5;
  function label(i) { titleEl.textContent = NAMES[i]; countEl.textContent = "0" + (i + 1) + " / 0" + NAMES.length; }

  var gl = cv.getContext("webgl", { antialias: false, alpha: false });
  var render = null, uploadA = null, uploadB = null;
  if (gl) {
    var VS = "attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;gl_Position=vec4(p,0.,1.);}";
    var FS = ["precision mediump float;varying vec2 v;uniform sampler2D A,B;uniform vec2 uO,uK;uniform float uP,uAsp;",
      "vec2 cover(vec2 u){return (u-.5)*uK+.5;}",
      "void main(){vec2 uv=v;vec2 d=(uv-uO)*vec2(uAsp,1.);float dist=length(d);float R=uP*(uAsp+1.4);",
      "float ring=exp(-pow((dist-R)/.07,2.))*step(.001,uP)*(1.-step(.999,uP));",
      "vec2 dir=normalize(d+1e-5)*vec2(1./uAsp,1.);vec2 off=dir*sin((dist-R)*55.)*ring*.035;",
      "vec3 a=texture2D(A,cover(uv+off)).rgb;vec3 b=texture2D(B,cover(uv+off*.4)).rgb;",
      "float m=smoothstep(R+.012,R-.012,dist);",
      "vec3 c=mix(a,b,m)+ring*.1;gl_FragColor=vec4(c,1.);}"].join("\n");
    var mk = function (t, s) { var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return gl.getShaderParameter(o, gl.COMPILE_STATUS) ? o : null; };
    var vs = mk(gl.VERTEX_SHADER, VS), fs = mk(gl.FRAGMENT_SHADER, FS), pr = gl.createProgram();
    if (vs && fs) {
      gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
      if (gl.getProgramParameter(pr, gl.LINK_STATUS)) {
        gl.useProgram(pr);
        var bf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        var lc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(lc); gl.vertexAttribPointer(lc, 2, gl.FLOAT, false, 0, 0);
        var U = {}; ["A", "B", "uO", "uK", "uP", "uAsp"].forEach(function (k) { U[k] = gl.getUniformLocation(pr, k); });
        var tex = [0, 1].map(function (u) { var t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + u); gl.bindTexture(gl.TEXTURE_2D, t);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t; });
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.uniform1i(U.A, 0); gl.uniform1i(U.B, 1);
        var up = function (u, i) { gl.activeTexture(gl.TEXTURE0 + u); gl.bindTexture(gl.TEXTURE_2D, tex[u]); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, cans[i]); };
        uploadA = function (i) { up(0, i); }; uploadB = function (i) { up(1, i); };
        render = function () {
          var w = cv.width, h = cv.height, asp = w / h, ta = TW / TH;
          gl.uniform2f(U.uK, asp > ta ? 1 : asp / ta, asp > ta ? ta / asp : 1);
          gl.uniform1f(U.uAsp, asp); gl.uniform2f(U.uO, ox, 1 - oy); gl.uniform1f(U.uP, prog); gl.drawArrays(gl.TRIANGLES, 0, 3);
        };
      }
    }
  }
  var ctx2 = null;
  if (!render) { ctx2 = cv.getContext("2d"); render = function () { var i = prog >= .5 ? nxt : idx; var w = cv.width, h = cv.height, s = Math.max(w / TW, h / TH); ctx2.drawImage(cans[i], (w - TW * s) / 2, (h - TH * s) / 2, TW * s, TH * s); }; }

  function size() { var d = Math.min(window.devicePixelRatio || 1, 1.5); cv.width = Math.max(2, Math.round(cv.clientWidth * d)); cv.height = Math.max(2, Math.round(cv.clientHeight * d)); if (gl) gl.viewport(0, 0, cv.width, cv.height); render(); }
  function go(to, x, y) {
    if (busy) return; busy = true; nxt = (to + cans.length) % cans.length; ox = x; oy = y; label(nxt);
    if (uploadA) { uploadA(idx); uploadB(nxt); }
    var t0 = performance.now(), dur = reduce ? 1 : 1500;
    (function step(now) {
      var p = Math.min(1, (now - t0) / dur); prog = reduce ? 1 : 1 - Math.pow(1 - p, 2.2) * 1; prog = Math.min(prog, 1);
      if (p >= 1) { prog = 1; render(); idx = nxt; if (uploadA) { uploadA(idx); prog = 0; render(); } busy = false; return; }
      render(); requestAnimationFrame(step);
    })(t0);
  }
  cv.addEventListener("click", function (e) { var r = cv.getBoundingClientRect(); go(idx + 1, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height); });
  document.getElementById("wrNext").addEventListener("click", function () { go(idx + 1, .5, .5); });
  document.getElementById("wrPrev").addEventListener("click", function () { go(idx - 1, .5, .5); });
  window.addEventListener("resize", size);
  if (uploadA) { uploadA(0); uploadB(0); prog = 0; }
  label(0); size();
})();

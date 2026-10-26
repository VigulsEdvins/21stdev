(function () {
  var frame = document.getElementById("mlFrame"), cv = document.getElementById("mlCanvas");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 1. paint an abstract picture to a 2D canvas, used as the texture
  var tex = document.createElement("canvas"); tex.width = 1024; tex.height = 640;
  (function paint(g, w, h) {
    var bg = g.createLinearGradient(0, 0, w, h); bg.addColorStop(0, "#1d2a6b"); bg.addColorStop(0.5, "#7a3fa8"); bg.addColorStop(1, "#ff8a5c");
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    var seed = 7; function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    for (var i = 0; i < 26; i++) {
      var x = rnd() * w, y = rnd() * h, r = 30 + rnd() * 140;
      var gr = g.createRadialGradient(x, y, 0, x, y, r);
      var hue = Math.round(rnd() * 360);
      gr.addColorStop(0, "hsla(" + hue + ",90%,65%,.85)"); gr.addColorStop(1, "hsla(" + hue + ",90%,55%,0)");
      g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    g.lineWidth = 6;
    for (var k = 0; k < 14; k++) {
      g.strokeStyle = "rgba(255,255,255," + (0.15 + rnd() * 0.3) + ")"; g.beginPath();
      for (var xx = 0; xx <= w; xx += 16) { var yy = h * (k + 1) / 15 + Math.sin(xx / 90 + k) * 30; xx ? g.lineTo(xx, yy) : g.moveTo(xx, yy); }
      g.stroke();
    }
    g.fillStyle = "#101220"; g.beginPath(); g.arc(w * 0.68, h * 0.42, 110, 0, 6.2832); g.fill();
    g.fillStyle = "#ffe9a8"; g.beginPath(); g.arc(w * 0.68, h * 0.42, 70, 0, 6.2832); g.fill();
  })(tex.getContext("2d"), 1024, 640);

  var gl = cv.getContext("webgl", { antialias: false, alpha: false });
  function fallback() { // plain picture if WebGL is unavailable
    var c = cv.getContext("2d"); if (!c) return;
    cv.width = 1024; cv.height = 640; c.drawImage(tex, 0, 0);
  }
  if (!gl) { fallback(); return; }

  var VS = "attribute vec2 a;varying vec2 v;void main(){v=a*.5+.5;gl_Position=vec4(a,0.,1.);}";
  var FS = [
    "precision mediump float;varying vec2 v;uniform sampler2D uTex;uniform vec2 uR;uniform vec2 uM;uniform float uK;uniform float uT;",
    "void main(){",
    " vec2 uv=vec2(v.x,1.-v.y);float asp=uR.x/uR.y;",
    " float G=26.;vec2 g=vec2(G*asp,G);",
    " vec2 p=uv*g;vec2 cell=floor(p);vec2 loc=fract(p)-.5;",
    " vec2 ctr=(cell+.5)/g;",
    " vec2 dm=(ctr-uM)*vec2(asp,1.);float d=length(dm);",
    " float k=exp(-d*d*(9.-uK*3.))*(.55+uK*.45);",
    // inside the lens each cell shows a magnified patch of its own area
    " float mag=1.+k*5.;",
    " vec2 su=mix(uv,ctr+loc/g/mag,smoothstep(0.,.35,k));",
    " vec3 col=texture2D(uTex,su).rgb;",
    " vec3 fl=texture2D(uTex,ctr).rgb;",
    " col=mix(col,fl,smoothstep(.7,.95,k));",
    // grid lines + dots on the nodes
    " float ln=smoothstep(.5,.47,max(abs(loc.x),abs(loc.y)));",
    " col*=mix(1.,.25+.75*ln,k*.9);",
    " vec2 nd=fract(p)-.5;",
    " float dot_=smoothstep(.1+k*.28,.06+k*.28,length(fract(p)-vec2(.0,.0)))+smoothstep(.1+k*.28,.06+k*.28,length(fract(p)-vec2(1.,1.)));",
    " col=mix(col,vec3(1.),clamp(dot_,0.,1.)*k*.8);",
    " col*=1.-.15*smoothstep(.4,1.,length(uv-.5));",
    " gl_FragColor=vec4(col,1.);}"
  ].join("\n");
  function sh(t, s) { var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return gl.getShaderParameter(o, gl.COMPILE_STATUS) ? o : null; }
  var vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) { fallback(); return; }
  var pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { fallback(); return; }
  gl.useProgram(pr);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(pr, "a"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  var U = function (n) { return gl.getUniformLocation(pr, n); };
  var uR = U("uR"), uM = U("uM"), uK = U("uK"), uT = U("uT");

  var m = { x: 0.5, y: 0.5 }, tg = { x: 0.5, y: 0.5 }, k = 0, kt = 0, last = performance.now(), idle = true;
  var visible = true, raf = 0, t0 = performance.now();
  function size() {
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5), r = frame.getBoundingClientRect();
    cv.width = Math.max(2, Math.round(r.width * dpr)); cv.height = Math.max(2, Math.round(r.height * dpr));
    gl.viewport(0, 0, cv.width, cv.height);
  }
  function frameLoop(now) {
    raf = 0; if (!visible) return;
    var sp = Math.hypot(tg.x - m.x, tg.y - m.y);
    m.x += (tg.x - m.x) * 0.16; m.y += (tg.y - m.y) * 0.16;
    kt = idle ? 0 : Math.min(1, 0.4 + sp * 14);
    k += (kt - k) * 0.1;
    gl.uniform2f(uR, cv.width, cv.height); gl.uniform2f(uM, m.x, m.y); gl.uniform1f(uK, k); gl.uniform1f(uT, (now - t0) / 1000);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (sp > 0.0005 || Math.abs(kt - k) > 0.004) raf = requestAnimationFrame(frameLoop);
  }
  function kick() { if (!raf && visible) raf = requestAnimationFrame(frameLoop); }
  function point(e) { var r = cv.getBoundingClientRect(); tg.x = (e.clientX - r.left) / r.width; tg.y = (e.clientY - r.top) / r.height; idle = false; kick(); }
  cv.addEventListener("pointermove", point); cv.addEventListener("pointerdown", point);
  cv.addEventListener("pointerleave", function () { idle = true; kick(); });
  if ("IntersectionObserver" in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; kick(); }).observe(frame);
  window.addEventListener("resize", function () { size(); kick(); });
  size(); kick();
  if (reduce) { /* single static frame: lens off */ }
})();

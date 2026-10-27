(function () {
  var stage = document.getElementById("ibStage"), cv = document.getElementById("ibCv");
  var gl = cv.getContext("webgl", { antialias: false, alpha: false });
  if (!gl) return; // without WebGL the stage keeps its CSS gradient

  var VS = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
  var FS = [
    "precision highp float;",
    "uniform vec2 uRes;uniform float uT;uniform vec2 uM;uniform float uPump;uniform vec2 uLean;uniform vec3 uBg;uniform vec3 uAc;uniform vec3 uInk;",
    "float F(vec2 p){",
    "  float r2=dot(p,p);p-=uLean*.22*exp(-r2*1.2);",
    "  float r=length(p),a=atan(p.y,p.x);",
    "  float R=.5+.12*sin(3.*a+uT*.35)+.07*sin(5.*a-uT*.55+1.)+.04*sin(2.*a+uT*.2);",
    "  float f=r/R+.04*sin(p.x*5.+uT*.5)*sin(p.y*4.-uT*.4);",
    "  vec2 d=p-uM;f-=(.22+.35*uPump)*exp(-dot(d,d)*7.);",
    "  return f;}",
    "void main(){",
    "  vec2 p=(gl_FragCoord.xy-.5*uRes)/uRes.y*2.;",
    "  float f=F(p);float e=.004;",
    "  vec2 g=vec2(F(p+vec2(e,0.))-f,F(p+vec2(0.,e))-f)/e;",
    "  float N=15.;float v=f*N-uT*.6-uPump*1.5*sin(uT*6.);",
    "  float dd=min(fract(v),1.-fract(v));",
    "  float w=(2./uRes.y)*length(g)*N;",
    "  float line=1.-smoothstep(0.,w*1.1+1e-4,dd);",
    "  float glow=exp(-dd*dd/(w*w*3.+1e-4))*.35;",
    "  float t=clamp(p.x*.8+.5+.1*sin(uT*.3),0.,1.);",
    "  vec3 c=mix(uAc,uInk,t*.7);",
    "  float fade=smoothstep(1.45,.95,f);",
    "  vec3 col=mix(uBg,uAc,clamp(exp(-f*3.)*.3,0.,1.));",
    "  float k=clamp((line+glow)*fade*(.6+.5*smoothstep(1.2,0.,f)),0.,1.);",
    "  col=mix(col,c,k);",
    "  gl_FragColor=vec4(col,1.);}"
  ].join("\n");
  function sh(t, s) { var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return gl.getShaderParameter(o, gl.COMPILE_STATUS) ? o : null; }
  var vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS); if (!vs || !fs) return;
  var pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
  gl.useProgram(pr);
  var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  var U = {}; ["uRes", "uT", "uM", "uPump", "uLean", "uBg", "uAc", "uInk"].forEach(function (k) { U[k] = gl.getUniformLocation(pr, k); });

  // the picture uses the theme: background, accent and text colours, read from the stage
  function rgb01(cssVar, fallback) {
    var s = document.createElement("span"); s.style.color = "var(" + cssVar + ")"; stage.appendChild(s);
    var c = getComputedStyle(s).color; stage.removeChild(s);
    var m = c.match(/[\d.]+/g) || [];
    if (m.length < 3) return fallback;
    var k = c.indexOf("color(") === 0 ? 1 : 1 / 255;
    return [m[0] * k, m[1] * k, m[2] * k];
  }
  function setColours() {
    var bg = rgb01("--bg", [.024, .02, .047]), ac = rgb01("--accent", [.5, .35, 1]), ink = rgb01("--text", [.93, .91, 1]);
    gl.uniform3f(U.uBg, bg[0], bg[1], bg[2]); gl.uniform3f(U.uAc, ac[0], ac[1], ac[2]); gl.uniform3f(U.uInk, ink[0], ink[1], ink[2]);
  }
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var mx = 5, my = 5, tx = 5, ty = 5, lx = 0, ly = 0, pump = 0, lastX = 0, lastY = 0, lastT = 0, vis = true, raf = 0, t0 = performance.now();
  function size() {
    var d = Math.min(window.devicePixelRatio || 1, 1.5) * .75;
    var w = Math.max(2, Math.round(cv.clientWidth * d)), h = Math.max(2, Math.round(cv.clientHeight * d));
    cv.width = w; cv.height = h; gl.viewport(0, 0, w, h); gl.uniform2f(U.uRes, w, h); setColours();
  }
  function toField(e) {
    var r = cv.getBoundingClientRect();
    return [((e.clientX - r.left) - r.width / 2) / r.height * 2, -(((e.clientY - r.top) - r.height / 2) / r.height * 2)];
  }
  cv.addEventListener("pointermove", function (e) {
    var q = toField(e), now = performance.now(), dt = Math.max(16, now - lastT);
    var sp = Math.hypot(q[0] - lastX, q[1] - lastY) / dt * 16;
    pump = Math.min(1, pump + sp * 1.5); lastX = q[0]; lastY = q[1]; lastT = now; tx = q[0]; ty = q[1];
  });
  cv.addEventListener("pointerleave", function () { tx = 5; ty = 5; });
  function frame(now) {
    raf = 0; if (!vis) return;
    var s = (now - t0) / 1000;
    mx += (tx - mx) * .15; my += (ty - my) * .15;
    var ox = tx > 4 ? 0 : tx, oy = ty > 4 ? 0 : ty;
    lx += (ox - lx) * .05; ly += (oy - ly) * .05; pump *= .94;
    gl.uniform1f(U.uT, reduce ? 4 : s); gl.uniform2f(U.uM, mx, my); gl.uniform1f(U.uPump, reduce ? 0 : pump); gl.uniform2f(U.uLean, lx, ly);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!reduce) raf = requestAnimationFrame(frame);
  }
  function start() { if (!raf && vis) raf = requestAnimationFrame(frame); }
  size(); start();
  window.addEventListener("resize", function () { size(); if (reduce) frame(performance.now()); });
  if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { vis = es[0].isIntersecting; if (vis) start(); }).observe(stage);
})();

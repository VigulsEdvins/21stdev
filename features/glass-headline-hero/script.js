(function () {
  var hero = document.getElementById("ghHero"), cv = document.getElementById("ghCv"), title = document.getElementById("ghTitle");
  var gl = cv.getContext("webgl", { antialias: false, alpha: false });
  if (!gl) return;

  var VS = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
  var FS = [
    "precision mediump float;",
    "uniform sampler2D uM;uniform sampler2D uH;uniform vec2 uRes;uniform vec2 uL;uniform float uT;",
    "vec3 field(vec2 q){",
    "  q*=vec2(uRes.x/uRes.y,1.)*1.3;",
    "  float a=sin(q.x*2.1+uT*.35)+sin(q.y*2.7-uT*.28)+sin((q.x+q.y)*1.6+uT*.2)+sin(length(q-vec2(1.,.4))*3.-uT*.4);",
    "  a=a*.25+.5;",
    "  vec3 c1=vec3(.14,.2,.78),c2=vec3(.85,.25,.55),c3=vec3(1.,.72,.3);",
    "  vec3 c=mix(c1,c2,smoothstep(.15,.55,a));c=mix(c,c3,smoothstep(.62,.95,a));",
    "  return c*.85+.05;}",
    "void main(){",
    "  vec2 uv=gl_FragCoord.xy/uRes;vec2 tv=vec2(uv.x,1.-uv.y);",
    "  vec2 e=1.6/uRes;",
    "  float hx=texture2D(uH,tv+vec2(e.x,0.)).r-texture2D(uH,tv-vec2(e.x,0.)).r;",
    "  float hy=texture2D(uH,tv+vec2(0.,e.y)).r-texture2D(uH,tv-vec2(0.,e.y)).r;",
    "  vec3 n=normalize(vec3(-hx*7.,hy*7.,1.));",
    "  float m=texture2D(uM,tv).r;",
    "  vec3 bg=field(uv);",
    "  vec2 ld=(uL-uv)*vec2(uRes.x/uRes.y,1.);",
    "  vec3 L=normalize(vec3(ld,.55));",
    "  float sh=texture2D(uM,tv+vec2(-ld.x,ld.y)*.03/vec2(uRes.x/uRes.y,1.)).r;",
    "  bg*=1.-.4*sh*(1.-m);",
    "  vec2 off=n.xy*.09;",
    "  vec3 g=vec3(field(uv+off).r,field(uv+off*1.18).g,field(uv+off*1.36).b);",
    "  float rim=pow(1.-n.z,1.5);",
    "  float spec=pow(max(dot(reflect(-L,n),vec3(0.,0.,1.)),0.),36.);",
    "  float back=pow(max(dot(reflect(L,n),vec3(0.,0.,1.)),0.),20.);",
    "  vec3 glass=g*1.15+vec3(.22)*rim+vec3(spec)*.9+vec3(back)*.25;",
    "  gl_FragColor=vec4(mix(bg,glass,m),1.);}"
  ].join("\n");

  function sh(t, s) { var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return gl.getShaderParameter(o, gl.COMPILE_STATUS) ? o : null; }
  var vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS); if (!vs || !fs) return;
  var pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
  gl.useProgram(pr);
  var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  var U = {}; ["uM", "uH", "uRes", "uL", "uT"].forEach(function (k) { U[k] = gl.getUniformLocation(pr, k); });
  gl.uniform1i(U.uM, 0); gl.uniform1i(U.uH, 1);

  function tex(unit) {
    var t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  var tM = tex(0), tH = tex(1), W = 2, H = 2;

  function drawText(ctx, dx, blur) {
    var hr = hero.getBoundingClientRect(), k = W / hr.width, cs = getComputedStyle(title);
    ctx.font = cs.fontWeight + " " + (parseFloat(cs.fontSize) * k) + "px " + cs.fontFamily;
    ctx.textBaseline = "middle"; ctx.fillStyle = "#fff";
    if (blur) { ctx.shadowColor = "#fff"; ctx.shadowBlur = blur; ctx.shadowOffsetX = 100000; }
    var lines = title.querySelectorAll(".gh-l");
    Array.prototype.forEach.call(lines, function (l) {
      var r = l.getBoundingClientRect();
      ctx.fillText(l.textContent, (r.left - hr.left) * k - (blur ? 100000 : 0) + dx, (r.top - hr.top + r.height * .54) * k);
    });
  }
  function build() {
    var d = Math.min(window.devicePixelRatio || 1, 1.5) * .8;
    W = Math.max(2, Math.round(hero.clientWidth * d)); H = Math.max(2, Math.round(hero.clientHeight * d));
    cv.width = W; cv.height = H; gl.viewport(0, 0, W, H); gl.uniform2f(U.uRes, W, H);
    var c = document.createElement("canvas"); c.width = W; c.height = H; var x = c.getContext("2d");
    x.fillStyle = "#000"; x.fillRect(0, 0, W, H); drawText(x, 0, 0);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tM); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
    x.setTransform(1, 0, 0, 1, 0, 0); x.shadowBlur = 0; x.shadowOffsetX = 0; x.fillStyle = "#000"; x.fillRect(0, 0, W, H);
    drawText(x, 0, Math.max(12, W * .02));
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tH); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
    hero.classList.add("is-gl");
  }

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var lx = .3, ly = .7, tx = .3, ty = .7, idle = 0, vis = true, t0 = performance.now(), raf = 0;
  hero.addEventListener("pointermove", function (e) {
    var r = hero.getBoundingClientRect(); tx = (e.clientX - r.left) / r.width; ty = 1 - (e.clientY - r.top) / r.height; idle = performance.now();
  });
  function frame(now) {
    raf = 0; if (!vis) return;
    var s = (now - t0) / 1000;
    if (now - idle > 2500) { tx = .5 + .35 * Math.sin(s * .5); ty = .55 + .25 * Math.cos(s * .37); }
    lx += (tx - lx) * .06; ly += (ty - ly) * .06;
    gl.uniform2f(U.uL, lx, ly); gl.uniform1f(U.uT, reduce ? 3 : s);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!reduce || !raf) raf = reduce ? 0 : requestAnimationFrame(frame);
  }
  function start() { if (!raf && vis) raf = requestAnimationFrame(frame); }
  function init() { build(); if (reduce) { vis = true; frame(t0 + 3000); } else start(); }
  var rt; window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { build(); if (reduce) frame(t0 + 3000); }, 150); });
  if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { vis = es[0].isIntersecting; if (vis) start(); }).observe(hero);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(init); else init();
})();

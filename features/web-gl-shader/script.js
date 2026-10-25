(function () {
  var stage = document.getElementById("crStage"), cv = document.getElementById("crCanvas"), out = document.getElementById("crReadout");
  var gl = cv.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
  if (!gl) { out.textContent = "WebGL is not available in this browser."; return; }

  var VS = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
  var FS = [
    "precision mediump float;",
    "uniform vec2 uRes;uniform float uT;uniform vec2 uM;uniform float uAmp;",
    "float rings(vec2 uv,vec2 c,float t,float shift){",
    "  float d=length(uv-c);",
    "  float w=sin(d*34.-t*2.4+shift)*exp(-d*1.6);",
    "  float w2=sin((uv.x*5.+uv.y*3.)+t*.5+shift*.5)*.12;",
    "  return w+w2;}",
    "void main(){",
    "  vec2 uv=gl_FragCoord.xy/uRes;uv.x*=uRes.x/uRes.y;",
    "  vec2 c=uM*vec2(uRes.x/uRes.y,1.);",
    "  float s=.012+.03*uAmp;",
    "  float r=rings(uv+vec2(s,0.),c,uT,0.);",
    "  float g=rings(uv,c,uT,.9);",
    "  float b=rings(uv-vec2(s,0.),c,uT,1.8);",
    "  vec3 col=vec3(smoothstep(.2,.95,abs(r)),smoothstep(.2,.95,abs(g)),smoothstep(.2,.95,abs(b)));",
    "  col=pow(col,vec3(1.4))*vec3(1.1,.95,1.25);",
    "  col+=vec3(.02,.025,.05);",
    "  gl_FragColor=vec4(col,1.);}"
  ].join("\n");
  function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; }
  var vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) return;
  var prog = gl.createProgram(); gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  var uRes = gl.getUniformLocation(prog, "uRes"), uT = gl.getUniformLocation(prog, "uT"), uM = gl.getUniformLocation(prog, "uM"), uAmp = gl.getUniformLocation(prog, "uAmp");

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var mx = 0.5, my = 0.5, tx = 0.5, ty = 0.5, amp = 0, visible = true, t0 = performance.now();
  function size() {
    var d = Math.min(window.devicePixelRatio || 1, 1.5), w = Math.max(2, Math.round(cv.clientWidth * d * 0.7)), h = Math.max(2, Math.round(cv.clientHeight * d * 0.7));
    cv.width = w; cv.height = h; gl.viewport(0, 0, w, h); gl.uniform2f(uRes, w, h);
  }
  stage.addEventListener("pointermove", function (e) {
    var r = stage.getBoundingClientRect();
    tx = (e.clientX - r.left) / r.width; ty = 1 - (e.clientY - r.top) / r.height;
  });
  function draw(now) {
    var px = mx, py = my;
    mx += (tx - mx) * 0.08; my += (ty - my) * 0.08;
    amp += (Math.min(1, Math.hypot(mx - px, my - py) * 40) - amp) * 0.1;
    gl.uniform1f(uT, reduce ? 3 : (now - t0) / 1000); gl.uniform2f(uM, mx, my); gl.uniform1f(uAmp, amp);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    out.textContent = "x " + mx.toFixed(2) + " · y " + my.toFixed(2);
  }
  function loop(now) { if (visible) draw(now); requestAnimationFrame(loop); }
  if ("IntersectionObserver" in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }).observe(stage);
  window.addEventListener("resize", function () { size(); draw(performance.now()); });
  size(); draw(performance.now());
  if (!reduce) requestAnimationFrame(loop);
})();

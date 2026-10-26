(function () {
  var stage = document.getElementById("slStage"), cv = document.getElementById("slCv");
  var gl = cv.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
  if (!gl) return;
  var VS = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
  var FS = [
    "#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\nuniform vec2 uRes;uniform float uT;uniform vec2 uM;",
    "float h(vec2 p){return fract(sin(dot(p,vec2(41.3,289.1)))*45758.5);}",
    "float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}",
    "float fbm(vec2 p){float v=0.,a=.55;for(int i=0;i<4;i++){v+=a*n(p);p=p*2.1+vec2(3.1,1.7);a*=.5;}return v;}",
    "void main(){",
    "  vec2 p=gl_FragCoord.xy/uRes.y;",
    "  vec2 g=p*14.;vec2 gf=abs(fract(g)-.5);",
    "  vec2 gm=abs(fract(g/5.)-.5);float major=smoothstep(.485,.5,max(gm.x,gm.y));",
    "  vec2 c=p-vec2(.15,.1);float rr=length(c)*14.;",
    "  float ring=(1.-smoothstep(.0,.03,abs(fract(rr*.5)-.5)-.47))*.6;",
    "  vec3 mat=vec3(.2,.2,.46)+.03*n(p*90.)*vec3(.5,1.,1.);",
    "  float marks=(smoothstep(.485,.5,max(gf.x,gf.y)))*.35+major*.35+ring*.25;",
    "  mat=mix(mat,vec3(.9,.82,.85),clamp(marks,0.,.55));",
    "  float u=dot(p,normalize(vec2(1.,.55)))+uM.x*.05;",
    "  float f=fract(u*4.2-uT*.012);",
    "  float lit=smoothstep(.05,.2,f)*smoothstep(.95,.8,f);",
    "  vec2 q=p*2.4+vec2(uT*.035,sin(uT*.21)*.15)+uM*.18;",
    "  q+=.35*vec2(fbm(q*1.3+uT*.04),fbm(q*1.3+7.-uT*.03));",
    "  float leaf=smoothstep(.5,.66,fbm(q));",
    "  float light=lit*(1.-.75*leaf);",
    "  vec3 warm=vec3(1.,.78,.45);",
    "  vec3 col=mat*(.25+light*1.7)*mix(vec3(.75,.85,1.),warm,light);",
    "  col+=warm*light*.07*(.5+n(p*40.));",
    "  col*=1.-.45*length(p/vec2(uRes.x/uRes.y,1.)-.5);",
    "  gl_FragColor=vec4(col,1.);}"
  ].join("\n");
  function sh(t, s) { var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return gl.getShaderParameter(o, gl.COMPILE_STATUS) ? o : null; }
  var vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS); if (!vs || !fs) return;
  var pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
  gl.useProgram(pr);
  var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var lc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(lc); gl.vertexAttribPointer(lc, 2, gl.FLOAT, false, 0, 0);
  var uRes = gl.getUniformLocation(pr, "uRes"), uT = gl.getUniformLocation(pr, "uT"), uM = gl.getUniformLocation(pr, "uM");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var mx = 0, my = 0, tx = 0, ty = 0, vis = true, raf = 0, t0 = performance.now();
  function size() { var d = Math.min(window.devicePixelRatio || 1, 1.5) * .7; var w = Math.max(2, Math.round(cv.clientWidth * d)), h = Math.max(2, Math.round(cv.clientHeight * d)); cv.width = w; cv.height = h; gl.viewport(0, 0, w, h); gl.uniform2f(uRes, w, h); }
  stage.addEventListener("pointermove", function (e) { var r = stage.getBoundingClientRect(); tx = (e.clientX - r.left) / r.width - .5; ty = .5 - (e.clientY - r.top) / r.height; });
  function frame(now) {
    raf = 0; if (!vis) return;
    mx += (tx - mx) * .04; my += (ty - my) * .04;
    gl.uniform1f(uT, reduce ? 30 : (now - t0) / 1000 + 30); gl.uniform2f(uM, mx, my); gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!reduce) raf = requestAnimationFrame(frame);
  }
  function start() { if (!raf && vis) raf = requestAnimationFrame(frame); }
  size(); start();
  window.addEventListener("resize", function () { size(); if (reduce) frame(performance.now()); });
  if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { vis = es[0].isIntersecting; if (vis) start(); }).observe(stage);
})();

(function () {
  var cv = document.getElementById("gfCanvas"), stage = document.getElementById("gfStage");
  var gl = cv.getContext("webgl", { antialias: false, alpha: false });
  if (!gl) return;
  var VS = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
  var FS = [
    "precision mediump float;uniform vec2 uR;uniform float uT;uniform vec2 uM;",
    "mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}",
    // each pane is a folded half-plane: tent-shaped height along an axis
    "float pane(vec2 p,float ang,float off,float sp){p=rot(ang)*p;float d=p.x-off;return abs(d)*sp;}",
    "void main(){",
    "  vec2 uv=(gl_FragCoord.xy-.5*uR)/uR.y;uv+= (uM-.5)*.12;",
    "  float t=uT*.12;vec3 col=mix(vec3(.04,.06,.14),vec3(.11,.16,.34),uv.y+.5);",
    "  float crease=0.;",
    "  for(int i=0;i<5;i++){float fi=float(i);",
    "    float ang=fi*1.13+t*(.4+.1*fi);float off=sin(t*1.3+fi*2.1)*.45;",
    "    vec2 q=rot(ang)*uv;float d=q.x-off;float w=.012+.004*fi;",
    "    float side=smoothstep(-.01,.01,d);",
    "    vec3 tint=.5+.5*cos(6.28*(vec3(.0,.33,.67)+fi*.17+t*.3));",
    "    col=mix(col,col*.85+tint*.22,side*.55);",
    "    crease+=exp(-abs(d)/w)*(.5+.5*sin(q.y*3.+fi+t*2.));}",
    "  col+=vec3(.55,.7,1.)*crease*.35;",
    "  col+=vec3(.06)*smoothstep(.9,0.,length(uv));",
    "  gl_FragColor=vec4(col,1.);}"
  ].join("\n");
  function sh(t, s) { var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return gl.getShaderParameter(o, gl.COMPILE_STATUS) ? o : null; }
  var vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) return;
  var pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
  gl.useProgram(pr);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  var uR = gl.getUniformLocation(pr, "uR"), uT = gl.getUniformLocation(pr, "uT"), uM = gl.getUniformLocation(pr, "uM");
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches, vis = true, mx = .5, my = .5, tx = .5, ty = .5, t0 = performance.now();
  function size() { var d = Math.min(devicePixelRatio || 1, 1.5); cv.width = Math.max(1, stage.clientWidth * d | 0); cv.height = Math.max(1, stage.clientHeight * d | 0); gl.viewport(0, 0, cv.width, cv.height); }
  size(); addEventListener("resize", size);
  stage.addEventListener("pointermove", function (e) { var r = stage.getBoundingClientRect(); tx = (e.clientX - r.left) / r.width; ty = 1 - (e.clientY - r.top) / r.height; });
  new IntersectionObserver(function (e) { vis = e[0].isIntersecting; if (vis) frame(); }).observe(stage);
  function draw(t) { mx += (tx - mx) * .05; my += (ty - my) * .05; gl.uniform2f(uR, cv.width, cv.height); gl.uniform1f(uT, t); gl.uniform2f(uM, mx, my); gl.drawArrays(gl.TRIANGLES, 0, 3); }
  var raf = 0;
  function frame() { cancelAnimationFrame(raf); if (!vis) return; draw(reduce ? 4 : (performance.now() - t0) / 1000); if (!reduce) raf = requestAnimationFrame(frame); }
  frame();
})();

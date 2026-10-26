(function () {
  var stage = document.getElementById('mmStage');
  var cv = document.getElementById('mmCanvas');
  var gl = cv.getContext('webgl', { antialias: false });
  if (!gl) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  var fs = [
    'precision mediump float;uniform vec2 R;uniform float T;uniform vec2 M;',
    'float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}',
    'float blob(vec2 p,vec2 c,float r){return exp(-dot(p-c,p-c)/(r*r));}',
    'void main(){vec2 fc=gl_FragCoord.xy;vec2 uv=fc/R;float a=R.x/R.y;vec2 p=vec2(uv.x*a,uv.y);',
    ' float t=T*.15;',
    ' vec3 base=vec3(.17,.10,.18);',
    ' vec3 c1=vec3(.98,.80,.60),c2=vec3(.85,.27,.42),c3=vec3(.45,.18,.45),c4=vec3(.99,.55,.40);',
    ' float b1=blob(p,vec2(.1*a+.1*sin(t),.9+.05*cos(t)),.55);',
    ' float b2=blob(p,vec2(.55*a+.12*cos(t*1.3),.5+.1*sin(t*1.1)),.5);',
    ' float b3=blob(p,vec2(.9*a+.08*sin(t*.8),.15+.08*cos(t)),.45);',
    ' float b4=blob(p,vec2(M.x*a,M.y),.28);',
    ' vec3 col=base+c1*b1*1.0+c2*b2*.9+c3*b3*.8+c4*b4*.45;',
    ' col=col/(1.+.25*col);',
    ' col+=(h(fc+floor(T*12.))-.5)*.09;',
    ' gl_FragColor=vec4(col,1.);}'
  ].join('\n');
  function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; }
  var pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
  gl.useProgram(pr);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  var uR = gl.getUniformLocation(pr, 'R'), uT = gl.getUniformLocation(pr, 'T'), uM = gl.getUniformLocation(pr, 'M');
  var dpr = Math.min(window.devicePixelRatio || 1, 1.25), visible = true, raf = 0, t0 = performance.now();
  var mx = .7, my = .6, tx = .7, ty = .6;
  function size() {
    var r = stage.getBoundingClientRect();
    cv.width = Math.max(1, Math.round(r.width * dpr)); cv.height = Math.max(1, Math.round(r.height * dpr));
    gl.viewport(0, 0, cv.width, cv.height);
  }
  function draw(now) {
    raf = 0;
    mx += (tx - mx) * .06; my += (ty - my) * .06;
    gl.uniform2f(uR, cv.width, cv.height); gl.uniform1f(uT, reduce ? 3 : (now - t0) / 1000); gl.uniform2f(uM, mx, my);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (visible && !reduce) raf = requestAnimationFrame(draw);
  }
  function go() { if (!raf) raf = requestAnimationFrame(draw); }
  stage.addEventListener('pointermove', function (e) {
    var r = stage.getBoundingClientRect();
    tx = (e.clientX - r.left) / r.width; ty = 1 - (e.clientY - r.top) / r.height; go();
  });
  window.addEventListener('resize', function () { size(); go(); });
  new IntersectionObserver(function (e) { visible = e[0].isIntersecting; if (visible) go(); }).observe(stage);
  size(); go();
})();

(function () {
  var cv = document.querySelector('[data-lc-canvas]');
  var root = document.querySelector('[data-lc-root]');
  var gl = cv.getContext('webgl');
  if (!gl) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var vs = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
  var fs = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH','precision highp float;','#else','precision mediump float;','#endif',
    'uniform vec2 uRes,uMouse;uniform float uT,uGust,uPush;',
    'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
    'float layer(vec2 p,float sc,float seed,vec2 push){',
    ' vec2 g=p*sc+vec2(seed*7.3,seed*3.1);',
    ' vec2 id=floor(g);float cov=0.;',
    ' for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){',
    '  vec2 c=id+vec2(float(i),float(j));',
    '  float r1=h(c+seed),r2=h(c*1.7+seed+4.),r3=h(c*2.3+seed+9.);',
    '  vec2 ctr=c+vec2(.5)+(vec2(r1,r2)-.5)*.7;',
    '  float sway=sin(uT*.9+r3*6.28)*.18+uGust*sin(uT*7.+r1*6.)*.25;',
    '  vec2 d=g-ctr-push*sc*.6;',
    '  float ang=r3*6.28+sway;float ca=cos(ang),sa=sin(ang);',
    '  vec2 q=vec2(ca*d.x+sa*d.y,-sa*d.x+ca*d.y);',
    '  float len=.32+r2*.18;float wd=.1+r1*.05;',
    '  float t=clamp(q.x/len+.5,0.,1.);',
    '  float prof=wd*sin(t*3.14159)*(1.-.35*t);',
    '  float e=abs(q.y)/max(prof,.0005);',
    '  float leaf=(1.-smoothstep(.8,1.,e))*step(-len*.5,q.x)*step(q.x,len*.5);',
    '  cov=max(cov,leaf*step(.12,h(c+seed*2.)));',
    ' }',
    ' return cov;}',
    'void main(){',
    ' vec2 uv=gl_FragCoord.xy/uRes;vec2 p=(gl_FragCoord.xy-.5*uRes)/uRes.y;',
    ' vec2 m=(uMouse*uRes-.5*uRes)/uRes.y;',
    ' vec2 dm=p-m;float dist=length(dm);',
    ' vec2 push=normalize(dm+.0001)*exp(-dist*dist*9.)*.16*uPush;',
    ' float wave=sin(dist*14.-uT*9.)*exp(-dist*2.)*uGust*.03;push+=normalize(dm+.0001)*wave;',
    ' float c=layer(p,3.2,1.,push)*.9;',
    ' c=max(c,layer(p+.13,4.6,5.,push*.6)*.65);',
    ' c=max(c,layer(p-.21,6.4,9.,push*.3)*.4);',
    ' vec3 wallLit=mix(vec3(.82,.68,.95),vec3(1.,.62,.48),smoothstep(.2,1.4,length(uv-vec2(1.,1.))*-1.+1.4));',
    ' float glow=exp(-length(uv-vec2(.9,.95))*1.8);',
    ' wallLit=mix(wallLit,vec3(1.,.8,.62),glow*.5);',
    ' vec3 shadow=vec3(.23,.11,.32);',
    ' vec3 col=mix(wallLit,shadow,c*.82);',
    ' col+=vec3(1.,.7,.5)*(1.-c)*glow*.08;',
    ' gl_FragColor=vec4(col,1.);}'
  ].join('\n');
  function sh(t, s) { var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o; }
  var pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(pr); gl.useProgram(pr);
  var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var a = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
  var U = {}; ['uRes', 'uMouse', 'uT', 'uGust', 'uPush'].forEach(function (k) { U[k] = gl.getUniformLocation(pr, k); });

  var W, H, mx = 0.5, my = 0.5, sx = 0.5, sy = 0.5, push = 0, gust = 0, run = true, t0 = performance.now();
  function size() { var d = Math.min(1.25, window.devicePixelRatio || 1); W = cv.width = Math.max(1, cv.clientWidth * d); H = cv.height = Math.max(1, cv.clientHeight * d); gl.viewport(0, 0, W, H); }
  window.addEventListener('resize', function () { size(); if (reduce) requestAnimationFrame(frame); }); size();
  root.addEventListener('pointermove', function (e) {
    var r = root.getBoundingClientRect();
    mx = (e.clientX - r.left) / r.width; my = 1 - (e.clientY - r.top) / r.height; push = 1;
  });
  root.addEventListener('pointerleave', function () { push = 0; });
  root.addEventListener('pointerdown', function () { gust = 1; if (reduce) requestAnimationFrame(frame); });

  var pushV = 0;
  function frame(now) {
    if (!run) return;
    sx += (mx - sx) * 0.12; sy += (my - sy) * 0.12; pushV += (push - pushV) * 0.08; gust *= 0.965;
    if (gust < 0.002) gust = 0;
    gl.uniform2f(U.uRes, W, H); gl.uniform2f(U.uMouse, sx, sy);
    gl.uniform1f(U.uT, reduce ? 2 : (now - t0) / 1000);
    gl.uniform1f(U.uGust, reduce ? 0 : gust); gl.uniform1f(U.uPush, pushV);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!reduce) requestAnimationFrame(frame);
  }
  new IntersectionObserver(function (e) {
    var on = e[0].isIntersecting;
    if (on && !run) { run = true; requestAnimationFrame(frame); } else if (!on) run = false;
  }).observe(cv);
  requestAnimationFrame(frame);
})();

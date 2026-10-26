(function () {
  var cv = document.querySelector('[data-dc-canvas]');
  var gl = cv.getContext('webgl', { antialias: false });
  if (!gl) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var vs = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
  var fs = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH','precision highp float;','#else','precision mediump float;','#endif',
    'uniform vec2 uRes;uniform float uT;uniform vec2 uMoon;',
    'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
    'float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);',
    ' return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}',
    'float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return s;}',
    'float bayer(vec2 c){float x0=mod(c.x,2.),y0=mod(c.y,2.),x1=floor(mod(c.x,4.)/2.),y1=floor(mod(c.y,4.)/2.);',
    ' float xr0=abs(x0-y0),xr1=abs(x1-y1);return (8.*xr0+4.*y0+2.*xr1+y1)/16.;}',
    'vec3 pal(float i){',
    ' if(i<.5)return vec3(.051,.063,.188);',
    ' if(i<1.5)return vec3(.145,.17,.4);',
    ' if(i<2.5)return vec3(.33,.3,.6);',
    ' if(i<3.5)return vec3(.62,.5,.72);',
    ' if(i<4.5)return vec3(.96,.74,.62);',
    ' return vec3(1.,.93,.8);}',
    'void main(){',
    ' float cell=max(3.,floor(uRes.y/170.));',
    ' vec2 c=floor(gl_FragCoord.xy/cell);',
    ' vec2 q=c*cell/uRes.y;',
    ' vec2 drift=vec2(uT*.025,0.);',
    ' float d=fbm(q*2.6+drift);',
    ' vec2 toMoon=normalize(uMoon-q+.0001);',
    ' float d2=fbm((q+toMoon*.06)*2.6+drift);',
    ' float cloud=smoothstep(.56,.7,d)*smoothstep(.15,.5,q.y+.2*d);',
    ' float lit=clamp(.5+(d-d2)*9.,0.,1.);',
    ' float level=.1+q.y*.35+cloud*(.18+.5*lit);',
    ' float md=length(q-uMoon);',
    ' level+=smoothstep(.09,.07,md)*(1.-cloud*.6)*1.6+smoothstep(.45,0.,md)*.12;',
    ' float idx=floor(clamp(level,0.,1.)*5.+bayer(c)*.999);',
    ' gl_FragColor=vec4(pal(min(idx,5.)),1.);}'
  ].join('\n');
  function sh(t, s) { var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o; }
  var pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
  gl.useProgram(pr);
  var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var a = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
  var uRes = gl.getUniformLocation(pr, 'uRes'), uT = gl.getUniformLocation(pr, 'uT'), uMoon = gl.getUniformLocation(pr, 'uMoon');
  var W = 1, H = 1, mx = 0.5, my = 0.8, cx = 0.5, cy = 0.8, run = true, t0 = performance.now();
  function size() {
    W = cv.width = Math.max(1, cv.clientWidth); H = cv.height = Math.max(1, cv.clientHeight);
    gl.viewport(0, 0, W, H);
  }
  window.addEventListener('resize', function () { size(); if (reduce) requestAnimationFrame(frame); }); size();
  var root = document.querySelector('[data-dc-root]');
  root.addEventListener('pointermove', function (e) {
    var r = root.getBoundingClientRect();
    mx = (e.clientX - r.left) / r.width; my = 1 - (e.clientY - r.top) / r.height;
  });
  function frame(now) {
    if (!run) return;
    cx += (mx - cx) * 0.04; cy += (my - cy) * 0.04;
    var asp = W / H;
    gl.uniform2f(uRes, W, H);
    gl.uniform1f(uT, reduce ? 4 : (now - t0) / 1000);
    gl.uniform2f(uMoon, asp * (0.5 + cx * 0.4), 0.55 + cy * 0.25);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!reduce) requestAnimationFrame(frame);
  }
  new IntersectionObserver(function (e) {
    var on = e[0].isIntersecting;
    if (on && !run) { run = true; requestAnimationFrame(frame); } else if (!on) run = false;
  }).observe(cv);
  requestAnimationFrame(frame);
})();

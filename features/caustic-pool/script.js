(function () {
  var pool = document.getElementById('cwPool'), cv = document.getElementById('cwCanvas'), drop = document.getElementById('cwDrop');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var gl = cv.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
  if (!gl) return; // CSS gradient stays as the fallback

  var VS = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
  var FS = [
    'precision highp float;',
    'uniform vec2 uR;uniform float uT;uniform vec4 uRip[8];uniform float uNow;',
    // a web of bright lines: three warped plane-wave families whose zero crossings are drawn as thin ridges
    'float net(vec2 p,float t){',
    '  vec2 w=p+0.55*vec2(sin(p.y*1.3+t*0.9),cos(p.x*1.1-t*0.7));',
    '  w+=0.4*vec2(sin(w.y*2.4-t*1.1+1.0),cos(w.x*2.1+t*0.8+2.0));',
    '  w+=0.18*vec2(sin(w.y*4.7+t*1.7),cos(w.x*4.1-t*1.3));',
    '  float a=sin(w.x*2.0+w.y*0.9),b=sin(-w.x*0.9+w.y*2.1+1.3),c=sin(w.x*1.2-w.y*1.8+2.1);',
    '  float l=exp(-abs(a)*7.0)+exp(-abs(b)*7.0)+exp(-abs(c)*7.0);',
    '  return l;}',
    'vec2 rotv(vec2 p,float a){float c=cos(a),s=sin(a);return vec2(c*p.x-s*p.y,s*p.x+c*p.y);}',
    'void main(){',
    '  vec2 p=gl_FragCoord.xy/uR.y;',
    '  float h=0.;vec2 push=vec2(0.);',
    '  for(int i=0;i<8;i++){',
    '    vec4 r=uRip[i];float age=uNow-r.z;',
    '    if(r.w>0.&&age>0.&&age<6.){',
    '      vec2 d=p-r.xy;float L=length(d)+1e-4;float front=age*0.38;',
    '      float env=exp(-abs(L-front)*9.)*exp(-age*0.75)*r.w;',
    '      float wv=sin((L-front)*46.)*env;',
    '      h+=wv;push+=d/L*wv*0.03;}',
    '  }',
    '  vec2 pp=p+push;float t=uT*0.35;',
    '  float n1=net(pp*4.0,t),n2=net(rotv(pp,0.7)*5.3+4.0,t*1.25+3.0);',
    '  float web=pow(n1*0.5,2.4)*1.25+pow(n2*0.5,2.6)*0.6;',
    '  float soft=(n1+n2)*0.035;',
    '  vec2 w0=pp*3.2+vec2(sin(t),cos(t));',
    // pool floor colour: deep blue to turquoise
    '  float depth=0.5+0.5*sin(w0.x*0.7+w0.y*0.5);',
    '  vec3 deep=vec3(0.0,0.20,0.40),shallow=vec3(0.02,0.58,0.68);',
    '  vec3 col=mix(deep,shallow,0.35+0.5*depth+0.15*(p.y/1.0));',
    '  col+=vec3(0.45,0.95,1.0)*web*0.8+vec3(0.55,0.95,1.0)*soft;',
    '  col+=vec3(0.7,1.0,1.0)*max(h,0.)*0.35-vec3(0.0,0.05,0.08)*max(-h,0.)*0.8;',
    '  vec2 c=gl_FragCoord.xy/uR-0.5;col*=1.0-dot(c,c)*0.7;',
    '  gl_FragColor=vec4(col,1.);}'
  ].join('\n');

  function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; }
  var vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) return;
  var pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
  gl.useProgram(pr);
  var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  var uR = gl.getUniformLocation(pr, 'uR'), uT = gl.getUniformLocation(pr, 'uT'), uRip = gl.getUniformLocation(pr, 'uRip'), uNow = gl.getUniformLocation(pr, 'uNow');
  pool.classList.add('cw-gl');

  var rips = new Float32Array(32), ri = 0, t0 = performance.now(), vis = true, raf = 0, lastLive = 0, w = 1, h = 1;
  function now() { return (performance.now() - t0) / 1000; }
  function addRipple(nx, ny, amp) { var o = ri * 4; rips[o] = nx; rips[o + 1] = ny; rips[o + 2] = now(); rips[o + 3] = amp; ri = (ri + 1) % 8; lastLive = now(); kick(); }
  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5) * 0.8, r = cv.getBoundingClientRect();
    w = Math.max(2, Math.round(r.width * dpr)); h = Math.max(2, Math.round(r.height * dpr));
    cv.width = w; cv.height = h; gl.viewport(0, 0, w, h); draw();
  }
  function draw() {
    var t = now();
    gl.uniform2f(uR, w, h); gl.uniform1f(uT, reduce ? 3.0 : t); gl.uniform1f(uNow, t); gl.uniform4fv(uRip, rips);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function loop() { raf = 0; draw(); if (vis && (!reduce || now() - lastLive < 6)) raf = requestAnimationFrame(loop); }
  function kick() { if (!raf && vis) raf = requestAnimationFrame(loop); }

  var down = false, lx = 0, ly = 0;
  function norm(e) { var r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.height, 1 - (e.clientY - r.top) / r.height]; }
  cv.addEventListener('pointerdown', function (e) { down = true; lx = e.clientX; ly = e.clientY; var n = norm(e); addRipple(n[0], n[1], 1.4); });
  cv.addEventListener('pointermove', function (e) {
    if (!down && e.pointerType !== 'mouse') return;
    if (Math.hypot(e.clientX - lx, e.clientY - ly) < (down ? 22 : 46)) return;
    lx = e.clientX; ly = e.clientY; var n = norm(e); addRipple(n[0], n[1], down ? 1.0 : 0.6);
  });
  window.addEventListener('pointerup', function () { down = false; });
  drop.addEventListener('click', function () { var r = cv.getBoundingClientRect(); addRipple((0.25 + Math.random() * 0.5) * r.width / r.height, 0.25 + Math.random() * 0.5, 1.8); });
  window.addEventListener('resize', resize);
  cv.addEventListener('webglcontextlost', function (e) { e.preventDefault(); pool.classList.remove('cw-gl'); });
  new IntersectionObserver(function (es) { vis = es[0].isIntersecting; if (vis) kick(); }).observe(cv);
  resize(); if (!reduce) kick();
  if (!reduce) setTimeout(function () { addRipple(0.5 * (cv.clientWidth / cv.clientHeight), 0.55, 1.5); }, 500);
})();

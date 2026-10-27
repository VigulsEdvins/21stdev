(function () {
  var pane = document.getElementById('fwPane'), cv = document.getElementById('fwCanvas');
  var gl = cv.getContext('webgl', { antialias: false, premultipliedAlpha: false });
  if (!gl) return; // the CSS gradient on the pane is the fallback
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  var fs = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH','precision highp float;','#else','precision mediump float;','#endif',
    'uniform vec2 R;uniform float G;uniform vec3 M;uniform float T;uniform vec3 cA,cB,cC,cW1,cW2,cI;',
    'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
    'float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);',
    ' return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}',
    'float ridge(vec2 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*(1.-abs(2.*n(p)-1.));p=mat2(1.6,1.2,-1.2,1.6)*p;a*=.5;}return s;}',
    // warm out-of-focus lights over a dusk sky; blur widens the discs
    'vec3 scene(vec2 uv,float blur){',
    ' vec3 sky=mix(cA,cB,smoothstep(.3,.9,1.-uv.y));',
    ' sky=mix(sky,cC,smoothstep(.32,.18,uv.y));',
    ' vec2 q=uv*vec2(R.x/R.y,1.)*7.;vec2 id=floor(q);vec2 c=fract(q)-.5;',
    ' float on=step(.4,h(id))*smoothstep(.6,.15,uv.y+.1);',
    ' float rad=.07+.16*h(id+7.)+blur*.08;',
    ' float d=length(c+(vec2(h(id+3.),h(id+5.))-.5)*.28);',
    ' float disc=smoothstep(rad,rad-.04-blur*.3,d)*on;',
    ' vec3 warm=mix(cW1,cW2,h(id+9.));',
    ' return sky+warm*disc*(.45-blur*.2);}',
    'void main(){',
    ' vec2 uv=gl_FragCoord.xy/R;vec2 a=(uv-.5)*vec2(R.x/R.y,1.);',
    ' float edge=1.-smoothstep(0.,.5,min(min(uv.x,1.-uv.x)*R.x/R.y,min(uv.y,1.-uv.y)));',
    ' vec2 w=a*5.+vec2(n(a*3.),n(a*3.+9.))*1.2;',
    ' float r=ridge(w);',
    ' float dm=length((uv-M.xy)*vec2(R.x/R.y,1.));',
    ' float warm=smoothstep(.22,.0,dm)*M.z;',
    ' float reach=G*0.5-warm*1.2;',
    ' float f=smoothstep(.0,.12,r*.8+edge*1.25-1.5+reach);',
    ' f*=1.-warm;',
    ' vec3 clear=scene(uv,0.);vec3 soft=scene(uv,1.);',
    ' vec3 ice=cI*(.4+.6*r);',
    ' vec3 col=mix(clear,mix(soft,ice,.4),f*.9);',
    ' col+=smoothstep(.55,.9,r)*f*.12;',
    ' gl_FragColor=vec4(col,1.);}'
  ].join('\n');

  function sh(t, s) { var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o; }
  var pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
  gl.useProgram(pr);
  var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  var uR = gl.getUniformLocation(pr, 'R'), uG = gl.getUniformLocation(pr, 'G'), uM = gl.getUniformLocation(pr, 'M'), uT = gl.getUniformLocation(pr, 'T');

  
  // the shader follows the page theme: colours are read from the section's computed --bg / --accent / --text
  function rgb(cssVar, fb) {
    var s = document.createElement('span'); s.style.color = 'var(' + cssVar + ')'; pane.appendChild(s);
    var c = getComputedStyle(s).color; pane.removeChild(s);
    var m = c.match(/[\d.]+/g) || [];
    if (m.length < 3) return fb;
    var k = c.indexOf('color(') === 0 ? 1 : 1 / 255;
    return [m[0] * k, m[1] * k, m[2] * k];
  }
  function mixc(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  var uC = {}; ['cA', 'cB', 'cC', 'cW1', 'cW2', 'cI'].forEach(function (k) { uC[k] = gl.getUniformLocation(pr, k); });
  function setColours() {
    var bg = rgb('--bg', [.06, .09, .2]), ac = rgb('--accent', [.9, .6, .3]), tx = rgb('--text', [.9, .95, 1]);
    var v = { cA: bg, cB: mixc(bg, ac, .3), cC: mixc(bg, tx, .06), cW1: ac, cW2: mixc(ac, tx, .45), cI: mixc(mixc(bg, ac, .35), tx, .45) };
    for (var k in v) gl.uniform3f(uC[k], v[k][0], v[k][1], v[k][2]);
  }
  var t0 = performance.now(), mx = 0.5, my = 0.5, heat = 0, visible = true, raf = 0, g = reduce ? 1 : 0;
  function size() {
    var s = Math.min(window.devicePixelRatio || 1, 1.5), w = Math.max(2, Math.round(pane.clientWidth * s)), h = Math.max(2, Math.round(pane.clientHeight * s));
    cv.width = w; cv.height = h; gl.viewport(0, 0, w, h); gl.uniform2f(uR, w, h);
  }
  function frame(now) {
    raf = 0;
    setColours();
    if (!reduce) g = Math.min(1, (now - t0) / 9000);
    heat *= 0.985;
    gl.uniform1f(uG, g * g * (3 - 2 * g)); gl.uniform3f(uM, mx, my, Math.min(1, heat));
    gl.uniform1f(uT, now / 1000);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (visible && !reduce && (g < 1 || heat > 0.01)) raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }
  pane.addEventListener('pointermove', function (e) {
    var r = pane.getBoundingClientRect(); mx = (e.clientX - r.left) / r.width; my = 1 - (e.clientY - r.top) / r.height;
    heat = Math.min(1, heat + 0.12); kick();
  });
  window.addEventListener('resize', function () { size(); if (reduce) requestAnimationFrame(frame); else kick(); });
  new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) kick(); }).observe(pane);
  new MutationObserver(function () { kick(); }).observe(document.documentElement, { attributes: true });
  size(); kick();
})();

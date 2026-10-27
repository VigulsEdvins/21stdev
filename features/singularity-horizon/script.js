(function () {
  var cv = document.querySelector('[data-gw-canvas]');
  var gl = cv.getContext('webgl');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s) { return document.querySelector(s); };
  var el = { st: $('[data-gw-state]'), m: $('[data-gw-mass]'), s: $('[data-gw-spin]'), h: $('[data-gw-heat]'), t: $('[data-gw-tilt]') };
  if (!gl) return;
  var vs = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
  var fs = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH','precision highp float;','#else','precision mediump float;','#endif',
    'uniform vec2 uRes;uniform float uT,uR,uTurb,uTilt,uYaw;',
    'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
    'float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);',
    ' return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}',
    'float fb(vec2 p){return .5*n(p)+.3*n(p*2.1+3.)+.2*n(p*4.3+7.);}',
    'vec3 ramp(float t){return mix(mix(vec3(.35,.04,.32),vec3(.95,.22,.12),smoothstep(0.,.5,t)),vec3(1.,.72,.2),smoothstep(.45,1.,t));}',
    'vec4 disk(vec2 p,float R){',
    ' vec2 q=vec2(p.x,p.y/uTilt);float rd=length(q)/R;float a=atan(q.y,q.x);',
    ' float m=smoothstep(1.35,1.55,rd)*(1.-smoothstep(2.6,3.5,rd));',
    ' float ang=a+uYaw+uT*1.4/(rd*rd+.3);float sw=fb(vec2(cos(ang),sin(ang))*2.+rd*3.)*uTurb+(1.-uTurb)*.6;',
    ' float band=.55+.45*sin(rd*26.-uT*.8+sw*5.);',
    ' float heat=clamp(1.-(rd-1.4)/2.2,0.,1.);',
    ' float dop=1.+.55*(-q.x/length(q));',
    ' return vec4(ramp(heat*dop)*(.7+.5*band),m*clamp(sw*1.4+.25,0.,1.)*clamp(dop,.3,1.4));}',
    'void main(){',
    ' vec2 p=(gl_FragCoord.xy-.5*uRes)/uRes.y;float R=uR;float r=length(p);',
    ' vec3 col=vec3(.925,.937,.957)*(1.-.12*r);',
    ' vec4 d=disk(p,R);',
    ' float back=step(0.,p.y);',
    ' col=mix(col,d.rgb,d.a*back);',
    ' col=mix(col,vec3(0.),1.-smoothstep(R*.985,R*1.005,r));',
    ' float halo=smoothstep(R,R*1.06,r)*(1.-smoothstep(R*1.06,R*2.1,r));',
    ' float up=smoothstep(-.25,.7,p.y/R);',
    ' vec3 hc=ramp(.35+.6*(1.-(r/R-1.)))*.95;',
    ' col=mix(col,hc,halo*(.25+.7*up)*(.6+.4*uTurb));',
    ' col=mix(col,vec3(1.,.55,.2),exp(-pow((r-R*1.01)/(R*.018),2.))*.9);',
    ' col=mix(col,d.rgb,d.a*(1.-back));',
    ' gl_FragColor=vec4(col,1.);}'
  ].join('\n');
  function sh(t, s) { var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o; }
  var pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(pr); gl.useProgram(pr);
  var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var a = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
  var U = {}; ['uRes', 'uT', 'uR', 'uTurb', 'uTilt', 'uYaw'].forEach(function (k) { U[k] = gl.getUniformLocation(pr, k); });

  var states = [
    { name: 'Nominal', turb: 0.35, R: 0.17, mass: 4.3, spin: 0.62, heat: 1.8 },
    { name: 'Turbulent', turb: 1.0, R: 0.19, mass: 4.9, spin: 0.78, heat: 3.4 },
    { name: 'Collapsing', turb: 0.7, R: 0.12, mass: 6.1, spin: 0.94, heat: 5.2 }
  ];
  var cur = { turb: 0.35, R: 0.17, mass: 4.3, spin: 0.62, heat: 1.8 }, si = 0, tilt = 0.42, yaw = 0, W, H, run = true, drag = false, lx = 0, ly = 0, t0 = performance.now(), lastSw = t0;
  function size() { var d = Math.min(1.5, window.devicePixelRatio || 1); W = cv.width = cv.clientWidth * d; H = cv.height = cv.clientHeight * d; gl.viewport(0, 0, W, H); }
  window.addEventListener('resize', function () { size(); if (reduce) requestAnimationFrame(frame); }); size();
  cv.addEventListener('pointerdown', function (e) { drag = true; lx = e.clientX; ly = e.clientY; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', function (e) {
    if (!drag) return;
    tilt = Math.max(0.12, Math.min(0.95, tilt + (e.clientY - ly) * 0.004)); yaw += (e.clientX - lx) * 0.01; lx = e.clientX; ly = e.clientY;
  });
  cv.addEventListener('pointerup', function () { drag = false; });
  cv.addEventListener('pointercancel', function () { drag = false; });

  function frame(now) {
    if (!run) return;
    if (!reduce && now - lastSw > 7000) { lastSw = now; si = (si + 1) % states.length; el.st.textContent = states[si].name; }
    var s = states[si], k = reduce ? 1 : 0.025;
    ['turb', 'R', 'mass', 'spin', 'heat'].forEach(function (p) { cur[p] += (s[p] - cur[p]) * k; });
    el.m.textContent = cur.mass.toFixed(1); el.s.textContent = cur.spin.toFixed(2); el.h.textContent = cur.heat.toFixed(1);
    el.t.textContent = Math.round((1 - tilt) * 70);
    gl.uniform2f(U.uRes, W, H); gl.uniform1f(U.uT, reduce ? 3 : (now - t0) / 1000);
    gl.uniform1f(U.uR, cur.R * (1 + (reduce ? 0 : Math.sin(now / 900) * 0.01))); gl.uniform1f(U.uTurb, cur.turb);
    gl.uniform1f(U.uTilt, tilt); gl.uniform1f(U.uYaw, yaw);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!reduce || drag) requestAnimationFrame(frame);
  }
  if (reduce) { ['pointermove'].forEach(function (ev) { cv.addEventListener(ev, function () { requestAnimationFrame(frame); }); }); }
  new IntersectionObserver(function (e) {
    var on = e[0].isIntersecting;
    if (on && !run) { run = true; requestAnimationFrame(frame); } else if (!on) run = false;
  }).observe(cv);
  requestAnimationFrame(frame);
})();

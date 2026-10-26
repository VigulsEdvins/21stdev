(function () {
  var wrap = document.getElementById('eaWrap'), cv = document.getElementById('eaCanvas');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var gl = cv.getContext('webgl', { antialias: false, alpha: false });
  if (!gl) return; // the CSS fallback stays visible
  var VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  var FS = [
    'precision mediump float;uniform vec2 R;uniform float T;uniform vec2 M;',
    'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
    'float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}',
    'void main(){',
    ' vec2 uv=(gl_FragCoord.xy-.5*R)/R.y; uv.y-=.2; uv+=M*.02;',
    ' vec2 q=vec2(uv.x,uv.y*3.2);',                  // flatten into a tilted disk
    ' float r=length(q);',
    ' float ang=abs(atan(q.y,q.x));',
    ' float rr=r;',
    ' float band=smoothstep(.2,.26,rr)*(1.-smoothstep(.5,.62,rr));',
    ' float lines=.5+.5*sin(rr*260.+n(vec2(ang*3.,rr*8.))*6.-T*.6);',
    ' lines=pow(lines,3.);',
    ' float flow=n(vec2(ang*4.+T*.35*(1./(rr+.2)),rr*14.));',
    ' vec3 col=mix(vec3(.45,.03,.06),vec3(1.,.55,.35),flow)*lines*band*(1.4-rr);',
    ' float ring=exp(-pow((length(uv)-.17)*38.,2.));',    // photon crown
    ' col+=vec3(1.,.7,.55)*ring*.9;',
    ' float arc=exp(-pow((length(vec2(uv.x,(uv.y-.09)*1.1))-.25)*30.,2.))*step(0.,uv.y);', // lensed far side
    ' col+=vec3(.9,.25,.2)*arc*.35;',
    ' col*=1.-smoothstep(.17,.15,length(uv));',           // horizon
    ' col*=.35+.65*smoothstep(1.1,.2,length(uv));',
    ' float g=h(gl_FragCoord.xy+floor(T*24.));',
    ' col+=(g-.5)*.1;',
    ' gl_FragColor=vec4(max(col,0.),1.);}'
  ].join('\n');
  function sh(t, s) { var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return gl.getShaderParameter(o, gl.COMPILE_STATUS) ? o : null; }
  var v = sh(gl.VERTEX_SHADER, VS), f = sh(gl.FRAGMENT_SHADER, FS);
  if (!v || !f) return;
  var pr = gl.createProgram(); gl.attachShader(pr, v); gl.attachShader(pr, f); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
  gl.useProgram(pr);
  var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  var uR = gl.getUniformLocation(pr, 'R'), uT = gl.getUniformLocation(pr, 'T'), uM = gl.getUniformLocation(pr, 'M');
  var mx = 0, my = 0, run = true;
  function size() {
    var s = Math.min(window.devicePixelRatio || 1, 1.5);
    cv.width = Math.max(1, wrap.clientWidth * s | 0); cv.height = Math.max(1, wrap.clientHeight * s | 0);
    gl.viewport(0, 0, cv.width, cv.height);
  }
  function frame(t) {
    gl.uniform2f(uR, cv.width, cv.height); gl.uniform1f(uT, t / 1000); gl.uniform2f(uM, mx, my);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function loop(t) { if (!run) return; frame(t); requestAnimationFrame(loop); }
  size(); window.addEventListener('resize', function () { size(); if (reduce) frame(4000); });
  wrap.addEventListener('pointermove', function (e) { var r = wrap.getBoundingClientRect(); mx = (e.clientX - r.left) / r.width - .5; my = .5 - (e.clientY - r.top) / r.height; });
  if (reduce) { frame(4000); return; }
  new IntersectionObserver(function (es) { var vis = es[0].isIntersecting; if (vis && !run) { run = true; requestAnimationFrame(loop); } else if (!vis) run = false; }).observe(wrap);
  requestAnimationFrame(loop);
})();

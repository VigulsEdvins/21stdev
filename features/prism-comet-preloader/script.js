(function () {
  var stage = document.querySelector('.pm-stage');
  var cv = stage.querySelector('.pm-canvas');
  var pct = stage.querySelector('.pm-pct');
  var nameEl = stage.querySelector('.pm-stage-name');
  var fill = stage.querySelector('.pm-track i');
  var again = stage.querySelector('.pm-replay');
  var names = ['Gathering light', 'Bending the beam', 'Splitting colour', 'Settling'];
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var DUR = reduce ? 900 : 6000, t0 = performance.now(), visible = true, loaded = 0;

  var gl = cv.getContext('webgl', { antialias: false, alpha: false });
  var U = {}, prog;
  var VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  var FS = [
    'precision mediump float;uniform vec2 r;uniform float t,k;',
    // distance to a segment
    'float seg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h);}',
    'vec3 band(float x){return .5+.5*cos(6.2831*(x+vec3(0.,.33,.67)));}',
    'void main(){',
    ' vec2 uv=(gl_FragCoord.xy-.5*r)/min(r.x,r.y);',
    ' vec3 col=vec3(.02,.025,.045);',
    ' float prog=k;',
    // comet head travels from left to centre prism
    ' vec2 head=vec2(mix(-1.3,-.12,smoothstep(0.,.45,prog)),.18*sin(t*.5)*(1.-smoothstep(.3,.5,prog)));',
    ' float hd=length(uv-head);',
    ' col+=vec3(.9,.95,1.)*.012/(hd*hd+.002)*(1.-smoothstep(.5,.6,prog));',
    ' float tail=seg(uv,head-vec2(.9,0.),head);',
    ' col+=vec3(.6,.7,1.)*.004/(tail+.01)*(1.-smoothstep(.5,.6,prog));',
    // prism triangle
    ' vec2 q=uv-vec2(0.,0.);float tri=max(abs(q.x)*.866+q.y*.5,-q.y*1.)-.2;',
    ' col+=vec3(.5,.6,.9)*(.004/(abs(tri)+.004))*smoothstep(.1,.4,prog);',
    // spectrum fan after hit
    ' float fan=smoothstep(.4,.8,prog);',
    ' for(int i=0;i<7;i++){float f=float(i)/6.;float ang=mix(.15,-.45,f)+.04*sin(t+f*6.);',
    '  vec2 d=vec2(cos(ang),sin(ang));vec2 o=vec2(.12,0.);float s=seg(uv,o,o+d*(2.*fan));',
    '  col+=band(f*.8)*(.0035/(s+.004))*exp(-s*7.)*fan*smoothstep(.1,.16,uv.x);}',
    // settle: soft halo
    ' col+=band(prog+length(uv)*.8)*.05*smoothstep(.85,1.,prog)/(length(uv)+.3);',
    ' col*=1.-.4*length(uv*.8);',
    ' gl_FragColor=vec4(pow(col,vec3(.9)),1.);}'
  ].join('\n');

  function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; }
  if (gl) {
    var v = sh(gl.VERTEX_SHADER, VS), f = sh(gl.FRAGMENT_SHADER, FS);
    if (v && f) {
      prog = gl.createProgram(); gl.attachShader(prog, v); gl.attachShader(prog, f); gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) prog = null;
    }
  }
  if (prog) {
    gl.useProgram(prog);
    var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    ['r', 't', 'k'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
  }
  function resize() {
    var d = Math.min(1.5, window.devicePixelRatio || 1);
    cv.width = Math.max(2, Math.round(cv.clientWidth * d)); cv.height = Math.max(2, Math.round(cv.clientHeight * d));
    if (prog) gl.viewport(0, 0, cv.width, cv.height);
  }
  function ui(p) {
    var n = Math.round(p * 100);
    pct.textContent = n; pct.setAttribute('aria-valuenow', n);
    fill.style.width = n + '%';
    nameEl.textContent = n >= 100 ? 'Ready' : names[Math.min(3, Math.floor(p * 4))];
  }
  function frame(now) {
    var p = Math.min(1, (now - t0) / DUR);
    p = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    ui(p);
    if (prog) {
      gl.uniform2f(U.r, cv.width, cv.height); gl.uniform1f(U.t, (now - t0) / 1000); gl.uniform1f(U.k, p);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    if (p < 1 && visible) requestAnimationFrame(frame);
    else if (p >= 1) loaded = 1;
  }
  again.addEventListener('click', function () { t0 = performance.now(); loaded = 0; requestAnimationFrame(frame); });
  if ('IntersectionObserver' in window) new IntersectionObserver(function (e) {
    var was = visible; visible = e[0].isIntersecting;
    if (visible && !was && !loaded) { requestAnimationFrame(frame); }
  }).observe(stage);
  window.addEventListener('resize', function () { resize(); requestAnimationFrame(frame); });
  resize(); requestAnimationFrame(frame);
})();

(function () {
  var track = document.querySelector('[data-nr-track]');
  var cv = document.querySelector('[data-nr-sheet]');
  var cover = document.querySelector('[data-nr-cover]');
  var gl = cv.getContext('webgl', { premultipliedAlpha: true, alpha: true });
  var progress = 0;
  function measure() {
    var span = track.offsetHeight - window.innerHeight;
    return Math.min(1, Math.max(0, -track.getBoundingClientRect().top / span));
  }
  if (!gl) { // fallback: plain fade
    document.documentElement.classList.add('nr-fallback');
    var upd = function () { var p = measure(); cv.style.opacity = 1 - p; cover.style.opacity = 1 - p * 3; };
    window.addEventListener('scroll', upd, { passive: true }); upd();
    return;
  }
  var vs = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
  var fs = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH', 'precision highp float;', '#else', 'precision mediump float;', '#endif',
    'uniform vec2 uRes;uniform float uP;',
    'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
    'float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);',
    ' return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}',
    'float fb(vec2 p){float a=.5,s=0.;for(int i=0;i<6;i++){s+=a*n(p);p=p*2.1+vec2(3.1,1.7);a*=.5;}return s;}',
    'void main(){',
    ' vec2 p=gl_FragCoord.xy/uRes.y;',
    ' float v=fb(p*4.5);',
    ' v+=.08*fb(p*30.);',
    ' float t=mix(-.05,.95,uP);',
    ' float a=smoothstep(t-.012,t+.012,v);',
    ' float edge=smoothstep(t+.07,t+.012,v)*a;',
    ' float fibre=n(p*vec2(160.,18.));',
    ' vec3 paper=mix(vec3(.76,.25,.05),vec3(.9,.38,.1),fb(p*3.));',
    ' paper*=.94+.1*fibre;',
    ' vec3 burn=vec3(.22,.06,.02);',
    ' vec3 col=mix(paper,burn,edge*.85);',
    ' col=mix(col,vec3(1.,.8,.5),smoothstep(t+.1,t+.07,v)*smoothstep(t+.04,t+.07,v)*.6);',
    ' gl_FragColor=vec4(col*a,a);}'
  ].join('\n');
  function sh(t, s) { var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o; }
  var pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(pr); gl.useProgram(pr);
  var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var a = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
  var uRes = gl.getUniformLocation(pr, 'uRes'), uP = gl.getUniformLocation(pr, 'uP');
  var W, H, pending = false;
  function size() { var d = Math.min(1.25, window.devicePixelRatio || 1); W = cv.width = Math.max(1, cv.clientWidth * d); H = cv.height = Math.max(1, cv.clientHeight * d); gl.viewport(0, 0, W, H); draw(); }
  function draw() {
    pending = false; progress = measure();
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(uRes, W, H); gl.uniform1f(uP, progress);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    cover.style.opacity = String(Math.max(0, 1 - progress * 6));
  }
  window.addEventListener('scroll', function () { if (!pending) { pending = true; requestAnimationFrame(draw); } }, { passive: true });
  window.addEventListener('resize', size);
  size();
})();

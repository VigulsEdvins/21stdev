(function () {
  var wall = document.querySelector('.dc-wall');
  var cv = wall.querySelector('.dc-canvas');
  var gl = cv.getContext('webgl', { antialias: false, alpha: false });
  if (!gl) return;
  var VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  var FS = [
    'precision mediump float;',
    'uniform vec2 R;uniform float T;uniform float G;',
    'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
    'float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);',
    ' return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}',
    'float leaves(vec2 uv,float sc,float sp,float sway){',
    ' vec2 q=uv*sc;q+=vec2(sin(T*sp+q.y*.7)*sway,cos(T*sp*.8+q.x*.6)*sway);',
    ' float a=n(q)+.5*n(q*2.1+T*.05);a/=1.5;',
    ' return smoothstep(.52,.66,a);}',
    'void main(){',
    ' vec2 uv=gl_FragCoord.xy/R.y;',
    ' float gust=G*sin(T*3.+uv.x*4.);',
    ' float far=leaves(uv+vec2(7.,3.),3.2,.35,.35+gust*.5);',
    ' float near=leaves(uv,5.5,.55,.5+gust);',
    ' float shade=clamp(far*.6+near*.8,0.,1.);',
    ' vec3 wall=mix(vec3(.96,.84,.64),vec3(.74,.55,.36),uv.y*.5);',
    ' vec3 dark=vec3(.22,.14,.1);',
    ' float pool=smoothstep(1.7,.1,length(uv-vec2(R.x/R.y*.85,.95)));',
    ' vec3 c=mix(dark,wall,1.-shade*.9);',
    ' c=mix(dark*.8,c,.35+.65*pool);',
    ' c+=(h(gl_FragCoord.xy+fract(T)*100.)-.5)*.07;',
    ' gl_FragColor=vec4(c,1.);}'
  ].join('\n');
  function sh(t, s) { var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o; }
  var pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS));
  gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
  gl.useProgram(pr);
  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(pr, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  var uR = gl.getUniformLocation(pr, 'R'), uT = gl.getUniformLocation(pr, 'T'), uG = gl.getUniformLocation(pr, 'G');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var gust = 0, visible = true, raf = 0, t0 = performance.now();
  function size() {
    var d = Math.min(window.devicePixelRatio || 1, 1.5);
    cv.width = Math.max(1, Math.round(wall.clientWidth * d * 0.6));
    cv.height = Math.max(1, Math.round(wall.clientHeight * d * 0.6));
    gl.viewport(0, 0, cv.width, cv.height);
  }
  function draw(now) {
    gust *= 0.96;
    gl.uniform2f(uR, cv.width, cv.height);
    gl.uniform1f(uT, reduce ? 4 : (now - t0) / 1000);
    gl.uniform1f(uG, gust);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function loop(now) { draw(now); raf = requestAnimationFrame(loop); }
  function run() { cancelAnimationFrame(raf); if (reduce) draw(t0); else if (visible) raf = requestAnimationFrame(loop); }
  wall.addEventListener('pointermove', function () { gust = Math.min(1, gust + 0.08); });
  wall.addEventListener('pointerdown', function () { gust = 1; });
  window.addEventListener('resize', function () { size(); run(); });
  new IntersectionObserver(function (e) { visible = e[0].isIntersecting; run(); }).observe(wall);
  size(); run();
})();

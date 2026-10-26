(function () {
  var box = document.querySelector('.ai-field');
  var cv = box.querySelector('.ai-canvas');
  var gl = cv.getContext('webgl', { antialias: false, alpha: false });
  if (!gl) return;
  var VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  var FS = [
    'precision mediump float;',
    'uniform vec2 R;uniform float T;uniform vec2 M;uniform vec3 D[4];',
    'float h(vec2 p){return fract(sin(dot(p,vec2(41.3,289.1)))*9173.7);}',
    'float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);',
    ' return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}',
    'float f(vec2 p){float a=0.,s=.5;for(int i=0;i<4;i++){a+=s*n(p);p=p*2.03+vec2(1.7,9.2);s*=.5;}return a;}',
    'float field(vec2 p){',
    ' vec2 q=vec2(f(p+T*.05),f(p+vec2(5.2,1.3)-T*.04));',
    ' float v=f(p+2.2*q+vec2(0.,T*.03));',
    ' float d=length(p-M);v+=.25*exp(-d*d*6.)*sin(d*18.-T*3.);',
    ' for(int i=0;i<4;i++){float age=D[i].z;if(age>0.){float r=length(p-D[i].xy);v+=.3*exp(-pow((r-age*.9)*8.,2.))*(1.-age);}}',
    ' return v;}',
    'void main(){',
    ' vec2 uv=(gl_FragCoord.xy-.5*R)/R.y;',
    ' vec2 mm=(M-.5*R)/R.y;',
    ' float e=.004;',
    ' float v=field(uv*2.2);',
    ' float dx=field(uv*2.2+vec2(e,0.))-v,dy=field(uv*2.2+vec2(0.,e))-v;',
    ' vec3 nor=normalize(vec3(-dx*40.,-dy*40.,1.));',
    ' vec3 L=normalize(vec3(-.4+.3*sin(T*.2),.5,.8));',
    ' float dif=max(dot(nor,L),0.);',
    ' float spec=pow(max(dot(reflect(-L,nor),vec3(0.,0.,1.)),0.),28.);',
    ' vec3 ink=mix(vec3(.02,.01,.02),vec3(.62,.05,.14),smoothstep(.3,.8,v));',
    ' vec3 c=ink*(.35+.9*dif)+vec3(1.,.55,.6)*spec*.55;',
    ' c*=1.-.8*dot(uv,uv);',
    ' gl_FragColor=vec4(c,1.);}'
  ].join('\n').replace('vec2 mm=(M-.5*R)/R.y;', '');
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
  var uR = gl.getUniformLocation(pr, 'R'), uT = gl.getUniformLocation(pr, 'T'), uM = gl.getUniformLocation(pr, 'M'), uD = gl.getUniformLocation(pr, 'D');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mouse = [0, 0], tgt = [0, 0], drops = [0, 0, 0, 0], di = 0, ages = [0, 0, 0, 0];
  var visible = true, raf = 0, t0 = performance.now(), last = t0;
  function size() {
    var d = Math.min(window.devicePixelRatio || 1, 1.5) * 0.6;
    cv.width = Math.max(1, Math.round(box.clientWidth * d));
    cv.height = Math.max(1, Math.round(box.clientHeight * d));
    gl.viewport(0, 0, cv.width, cv.height);
    mouse = [0.5 * cv.width, 0.5 * cv.height]; tgt = mouse.slice();
  }
  function toField(e) {
    var r = box.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width * cv.width, (1 - (e.clientY - r.top) / r.height) * cv.height];
  }
  function draw(now) {
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    mouse[0] += (tgt[0] - mouse[0]) * 0.1; mouse[1] += (tgt[1] - mouse[1]) * 0.1;
    var H = cv.height, flat = [];
    for (var i = 0; i < 4; i++) {
      ages[i] = ages[i] > 0 ? ages[i] + dt * 0.5 : 0; if (ages[i] > 1) ages[i] = 0;
      flat.push((drops[i * 2] - 0.5 * cv.width) / H * 2.2, (drops[i * 2 + 1] - 0.5 * cv.height) / H * 2.2, ages[i]);
    }
    gl.uniform2f(uR, cv.width, cv.height);
    gl.uniform1f(uT, reduce ? 6 : (now - t0) / 1000);
    gl.uniform2f(uM, (mouse[0] - 0.5 * cv.width) / H * 2.2, (mouse[1] - 0.5 * cv.height) / H * 2.2);
    gl.uniform3fv(uD, new Float32Array(flat));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function loop(now) { draw(now); raf = requestAnimationFrame(loop); }
  function run() { cancelAnimationFrame(raf); last = performance.now(); if (reduce) draw(last); else if (visible) raf = requestAnimationFrame(loop); }
  box.addEventListener('pointermove', function (e) { tgt = toField(e); });
  box.addEventListener('pointerdown', function (e) {
    var p = toField(e); drops[di * 2] = p[0]; drops[di * 2 + 1] = p[1]; ages[di] = 0.001; di = (di + 1) % 4;
    if (reduce) draw(performance.now());
  });
  window.addEventListener('resize', function () { size(); run(); });
  new IntersectionObserver(function (e) { visible = e[0].isIntersecting; run(); }).observe(box);
  size(); run();
})();

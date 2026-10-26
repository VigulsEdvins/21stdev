(function () {
  var cv = document.getElementById('cgCanvas'), stage = document.getElementById('cgStage');
  var num = document.getElementById('cgNum'), bar = document.getElementById('cgBar'), status = document.getElementById('cgStatus'), btn = document.getElementById('cgGo');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, gl = cv.getContext('webgl', { antialias: false }), prog = 0, vis = true;
  var VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  var FS = 'precision mediump float;uniform vec2 r;uniform float t,k;' +
    'vec3 scene(vec2 uv,float t){vec3 c=vec3(0.);for(int i=0;i<4;i++){float fi=float(i);vec2 c0=vec2(.5+.32*sin(t*.5+fi*1.7),.5+.28*cos(t*.43+fi*2.3));float d=length((uv-c0)*vec2(r.x/r.y,1.));vec3 col=.55+.45*cos(6.28*(fi*.27+t*.05+vec3(0.,.33,.67)));c+=col*smoothstep(.34,.0,d);}' +
    'c+=.08*sin(uv.x*30.+t)*sin(uv.y*24.-t);return c;}' +
    'float h(float x){return fract(sin(x*91.3)*43758.5);}' +
    'void main(){vec2 uv=gl_FragCoord.xy/r;vec2 q=uv-.5;float edge=dot(q,q);' +
    'float band=floor(uv.y*14.+floor(t*8.));float g=step(.86,h(band+floor(t*6.)))*k;' +
    'uv.x+=g*(h(band)-.5)*.12;' +
    'float s=(.006+edge*.09)*(.6+k);vec2 dir=normalize(q+.0001);' +
    'vec3 col=vec3(scene(uv+dir*s,t).r,scene(uv,t).g,scene(uv-dir*s,t).b);' +
    'col*=1.-edge*1.3;col+=g*.15;gl_FragColor=vec4(col,1.);}';
  function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; }
  var ok = !!gl, u = {};
  if (ok) {
    var pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
    ok = gl.getProgramParameter(pr, gl.LINK_STATUS);
    if (ok) {
      gl.useProgram(pr); var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      var loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      ['r', 't', 'k'].forEach(function (n) { u[n] = gl.getUniformLocation(pr, n); });
    }
  }
  function size() { var d = Math.min(devicePixelRatio || 1, 1.5); cv.width = cv.clientWidth * d; cv.height = cv.clientHeight * d; if (ok) gl.viewport(0, 0, cv.width, cv.height); }
  var t0 = performance.now(), dur = reduce ? 500 : 4200;
  function frame(now) {
    var el = now - t0; prog = Math.min(1, el / dur);
    var e = 1 - Math.pow(1 - prog, 2);
    num.textContent = String(Math.round(e * 100)).padStart(3, '0'); bar.style.width = e * 100 + '%';
    if (prog >= 1 && btn.disabled) { btn.disabled = false; status.textContent = 'Signal locked'; }
    if (ok) {
      var k = prog >= 1 ? 0.15 : (reduce ? 0 : 1 - e * 0.7);
      gl.uniform2f(u.r, cv.width, cv.height); gl.uniform1f(u.t, reduce ? 3 : el / 1000 + 2); gl.uniform1f(u.k, k); gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    if (vis && !(reduce && prog >= 1)) requestAnimationFrame(frame);
  }
  new IntersectionObserver(function (e) { var v = e[0].isIntersecting; if (v && !vis) { vis = true; requestAnimationFrame(frame); } vis = v; }).observe(stage);
  addEventListener('resize', size); size(); requestAnimationFrame(frame);
  btn.addEventListener('click', function () { status.textContent = 'Welcome in'; btn.textContent = 'Entered'; });
})();

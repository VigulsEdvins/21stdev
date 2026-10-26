(function () {
  var stage = document.getElementById('cgStage'), cv = document.getElementById('cgCanvas');
  var fill = document.getElementById('cgFill'), pct = document.getElementById('cgPct'), st = document.getElementById('cgState');
  var meter = document.getElementById('cgMeter'), go = document.getElementById('cgGo');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var progress = 0, done = false, run = true;
  var gl = cv.getContext('webgl', { antialias: false, alpha: false });
  var uR, uT, uP, draw = function () {};
  if (gl) {
    var VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
    var FS = [
      'precision mediump float;uniform vec2 R;uniform float T;uniform float P;',
      'float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}',
      'void main(){',
      ' vec2 uv=gl_FragCoord.xy/R; vec2 c=uv-.5; c.x*=R.x/R.y;',
      ' float t=T*.25;',
      ' vec3 col=vec3(.05,.04,.03);',
      ' col+=vec3(.55,.3,.1)*exp(-length(c-vec2(sin(t)*.4,cos(t*.8)*.2))*2.6);',   // warm light leak
      ' col+=vec3(.08,.2,.28)*exp(-length(c-vec2(cos(t*.7)*.5,-.2+sin(t*1.1)*.15))*2.2);', // cool leak
      ' col*=1.+.08*sin(T*40.);',                                                   // projector flicker
      ' col=pow(col,vec3(.9))*1.4;',                                                // contrast lift
      ' col*=.9+.1*sin(gl_FragCoord.y*1.6);',                                       // scanlines
      ' col+=(h(gl_FragCoord.xy+floor(T*24.)*7.)-.5)*.16;',                         // grain
      ' col*=smoothstep(1.1,.25,length(uv-.5)*1.5);',                               // vignette
      ' col*=mix(.55,1.,P);',
      ' gl_FragColor=vec4(col,1.);}'
    ].join('\n');
    var mk = function (t, s) { var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return gl.getShaderParameter(o, gl.COMPILE_STATUS) ? o : null; };
    var v = mk(gl.VERTEX_SHADER, VS), f = mk(gl.FRAGMENT_SHADER, FS), pr = gl.createProgram();
    if (v && f) {
      gl.attachShader(pr, v); gl.attachShader(pr, f); gl.linkProgram(pr);
      if (gl.getProgramParameter(pr, gl.LINK_STATUS)) {
        gl.useProgram(pr);
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        var l = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 2, gl.FLOAT, false, 0, 0);
        uR = gl.getUniformLocation(pr, 'R'); uT = gl.getUniformLocation(pr, 'T'); uP = gl.getUniformLocation(pr, 'P');
        draw = function (t) { gl.uniform2f(uR, cv.width, cv.height); gl.uniform1f(uT, t / 1000); gl.uniform1f(uP, progress); gl.drawArrays(gl.TRIANGLES, 0, 3); };
      }
    }
  }
  function size() {
    var s = Math.min(window.devicePixelRatio || 1, 1.25);
    cv.width = Math.max(1, stage.clientWidth * s | 0); cv.height = Math.max(1, stage.clientHeight * s | 0);
    if (gl) gl.viewport(0, 0, cv.width, cv.height);
  }
  function ui() {
    var n = Math.round(progress * 100);
    fill.style.width = n + '%'; pct.textContent = String(n).padStart(2, '0') + '%'; meter.setAttribute('aria-valuenow', n);
  }
  var start = performance.now(), dur = reduce ? 500 : 4000;
  function loop(t) {
    if (!run) return;
    if (!done) {
      progress = Math.min((t - start) / dur, 1);
      progress = 1 - Math.pow(1 - progress, 1.6);
      ui();
      if ((t - start) / dur >= 1) { done = true; progress = 1; ui(); st.textContent = 'Ready'; go.hidden = false; }
    }
    draw(t); requestAnimationFrame(loop);
  }
  size(); window.addEventListener('resize', function () { size(); draw(3000); });
  go.addEventListener('click', function () { if (reduce) return; done = false; start = performance.now(); st.textContent = 'Loading frames'; go.hidden = true; });
  if (reduce) { done = true; progress = 1; ui(); st.textContent = 'Ready'; go.hidden = false; draw(3000); return; }
  new IntersectionObserver(function (es) { var vis = es[0].isIntersecting; if (vis && !run) { run = true; requestAnimationFrame(loop); } else if (!vis) run = false; }).observe(stage);
  requestAnimationFrame(loop);
})();

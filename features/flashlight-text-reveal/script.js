(function () {
  var room = document.getElementById("twRoom"), cv = document.getElementById("twWall");
  var gl = cv.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var pos = { x: 0.5, y: 0.5 }, target = { x: 0.5, y: 0.5 };
  var driven = false, lastMove = -1e9, visible = true, raf = 0, t0 = performance.now();

  var prog, uR, uT, uL;
  if (gl) {
    var VS = "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";
    var FS = [
      "precision mediump float;uniform vec2 uR;uniform vec2 uL;uniform float uT;",
      "float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}",
      "float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}",
      "void main(){",
      " vec2 uv=gl_FragCoord.xy/uR;float asp=uR.x/uR.y;",
      " vec2 q=vec2(uv.x*asp,uv.y);",
      // brick-ish plaster: drifting blotches plus fine grain
      " float b=n(q*5.+uT*.03)*.6+n(q*18.-uT*.02)*.3+n(q*60.)*.2;",
      " vec2 d=(uv-uL)*vec2(asp,1.);float r=length(d);",
      " float lit=exp(-r*r*7.)*(.8+.2*sin(uT*3.+r*20.));",
      " float mortar=smoothstep(.02,.0,abs(fract(q.y*9.)-.5)-.47)+smoothstep(.02,.0,abs(fract(q.x*5.+floor(q.y*9.)*.5)-.5)-.48);",
      " vec3 base=vec3(.045,.04,.04)+vec3(.06,.045,.03)*b;base-=mortar*.03;",
      " vec3 warm=vec3(1.,.78,.5);",
      " vec3 col=base+warm*lit*(.25+b*.75)*.9;",
      " col+=(h(gl_FragCoord.xy+uT)-.5)*.035;",
      " gl_FragColor=vec4(col,1.);}"
    ].join("\n");
    var mk = function (t, s) { var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return gl.getShaderParameter(o, gl.COMPILE_STATUS) ? o : null; };
    var vs = mk(gl.VERTEX_SHADER, VS), fs = mk(gl.FRAGMENT_SHADER, FS);
    if (vs && fs) {
      prog = gl.createProgram(); gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) prog = null;
    }
    if (prog) {
      gl.useProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      var loc = gl.getAttribLocation(prog, "a"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      uR = gl.getUniformLocation(prog, "uR"); uT = gl.getUniformLocation(prog, "uT"); uL = gl.getUniformLocation(prog, "uL");
    }
  }

  function size() {
    var s = 0.6;
    cv.width = Math.max(2, Math.round(room.clientWidth * s)); cv.height = Math.max(2, Math.round(room.clientHeight * s));
    if (gl && prog) gl.viewport(0, 0, cv.width, cv.height);
  }
  function frame(now) {
    raf = 0;
    if (!visible) return;
    var t = (now - t0) / 1000;
    // idle: the light wanders by itself
    if (now - lastMove > 2500 && !reduce && !driven) {
      target.x = 0.5 + 0.32 * Math.sin(t * 0.55) + 0.1 * Math.sin(t * 1.3);
      target.y = 0.5 + 0.26 * Math.cos(t * 0.43 + 1);
    }
    pos.x += (target.x - pos.x) * 0.08; pos.y += (target.y - pos.y) * 0.08;
    room.style.setProperty("--mx", (pos.x * 100).toFixed(2) + "%");
    room.style.setProperty("--my", ((1 - pos.y) * 100).toFixed(2) + "%");
    if (gl && prog) {
      gl.uniform2f(uR, cv.width, cv.height); gl.uniform1f(uT, reduce ? 0 : t); gl.uniform2f(uL, pos.x, pos.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    var settling = Math.abs(target.x - pos.x) + Math.abs(target.y - pos.y) > 0.002;
    if (!reduce || settling) raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf && visible) raf = requestAnimationFrame(frame); }

  room.addEventListener("pointermove", function (e) {
    var r = room.getBoundingClientRect();
    target.x = (e.clientX - r.left) / r.width; target.y = 1 - (e.clientY - r.top) / r.height;
    lastMove = performance.now(); kick();
  });
  if ("IntersectionObserver" in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; kick(); }).observe(room);
  window.addEventListener("resize", function () { size(); kick(); });
  size(); kick();

  // Pins the section while the page scrolls past it and reports how far through (0 to 1) the visitor is,
  // so the animation plays through with the page scroll
  function pinRunway(el, screens, onProgress) {
    var run = document.createElement('div');
    run.style.cssText = 'position:relative;height:' + screens * 100 + 'vh';
    var pin = document.createElement('div');
    pin.style.cssText = 'position:sticky;top:0;height:100vh;display:grid;grid-template-columns:minmax(0,1fr);align-items:center';
    el.parentNode.insertBefore(run, el); run.appendChild(pin); pin.appendChild(el);
    el.style.alignSelf = 'stretch'; // fill the pinned screen
    function update() {
      var r = run.getBoundingClientRect(), total = r.height - window.innerHeight;
      onProgress(total > 0 ? Math.max(0, Math.min(1, -r.top / total)) : 0);
    }
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }
  // the light sweeps across the wall as the page scrolls
  pinRunway(room, 3, function (v) {
    driven = true;
    target.x = 0.1 + 0.8 * v;
    target.y = 0.5 + 0.28 * Math.sin(v * Math.PI * 3);
    lastMove = performance.now();
    kick();
  });
})();

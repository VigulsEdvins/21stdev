(function () {
  var stage = document.getElementById("dfStage");
  var cv = document.getElementById("dfCanvas");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var gl = cv.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
  if (!gl) { stage.classList.add("no-gl"); return; }

  var VS = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
  var FS = [
    "precision mediump float;",
    "uniform vec2 uRes;uniform float uTime;uniform vec2 uMouse;",
    "float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}",
    "float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);",
    " return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}",
    "float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*noise(p);p=p*1.9+vec2(3.1,1.7);a*=.45;}return v;}",
    "void main(){",
    " vec2 uv=gl_FragCoord.xy/uRes.xy;vec2 p=(gl_FragCoord.xy-.5*uRes.xy)/uRes.y;",
    " p+=(uMouse-.5)*.12;",
    " float t=uTime*.06;",
    " vec2 q=vec2(fbm(p*.8+t),fbm(p*.8-t+5.2));",
    " vec2 r=vec2(fbm(p*.9+1.6*q+vec2(1.7,9.2)+t*1.3),fbm(p*.9+1.6*q+vec2(8.3,2.8)-t));",
    " float f=fbm(p*.7+1.8*r);",
    " vec3 deep=vec3(.03,.02,.09);vec3 indigo=vec3(.3,.18,.72);vec3 teal=vec3(.1,.72,.7);vec3 amber=vec3(1.,.52,.28);",
    " vec3 col=mix(deep,indigo,smoothstep(.1,.55,f));",
    " col=mix(col,teal,smoothstep(.4,.9,r.x)*.6);",
    " col=mix(col,amber,smoothstep(.25,.85,q.y*r.y*3.2)*.75);",
    " col*=.75+.9*smoothstep(1.2,.1,length(uv-vec2(.5,.45)));",
    " float g=hash(gl_FragCoord.xy+fract(uTime)*91.7);",
    " col+=(g-.5)*.07;",
    " gl_FragColor=vec4(col,1.);",
    "}"
  ].join("\n");

  function sh(type, src) {
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  }
  var vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) { stage.classList.add("no-gl"); return; }
  var pr = gl.createProgram();
  gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { stage.classList.add("no-gl"); return; }
  gl.useProgram(pr);
  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(pr, "p");
  gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  var uRes = gl.getUniformLocation(pr, "uRes"), uTime = gl.getUniformLocation(pr, "uTime"), uMouse = gl.getUniformLocation(pr, "uMouse");

  var mx = 0.5, my = 0.5, tx = 0.5, ty = 0.5, raf = 0, visible = true, t0 = performance.now();
  function resize() {
    var s = Math.min(window.devicePixelRatio || 1, 1.5) * 0.6;
    cv.width = Math.max(2, Math.round(stage.clientWidth * s));
    cv.height = Math.max(2, Math.round(stage.clientHeight * s));
    gl.viewport(0, 0, cv.width, cv.height);
    frame(performance.now());
  }
  function frame(now) {
    mx += (tx - mx) * 0.05; my += (ty - my) * 0.05;
    gl.uniform2f(uRes, cv.width, cv.height);
    gl.uniform1f(uTime, reduce ? 40 : (now - t0) / 1000 + 40);
    gl.uniform2f(uMouse, mx, my);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function loop(now) { frame(now); raf = visible && !reduce ? requestAnimationFrame(loop) : 0; }
  stage.addEventListener("pointermove", function (e) {
    var r = stage.getBoundingClientRect();
    tx = (e.clientX - r.left) / r.width; ty = 1 - (e.clientY - r.top) / r.height;
  });
  window.addEventListener("resize", resize);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting;
      if (visible && !raf && !reduce) raf = requestAnimationFrame(loop);
    }).observe(stage);
  }
  cv.addEventListener("webglcontextlost", function (e) { e.preventDefault(); stage.classList.add("no-gl"); });
  resize();
  if (!reduce) raf = requestAnimationFrame(loop);
})();

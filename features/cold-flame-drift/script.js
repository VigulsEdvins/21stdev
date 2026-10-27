(function () {
  var field = document.getElementById("sfField");
  var cv = document.getElementById("sfCanvas");
  var gl = cv.getContext("webgl", { antialias: false, alpha: false });
  if (!gl) return;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var VS = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
  var FS = [
    "precision highp float;",
    "uniform vec2 uRes;uniform float uTime;uniform vec2 uMouse;uniform vec3 uBg,uDeep,uPale,uViolet;",
    "float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}",
    "float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);",
    " return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);}",
    "void main(){",
    " vec2 frag=gl_FragCoord.xy;",
    " vec2 uv=(frag-.5*uRes)/uRes.y;",
    // pointer pushes the drift faster and bends rows around it
    " vec2 m=(uMouse-.5*uRes)/uRes.y;",
    " float md=length(uv-m);",
    " vec2 q=uv*6.4;",
    " float a=-.55;mat2 R=mat2(cos(a),-sin(a),sin(a),cos(a));q=R*q;",
    " q.y+=.45*sin(q.x*.55+uTime*.25)+.3*(vn(q*.4+uTime*.05)-.5)*3.;",
    " q.y+=exp(-md*md*14.)*.5*sign(q.y-(R*m*6.4).y);",
    " q.x-=uTime*.35;",
    " float row=floor(q.y);",
    " float rowOff=h21(vec2(row,3.));",
    " q.x+=rowOff*7.;",
    " float size=1.7+.8*h21(vec2(row,9.));",
    " float cell=floor(q.x/size);",
    " float seed=h21(vec2(cell,row));",
    " float u=fract(q.x/size);",       // 0 tip ... 1 base along drift
    " float v=(fract(q.y)-.5)*2.;",
    " v+=sin(u*5.+seed*6.28)*.18;",    // wobble
    " v+=(seed>.78?.25*smoothstep(.2,.8,u):0.);", // side lick
    " float w=.4*pow(u,.75)*(1.-smoothstep(.82,1.,u)*.85);",
    " float d=w-abs(v);",
    " if(seed>.55){float notch=(.38-u)*.9-abs(v);d=min(d,-notch*.9+.02+(u>.38?1.:0.));}", // forked tip
    " d=min(d,u*3.);",
    " vec2 g=floor(frag/1.6);",
    " float n=h21(g+floor(uTime*.0));",
    " float cover=smoothstep(-.02,.2,d);",
    " float fill=step(n*.92,cover);",
    " float inner=smoothstep(.12,.4,d+(1.-u)*.12);",
    " float ink2=step(n+.15,inner*.9+(1.-u)*.35);",
    " vec3 bg=uBg;",
    " vec3 deep=uDeep;",
    " vec3 pale=uPale;",
    " vec3 col=mix(deep,pale,ink2);",
    " col=mix(col,uViolet,step(.93,seed)*(1.-ink2));",
    " col=mix(bg,col,fill);",
    " col*=1.-.12*h21(g*1.7);",
    " col+=(uDeep-uBg)*.12*exp(-md*md*10.);",
    " gl_FragColor=vec4(col,1.);",
    "}"
  ].join("\n");

  function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; } return s; }
  var vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) return;
  var pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
  gl.useProgram(pr);
  var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  var uRes = gl.getUniformLocation(pr, "uRes"), uTime = gl.getUniformLocation(pr, "uTime"), uMouse = gl.getUniformLocation(pr, "uMouse");

  var uBg = gl.getUniformLocation(pr, "uBg"), uDeep = gl.getUniformLocation(pr, "uDeep"), uPale = gl.getUniformLocation(pr, "uPale"), uViolet = gl.getUniformLocation(pr, "uViolet");
  // the field follows the page theme: --bg is the ground, --accent the main ink, --text lifts the second ink
  function rgb(cssVar, fb) {
    var s = document.createElement("span"); s.style.color = "var(" + cssVar + ")"; field.appendChild(s);
    var c = getComputedStyle(s).color; field.removeChild(s);
    var m = c.match(/[\d.]+/g) || [];
    if (m.length < 3) return fb;
    var k = c.indexOf("color(") === 0 ? 1 : 1 / 255;
    return [m[0] * k, m[1] * k, m[2] * k];
  }
  function mixc(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function setColours() {
    var bg = rgb("--bg", [.027, .043, .102]), deep = rgb("--accent", [.12, .26, .95]), txt = rgb("--text", [.91, .96, 1]);
    var pale = mixc(deep, txt, .65), violet = mixc(deep, [.6, .35, 1], .75);
    gl.uniform3f(uBg, bg[0], bg[1], bg[2]); gl.uniform3f(uDeep, deep[0], deep[1], deep[2]);
    gl.uniform3f(uPale, pale[0], pale[1], pale[2]); gl.uniform3f(uViolet, violet[0], violet[1], violet[2]);
  }

  var mx = 0, my = 0, tx = 0, ty = 0, W = 0, H = 0, running = false, raf = 0, t0 = performance.now(), tOff = 0;
  function size() {
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = Math.max(1, Math.round(cv.clientWidth * dpr)); H = Math.max(1, Math.round(cv.clientHeight * dpr));
    cv.width = W; cv.height = H; gl.viewport(0, 0, W, H);
    mx = tx = W * 0.6; my = ty = H * 0.5;
  }
  var frame = 0;
  function draw(now) {
    if (frame++ % 20 === 0) setColours();
    mx += (tx - mx) * 0.06; my += (ty - my) * 0.06;
    gl.uniform2f(uRes, W, H);
    gl.uniform1f(uTime, reduce ? 12 : (now - t0) / 1000 + tOff);
    gl.uniform2f(uMouse, mx, my);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function loop(now) { if (!running) return; draw(now); raf = requestAnimationFrame(loop); }
  function start() { if (running || reduce) return; running = true; raf = requestAnimationFrame(loop); }
  function stop() { running = false; cancelAnimationFrame(raf); }

  field.addEventListener("pointermove", function (e) {
    var r = cv.getBoundingClientRect(), k = W / r.width;
    tx = (e.clientX - r.left) * k; ty = (r.bottom - e.clientY) * k;
  });
  window.addEventListener("resize", function () { size(); draw(performance.now()); });
  size(); draw(performance.now());
  new MutationObserver(function () { setColours(); draw(performance.now()); }).observe(document.documentElement, { attributes: true });
  if ("IntersectionObserver" in window) new IntersectionObserver(function (en) { en[0].isIntersecting ? start() : stop(); }).observe(field);
  else start();
})();

(function () {
  var hero = document.getElementById("mfHero"), cv = document.getElementById("mfCanvas");
  var gl = cv.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
  if (!gl) return; // the CSS gradient on the hero stays as the fallback

  var VS = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
  var FS = [
    "precision mediump float;",
    "uniform vec2 uRes;uniform float uT;uniform vec2 uM;",
    "float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}",
    "float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);",
    "return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}",
    "float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}",
    "float field(vec2 p){",
    "  vec2 q=vec2(fbm(p+vec2(0.,uT*.05)),fbm(p+vec2(5.2,1.3)-uT*.04));",
    "  vec2 r=vec2(fbm(p+3.*q+vec2(1.7,9.2)+uT*.07),fbm(p+3.*q+vec2(8.3,2.8)));",
    "  vec2 d=p-uM*1.4;float pull=exp(-dot(d,d)*2.2);",
    "  return fbm(p+3.2*r+d*pull*.9);}",
    "void main(){",
    "  vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y;",
    "  vec2 m=(uM*.5+.5);vec2 mm=vec2(m.x-.5,m.y-.5)*vec2(uRes.x/uRes.y,1.);",
    "  vec2 p=uv*2.2;float e=.012;",
    "  float f=field(p);",
    "  vec3 nr=normalize(vec3(field(p+vec2(e,0.))-f,field(p+vec2(0.,e))-f,.045));",
    "  vec3 v=vec3(0.,0.,1.);vec3 L=normalize(vec3(-.5,.6,.7));",
    "  float diff=max(dot(nr,L),0.);float fres=pow(1.-max(dot(nr,v),0.),3.);",
    "  vec3 refl=reflect(-v,nr);float sky=smoothstep(-.6,.9,refl.y);",
    "  vec3 steel=mix(vec3(.05,.06,.09),vec3(.82,.86,.94),sky);",
    "  float band=sin(f*18.+uT*.3)*.5+.5;",
    "  vec3 irid=.5+.5*cos(6.2831*(f*1.2+vec3(0.,.33,.67))+uT*.1);",
    "  vec3 col=steel*(.35+.65*diff)+irid*fres*.45+vec3(pow(diff,24.))*.55;",
    "  col=mix(col,col*vec3(.9,.95,1.1),band*.25);",
    "  col*=smoothstep(1.35,.2,length(uv));",
    "  gl_FragColor=vec4(pow(col,vec3(.92)),1.);}"
  ].join("\n");

  function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; }
  var vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) return;
  var prog = gl.createProgram(); gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);
  var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  var uRes = gl.getUniformLocation(prog, "uRes"), uT = gl.getUniformLocation(prog, "uT"), uM = gl.getUniformLocation(prog, "uM");

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var mx = 0, my = 0, tx = 0, ty = 0, visible = true, t0 = performance.now();
  function size() {
    var d = Math.min(window.devicePixelRatio || 1, 1.5), w = Math.max(2, Math.round(cv.clientWidth * d * 0.6)), h = Math.max(2, Math.round(cv.clientHeight * d * 0.6));
    cv.width = w; cv.height = h; gl.viewport(0, 0, w, h); gl.uniform2f(uRes, w, h);
  }
  hero.addEventListener("pointermove", function (e) {
    var r = hero.getBoundingClientRect();
    tx = ((e.clientX - r.left) / r.width) * 2 - 1; ty = -(((e.clientY - r.top) / r.height) * 2 - 1);
  });
  function draw(now) {
    mx += (tx - mx) * 0.06; my += (ty - my) * 0.06;
    gl.uniform1f(uT, reduce ? 4 : (now - t0) / 1000); gl.uniform2f(uM, mx, my);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function loop(now) { if (visible) draw(now); requestAnimationFrame(loop); }
  if ("IntersectionObserver" in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }).observe(hero);
  window.addEventListener("resize", function () { size(); draw(performance.now()); });
  size(); draw(performance.now());
  if (!reduce) requestAnimationFrame(loop);
})();

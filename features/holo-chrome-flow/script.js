(function () {
  var wrap = document.getElementById("pfWrap"), cv = document.getElementById("pfCanvas");
  var gl = cv.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
  if (!gl) return; // CSS gradient stays as fallback
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var VS = "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";
  var FS = [
    "precision mediump float;",
    "uniform vec2 uR;uniform float uT;uniform vec2 uP;uniform float uD;",
    "float h(vec2 p){return fract(sin(dot(p,vec2(41.3,289.1)))*9173.17);}",
    "float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);",
    " return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}",
    // ridged fold noise: sharp creases like crumpled foil
    "float ridge(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){float n=1.-abs(vn(p)*2.-1.);v+=a*n*n;p=p*2.1+vec2(3.1,1.7);a*=.5;}return v;}",
    "float H(vec2 p){",
    " float t=uT*.06;",
    " vec2 w=vec2(sin(p.y*1.3+t*3.),cos(p.x*1.1-t*2.))*.45;",
    " return ridge(p+w+vec2(t,-t*.6))+.35*vn(p*1.4-uP*.6+t);}",
    "vec3 film(float x){return .5+.5*cos(6.2832*(x+vec3(0.,.33,.67)));}",
    "void main(){",
    " vec2 uv=(gl_FragCoord.xy-.5*uR)/min(uR.x,uR.y);",
    " vec2 p=uv*2.6;float e=.02;",
    " float c=H(p);",
    " vec3 n=normalize(vec3((H(p+vec2(e,0.))-c)*-2.2,(H(p+vec2(0.,e))-c)*-2.2,1.));",
    " vec3 L=normalize(vec3(uP.x*1.2,uP.y*1.2+.3,.8));",
    " vec3 V=vec3(0.,0.,1.);vec3 R=reflect(-V,n);",
    " float env=smoothstep(-.7,.8,R.y+R.x*.35)*.9+.08;",
    " float spec=pow(max(dot(R,L),0.),30.);",
    " float fres=pow(1.-max(n.z,0.),2.);",
    " vec3 metal=mix(vec3(.04,.05,.07),vec3(.88,.9,.96),env);",
    " vec3 irid=film(c*1.3+R.x*.8+uP.x*.3+uT*.02);",
    " vec3 col=metal*(.55+.45*dot(n,L))+irid*(.18+fres*.8)*.75+spec*.9;",
    " float vein=smoothstep(.22,.1,c);col*=1.-vein*.8;",
    " float sp=h(floor(gl_FragCoord.xy/3.));",
    " col+=step(.9985,sp)*(.5+.5*sin(uT*3.+sp*90.))*smoothstep(.5,.9,c);",
    " col*=smoothstep(1.5,.3,length(uv));",
    " gl_FragColor=vec4(pow(col,vec3(.9)),1.);}"
  ].join("\n");

  function sh(t, s) { var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return gl.getShaderParameter(o, gl.COMPILE_STATUS) ? o : null; }
  var vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) return;
  var pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
  gl.useProgram(pr);
  var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(pr, "a"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  var uR = gl.getUniformLocation(pr, "uR"), uT = gl.getUniformLocation(pr, "uT"), uP = gl.getUniformLocation(pr, "uP");

  var mx = 0, my = 0, tx = 0, ty = 0, visible = true, raf = 0, t0 = performance.now();
  function size() {
    var s = Math.min(window.devicePixelRatio || 1, 1.25);
    cv.width = Math.max(2, Math.round(wrap.clientWidth * s * 0.75));
    cv.height = Math.max(2, Math.round(wrap.clientHeight * s * 0.75));
    gl.viewport(0, 0, cv.width, cv.height);
  }
  function frame(now) {
    raf = 0;
    if (!visible) return;
    mx += (tx - mx) * 0.06; my += (ty - my) * 0.06;
    gl.uniform2f(uR, cv.width, cv.height);
    gl.uniform1f(uT, reduce ? 3 : (now - t0) / 1000);
    gl.uniform2f(uP, mx, my);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!reduce || Math.abs(tx - mx) > 0.002 || Math.abs(ty - my) > 0.002) raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf && visible) raf = requestAnimationFrame(frame); }
  wrap.addEventListener("pointermove", function (e) {
    var r = wrap.getBoundingClientRect();
    tx = ((e.clientX - r.left) / r.width) * 2 - 1; ty = 1 - ((e.clientY - r.top) / r.height) * 2; kick();
  });
  if ("IntersectionObserver" in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; kick(); }).observe(wrap);
  window.addEventListener("resize", function () { size(); kick(); });
  size(); kick();
})();

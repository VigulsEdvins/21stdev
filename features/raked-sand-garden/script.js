(function () {
  var host = document.getElementById("rgGarden"), cv = document.getElementById("rgCanvas");
  var gl = cv.getContext("webgl", { antialias: false, alpha: false });
  if (!gl) return;
  var VS = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
  var FS = [
    "precision highp float;uniform vec2 uR;uniform float uT;uniform vec2 uM;uniform float uA;",
    "const float F=70.;",
    "vec3 S0=vec3(-.55,.1,.13);vec3 S1=vec3(-.3,-.12,.07);vec3 S2=vec3(.6,-.15,.1);",
    "float ring(vec2 p,vec3 s,float ph){float d=length(p-s.xy);float w=smoothstep(s.z*7.,s.z*1.6,d);return mix(ph,d*F,w);}",
    "float height(vec2 p){",
    "  float ph=p.y*F+sin(p.x*3.)*2.;",
    "  ph=ring(p,S0,ph);ph=ring(p,S1,ph);ph=ring(p,S2,ph);",
    "  float dm=length(p-uM);float wm=smoothstep(.55,.08,dm)*uA;ph=mix(ph,dm*F,wm);",
    "  float h=.5+.5*cos(ph);",
    "  return h*.6;}",
    "float stone(vec2 p,vec3 s){return length(p-s.xy)-s.z;}",
    "void main(){",
    "  vec2 p=(gl_FragCoord.xy-.5*uR)/uR.y;",
    "  float e=.0025;float h=height(p);",
    "  vec2 g=vec2(height(p+vec2(e,0.))-h,height(p+vec2(0.,e))-h)/e;",
    "  float a=uT*.05+.9;vec2 L=vec2(cos(a),sin(a));",
    "  float lit=.62+.5*dot(normalize(vec3(-g*.07,1.)),normalize(vec3(L*.7,.55)))-.2;",
    "  vec3 sand=mix(vec3(.74,.69,.57),vec3(.9,.86,.74),clamp(lit,0.,1.));",
    "  sand+=.04*(fract(sin(dot(floor(gl_FragCoord.xy),vec2(12.9,78.2)))*43758.5)-.5);",
    "  vec3 col=sand;float sd=9.;",
    "  for(int i=0;i<3;i++){vec3 s=i==0?S0:(i==1?S1:S2);float d=stone(p,s);",
    "    float moss=smoothstep(s.z*.9,0.,d)*step(0.,d);col=mix(col,vec3(.33,.45,.22),moss*.4);",
    "    vec2 sh=p-s.xy-L*s.z*.5;float shd=smoothstep(s.z*1.4,s.z*.2,length(sh-L*s.z*.4)) *step(0.,d);col*=1.-.14*shd;",
    "    if(d<0.){vec2 q=(p-s.xy)/s.z;float z=sqrt(max(1.-dot(q,q),0.));float dif=clamp(dot(normalize(vec3(q,z)),normalize(vec3(-L*.6,.8))),0.,1.);",
    "      col=mix(vec3(.19,.2,.22),vec3(.58,.58,.56),dif*.9+.1*h);}}",
    "  col*=1.-.25*dot(p*.55,p*.55);",
    "  gl_FragColor=vec4(col,1.);}"
  ].join("\n");
  function sh(t, s) { var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return gl.getShaderParameter(o, gl.COMPILE_STATUS) ? o : null; }
  var vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) return;
  var pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
  gl.useProgram(pr);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  var uR = gl.getUniformLocation(pr, "uR"), uT = gl.getUniformLocation(pr, "uT"), uM = gl.getUniformLocation(pr, "uM"), uA = gl.getUniformLocation(pr, "uA");
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches, vis = true, t0 = performance.now();
  var mx = 0.1, my = 0.25, tx = 0.1, ty = 0.25, act = 0, tact = 0.6, raf = 0;
  function size() { var d = Math.min(devicePixelRatio || 1, 1.25); cv.width = Math.max(1, host.clientWidth * d | 0); cv.height = Math.max(1, host.clientHeight * d | 0); gl.viewport(0, 0, cv.width, cv.height); draw(); }
  host.addEventListener("pointermove", function (e) { var r = host.getBoundingClientRect(); tx = ((e.clientX - r.left) - r.width / 2) / r.height; ty = -((e.clientY - r.top) - r.height / 2) / r.height; tact = 1; if (reduce) { mx = tx; my = ty; act = 1; draw(); } });
  host.addEventListener("pointerleave", function () { tact = 0; });
  function draw() { gl.uniform2f(uR, cv.width, cv.height); gl.uniform1f(uT, (performance.now() - t0) / 1000); gl.uniform2f(uM, mx, my); gl.uniform1f(uA, act); gl.drawArrays(gl.TRIANGLES, 0, 3); }
  function loop() { raf = 0; if (!vis) return; mx += (tx - mx) * 0.08; my += (ty - my) * 0.08; act += (tact - act) * 0.05; draw(); if (!reduce) raf = requestAnimationFrame(loop); }
  new IntersectionObserver(function (e) { vis = e[0].isIntersecting; if (vis && !raf && !reduce) loop(); }).observe(host);
  addEventListener("resize", size); size(); act = 0.6; if (!reduce) loop();
})();

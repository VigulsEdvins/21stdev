(function () {
  var host = document.getElementById("hnSky"), cv = document.getElementById("hnCanvas");
  var gl = cv.getContext("webgl", { antialias: false, alpha: false });
  if (!gl) return;
  var VS = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
  var FS = [
    "precision mediump float;uniform vec2 uR;uniform float uT;uniform vec2 uM;",
    "float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}",
    "float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}",
    "float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p=p*2.1+vec2(3.1,1.7);a*=.5;}return v;}",
    // dot coverage for a tone value on a rotated grid
    "float dots(vec2 px,float tone,float ang,float cell){float c=cos(ang),s=sin(ang);vec2 q=mat2(c,-s,s,c)*px/cell;vec2 f=fract(q)-.5;float r=sqrt(clamp(tone,0.,1.))*.72;return smoothstep(r+.08,r-.08,length(f));}",
    "void main(){",
    "  vec2 px=gl_FragCoord.xy;vec2 uv=px/uR.y;",
    "  float t=uT*.02;vec2 m=uM*.05;",
    "  float gas=fbm(uv*2.2+vec2(t,-t*.7)+m);gas=smoothstep(.35,.85,gas*1.15+.1*fbm(uv*6.-t));",
    "  float tone=gas*.85;",
    "  // planet",
    "  vec2 pc=vec2(uR.x/uR.y*.78,.68);vec2 d=uv-pc;float pr=.17;float dd=length(d);",
    "  float planet=smoothstep(pr,pr-.004,dd);float shade=clamp(.5-dot(normalize(d+1e-4),normalize(vec2(-.7,.7)))*.5*(dd/pr)+.12,0.,1.);",
    "  float ptone=mix(tone,shade*.95,planet);",
    "  // stars with needle spikes",
    "  float star=0.;vec2 g=uv*7.;vec2 gi=floor(g);for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){vec2 c=gi+vec2(float(i),float(j));",
    "    if(h(c)>.62){vec2 sp=c+vec2(h(c+3.1),h(c+7.7));vec2 dv=(g-sp)/7.;float tw=.6+.4*sin(uT*1.5+h(c)*30.);",
    "      float core=exp(-dot(dv,dv)*9000.);float spike=(exp(-abs(dv.x)*400.)*exp(-abs(dv.y)*28.)+exp(-abs(dv.y)*400.)*exp(-abs(dv.x)*28.))*.8;star+=(core+spike)*tw;}}",
    "  float tt=clamp(ptone+star,0.,1.);",
    "  float cell=7.;vec3 paper=vec3(.945,.914,.847);vec3 ink=vec3(.70,.125,.185);vec3 dark=vec3(.16,.1,.12);",
    "  float dr=dots(px,tt,.26,cell);float dk=dots(px,max(star,planet*shade*.6),.78,cell)*step(.15,star+planet*shade);",
    "  vec3 col=mix(paper,ink,dr);col=mix(col,dark,dk*.9);",
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
  var uR = gl.getUniformLocation(pr, "uR"), uT = gl.getUniformLocation(pr, "uT"), uM = gl.getUniformLocation(pr, "uM");
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches, vis = true, t0 = performance.now(), raf = 0, mx = 0, my = 0, tx = 0, ty = 0;
  function draw() { gl.uniform2f(uR, cv.width, cv.height); gl.uniform1f(uT, reduce ? 20 : (performance.now() - t0) / 1000); gl.uniform2f(uM, mx, my); gl.drawArrays(gl.TRIANGLES, 0, 3); }
  function size() { cv.width = Math.max(1, host.clientWidth); cv.height = Math.max(1, host.clientHeight); gl.viewport(0, 0, cv.width, cv.height); draw(); }
  host.addEventListener("pointermove", function (e) { var r = host.getBoundingClientRect(); tx = (e.clientX - r.left) / r.width - .5; ty = (e.clientY - r.top) / r.height - .5; });
  function loop() { raf = 0; if (!vis || reduce) return; mx += (tx - mx) * .05; my += (ty - my) * .05; draw(); raf = requestAnimationFrame(loop); }
  new IntersectionObserver(function (e) { vis = e[0].isIntersecting; if (vis && !raf) loop(); }).observe(host);
  addEventListener("resize", size); size(); loop();
})();

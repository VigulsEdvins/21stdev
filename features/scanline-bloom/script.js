(function () {
  var stage = document.getElementById('sbStage');
  var cv = document.getElementById('sbCanvas');
  var gl = cv.getContext('webgl', { antialias: false });
  if (!gl) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  var fs = [
    'precision mediump float;uniform vec2 R;uniform float T;uniform float D;',
    'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
    'float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}',
    'float bloom(vec2 p,float k,float rad,float ph){float a=atan(p.y,p.x),d=length(p);',
    ' float e=rad*(.62+.38*cos(k*a+ph+d*7.));float body=smoothstep(e,e-.025,d);',
    ' float shade=.45+.55*pow(1.-clamp(d/rad,0.,1.),.6)+.15*sin(d*60.);return body*clamp(shade,0.,1.);}',
    'float seg(vec2 p,vec2 a,vec2 b,float w){vec2 pa=p-a,ba=b-a;float t=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return smoothstep(w,w*.4,length(pa-ba*t));}',
    'float leaf(vec2 p,vec2 c,float ang,float s){float ca=cos(ang),sa=sin(ang);p-=c;p=vec2(ca*p.x+sa*p.y,-sa*p.x+ca*p.y);p/=vec2(s,s*.32);return smoothstep(1.,.8,length(p))*.55;}',
    'void main(){vec2 fc=gl_FragCoord.xy;vec2 uv=(fc-.5*R)/min(R.x*1.15,R.y);',
    ' float sway=sin(T*.5+uv.y*3.)*.012;vec2 p=uv+vec2(sway*(uv.y+.5),0.);',
    ' float v=0.;',
    ' v=max(v,bloom(p-vec2(0.,.16),7.,.2,T*.1));',
    ' v=max(v,bloom(p-vec2(-.24,.04),5.,.14,1.+T*.08));',
    ' v=max(v,bloom(p-vec2(.25,.06),6.,.15,2.-T*.09));',
    ' v=max(v,bloom(p-vec2(-.1,-.1),8.,.12,3.));',
    ' v=max(v,bloom(p-vec2(.12,-.08),5.,.11,.6-T*.06));',
    ' v=max(v,seg(p,vec2(0.,.16),vec2(0.,-.55),.008)*.5);',
    ' v=max(v,seg(p,vec2(-.24,.04),vec2(-.03,-.5),.006)*.5);',
    ' v=max(v,seg(p,vec2(.25,.06),vec2(.03,-.5),.006)*.5);',
    ' v=max(v,leaf(p,vec2(-.12,-.3),.7,.16));v=max(v,leaf(p,vec2(.13,-.28),-.7,.16));v=max(v,leaf(p,vec2(-.2,-.2),.2,.12));',
    ' float cell=max(3.,3.*D);float ly=fc.y/cell;float f=fract(ly);',
    ' float w=v*1.1+(n(vec2(fc.x*.05/D,floor(ly)*3.7))-.5)*.4*step(.02,v);',
    ' float line=step(abs(f-.5)*2.,w);',
    ' float dots=step(h(floor(fc/(1.6*D))),v*.95);',
    ' float mixk=smoothstep(.0,-.4,uv.y);float ink=mix(line,dots,mixk);',
    ' vec2 q=fc/R;float fr=step(.045,q.x)*step(q.x,.955)*step(.04,q.y)*step(q.y,.96);float fo=step(.05,q.x)*step(q.x,.95)*step(.045,q.y)*step(q.y,.955);ink=max(ink,fr-fo);',
    ' ink*=1.-.25*h(fc+T);',
    ' vec3 col=mix(vec3(.03,.012,.012),vec3(.95,.2,.17),ink);col+=(h(fc*1.3)-.5)*.03;gl_FragColor=vec4(col,1.);}'
  ].join('\n');
  function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; }
  var pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
  gl.useProgram(pr);
  var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  var uR = gl.getUniformLocation(pr, 'R'), uT = gl.getUniformLocation(pr, 'T'), uD = gl.getUniformLocation(pr, 'D');
  var dpr = Math.min(window.devicePixelRatio || 1, 1.5), visible = true, raf = 0, t0 = performance.now();
  function size() {
    var r = stage.getBoundingClientRect();
    cv.width = Math.max(1, Math.round(r.width * dpr)); cv.height = Math.max(1, Math.round(r.height * dpr));
    gl.viewport(0, 0, cv.width, cv.height);
  }
  function draw(now) {
    raf = 0;
    gl.uniform2f(uR, cv.width, cv.height); gl.uniform1f(uT, reduce ? 2 : (now - t0) / 1000); gl.uniform1f(uD, dpr);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (visible && !reduce) raf = requestAnimationFrame(draw);
  }
  function go() { if (!raf) raf = requestAnimationFrame(draw); }
  window.addEventListener('resize', function () { size(); go(); });
  new IntersectionObserver(function (e) { visible = e[0].isIntersecting; if (visible) go(); }).observe(stage);
  size(); go();
})();

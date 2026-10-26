(function () {
  var wrap = document.getElementById('eaWrap'), cv = document.getElementById('eaCanvas');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var gl = cv.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' });
  if (!gl) return; // the CSS fallback stays visible

  var VS = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
  var FS = [
    'precision highp float;',
    'uniform vec2 uR;uniform float uT;uniform vec2 uP;',
    'float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}',
    'vec3 ramp(float k){', // k: 0 = coolest outer ember, 1 = hottest inner edge
    '  vec3 a=vec3(0.30,0.04,0.01),b=vec3(1.0,0.38,0.05),c=vec3(1.0,0.72,0.25),d=vec3(1.0,0.96,0.85);',
    '  vec3 col=mix(a,b,smoothstep(0.0,0.35,k));col=mix(col,c,smoothstep(0.3,0.7,k));return mix(col,d,smoothstep(0.7,1.0,k));}',
    // one ring of the accretion disc at disc-plane radius rd and angle an
    'float disc(float rd,float an,float t,float rin,float rout,out float heat){',
    '  float edgeIn=smoothstep(rin,rin*1.06,rd),edgeOut=1.0-smoothstep(rout*0.55,rout,rd);',
    '  float swirl=sin(an*3.0+rd*14.0-t*0.9)*0.5+sin(an*7.0-rd*31.0+t*1.4)*0.25;',
    '  float etch=sin(rd*150.0+swirl*1.6);',
    '  float line=smoothstep(0.35,0.95,etch);',
    '  float band=0.55+0.45*sin(rd*23.0+swirl*2.0);',
    '  heat=pow(clamp(rin/rd,0.0,1.0),1.1);',
    '  float doppler=0.62+0.38*cos(an-0.5);',
    '  float body=(0.4+0.6*line)*(0.7+0.3*band);',
    '  return body*edgeIn*edgeOut*doppler*(0.5+1.6*heat);}',
    'void main(){',
    '  float s=min(uR.y*0.9,uR.x*0.8);',
    '  vec2 p=(gl_FragCoord.xy-vec2(uR.x*0.5,uR.y*0.64))/s;',
    '  p-=uP*0.025;',
    '  float t=uT;',
    '  float rs=0.15,r=length(p);',
    '  float tilt=0.27+uP.y*0.04;',
    // lensed background stars
    '  vec2 bp=p*(1.0-0.85*rs*rs/(r*r+0.012));',
    '  vec2 g=bp*38.0+vec2(7.0,3.0);vec2 id=floor(g),f=fract(g)-0.5;',
    '  float star=step(0.93,h21(id))*smoothstep(0.16,0.0,length(f-vec2(h21(id+3.1)-0.5,h21(id+7.7)-0.5)*0.5))*(0.5+0.5*h21(id+1.3));',
    '  vec3 col=vec3(0.02,0.012,0.012)+vec3(0.8,0.85,1.0)*star*0.8;',
    '  col+=vec3(0.18,0.05,0.01)*exp(-r*2.6)*0.8;',
    // lensed image of the far side of the disc, arching over and under the shadow
    '  float an0=atan(p.y,p.x);',
    '  float heatL;',
    '  float rl=r;',
    '  float arch=disc(rl*0.62,an0*1.0+t*0.15,t,rs*0.62*1.04,rs*0.62*2.4,heatL);',
    '  float vmask=0.35+0.65*smoothstep(-0.2,0.9,p.y/(r+1e-4));',
    '  col+=ramp(heatL)*arch*vmask*0.9*smoothstep(rs*0.98,rs*1.04,r);',
    // photon ring
    '  float ring=exp(-pow((r-rs*1.035)/(rs*0.035),2.0));',
    '  col+=vec3(1.0,0.86,0.62)*ring*1.4+vec3(1.0,0.5,0.12)*exp(-pow((r-rs*1.08)/(rs*0.16),2.0))*0.45;',
    // black shadow swallows everything behind it, then the near half of the disc crosses in front
    '  col=mix(col*0.0,col,smoothstep(rs*0.97,rs*1.01,r));',
    '  col+=vec3(1.0,0.86,0.62)*ring*1.2;',
    '  vec2 q=vec2(p.x,p.y/tilt);',
    '  float rd=length(q);float an=atan(q.y,q.x)+t*0.12;',
    '  float heat;',
    '  float dd=disc(rd,an,t,rs*1.38,0.8,heat);',
    '  float back=step(0.0,q.y)*step(r,rs*1.02);',
    '  vec3 dc=ramp(heat)*dd*(1.2+1.6*heat*heat);',
    '  col+=dc*(1.0-back);',
    '  col+=vec3(1.0,0.5,0.12)*exp(-abs(q.y)*5.0)*exp(-rd*2.0)*0.22*smoothstep(rs*1.3,rs*2.5,rd)*(1.0-back);',
    // bloom-ish tone map, vignette, grain
    '  col=1.0-exp(-col*1.25);',
    '  vec2 c=gl_FragCoord.xy/uR-0.5;col*=1.0-dot(c,c)*0.9;',
    '  float gr=h21(gl_FragCoord.xy+fract(t*7.0)*91.7)-0.5;',
    '  col+=gr*0.055;',
    '  gl_FragColor=vec4(max(col,0.0),1.);}'
  ].join('\n');

  function sh(type, src) { var x = gl.createShader(type); gl.shaderSource(x, src); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) { if (window.console) console.warn(gl.getShaderInfoLog(x)); return null; } return x; }
  var vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) return;
  var pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
  gl.useProgram(pr);
  var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  var uR = gl.getUniformLocation(pr, 'uR'), uT = gl.getUniformLocation(pr, 'uT'), uP = gl.getUniformLocation(pr, 'uP');
  wrap.classList.add('is-gl');

  var w = 1, h = 1, vis = true, raf = 0, t0 = performance.now(), px = 0, py = 0, tx = 0, ty = 0;
  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5) * 0.85, r = cv.getBoundingClientRect();
    w = Math.max(2, Math.round(r.width * dpr)); h = Math.max(2, Math.round(r.height * dpr));
    cv.width = w; cv.height = h; gl.viewport(0, 0, w, h); draw();
  }
  function draw() {
    gl.uniform2f(uR, w, h); gl.uniform1f(uT, reduce ? 4.0 : (performance.now() - t0) / 1000 + 4.0); gl.uniform2f(uP, px, py);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function loop() {
    raf = 0; px += (tx - px) * 0.06; py += (ty - py) * 0.06; draw();
    if (vis && (!reduce || Math.abs(tx - px) + Math.abs(ty - py) > 0.002)) raf = requestAnimationFrame(loop);
  }
  function kick() { if (!raf && vis) raf = requestAnimationFrame(loop); }
  wrap.addEventListener('pointermove', function (e) { var r = wrap.getBoundingClientRect(); tx = ((e.clientX - r.left) / r.width - 0.5) * 2; ty = -((e.clientY - r.top) / r.height - 0.5) * 2; kick(); });
  wrap.addEventListener('pointerleave', function () { tx = ty = 0; kick(); });
  window.addEventListener('resize', resize);
  cv.addEventListener('webglcontextlost', function (e) { e.preventDefault(); wrap.classList.remove('is-gl'); });
  new IntersectionObserver(function (es) { vis = es[0].isIntersecting; if (vis) kick(); }).observe(cv);
  resize(); kick();
})();

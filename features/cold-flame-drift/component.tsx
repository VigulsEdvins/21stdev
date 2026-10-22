"use client"

import * as React from "react"

/*
 * Cold Flame Drift — a field of grainy, hand-printed flames sliding along a
 * diagonal. Every tongue is drawn from a tapered profile with a blunt base and
 * a pointed (sometimes forked) tip, bent by a slow noise current so the rows
 * snake as they travel. Two inks stipple into each other like a risograph
 * pull, and short dash marks drift through the gaps between the flames.
 *
 * Hover stokes the fire: flames curl away from the pointer and run hotter.
 * Moving fast makes them race; a click sends out a flare ring.
 *
 * One WebGL fragment pass. React is the only import: no textures, no assets.
 */

export type FlamePalette = "cobalt" | "ember" | "jade" | "violet" | "bone"

export type ColdFlameDriftProps = {
  /** Colour preset. Any of the colour props below overrides its slot. */
  palette?: FlamePalette
  /** The ink behind the flames. */
  background?: string
  /** Bright ink — the bodies and tips of the flames. */
  light?: string
  /** Deep ink — the bases and shadowed edges. */
  dark?: string
  /** Colour of the dash marks between flames. */
  dashColor?: string
  /** Direction the flames point and travel, in degrees counter-clockwise from →. */
  angle?: number
  /** Spacing between flame rows in CSS px — the overall size of the pattern. */
  scale?: number
  /** Flame length, in rows. */
  length?: number
  /** Flame width multiplier. */
  thickness?: number
  /** How much the noise current bends the rows. 0 = straight. */
  turbulence?: number
  /** Drift speed multiplier. 0 holds the field still (the flicker keeps going). */
  speed?: number
  /** Share of flames whose tip splits in two, 0..1. */
  forks?: number
  /** Density of the dash marks, 0..1. */
  dashes?: number
  /** Stipple amount, 0 (clean vector edges) .. 1 (full print grain). */
  grain?: number
  /** Size of one grain speck in CSS px. */
  grainSize?: number
  /** Re-roll the grain at 12 fps, like hand-drawn boil. */
  boil?: boolean
  /** Reshuffles which flames appear where. */
  seed?: number
  /** Pointer curls the flames, speeds them up, and a click flares. */
  interactive?: boolean
  /** Reach of the pointer's influence in CSS px. */
  pointerRadius?: number
  /** Freeze the animation. */
  paused?: boolean
  /** Any CSS length. Default 100svh. */
  height?: number | string
  className?: string
  style?: React.CSSProperties
  "aria-label"?: string
  /** Laid over the flames; pointer events pass through except on interactive children. */
  children?: React.ReactNode
}

export const PALETTES = {
  cobalt: { background: "#020406", light: "#1d9ad6", dark: "#0b5a8c", dashColor: "#0f6aa3" },
  ember: { background: "#080302", light: "#ff8a2b", dark: "#a8300e", dashColor: "#b23a12" },
  jade: { background: "#010605", light: "#40d39a", dark: "#0f6e4f", dashColor: "#14805c" },
  violet: { background: "#050209", light: "#a57cff", dark: "#4f2aa8", dashColor: "#5c34bd" },
  bone: { background: "#0a0a09", light: "#ece4d4", dark: "#7f786c", dashColor: "#8d8578" },
} as const

// #region logic
/** "#rgb" / "#rrggbb" → 0..1 triplet; anything unparseable is `fallback`. */
export function hexToRgb(hex: string, fallback: [number, number, number] = [0, 0, 0]): [number, number, number] {
  let h = String(hex || "").trim().replace(/^#/, "")
  if (h.length === 3) h = h.replace(/./g, (c) => c + c)
  if (!/^[0-9a-f]{6}$/i.test(h)) return fallback
  const n = parseInt(h, 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

/** Unit vector of the flow on screen (y points down), for an angle in degrees counter-clockwise from →. */
export function flowDir(angle: number): [number, number] {
  const a = ((Number.isFinite(angle) ? angle : 42) * Math.PI) / 180
  return [Math.cos(a), -Math.sin(a)]
}

/** Half-width of a flame at `tt` (0 = base, 1 = tip) for a widest half-width `w`. Mirrored in FRAG. */
export function flameWidth(tt: number, w: number): number {
  const t = Math.min(1, Math.max(0, tt))
  return w * Math.sqrt(Math.min(1, t * 3.5)) * Math.pow(1 - t, 0.85)
}

/** Frame-rate independent ease toward a target; k is roughly 1 / settle-time. */
export function approach(cur: number, target: number, dt: number, k: number): number {
  return target + (cur - target) * Math.exp(-dt * k)
}

/** Clamp a numeric prop into range; NaN and undefined fall back. */
export function clampProp(v: number | undefined, lo: number, hi: number, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback
}

/** Grain re-roll index: steps at `fps`, stays small for a float32 hash seed. */
export function boilFrame(seconds: number, fps: number): number {
  if (!(fps > 0) || !Number.isFinite(seconds) || seconds < 0) return 0
  return Math.floor(seconds * Math.min(fps, 60)) % 997
}
// #endregion logic

const VERT = "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}"

// Everything is computed in "flow space": x along the direction the flames
// point, y across it, both in rows (one row = `scale` CSS px).
const FRAG = [
  "precision highp float;",
  "uniform vec2 u_res;",
  "uniform float u_dpr;",
  "uniform float u_time;",
  "uniform float u_clock;",
  "uniform vec2 u_dir;",
  "uniform float u_scale;",
  "uniform float u_len;",
  "uniform float u_width;",
  "uniform float u_warp;",
  "uniform float u_forks;",
  "uniform float u_dashes;",
  "uniform float u_grain;",
  "uniform float u_grainSize;",
  "uniform float u_frame;",
  "uniform float u_seed;",
  "uniform vec3 u_bg;",
  "uniform vec3 u_light;",
  "uniform vec3 u_dark;",
  "uniform vec3 u_dash;",
  "uniform vec2 u_mouse;",
  "uniform float u_push;",
  "uniform float u_radius;",
  "uniform vec3 u_burst;",
  "float hash(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}",
  "float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);",
  "  return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}",
  "float fbm(vec2 p){float s=0.,a=.5;for(int k=0;k<3;k++){s+=a*noise(p);p=p*2.07+vec2(13.1,7.7);a*=.5;}return s/.875;}",
  "float flameW(float tt,float w){tt=clamp(tt,0.,1.);return w*sqrt(min(1.,tt*3.5))*pow(1.-tt,.85);}",
  "float seg(vec2 p,vec2 v){float h=clamp(dot(p,v)/dot(v,v),-1.,1.);return length(p-v*h);}",
  // one flame per (segment, row): d = signed distance in rows, tt = 0 base .. 1 tip, side = -1..1 across
  "vec4 flame(vec2 q,float j){",
  "  float x=q.x/u_len+hash(vec2(j,u_seed+.5))*17.;",
  "  float i=floor(x);",
  "  vec2 id=vec2(i,j)+u_seed*31.;",
  "  float r1=hash(id),r2=hash(id+.37),r3=hash(id+1.71),r4=hash(id+3.13),r5=hash(id+5.9);",
  "  float len=.72+.26*r1;",
  "  float tt=fract(x)/len;",
  "  if(tt>1.)return vec4(9.,0.,0.,0.);",
  // flicker runs base → tip; the body sways in an S and the tip hooks
  "  float fl=(noise(vec2(tt*3.-u_clock*2.3,i*3.1+j*7.7))-.5)*.22*tt;",
  "  float sway=sin(tt*(3.+3.*r2)+r3*6.28+u_clock*.9)*.13*tt;",
  "  float c=j+.5+(r2-.5)*.3+(r3-.5)*1.1*tt*tt*tt+sway+fl;",
  "  float w=flameW(tt,(.3+.21*r4)*u_width);",
  "  float y=q.y-c;",
  "  float d=abs(y)-w;",
  // forks: the tip splits into two prongs that splay apart, and some flames throw a lick off one side
  "  if(r5<u_forks){",
  "    float fs=.2+.32*hash(id+7.3);",
  "    float k=smoothstep(fs,1.,tt);",
  "    float sp=k*(.5*w+.34*(tt-fs));",
  "    float w2=w*(1.-.38*k);",
  "    d=min(abs(y-sp)-w2,abs(y+sp*(.6+.5*hash(id+9.1)))-w2*.85);",
  "  }",
  "  float r6=hash(id+11.7);",
  "  if(r6<u_forks*.75){",
  "    float s0=.12+.3*hash(id+13.1);",
  "    float sd=r6<u_forks*.37?1.:-1.;",
  "    float v=clamp((tt-s0)/.42,0.,1.);",
  "    float lw=(.05+.07*hash(id+15.3))*sin(3.1416*v)*(1.-.4*v)*u_width;",
  "    d=min(d,abs(y-sd*(w*.55+.3*v*v))-lw+.004);",
  "  }",
  "  return vec4(d,tt,y/max(w,1e-3),r1);",
  "}",
  "void main(){",
  "  vec2 px=vec2(gl_FragCoord.x,u_res.y*u_dpr-gl_FragCoord.y)/u_dpr;",
  "  vec2 p=px;",
  "  float heat=0.;",
  // pointer: swirl the field around it and pull samples inward, so flames curl and bulge away
  "  vec2 dm=p-u_mouse;",
  "  float f=exp(-dot(dm,dm)/(u_radius*u_radius))*u_push;",
  "  float a=f*.85;",
  "  p=u_mouse+mat2(cos(a),sin(a),-sin(a),cos(a))*dm*(1.-.32*f);",
  "  heat+=f;",
  "  if(u_burst.z>=0.){",
  "    vec2 db=p-u_burst.xy;float L=length(db);",
  "    float k=exp(-pow((L-u_burst.z*820.)/120.,2.))*max(0.,1.-u_burst.z/1.15);",
  "    p-=db/max(L,1.)*k*52.;heat+=k*1.3;",
  "  }",
  "  vec2 q=vec2(dot(p,u_dir),dot(p,vec2(-u_dir.y,u_dir.x)))/u_scale;",
  // a slow current fixed to the screen: rows bend as they travel through it
  "  float t=u_clock*.12;",
  "  vec2 w=vec2(fbm(vec2(q.y*.3,q.x*.16)+vec2(4.3,-t)),fbm(vec2(q.x*.2,q.y*.34)+vec2(-t*.8,1.7)))-.5;",
  "  q+=w*vec2(1.1,1.6)*u_warp;",
  "  q.x-=u_time;",
  "  float j=floor(q.y);",
  "  vec4 F=flame(q,j-1.);vec4 G=flame(q,j);if(G.x<F.x)F=G;G=flame(q,j+1.);if(G.x<F.x)F=G;",
  "  float dpx=F.x*u_scale;",
  "  vec2 gp=floor(px/u_grainSize);",
  "  float hA=hash(gp+u_frame*17.31);",
  "  float hB=hash(gp*1.37+91.7+u_frame*5.13);",
  "  float g=u_grain;",
  // two inks: deep at the base and the shadowed side, bright through the body and tips
  "  float n=fbm(q*vec2(.9,2.2)+3.1);",
  "  float shade=.02+.66*smoothstep(0.,.6,F.y)-.3*F.z+(n-.5)*.8+(F.w-.5)*.35+heat*.6;",
  "  shade=smoothstep(.12,.88,shade);",
  "  float tone=mix(smoothstep(.4,.6,shade),step(hA,shade),g);",
  "  float cov=mix(clamp(-dpx,0.,1.),step(hB,smoothstep(0.,1.+5.*g,-dpx)),g);",
  "  vec3 fc=mix(u_dark,u_light,tone);",
  "  fc=mix(fc,min(u_light*1.35+.06,vec3(1.)),clamp(heat,0.,1.)*.35*tone);",
  // dash marks drifting in the gaps
  "  float dcov=0.;",
  "  if(u_dashes>0.){",
  "    vec2 cs=vec2(u_len*.3,.42);",
  "    vec2 k=floor(q/cs);",
  "    vec2 lp=(fract(q/cs)-.5)*cs;",
  "    vec2 kid=k+u_seed*13.+vec2(41.,17.);",
  "    if(hash(kid)<u_dashes*.62){",
  "      float h2=hash(kid+.5),h3=hash(kid+1.5),h4=hash(kid+2.5);",
  "      vec2 o=(vec2(h2,h3)-.5)*cs*.45;",
  "      float an=(h4-.5)*.7+(h3>.78?1.35:0.);",
  "      vec2 dv=vec2(cos(an),sin(an))*(.045+.065*h2);",
  "      float th=max(1.1,u_scale*.011)/u_scale;",
  "      float dd=seg(lp-o,dv)-th;",
  "      if(h4>.55)dd=min(dd,seg(lp-o-vec2(-dv.y,dv.x)*1.25,dv*.75)-th);",
  "      if(h2>.8)dd=min(dd,seg(lp-o+vec2(-dv.y,dv.x)*1.25,dv*.6)-th);",
  "      dcov=clamp(.6-dd*u_scale,0.,1.)*mix(1.,step(.2,hB),g)*smoothstep(.04,.12,F.x);",
  "    }",
  "  }",
  "  vec3 col=u_bg+(hA-.5)*.03*g;",
  "  col=mix(col,u_dash,dcov);",
  "  col=mix(col,fc,cov);",
  "  gl_FragColor=vec4(col,1.);",
  "}",
].join("\n")

const CF_CSS = [
  ".cfd-root{position:relative;width:100%;overflow:hidden;isolation:isolate;touch-action:pan-y;-webkit-tap-highlight-color:transparent}",
  ".cfd-canvas{position:absolute;inset:0;width:100%;height:100%;max-width:none;display:block;opacity:0;transition:opacity .6s ease}",
  ".cfd-canvas[data-ready='1']{opacity:1}",
  ".cfd-over{position:absolute;inset:0;pointer-events:none;z-index:1}",
  ".cfd-over a,.cfd-over button,.cfd-over input,.cfd-over select,.cfd-over textarea,.cfd-over label,.cfd-over [data-interactive]{pointer-events:auto}",
  "@media (prefers-reduced-motion:reduce){.cfd-canvas{transition:none}}",
].join("\n")

export default function ColdFlameDrift({
  palette = "ember",
  background,
  light,
  dark,
  dashColor,
  angle = 42,
  scale = 50,
  length = 3.6,
  thickness = 1.04,
  turbulence = 0,
  speed = 4,
  forks = 0.5,
  dashes = 0.32,
  grain = 0.54,
  grainSize = 1,
  boil = true,
  seed = 71,
  interactive = true,
  pointerRadius = 220,
  paused = false,
  height = "100svh",
  className,
  style,
  "aria-label": ariaLabel = "Grainy flames drifting diagonally across a dark field",
  children,
}: ColdFlameDriftProps) {
  const rootRef = React.useRef(null as HTMLDivElement | null)
  const canvasRef = React.useRef(null as HTMLCanvasElement | null)
  const [ready, setReady] = React.useState(false)
  const [failed, setFailed] = React.useState(false)

  const base = PALETTES[palette] || PALETTES.cobalt
  const colors = {
    background: background || base.background,
    light: light || base.light,
    dark: dark || base.dark,
    dashColor: dashColor || base.dashColor,
  }

  // Settings live in a ref so changing a prop never rebuilds the GL context.
  const settings = {
    colors,
    angle,
    scale: clampProp(scale, 24, 600, 50),
    length: clampProp(length, 1, 10, 3.6),
    thickness: clampProp(thickness, 0.2, 2.5, 1.04),
    turbulence: clampProp(turbulence, 0, 3, 0),
    speed: clampProp(speed, 0, 6, 4),
    forks: clampProp(forks, 0, 1, 0.5),
    dashes: clampProp(dashes, 0, 1, 0.32),
    grain: clampProp(grain, 0, 1, 0.54),
    grainSize: clampProp(grainSize, 0.5, 8, 1),
    boil,
    seed: Math.abs(Math.round(clampProp(seed, -1e4, 1e4, 71))) % 1000,
    interactive,
    pointerRadius: clampProp(pointerRadius, 20, 2000, 220),
    paused,
  }
  const opts = React.useRef(settings)
  opts.current = settings
  // A still frame (reduced motion, paused) only redraws when something changes.
  const redraw = React.useRef(() => {})
  React.useEffect(() => {
    redraw.current()
  })

  React.useEffect(() => {
    const root = rootRef.current
    const canvas = canvasRef.current
    if (!root || !canvas) return
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false, preserveDrawingBuffer: false })
    if (!gl) {
      setFailed(true)
      return
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    const compile = (type: number, code: string) => {
      const sh = gl.createShader(type)
      if (!sh) return null
      gl.shaderSource(sh, code)
      gl.compileShader(sh)
      return gl.getShaderParameter(sh, gl.COMPILE_STATUS) ? sh : null
    }
    const vs = compile(gl.VERTEX_SHADER, VERT)
    const fs = compile(gl.FRAGMENT_SHADER, FRAG)
    const prog = gl.createProgram()
    if (!vs || !fs || !prog) {
      setFailed(true)
      return
    }
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      setFailed(true)
      return
    }
    gl.useProgram(prog)
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, "a")
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    const names = [
      "res", "dpr", "time", "clock", "dir", "scale", "len", "width", "warp", "forks", "dashes", "grain", "grainSize",
      "frame", "seed", "bg", "light", "dark", "dash", "mouse", "push", "radius", "burst",
    ]
    const u = {} as { [k: string]: WebGLUniformLocation | null }
    for (const n of names) u[n] = gl.getUniformLocation(prog, "u_" + n)

    let w = 1
    let h = 1
    let dpr = 1
    const resize = () => {
      const r = root.getBoundingClientRect()
      // 1.5x is plenty for grain this fine, and keeps 4K screens off the fan.
      dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      w = Math.max(1, r.width)
      h = Math.max(1, r.height)
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      gl.viewport(0, 0, canvas.width, canvas.height)
      dirty = true
    }

    // m: eased pointer; push: how much it is stoking; boost: extra speed from fast moves
    const m = { x: 0, y: 0, tx: 0, ty: 0, push: 0, boost: 0, inside: false }
    let burst = { x: 0, y: 0, start: -1 }
    const local = (e: PointerEvent) => {
      const r = root.getBoundingClientRect()
      return [e.clientX - r.left, e.clientY - r.top]
    }
    const onMove = (e: PointerEvent) => {
      if (!opts.current.interactive) return
      const [x, y] = local(e)
      if (!m.inside) {
        m.x = x
        m.y = y
      }
      m.boost = Math.min(4, m.boost + Math.hypot(x - m.tx, y - m.ty) / 90)
      m.tx = x
      m.ty = y
      m.inside = true
    }
    const onLeave = () => {
      m.inside = false
    }
    const onDown = (e: PointerEvent) => {
      if (!opts.current.interactive || reduce) return
      const el = e.target as HTMLElement | null
      if (el && el.closest && el.closest("a,button,input,select,textarea,label,[data-interactive]")) return
      const [x, y] = local(e)
      burst = { x, y, start: clock }
      m.boost = Math.min(4, m.boost + 2.5)
    }
    root.addEventListener("pointermove", onMove)
    root.addEventListener("pointerdown", onDown)
    root.addEventListener("pointerleave", onLeave)

    let dirty = true
    let visible = true
    let raf = 0
    let prev = performance.now()
    let clock = 0 // real seconds the field has been running
    let drift = 0 // distance travelled, in rows
    let dead = false
    let shown = false
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(root)

    const draw = () => {
      const o = opts.current
      const c = o.colors
      const [dx, dy] = flowDir(o.angle)
      gl.uniform2f(u.res, w, h)
      gl.uniform1f(u.dpr, dpr)
      gl.uniform1f(u.time, drift)
      gl.uniform1f(u.clock, clock)
      gl.uniform2f(u.dir, dx, dy)
      gl.uniform1f(u.scale, o.scale)
      gl.uniform1f(u.len, o.length)
      gl.uniform1f(u.width, o.thickness)
      gl.uniform1f(u.warp, o.turbulence)
      gl.uniform1f(u.forks, o.forks)
      gl.uniform1f(u.dashes, o.dashes)
      gl.uniform1f(u.grain, o.grain)
      gl.uniform1f(u.grainSize, o.grainSize)
      gl.uniform1f(u.frame, o.boil && !reduce ? boilFrame(clock, 12) : 0)
      gl.uniform1f(u.seed, o.seed)
      gl.uniform3f(u.bg, ...hexToRgb(c.background, [0.01, 0.02, 0.03]))
      gl.uniform3f(u.light, ...hexToRgb(c.light, [0.11, 0.6, 0.84]))
      gl.uniform3f(u.dark, ...hexToRgb(c.dark, [0.04, 0.35, 0.55]))
      gl.uniform3f(u.dash, ...hexToRgb(c.dashColor, [0.06, 0.42, 0.64]))
      gl.uniform2f(u.mouse, m.x, m.y)
      gl.uniform1f(u.push, m.push)
      gl.uniform1f(u.radius, o.pointerRadius)
      const age = burst.start < 0 ? -1 : clock - burst.start
      gl.uniform3f(u.burst, burst.x, burst.y, age >= 0 && age < 1.2 ? age : -1)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      dirty = false
      if (!shown) {
        shown = true
        setReady(true)
      }
    }
    redraw.current = () => {
      dirty = true
      if (!raf && visible && !dead) raf = requestAnimationFrame(frame)
    }

    const frame = (now: number) => {
      raf = 0
      if (!visible || dead) return
      const dt = Math.min(0.05, (now - prev) / 1000)
      prev = now
      const o = opts.current
      const still = reduce || o.paused
      if (!still) {
        m.x = approach(m.x, m.tx, dt, 9)
        m.y = approach(m.y, m.ty, dt, 9)
        m.push = approach(m.push, m.inside && o.interactive ? 1 : 0, dt, m.inside ? 5 : 2.5)
        m.boost = approach(m.boost, 0, dt, 2.2)
        clock += dt
        // rows per second: an unhurried drift, quickened while the pointer stokes it
        drift += dt * o.speed * 0.16 * (1 + m.boost * 0.9)
        draw()
      } else if (dirty) {
        draw()
      }
      if (!still) raf = requestAnimationFrame(frame)
    }

    const io = new IntersectionObserver(([en]) => {
      visible = en.isIntersecting
      if (visible && !raf) {
        prev = performance.now()
        raf = requestAnimationFrame(frame)
      }
    })
    io.observe(root)
    raf = requestAnimationFrame(frame)

    return () => {
      dead = true
      redraw.current = () => {}
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      root.removeEventListener("pointermove", onMove)
      root.removeEventListener("pointerdown", onDown)
      root.removeEventListener("pointerleave", onLeave)
      gl.deleteBuffer(buf)
      gl.deleteProgram(prog)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      setReady(false)
    }
  }, [])

  // Without WebGL: the same inks as soft diagonal bands, so the slot never reads empty.
  const band = Math.round(settings.scale)
  const fallback = failed
    ? "repeating-linear-gradient(" + -angle + "deg," + colors.background + " 0 " + Math.round(band * 0.45) + "px," +
      colors.dark + " " + Math.round(band * 0.45) + "px " + Math.round(band * 0.62) + "px," +
      colors.light + " " + Math.round(band * 0.62) + "px " + band + "px)"
    : undefined

  return (
    <div
      ref={rootRef}
      className={["cfd-root", className].filter(Boolean).join(" ")}
      style={{ height, background: fallback || colors.background, ...style }}
      role="img"
      aria-label={ariaLabel}
    >
      <style>{CF_CSS}</style>
      <canvas ref={canvasRef} className="cfd-canvas" data-ready={ready ? "1" : "0"} aria-hidden="true" />
      {children ? <div className="cfd-over">{children}</div> : null}
    </div>
  )
}

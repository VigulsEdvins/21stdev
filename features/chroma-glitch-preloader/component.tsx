"use client"

// Chroma Glitch Preloader: heavy chromatic aberration tearing colour apart at the edges.
// One of a family; the shared engine is identical, only the defaults differ.

import * as React from "react"

/** Post-processing looks for the background plate. */
export type ChromaGlitchShaderPreset =
  | "cinema"
  | "chroma"
  | "highcontrast"
  | "subtle"
  | "off"

export interface ChromaGlitchGrade {
  /** Chromatic aberration strength (0 = none, ~3 = heavy glitch) */
  chroma: number
  /** Film grain intensity (0 to ~0.5) */
  grain: number
  /** CRT scanline strength (0 = none, 1 = full raster) */
  scanlines: number
  /** Contrast multiplier around mid-grey (1 = untouched) */
  contrast: number
  /** Collapse to a high-contrast luminance grade */
  monochrome: boolean
}

const PRESETS: Record<Exclude<ChromaGlitchShaderPreset, "off">, ChromaGlitchGrade> = {
  cinema: { chroma: 0.8, grain: 0.15, scanlines: 0.8, contrast: 1.4, monochrome: false },
  chroma: { chroma: 2.8, grain: 0.22, scanlines: 1.0, contrast: 1.6, monochrome: false },
  highcontrast: { chroma: 0.5, grain: 0.2, scanlines: 0.6, contrast: 2.2, monochrome: true },
  subtle: { chroma: 0.1, grain: 0.05, scanlines: 0.0, contrast: 1.1, monochrome: false },
}

export interface ChromaGlitchPreloaderProps {
  /** Content revealed once the gate lifts. Ignored while `loop` is set. */
  children?: React.ReactNode
  /** Word tumbled through the 3D cube, one letter per face */
  word?: string
  /**
   * Background reel. Must send CORS headers for the shader to sample it.
   * Pass an empty string to run the shader on its procedural film plate instead.
   */
  videoSrc?: string
  /** Post-processing look. "off" skips WebGL and shows the raw video. */
  shaderPreset?: ChromaGlitchShaderPreset
  /** Per-knob overrides layered on top of shaderPreset */
  grade?: Partial<ChromaGlitchGrade>
  /**
   * Run forever: on reaching 100% the counter drops away, then the whole
   * sequence restarts. `children` are never revealed and `onComplete` never
   * fires. Leave it off to use this as a real page gate.
   */
  loop?: boolean
  /** Total runtime in ms. Defaults to a length derived from word (min 3200ms). */
  durationMs?: number
  /** Choreography multiplier - 2 runs the whole thing twice as fast */
  speed?: number
  /** Cube edge length, and so the letter size. Drops to 64px under 840px wide. */
  cubeSize?: string
  /** Root height. A definite length - never a percentage. */
  height?: string
  /** Fired once, when the gate has finished lifting. Never fires while looping. */
  onComplete?: () => void
  /** Extra root class names */
  className?: string
}

/** The five tumble patterns, cycled across the letters. */
const TUMBLE_CLASSES = [
  "tcp-firstChar",
  "tcp-fromBottomOutRight",
  "tcp-fromLeftOutTop",
  "tcp-fromBottomOutLeft",
  "tcp-fromRightOutTop",
] as const

// #region progress
// Integer milliseconds: 6 * 0.6 + 0.6 is not exactly 4.2 in binary floating
// point, and the drift leaks into both the timers and the CSS delay strings.
const STEP_DELAY_MS = 600
const CHAR_DURATION_MS = 1200

/**
 * Fast rise, a stall in the 42-48% band the way a real asset queue behaves,
 * then a surge to 100. Monotonic by construction: a loading counter that
 * ticks backwards reads as broken.
 */
export function preloaderProgress(t: number): number {
  const p = Math.min(1, Math.max(0, t))

  // rise, decelerating into the stall
  if (p < 0.35) return Math.round(42 * (1 - Math.pow(1 - p / 0.35, 2.2)))

  // the stall
  if (p < 0.75) return Math.round(42 + 6 * ((p - 0.35) / 0.4))

  // the surge
  const s = (p - 0.75) / 0.25
  return Math.round(48 + 52 * (s * s * (3 - 2 * s)))
}

/** Runtime the cube needs to tumble every letter through, in ms. */
export function preloaderDuration(wordLength: number, speed = 1): number {
  return Math.max(3200, wordLength * STEP_DELAY_MS + STEP_DELAY_MS) / speed
}
// #endregion

const VERTEX_SRC = `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() {
  v_uv = (a_position + 1.0) * 0.5;
  v_uv.y = 1.0 - v_uv.y;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`

const FRAGMENT_SRC = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_video;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_videoSize;
uniform float u_chroma;
uniform float u_grain;
uniform float u_scanlines;
uniform float u_contrast;
uniform int u_mono;
uniform int u_hasVideo;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233) + fract(u_time))) * 43758.5453123);
}

// Stand-in plate for when no reel is supplied, or the reel has not arrived yet.
// Slow drifting luma, so the grain and scanlines have something to bite on.
vec3 plate(vec2 uv) {
  float a = sin(uv.x * 3.0 + u_time * 0.15) * cos(uv.y * 4.0 - u_time * 0.11);
  float b = sin(length(uv - vec2(0.5 + 0.2 * sin(u_time * 0.07), 0.5)) * 9.0 - u_time * 0.5);
  return vec3(0.22 + 0.18 * a + 0.12 * b);
}

vec3 sampleSource(vec2 uv) {
  if (u_hasVideo == 1) return texture(u_video, uv).rgb;
  return plate(uv);
}

void main() {
  vec2 uv = v_uv;

  // object-fit: cover, so the reel is never stretched
  float screenAspect = u_resolution.x / max(u_resolution.y, 1.0);
  float videoAspect = u_videoSize.x / max(u_videoSize.y, 1.0);
  vec2 uvCover = uv;
  if (screenAspect > videoAspect) {
    uvCover.y = (uv.y - 0.5) * (videoAspect / screenAspect) + 0.5;
  } else {
    uvCover.x = (uv.x - 0.5) * (screenAspect / videoAspect) + 0.5;
  }

  vec2 distFromCenter = uvCover - 0.5;
  float dist = dot(distFromCenter, distFromCenter);
  vec2 chromaOffset = distFromCenter * (u_chroma * (0.015 + dist * 0.035));

  vec3 color = vec3(
    sampleSource(uvCover + chromaOffset).r,
    sampleSource(uvCover).g,
    sampleSource(uvCover - chromaOffset).b
  );

  if (u_mono == 1) {
    float lum = dot(color, vec3(0.299, 0.587, 0.114));
    color = vec3(clamp((lum - 0.5) * u_contrast + 0.5, 0.0, 1.0));
  } else {
    color = (color - 0.5) * u_contrast + 0.5;
  }

  if (u_scanlines > 0.0) {
    float scan = sin(uv.y * u_resolution.y * 0.75) * 0.5 + 0.5;
    color *= (1.0 - u_scanlines * 0.25 * scan);
  }

  color += (hash(uv * u_resolution.xy) - 0.5) * u_grain;
  color *= 1.0 - smoothstep(0.4, 1.4, length(distFromCenter) * 1.5);

  fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}`

// Scoped to .tcp-root, so installing this never restyles the host app.
// No interpolation in here - dynamic values arrive as CSS custom properties.
const TCP_CSS = `
.tcp-root, .tcp-root * { box-sizing: border-box; -webkit-font-smoothing: antialiased; }
.tcp-root { user-select: none; }

.tcp-dest {
  position: absolute; inset: 0; width: 100%; height: 100%;
  opacity: 0; transform: scale(0.96); pointer-events: none;
  transition: opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1), transform 1.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.tcp-dest[data-active="true"] { opacity: 1; transform: scale(1); pointer-events: auto; }

.tcp-clipper {
  position: absolute; inset: 0; z-index: 100;
  background: #000; overflow: hidden; opacity: 1;
  transition: opacity 0.75s cubic-bezier(0.87, 0, 0.13, 1);
}
.tcp-clipper[data-exited="true"] { opacity: 0; pointer-events: none; }

/* Tailwind Preflight sets height:auto and max-width:100% on video and canvas,
   which collapses them to nothing inside an absolutely-positioned parent. */
.tcp-root video, .tcp-root canvas {
  position: absolute; inset: 0; width: 100%; height: 100%;
  max-width: none; object-fit: cover; display: block;
}
.tcp-root video { z-index: 5; }
.tcp-root canvas { z-index: 10; pointer-events: none; }
.tcp-root video[data-textured="true"] { opacity: 0; pointer-events: none; }

.tcp-wrapper { position: absolute; inset: 0; z-index: 30; mix-blend-mode: difference; pointer-events: none; }

.tcp-scene {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
  width: var(--tcp-cube); height: var(--tcp-cube);
  perspective: 800px; display: flex; align-items: center; justify-content: center; z-index: 35;
}
.tcp-cube {
  position: relative; width: 100%; height: 100%;
  font-family: "Saira Extra Condensed", "Sofia Sans Extra Condensed", "Oswald", "Archivo Narrow", Impact, Haettenschweiler, sans-serif;
  font-size: var(--tcp-cube); font-weight: 900; font-stretch: extra-condensed;
  color: #f6f6f6; transform-style: preserve-3d; transform: scaleY(1.3); transform-origin: center;
}
.tcp-char {
  position: absolute; inset: 0; width: 100%; height: 100%; line-height: 1;
  display: flex; align-items: center; justify-content: center;
  opacity: 0; backface-visibility: hidden;
}
.tcp-char span {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
  display: block; line-height: 0.8; font-stretch: extra-condensed;
}

@keyframes tcpFirstChar {
  0% { opacity: 0; transform: translateX(100%) rotateY(90deg) rotateX(0deg); }
  50% { opacity: 1; transform: translateX(0) rotateY(0deg) rotateX(0deg); }
  100% { opacity: 0.5; transform: translateY(-100%) rotateY(0deg) rotateX(90deg); }
}
@keyframes tcpFromBottomOutRight {
  0% { opacity: 0; transform: translateY(100%) rotateY(0deg) rotateX(-90deg); }
  50% { opacity: 1; transform: translateY(0) rotateY(0deg) rotateX(0deg); }
  100% { opacity: 0.5; transform: translateX(100%) rotateY(90deg) rotateX(0deg); }
}
@keyframes tcpFromLeftOutTop {
  0% { opacity: 0; transform: translateX(-100%) rotateY(-90deg) rotateX(0deg); }
  50% { opacity: 1; transform: translateX(0) rotateY(0deg) rotateX(0deg); }
  100% { opacity: 0.5; transform: translateY(-100%) rotateY(0deg) rotateX(90deg); }
}
@keyframes tcpFromBottomOutLeft {
  0% { opacity: 0; transform: translateY(100%) rotateY(0deg) rotateX(-90deg); }
  50% { opacity: 1; transform: translateY(0) rotateY(0deg) rotateX(0deg); }
  100% { opacity: 0.5; transform: translateX(-100%) rotateY(-90deg) rotateX(0deg); }
}
@keyframes tcpFromRightOutTop {
  0% { opacity: 0; transform: translateX(100%) rotateY(90deg) rotateX(0deg); }
  50% { opacity: 1; transform: translateX(0) rotateY(0deg) rotateX(0deg); }
  100% { opacity: 0.5; transform: translateY(-100%) rotateY(0deg) rotateX(90deg); }
}

.tcp-firstChar { animation-name: tcpFirstChar; transform-origin: left bottom; }
.tcp-fromBottomOutRight { animation-name: tcpFromBottomOutRight; transform-origin: left top; }
.tcp-fromLeftOutTop { animation-name: tcpFromLeftOutTop; transform-origin: right bottom; }
.tcp-fromBottomOutLeft { animation-name: tcpFromBottomOutLeft; transform-origin: right top; }
.tcp-fromRightOutTop { animation-name: tcpFromRightOutTop; transform-origin: left bottom; }

.tcp-perc {
  position: absolute; top: calc(50% + 72px); left: 0; width: 100%;
  display: flex; justify-content: center; align-items: center;
  font-size: 13px; font-weight: 700; letter-spacing: 0.06em; color: #f6f6f6; z-index: 40;
  /* Slow on the way out, quick on the way back: the exit is the beat, but a
     matching 0.8s return left the screen empty while the first letter tumbled. */
  transition: opacity 0.25s ease;
}
.tcp-perc[data-exiting="true"] {
  opacity: 0;
  transition: opacity 0.8s cubic-bezier(0.87, 0, 0.13, 1);
}
/* The slide has to happen on an inner span inside a clipped box. On the
   container, translateY(100%) resolves against one line of text and the
   counter just nudges 20px instead of leaving the frame. */
.tcp-perc-mask { display: inline-flex; overflow: hidden; }
.tcp-perc-inner {
  display: inline-block;
  transition: transform 0.25s ease;
}
.tcp-perc[data-exiting="true"] .tcp-perc-inner {
  transform: translate3d(0, 110%, 0);
  transition: transform 0.8s cubic-bezier(0.87, 0, 0.13, 1);
}
.tcp-perc-value { min-width: 26px; text-align: right; }

@media (max-width: 840px) {
  .tcp-scene { --tcp-cube: 64px; }
}

@media (prefers-reduced-motion: reduce) {
  .tcp-root .tcp-char { animation: none !important; opacity: 0 !important; transform: none !important; }
  .tcp-root .tcp-char:first-child { opacity: 1 !important; }
  .tcp-root .tcp-dest, .tcp-root .tcp-clipper, .tcp-root .tcp-perc { transition: none !important; }
}
`

export default function ChromaGlitchPreloader({
  children,
  word = "GLITCH",
  videoSrc = "https://mdn.github.io/shared-assets/videos/flower.mp4",
  shaderPreset = "chroma",
  grade,
  loop = false,
  durationMs,
  speed = 1,
  cubeSize = "88px",
  height = "100svh",
  onComplete,
  className = "",
}: ChromaGlitchPreloaderProps) {
  const [progress, setProgress] = React.useState(0)
  const [phase, setPhase] = React.useState<"loading" | "exiting" | "unlocked">("loading")
  // Bumped on every loop; remounting the cube is what restarts the CSS animations.
  const [cycle, setCycle] = React.useState(0)
  const [reducedMotion, setReducedMotion] = React.useState(false)
  // Only true once the GL program is actually live. The raw video stays
  // visible until then, so a browser without WebGL2 shows footage rather
  // than a blank canvas over a hidden video.
  const [glReady, setGlReady] = React.useState(false)

  const videoRef = React.useRef<HTMLVideoElement | null>(null)
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)

  // Held in a ref so an inline arrow prop cannot restart the run: the progress
  // loop re-renders ~60x/s, and a dependency on onComplete identity would
  // tear down and restart the whole thing on every single frame.
  const onCompleteRef = React.useRef(onComplete)
  onCompleteRef.current = onComplete

  const resolvedGrade = React.useMemo<ChromaGlitchGrade>(
    () => ({ ...(shaderPreset === "off" ? PRESETS.subtle : PRESETS[shaderPreset]), ...grade }),
    [shaderPreset, grade],
  )
  // Same reason: the grade changes without rebuilding the GL program.
  const gradeRef = React.useRef(resolvedGrade)
  gradeRef.current = resolvedGrade

  const letters = React.useMemo(() => word.toUpperCase().split(""), [word])
  const runtime = durationMs ?? preloaderDuration(letters.length, speed)
  const shaderOn = shaderPreset !== "off"

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReducedMotion(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  // WebGL2 post-processing. Silently yields to the raw video if unavailable.
  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !shaderOn || reducedMotion) return

    const gl = canvas.getContext("webgl2", { alpha: false, antialias: true })
    if (!gl) return

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)
      if (!s) return null
      gl.shaderSource(s, src)
      gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        gl.deleteShader(s)
        return null
      }
      return s
    }

    const vs = compile(gl.VERTEX_SHADER, VERTEX_SRC)
    const fs = compile(gl.FRAGMENT_SHADER, FRAGMENT_SRC)
    const prog = gl.createProgram()
    if (!vs || !fs || !prog) return
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return
    setGlReady(true)

    const posAttr = gl.getAttribLocation(prog, "a_position")
    const posBuf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    )

    const u = (name: string) => gl.getUniformLocation(prog, name)
    const loc = {
      video: u("u_video"),
      time: u("u_time"),
      res: u("u_resolution"),
      videoSize: u("u_videoSize"),
      chroma: u("u_chroma"),
      grain: u("u_grain"),
      scanlines: u("u_scanlines"),
      contrast: u("u_contrast"),
      mono: u("u_mono"),
      hasVideo: u("u_hasVideo"),
    }

    const texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

    // Sized off the canvas box, not the window: an installed page may well
    // render this at something other than full-viewport.
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const resize = () => {
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr))
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()

    let raf = 0
    let destroyed = false
    let textured = false
    let t = 0

    const render = () => {
      if (destroyed) return
      t += 0.016
      const video = videoRef.current

      // A reel that is slow, blocked or missing must not leave a black hole:
      // the shader keeps drawing its procedural plate until frames arrive.
      if (video && video.readyState >= 2 && video.videoWidth > 0) {
        try {
          gl.bindTexture(gl.TEXTURE_2D, texture)
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video)
          textured = true
        } catch {
          textured = false // cross-origin reel served without CORS headers
        }
      }

      const g = gradeRef.current
      gl.useProgram(prog)
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuf)
      gl.enableVertexAttribArray(posAttr)
      gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0)

      gl.uniform1i(loc.video, 0)
      gl.uniform1f(loc.time, t)
      gl.uniform2f(loc.res, canvas.width, canvas.height)
      gl.uniform2f(
        loc.videoSize,
        textured && video ? video.videoWidth : canvas.width,
        textured && video ? video.videoHeight : canvas.height,
      )
      gl.uniform1f(loc.chroma, g.chroma)
      gl.uniform1f(loc.grain, g.grain)
      gl.uniform1f(loc.scanlines, g.scanlines)
      gl.uniform1f(loc.contrast, g.contrast)
      gl.uniform1i(loc.mono, g.monochrome ? 1 : 0)
      gl.uniform1i(loc.hasVideo, textured ? 1 : 0)

      gl.drawArrays(gl.TRIANGLES, 0, 6)
      raf = requestAnimationFrame(render)
    }
    raf = requestAnimationFrame(render)

    return () => {
      destroyed = true
      setGlReady(false)
      cancelAnimationFrame(raf)
      ro.disconnect()
      gl.deleteProgram(prog)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      gl.deleteTexture(texture)
      gl.deleteBuffer(posBuf)
    }
  }, [shaderOn, reducedMotion])

  // Autoplay can be refused; the plate covers that case too. A moving reel is
  // itself motion, so reduced motion leaves it paused.
  React.useEffect(() => {
    if (reducedMotion) return
    videoRef.current?.play().catch(() => {})
  }, [videoSrc, reducedMotion])

  // Progress counter, then either the exit choreography or the next cycle.
  React.useEffect(() => {
    if (reducedMotion) {
      setProgress(100)
      if (!loop) {
        setPhase("unlocked")
        onCompleteRef.current?.()
      }
      return
    }

    setProgress(0)
    setPhase("loading")

    const start = Date.now()
    let raf = 0
    const timers: ReturnType<typeof setTimeout>[] = []

    const update = () => {
      const t = Math.min(1, (Date.now() - start) / runtime)
      setProgress(preloaderProgress(t))
      if (t < 1) {
        raf = requestAnimationFrame(update)
        return
      }
      setProgress(100)
      timers.push(setTimeout(() => setPhase("exiting"), 250 / speed))

      if (loop) {
        // Let the counter drop away, hold a beat, then run it again. The
        // shader never fades, so the plate is continuous across cycles.
        timers.push(setTimeout(() => setCycle((c) => c + 1), 250 / speed + 900))
        return
      }
      // 550ms to start the gate fade, plus its own 750ms transition
      timers.push(
        setTimeout(() => {
          setPhase("unlocked")
          onCompleteRef.current?.()
        }, 550 / speed + 750),
      )
    }
    raf = requestAnimationFrame(update)

    return () => {
      cancelAnimationFrame(raf)
      timers.forEach(clearTimeout)
    }
  }, [runtime, speed, reducedMotion, loop, cycle])

  const charDurationSec = CHAR_DURATION_MS / speed / 1000
  const stepDelaySec = STEP_DELAY_MS / speed / 1000
  const exiting = phase !== "loading"

  return (
    <div
      className={"tcp-root relative w-full overflow-hidden bg-black text-[#f6f6f6] " + className}
      style={
        {
          height,
          fontFamily: "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
          "--tcp-cube": cubeSize,
        } as React.CSSProperties
      }
    >
      <style>{TCP_CSS}</style>

      {!loop && (
        <div className="tcp-dest" data-active={phase === "unlocked"}>
          {children}
        </div>
      )}

      {phase !== "unlocked" && (
        <div className="tcp-clipper" data-exited={!loop && phase === "exiting"}>
          {videoSrc ? (
            <video
              ref={videoRef}
              src={videoSrc}
              width={1920}
              height={1080}
              autoPlay={!reducedMotion}
              loop
              muted
              playsInline
              crossOrigin="anonymous"
              data-textured={glReady}
            />
          ) : null}

          {shaderOn && !reducedMotion && <canvas ref={canvasRef} aria-hidden="true" />}

          <div
            className="tcp-wrapper"
            role="progressbar"
            aria-label="Loading"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <div className="tcp-scene">
              {/* keyed on the cycle, so every loop restarts the CSS animations */}
              <div className="tcp-cube" key={cycle}>
                {letters.map((char, i) => (
                  <div
                    key={String(i) + char}
                    className={"tcp-char " + TUMBLE_CLASSES[i % TUMBLE_CLASSES.length]}
                    style={{
                      animationDuration: charDurationSec.toFixed(2) + "s",
                      animationDelay: (i * stepDelaySec).toFixed(2) + "s",
                      animationTimingFunction: "cubic-bezier(0.83, 0, 0.17, 1)",
                      animationFillMode: i === letters.length - 1 ? "forwards" : "both",
                    }}
                  >
                    <span>{char}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="tcp-perc" data-exiting={exiting}>
              <span className="tcp-perc-mask">
                <span className="tcp-perc-inner tcp-perc-value">{progress}</span>
              </span>
              <span className="tcp-perc-mask">
                <span className="tcp-perc-inner">%</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

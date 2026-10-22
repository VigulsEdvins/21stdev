"use client"

// A curtain of punched-tape strips hung in front of a picture. Idle, the
// strips hang grey and ragged over a dimmed image, with a play button. Move
// over it and the strips part around the pointer like a bead curtain, hinged
// at the top. Press play and the music starts, the strips turn to your colour,
// the picture brightens and the whole curtain swings open from the middle,
// swaying with the beat — so you watch the image, not just peek through holes.
//
// The music is an original groove synthesized live with Web Audio (no file,
// no network), or any audio file you pass as `audioSrc`.
//
// No dependencies, no assets. React is the only import.

import React from "react"

export type PerforatedStripeCurtainProps = {
  /** Must be a definite length — the canvas fills this box. */
  height?: string
  /** Number of strips. */
  strips?: number
  /** Strip colour while playing. */
  stripColor?: string
  /** Strip colour while idle. */
  idleColor?: string
  /** Page colour behind the curtain. */
  background?: string
  /** Glow colour washed over the picture while playing. */
  lightColor?: string
  /** The picture behind the curtain. Omit to use a painted landscape. */
  image?: string
  /** Palette of the painted landscape when there's no `image`. */
  backdrop?: "dawn" | "alpine" | "dusk" | "mist"
  /** Swing the curtain open while the music plays. */
  openOnPlay?: boolean
  /** Words shown over the picture, one per bar while playing. Empty = none. */
  captions?: string[]
  /** Small label, bottom-left. Empty hides it. */
  title?: string
  /** Small line, bottom-right. Empty hides it. */
  credit?: string
  /** An audio file to react to instead of the built-in groove (same-origin or CORS-enabled). */
  audioSrc?: string
  /** Tempo of the built-in groove. */
  bpm?: number
  /** 0–1. */
  volume?: number
  /** Strips swing aside around the pointer. */
  interactive?: boolean
  onPlayChange?: (playing: boolean) => void
  maxDpr?: number
  className?: string
}

/* ------------------------------------------------------------------ logic */

// #region logic
function clamp(v: number, a: number, b: number): number {
  return Math.min(b, Math.max(a, v))
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// resting length of each strip, 0–1 of the height: long and ragged, never even
function restLengths(n: number, seed = 7): number[] {
  const r = mulberry32(seed)
  const out: number[] = []
  for (let i = 0; i < n; i++) {
    const wave = 0.5 + 0.5 * Math.sin(i * 0.9 + 1.3)
    out.push(clamp(0.8 + 0.07 * wave + (r() < 0.3 ? 0.06 : 0) * r(), 0.72, 0.95))
  }
  return out
}

// how far a strip swings away from the pointer, in radians (signed). A real
// parting: wide reach, up to ~30° at the hem, strongest low on the curtain.
function swingFor(stripX: number, pointerX: number, pointerY: number, height: number, reach: number): number {
  if (!(pointerY >= 0) || pointerY > height * 1.05) return 0
  const dx = stripX - pointerX
  const d = Math.abs(dx)
  if (d >= reach) return 0
  const fall = 1 - d / reach
  const depth = clamp(pointerY / height, 0.2, 1)
  return Math.sign(dx || 1) * 0.55 * Math.pow(fall, 1.4) * depth
}

// the curtain opening from the middle: strip i of n swings outward by up to
// `max` radians, the centre strips most, the edges barely
function openAngle(i: number, n: number, open: number, max = 0.62): number {
  if (n < 2 || open <= 0) return 0
  const c = (n - 1) / 2
  const u = (i - c) / c // -1 … 1
  if (u === 0) return 0
  return Math.sign(u) * max * clamp(open, 0, 1) * Math.pow(1 - Math.abs(u), 0.55) * Math.min(1, Math.abs(u) * 6)
}

// 16-step patterns for the built-in groove (an original riff)
const KICK = [1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 1, 0, 1, 0, 0, 0]
const SNARE = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1]
const HAT = [0, 0, 1, 0, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 1, 0]
// semitones from A1, -1 = rest; two bars
const BASS = [0, -1, 0, 3, -1, 5, 7, -1, 5, -1, 3, 0, -1, 10, 7, 5, 0, -1, 0, 3, -1, 5, 7, -1, 8, 7, 5, -1, 3, -1, 2, 3]
function noteHz(semi: number): number {
  return 55 * Math.pow(2, semi / 12)
}
// #endregion logic

/* -------------------------------------------------------------- component */

export default function PerforatedStripeCurtain({
  height = "100svh",
  strips = 22,
  stripColor = "#f4f3ef",
  idleColor = "#8d8d8b",
  background = "#0b0b0c",
  lightColor = "#d21f1f",
  image,
  backdrop = "dusk",
  openOnPlay = true,
  captions = [],
  title = "WHITE STRIPES · LIVE",
  credit = "Press play — the curtain listens.",
  audioSrc,
  bpm = 124,
  volume = 0.7,
  interactive = true,
  onPlayChange,
  maxDpr = 2,
  className = "",
}: PerforatedStripeCurtainProps) {
  const rootRef = React.useRef(null as HTMLDivElement | null)
  const canvasRef = React.useRef(null as HTMLCanvasElement | null)
  const [playing, setPlaying] = React.useState(false)
  const [reduced, setReduced] = React.useState(false)
  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const on = () => setReduced(mq.matches)
    on()
    mq.addEventListener?.("change", on)
    return () => mq.removeEventListener?.("change", on)
  }, [])

  const n = clamp(Math.round(strips), 4, 64)
  const st = React.useRef({
    n,
    ang: [] as number[],
    angVel: [] as number[],
    rest: [] as number[],
    px: -1,
    py: -1,
    on: 0,
    beat: 0,
    bar: 0,
    level: 0,
    visible: true,
    playing: false,
    reduced: false,
    colors: { stripColor, idleColor, background, lightColor },
    captions,
    analyser: null as AnalyserNode | null,
    freq: null as Uint8Array | null,
    img: null as HTMLImageElement | HTMLCanvasElement | null,
    open: 0,
    openOnPlay,
  })
  const s0 = st.current
  s0.colors = { stripColor, idleColor, background, lightColor }
  s0.captions = captions
  s0.playing = playing
  s0.reduced = reduced
  s0.openOnPlay = openOnPlay
  if (s0.n !== n || s0.rest.length !== n) {
    s0.n = n
    s0.rest = restLengths(n)
    s0.ang = new Array(n).fill(0)
    s0.angVel = new Array(n).fill(0)
  }

  const interactiveRef = React.useRef(interactive)
  interactiveRef.current = interactive

  React.useEffect(() => {
    const s = st.current
    if (!image) {
      s.img = paintBackdrop(backdrop)
      return
    }
    let alive = true
    const el = new Image()
    el.crossOrigin = "anonymous"
    el.decoding = "async"
    el.onload = () => {
      if (alive) s.img = el
    }
    el.onerror = () => {
      if (alive) s.img = paintBackdrop(backdrop)
    }
    el.src = image
    return () => {
      alive = false
    }
  }, [image, backdrop])

  /* ------------------------------------------------------------- audio */
  const audio = React.useRef({
    ctx: null as AudioContext | null,
    master: null as GainNode | null,
    el: null as HTMLAudioElement | null,
    timer: 0,
    step: 0,
    nextAt: 0,
  })

  const stopAudio = React.useCallback(() => {
    const a = audio.current
    window.clearInterval(a.timer)
    a.timer = 0
    a.el?.pause()
    a.ctx?.suspend().catch(() => {})
  }, [])

  const startAudio = React.useCallback(async () => {
    const a = audio.current
    const s = st.current
    const AC = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext) as typeof AudioContext | undefined
    if (!AC) return
    if (!a.ctx) {
      a.ctx = new AC()
      a.master = a.ctx.createGain()
      const analyser = a.ctx.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.72
      a.master.connect(analyser)
      analyser.connect(a.ctx.destination)
      s.analyser = analyser
      s.freq = new Uint8Array(analyser.frequencyBinCount)
    }
    const ctx = a.ctx
    const master = a.master as GainNode
    master.gain.value = clamp(volume, 0, 1)
    await ctx.resume().catch(() => {})

    if (audioSrc) {
      if (!a.el) {
        const el = new Audio()
        el.crossOrigin = "anonymous"
        el.loop = true
        el.src = audioSrc
        ctx.createMediaElementSource(el).connect(master)
        a.el = el
      }
      await a.el.play().catch(() => {})
      return
    }

    /* the built-in groove: a lookahead scheduler, 16th notes */
    const sixteenth = 60 / clamp(bpm, 60, 200) / 4
    a.nextAt = ctx.currentTime + 0.06
    const noise = (() => {
      const b = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate)
      const d = b.getChannelData(0)
      const r = mulberry32(3)
      for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1
      return b
    })()
    const kick = (t: number) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.frequency.setValueAtTime(150, t)
      o.frequency.exponentialRampToValueAtTime(42, t + 0.12)
      g.gain.setValueAtTime(0.95, t)
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.32)
      o.connect(g).connect(master)
      o.start(t)
      o.stop(t + 0.34)
    }
    const hit = (t: number, dur: number, gain: number, type: "highpass" | "bandpass", f: number) => {
      const src = ctx.createBufferSource()
      src.buffer = noise
      const filt = ctx.createBiquadFilter()
      filt.type = type
      filt.frequency.value = f
      const g = ctx.createGain()
      g.gain.setValueAtTime(gain, t)
      g.gain.exponentialRampToValueAtTime(0.001, t + dur)
      src.connect(filt).connect(g).connect(master)
      src.start(t)
      src.stop(t + dur + 0.02)
    }
    const bass = (t: number, semi: number, dur: number) => {
      const o = ctx.createOscillator()
      const o2 = ctx.createOscillator()
      const filt = ctx.createBiquadFilter()
      const g = ctx.createGain()
      o.type = "sawtooth"
      o2.type = "square"
      o.frequency.value = noteHz(semi)
      o2.frequency.value = noteHz(semi) / 2
      filt.type = "lowpass"
      filt.frequency.setValueAtTime(900, t)
      filt.frequency.exponentialRampToValueAtTime(180, t + dur)
      filt.Q.value = 6
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.32, t + 0.012)
      g.gain.exponentialRampToValueAtTime(0.001, t + dur)
      o.connect(filt)
      o2.connect(filt)
      filt.connect(g).connect(master)
      o.start(t)
      o2.start(t)
      o.stop(t + dur + 0.02)
      o2.stop(t + dur + 0.02)
    }
    const tick = () => {
      while (a.nextAt < ctx.currentTime + 0.12) {
        const i = a.step % 16
        const t = a.nextAt
        if (KICK[i]) {
          kick(t)
          window.setTimeout(() => (st.current.beat = 1), Math.max(0, (t - ctx.currentTime) * 1000))
        }
        if (SNARE[i]) hit(t, 0.18, 0.5, "bandpass", 1800)
        if (HAT[i]) hit(t, 0.05, 0.22, "highpass", 7000)
        const b = BASS[a.step % BASS.length]
        if (b >= 0) bass(t, b, sixteenth * 1.7)
        if (i === 0) window.setTimeout(() => (st.current.bar += 1), Math.max(0, (t - ctx.currentTime) * 1000))
        a.step += 1
        a.nextAt += sixteenth
      }
    }
    tick()
    a.timer = window.setInterval(tick, 25)
  }, [audioSrc, bpm, volume])

  const toggle = () => {
    const next = !playing
    if (next) startAudio()
    else stopAudio()
    setPlaying(next)
    onPlayChange?.(next)
  }

  React.useEffect(() => {
    if (audio.current.master) audio.current.master.gain.value = clamp(volume, 0, 1)
  }, [volume])

  React.useEffect(() => {
    const a = audio.current
    return () => {
      window.clearInterval(a.timer)
      a.el?.pause()
      a.ctx?.close().catch(() => {})
    }
  }, [])

  /* ------------------------------------------------------------- render */
  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const s = st.current
    let W = 0
    let H = 0
    let dpr = 1
    const resize = () => {
      dpr = clamp(window.devicePixelRatio || 1, 1, Math.max(1, maxDpr))
      W = Math.max(1, Math.round(canvas.clientWidth * dpr))
      H = Math.max(1, Math.round(canvas.clientHeight * dpr))
      canvas.width = W
      canvas.height = H
    }
    resize()
    const ro = typeof ResizeObserver === "function" ? new ResizeObserver(resize) : null
    ro?.observe(canvas)
    const io =
      typeof IntersectionObserver === "function"
        ? new IntersectionObserver((es) => {
            s.visible = es.some((e) => e.isIntersecting)
          })
        : null
    io?.observe(canvas)

    let raf = 0
    let last = 0
    let t = 0
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw)
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016
      last = now
      if (!s.visible) return
      t += dt
      const N = s.n
      const { stripColor: sc, idleColor: ic, background: bg, lightColor: lc } = s.colors

      // 0 → 1 as playback fades in, back to 0 when it stops
      s.on += ((s.playing ? 1 : 0) - s.on) * Math.min(1, dt * 3)
      s.beat = Math.max(0, s.beat - dt * 4.5)

      // spectrum → per-strip energy
      let level = 0
      if (s.analyser && s.freq && s.on > 0.01) {
        s.analyser.getByteFrequencyData(s.freq as never)
        for (let i = 0; i < s.freq.length; i++) level += s.freq[i]
        level /= s.freq.length * 255
      }
      s.level += (level - s.level) * Math.min(1, dt * 8)

      // the curtain opens while playing (springy), and closes when it stops
      const openTarget = s.playing && s.openOnPlay && !s.reduced ? 1 : 0
      s.open += (openTarget - s.open) * Math.min(1, dt * 1.6)

      // the picture behind, cover-fitted; dimmed until the music starts
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, W, H)
      const img = s.img
      const iw = img ? (img as HTMLImageElement).naturalWidth || (img as HTMLCanvasElement).width : 0
      const ih = img ? (img as HTMLImageElement).naturalHeight || (img as HTMLCanvasElement).height : 0
      if (img && iw && ih) {
        const zoom = 1.04 - 0.04 * s.on + 0.008 * s.beat
        const k = Math.max(W / iw, H / ih) * zoom
        ctx.drawImage(img, (W - iw * k) / 2, (H - ih * k) / 2, iw * k, ih * k)
      }
      // a colour wash that breathes with the beat, and the idle dimming
      if (s.on > 0.01) {
        const sx = W * (0.5 + 0.28 * Math.sin(t * 0.5))
        const g = ctx.createRadialGradient(sx, H * 0.4, 0, sx, H * 0.4, Math.max(W, H) * 0.7)
        g.addColorStop(0, lc + "55")
        g.addColorStop(1, lc + "00")
        ctx.globalAlpha = s.on * (0.55 + 0.45 * s.beat)
        ctx.fillStyle = g
        ctx.fillRect(0, 0, W, H)
        ctx.globalAlpha = 1
      }
      ctx.fillStyle = bg
      ctx.globalAlpha = 0.62 * (1 - s.on)
      ctx.fillRect(0, 0, W, H)
      ctx.globalAlpha = 1
      // the caption for this bar, over the picture
      const word = s.captions.length ? s.captions[s.bar % s.captions.length] : ""
      if (word && s.on > 0.01) {
        ctx.globalAlpha = s.on * 0.92
        ctx.fillStyle = "#ffffff"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        const fs = Math.min((W / Math.max(3, word.length)) * 1.3, H * 0.34)
        ctx.font = "900 " + Math.round(fs * (1 + 0.03 * s.beat)) + "px Impact, 'Arial Black', ui-sans-serif, system-ui, sans-serif"
        ctx.fillText(word, W / 2, H * 0.5)
        ctx.globalAlpha = 1
      }

      // layout
      const gap = Math.max(3 * dpr, W * 0.009)
      const sw = (W - gap * (N + 1)) / N
      const holeR = sw * 0.2
      const pitch = sw * 1.12
      const reach = W * 0.24
      const px = s.px * dpr
      const py = s.py * dpr
      ctx.fillStyle = mixHex(ic, sc, s.on)
      const sway = s.reduced ? 0 : s.on * (0.012 + 0.05 * s.level + 0.035 * s.beat)

      for (let i = 0; i < N; i++) {
        const cx = gap + i * (sw + gap) + sw / 2

        // where the strip wants to hang: open from the middle, part around the
        // pointer, and sway with the music — the length never changes
        const target =
          (s.reduced ? 0 : openAngle(i, N, s.open)) +
          (interactiveRef.current && !s.reduced ? swingFor(cx, px, py, H, reach) : 0) +
          sway * Math.sin(t * 2.4 + i * 0.7)
        s.angVel[i] += (55 * (target - s.ang[i]) - 7.5 * s.angVel[i]) * dt
        s.ang[i] += s.angVel[i] * dt

        const L = s.rest[i] * H
        ctx.save()
        ctx.translate(cx, 0)
        // canvas rotation is clockwise: a positive angle would swing the hem left, so negate
        ctx.rotate(-s.ang[i])
        // the strip with its holes punched out (even-odd: holes show what's behind)
        ctx.beginPath()
        ctx.rect(-sw / 2, -2, sw, L + 2)
        for (let y = pitch * 0.75; y < L - holeR * 1.4; y += pitch) {
          ctx.moveTo(holeR, y)
          ctx.arc(0, y, holeR, 0, Math.PI * 2)
        }
        ctx.fill("evenodd")
        ctx.restore()
      }
    }
    raf = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(raf)
      ro?.disconnect()
      io?.disconnect()
    }
  }, [maxDpr])

  const onMove = (e: PointerDivEv) => {
    const r = e.currentTarget.getBoundingClientRect()
    st.current.px = e.clientX - r.left
    st.current.py = e.clientY - r.top
  }
  const onLeave = () => {
    st.current.px = -1
    st.current.py = -1
  }

  return (
    <div
      ref={rootRef}
      className={"psc-root relative w-full overflow-hidden " + className}
      style={{ height, background, color: stripColor }}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      <style>{PSC_CSS}</style>
      <canvas ref={canvasRef} className="psc-canvas" aria-hidden="true" />
      <button
        type="button"
        className={"psc-play" + (playing ? " psc-playing" : "")}
        onClick={toggle}
        aria-pressed={playing}
        aria-label={playing ? "Pause the music" : "Play the music"}
      >
        <svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">
          <circle cx="32" cy="32" r="29" fill="none" stroke="currentColor" strokeWidth="3.5" />
          {playing ? (
            <path d="M25 21v22M39 21v22" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
          ) : (
            <path d="M26 20.5v23l19-11.5z" fill="currentColor" />
          )}
        </svg>
      </button>
      {(title || credit) && (
        <div className="psc-foot" aria-hidden={!title && !credit}>
          <span>{title}</span>
          <span>{credit}</span>
        </div>
      )}
    </div>
  )
}

const BACKDROPS = {
  dawn: { top: "#e7b7a5", bottom: "#f8e8d6", sun: "#fff4df", far: "#d2b2bb", near: "#3a2a3b", mist: "255,240,232" },
  alpine: { top: "#7ea5c8", bottom: "#e3ecf2", sun: "#ffffff", far: "#a9bfd0", near: "#1c3044", mist: "236,244,250" },
  dusk: { top: "#2a2450", bottom: "#ef8d60", sun: "#ffd9a6", far: "#93607c", near: "#18121f", mist: "255,196,160" },
  mist: { top: "#c4d0cb", bottom: "#eef1ec", sun: "#ffffff", far: "#aebcb5", near: "#2c3a33", mist: "246,248,245" },
}

// a layered-ridge landscape painted once onto a canvas: sky, a low sun, five
// ridges fading into haze with mist between, a tree line on the nearest
function paintBackdrop(name: keyof typeof BACKDROPS, w = 1600, h = 1000): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null
  const c = document.createElement("canvas")
  c.width = w
  c.height = h
  const g = c.getContext("2d")
  if (!g) return null
  const P = BACKDROPS[name] ?? BACKDROPS.dusk
  const r = mulberry32(17)
  const rgb = (hex: string) => {
    const v = parseInt(hex.replace("#", ""), 16)
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
  }
  const mix = (a: string, b: string, t: number) => {
    const A = rgb(a)
    const B = rgb(b)
    return "rgb(" + A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(",") + ")"
  }
  const sky = g.createLinearGradient(0, 0, 0, h * 0.72)
  sky.addColorStop(0, P.top)
  sky.addColorStop(1, P.bottom)
  g.fillStyle = sky
  g.fillRect(0, 0, w, h)
  const sx = w * 0.58
  const sy = h * 0.36
  const halo = g.createRadialGradient(sx, sy, 0, sx, sy, w * 0.45)
  halo.addColorStop(0, "rgba(" + rgb(P.sun).join(",") + ",.85)")
  halo.addColorStop(0.08, "rgba(" + rgb(P.sun).join(",") + ",.5)")
  halo.addColorStop(1, "rgba(" + rgb(P.sun).join(",") + ",0)")
  g.fillStyle = halo
  g.fillRect(0, 0, w, h)
  g.fillStyle = P.sun
  g.beginPath()
  g.arc(sx, sy, h * 0.045, 0, Math.PI * 2)
  g.fill()
  for (let L = 0; L < 5; L++) {
    const k = L / 4
    const base = h * (0.46 + k * 0.38)
    const amp = h * (0.07 + k * 0.1)
    const ph = [r() * 6.28, r() * 6.28, r() * 6.28, r() * 6.28]
    const fr = [1.3 + r(), 3.1 + r() * 2, 7 + r() * 4, 17 + r() * 8]
    const ridge = (x: number) => {
      const u = x / w
      return base - amp * (0.55 * Math.sin(u * fr[0] + ph[0]) + 0.28 * Math.sin(u * fr[1] + ph[1]) + 0.12 * Math.abs(Math.sin(u * fr[2] + ph[2])) + 0.05 * Math.sin(u * fr[3] + ph[3]))
    }
    const mist = g.createLinearGradient(0, base - amp * 1.4, 0, base + amp * 0.4)
    mist.addColorStop(0, "rgba(" + P.mist + ",0)")
    mist.addColorStop(1, "rgba(" + P.mist + "," + (0.55 - k * 0.35).toFixed(2) + ")")
    g.fillStyle = mist
    g.fillRect(0, base - amp * 1.4, w, amp * 1.8)
    const body = g.createLinearGradient(0, base - amp, 0, h)
    body.addColorStop(0, mix(P.far, P.near, Math.pow(k, 1.3)))
    body.addColorStop(1, mix(P.far, P.near, Math.min(1, Math.pow(k, 1.3) + 0.18)))
    g.fillStyle = body
    g.beginPath()
    g.moveTo(0, h)
    for (let x = 0; x <= w; x += 6) g.lineTo(x, ridge(x))
    g.lineTo(w, h)
    g.closePath()
    g.fill()
    if (L >= 3) {
      g.fillStyle = mix(P.far, P.near, Math.min(1, Math.pow(k, 1.3) + 0.08))
      for (let x = 0; x < w; x += 7 + r() * 9) {
        if (r() < 0.35) continue
        const y = ridge(x) + 2
        const th = h * (0.025 + r() * 0.035) * (0.6 + k)
        g.beginPath()
        g.moveTo(x, y - th)
        g.lineTo(x + th * 0.32, y)
        g.lineTo(x - th * 0.32, y)
        g.closePath()
        g.fill()
      }
    }
  }
  return c
}

function mixHex(a: string, b: string, t: number): string {
  const p = (h: string) => {
    let x = h.replace("#", "")
    if (x.length === 3) x = x.split("").map((c) => c + c).join("")
    const v = /^[0-9a-f]{6}$/i.test(x) ? parseInt(x, 16) : 0
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
  }
  const A = p(a)
  const B = p(b)
  const k = clamp(t, 0, 1)
  return "rgb(" + A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(",") + ")"
}

const PSC_CSS = `
.psc-root{isolation:isolate;touch-action:pan-y;font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.psc-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;max-width:none}
.psc-play{position:absolute;left:50%;top:46%;transform:translate(-50%,-50%);display:grid;place-items:center;width:clamp(72px,11vmin,120px);height:clamp(72px,11vmin,120px);padding:0;border:0;border-radius:999px;background:transparent;color:#1d1d1d;cursor:pointer;transition:opacity .35s ease,transform .35s cubic-bezier(.2,.8,.2,1),color .35s ease;z-index:2}
.psc-play svg{width:100%;height:100%;display:block;max-width:none;filter:drop-shadow(0 6px 18px rgba(0,0,0,.35))}
.psc-play:hover{transform:translate(-50%,-50%) scale(1.06)}
.psc-play:focus-visible{outline:2px solid currentColor;outline-offset:6px}
.psc-playing{opacity:0;color:#111}
.psc-root:hover .psc-playing,.psc-playing:focus-visible{opacity:.85}
.psc-foot{position:absolute;left:clamp(12px,2.4vw,28px);right:clamp(12px,2.4vw,28px);bottom:clamp(10px,2vh,22px);display:flex;justify-content:space-between;gap:16px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:inherit;opacity:.75;pointer-events:none;z-index:2;mix-blend-mode:difference}
@media (prefers-reduced-motion:reduce){.psc-play{transition:none}}
`

// event alias lives after the JSX so the 21st CLI tokenizer stays linear
type PointerDivEv = React.PointerEvent<HTMLDivElement>

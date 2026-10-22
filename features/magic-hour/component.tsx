"use client"

import * as React from "react"

/**
 * Magic Hour — a scroll-scrubbed video. Scroll owns the timeline: no autoplay,
 * ever. Progress through an internal scroller maps to a target frame, a
 * smoothDamp chases it, and the integer frame is applied to an all-keyframe
 * video's currentTime with seeks serialized so fast flicks skim instead of
 * queueing a backlog.
 *
 * Self-contained: Tailwind utilities only, no local imports, no CSS file. The
 * footage is remote by default — point the src props at your own all-intra
 * (GOP 1) MP4 to scrub something else.
 */

const DEFAULT_BASE = "https://kedhar.vercel.app/motion/magic-hour"

export type MagicHourProps = {
  /** All-keyframe (GOP 1) MP4. Anything else seeks in lurches. */
  desktopSrc?: string
  /** Lighter cut served under 640px. Defaults to desktopSrc. */
  mobileSrc?: string
  /** Shown until the first frame is decodable, and instead of the video under reduced motion. */
  poster?: string
  /** Frame rate the video was encoded at — a wrong value means wrong seek targets. */
  fps?: number
  /** Screens of scroll travel. More pages = slower, finer scrub. */
  pages?: number
  /**
   * Explicit height. Everything inside is percentage-based, so this must be a
   * definite length — "100%" only works if every ancestor also has one, which
   * an installed page usually does not. Pass "100%" only when you know it does.
   */
  height?: string
  /** CSS aspect-ratio of the frame, e.g. "9 / 16" or "16 / 9". */
  aspectRatio?: string
  /** Clock readout endpoints, "HH:MM". Crossing midnight is fine. */
  clockStart?: string
  clockEnd?: string
  /** Hide the monospace clock / kelvin / frame chips. */
  readouts?: boolean
  /** Shown over the bottom edge until scrolling starts. Pass "" to drop it. */
  hint?: string
  alt?: string
  className?: string
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/** "HH:MM" to minutes since midnight. */
function toMinutes(time: string) {
  const [h, m] = time.split(":").map(Number)
  return ((((h || 0) * 60 + (m || 0)) % 1440) + 1440) % 1440
}

function formatClock(minutes: number) {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = React.useState(false)

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const sync = () => setReduced(mq.matches)
    sync()
    mq.addEventListener("change", sync)
    return () => mq.removeEventListener("change", sync)
  }, [])

  return reduced
}

/**
 * Scroll progress (0..1) of an internal scroll container. The component owns
 * its own scroller so it works inside any frame instead of depending on the
 * page scrollbar.
 */
function useScrollProgress<T extends HTMLElement>() {
  const ref = React.useRef<T>(null)
  const [progress, setProgress] = React.useState(0)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return

    let frame = 0
    const read = () => {
      frame = 0
      const span = el.scrollHeight - el.clientHeight
      setProgress(span <= 0 ? 0 : clamp(el.scrollTop / span, 0, 1))
    }
    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(read)
    }

    read()
    el.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      el.removeEventListener("scroll", onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  return { ref, progress }
}

/** Critically-damped chase with a speed cap — the whole feel of the scrub. */
function smoothDamp(
  current: number,
  target: number,
  velocity: number,
  smoothTime: number,
  maxSpeed: number,
  deltaTime: number,
): [number, number] {
  const safeTime = Math.max(0.0001, smoothTime)
  const omega = 2 / safeTime
  const x = omega * deltaTime
  const decay = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x)
  const maxChange = maxSpeed * safeTime
  const change = clamp(current - target, -maxChange, maxChange)
  const limitedTarget = current - change
  const temp = (velocity + omega * change) * deltaTime
  let nextVelocity = (velocity - omega * temp) * decay
  let nextPosition = limitedTarget + (change + temp) * decay

  if ((target - current > 0) === (nextPosition > target)) {
    nextPosition = target
    nextVelocity = 0
  }
  return [nextPosition, nextVelocity]
}

type FrameAnimator = {
  setProgress(progress: number): void
  destroy(): void
}

function createFrameAnimator(options: {
  frameCount: number
  smoothTime?: number
  maxSpeed?: number
  render: (frame: number) => void
}): FrameAnimator {
  const frameCount = Math.max(1, Math.floor(options.frameCount))
  const smoothTime = options.smoothTime ?? 0.11
  const maxSpeed = options.maxSpeed ?? frameCount * 2
  let position = 0
  let target = 0
  let velocity = 0
  let lastFrame = -1
  let lastTime = 0
  let raf = 0
  let destroyed = false

  const render = () => {
    const frame = Math.round(clamp(position, 0, frameCount - 1))
    if (frame !== lastFrame) {
      options.render(frame)
      lastFrame = frame
    }
  }

  const loop = (now: number) => {
    raf = 0
    if (destroyed) return
    const deltaTime = lastTime ? Math.min((now - lastTime) / 1000, 1 / 30) : 1 / 60
    lastTime = now
    const [nextPosition, nextVelocity] = smoothDamp(
      position,
      target,
      velocity,
      smoothTime,
      maxSpeed,
      deltaTime,
    )
    position = nextPosition
    velocity = nextVelocity
    render()

    if (Math.abs(target - position) > 0.002 || Math.abs(velocity) > 0.002) {
      raf = requestAnimationFrame(loop)
    }
  }

  render()

  return {
    setProgress(progress: number) {
      target = clamp(progress, 0, 1) * (frameCount - 1)
      if (!raf && !destroyed) raf = requestAnimationFrame(loop)
    },
    destroy() {
      destroyed = true
      if (raf) cancelAnimationFrame(raf)
      raf = 0
    },
  }
}

/**
 * Applies frames by seeking the video. Seeks are serialized: while the decoder
 * is mid-seek the latest frame is parked and flushed on "seeked", so fast
 * scrubbing never queues a backlog.
 */
function createVideoSeekRenderer(video: HTMLVideoElement, fps: number) {
  let pendingTime: number | null = null

  const applyTime = (time: number) => {
    if (video.seeking) {
      pendingTime = time
      return
    }
    pendingTime = null
    video.currentTime = time
  }

  const onSeeked = () => {
    if (pendingTime !== null) {
      const t = pendingTime
      pendingTime = null
      video.currentTime = t
    }
  }
  video.addEventListener("seeked", onSeeked)

  return {
    render(frame: number) {
      const duration = video.duration
      const raw = frame / fps
      applyTime(Number.isFinite(duration) && duration > 0 ? Math.min(raw, duration - 0.001) : raw)
    },
    destroy() {
      video.removeEventListener("seeked", onSeeked)
    },
  }
}

/** Small monospace camera-style chip the readouts hang on. */
function Readout({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 border border-border bg-background/80 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] tabular-nums text-foreground/70">
      {children}
    </span>
  )
}

export default function MagicHour({
  desktopSrc = `${DEFAULT_BASE}/scrub-desktop.mp4`,
  mobileSrc,
  poster = `${DEFAULT_BASE}/poster.jpg`,
  fps = 48,
  pages = 5,
  height = "100svh",
  aspectRatio = "9 / 16",
  clockStart = "18:30",
  clockEnd = "06:12",
  readouts = true,
  hint = "Scroll to turn the sky",
  alt = "A silhouetted figure and car on a ridge; the sun sets, a moon crosses the sky, dawn returns",
  className = "",
}: MagicHourProps) {
  const reduced = usePrefersReducedMotion()
  const { ref, progress } = useScrollProgress<HTMLDivElement>()
  const videoRef = React.useRef<HTMLVideoElement>(null)
  const animatorRef = React.useRef<FrameAnimator | null>(null)
  const [ready, setReady] = React.useState(false)
  const [frameCount, setFrameCount] = React.useState(0)

  // Picked after mount: matchMedia does not exist during SSR, and rendering the
  // desktop cut first would download both.
  const [src, setSrc] = React.useState<string | null>(null)
  React.useEffect(() => {
    const small = window.matchMedia("(max-width: 640px)").matches
    setSrc(small ? mobileSrc ?? desktopSrc : desktopSrc)
  }, [desktopSrc, mobileSrc])

  React.useEffect(() => {
    if (reduced || !src) return
    const video = videoRef.current
    if (!video) return

    let renderer: ReturnType<typeof createVideoSeekRenderer> | null = null

    const onLoaded = () => {
      const frames = Math.max(1, Math.round(video.duration * fps))
      setFrameCount(frames)
      renderer = createVideoSeekRenderer(video, fps)
      animatorRef.current = createFrameAnimator({
        frameCount: frames,
        // scrubbing a decoder: cap chase speed so fast flicks skim, not queue
        maxSpeed: fps * 4,
        render: renderer.render,
      })
      setReady(true)
    }

    if (video.readyState >= 2) onLoaded()
    else video.addEventListener("loadeddata", onLoaded, { once: true })

    return () => {
      video.removeEventListener("loadeddata", onLoaded)
      animatorRef.current?.destroy()
      animatorRef.current = null
      renderer?.destroy()
      setReady(false)
    }
  }, [reduced, src, fps])

  React.useEffect(() => {
    animatorRef.current?.setProgress(progress)
  }, [progress])

  const start = toMinutes(clockStart)
  const span = (toMinutes(clockEnd) - start + 1440) % 1440 || 1440
  // White balance drifts toward moonlight at the middle of the night and back.
  const kelvin = Math.round(2400 + 3200 * Math.sin(clamp(progress, 0, 1) * Math.PI))
  const frame = frameCount ? Math.round(progress * (frameCount - 1)) : 0

  if (reduced) {
    return (
      <div
        className={`flex w-full flex-col items-center justify-center gap-4 px-6 py-8 ${className}`}
        style={{ height }}
      >
        <img
          src={poster}
          alt={alt}
          className="h-[75%] w-auto border border-border object-contain"
        />
        <p className="max-w-sm text-center text-xs leading-relaxed text-foreground/50">
          Reduced motion: the scene holds still. With motion enabled, scrolling
          scrubs the whole sequence.
        </p>
      </div>
    )
  }

  return (
    <div className={`relative w-full ${className}`} style={{ height }}>
      <div
        ref={ref}
        tabIndex={0}
        role="region"
        aria-label="Scroll to scrub the sequence"
        className="h-full w-full overflow-y-auto overscroll-contain outline-none focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground"
      >
        {/* A spacer of N screens; the frame stays stuck for the whole travel. */}
        <div className="w-full" style={{ height: `${pages * 100}%` }}>
          <div
            className="sticky top-0 flex flex-col items-center justify-center gap-3 px-6 py-6"
            style={{ height: `${100 / pages}%` }}
          >
            <div className="relative h-[calc(100%-3.25rem)] max-w-full">
              <div
                className="relative h-full overflow-hidden border border-border bg-background"
                style={{ aspectRatio }}
              >
                {/* Poster sits underneath until the first frame is decodable. */}
                <img
                  src={poster}
                  alt=""
                  aria-hidden
                  className="absolute inset-0 h-full w-full max-w-none object-cover"
                />
                {src && (
                  <video
                    ref={videoRef}
                    src={src}
                    poster={poster}
                    muted
                    playsInline
                    preload="auto"
                    disablePictureInPicture
                    aria-label={alt}
                    className="absolute inset-0 h-full w-full max-w-none object-cover transition-opacity duration-300"
                    style={{ opacity: ready ? 1 : 0 }}
                  />
                )}
              </div>
            </div>

            {readouts && (
              <div className="flex w-full max-w-[15rem] items-center justify-between gap-3">
                <Readout>{formatClock(start + progress * span)}</Readout>
                <Readout>{kelvin}K</Readout>
                <Readout>
                  f{String(frame + 1).padStart(3, "0")}
                  {frameCount ? `/${frameCount}` : ""}
                </Readout>
              </div>
            )}
          </div>
        </div>
      </div>

      {hint && progress < 0.03 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
          <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-foreground/35">
            {hint}
          </span>
        </div>
      )}
    </div>
  )
}

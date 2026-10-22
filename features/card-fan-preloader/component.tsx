"use client"

import * as React from "react"

export interface CardFanPreloaderProps {
  /**
   * Content revealed once the preloader completes and the gate lifts.
   * Ignored when `loop` is true.
   */
  children?: React.ReactNode
  /**
   * Run continuously as an ambient loader showcase.
   * If true, children are never revealed and onComplete is not called.
   */
  loop?: boolean
  /**
   * Duration in milliseconds before the preloader exits (when loop is false).
   * Defaults to 2400ms.
   */
  durationMs?: number
  /**
   * Playback speed multiplier. 1 = original 0.5s cycle, 2 = twice as fast (0.25s).
   * Defaults to 1.
   */
  speed?: number
  /**
   * Scale factor for the 300px x 300px card stage.
   * Defaults to 1.
   */
  scale?: number
  /**
   * Root container height. Must be a definite length, never a percentage or h-full.
   * Defaults to "100svh".
   */
  height?: string
  /**
   * Optional custom face node rendered inside each card.
   * Defaults to an elegant Ace of Spades vector playing card face.
   */
  cardFace?: React.ReactNode
  /**
   * Callback fired when the preloader exit transition finishes.
   */
  onComplete?: () => void
  /**
   * Extra classes for the root container.
   */
  className?: string
}

/**
 * Elegant Ace of Spades vector playing card face.
 * Inlined vector SVG ensures 100% self-contained delivery without external network requests.
 */
function DefaultCardFace() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 54 78"
      className="cfp-card-svg"
      aria-hidden="true"
    >
      <rect width="54" height="78" fill="#ffffff" />
      {/* Top-left Index */}
      <text x="5" y="13" fill="#111111" fontSize="10" fontWeight="bold" fontFamily="serif">A</text>
      <path
        fill="#111111"
        d="M6.5,15.5 C5.8,17 4.2,18 4.2,19.2 C4.2,20.2 5,20.8 6,20.8 C6.6,20.8 7,20.5 7.2,20.1 C7.4,20.5 7.8,20.8 8.4,20.8 C9.4,20.8 10.2,20.2 10.2,19.2 C10.2,18 8.6,17 7.9,15.5 C7.7,15.1 7.3,14.5 7.2,14.2 C7.1,14.5 6.7,15.1 6.5,15.5 Z"
      />
      <rect x="6.8" y="19.5" width="0.8" height="2.2" fill="#111111" />

      {/* Center Spade Emblem */}
      <path
        fill="#111111"
        d="M27,27 C24.5,32 19,35 19,39 C19,42.5 21.8,44.8 25,44.8 C26.8,44.8 28.2,43.8 28.8,42.5 C29.4,43.8 30.8,44.8 32.6,44.8 C35.8,44.8 38.6,42.5 38.6,39 C38.6,35 33.1,32 30.6,27 C29.6,25 28.2,22 27,20 C25.8,22 24.4,25 23.4,27 Z"
        transform="translate(-1.8, 4)"
      />
      <polygon points="26,45 28,45 29.5,51 24.5,51" fill="#111111" />

      {/* Bottom-right Index (inverted) */}
      <g transform="rotate(180 47.5 65)">
        <text x="45" y="63" fill="#111111" fontSize="10" fontWeight="bold" fontFamily="serif">A</text>
        <path
          fill="#111111"
          d="M46.5,65.5 C45.8,67 44.2,68 44.2,69.2 C44.2,70.2 45,70.8 46,70.8 C46.6,70.8 47,70.5 47.2,70.1 C47.4,70.5 47.8,70.8 48.4,70.8 C49.4,70.8 50.2,70.2 50.2,69.2 C50.2,68 48.6,67 47.9,65.5 C47.7,65.1 47.3,64.5 47.2,64.2 C47.1,64.5 46.7,65.1 46.5,65.5 Z"
        />
        <rect x="46.8" y="69.5" width="0.8" height="2.2" fill="#111111" />
      </g>

      {/* Precision Playing Card Border */}
      <path fill="#cccccc" d="M.499.5h1v77h-1zM52.5.5h1v77h-1z" />
      <path fill="#cccccc" d="M.473.5h53v1h-53zM.473 76.5h53v1h-53zM51.75 1.75h.5v74.5h-.5zM1.75 1.75h.5v74.5h-.5z" />
      <path fill="#cccccc" d="M1.75 1.75h50.5v.5H1.75zM1.75 75.75h50.5v.5H1.75z" />
    </svg>
  )
}

const CFP_CSS = `
.cfp-root {
  position: relative;
  width: 100%;
  background-color: #000000;
  color: #ffffff;
  overflow: hidden;
}

.cfp-dest {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow-y: auto;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.cfp-dest[data-active="true"] {
  opacity: 1;
  pointer-events: auto;
}

.cfp-gate {
  position: absolute;
  inset: 0;
  z-index: 100;
  background-color: #000000;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.cfp-gate.cfp-gate-exiting {
  opacity: 0;
  pointer-events: none;
}

.cfp-preloader {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 1000;
  margin: -150px 0 0 -150px;
  padding: 0;
  width: 300px;
  height: 300px;
  overflow: hidden;
  pointer-events: none;
  transform-origin: center center;
  /* scale lives in the transform here, not in an inline style: an inline
     transform outranks this class rule, so any scale other than 1 silently
     cancelled the exit lift. */
  transform: scale(var(--cfp-scale, 1));
  transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  will-change: opacity, transform;
}

.cfp-preloader.cfp-exiting {
  opacity: 0;
  transform: scale(var(--cfp-scale, 1)) translateY(-20px);
}

.cfp-card {
  position: absolute;
  top: 0;
  left: 0;
  width: 54px;
  height: 78px;
  display: block;
  background-color: #222222;
  border-radius: 5px;
  overflow: hidden;
  box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.25);
  animation-fill-mode: forwards;
  animation-delay: 0s;
  animation-duration: var(--cfp-duration, 0.5s);
  animation-iteration-count: infinite;
  animation-timing-function: ease;
  text-align: center;
  backface-visibility: hidden;
  transform-origin: center center;
}

.cfp-card-svg {
  width: 100%;
  height: 100%;
  display: block;
  max-width: none;
  pointer-events: none;
}

.cfp-card--1 {
  z-index: 0;
  transform: translate3d(52px, 110px, 0) scale3d(1, 1, 1) rotate3d(0, 0, 1, -16deg);
}

.cfp-card--2 {
  z-index: 1;
  transform: translate3d(52px, 110px, 0) scale3d(1, 1, 1) rotate3d(0, 0, 1, -16deg);
  animation-name: cfp-anim-card-2;
}

.cfp-card--3 {
  z-index: 2;
  transform: translate3d(87px, 105px, 0) scale3d(1, 1, 1) rotate3d(0, 0, 1, -8deg);
  animation-name: cfp-anim-card-3;
}

.cfp-card--4 {
  z-index: 3;
  transform: translate3d(122px, 100px, 0) scale3d(1, 1, 1) rotate3d(0, 0, 1, 0deg);
  animation-name: cfp-anim-card-4;
}

.cfp-card--5 {
  z-index: 4;
  transform: translate3d(157px, 105px, 0) scale3d(1, 1, 1) rotate3d(0, 0, 1, 8deg);
  animation-name: cfp-anim-card-5;
}

.cfp-card--6 {
  z-index: 5;
  transform: translate3d(192px, 110px, 0) scale3d(1, 1, 1) rotate3d(0, 0, 1, 16deg);
}

@keyframes cfp-anim-card-2 {
  0% {
    transform: translate3d(52px, 110px, 0) scale3d(1, 1, 1) rotate3d(0, 0, 1, -16deg);
  }
  100% {
    transform: translate3d(87px, 105px, 0) scale3d(1, 1, 1) rotate3d(0, 0, 1, -8deg);
  }
}

@keyframes cfp-anim-card-3 {
  0% {
    transform: translate3d(87px, 105px, 0) scale3d(1, 1, 1) rotate3d(0, 0, 1, -8deg);
  }
  100% {
    transform: translate3d(122px, 100px, 0) scale3d(1, 1, 1) rotate3d(0, 0, 1, 0deg);
  }
}

@keyframes cfp-anim-card-4 {
  0% {
    transform: translate3d(122px, 100px, 0) scale3d(1, 1, 1) rotate3d(0, 0, 1, 0deg);
  }
  100% {
    transform: translate3d(157px, 105px, 0) scale3d(1, 1, 1) rotate3d(0, 0, 1, 8deg);
  }
}

@keyframes cfp-anim-card-5 {
  0% {
    transform: translate3d(157px, 105px, 0) scale3d(1, 1, 1) rotate3d(0, 0, 1, 8deg);
  }
  100% {
    transform: translate3d(192px, 110px, 0) scale3d(1, 1, 1) rotate3d(0, 0, 1, 16deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .cfp-card {
    animation: none;
  }
  .cfp-card--2 {
    transform: translate3d(87px, 105px, 0) scale3d(1, 1, 1) rotate3d(0, 0, 1, -8deg);
  }
  .cfp-card--3 {
    transform: translate3d(122px, 100px, 0) scale3d(1, 1, 1) rotate3d(0, 0, 1, 0deg);
  }
  .cfp-card--4 {
    transform: translate3d(157px, 105px, 0) scale3d(1, 1, 1) rotate3d(0, 0, 1, 8deg);
  }
  .cfp-card--5 {
    transform: translate3d(192px, 110px, 0) scale3d(1, 1, 1) rotate3d(0, 0, 1, 16deg);
  }
  .cfp-preloader.cfp-exiting {
    transform: none;
    transition: opacity 0.1s linear;
  }
}
`

export default function CardFanPreloader({
  children,
  loop = false,
  durationMs = 2400,
  speed = 1,
  scale = 1,
  height = "100svh",
  cardFace,
  onComplete,
  className = "",
}: CardFanPreloaderProps) {
  const [phase, setPhase] = React.useState<"loading" | "exiting" | "complete">("loading")

  // Retain the onComplete callback in a ref to decouple effect identity from prop updates.
  const onCompleteRef = React.useRef(onComplete)
  onCompleteRef.current = onComplete

  React.useEffect(() => {
    if (loop) return

    // Begin exit animation after durationMs
    const exitTimer = setTimeout(() => {
      setPhase("exiting")
    }, Math.max(durationMs, 100))

    // Transition out takes 250ms (smooth 0.25s cubic bezier exit)
    const completeTimer = setTimeout(() => {
      setPhase("complete")
      onCompleteRef.current?.()
    }, Math.max(durationMs, 100) + 260)

    return () => {
      clearTimeout(exitTimer)
      clearTimeout(completeTimer)
    }
  }, [loop, durationMs])

  const effectiveDuration = (0.5 / Math.max(speed, 0.1)).toFixed(3) + "s"
  const faceContent = cardFace ?? <DefaultCardFace />

  return (
    <div
      className={"cfp-root " + className}
      style={{
        height,
        ["--cfp-duration" as string]: effectiveDuration,
        ["--cfp-scale" as string]: String(scale),
      }}
    >
      <style>{CFP_CSS}</style>

      {/* Destination content mounted underneath; revealed when loading finishes */}
      {!loop && children && (
        <div className="cfp-dest" data-active={phase === "complete"}>
          {children}
        </div>
      )}

      {/* Preloader Gate overlay */}
      {(loop || phase !== "complete") && (
        <div
          className={"cfp-gate" + (phase === "exiting" ? " cfp-gate-exiting" : "")}
          role="status"
          aria-label="Loading"
          aria-live="polite"
        >
          <div className={"cfp-preloader" + (phase === "exiting" ? " cfp-exiting" : "")}>
            <div className="cfp-card cfp-card--1">{faceContent}</div>
            <div className="cfp-card cfp-card--2">{faceContent}</div>
            <div className="cfp-card cfp-card--3">{faceContent}</div>
            <div className="cfp-card cfp-card--4">{faceContent}</div>
            <div className="cfp-card cfp-card--5">{faceContent}</div>
            <div className="cfp-card cfp-card--6">{faceContent}</div>
          </div>
        </div>
      )}
    </div>
  )
}

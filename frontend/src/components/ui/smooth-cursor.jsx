import { useEffect, useRef, useState } from "react"
import { motion, useSpring } from "framer-motion"

const INTERACTIVE_TAGS = new Set(["A", "BUTTON", "INPUT", "SELECT", "TEXTAREA"])

function isInteractive(el) {
  if (!el || el === document.body || el === document.documentElement) return false
  if (INTERACTIVE_TAGS.has(el.tagName)) return true
  const role = el.getAttribute("role")
  return role === "button" || role === "tab" || role === "menuitem" || role === "link"
}

const DefaultCursor = () => (
  <svg width="20" height="26" viewBox="0 0 20 26" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <path d="M2 2L17.5 17.5H11L8.5 24L5.5 17.5H2V2Z" fill="white" fillOpacity="0.9" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
  </svg>
)

export function SmoothCursor({ cursor = <DefaultCursor />, springConfig = {} }) {
  const elRef = useRef(null)
  const hiddenRef = useRef(false)

  const [enabled] = useState(() => {
    if (typeof window === "undefined") return false
    try {
      const hasTouch = "ontouchstart" in window
      const finePointer = window.matchMedia("(pointer: fine)").matches
      return !hasTouch || finePointer
    } catch {
      return true
    }
  })

  const cfg = { damping: 45, stiffness: 400, mass: 0.5, restDelta: 0.001, ...springConfig }
  const sx = useSpring(0, cfg)
  const sy = useSpring(0, cfg)

  useEffect(() => {
    if (!enabled) return

    sx.set(window.innerWidth / 2)
    sy.set(window.innerHeight / 2)
    document.body.style.cursor = "none"

    const onMove = (e) => {
      if (e.pointerType === "touch") return

      sx.set(e.clientX)
      sy.set(e.clientY)

      const over = isInteractive(e.target)
      if (over !== hiddenRef.current) {
        hiddenRef.current = over
        if (elRef.current) elRef.current.style.display = over ? "none" : ""
      }
    }

    window.addEventListener("pointermove", onMove, { passive: true })

    return () => {
      window.removeEventListener("pointermove", onMove)
      document.body.style.cursor = ""
    }
  }, [enabled, sx, sy])

  if (!enabled) return null

  return (
    <motion.div
      ref={elRef}
      aria-hidden
      style={{
        position: "fixed",
        left: sx,
        top: sy,
        translateX: "-50%",
        translateY: "-50%",
        zIndex: 9999,
        pointerEvents: "none",
      }}
    >
      {cursor}
    </motion.div>
  )
}

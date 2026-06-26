import { useEffect, useRef } from "react"
import createGlobe from "cobe"

import { cn } from "@/lib/utils"
import { useTheme } from "@/components/theme-provider"

const LIGHT_CONFIG = {
  dark: 0,
  diffuse: 0.4,
  mapSamples: 4000,
  mapBrightness: 1.2,
  baseColor: [0.82, 0.84, 0.87],
  markerColor: [0.45, 0.47, 0.5],
  glowColor: [0.9, 0.91, 0.93],
}

const DARK_CONFIG = {
  dark: 0,
  diffuse: 0.4,
  mapSamples: 4000,
  mapBrightness: 1,
  baseColor: [0.92, 0.93, 0.95],
  markerColor: [0.6, 0.62, 0.65],
  glowColor: [0.85, 0.87, 0.9],
}

const MARKERS = [
  { location: [19.076, 72.8777], size: 0.06 },
  { location: [40.7128, -74.006], size: 0.06 },
  { location: [39.9042, 116.4074], size: 0.06 },
]

export function Globe({ className }) {
  const canvasRef = useRef(null)
  const phiRef = useRef(0)
  const widthRef = useRef(0)
  const { theme } = useTheme()

  useEffect(() => {
    const config = theme === "dark" ? DARK_CONFIG : LIGHT_CONFIG

    const onResize = () => {
      if (canvasRef.current) {
        widthRef.current = canvasRef.current.offsetWidth
      }
    }

    window.addEventListener("resize", onResize)
    onResize()

    const globe = createGlobe(canvasRef.current, {
      width: widthRef.current,
      height: widthRef.current,
      devicePixelRatio: 1,
      phi: 0,
      theta: 0.3,
      ...config,
      markers: MARKERS,
      onRender: (state) => {
        phiRef.current += 0.003
        state.phi = phiRef.current
        state.width = widthRef.current
        state.height = widthRef.current
      },
    })

    canvasRef.current.style.opacity = "1"

    return () => {
      globe.destroy()
      window.removeEventListener("resize", onResize)
    }
  }, [theme])

  return (
    <div className={cn("pointer-events-none fixed inset-0 flex items-center justify-center", className)}>
      <div className="aspect-square w-full max-w-[600px] opacity-40 dark:opacity-60">
        <canvas
          className="size-full opacity-0 transition-opacity duration-1000"
          ref={canvasRef}
        />
      </div>
    </div>
  )
}

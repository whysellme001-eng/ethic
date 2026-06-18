"use client"

import { useEffect } from "react"
import { motion, useMotionValue, useSpring, useTransform } from "motion/react"

export function AmbientBackground() {
  const mx = useMotionValue(0.5)
  const my = useMotionValue(0.5)
  const sx = useSpring(mx, { stiffness: 40, damping: 20 })
  const sy = useSpring(my, { stiffness: 40, damping: 20 })

  const glowX = useTransform(sx, (v) => `${v * 100}%`)
  const glowY = useTransform(sy, (v) => `${v * 100}%`)

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      mx.set(e.clientX / window.innerWidth)
      my.set(e.clientY / window.innerHeight)
    }
    window.addEventListener("pointermove", onMove)
    return () => window.removeEventListener("pointermove", onMove)
  }, [mx, my])

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background">
      {/* Slowly evolving gradient mesh */}
      <div
        className="absolute -left-[20%] -top-[20%] size-[60vw] rounded-full opacity-50 blur-[120px]"
        style={{
          background: "radial-gradient(circle, rgba(79,124,255,0.5), transparent 70%)",
          animation: "mesh-drift-a 22s ease-in-out infinite",
        }}
      />
      <div
        className="absolute -right-[15%] top-[10%] size-[55vw] rounded-full opacity-40 blur-[120px]"
        style={{
          background: "radial-gradient(circle, rgba(99,102,241,0.45), transparent 70%)",
          animation: "mesh-drift-b 28s ease-in-out infinite",
        }}
      />
      <div
        className="absolute bottom-[-25%] left-[25%] size-[50vw] rounded-full opacity-30 blur-[130px]"
        style={{
          background: "radial-gradient(circle, rgba(34,211,238,0.35), transparent 70%)",
          animation: "mesh-drift-c 32s ease-in-out infinite",
        }}
      />

      {/* Cursor-reactive light field */}
      <motion.div
        className="absolute size-[40vw] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60 blur-[100px]"
        style={{
          left: glowX,
          top: glowY,
          background: "radial-gradient(circle, rgba(79,124,255,0.25), transparent 65%)",
        }}
      />

      {/* Ambient grid */}
      <div
        className="absolute inset-0 opacity-[0.6]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 40%, black, transparent 90%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 40%, black, transparent 90%)",
        }}
      />

      {/* Grain + vignette */}
      <div className="grain absolute inset-0 opacity-60" />
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse 100% 100% at 50% 0%, transparent 40%, rgba(0,0,0,0.6) 100%)" }}
      />
    </div>
  )
}

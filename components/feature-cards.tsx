"use client"

import { motion } from "motion/react"
import { Cpu, ShieldCheck, Zap, type LucideIcon } from "lucide-react"

const features: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: ShieldCheck,
    title: "Fully local",
    body: "Videos are parsed and rewritten entirely on your device. Nothing is uploaded, stored, or transmitted anywhere.",
  },
  {
    icon: Cpu,
    title: "Atom-level rewrite",
    body: "Parses the MP4 box tree and rebuilds stts, stsz, stsc, stco, ctts and sdtp tables to inflate the listed sample count 10×.",
  },
  {
    icon: Zap,
    title: "One-click patch",
    body: "Open the popup, drop in a clip, and the extension hands back a patched file in milliseconds, no encoding, no re-render.",
  },
]

export function FeatureCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {features.map((f, i) => (
        <motion.article
          key={f.title}
          initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ type: "spring", stiffness: 100, damping: 20, delay: i * 0.08 }}
          whileHover={{ y: -6 }}
          className="group relative overflow-hidden rounded-2xl border border-border bg-card/50 p-5 backdrop-blur-md"
        >
          <div className="pointer-events-none absolute -right-12 -top-12 size-32 rounded-full bg-primary/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
          <span className="flex size-10 items-center justify-center rounded-xl border border-border-hi bg-elevated text-primary">
            <f.icon className="size-5" aria-hidden="true" />
          </span>
          <h3 className="mt-4 text-base font-semibold tracking-tight text-foreground">{f.title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground text-pretty">{f.body}</p>
        </motion.article>
      ))}
    </div>
  )
}

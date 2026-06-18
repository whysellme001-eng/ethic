"use client"

import { motion } from "motion/react"
import { Download } from "lucide-react"
import { siteConfig } from "@/lib/site-config"
import { cn } from "@/lib/utils"

export function DownloadButton({
  className,
  label = "Download extension",
  showVersion = true,
}: {
  className?: string
  label?: string
  showVersion?: boolean
}) {
  return (
    <motion.a
      href={siteConfig.downloadUrl}
      target="_blank"
      rel="noopener noreferrer"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      className={cn(
        "inline-flex items-center justify-center gap-2.5 rounded-full border border-border bg-card/50 px-7 py-3.5 text-sm font-semibold text-foreground backdrop-blur-md transition-colors hover:border-border-hi",
        className,
      )}
    >
      <Download className="size-4 text-primary" aria-hidden="true" />
      {label}
      {showVersion && siteConfig.version ? (
        <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[11px] tracking-tight text-muted-foreground">
          {siteConfig.version}
        </span>
      ) : null}
    </motion.a>
  )
}

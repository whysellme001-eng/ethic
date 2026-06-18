import { siteConfig } from "@/lib/site-config"
import { cn } from "@/lib/utils"

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-lg border border-border-hi", className)}>
      {/* Using a plain img so any URL (local /public path or external https) works without next.config changes */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={siteConfig.logoSrc || "/placeholder.svg"}
        alt={`${siteConfig.name} logo`}
        className="size-full object-cover"
      />
    </div>
  )
}

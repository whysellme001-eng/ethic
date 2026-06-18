import { ArrowUpRight, Puzzle, FolderOpen, ToggleRight } from "lucide-react"
import { AmbientBackground } from "@/components/ambient-background"
import { FeatureCards } from "@/components/feature-cards"
import { Reveal } from "@/components/reveal"
import { Logo } from "@/components/logo"
import { DownloadButton } from "@/components/download-button"
import { siteConfig } from "@/lib/site-config"

const steps = [
  {
    n: "01",
    icon: FolderOpen,
    title: "Download & unzip",
    body: "Grab the package above and extract the folder somewhere you'll keep it, the extension loads from this folder.",
  },
  {
    n: "02",
    icon: Puzzle,
    title: "Load unpacked",
    body: "Open chrome://extensions, turn on Developer mode, click “Load unpacked”, and select the unzipped folder.",
  },
  {
    n: "03",
    icon: ToggleRight,
    title: "Pin & run",
    body: "Pin Ethic to your toolbar, click the icon, drop in an MP4, and patch it in a single click.",
  },
]

export default function Page() {
  return (
    <>
      <AmbientBackground />
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 sm:px-8">
        {/* Nav */}
        <header className="flex items-center justify-between py-6">
          <div className="flex items-center gap-2.5">
            <Logo className="size-8" />
            <span className="text-sm font-semibold tracking-tight text-foreground">{siteConfig.name}</span>
          </div>
          <a
            href={siteConfig.downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-full border border-border bg-card/50 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-md transition-colors hover:border-border-hi hover:text-foreground"
          >
            Download
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </a>
        </header>

        {/* Hero */}
        <section className="flex flex-col items-center pt-16 text-center sm:pt-24">
          <Reveal delay={0.06}>
            <span className="mt-8 inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground backdrop-blur-md">
              <span className="size-1.5 rounded-full bg-primary" />
              Browser extension for MP4 video patching
            </span>
          </Reveal>
          <Reveal delay={0.12}>
            <h1 className="mt-7 max-w-3xl text-balance text-5xl font-semibold leading-[0.95] tracking-tight text-gradient sm:text-7xl">
              Get the {siteConfig.name} extension.
            </h1>
          </Reveal>
          <Reveal delay={0.18}>
            <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              Upload TikTok videos at full quality with zero compression, using our bypass
            </p>
          </Reveal>
          <Reveal delay={0.24}>
            <div className="mt-9 flex flex-col items-center gap-3">
              <DownloadButton />
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                Free, easy and fast
              </span>
            </div>
          </Reveal>
        </section>

        {/* Install steps */}
        <section className="py-28 sm:py-36">
          <Reveal>
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">Installation</span>
          </Reveal>
          <Reveal delay={0.06}>
            <h2 className="mt-3 max-w-2xl text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Up and running in three steps.
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-px overflow-hidden rounded-3xl border border-border bg-border sm:grid-cols-3">
            {steps.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.08} className="bg-card/50 p-7 backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <span className="flex size-10 items-center justify-center rounded-xl border border-border-hi bg-elevated text-primary">
                    <s.icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="font-mono text-sm text-muted-foreground">{s.n}</span>
                </div>
                <h3 className="mt-4 text-lg font-semibold tracking-tight text-foreground">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">{s.body}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="py-12">
          <Reveal>
            <h2 className="max-w-2xl text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Engineered for precision and privacy.
            </h2>
          </Reveal>
          <Reveal delay={0.06}>
            <p className="mt-3 max-w-lg text-pretty text-sm leading-relaxed text-muted-foreground">
              Every operation happens locally on your device, for optimal security
            </p>
          </Reveal>
          <div className="mt-10">
            <FeatureCards />
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-28 sm:py-36">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-card/50 px-8 py-16 text-center backdrop-blur-md">
            <Reveal>
              <h2 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Ready to patch?
              </h2>
            </Reveal>
            <Reveal delay={0.06}>
              <p className="mx-auto mt-3 max-w-md text-pretty text-sm leading-relaxed text-muted-foreground">
                Download {siteConfig.name} and start upload videos at full quality now!
              </p>
            </Reveal>
            <Reveal delay={0.12}>
              <div className="mt-8 flex justify-center">
                <DownloadButton />
              </div>
            </Reveal>
          </div>
        </section>

        {/* Footer note */}
        <footer className="mt-auto border-t border-border py-10">
          <p className="max-w-2xl text-pretty text-xs leading-relaxed text-muted-foreground">
            Everything runs locally in your browser, your file never leaves your device. The extension also injects an
            upload tweak into tiktok.com, which is why it ships as a browser extension rather than a plain website.
          </p>
        </footer>
      </div>
    </>
  )
}

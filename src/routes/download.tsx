import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/sf/shell";
import { Download, Apple, Monitor, Smartphone, HelpCircle, CheckCircle2, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";
=======
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listLatestDownloads, type DownloadPlatform } from "@/lib/downloads.functions";
>>>>>>> 7cc04d1e6d1999b3bee0b5e0ca122015c3323d7d

export const Route = createFileRoute("/download")({
  head: () => ({
    meta: [
      { title: "Download Our App — StreamFlix for Every Device" },
      {
        name: "description",
        content:
          "Download the StreamFlix app for Windows, macOS, Linux, Android, and iPhone/iPad. Watch movies, series, and live sports anywhere.",
      },
    ],
  }),
  component: DownloadPage,
});

const PLATFORMS = [
  {
    id: "windows",
    name: "Windows",
    badge: "v1.0.0",
    size: "85 MB",
    icon: WindowsIcon,
    file: "StreamFlix-Setup.exe",
    href: "#download-windows",
    color: "from-blue-500/20 to-cyan-500/10",
    accent: "text-blue-400",
  },
  {
    id: "macos",
    name: "macOS",
    badge: "v1.0.0",
    size: "92 MB",
    icon: AppleIcon,
    file: "StreamFlix.dmg",
    href: "#download-macos",
    color: "from-gray-200/20 to-gray-400/10",
    accent: "text-gray-300",
  },
  {
    id: "linux",
    name: "Linux",
    badge: "v1.0.0",
    size: "78 MB",
    icon: LinuxIcon,
    file: "StreamFlix.AppImage",
    href: "#download-linux",
    color: "from-yellow-500/15 to-orange-500/10",
    accent: "text-yellow-400",
  },
  {
    id: "android",
    name: "Android",
    badge: "v1.0.0",
    size: "42 MB",
    icon: AndroidIcon,
    file: "streamflix.apk",
    href: "#download-android",
    color: "from-green-500/20 to-emerald-500/10",
    accent: "text-green-400",
  },
  {
    id: "ios",
    name: "iPhone & iPad",
    badge: "v1.0.0",
    size: "App Store",
    icon: AppleIcon,
    file: "StreamFlix on the App Store",
    href: "#download-ios",
    color: "from-primary/20 to-accent/10",
    accent: "text-primary",
  },
];

const REQUIREMENTS = [
  { label: "OS", value: "Windows 10+, macOS 12+, Ubuntu 20.04+, Android 8+, iOS 15+" },
  { label: "Memory", value: "4 GB RAM minimum (8 GB recommended for 4K)" },
  { label: "Storage", value: "200 MB free space for the app" },
  { label: "Network", value: "Broadband 5 Mbps for HD, 25 Mbps for 4K" },
  { label: "Display", value: "1280×720 minimum resolution" },
];

function DownloadPage() {
  return (
    <Shell>
      <div className="relative mx-auto max-w-6xl px-4 py-16 md:py-24">
        {/* Ambient background glow */}
        <div className="pointer-events-none absolute inset-0 -z-10 sf-gradient opacity-60" />

        <header className="text-center">
          <h1 className="text-4xl font-black tracking-tight md:text-6xl">
            Download <span className="text-primary">Our App</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground md:text-xl">
            Take StreamFlix with you. Install the app on your desktop, phone, or tablet for a faster,
            full-screen, distraction-free streaming experience.
          </p>
        </header>

        <section className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
<<<<<<< HEAD
          {PLATFORMS.map((platform) => (
            <DownloadCard key={platform.id} {...platform} />
          ))}
        </section>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Choose the version that matches your device.
        </p>

        <section className="mt-20 grid gap-8 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card/60 p-6 md:p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/15 text-primary">
                <Wrench className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold">System Requirements</h2>
            </div>
            <ul className="space-y-4">
              {REQUIREMENTS.map((req) => (
                <li key={req.label} className="flex items-start gap-3 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>
                    <span className="font-semibold text-foreground">{req.label}:</span>{" "}
                    <span className="text-muted-foreground">{req.value}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-border bg-card/60 p-6 md:p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/15 text-primary">
                <HelpCircle className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold">Need help installing?</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Follow our step-by-step installation guide to get StreamFlix running on any device.
              It covers downloads, permissions, PWA install, and troubleshooting.
            </p>
            <div className="mt-6">
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                asChild
              >
                <a href="#installation-guide">View Installation Guide</a>
              </Button>
            </div>
          </div>
        </section>

        {/* Hidden installation guide anchor target */}
        <div id="installation-guide" className="scroll-mt-24 pt-20">
          <div className="rounded-2xl border border-border bg-gradient-to-br from-card/80 to-card/40 p-6 md:p-10">
            <h2 className="text-2xl font-bold md:text-3xl">Installation Guide</h2>
            <p className="mt-2 text-muted-foreground">
              Quick steps to install StreamFlix on your favorite device.
            </p>
            <ol className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[
                "Download the installer for your platform above.",
                "Open the downloaded file and allow installation from your browser if prompted.",
                "Follow the setup prompts and sign in with your StreamFlix account.",
                "On mobile, use the in-app install banner or add to Home Screen.",
                "Start watching — your watchlist and history sync automatically.",
              ].map((step, i) => (
                <li
                  key={i}
                  className="relative rounded-xl border border-border bg-background/60 p-5 text-sm text-muted-foreground"
                >
                  <span className="mb-2 block text-lg font-black text-primary">{String(i + 1).padStart(2, "0")}</span>
                  {step}
                </li>
              ))}
            </ol>
            <p className="mt-6 text-xs text-muted-foreground">
              Links are placeholders until builds are published. Replace the <code>href</code> values
              in <code>src/routes/download.tsx</code> to point to your actual release files.
            </p>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function DownloadCard({
  name,
  badge,
  size,
  icon: Icon,
  file,
  href,
  color,
  accent,
}: {
  name: string;
  badge: string;
  size: string;
  icon: () => ReactNode;
  file: string;
  href: string;
  color: string;
  accent: string;
}) {
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card/60 p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10">
      <div
        className={`absolute inset-0 -z-10 bg-gradient-to-br ${color} opacity-0 transition duration-300 group-hover:opacity-100`}
      />
      <div className="flex items-center gap-4">
        <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-background/80 text-foreground ${accent}`}>
          <Icon />
        </div>
        <div className="min-w-0">
          <h3 className="text-lg font-bold">{name}</h3>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-secondary-foreground">
              {badge}
            </span>
            <span>{size}</span>
          </div>
        </div>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">{file}</p>
      <div className="mt-auto pt-5">
        <Button className="w-full gap-2 font-semibold transition-transform group-active:scale-[0.98]" asChild>
          <a href={href} aria-label={`Download StreamFlix for ${name}`}>
            <Download className="h-4 w-4" />
            Download
          </a>
        </Button>
      </div>
    </div>
  );
}

function WindowsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7 fill-current" aria-hidden="true">
      <path d="M0 3.449 9.75 2.1v9.451H0m10.949-10.562 13.051-1.9v11.462H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6h13.051v11.363l-13.051-1.8" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7 fill-current" aria-hidden="true">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

function LinuxIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7 fill-current" aria-hidden="true">
      <path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489a.424.424 0 0 0-.333.297c-.082.32-.023.752.171 1.237.264.626.762.9 1.243 1.166.213.108.414.21.573.373.904.955 2.058 1.656 3.428 1.656.95 0 1.79-.448 2.466-1.11.108.103.224.196.346.283.848.596 1.914.883 2.996.662.57-.117 1.096-.344 1.558-.652.666.495 1.5.805 2.409.805 1.316 0 2.499-.691 3.381-1.656.16-.17.355-.264.566-.36.48-.262.97-.536 1.23-1.159.195-.485.253-.918.171-1.238a.424.424 0 0 0-.333-.296c.123-.805-.01-1.657-.287-2.49-.589-1.77-1.831-3.469-2.716-4.52-.75-1.066-.973-1.927-1.05-3.02-.065-1.49 1.055-5.965-3.17-6.298A5.366 5.366 0 0 0 12.504 0zm-1.066 3.142c.29-.008.548.062.79.132.752.217 1.393.634 1.877 1.196.483.562.817 1.28.956 2.109.123.742.085 1.567-.111 2.38-.198.814-.552 1.626-1.035 2.331-.483.706-1.087 1.303-1.764 1.744-.677.441-1.426.724-2.199.808-.774.084-1.55-.032-2.24-.344-.69-.312-1.292-.818-1.744-1.461-.452-.643-.752-1.421-.861-2.231-.108-.81-.024-1.658.247-2.449.271-.791.71-1.514 1.277-2.099.566-.586 1.254-1.005 2.007-1.202.376-.1.762-.153 1.15-.154h.4zm2.343 9.223c.22.083.452.125.69.125.411 0 .806-.127 1.14-.36.335-.232.595-.565.74-.95.146-.384.174-.807.08-1.21-.094-.402-.312-.766-.624-1.05-.313-.283-.705-.464-1.123-.521-.42-.057-.851.01-1.235.19-.385.182-.707.47-.93.83-.222.36-.338.782-.334 1.211.004.43.127.85.354 1.21.227.36.551.65.932.836.19.09.39.157.595.2.198.04.402.059.605.055.203-.004.405-.03.6-.078.196-.05.383-.12.56-.208.177-.09.343-.2.495-.326-.128.17-.286.32-.466.444-.18.124-.38.22-.59.283-.21.063-.43.092-.648.087-.218-.006-.434-.045-.639-.117-.205-.073-.397-.178-.567-.312-.17-.134-.316-.296-.43-.478-.115-.183-.196-.384-.238-.594-.042-.21-.044-.427-.006-.637.039-.21.115-.41.225-.591.11-.18.252-.34.42-.47.167-.128.357-.226.56-.288.203-.06.417-.086.63-.074.213.012.423.06.619.143.196.082.376.197.53.34.155.144.281.314.372.502.09.188.144.39.158.596.014.205-.013.411-.078.605-.065.194-.167.373-.3.527a1.65 1.65 0 0 1-.47.38c-.177.098-.37.165-.57.2z" />
    </svg>
  );
}

function AndroidIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7 fill-current" aria-hidden="true">
      <path d="M17.523 15.3414c-.5 0-.909.409-.909.909 0 .5.409.909.909.909.5 0 .909-.409.909-.909 0-.5-.409-.909-.909-.909m-11.046 0c-.5 0-.909.409-.909.909 0 .5.409.909.909.909.5 0 .909-.409.909-.909 0-.5-.409-.909-.909-.909m11.4-6.117 1.995-3.455c.111-.192.045-.438-.147-.549-.192-.111-.438-.045-.549.147L17.153 8.87c-1.514-.69-3.214-1.077-5.153-1.077-1.939 0-3.639.387-5.153 1.077L4.818 5.367c-.111-.192-.357-.258-.549-.147-.192.111-.258.357-.147.549l1.995 3.455C2.659 11.167.5 14.657.5 18.604h23c0-3.947-2.159-7.437-5.623-9.38M6.477 15.3414c-.5 0-.909.409-.909.909 0 .5.409.909.909.909.5 0 .909-.409.909-.909 0-.5-.409-.909-.909-.909m11.046 0c-.5 0-.909.409-.909.909 0 .5.409.909.909.909.5 0 .909-.409.909-.909 0-.5-.409-.909-.909-.909" />
    </svg>
  );
}

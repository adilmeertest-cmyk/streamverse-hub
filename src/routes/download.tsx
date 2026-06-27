import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/sf/shell";
import { Apple, Monitor, Smartphone, Download } from "lucide-react";
import { InstallAppButton } from "@/components/sf/install-app-button";

export const Route = createFileRoute("/download")({
  head: () => ({
    meta: [
      { title: "Download StreamFlix — Apps for Windows, macOS, Linux & Mobile" },
      { name: "description", content: "Install StreamFlix on your phone as a PWA, or download the native desktop app for Windows, macOS and Linux." },
    ],
  }),
  component: DownloadPage,
});

function DownloadPage() {
  return (
    <Shell>
      <div className="mx-auto max-w-5xl px-4 py-16 md:py-24">
        <header className="text-center">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight">Get the StreamFlix app</h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Watch on any device. Install StreamFlix on your phone, tablet or desktop for a faster, full-screen experience without a browser tab.
          </p>
          <div className="mt-6 flex justify-center"><InstallAppButton /></div>
        </header>

        <section className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Card icon={<Smartphone className="h-7 w-7" />} title="iPhone, iPad & Android" badge="PWA · available now">
            Open StreamFlix in your mobile browser. On iOS tap Share → Add to Home Screen. On Android tap the install prompt or the menu → Install app.
          </Card>
          <Card icon={<Monitor className="h-7 w-7" />} title="Windows" badge="Desktop · coming with v1">
            Native Windows installer (<code>.exe</code>) packaged with Electron. Click the in-app Install banner today for the PWA, or check back for the native build.
          </Card>
          <Card icon={<Apple className="h-7 w-7" />} title="macOS" badge="Desktop · coming with v1">
            Universal macOS app (<code>.dmg</code>) for Apple Silicon and Intel. Until then, use Safari → Share → Add to Dock for an installable web app.
          </Card>
          <Card icon={<Monitor className="h-7 w-7" />} title="Linux" badge="Desktop · coming with v1">
            Portable Linux build (<code>.AppImage</code> / <code>.deb</code>). Use Chrome or Edge today and choose Install StreamFlix from the address bar.
          </Card>
          <Card icon={<Download className="h-7 w-7" />} title="Smart TV & consoles" badge="Roadmap">
            Apple TV, Android TV, Fire TV, Roku, PlayStation and Xbox apps are on the roadmap. Cast from your phone in the meantime.
          </Card>
          <Card icon={<Download className="h-7 w-7" />} title="Auto-updates" badge="All platforms">
            All StreamFlix apps update themselves in the background — you'll always have the latest catalogue and player improvements.
          </Card>
        </section>
      </div>
    </Shell>
  );
}

function Card({ icon, title, badge, children }: { icon: React.ReactNode; title: string; badge: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-6 hover:bg-card transition">
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-lg bg-primary/15 text-primary">{icon}</div>
        <div>
          <h3 className="text-base font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">{badge}</p>
        </div>
      </div>
      <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{children}</p>
    </div>
  );
}
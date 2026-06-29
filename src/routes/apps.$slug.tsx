import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { fetchAppBySlug, fetchAppPlatforms, recordDownload, generateDeviceFingerprint } from "@/lib/apps.functions";
import { supabase } from "@/integrations/supabase/client";
import { Shell } from "@/components/sf/shell";
import { Download, Star, ExternalLink, Shield, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { AppPlatform } from "@/lib/types";
import { useState } from "react";

const PLATFORM_ICONS: Record<AppPlatform, string> = {
  android: "🤖",
  windows: "🪟",
  macos: "🍎",
  linux: "🐧",
  ios: "📱",
  smart_tv: "📺",
};

const PLATFORM_NAMES: Record<AppPlatform, string> = {
  android: "Android (.apk)",
  windows: "Windows (.exe)",
  macos: "macOS (.dmg)",
  linux: "Linux (.AppImage/.deb)",
  ios: "iPhone/iPad (App Store)",
  smart_tv: "Smart TV",
};

function Page() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState<string | null>(null);

  const appOpts = queryOptions({
    queryKey: ["app", slug],
    queryFn: () => fetchAppBySlug(slug),
  });

  const platformsOpts = queryOptions({
    queryKey: ["app-platforms", slug],
    queryFn: async () => {
      const app = await fetchAppBySlug(slug);
      if (!app) return [];
      return fetchAppPlatforms(app.id);
    },
  });

  const app = useSuspenseQuery(appOpts).data;
  const platforms = useSuspenseQuery(platformsOpts).data;

  if (!app) {
    return (
      <Shell>
        <div className="mx-auto max-w-[1480px] px-4 py-16">
          <div className="text-center">
            <h1 className="text-2xl font-bold">App not found</h1>
            <Button onClick={() => navigate({ to: "/browse/apps" })} className="mt-4">
              Back to Apps
            </Button>
          </div>
        </div>
      </Shell>
    );
  }

  const handleDownload = async (platformId: string, fileUrl: string, platform: AppPlatform) => {
    setDownloading(platformId);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to download apps");
        navigate({ to: "/auth", search: { redirect: `/apps/${slug}` } });
        return;
      }

      const deviceFingerprint = await generateDeviceFingerprint();
      await recordDownload(user.id, app.id, platformId, deviceFingerprint);

      // Trigger download
      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = platforms.find((p) => p.id === platformId)?.file_name || "download";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Download started successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to download app");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <Shell>
      <div className="mx-auto max-w-[1480px] px-4 py-16">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* App Info */}
          <div className="lg:col-span-2">
            <div className="flex items-start gap-6">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-background overflow-hidden border border-border">
                {app.icon_url ? (
                  <img src={app.icon_url} alt={app.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted">
                    <span className="text-4xl font-bold text-muted-foreground">{app.name[0]}</span>
                  </div>
                )}
              </div>
              
              <div className="min-w-0 flex-1">
                <h1 className="text-3xl md:text-4xl font-black tracking-tight">{app.name}</h1>
                {app.developer && (
                  <p className="mt-1 text-lg text-muted-foreground">by {app.developer}</p>
                )}
                <div className="mt-3 flex items-center gap-4 text-sm">
                  <span className="rounded-full bg-secondary px-3 py-1 font-medium text-secondary-foreground">
                    v{app.version}
                  </span>
                  {app.rating > 0 && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      {app.rating.toFixed(1)}
                    </span>
                  )}
                  <span className="text-muted-foreground">{app.download_count.toLocaleString()} downloads</span>
                </div>
              </div>
            </div>

            {app.description && (
              <div className="mt-8">
                <h2 className="text-xl font-bold">Description</h2>
                <p className="mt-2 text-muted-foreground leading-relaxed">{app.description}</p>
              </div>
            )}

            {app.category && (
              <div className="mt-6">
                <h2 className="text-xl font-bold">Category</h2>
                <p className="mt-2 text-muted-foreground">{app.category}</p>
              </div>
            )}
          </div>

          {/* Download Section */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-border bg-card/60 p-6">
              <div className="mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold">Download</h2>
              </div>
              
              <p className="mb-4 text-sm text-muted-foreground">
                Select your platform to download the app. Sign in required for secure downloads.
              </p>

              <div className="space-y-3">
                {platforms.map((platform: { id: string; platform: AppPlatform; file_size: string; version: string; file_url: string; file_name: string }) => (
                  <div
                    key={platform.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{PLATFORM_ICONS[platform.platform]}</span>
                      <div>
                        <p className="font-medium text-foreground">{PLATFORM_NAMES[platform.platform]}</p>
                        <p className="text-xs text-muted-foreground">
                          {platform.file_size} · v{platform.version}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleDownload(platform.id, platform.file_url, platform.platform)}
                      disabled={downloading === platform.id}
                      className="gap-2"
                    >
                      {downloading === platform.id ? (
                        "Downloading..."
                      ) : (
                        <>
                          <Download className="h-4 w-4" />
                          Download
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>

              {platforms.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No downloads available yet.
                </div>
              )}
            </div>

            {/* Features */}
            <div className="mt-6 rounded-2xl border border-border bg-card/60 p-6">
              <h3 className="mb-4 font-bold">Features</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Secure downloads with authentication
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Automatic version updates
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Download history tracking
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Multi-platform support
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

export const Route = createFileRoute("/apps/$slug")({
  head: () => ({ meta: [{ title: "App Details — StreamFlix" }, { name: "description", content: "View app details and download." }] }),
  loader: ({ context, params }) => {
    const appOpts = queryOptions({
      queryKey: ["app", params.slug],
      queryFn: () => fetchAppBySlug(params.slug),
    });
    const platformsOpts = queryOptions({
      queryKey: ["app-platforms", params.slug],
      queryFn: async () => {
        const app = await fetchAppBySlug(params.slug);
        if (!app) return [];
        return fetchAppPlatforms(app.id);
      },
    });
    context.queryClient.ensureQueryData(appOpts);
    context.queryClient.ensureQueryData(platformsOpts);
  },
  component: Page,
  errorComponent: ({ error }) => <Shell><div className="p-12">{error.message}</div></Shell>,
  notFoundComponent: () => <Shell><div className="p-12">App not found</div></Shell>,
});

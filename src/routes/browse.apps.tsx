import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { fetchApps } from "@/lib/apps.functions";
import { AppsGrid } from "@/components/sf/apps-grid";
import type { AppPlatform } from "@/lib/types";
import { useState } from "react";

const PLATFORMS: { id: AppPlatform; label: string; icon: string }[] = [
  { id: "android", label: "Android", icon: "🤖" },
  { id: "windows", label: "Windows", icon: "🪟" },
  { id: "macos", label: "macOS", icon: "🍎" },
  { id: "linux", label: "Linux", icon: "🐧" },
  { id: "ios", label: "iPhone/iPad", icon: "📱" },
  { id: "smart_tv", label: "Smart TV", icon: "📺" },
];

function Page() {
  const search = useSearch({ from: "/browse/apps" });
  const [selectedPlatform, setSelectedPlatform] = useState<AppPlatform | undefined>(search.platform);
  
  const opts = queryOptions({
    queryKey: ["apps", selectedPlatform],
    queryFn: () => fetchApps(selectedPlatform),
  });

  const apps = useSuspenseQuery(opts).data;

  return (
    <div className="mx-auto max-w-[1480px] px-4 md:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-black tracking-tight">Apps</h1>
        <p className="mt-2 text-muted-foreground">Download apps for your devices</p>
      </div>

      {/* Platform Filter Tabs */}
      <div className="mb-8 flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedPlatform(undefined)}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            !selectedPlatform
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          }`}
        >
          All Platforms
        </button>
        {PLATFORMS.map((platform) => (
          <button
            key={platform.id}
            onClick={() => setSelectedPlatform(platform.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
              selectedPlatform === platform.id
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            <span>{platform.icon}</span>
            {platform.label}
          </button>
        ))}
      </div>

      <AppsGrid heading={selectedPlatform ? `${PLATFORMS.find(p => p.id === selectedPlatform)?.label} Apps` : "All Apps"} apps={apps} platforms={selectedPlatform ? [selectedPlatform] : undefined} />
    </div>
  );
}

export const Route = createFileRoute("/browse/apps")({
  head: () => ({ meta: [{ title: "Apps — StreamFlix" }, { name: "description", content: "Browse and download apps on StreamFlix." }] }),
  loader: ({ context, search }) => {
    const opts = queryOptions({
      queryKey: ["apps", search.platform],
      queryFn: () => fetchApps(search.platform as AppPlatform | undefined),
    });
    return context.queryClient.ensureQueryData(opts);
  },
  validateSearch: (search: Record<string, unknown>) => ({
    platform: search.platform as AppPlatform | undefined,
  }),
  component: Page,
  errorComponent: ({ error }) => <div className="p-12">{error.message}</div>,
  notFoundComponent: () => <div className="p-12">Not found</div>,
});

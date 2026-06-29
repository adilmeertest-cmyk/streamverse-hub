import { AppCard } from "./app-card";
import type { App, AppPlatform } from "@/lib/types";

export function AppsGrid({ heading, apps, platforms }: { heading: string; apps: App[]; platforms?: AppPlatform[] }) {
  return (
    <div className="mx-auto max-w-[1480px] px-4 md:px-8 py-10">
      <h1 className="text-3xl md:text-4xl font-black tracking-tight">{heading}</h1>
      <p className="mt-2 text-muted-foreground">{apps.length} apps available</p>
      {apps.length === 0 ? (
        <div className="mt-16 text-center text-muted-foreground">No apps available yet.</div>
      ) : (
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {apps.map((app) => (
            <AppCard key={app.id} app={app} platforms={platforms} />
          ))}
        </div>
      )}
    </div>
  );
}

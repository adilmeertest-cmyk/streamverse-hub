import { Link } from "@tanstack/react-router";
import type { App } from "@/lib/types";
import { Download, Star, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AppCard({ app, platforms }: { app: Pick<App, "id" | "slug" | "name" | "description" | "icon_url" | "version" | "developer" | "download_count" | "rating" | "is_featured">; platforms?: string[] }) {
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card/60 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10">
      {app.is_featured && (
        <span className="absolute top-3 right-3 rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
          Featured
        </span>
      )}
      
      <div className="flex items-start gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-background overflow-hidden">
          {app.icon_url ? (
            <img src={app.icon_url} alt={app.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted">
              <span className="text-2xl font-bold text-muted-foreground">{app.name[0]}</span>
            </div>
          )}
        </div>
        
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold text-foreground truncate">{app.name}</h3>
          {app.developer && (
            <p className="text-sm text-muted-foreground">{app.developer}</p>
          )}
          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-secondary-foreground">
              v{app.version}
            </span>
            {app.rating > 0 && (
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                {app.rating.toFixed(1)}
              </span>
            )}
            <span>{app.download_count.toLocaleString()} downloads</span>
          </div>
        </div>
      </div>
      
      {app.description && (
        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{app.description}</p>
      )}
      
      {platforms && platforms.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {platforms.map((platform) => (
            <span key={platform} className="inline-flex items-center rounded-md bg-secondary/50 px-2 py-0.5 text-[10px] font-medium text-secondary-foreground capitalize">
              {platform}
            </span>
          ))}
        </div>
      )}
      
      <div className="mt-auto pt-4">
        <Button className="w-full gap-2 font-semibold transition-transform group-active:scale-[0.98]" asChild>
          <Link to={`/apps/${app.slug}`}>
            <Download className="h-4 w-4" />
            View Details
          </Link>
        </Button>
      </div>
    </div>
  );
}

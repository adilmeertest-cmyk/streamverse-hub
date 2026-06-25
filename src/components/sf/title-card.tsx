import { Link } from "@tanstack/react-router";
import type { Title } from "@/lib/types";
import { Play, Plus, Crown } from "lucide-react";

export function TitleCard({ t }: { t: Pick<Title, "slug" | "title" | "poster_url" | "release_year" | "kind" | "is_premium" | "is_coming_soon"> }) {
  return (
    <Link
      to="/title/$slug"
      params={{ slug: t.slug }}
      className="group relative block w-[160px] sm:w-[180px] md:w-[200px] shrink-0 overflow-hidden rounded-lg bg-card transition-transform duration-300 hover:scale-[1.06] hover:z-10"
    >
      <div className="relative aspect-[2/3] overflow-hidden">
        {t.poster_url ? (
          <img src={t.poster_url} alt={t.title} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-muted" />
        )}
        {t.is_premium && (
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-yellow-300">
            <Crown className="h-3 w-3" /> Premium
          </span>
        )}
        {t.is_coming_soon && (
          <span className="absolute top-2 right-2 rounded bg-accent/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-foreground">
            Coming soon
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-black">
              <Play className="h-3.5 w-3.5 fill-current" />
            </span>
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/60 text-white">
              <Plus className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </div>
      <div className="px-1 py-2">
        <div className="truncate text-sm font-medium text-foreground">{t.title}</div>
        <div className="text-xs text-muted-foreground capitalize">
          {t.kind}
          {t.release_year ? ` · ${t.release_year}` : ""}
        </div>
      </div>
    </Link>
  );
}
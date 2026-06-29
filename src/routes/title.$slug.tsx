import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { fetchTitleBySlug } from "@/lib/catalog";
import { Shell } from "@/components/sf/shell";
import { Play, Plus, Star, Crown } from "lucide-react";
import { ReviewsSection } from "@/components/sf/reviews-section";
import { supabase } from "@/integrations/supabase/client";

const titleOpts = (slug: string) => queryOptions({
  queryKey: ["title", slug],
  queryFn: async () => {
    const t = await fetchTitleBySlug(slug);
    if (!t) return null;
    const { data: extra } = await supabase.from("titles").select("avg_rating,rating_count").eq("slug", slug).maybeSingle();
    return { ...t, avg_rating: (extra?.avg_rating as number | null) ?? null, rating_count: (extra?.rating_count as number | null) ?? 0 };
  },
});

export const Route = createFileRoute("/title/$slug")({
  loader: async ({ context, params }) => {
    const t = await context.queryClient.ensureQueryData(titleOpts(params.slug));
    if (!t) throw notFound();
    return t;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.title} — StreamFlix` : "StreamFlix" },
      { name: "description", content: loaderData?.synopsis ?? "Watch on StreamFlix." },
      { property: "og:title", content: loaderData?.title ?? "StreamFlix" },
      { property: "og:description", content: loaderData?.synopsis ?? "" },
      { property: "og:image", content: loaderData?.backdrop_url ?? loaderData?.poster_url ?? "" },
      { property: "og:type", content: "video.other" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TitlePage,
  errorComponent: ({ error }) => <Shell><div className="p-12">{error.message}</div></Shell>,
  notFoundComponent: () => <Shell><div className="p-12">Title not found.</div></Shell>,
});

function TitlePage() {
  const { slug } = Route.useParams();
  const t = useSuspenseQuery(titleOpts(slug)).data!;
  return (
    <Shell transparentHeader>
      <div className="relative h-[60vh] min-h-[420px] w-full overflow-hidden">
        {t.backdrop_url && <img src={t.backdrop_url} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/30 to-transparent" />
      </div>
      <div className="mx-auto max-w-[1200px] px-4 md:px-8 -mt-48 relative">
        <div className="grid gap-8 md:grid-cols-[260px_1fr]">
          {t.poster_url && (
            <img src={t.poster_url} alt={t.title} className="hidden md:block w-[260px] aspect-[2/3] object-cover rounded-lg shadow-2xl" />
          )}
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
              <span className="capitalize">{t.kind}</span>
              {t.release_year && <><span>·</span><span>{t.release_year}</span></>}
              {t.runtime_minutes ? <><span>·</span><span>{t.runtime_minutes} min</span></> : null}
              {t.age_rating && <><span>·</span><span className="border border-muted-foreground/50 px-1.5 py-0.5 rounded text-[10px]">{t.age_rating}</span></>}
              {t.is_premium && <span className="inline-flex items-center gap-1 text-yellow-300"><Crown className="h-3 w-3"/> Premium</span>}
            </div>
            <h1 className="mt-2 text-4xl md:text-5xl font-black tracking-tight">{t.title}</h1>
            {t.tagline && <p className="mt-2 text-lg text-muted-foreground italic">{t.tagline}</p>}
            <p className="mt-4 text-base text-foreground/90 max-w-2xl">{t.synopsis}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              {!t.is_coming_soon ? (
                <Link to="/watch/$slug" params={{ slug: t.slug }} className="inline-flex items-center gap-2 rounded-md bg-white px-6 py-2.5 font-bold text-black hover:bg-white/90">
                  <Play className="h-4 w-4 fill-current" /> Play
                </Link>
              ) : (
                <button disabled className="inline-flex items-center gap-2 rounded-md bg-muted px-6 py-2.5 font-bold text-muted-foreground">
                  Coming soon
                </button>
              )}
              <button className="inline-flex items-center gap-2 rounded-md bg-secondary px-5 py-2.5 font-semibold text-secondary-foreground hover:bg-secondary/80">
                <Plus className="h-4 w-4" /> My list
              </button>
              <button className="inline-flex items-center gap-2 rounded-md bg-secondary px-5 py-2.5 font-semibold text-secondary-foreground hover:bg-secondary/80">
                <Star className="h-4 w-4" /> Rate
              </button>
            </div>
            {(t.cast_list?.length || t.directors?.length) ? (
              <div className="mt-8 grid sm:grid-cols-2 gap-4 text-sm">
                {t.cast_list?.length ? (
                  <div><div className="text-muted-foreground">Cast</div><div className="mt-1">{t.cast_list.join(", ")}</div></div>
                ) : null}
                {t.directors?.length ? (
                  <div><div className="text-muted-foreground">Directors</div><div className="mt-1">{t.directors.join(", ")}</div></div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-[1200px] px-4 md:px-8">
        <ReviewsSection titleId={t.id} avgRating={(t as { avg_rating?: number | null }).avg_rating ?? null} ratingCount={(t as { rating_count?: number }).rating_count ?? 0} />
      </div>
    </Shell>
  );
}
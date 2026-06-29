import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Shell } from "@/components/sf/shell";
import { TitleCard } from "@/components/sf/title-card";
import type { Title } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/watchlist")({
  head: () => ({ meta: [{ title: "My List — StreamFlix" }, { name: "description", content: "Your StreamFlix watchlist." }] }),
  component: WatchlistPage,
  errorComponent: ({ error }) => <Shell><div className="p-12">{error.message}</div></Shell>,
  notFoundComponent: () => <Shell><div className="p-12">Not found</div></Shell>,
});

function WatchlistPage() {
  const { data: titles = [] } = useQuery({
    queryKey: ["watchlist"],
    queryFn: async (): Promise<Title[]> => {
      const { data, error } = await supabase
        .from("watchlist")
        .select("created_at, titles:title_id(id,slug,kind,title,tagline,synopsis,release_year,runtime_minutes,age_rating,poster_url,backdrop_url,video_url,is_premium,is_coming_soon,is_featured,is_trending,cast_list,directors)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r: any) => r.titles).filter(Boolean) as Title[];
    },
  });
  return (
    <Shell>
      <div className="mx-auto max-w-[1480px] px-4 md:px-8 py-10">
        <h1 className="text-3xl md:text-4xl font-black tracking-tight">My list</h1>
        {titles.length === 0 ? (
          <p className="mt-6 text-muted-foreground">Your list is empty. <Link to="/" className="underline">Browse titles</Link>.</p>
        ) : (
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {titles.map((t) => <TitleCard key={t.id} t={t} />)}
          </div>
        )}
      </div>
    </Shell>
  );
}
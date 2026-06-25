import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { fetchTitleBySlug } from "@/lib/catalog";
import { VideoPlayer } from "@/components/sf/video-player";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";

const opts = (slug: string) => queryOptions({ queryKey: ["title", slug], queryFn: () => fetchTitleBySlug(slug) });

export const Route = createFileRoute("/watch/$slug")({
  loader: async ({ context, params }) => {
    const t = await context.queryClient.ensureQueryData(opts(params.slug));
    if (!t) throw notFound();
    return t;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `Watch ${loaderData.title} — StreamFlix` : "Watch — StreamFlix" },
      { name: "description", content: `Now playing ${loaderData?.title ?? ""}.` },
    ],
  }),
  component: WatchPage,
  errorComponent: ({ error }) => <div className="p-12 text-white bg-black min-h-screen">{error.message}</div>,
  notFoundComponent: () => <div className="p-12 text-white bg-black min-h-screen">Title not found.</div>,
});

function WatchPage() {
  const { slug } = Route.useParams();
  const t = useSuspenseQuery(opts(slug)).data!;
  const [userId, setUserId] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState<"signin" | "subscribe" | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data.user?.id ?? null);
      if (!data.user) {
        if (t.is_premium) { setBlocked(true); setBlockReason("signin"); }
        return;
      }
      if (t.is_premium) {
        const { data: subs } = await supabase
          .from("subscriptions")
          .select("status, subscription_plans(tier)")
          .eq("user_id", data.user.id)
          .in("status", ["active", "trialing"]);
        const active = subs?.some((s) => {
          const tier = (s.subscription_plans as { tier?: string } | null)?.tier;
          return tier === "premium" || tier === "family";
        });
        if (!active) { setBlocked(true); setBlockReason("subscribe"); }
      }
    })();
  }, [t.is_premium]);

  if (!t.video_url) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-8 text-center">
        <div>
          <div className="text-2xl font-bold">This title isn't available yet.</div>
          <Link to="/title/$slug" params={{ slug: t.slug }} className="mt-4 inline-block underline">Go back</Link>
        </div>
      </div>
    );
  }

  if (blocked) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-8 text-center">
        <div className="max-w-md">
          <div className="text-2xl font-bold">Premium title</div>
          <p className="mt-2 text-white/70">{blockReason === "signin" ? "Sign in and subscribe" : "Upgrade to Premium or Family"} to watch <strong>{t.title}</strong>.</p>
          <div className="mt-4 flex justify-center gap-3">
            {blockReason === "signin" && <Link to="/auth" className="rounded-md bg-primary px-4 py-2 font-semibold">Sign in</Link>}
            <Link to="/pricing" className="rounded-md bg-primary px-4 py-2 font-semibold">See plans</Link>
          </div>
        </div>
      </div>
    );
  }

  const onProgress = async (sec: number, dur: number) => {
    if (!userId) return;
    await supabase.from("watch_history").upsert({
      user_id: userId,
      title_id: t.id,
      episode_id: null,
      position_seconds: sec,
      duration_seconds: dur,
      completed: dur > 0 && sec / dur > 0.9,
      watched_at: new Date().toISOString(),
    }, { onConflict: "user_id,title_id,episode_id" });
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="absolute top-4 left-4 z-10">
        <Link to="/title/$slug" params={{ slug: t.slug }} className="inline-flex items-center gap-2 rounded-md bg-black/60 px-3 py-2 text-sm font-medium">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
      </div>
      <div className="h-screen w-screen">
        <VideoPlayer src={t.video_url} poster={t.backdrop_url} onProgress={onProgress} />
      </div>
    </div>
  );
}
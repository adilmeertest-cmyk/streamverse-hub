import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({
  titleId: z.string().uuid(),
  episodeId: z.string().uuid().optional().nullable(),
});

type Result =
  | { ok: true; url: string; poster: string | null }
  | { ok: false; reason: "not_found" | "unavailable" | "subscribe" };

export const getWatchUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data, context }): Promise<Result> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: title } = await supabaseAdmin
      .from("titles")
      .select("id,is_premium,is_published,video_url,backdrop_url")
      .eq("id", data.titleId)
      .maybeSingle();

    if (!title || !title.is_published) return { ok: false, reason: "not_found" };

    if (title.is_premium) {
      const { data: subs } = await context.supabase
        .from("subscriptions")
        .select("status, subscription_plans(tier)")
        .eq("user_id", context.userId)
        .in("status", ["active", "trialing"]);
      const active = subs?.some((s) => {
        const tier = (s.subscription_plans as { tier?: string } | null)?.tier;
        return tier === "premium" || tier === "family";
      });
      if (!active) return { ok: false, reason: "subscribe" };
    }

    let url = title.video_url as string | null;
    if (data.episodeId) {
      const { data: ep } = await supabaseAdmin
        .from("episodes")
        .select("video_url")
        .eq("id", data.episodeId)
        .maybeSingle();
      url = ep?.video_url ?? url;
    }
    if (!url) return { ok: false, reason: "unavailable" };
    return { ok: true, url, poster: title.backdrop_url };
  });
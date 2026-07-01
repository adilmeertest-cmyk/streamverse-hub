import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({
  titleId: z.string().uuid(),
  episodeId: z.string().uuid().optional().nullable(),
});

type Result =
  | { ok: true; url: string; poster: string | null }
  | { ok: false; reason: "not_found" | "unavailable" };

export const getWatchUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data }): Promise<Result> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: title } = await supabaseAdmin
      .from("titles")
      .select("id,is_published,video_url,backdrop_url")
      .eq("id", data.titleId)
      .maybeSingle();

    if (!title || !title.is_published) return { ok: false, reason: "not_found" };

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
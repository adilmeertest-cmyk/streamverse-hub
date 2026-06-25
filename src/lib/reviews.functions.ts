import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const submitSchema = z.object({
  titleId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  body: z.string().trim().max(2000).optional().nullable(),
});

const titleIdSchema = z.object({ titleId: z.string().uuid(), limit: z.number().int().min(1).max(50).optional() });

function publicClient() {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

export const listTitleReviews = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => titleIdSchema.parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: rows, error } = await sb
      .from("reviews")
      .select("id,user_id,rating,body,created_at,profiles:profiles!reviews_user_id_fkey(display_name,avatar_url)")
      .eq("title_id", data.titleId)
      .eq("is_approved", true)
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 20);
    if (error) throw error;
    return rows ?? [];
  });

export const getMyReview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ titleId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase
      .from("reviews")
      .select("id,rating,body,is_approved,created_at")
      .eq("title_id", data.titleId)
      .eq("user_id", context.userId)
      .maybeSingle();
    return row ?? null;
  });

export const upsertMyReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => submitSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("reviews").upsert({
      user_id: context.userId,
      title_id: data.titleId,
      rating: data.rating,
      body: data.body ?? null,
      is_approved: false,
    }, { onConflict: "user_id,title_id" });
    if (error) throw error;
    return { ok: true };
  });

export const deleteMyReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ titleId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("reviews")
      .delete()
      .eq("user_id", context.userId)
      .eq("title_id", data.titleId);
    if (error) throw error;
    return { ok: true };
  });

export const getTitleRatings = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ titleId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: title } = await sb
      .from("titles")
      .select("avg_rating, rating_count")
      .eq("id", data.titleId)
      .maybeSingle();
    return { avgRating: title?.avg_rating ?? null, ratingCount: title?.rating_count ?? 0 };
  });
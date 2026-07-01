import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ADMIN_ROLES = ["super_admin", "content_manager", "moderator", "finance_manager", "support_agent", "analytics_manager"] as const;
type AdminRole = (typeof ADMIN_ROLES)[number];

async function getMyRoles(supabase: { from: (t: string) => { select: (s: string) => { eq: (c: string, v: string) => Promise<{ data: Array<{ role: string }> | null }> } } }, userId: string): Promise<AdminRole[]> {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  return (data ?? []).map((r) => r.role as AdminRole).filter((r) => (ADMIN_ROLES as readonly string[]).includes(r));
}

async function requireRole(supabase: never, userId: string, allowed: readonly AdminRole[]): Promise<AdminRole[]> {
  const roles = await getMyRoles(supabase as never, userId);
  if (!roles.some((r) => allowed.includes(r))) throw new Error("Forbidden");
  return roles;
}

async function audit(actorId: string, action: string, entityType: string, entityId: string | null, payload?: unknown) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("audit_logs").insert({
    actor_id: actorId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    payload: (payload ?? null) as never,
  });
}

export const getMyAdminContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const roles = await getMyRoles(context.supabase as never, context.userId);
    return { roles, isAdmin: roles.length > 0 };
  });

/* ---------------- Dashboard ---------------- */
export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireRole(context.supabase as never, context.userId, ADMIN_ROLES);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ count: titleCount }, { count: userCount }, { count: activeSubs }, { count: pendingReviews }, { data: recentAudit }] = await Promise.all([
      supabaseAdmin.from("titles").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("subscriptions").select("id", { count: "exact", head: true }).in("status", ["active", "trialing"]),
      supabaseAdmin.from("reviews").select("id", { count: "exact", head: true }).eq("is_approved", false),
      supabaseAdmin.from("audit_logs").select("id,actor_id,action,entity_type,entity_id,created_at").order("created_at", { ascending: false }).limit(10),
    ]);
    return { titleCount: titleCount ?? 0, userCount: userCount ?? 0, activeSubs: activeSubs ?? 0, pendingReviews: pendingReviews ?? 0, recentAudit: recentAudit ?? [] };
  });

/* ---------------- Titles ---------------- */
const titleSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/),
  kind: z.enum(["movie", "series", "drama", "cartoon", "documentary"]),
  title: z.string().min(1).max(200),
  tagline: z.string().max(200).nullable().optional(),
  synopsis: z.string().max(4000).nullable().optional(),
  release_year: z.number().int().min(1900).max(2100).nullable().optional(),
  runtime_minutes: z.number().int().min(0).max(1000).nullable().optional(),
  age_rating: z.string().max(10).nullable().optional(),
  poster_url: z.string().url().nullable().optional(),
  backdrop_url: z.string().url().nullable().optional(),
  trailer_url: z.string().url().nullable().optional(),
  video_url: z.string().url().nullable().optional(),
  is_premium: z.boolean().default(false),
  is_published: z.boolean().default(false),
  is_coming_soon: z.boolean().default(false),
  is_featured: z.boolean().default(false),
  is_trending: z.boolean().default(false),
  cast_list: z.array(z.string()).nullable().optional(),
  directors: z.array(z.string()).nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
});

export const listTitlesAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ q: z.string().optional(), limit: z.number().int().min(1).max(200).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase as never, context.userId, ["super_admin", "content_manager", "moderator", "analytics_manager"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin.from("titles").select("id,slug,kind,title,is_published,is_premium,is_coming_soon,is_featured,is_trending,release_year,avg_rating,rating_count,created_at,review_state").order("created_at", { ascending: false }).limit(data.limit ?? 100);
    if (data.q) q = q.ilike("title", `%${data.q}%`);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

export const getTitleAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase as never, context.userId, ["super_admin", "content_manager", "moderator", "analytics_manager"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: title, error } = await supabaseAdmin
      .from("titles")
      .select("id,slug,kind,title,tagline,synopsis,release_year,release_date,runtime_minutes,age_rating,poster_url,backdrop_url,trailer_url,video_url,is_premium,is_published,is_coming_soon,is_featured,is_trending,review_state,category_id,cast_list,directors,avg_rating,rating_count,view_count,created_at,updated_at")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw error;
    const { data: seasons } = await supabaseAdmin.from("seasons").select("*").eq("title_id", data.id).order("season_number");
    const { data: episodes } = await supabaseAdmin.from("episodes").select("*").in("season_id", (seasons ?? []).map((s) => s.id)).order("episode_number");
    const { data: titleGenres } = await supabaseAdmin.from("title_genres").select("genre_id").eq("title_id", data.id);
    return { title, seasons: seasons ?? [], episodes: episodes ?? [], genreIds: (titleGenres ?? []).map((g) => g.genre_id as string) };
  });

export const upsertTitle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => titleSchema.parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase as never, context.userId, ["super_admin", "content_manager"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = { ...data };
    if (data.id) {
      const { error } = await supabaseAdmin.from("titles").update(payload).eq("id", data.id);
      if (error) throw error;
      await audit(context.userId, "title.update", "title", data.id, payload);
      return { id: data.id };
    } else {
      const { data: row, error } = await supabaseAdmin.from("titles").insert(payload).select("id").single();
      if (error) throw error;
      await audit(context.userId, "title.create", "title", row.id, payload);
      return { id: row.id };
    }
  });

export const deleteTitle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase as never, context.userId, ["super_admin", "content_manager"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("titles").delete().eq("id", data.id);
    if (error) throw error;
    await audit(context.userId, "title.delete", "title", data.id);
    return { ok: true };
  });

export const setTitleGenres = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ titleId: z.string().uuid(), genreIds: z.array(z.string().uuid()) }).parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase as never, context.userId, ["super_admin", "content_manager"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("title_genres").delete().eq("title_id", data.titleId);
    if (data.genreIds.length) {
      await supabaseAdmin.from("title_genres").insert(data.genreIds.map((g) => ({ title_id: data.titleId, genre_id: g })));
    }
    await audit(context.userId, "title.genres", "title", data.titleId, { genreIds: data.genreIds });
    return { ok: true };
  });

/* ---------------- Seasons & Episodes ---------------- */
const seasonSchema = z.object({
  id: z.string().uuid().optional(),
  title_id: z.string().uuid(),
  season_number: z.number().int().min(0).max(100),
  name: z.string().max(200).nullable().optional(),
  poster_url: z.string().url().nullable().optional(),
  release_year: z.number().int().min(1900).max(2100).nullable().optional(),
});

export const upsertSeason = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => seasonSchema.parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase as never, context.userId, ["super_admin", "content_manager"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.id) {
      await supabaseAdmin.from("seasons").update(data).eq("id", data.id);
      await audit(context.userId, "season.update", "season", data.id);
      return { id: data.id };
    }
    const { data: row, error } = await supabaseAdmin.from("seasons").insert(data).select("id").single();
    if (error) throw error;
    await audit(context.userId, "season.create", "season", row.id);
    return { id: row.id };
  });

export const deleteSeason = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase as never, context.userId, ["super_admin", "content_manager"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("seasons").delete().eq("id", data.id);
    await audit(context.userId, "season.delete", "season", data.id);
    return { ok: true };
  });

const episodeSchema = z.object({
  id: z.string().uuid().optional(),
  season_id: z.string().uuid(),
  episode_number: z.number().int().min(0).max(1000),
  title: z.string().min(1).max(200),
  synopsis: z.string().max(4000).nullable().optional(),
  runtime_minutes: z.number().int().min(0).max(1000).nullable().optional(),
  thumbnail_url: z.string().url().nullable().optional(),
  video_url: z.string().url().nullable().optional(),
  air_date: z.string().nullable().optional(),
});

export const upsertEpisode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => episodeSchema.parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase as never, context.userId, ["super_admin", "content_manager"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.id) {
      await supabaseAdmin.from("episodes").update(data).eq("id", data.id);
      await audit(context.userId, "episode.update", "episode", data.id);
      return { id: data.id };
    }
    const { data: row, error } = await supabaseAdmin.from("episodes").insert(data).select("id").single();
    if (error) throw error;
    await audit(context.userId, "episode.create", "episode", row.id);
    return { id: row.id };
  });

export const deleteEpisode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase as never, context.userId, ["super_admin", "content_manager"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("episodes").delete().eq("id", data.id);
    await audit(context.userId, "episode.delete", "episode", data.id);
    return { ok: true };
  });

/* ---------------- Taxonomy ---------------- */
const catSchema = z.object({ id: z.string().uuid().optional(), slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/), name: z.string().min(1).max(100), description: z.string().max(500).nullable().optional(), display_order: z.number().int().nullable().optional() });

export const listCategoriesAdmin = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await requireRole(context.supabase as never, context.userId, ADMIN_ROLES);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("categories").select("*").order("display_order");
  return data ?? [];
});

export const upsertCategory = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => catSchema.parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase as never, context.userId, ["super_admin", "content_manager"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = { ...data, display_order: data.display_order ?? 0 };
    if (data.id) { await supabaseAdmin.from("categories").update(payload).eq("id", data.id); await audit(context.userId, "category.update", "category", data.id); return { id: data.id }; }
    const { data: row, error } = await supabaseAdmin.from("categories").insert(payload).select("id").single();
    if (error) throw error;
    await audit(context.userId, "category.create", "category", row.id);
    return { id: row.id };
  });

export const deleteCategory = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase as never, context.userId, ["super_admin", "content_manager"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("categories").delete().eq("id", data.id);
    await audit(context.userId, "category.delete", "category", data.id);
    return { ok: true };
  });

const genreSchema = z.object({ id: z.string().uuid().optional(), slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/), name: z.string().min(1).max(100) });

export const listGenresAdmin = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await requireRole(context.supabase as never, context.userId, ADMIN_ROLES);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("genres").select("*").order("name");
  return data ?? [];
});

export const upsertGenre = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => genreSchema.parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase as never, context.userId, ["super_admin", "content_manager"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.id) { await supabaseAdmin.from("genres").update(data).eq("id", data.id); await audit(context.userId, "genre.update", "genre", data.id); return { id: data.id }; }
    const { data: row, error } = await supabaseAdmin.from("genres").insert(data).select("id").single();
    if (error) throw error;
    await audit(context.userId, "genre.create", "genre", row.id);
    return { id: row.id };
  });

export const deleteGenre = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase as never, context.userId, ["super_admin", "content_manager"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("genres").delete().eq("id", data.id);
    await audit(context.userId, "genre.delete", "genre", data.id);
    return { ok: true };
  });

const bannerSchema = z.object({
  id: z.string().uuid().optional(),
  title_id: z.string().uuid().nullable().optional(),
  headline: z.string().min(1).max(200),
  subhead: z.string().max(400).nullable().optional(),
  image_url: z.string().url(),
  cta_label: z.string().max(60).nullable().optional(),
  cta_href: z.string().max(500).nullable().optional(),
  display_order: z.number().int().nullable().optional(),
  is_active: z.boolean().default(true),
});

export const listBannersAdmin = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await requireRole(context.supabase as never, context.userId, ADMIN_ROLES);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("banners").select("*").order("display_order");
  return data ?? [];
});

export const upsertBanner = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => bannerSchema.parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase as never, context.userId, ["super_admin", "content_manager"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = { ...data, display_order: data.display_order ?? 0 };
    if (data.id) { await supabaseAdmin.from("banners").update(payload).eq("id", data.id); await audit(context.userId, "banner.update", "banner", data.id); return { id: data.id }; }
    const { data: row, error } = await supabaseAdmin.from("banners").insert(payload).select("id").single();
    if (error) throw error;
    await audit(context.userId, "banner.create", "banner", row.id);
    return { id: row.id };
  });

export const deleteBanner = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase as never, context.userId, ["super_admin", "content_manager"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("banners").delete().eq("id", data.id);
    await audit(context.userId, "banner.delete", "banner", data.id);
    return { ok: true };
  });

/* ---------------- Reviews moderation ---------------- */
export const listReviewsAdmin = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ approved: z.boolean().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase as never, context.userId, ["super_admin", "moderator"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin.from("reviews").select("id,rating,body,is_approved,created_at,user_id,title_id,profiles:profiles!reviews_user_id_fkey(display_name,email),titles:titles!reviews_title_id_fkey(title,slug)").order("created_at", { ascending: false }).limit(100);
    if (typeof data.approved === "boolean") q = q.eq("is_approved", data.approved);
    const { data: rows } = await q;
    return rows ?? [];
  });

export const moderateReview = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), approve: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase as never, context.userId, ["super_admin", "moderator"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.approve) {
      const { data: row } = await supabaseAdmin.from("reviews").update({ is_approved: true }).eq("id", data.id).select("user_id,title_id").maybeSingle();
      if (row) {
        await supabaseAdmin.from("notifications").insert({
          user_id: row.user_id,
          kind: "review_approved",
          title: "Your review was approved",
          body: "Thanks for sharing — your review is now visible to everyone.",
        });
      }
    } else {
      await supabaseAdmin.from("reviews").delete().eq("id", data.id);
    }
    await audit(context.userId, data.approve ? "review.approve" : "review.reject", "review", data.id);
    return { ok: true };
  });

/* ---------------- Users & Roles ---------------- */
export const listUsersAdmin = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ q: z.string().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase as never, context.userId, ["super_admin", "support_agent", "finance_manager"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin.from("profiles").select("id,email,display_name,created_at").order("created_at", { ascending: false }).limit(100);
    if (data.q) q = q.ilike("email", `%${data.q}%`);
    const { data: profiles } = await q;
    const ids = (profiles ?? []).map((p) => p.id);
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id,role").in("user_id", ids);
    return (profiles ?? []).map((p) => ({
      ...p,
      roles: (roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role),
    }));
  });

const ROLE_ENUM = z.enum(["super_admin", "content_manager", "moderator", "finance_manager", "support_agent", "analytics_manager", "user"]);

export const grantRole = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid(), role: ROLE_ENUM }).parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase as never, context.userId, ["super_admin"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").upsert({ user_id: data.userId, role: data.role }, { onConflict: "user_id,role" });
    await audit(context.userId, "role.grant", "user", data.userId, { role: data.role });
    return { ok: true };
  });

export const revokeRole = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid(), role: ROLE_ENUM }).parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase as never, context.userId, ["super_admin"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId).eq("role", data.role);
    await audit(context.userId, "role.revoke", "user", data.userId, { role: data.role });
    return { ok: true };
  });

/* ---------------- Audit log ---------------- */
export const listAuditLog = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await requireRole(context.supabase as never, context.userId, ["super_admin", "analytics_manager"]);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200);
  return data ?? [];
});
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const PLATFORMS = ["windows", "macos", "linux", "android", "ios", "android_tv", "smart_tv"] as const;
export type DownloadPlatform = (typeof PLATFORMS)[number];

const platformSchema = z.enum(PLATFORMS);

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  platform: platformSchema,
  version: z.string().min(1).max(40),
  filename: z.string().min(1).max(200),
  filesize: z.number().int().nonnegative().nullable().optional(),
  url: z.string().url().max(2000),
  storage_path: z.string().max(500).nullable().optional(),
  checksum: z.string().max(200).nullable().optional(),
  release_notes: z.string().max(4000).nullable().optional(),
  is_active: z.boolean().default(true),
});

async function isAdmin(userId: string): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
  return (data ?? []).some((r) => r.role === "super_admin" || r.role === "content_manager");
}

/** Public — used by the /download page. Returns latest active build per platform. */
export const listLatestDownloads = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("downloads")
    .select("id,platform,version,filename,filesize,url,checksum,release_date,release_notes,downloads_count,is_active")
    .eq("is_active", true)
    .order("release_date", { ascending: false });
  if (error) throw error;
  const seen = new Set<string>();
  const latest = [] as typeof data;
  for (const row of data ?? []) {
    if (seen.has(row.platform)) continue;
    seen.add(row.platform);
    latest.push(row);
  }
  return latest ?? [];
});

/** Admin — list everything (including disabled) with full history. */
export const listAllDownloads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await isAdmin(context.userId))) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("downloads")
      .select("*")
      .order("platform")
      .order("release_date", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const upsertDownload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => upsertSchema.parse(d))
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context.userId))) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.id) {
      const { error } = await supabaseAdmin.from("downloads").update(data).eq("id", data.id);
      if (error) throw error;
      return { id: data.id };
    }
    const { data: row, error } = await supabaseAdmin
      .from("downloads")
      .upsert(data, { onConflict: "platform,version" })
      .select("id")
      .single();
    if (error) throw error;
    return { id: row.id };
  });

export const deleteDownload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context.userId))) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin.from("downloads").select("storage_path").eq("id", data.id).maybeSingle();
    if (existing?.storage_path) {
      await supabaseAdmin.storage.from("app-downloads").remove([existing.storage_path]);
    }
    const { error } = await supabaseAdmin.from("downloads").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

/** Returns a signed PUT URL the admin browser can upload directly to. */
export const createUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ platform: platformSchema, version: z.string().min(1).max(40), filename: z.string().min(1).max(200) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context.userId))) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const safeName = data.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${data.platform}/${data.version}/${safeName}`;
    const { data: signed, error } = await supabaseAdmin.storage
      .from("app-downloads")
      .createSignedUploadUrl(path);
    if (error) throw error;
    return { path, token: signed.token, signedUrl: signed.signedUrl };
  });

export const getDownloadStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await isAdmin(context.userId))) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("downloads").select("platform,downloads_count,version,release_date,is_active");
    const rows = data ?? [];
    const total = rows.reduce((sum, r) => sum + Number(r.downloads_count ?? 0), 0);
    const byPlatform: Record<string, number> = {};
    for (const r of rows) byPlatform[r.platform] = (byPlatform[r.platform] ?? 0) + Number(r.downloads_count ?? 0);
    return { total, byPlatform, count: rows.length };
  });
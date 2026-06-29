import { supabase } from "@/integrations/supabase/client";
import type { Banner, Category, Title, TitleKind } from "./types";

const TITLE_FIELDS =
  "id,slug,kind,title,tagline,synopsis,release_year,runtime_minutes,age_rating,poster_url,backdrop_url,is_premium,is_coming_soon,is_featured,is_trending,cast_list,directors";

export async function fetchBanners(): Promise<Banner[]> {
  const { data, error } = await supabase
    .from("banners")
    .select("id,title_id,headline,subhead,image_url,cta_label,cta_href")
    .eq("is_active", true)
    .order("display_order");
  if (error) throw error;
  return (data ?? []) as Banner[];
}

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id,slug,name,description")
    .order("display_order");
  if (error) throw error;
  return (data ?? []) as Category[];
}

export async function fetchTitlesByKind(kind: TitleKind, limit = 24): Promise<Title[]> {
  const { data, error } = await supabase
    .from("titles")
    .select(TITLE_FIELDS)
    .eq("is_published", true)
    .eq("kind", kind)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Title[];
}

export async function fetchTrending(limit = 20): Promise<Title[]> {
  const { data, error } = await supabase
    .from("titles")
    .select(TITLE_FIELDS)
    .eq("is_published", true)
    .eq("is_trending", true)
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Title[];
}

export async function fetchComingSoon(limit = 12): Promise<Title[]> {
  const { data, error } = await supabase
    .from("titles")
    .select(TITLE_FIELDS)
    .eq("is_published", true)
    .eq("is_coming_soon", true)
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Title[];
}

export async function fetchAllPublished(limit = 50): Promise<Title[]> {
  const { data, error } = await supabase
    .from("titles")
    .select(TITLE_FIELDS)
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Title[];
}

export async function fetchTitleBySlug(slug: string): Promise<Title | null> {
  const { data, error } = await supabase
    .from("titles")
    .select(TITLE_FIELDS)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return (data as Title) ?? null;
}

export async function searchTitles(q: string, limit = 30): Promise<Title[]> {
  const term = q.trim();
  if (!term) return [];
  // Sanitize: strip PostgREST filter special chars to prevent filter-clause injection.
  const safe = term.replace(/[,()*\\%"']/g, " ").trim().slice(0, 80);
  if (!safe) return [];
  const pattern = `%${safe}%`;
  const { data, error } = await supabase
    .from("titles")
    .select(TITLE_FIELDS)
    .eq("is_published", true)
    .or(
      [
        `title.ilike.${pattern}`,
        `tagline.ilike.${pattern}`,
        `synopsis.ilike.${pattern}`,
      ].join(","),
    )
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Title[];
}
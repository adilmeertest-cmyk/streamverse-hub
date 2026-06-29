import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";
import {
  getTMDbMovie,
  getTMDbTV,
  getTMDbGenres,
  getTMDbSeason,
  getTMDbTrending,
  getTMDbPopular,
  getTMDbImageUrl,
  type TMDbMovie,
  type TMDbTV,
  type TMDbGenre,
  type TMDbSeason,
  type TMDbEpisode,
} from "@/lib/tmdb";

// Genre mapping from TMDb IDs to local genre slugs
const GENRE_MAP: Record<number, string> = {
  28: "action",
  12: "adventure",
  16: "animation",
  35: "comedy",
  80: "crime",
  99: "documentary",
  18: "drama",
  10751: "family",
  14: "fantasy",
  36: "history",
  27: "horror",
  10402: "music",
  9648: "mystery",
  10749: "romance",
  878: "sci-fi",
  10770: "tv-movie",
  53: "thriller",
  10752: "war",
  37: "western",
  10759: "action-adventure",
  10762: "kids",
  10763: "news",
  10764: "reality",
  10765: "sci-fi-fantasy",
  10766: "soap",
  10767: "talk",
  10768: "politics",
  10769: "variety",
};

function mapTMDbGenres(genreIds: number[]): string[] {
  return genreIds
    .map((id) => GENRE_MAP[id])
    .filter(Boolean) as string[];
}

function generateSlug(title: string, year?: number): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return year ? `${base}-${year}` : base;
}

async function logSyncStart(syncType: string, metadata: Record<string, any> = {}): Promise<string> {
  try {
    const { data } = await (supabaseAdmin as any)
      .from("sync_logs")
      .insert({
        sync_type: syncType,
        status: "started",
        metadata,
      })
      .select("id")
      .single();
    return data?.id ?? "";
  } catch (e) {
    console.error("Failed to log sync start (table may not exist yet):", e);
    return "";
  }
}

async function logSyncComplete(
  logId: string,
  itemsSynced: number,
  itemsFailed: number = 0,
  errorMessage: string | null = null
): Promise<void> {
  if (!logId) return;
  try {
    await (supabaseAdmin as any)
      .from("sync_logs")
      .update({
        status: errorMessage ? "failed" : "completed",
        items_synced: itemsSynced,
        items_failed: itemsFailed,
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
      })
      .eq("id", logId);
  } catch (e) {
    console.error("Failed to log sync complete (table may not exist yet):", e);
  }
}

async function ensureGenresExist() {
  const logId = await logSyncStart("genres");
  let synced = 0;
  let failed = 0;

  try {
    const { data: existingGenres } = await supabaseAdmin
      .from("genres")
      .select("slug");
    const existingSlugs = new Set(existingGenres?.map((g) => g.slug) ?? []);

    const tmdbGenres = await getTMDbGenres();
    const genresToCreate = tmdbGenres.filter((g) => {
      const slug = GENRE_MAP[g.id];
      return slug && !existingSlugs.has(slug);
    });

    for (const genre of genresToCreate) {
      const slug = GENRE_MAP[genre.id];
      if (slug) {
        try {
          await supabaseAdmin.from("genres").insert({
            slug,
            name: genre.name,
          });
          synced++;
        } catch (e) {
          failed++;
          console.error(`Failed to create genre ${genre.name}:`, e);
        }
      }
    }

    await logSyncComplete(logId, synced, failed);
  } catch (e) {
    await logSyncComplete(logId, synced, failed, (e as Error).message);
    throw e;
  }
}

async function syncMovie(tmdbId: number): Promise<string | null> {
  const movie = await getTMDbMovie(tmdbId);
  const slug = generateSlug(movie.title, new Date(movie.release_date).getFullYear());

  // Check if already exists
  const { data: existing } = await supabaseAdmin
    .from("titles")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existing) return existing.id;

  const genreSlugs = mapTMDbGenres(movie.genre_ids);

  // Insert title
  const { data: title } = await supabaseAdmin
    .from("titles")
    .insert({
      slug,
      kind: "movie",
      title: movie.title,
      tagline: movie.tagline || null,
      synopsis: movie.overview || null,
      release_year: movie.release_date ? new Date(movie.release_date).getFullYear() : null,
      runtime_minutes: movie.runtime || null,
      poster_url: getTMDbImageUrl(movie.poster_path, "w500"),
      backdrop_url: getTMDbImageUrl(movie.backdrop_path, "w780"),
      is_published: true,
      is_trending: false,
      is_premium: false,
      is_coming_soon: false,
      is_featured: false,
      cast_list: movie.credits?.cast?.slice(0, 10).map((c: any) => c.name) || [],
      directors: movie.credits?.crew?.filter((c: any) => c.job === "Director").map((c: any) => c.name) || [],
    })
    .select("id")
    .single();

  if (!title) return null;

  // Assign genres
  if (genreSlugs.length > 0) {
    const { data: genres } = await supabaseAdmin
      .from("genres")
      .select("id")
      .in("slug", genreSlugs);

    if (genres) {
      await supabaseAdmin.from("title_genres").insert(
        genres.map((g: { id: string }) => ({
          title_id: title.id,
          genre_id: g.id,
        }))
      );
    }
  }

  return title.id;
}

async function syncMovieWithLog(tmdbId: number): Promise<{ success: boolean; titleId: string | null }> {
  const logId = await logSyncStart("movie", { tmdbId });
  
  try {
    const titleId = await syncMovie(tmdbId);
    await logSyncComplete(logId, titleId ? 1 : 0, titleId ? 0 : 1);
    return { success: !!titleId, titleId };
  } catch (e) {
    await logSyncComplete(logId, 0, 1, (e as Error).message);
    return { success: false, titleId: null };
  }
}

async function syncTV(tmdbId: number): Promise<string | null> {
  const tv = await getTMDbTV(tmdbId);
  const slug = generateSlug(tv.name, new Date(tv.first_air_date).getFullYear());

  // Check if already exists
  const { data: existing } = await supabaseAdmin
    .from("titles")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existing) return existing.id;

  const genreSlugs = mapTMDbGenres(tv.genre_ids);

  // Insert title
  const { data: title } = await supabaseAdmin
    .from("titles")
    .insert({
      slug,
      kind: "series",
      title: tv.name,
      tagline: tv.tagline || null,
      synopsis: tv.overview || null,
      release_year: tv.first_air_date ? new Date(tv.first_air_date).getFullYear() : null,
      poster_url: getTMDbImageUrl(tv.poster_path, "w500"),
      backdrop_url: getTMDbImageUrl(tv.backdrop_path, "w780"),
      is_published: true,
      is_trending: false,
      is_premium: false,
      is_coming_soon: false,
      is_featured: false,
      cast_list: tv.credits?.cast?.slice(0, 10).map((c: any) => c.name) || [],
      directors: tv.credits?.crew?.filter((c: any) => c.job === "Director").map((c: any) => c.name) || [],
    })
    .select("id")
    .single();

  if (!title) return null;

  // Assign genres
  if (genreSlugs.length > 0) {
    const { data: genres } = await supabaseAdmin
      .from("genres")
      .select("id")
      .in("slug", genreSlugs);

    if (genres) {
      await supabaseAdmin.from("title_genres").insert(
        genres.map((g: { id: string }) => ({
          title_id: title.id,
          genre_id: g.id,
        }))
      );
    }
  }

  // Sync seasons and episodes
  if (tv.number_of_seasons) {
    for (let s = 1; s <= tv.number_of_seasons; s++) {
      try {
        const season = await getTMDbSeason(tmdbId, s);
        
        const { data: seasonData } = await supabaseAdmin
          .from("seasons")
          .insert({
            title_id: title.id,
            season_number: s,
            name: season.name || `Season ${s}`,
            release_year: season.air_date ? new Date(season.air_date).getFullYear() : null,
          })
          .select("id")
          .single();

        if (seasonData && season.episodes) {
          await supabaseAdmin.from("episodes").insert(
            season.episodes.map((ep: TMDbEpisode) => ({
              season_id: seasonData.id,
              episode_number: ep.episode_number,
              title: ep.name,
              synopsis: ep.overview || null,
              runtime_minutes: ep.runtime || null,
            }))
          );
        }
      } catch (e) {
        console.error(`Failed to sync season ${s} for ${tv.name}:`, e);
      }
    }
  }

  return title.id;
}

async function syncTVWithLog(tmdbId: number): Promise<{ success: boolean; titleId: string | null }> {
  const logId = await logSyncStart("tv", { tmdbId });
  
  try {
    const titleId = await syncTV(tmdbId);
    await logSyncComplete(logId, titleId ? 1 : 0, titleId ? 0 : 1);
    return { success: !!titleId, titleId };
  } catch (e) {
    await logSyncComplete(logId, 0, 1, (e as Error).message);
    return { success: false, titleId: null };
  }
}

export const syncTMDbGenres = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    await ensureGenresExist();
    return { success: true };
  });

export const syncTMDbMovie = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tmdbId: z.number() }).parse(d))
  .handler(async ({ data }) => {
    const result = await syncMovieWithLog(data.tmdbId);
    return result;
  });

export const syncTMDbTV = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tmdbId: z.number() }).parse(d))
  .handler(async ({ data }) => {
    const result = await syncTVWithLog(data.tmdbId);
    return result;
  });

export const syncTMDbTrending = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ type: z.enum(["movie", "tv"]), limit: z.number().default(10) }).parse(d))
  .handler(async ({ data }) => {
    const syncType = data.type === "movie" ? "trending_movies" : "trending_tv";
    const logId = await logSyncStart(syncType, { limit: data.limit });
    let synced = 0;
    let failed = 0;
    const results = [];
    
    try {
      await ensureGenresExist();
      const items = await getTMDbTrending(data.type, "week");
      
      for (const item of items.slice(0, data.limit)) {
        try {
          const result = data.type === "movie" 
            ? await syncMovieWithLog((item as TMDbMovie).id)
            : await syncTVWithLog((item as TMDbTV).id);
          if (result.success) {
            synced++;
            results.push({ tmdbId: item.id, titleId: result.titleId });
          } else {
            failed++;
          }
        } catch (e) {
          failed++;
          console.error(`Failed to sync trending item ${item.id}:`, e);
        }
      }
      
      await logSyncComplete(logId, Math.floor(synced / items.length), failed);
      return { success: true, synced, results };
    } catch (e) {
      await logSyncComplete(logId, synced, failed, (e as Error).message);
      throw e;
    }
  });

export const syncTMDbPopular = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ type: z.enum(["movie", "tv"]), limit: z.number().default(10), page: z.number().default(1) }).parse(d))
  .handler(async ({ data }) => {
    const syncType = data.type === "movie" ? "popular_movies" : "popular_tv";
    const logId = await logSyncStart(syncType, { limit: data.limit, page: data.page });
    let synced = 0;
    let failed = 0;
    const results = [];
    
    try {
      await ensureGenresExist();
      const items = await getTMDbPopular(data.type, data.page);
      
      for (const item of items.slice(0, data.limit)) {
        try {
          const result = data.type === "movie" 
            ? await syncMovieWithLog((item as TMDbMovie).id)
            : await syncTVWithLog((item as TMDbTV).id);
          if (result.success) {
            synced++;
            results.push({ tmdbId: item.id, titleId: result.titleId });
          } else {
            failed++;
          }
        } catch (e) {
          failed++;
          console.error(`Failed to sync popular item ${item.id}:`, e);
        }
      }
      
      await logSyncComplete(logId, synced, failed);
      return { success: true, synced, results };
    } catch (e) {
      await logSyncComplete(logId, synced, failed, (e as Error).message);
      throw e;
    }
  });

export const searchTMDb = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ query: z.string(), type: z.enum(["movie", "tv"]).default("movie") }).parse(d))
  .handler(async ({ data }) => {
    const items = await (await import("@/lib/tmdb")).searchTMDb(data.query, data.type);
    return items.map((item: any) => ({
      id: item.id,
      title: item.title || item.name,
      overview: item.overview,
      poster_url: getTMDbImageUrl(item.poster_path),
      release_date: item.release_date || item.first_air_date,
      vote_average: item.vote_average,
    }));
  });

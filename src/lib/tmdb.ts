// TMDb API integration for automated content ingestion
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

export interface TMDbMovie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  adult: boolean;
  runtime?: number;
  tagline?: string;
  original_language: string;
  credits?: {
    cast: Array<{ name: string }>;
    crew: Array<{ job: string; name: string }>;
  };
}

export interface TMDbTV {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  original_language: string;
  number_of_seasons?: number;
  number_of_episodes?: number;
  tagline?: string;
  credits?: {
    cast: Array<{ name: string }>;
    crew: Array<{ job: string; name: string }>;
  };
}

export interface TMDbGenre {
  id: number;
  name: string;
}

export interface TMDbSeason {
  id: number;
  season_number: number;
  episode_count: number;
  name: string;
  overview: string;
  poster_path: string | null;
  air_date: string;
  episodes?: TMDbEpisode[];
}

export interface TMDbEpisode {
  id: number;
  episode_number: number;
  name: string;
  overview: string;
  still_path: string | null;
  air_date: string;
  runtime?: number;
}

function tmdbFetch(endpoint: string, params: Record<string, string> = {}) {
  if (!TMDB_API_KEY) throw new Error("TMDB_API_KEY not configured");
  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
  url.searchParams.append("api_key", TMDB_API_KEY);
  Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));
  return fetch(url.toString()).then((r) => {
    if (!r.ok) throw new Error(`TMDb API error: ${r.status}`);
    return r.json();
  });
}

export async function getTMDbGenres(): Promise<TMDbGenre[]> {
  const data = await tmdbFetch("/genre/movie/list");
  return data.genres;
}

export async function searchTMDb(query: string, type: "movie" | "tv" = "movie"): Promise<TMDbMovie[] | TMDbTV[]> {
  const data = await tmdbFetch(`/search/${type}`, { query, include_adult: "false" });
  return data.results;
}

export async function getTMDbMovie(id: number): Promise<TMDbMovie> {
  return tmdbFetch(`/movie/${id}`, { append_to_response: "credits" });
}

export async function getTMDbTV(id: number): Promise<TMDbTV> {
  return tmdbFetch(`/tv/${id}`, { append_to_response: "credits" });
}

export async function getTMDbSeason(tvId: number, seasonNumber: number): Promise<TMDbSeason> {
  return tmdbFetch(`/tv/${tvId}/season/${seasonNumber}`);
}

export function getTMDbImageUrl(path: string | null, size: "w92" | "w154" | "w185" | "w342" | "w500" | "w780" | "original" = "w500"): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export async function getTMDbTrending(type: "movie" | "tv" = "movie", timeWindow: "day" | "week" = "week"): Promise<TMDbMovie[] | TMDbTV[]> {
  const data = await tmdbFetch(`/trending/${type}/${timeWindow}`);
  return data.results;
}

export async function getTMDbPopular(type: "movie" | "tv" = "movie", page = 1): Promise<TMDbMovie[] | TMDbTV[]> {
  const data = await tmdbFetch(`/discover/${type}`, { page: page.toString(), sort_by: "popularity.desc" });
  return data.results;
}

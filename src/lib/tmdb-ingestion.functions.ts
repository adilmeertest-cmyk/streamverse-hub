import { supabase } from "@/integrations/supabase/client";

interface TMDbMovie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  release_date: string;
  poster_path: string;
  backdrop_path: string;
  vote_average: number;
  vote_count: number;
  adult: boolean;
  genre_ids: number[];
  runtime: number;
  tagline: string;
  videos?: { results: TMDbVideo[] };
  credits?: { cast: TMDbCast[]; crew: TMDbCrew[] };
}

interface TMDbTV {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  first_air_date: string;
  poster_path: string;
  backdrop_path: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  number_of_seasons: number;
  number_of_episodes: number;
  videos?: { results: TMDbVideo[] };
  credits?: { cast: TMDbCast[]; crew: TMDbCrew[] };
}

interface TMDbVideo {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
}

interface TMDbCast {
  id: number;
  name: string;
  character: string;
  profile_path: string;
  order: number;
}

interface TMDbCrew {
  id: number;
  name: string;
  job: string;
  profile_path: string;
}

interface TMDbItem {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  media_type: 'movie' | 'tv';
}

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY || import.meta.env.TMDB_API_KEY || "55defd4f66d56ad6c10596314725ec59";
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

export async function fetchTrendingMovies(timeWindow: 'day' | 'week' = 'week', limit: number = 20) {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/trending/movie/${timeWindow}?api_key=${TMDB_API_KEY}&language=en-US&page=1`
    );
    const data = await response.json();
    return data.results.slice(0, limit);
  } catch (error) {
    console.error('Error fetching trending movies:', error);
    return [];
  }
}

export async function fetchPopularMovies(page: number = 1, limit: number = 20) {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&language=en-US&page=${page}`
    );
    const data = await response.json();
    return data.results.slice(0, limit);
  } catch (error) {
    console.error('Error fetching popular movies:', error);
    return [];
  }
}

export async function fetchPopularTV(page: number = 1, limit: number = 20) {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/tv/popular?api_key=${TMDB_API_KEY}&language=en-US&page=${page}`
    );
    const data = await response.json();
    return data.results.slice(0, limit);
  } catch (error) {
    console.error('Error fetching popular TV:', error);
    return [];
  }
}

export async function fetchMovieDetails(tmdbId: number): Promise<TMDbMovie | null> {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/movie/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=credits,videos,recommendations,similar&language=en-US`
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching movie details:', error);
    return null;
  }
}

export async function fetchTVDetails(tmdbId: number): Promise<TMDbTV | null> {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/tv/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=credits,videos,recommendations,similar&language=en-US`
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching TV details:', error);
    return null;
  }
}

export async function searchContent(query: string, page: number = 1) {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&language=en-US&query=${encodeURIComponent(query)}&page=${page}`
    );
    const data = await response.json();
    return data.results;
  } catch (error) {
    console.error('Error searching content:', error);
    return [];
  }
}

export async function importMovieFromTMDB(tmdbId: number) {
  try {
    const movie = await fetchMovieDetails(tmdbId);
    if (!movie) return { success: false, error: 'Failed to fetch movie details' };

    // Check if already exists by title and year
    const releaseYear = movie.release_date ? parseInt(movie.release_date.split('-')[0]) : 2024;
    const { data: existing } = await supabase
      .from('titles')
      .select('id')
      .eq('title', movie.title)
      .eq('release_year', releaseYear)
      .maybeSingle();

    if (existing) {
      return { success: false, error: 'Movie already exists' };
    }

    // Insert title
    const { data: titleData, error: titleError } = await supabase
      .from('titles')
      .insert({
        kind: 'movie',
        title: movie.title,
        slug: `${movie.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${releaseYear}`,
        synopsis: movie.overview,
        release_year: releaseYear,
        runtime_minutes: movie.runtime || 120,
        age_rating: movie.adult ? 'R' : 'PG-13',
        poster_url: movie.poster_path ? `${TMDB_IMAGE_BASE}/w500${movie.poster_path}` : null,
        avg_rating: movie.vote_average || 0,
        is_premium: false,
        is_coming_soon: false,
      })
      .select()
      .single();

    if (titleError) {
      return { success: false, error: titleError.message };
    }

    return { success: true, data: titleData };
  } catch (error) {
    console.error('Error importing movie:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function importTVFromTMDB(tmdbId: number) {
  try {
    const tv = await fetchTVDetails(tmdbId);
    if (!tv) return { success: false, error: 'Failed to fetch TV details' };

    // Check if already exists by title and year
    const releaseYear = tv.first_air_date ? parseInt(tv.first_air_date.split('-')[0]) : 2024;
    const { data: existing } = await supabase
      .from('titles')
      .select('id')
      .eq('title', tv.name)
      .eq('release_year', releaseYear)
      .maybeSingle();

    if (existing) {
      return { success: false, error: 'TV series already exists' };
    }

    // Insert title
    const { data: titleData, error: titleError } = await supabase
      .from('titles')
      .insert({
        kind: 'series',
        title: tv.name,
        slug: `${tv.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${releaseYear}`,
        synopsis: tv.overview,
        release_year: releaseYear,
        runtime_minutes: 45,
        age_rating: 'TV-MA',
        poster_url: tv.poster_path ? `${TMDB_IMAGE_BASE}/w500${tv.poster_path}` : null,
        avg_rating: tv.vote_average || 0,
        is_premium: false,
        is_coming_soon: false,
      })
      .select()
      .single();

    if (titleError) {
      return { success: false, error: titleError.message };
    }

    return { success: true, data: titleData };
  } catch (error) {
    console.error('Error importing TV:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function bulkImportTrendingMovies(limit: number = 20) {
  try {
    const trending = await fetchTrendingMovies('week', limit);
    const results = [];

    for (const item of trending) {
      const result = await importMovieFromTMDB(item.id);
      results.push({ tmdbId: item.id, title: item.title, ...result });
    }

    return {
      success: true,
      total: trending.length,
      imported: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    };
  } catch (error) {
    console.error('Error bulk importing movies:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function bulkImportPopularMovies(limit: number = 20) {
  try {
    const popular = await fetchPopularMovies(1, limit);
    const results = [];

    for (const item of popular) {
      const result = await importMovieFromTMDB(item.id);
      results.push({ tmdbId: item.id, title: item.title, ...result });
    }

    return {
      success: true,
      total: popular.length,
      imported: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    };
  } catch (error) {
    console.error('Error bulk importing movies:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function bulkImportPopularTV(limit: number = 20) {
  try {
    const popular = await fetchPopularTV(1, limit);
    const results = [];

    for (const item of popular) {
      const result = await importTVFromTMDB(item.id);
      results.push({ tmdbId: item.id, title: item.name, ...result });
    }

    return {
      success: true,
      total: popular.length,
      imported: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    };
  } catch (error) {
    console.error('Error bulk importing TV:', error);
    return { success: false, error: (error as Error).message };
  }
}

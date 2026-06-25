import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { syncTMDbGenres, syncTMDbMovie, syncTMDbTV, syncTMDbTrending, syncTMDbPopular, searchTMDb } from "@/lib/sync.functions";
import { AdminPage } from "@/components/sf/admin-shell";
import { Search, RefreshCw, Download, TrendingUp, Star, History, CheckCircle, XCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/sync")({
  component: SyncPage,
  errorComponent: ({ error }) => <div className="p-12">{error.message}</div>,
  notFoundComponent: () => <div className="p-12">Not found</div>,
});

function SyncPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"search" | "trending" | "popular" | "logs">("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"movie" | "tv">("movie");
  const [syncLimit, setSyncLimit] = useState(10);

  const { data: syncLogs } = useQuery({
    queryKey: ["sync-logs"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("sync_logs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(20);
      return data;
    },
    enabled: tab === "logs",
    refetchInterval: tab === "logs" ? 5000 : false,
  });

  const syncGenres = useServerFn(syncTMDbGenres);
  const syncMovie = useServerFn(syncTMDbMovie);
  const syncTV = useServerFn(syncTMDbTV);
  const syncTrending = useServerFn(syncTMDbTrending);
  const syncPopular = useServerFn(syncTMDbPopular);
  const search = useServerFn(searchTMDb);

  const genresMut = useMutation({
    mutationFn: () => syncGenres() as never,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-genres"] }),
  });

  const movieMut = useMutation({
    mutationFn: (tmdbId: number) => syncMovie({ data: { tmdbId } } as never),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-titles"] }),
  });

  const tvMut = useMutation({
    mutationFn: (tmdbId: number) => syncTV({ data: { tmdbId } } as never),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-titles"] }),
  });

  const trendingMut = useMutation({
    mutationFn: () => syncTrending({ data: { type: searchType, limit: syncLimit } } as never),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-titles"] }),
  });

  const popularMut = useMutation({
    mutationFn: () => syncPopular({ data: { type: searchType, limit: syncLimit } } as never),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-titles"] }),
  });

  const { data: searchResults, isFetching: isSearching } = useQuery({
    queryKey: ["tmdb-search", searchQuery, searchType],
    queryFn: () => search({ data: { query: searchQuery, type: searchType } } as never) as never,
    enabled: searchQuery.length > 2,
  });

  const results: Array<{ id: number; title: string; poster_url: string | null; release_date: string; vote_average: number }> = (searchResults as any) ?? [];

  return (
    <AdminPage title="Content Sync" description="Automatically import movies and TV shows from TMDb.">
      <div className="space-y-6">
        {/* Genre Sync */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Sync Genres</h3>
              <p className="text-sm text-muted-foreground">Import all TMDb genres to the database</p>
            </div>
            <button
              onClick={() => genresMut.mutate()}
              disabled={genresMut.isPending}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${genresMut.isPending ? "animate-spin" : ""}`} />
              Sync Genres
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="inline-flex rounded-md border border-border p-0.5 bg-card">
          {(["search", "trending", "popular", "logs"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium rounded capitalize ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Search Tab */}
        {tab === "search" && (
          <div className="rounded-lg border border-border bg-card p-4 space-y-4">
            <div className="flex gap-3">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search TMDb for movies or TV shows..."
                className="flex-1 rounded-md border border-border bg-background px-4 py-2 text-sm"
              />
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value as "movie" | "tv")}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="movie">Movies</option>
                <option value="tv">TV Shows</option>
              </select>
            </div>
            {isSearching && (
              <div className="text-sm text-muted-foreground">Searching...</div>
            )}
            {results && results.length > 0 && (
              <div className="space-y-2">
                {results.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-md border border-border p-3">
                    <div className="flex items-center gap-3">
                      {item.poster_url && (
                        <img src={item.poster_url} alt="" className="h-16 w-12 object-cover rounded" />
                      )}
                      <div>
                        <div className="font-medium">{item.title}</div>
                        <div className="text-xs text-muted-foreground">{item.release_date}</div>
                        <div className="text-xs text-muted-foreground">⭐ {item.vote_average?.toFixed(1)}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => (searchType === "movie" ? movieMut.mutate(item.id) : tvMut.mutate(item.id))}
                      disabled={movieMut.isPending || tvMut.isPending}
                      className="inline-flex items-center gap-2 rounded-md bg-secondary px-3 py-1.5 text-sm font-medium disabled:opacity-50"
                    >
                      <Download className="h-4 w-4" />
                      Import
                    </button>
                  </div>
                ))}
              </div>
            )}
            {results && results.length === 0 && (
              <div className="text-sm text-muted-foreground">No results found</div>
            )}
          </div>
        )}

        {/* Trending Tab */}
        {tab === "trending" && (
          <div className="rounded-lg border border-border bg-card p-4 space-y-4">
            <div className="flex items-center gap-4">
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value as "movie" | "tv")}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="movie">Movies</option>
                <option value="tv">TV Shows</option>
              </select>
              <input
                type="number"
                value={syncLimit}
                onChange={(e) => setSyncLimit(Number(e.target.value))}
                min={1}
                max={20}
                className="w-20 rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
              <span className="text-sm text-muted-foreground">items</span>
              <button
                onClick={() => trendingMut.mutate()}
                disabled={trendingMut.isPending}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                <TrendingUp className={`h-4 w-4 ${trendingMut.isPending ? "animate-spin" : ""}`} />
                Sync Trending
              </button>
            </div>
            {trendingMut.data && (
              <div className="text-sm text-muted-foreground">
                Synced {trendingMut.data.synced} items successfully
              </div>
            )}
          </div>
        )}

        {/* Popular Tab */}
        {tab === "popular" && (
          <div className="rounded-lg border border-border bg-card p-4 space-y-4">
            <div className="flex items-center gap-4">
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value as "movie" | "tv")}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="movie">Movies</option>
                <option value="tv">TV Shows</option>
              </select>
              <input
                type="number"
                value={syncLimit}
                onChange={(e) => setSyncLimit(Number(e.target.value))}
                min={1}
                max={20}
                className="w-20 rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
              <span className="text-sm text-muted-foreground">items</span>
              <button
                onClick={() => popularMut.mutate()}
                disabled={popularMut.isPending}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                <Star className={`h-4 w-4 ${popularMut.isPending ? "animate-spin" : ""}`} />
                Sync Popular
              </button>
            </div>
            {popularMut.data && (
              <div className="text-sm text-muted-foreground">
                Synced {popularMut.data.synced} items successfully
              </div>
            )}
          </div>
        )}

        {/* Sync Logs Tab */}
        {tab === "logs" && (
          <div className="rounded-lg border border-border bg-card p-4 space-y-4">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5" />
              <h3 className="font-semibold">Sync History</h3>
            </div>
            {!syncLogs || syncLogs.length === 0 ? (
              <div className="text-sm text-muted-foreground">No sync logs yet</div>
            ) : (
              <div className="space-y-2">
                {syncLogs.map((log: any) => (
                  <div key={log.id} className="rounded-md border border-border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {log.status === "completed" && <CheckCircle className="h-4 w-4 text-green-500" />}
                        {log.status === "failed" && <XCircle className="h-4 w-4 text-red-500" />}
                        {log.status === "started" && <Clock className="h-4 w-4 text-yellow-500" />}
                        <span className="font-medium capitalize">{log.sync_type.replace(/_/g, " ")}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.started_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Synced: {log.items_synced || 0}</span>
                      <span>Failed: {log.items_failed || 0}</span>
                      {log.completed_at && (
                        <span>Duration: {Math.round((new Date(log.completed_at).getTime() - new Date(log.started_at).getTime()) / 1000)}s</span>
                      )}
                    </div>
                    {log.error_message && (
                      <div className="text-sm text-red-500">{log.error_message}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AdminPage>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/sf/admin-shell";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Download, RefreshCw, Film, Tv, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/content-ingestion")({
  head: () => ({ meta: [{ title: "Content Ingestion — StreamFlix" }] }),
  component: ContentIngestionPage,
});

function ContentIngestionPage() {
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importResults, setImportResults] = useState<any>(null);

  const handleBulkImportTrending = async () => {
    setIsImporting(true);
    setImportStatus("Importing trending movies from TMDB...");
    setImportResults(null);

    try {
      const response = await fetch('/api/ingest/trending-movies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 20 }),
      });

      const data = await response.json();
      setImportResults(data);

      if (data.success) {
        toast.success(`Imported ${data.imported} movies successfully`);
      } else {
        toast.error(data.error || "Import failed");
      }
    } catch (error) {
      toast.error("Failed to import movies");
      console.error(error);
    } finally {
      setIsImporting(false);
      setImportStatus(null);
    }
  };

  const handleBulkImportPopular = async () => {
    setIsImporting(true);
    setImportStatus("Importing popular movies from TMDB...");
    setImportResults(null);

    try {
      const response = await fetch('/api/ingest/popular-movies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 20 }),
      });

      const data = await response.json();
      setImportResults(data);

      if (data.success) {
        toast.success(`Imported ${data.imported} movies successfully`);
      } else {
        toast.error(data.error || "Import failed");
      }
    } catch (error) {
      toast.error("Failed to import movies");
      console.error(error);
    } finally {
      setIsImporting(false);
      setImportStatus(null);
    }
  };

  const handleBulkImportTV = async () => {
    setIsImporting(true);
    setImportStatus("Importing popular TV series from TMDB...");
    setImportResults(null);

    try {
      const response = await fetch('/api/ingest/popular-tv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 20 }),
      });

      const data = await response.json();
      setImportResults(data);

      if (data.success) {
        toast.success(`Imported ${data.imported} TV series successfully`);
      } else {
        toast.error(data.error || "Import failed");
      }
    } catch (error) {
      toast.error("Failed to import TV series");
      console.error(error);
    } finally {
      setIsImporting(false);
      setImportStatus(null);
    }
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Content Ingestion</h1>
          <p className="mt-2 text-muted-foreground">
            Automatically import movies and TV series from TMDB
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Trending Movies</h3>
                <p className="text-sm text-muted-foreground">Import trending movies</p>
              </div>
            </div>
            <Button
              onClick={handleBulkImportTrending}
              disabled={isImporting}
              className="w-full"
            >
              {isImporting && importStatus?.includes("trending") ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Import 20 Movies
                </>
              )}
            </Button>
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Film className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Popular Movies</h3>
                <p className="text-sm text-muted-foreground">Import popular movies</p>
              </div>
            </div>
            <Button
              onClick={handleBulkImportPopular}
              disabled={isImporting}
              className="w-full"
            >
              {isImporting && importStatus?.includes("popular") ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Import 20 Movies
                </>
              )}
            </Button>
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Tv className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Popular TV Series</h3>
                <p className="text-sm text-muted-foreground">Import popular TV shows</p>
              </div>
            </div>
            <Button
              onClick={handleBulkImportTV}
              disabled={isImporting}
              className="w-full"
            >
              {isImporting && importStatus?.includes("TV") ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Import 20 Series
                </>
              )}
            </Button>
          </div>
        </div>

        {importStatus && (
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm">{importStatus}</span>
            </div>
          </div>
        )}

        {importResults && (
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="font-semibold mb-4">Import Results</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total:</span>
                <span className="font-medium">{importResults.total}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Imported:</span>
                <span className="font-medium text-emerald-500">{importResults.imported}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Failed:</span>
                <span className="font-medium text-destructive">{importResults.failed}</span>
              </div>
            </div>

            {importResults.results && importResults.results.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Details:</h4>
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {importResults.results.map((result: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between text-sm p-2 rounded bg-background/50">
                      <span className="truncate flex-1">{result.title}</span>
                      {result.success ? (
                        <span className="text-emerald-500 text-xs ml-2">✓</span>
                      ) : (
                        <span className="text-destructive text-xs ml-2" title={result.error}>✗</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="font-semibold mb-2">About Content Ingestion</h3>
          <p className="text-sm text-muted-foreground">
            This system automatically imports movies and TV series from TMDB (The Movie Database).
            It fetches metadata including titles, descriptions, posters, backdrops, ratings, and more.
            Content is added to your database and categorized automatically.
          </p>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Automated metadata fetching</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>High-quality posters and backdrops</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Automatic categorization</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Duplicate prevention</span>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

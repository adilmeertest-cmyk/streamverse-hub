import { createFileRoute } from "@tanstack/react-router";
import { bulkImportTrendingMovies } from "@/lib/tmdb-ingestion.functions";

export const Route = createFileRoute("/api/ingest/trending-movies")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const limit = body.limit || 20;
          const result = await bulkImportTrendingMovies(limit);
          return Response.json(result);
        } catch (error) {
          return Response.json(
            { success: false, error: (error as Error).message },
            { status: 500 },
          );
        }
      },
    },
  },
});

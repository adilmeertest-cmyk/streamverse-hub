import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { fetchTitlesByKind } from "@/lib/catalog";
import { BrowseGrid } from "@/components/sf/browse-grid";

const opts = queryOptions({ queryKey: ["browse", "movie"], queryFn: () => fetchTitlesByKind("movie", 100) });

function Page() {
  const titles = useSuspenseQuery(opts).data;
  return <BrowseGrid heading="Movies" titles={titles} />;
}

export const Route = createFileRoute("/browse/movies")({
  head: () => ({ meta: [{ title: "Movies — StreamFlix" }, { name: "description", content: "Browse all movies on StreamFlix." }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  component: Page,
  errorComponent: ({ error }) => <div className="p-12">{error.message}</div>,
  notFoundComponent: () => <div className="p-12">Not found</div>,
});
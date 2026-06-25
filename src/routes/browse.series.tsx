import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { fetchTitlesByKind } from "@/lib/catalog";
import { BrowseGrid } from "@/components/sf/browse-grid";

const opts = queryOptions({ queryKey: ["browse", "series"], queryFn: () => fetchTitlesByKind("series", 100) });
function Page() { return <BrowseGrid heading="TV Series" titles={useSuspenseQuery(opts).data} />; }

export const Route = createFileRoute("/browse/series")({
  head: () => ({ meta: [{ title: "TV Series — StreamFlix" }, { name: "description", content: "Binge-worthy series on StreamFlix." }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  component: Page,
  errorComponent: ({ error }) => <div className="p-12">{error.message}</div>,
  notFoundComponent: () => <div className="p-12">Not found</div>,
});
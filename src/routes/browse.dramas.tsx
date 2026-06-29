import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { fetchTitlesByKind } from "@/lib/catalog";
import { BrowseGrid } from "@/components/sf/browse-grid";

const opts = queryOptions({ queryKey: ["browse", "drama"], queryFn: () => fetchTitlesByKind("drama", 100) });
function Page() { return <BrowseGrid heading="Dramas" titles={useSuspenseQuery(opts).data} />; }

export const Route = createFileRoute("/browse/dramas")({
  head: () => ({ meta: [{ title: "Dramas — StreamFlix" }, { name: "description", content: "Powerful drama stories on StreamFlix." }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  component: Page,
  errorComponent: ({ error }) => <div className="p-12">{error.message}</div>,
  notFoundComponent: () => <div className="p-12">Not found</div>,
});
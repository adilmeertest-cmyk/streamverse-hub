import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { fetchTitlesByKind } from "@/lib/catalog";
import { BrowseGrid } from "@/components/sf/browse-grid";

const opts = queryOptions({ queryKey: ["browse", "documentary"], queryFn: () => fetchTitlesByKind("documentary", 100) });
function Page() { return <BrowseGrid heading="Documentaries" titles={useSuspenseQuery(opts).data} />; }

export const Route = createFileRoute("/browse/documentaries")({
  head: () => ({ meta: [{ title: "Documentaries — StreamFlix" }, { name: "description", content: "Real stories, real impact on StreamFlix." }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  component: Page,
  errorComponent: ({ error }) => <div className="p-12">{error.message}</div>,
  notFoundComponent: () => <div className="p-12">Not found</div>,
});
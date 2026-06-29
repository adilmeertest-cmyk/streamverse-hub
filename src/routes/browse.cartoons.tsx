import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { fetchTitlesByKind } from "@/lib/catalog";
import { BrowseGrid } from "@/components/sf/browse-grid";

const opts = queryOptions({ queryKey: ["browse", "cartoon"], queryFn: () => fetchTitlesByKind("cartoon", 100) });
function Page() { return <BrowseGrid heading="Kids & Cartoons" titles={useSuspenseQuery(opts).data} />; }

export const Route = createFileRoute("/browse/cartoons")({
  head: () => ({ meta: [{ title: "Kids & Cartoons — StreamFlix" }, { name: "description", content: "Family-friendly animation on StreamFlix." }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  component: Page,
  errorComponent: ({ error }) => <div className="p-12">{error.message}</div>,
  notFoundComponent: () => <div className="p-12">Not found</div>,
});
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Shell } from "@/components/sf/shell";

export const Route = createFileRoute("/browse")({
  head: () => ({
    meta: [
      { title: "Browse — StreamFlix" },
      { name: "description", content: "Browse movies, series, dramas, kids and documentaries on StreamFlix." },
    ],
  }),
  component: () => <Shell><Outlet /></Shell>,
  errorComponent: ({ error }) => <div className="p-12">{error.message}</div>,
  notFoundComponent: () => <div className="p-12">Not found</div>,
});
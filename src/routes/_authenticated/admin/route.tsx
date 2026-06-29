import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getMyAdminContext } from "@/lib/cms.functions";
import { AdminShell } from "@/components/sf/admin-shell";

const adminOpts = (fn: () => Promise<{ roles: string[]; isAdmin: boolean }>) => queryOptions({
  queryKey: ["admin-context"],
  queryFn: fn,
});

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
  errorComponent: ({ error }) => <div className="p-12">{error.message}</div>,
  notFoundComponent: () => <div className="p-12">Not found</div>,
});

function AdminLayout() {
  const fn = useServerFn(getMyAdminContext);
  const { data } = useSuspenseQuery(adminOpts(fn as never));
  if (!data.isAdmin) {
    throw redirect({ to: "/" });
  }
  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  );
}
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getDashboardStats } from "@/lib/cms.functions";
import { AdminPage } from "@/components/sf/admin-shell";
import { Film, Users, CreditCard, MessageSquare } from "lucide-react";

const opts = (fn: () => Promise<Awaited<ReturnType<typeof getDashboardStats>>>) => queryOptions({ queryKey: ["admin-dashboard"], queryFn: fn });

export const Route = createFileRoute("/_authenticated/admin/")({
  component: DashboardPage,
  errorComponent: ({ error }) => <div className="p-12">{error.message}</div>,
  notFoundComponent: () => <div className="p-12">Not found</div>,
});

function Card({ icon: Icon, label, value }: { icon: typeof Film; label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center gap-3"><Icon className="h-5 w-5 text-primary" /><div className="text-sm text-muted-foreground">{label}</div></div>
      <div className="mt-2 text-3xl font-black">{value}</div>
    </div>
  );
}

function DashboardPage() {
  const fn = useServerFn(getDashboardStats);
  const { data } = useSuspenseQuery(opts(fn as never));
  return (
    <AdminPage title="Dashboard" description="Operational overview of StreamFlix.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card icon={Film} label="Titles" value={data.titleCount} />
        <Card icon={Users} label="Users" value={data.userCount} />
        <Card icon={CreditCard} label="Active subscriptions" value={data.activeSubs} />
        <Card icon={MessageSquare} label="Pending reviews" value={data.pendingReviews} />
      </div>
      <div className="mt-8 rounded-lg border border-border bg-card">
        <div className="border-b border-border px-5 py-3 font-semibold">Recent activity</div>
        <div className="divide-y divide-border">
          {data.recentAudit.length === 0 ? (
            <div className="p-5 text-sm text-muted-foreground">No activity yet.</div>
          ) : data.recentAudit.map((a) => (
            <div key={a.id} className="flex items-center justify-between px-5 py-3 text-sm">
              <div><span className="font-mono text-xs text-muted-foreground">{a.action}</span> <span className="text-muted-foreground">on</span> <span>{a.entity_type}</span></div>
              <div className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
    </AdminPage>
  );
}
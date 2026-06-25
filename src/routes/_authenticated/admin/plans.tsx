import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listPlansAdmin } from "@/lib/cms.functions";
import { AdminPage } from "@/components/sf/admin-shell";

export const Route = createFileRoute("/_authenticated/admin/plans")({
  component: PlansAdmin,
  errorComponent: ({ error }) => <div className="p-12">{error.message}</div>,
  notFoundComponent: () => <div className="p-12">Not found</div>,
});

function PlansAdmin() {
  const list = useServerFn(listPlansAdmin);
  const { data } = useQuery({ queryKey: ["admin-plans"], queryFn: () => list() as never });
  const rows = ((data as unknown) as Array<{ id: string; name: string; tier: string; interval: string; price_cents: number; currency: string; max_screens: number; max_quality: string; trial_days: number; stripe_price_id: string | null; is_active: boolean }> | undefined) ?? [];
  return (
    <AdminPage title="Plans" description="Subscription plans (price IDs are linked to Stripe automatically on first checkout).">
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-xs uppercase text-muted-foreground"><tr><th className="text-left px-4 py-2">Plan</th><th className="text-left px-4 py-2">Price</th><th className="text-left px-4 py-2">Quality</th><th className="text-left px-4 py-2">Screens</th><th className="text-left px-4 py-2">Trial</th><th className="text-left px-4 py-2">Stripe Price</th></tr></thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="px-4 py-2"><div className="font-medium">{p.name}</div><div className="text-xs text-muted-foreground">{p.tier} · {p.interval}</div></td>
                <td className="px-4 py-2">{(p.price_cents/100).toFixed(2)} {p.currency.toUpperCase()}</td>
                <td className="px-4 py-2">{p.max_quality}</td>
                <td className="px-4 py-2">{p.max_screens}</td>
                <td className="px-4 py-2">{p.trial_days}d</td>
                <td className="px-4 py-2 text-xs text-muted-foreground font-mono">{p.stripe_price_id ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminPage>
  );
}
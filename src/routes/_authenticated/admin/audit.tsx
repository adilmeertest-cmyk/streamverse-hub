import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listAuditLog } from "@/lib/cms.functions";
import { AdminPage } from "@/components/sf/admin-shell";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  component: AuditPage,
  errorComponent: ({ error }) => <div className="p-12">{error.message}</div>,
  notFoundComponent: () => <div className="p-12">Not found</div>,
});

function AuditPage() {
  const list = useServerFn(listAuditLog);
  const { data } = useQuery({ queryKey: ["admin-audit"], queryFn: () => list() as never });
  const rows = ((data as unknown) as Array<{ id: string; actor_id: string; action: string; entity_type: string; entity_id: string | null; created_at: string }> | undefined) ?? [];
  return (
    <AdminPage title="Audit log" description="Recent admin actions, newest first.">
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-xs uppercase text-muted-foreground"><tr><th className="text-left px-4 py-2">When</th><th className="text-left px-4 py-2">Action</th><th className="text-left px-4 py-2">Entity</th><th className="text-left px-4 py-2">Actor</th></tr></thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id} className="border-t border-border">
                <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">{new Date(a.created_at).toLocaleString()}</td>
                <td className="px-4 py-2 font-mono text-xs">{a.action}</td>
                <td className="px-4 py-2">{a.entity_type} <span className="text-xs text-muted-foreground">{a.entity_id}</span></td>
                <td className="px-4 py-2 text-xs font-mono text-muted-foreground">{a.actor_id.slice(0, 8)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminPage>
  );
}
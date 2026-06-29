import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listUsersAdmin, grantRole, revokeRole } from "@/lib/cms.functions";
import { AdminPage } from "@/components/sf/admin-shell";
import { Plus, X } from "lucide-react";

const ALL_ROLES = ["super_admin","content_manager","moderator","finance_manager","support_agent","analytics_manager"] as const;

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: UsersAdmin,
  errorComponent: ({ error }) => <div className="p-12">{error.message}</div>,
  notFoundComponent: () => <div className="p-12">Not found</div>,
});

function UsersAdmin() {
  const list = useServerFn(listUsersAdmin);
  const grant = useServerFn(grantRole);
  const revoke = useServerFn(revokeRole);
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const { data } = useQuery({ queryKey: ["admin-users", q], queryFn: () => list({ data: { q: q || undefined } } as never) as never });
  const rows = ((data as unknown) as Array<{ id: string; email: string; display_name: string | null; created_at: string; roles: string[]; subscription: { status: string; subscription_plans: { name: string; tier: string } | null } | null }> | undefined) ?? [];
  const mutGrant = useMutation({ mutationFn: (v: { userId: string; role: string }) => grant({ data: v } as never), onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }) });
  const mutRevoke = useMutation({ mutationFn: (v: { userId: string; role: string }) => revoke({ data: v } as never), onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }) });

  return (
    <AdminPage title="Users & Roles" description="Search users and manage admin roles.">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by email…" className="mb-4 max-w-sm w-full rounded-md border border-border bg-card px-3 py-2 text-sm" />
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-xs uppercase text-muted-foreground"><tr><th className="text-left px-4 py-2">User</th><th className="text-left px-4 py-2">Subscription</th><th className="text-left px-4 py-2">Roles</th><th className="text-left px-4 py-2">Grant</th></tr></thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="border-t border-border align-top">
                <td className="px-4 py-3"><div className="font-medium">{u.display_name ?? "—"}</div><div className="text-xs text-muted-foreground">{u.email}</div></td>
                <td className="px-4 py-3 text-xs">{u.subscription ? <><div>{u.subscription.subscription_plans?.name ?? u.subscription.subscription_plans?.tier}</div><div className="text-muted-foreground">{u.subscription.status}</div></> : <span className="text-muted-foreground">none</span>}</td>
                <td className="px-4 py-3"><div className="flex flex-wrap gap-1">{u.roles.length === 0 && <span className="text-xs text-muted-foreground">user</span>}{u.roles.map((r) => (
                  <span key={r} className="inline-flex items-center gap-1 text-xs bg-primary/15 text-primary px-2 py-0.5 rounded-full">{r}<button onClick={() => mutRevoke.mutate({ userId: u.id, role: r })}><X className="h-3 w-3" /></button></span>
                ))}</div></td>
                <td className="px-4 py-3"><RoleSelect onPick={(role) => mutGrant.mutate({ userId: u.id, role })} existing={u.roles} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminPage>
  );
}

function RoleSelect({ onPick, existing }: { onPick: (role: string) => void; existing: string[] }) {
  const available = ALL_ROLES.filter((r) => !existing.includes(r));
  const [val, setVal] = useState("");
  return (
    <div className="flex items-center gap-1">
      <select value={val} onChange={(e) => setVal(e.target.value)} className="rounded-md border border-border bg-background px-2 py-1 text-xs">
        <option value="">Add role…</option>
        {available.map((r) => <option key={r} value={r}>{r}</option>)}
      </select>
      <button disabled={!val} onClick={() => { if (val) { onPick(val); setVal(""); } }} className="p-1 rounded bg-primary text-primary-foreground disabled:opacity-30"><Plus className="h-3 w-3" /></button>
    </div>
  );
}
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Film, Tags, Image as ImageIcon, MessageSquare, Users, CreditCard, ScrollText, ArrowLeft, RefreshCw, Download } from "lucide-react";
import type { ReactNode } from "react";

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/titles", label: "Titles", icon: Film },
  { to: "/admin/taxonomy", label: "Taxonomy", icon: Tags },
  { to: "/admin/banners", label: "Banners", icon: ImageIcon },
  { to: "/admin/reviews", label: "Reviews", icon: MessageSquare },
  { to: "/admin/users", label: "Users & Roles", icon: Users },
  { to: "/admin/plans", label: "Plans", icon: CreditCard },
  { to: "/admin/sync", label: "Content Sync", icon: RefreshCw },
  { to: "/admin/downloads", label: "App Downloads", icon: Download },
  { to: "/admin/audit", label: "Audit log", icon: ScrollText },
];

export function AdminShell({ children }: { children?: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex">
        <aside className="w-60 shrink-0 border-r border-border bg-card/40 min-h-screen p-4 sticky top-0 h-screen">
          <Link to="/" className="flex items-center gap-2 mb-6 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to site
          </Link>
          <div className="text-lg font-black tracking-tight mb-4">
            <span className="text-primary">STREAM</span>FLIX <span className="text-xs text-muted-foreground font-medium">admin</span>
          </div>
          <nav className="space-y-1">
            {NAV.map((n) => {
              const Icon = n.icon;
              const active = n.end ? path === n.to : path.startsWith(n.to);
              return (
                <Link key={n.to} to={n.to} className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>
                  <Icon className="h-4 w-4" /> {n.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="flex-1 min-w-0">{children ?? <Outlet />}</main>
      </div>
    </div>
  );
}

export function AdminPage({ title, description, children, actions }: { title: string; description?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="p-6 md:p-8 max-w-[1400px]">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}
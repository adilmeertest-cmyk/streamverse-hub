import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, Bell, User, LogOut, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { InstallAppButton } from "./install-app-button";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/browse/movies", label: "Movies" },
  { to: "/browse/series", label: "Series" },
  { to: "/browse/dramas", label: "Dramas" },
  { to: "/browse/cartoons", label: "Kids" },
  { to: "/browse/documentaries", label: "Documentaries" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const refresh = async () => {
      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email ?? null);
      if (data.user) {
        const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
        setIsAdmin((roles ?? []).length > 0);
      } else {
        setIsAdmin(false);
      }
    };
    refresh();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
      refresh();
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors ${
        scrolled || pathname !== "/"
          ? "bg-background/85 backdrop-blur-md border-b border-border"
          : "bg-gradient-to-b from-black/70 to-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[1480px] items-center gap-6 px-4 md:px-8">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-xl font-black tracking-tight text-primary">STREAM</span>
          <span className="text-xl font-black tracking-tight text-foreground">FLIX</span>
        </Link>
        <nav className="hidden md:flex items-center gap-5 text-sm">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="text-muted-foreground hover:text-foreground transition-colors"
              activeProps={{ className: "text-foreground" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <InstallAppButton className="hidden sm:inline-flex" />
          <Link to="/search" className="p-2 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground">
            <Search className="h-5 w-5" />
          </Link>
          {email ? (
            <>
              {isAdmin && (
                <Link to="/admin" className="hidden md:inline-flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80">
                  <Shield className="h-3.5 w-3.5" /> Admin
                </Link>
              )}
              <Link to="/account" className="p-2 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground" aria-label="Notifications">
                <Bell className="h-5 w-5" />
              </Link>
              <Link to="/account" className="flex items-center gap-2 p-1.5 rounded-md hover:bg-secondary">
                <div className="h-7 w-7 rounded-md bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-bold">
                  {email[0]?.toUpperCase()}
                </div>
              </Link>
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate({ to: "/" });
                }}
                className="p-2 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground"
                aria-label="Sign out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              <User className="h-4 w-4" /> Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
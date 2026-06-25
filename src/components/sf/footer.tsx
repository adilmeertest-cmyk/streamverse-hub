import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-card/40">
      <div className="mx-auto max-w-[1480px] px-4 md:px-8 py-12 grid gap-8 md:grid-cols-4 text-sm text-muted-foreground">
        <div>
          <div className="text-xl font-black tracking-tight"><span className="text-primary">STREAM</span>FLIX</div>
          <p className="mt-2">Premium streaming for movies, series, dramas, kids and documentaries.</p>
        </div>
        <div>
          <div className="font-semibold text-foreground mb-2">Browse</div>
          <ul className="space-y-1">
            <li><Link to="/browse/movies">Movies</Link></li>
            <li><Link to="/browse/series">Series</Link></li>
            <li><Link to="/browse/dramas">Dramas</Link></li>
            <li><Link to="/browse/cartoons">Kids</Link></li>
            <li><Link to="/browse/documentaries">Documentaries</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold text-foreground mb-2">Account</div>
          <ul className="space-y-1">
            <li><Link to="/pricing">Plans &amp; pricing</Link></li>
            <li><Link to="/account">My account</Link></li>
            <li><Link to="/watchlist">My list</Link></li>
            <li><Link to="/auth">Sign in</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold text-foreground mb-2">Company</div>
          <ul className="space-y-1">
            <li><a href="#">About</a></li>
            <li><a href="#">Careers</a></li>
            <li><a href="#">Privacy</a></li>
            <li><a href="#">Terms</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} StreamFlix. All rights reserved.
      </div>
    </footer>
  );
}
import type { ReactNode } from "react";
import { Header } from "./header";
import { Footer } from "./footer";

export function Shell({ children, transparentHeader = false }: { children: ReactNode; transparentHeader?: boolean }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className={transparentHeader ? "" : "pt-16"}>{children}</main>
      <Footer />
    </div>
  );
}
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { ReactNode, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { IucLogo } from "./Logo";
import { LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";

export interface NavItem { to: string; label: string; icon?: ReactNode }

export function PortalShell({ items, title, children }: { items: NavItem[]; title: string; children: ReactNode }) {
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); }, [path]);
  async function logout() { await supabase.auth.signOut(); navigate({ to: "/" }); }
  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      {items.map((it) => {
        const active = path === it.to;
        return (
          <Link key={it.to} to={it.to} onClick={onNavigate} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition ${active ? "bg-[var(--sky-accent)] text-[var(--primary-accent)]" : "text-foreground hover:bg-[var(--surface-blue)]"}`}>
            {it.icon}{it.label}
          </Link>
        );
      })}
    </>
  );
  return (
    <div className="min-h-screen flex bg-[var(--surface-muted)]">
      <aside className="hidden md:flex w-64 flex-col bg-card border-r border-[var(--border)]">
        <div className="p-6 border-b border-[var(--border)]">
          <IucLogo className="h-10" />
          <p className="text-xs text-[var(--slate-text)] font-semibold mt-2 uppercase tracking-wider">{title}</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <NavLinks />
        </nav>
        <div className="p-4 border-t border-[var(--border)]">
          <Button variant="ghost" onClick={logout} className="w-full justify-start h-11 rounded-xl"><LogOut className="w-4 h-4 mr-2" />Sign out</Button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <header className="md:hidden bg-card border-b border-[var(--border)] px-4 py-3 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open menu"><Menu className="w-5 h-5" /></Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0 flex flex-col">
                <SheetHeader className="p-6 border-b border-[var(--border)] text-left">
                  <IucLogo className="h-10" />
                  <SheetTitle className="text-xs text-[var(--slate-text)] font-semibold mt-2 uppercase tracking-wider">{title}</SheetTitle>
                </SheetHeader>
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                  <NavLinks onNavigate={() => setOpen(false)} />
                </nav>
                <div className="p-4 border-t border-[var(--border)]">
                  <Button variant="ghost" onClick={logout} className="w-full justify-start h-11 rounded-xl"><LogOut className="w-4 h-4 mr-2" />Sign out</Button>
                </div>
              </SheetContent>
            </Sheet>
            <IucLogo className="h-8" />
          </div>
          <Button variant="ghost" size="sm" onClick={logout} aria-label="Sign out"><LogOut className="w-4 h-4" /></Button>
        </header>
        <div className="p-4 sm:p-6 md:p-10 max-w-[1280px] mx-auto">{children}</div>
      </main>
    </div>
  );
}
import { Link, useNavigate } from "@tanstack/react-router";
import { Monitor, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export function Header() {
  const { user } = useAuth();
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 shadow-header backdrop-blur">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-4 px-5 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5 text-xl font-extrabold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Monitor className="h-4 w-4" />
          </span>
          <span>TempDesk</span>
        </Link>
        <nav className="flex items-center gap-3" aria-label="Main navigation">
          <div className="mr-6 hidden items-center gap-7 text-sm font-semibold md:flex">
            <a href="/#plan" className="transition-colors hover:text-primary">Windows RDP</a>
            <a href="/#features" className="transition-colors hover:text-primary">Features</a>
            <a href="/#faq" className="transition-colors hover:text-primary">FAQ</a>
          </div>
          {user ? (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/auth", replace: true });
              }}
            >
              <LogOut className="h-4 w-4" />Sign out
            </Button>
          ) : (
            <Button asChild variant="outline" className="border-foreground px-5"><Link to="/auth">Log in</Link></Button>
          )}
        </nav>
      </div>
    </header>
  );
}

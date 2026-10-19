import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Clock, Cpu, Loader2, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TempDesk — Free temporary Linux desktops" },
      { name: "description", content: "Launch a Linux desktop in your browser for 60 minutes. Test apps, then let it go." },
      { property: "og:title", content: "TempDesk — Free temporary Linux desktops" },
      { property: "og:description", content: "Launch a Linux desktop in your browser for 60 minutes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type OsRow = { os: string; available: number; total: number };

function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [list, setList] = useState<OsRow[]>([]);
  const [claiming, setClaiming] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.rpc("list_available_os").then(({ data }) => setList((data as OsRow[]) ?? []));
  }, [user]);

  const launch = async (os: string) => {
    setClaiming(os);
    const { error } = await supabase.rpc("claim_desktop", { _os: os });
    setClaiming(null);
    if (error) return toast.error(error.message);
    navigate({ to: "/desktop" });
  };

  return (
    <div className="min-h-screen">
      <Header />
      <section className="grid-bg">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center md:py-24">
          <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 font-mono text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-success" /> 60 minutes free per session
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
            A Linux desktop in your browser. <span className="text-primary">Instantly.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Spin up a temporary desktop, test your apps, and walk away. No installs, no setup.
          </p>
          {!loading && !user && (
            <Button asChild size="lg" className="mt-8"><Link to="/auth">Get started</Link></Button>
          )}
          {user && (
            <Button variant="outline" size="lg" className="mt-8" onClick={() => navigate({ to: "/desktop" })}>
              Open my active desktop
            </Button>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        {user ? (
          <>
            <h2 className="mb-4 text-lg font-semibold">Choose an operating system</h2>
            {list.length === 0 ? (
              <p className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
                No desktops have been added yet.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((o) => (
                  <div key={o.os} className="rounded-2xl border bg-card p-5 transition hover:shadow-glow">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-lg bg-secondary">
                        <Terminal className="h-5 w-5 text-primary" />
                      </span>
                      <div>
                        <div className="font-semibold">{o.os}</div>
                        <div className="font-mono text-xs text-muted-foreground">
                          {o.available}/{o.total} available
                        </div>
                      </div>
                    </div>
                    <Button className="mt-5 w-full" disabled={Number(o.available) === 0 || !!claiming}
                      onClick={() => launch(o.os)}>
                      {claiming === o.os ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {Number(o.available) === 0 ? "All in use" : "Launch desktop"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { i: Clock, t: "60 minute sessions", d: "Every user gets a full hour per desktop." },
              { i: Cpu, t: "Multiple distros", d: "Pick the Linux flavour you need." },
              { i: Terminal, t: "Runs in browser", d: "The desktop streams right into the page." },
            ].map(({ i: I, t, d }) => (
              <div key={t} className="rounded-2xl border bg-card p-5">
                <I className="h-5 w-5 text-primary" />
                <div className="mt-3 font-semibold">{t}</div>
                <p className="mt-1 text-sm text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

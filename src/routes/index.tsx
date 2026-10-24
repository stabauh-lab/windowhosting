import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarDays, Cpu, HardDrive, Loader2, MemoryStick, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TempDesk — Free Windows RDP for 30 days" },
      { name: "description", content: "Get a free Windows machine with 4 vCPU, 8 GiB RAM and 300 GB storage for 30 days. Real IP, real login." },
      { property: "og:title", content: "TempDesk — Free Windows RDP for 30 days" },
      { property: "og:description", content: "Free Windows machine: 4 vCPU, 8 GiB RAM, 300 GB storage for 30 days." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<{ available: number; total: number } | null>(null);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    supabase.rpc("count_available_desktops").then(({ data }) => {
      const row = (data as { available: number; total: number }[] | null)?.[0];
      if (row) setStats({ available: Number(row.available), total: Number(row.total) });
    });
  }, []);

  const launch = async () => {
    if (!user) { navigate({ to: "/auth" }); return; }
    setClaiming(true);
    const { error } = await supabase.rpc("claim_rdp_desktop");
    setClaiming(false);
    if (error) { toast.error(error.message); return; }
    navigate({ to: "/desktop" });
  };

  const specs = [
    { i: Cpu, t: "4 vCPU", d: "Fast virtual cores" },
    { i: MemoryStick, t: "8 GiB RAM", d: "Smooth multitasking" },
    { i: HardDrive, t: "300 GB storage", d: "Room for everything" },
    { i: CalendarDays, t: "30 days straight", d: "Yours around the clock" },
  ];

  return (
    <div className="min-h-screen">
      <Header />
      <section className="grid-bg">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center md:py-24">
          <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 font-mono text-xs text-muted-foreground">
            <span className="h-2 w-2 animate-pulse rounded-full bg-success" />
            {stats ? `${stats.available} of ${stats.total} machines free` : "Free Windows RDP"}
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
            Your own Windows machine. <span className="text-primary">Free for 30 days.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Sign in, claim a machine, and get a real IP address, username and password.
            Connect with any Remote Desktop app — no installs on our side.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" onClick={launch} disabled={claiming || (stats?.available === 0 && !!user)}>
              {claiming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Monitor className="h-4 w-4" />}
              {user ? "Claim my Windows machine" : "Get started free"}
            </Button>
            {user && (
              <Button variant="outline" size="lg" onClick={() => navigate({ to: "/desktop" })}>
                Open my machine
              </Button>
            )}
          </div>
          {!loading && !user && (
            <p className="mt-3 text-xs text-muted-foreground">Free account required · one machine per user</p>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {specs.map(({ i: I, t, d }) => (
            <div key={t} className="rounded-2xl border bg-card p-5 transition hover:shadow-glow">
              <I className="h-5 w-5 text-primary" />
              <div className="mt-3 font-semibold">{t}</div>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border bg-card p-6 md:p-8">
          <h2 className="text-lg font-semibold">How it works</h2>
          <div className="mt-4 grid gap-6 md:grid-cols-3">
            {[
              { n: "01", t: "Sign in", d: "Create a free account in seconds." },
              { n: "02", t: "Claim a machine", d: "We assign you a real Windows machine for 30 days." },
              { n: "03", t: "Connect via RDP", d: "Use the IP, username and password in any Remote Desktop client." },
            ].map((s) => (
              <div key={s.n}>
                <div className="font-mono text-sm text-primary">{s.n}</div>
                <div className="mt-1 font-semibold">{s.t}</div>
                <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

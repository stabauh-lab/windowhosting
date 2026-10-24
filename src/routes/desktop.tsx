import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Power, Monitor, CalendarDays, KeyRound, User, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/desktop")({
  head: () => ({
    meta: [
      { title: "My machine — TempDesk" },
      { name: "description", content: "Your Windows RDP machine details." },
      { property: "og:title", content: "My machine — TempDesk" },
      { property: "og:description", content: "Your Windows RDP machine details." },
    ],
  }),
  component: DesktopPage,
});

type Desk = {
  id: string; name: string; rdp_ip: string | null; rdp_port: number;
  rdp_username: string | null; rdp_password: string | null; expires_at: string | null;
};

function CopyField({ icon: Icon, label, value }: { icon: typeof Globe; label: string; value: string }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Copy failed — select and copy manually");
    }
  };
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border bg-secondary/50 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <Icon className="h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="truncate font-mono text-sm">{value}</div>
        </div>
      </div>
      <Button size="icon" variant="ghost" onClick={copy} title={`Copy ${label}`}>
        <Copy className="h-4 w-4" />
      </Button>
    </div>
  );
}

function DesktopPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [desk, setDesk] = useState<Desk | null | undefined>(undefined);
  const [left, setLeft] = useState(0);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("desktops")
      .select("id,name,rdp_ip,rdp_port,rdp_username,rdp_password,expires_at")
      .eq("assigned_to", user.id)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    setDesk(data);
  }, [user]);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
    load();
  }, [loading, user, load, navigate]);

  useEffect(() => {
    if (!desk?.expires_at) return;
    const tick = () => {
      const ms = new Date(desk.expires_at!).getTime() - Date.now();
      setLeft(Math.max(0, ms));
      if (ms <= 0) setDesk(null);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [desk]);

  const end = async () => {
    await supabase.rpc("release_desktop");
    navigate({ to: "/" });
  };

  if (desk === undefined)
    return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading…</div>;

  if (!desk)
    return (
      <div className="min-h-screen">
        <Header />
        <div className="grid place-items-center px-4 py-24 text-center">
          <div>
            <h1 className="text-2xl font-semibold">No active machine</h1>
            <p className="mt-2 text-muted-foreground">Your 30 days ended or you haven't claimed one yet.</p>
            <Button asChild className="mt-6"><Link to="/">Claim a machine</Link></Button>
          </div>
        </div>
      </div>
    );

  const days = Math.floor(left / 86400000);
  const hours = Math.floor((left % 86400000) / 3600000);
  const mins = Math.floor((left % 3600000) / 60000);
  const address = `${desk.rdp_ip}:${desk.rdp_port}`;

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary/15 text-primary">
              <Monitor className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold">{desk.name}</h1>
              <p className="text-sm text-muted-foreground">Windows · 4 vCPU · 8 GiB RAM · 300 GB</p>
            </div>
          </div>
          <Button variant="destructive" size="sm" onClick={end}>
            <Power className="h-4 w-4" />Release machine
          </Button>
        </div>

        <div className="mt-6 flex items-center gap-3 rounded-2xl border bg-card p-5">
          <CalendarDays className="h-5 w-5 text-primary" />
          <div>
            <div className="font-mono text-lg tabular-nums">
              {days}d {String(hours).padStart(2, "0")}h {String(mins).padStart(2, "0")}m remaining
            </div>
            <div className="text-xs text-muted-foreground">
              Active until {new Date(desk.expires_at!).toLocaleString()}
            </div>
          </div>
        </div>

        <h2 className="mt-8 text-lg font-semibold">Connect with Remote Desktop</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Open any RDP client (Windows: "Remote Desktop Connection", Mac: "Windows App", mobile: "RD Client") and enter:
        </p>
        <div className="mt-4 space-y-3">
          <CopyField icon={Globe} label="Computer / IP address" value={address} />
          <CopyField icon={User} label="Username" value={desk.rdp_username ?? ""} />
          <CopyField icon={KeyRound} label="Password" value={desk.rdp_password ?? ""} />
        </div>

        <p className="mt-6 rounded-xl border bg-card p-4 text-xs text-muted-foreground">
          Keep these details private — anyone with them can sign in to your machine.
          The machine is yours until the timer ends, then it's wiped and given to someone else.
        </p>
      </main>
    </div>
  );
}

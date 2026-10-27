import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Power, Monitor, CalendarDays, KeyRound, User, Globe, Loader2, Check, Clock3, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { canShowCredentials } from "@/lib/rdp-rules";

export const Route = createFileRoute("/desktop")({
  head: () => ({
    meta: [
      { title: "My machine — TempDesk" },
      { name: "description", content: "Your Windows RDP machine details." },
      { property: "og:title", content: "My machine — TempDesk" },
      { property: "og:description", content: "Your Windows RDP machine details." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DesktopPage,
});

type Desk = {
  id: string; name: string; rdp_ip: string | null; rdp_port: number; assigned_to: string | null;
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
  const [request, setRequest] = useState<{ id: string; status: string; created_at: string } | null>(null);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const [machineResult, requestResult] = await Promise.all([supabase
      .from("desktops")
      .select("id,name,rdp_ip,rdp_port,rdp_username,rdp_password,expires_at,assigned_to")
      .eq("assigned_to", user.id)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle(), supabase.from("rdp_requests").select("id,status,created_at,desktop_id").eq("user_id", user.id).order("created_at", { ascending: false })]);
    if (machineResult.error || requestResult.error) { setLoadError(true); setDesk(null); return; }
    setLoadError(false);
    const pending = requestResult.data?.find(r => r.status === "pending") ?? null;
    const data = machineResult.data;
    const approval = requestResult.data?.find(r => r.desktop_id === data?.id && r.status === "approved");
    setRequest(pending);
    setDesk(data && canShowCredentials(approval?.status ?? null, data.assigned_to, user.id, data.expires_at) ? data : null);
  }, [user]);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
    void load();
    if (!user) return;
    const timer = setInterval(() => { void load(); }, 5000);
    return () => clearInterval(timer);
  }, [loading, user, load, navigate]);

  useEffect(() => {
    if (!desk?.expires_at) return;
    const expiresAt = desk.expires_at;
    const tick = () => {
      const ms = new Date(expiresAt).getTime() - Date.now();
      setLeft(Math.max(0, ms));
      if (ms <= 0) setDesk(null);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [desk]);

  const end = async () => {
    const { error } = await supabase.rpc("release_desktop");
    if (error) { toast.error("Could not release your machine. Try again."); return; }
    navigate({ to: "/" });
  };

  if (desk === undefined)
    return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading…</div>;

  if (loadError) return <div className="min-h-screen"><Header /><main className="mx-auto max-w-xl px-5 py-20 text-center"><h1 className="text-2xl font-semibold">Could not check your request</h1><Button className="mt-6" onClick={load}><RefreshCw />Try again</Button></main></div>;

  if (!desk && request) return (
    <div className="min-h-screen"><Header /><main className="mx-auto max-w-2xl px-5 py-16">
      <span className="grid h-16 w-16 place-items-center rounded-lg bg-secondary text-primary"><Loader2 className="h-8 w-8 animate-spin motion-reduce:animate-none" /></span>
      <p className="mt-6 font-mono text-xs text-primary">RDP REQUEST · {request.id.slice(0, 8)}</p>
      <h1 className="mt-3 text-3xl font-bold">Awaiting admin approval</h1>
      <p className="mt-4 leading-7 text-muted-foreground">Your Windows RDP request has been sent. Your IP address and login details will appear here once the admin approves and assigns your machine.</p>
      <ol className="mt-8 space-y-5 border-y py-6">
        <li className="flex items-center gap-3"><Check className="h-5 w-5 text-success" /><div><p className="font-semibold">Request received</p><p className="mt-1 text-xs text-muted-foreground">{new Date(request.created_at).toLocaleString()}</p></div></li>
        <li className="flex items-center gap-3"><Clock3 className="h-5 w-5 text-primary" /><p className="font-semibold">Admin review in progress</p></li>
        <li className="flex items-center gap-3 text-muted-foreground"><Monitor className="h-5 w-5" /><p>Connection details ready after approval</p></li>
      </ol>
      <p className="mt-5 text-sm text-muted-foreground">4 vCPU · 8 GiB RAM · 300 GB storage<br />Your 30 days start when your machine is approved.</p>
      <Button variant="outline" className="mt-6" onClick={load}><RefreshCw />Check status</Button>
    </main></div>
  );

  if (!desk)
    return (
      <div className="min-h-screen">
        <Header />
        <div className="grid place-items-center px-4 py-24 text-center">
          <div>
            <h1 className="text-2xl font-semibold">No active machine</h1>
            <p className="mt-2 text-muted-foreground">Your 30 days ended or you haven't claimed one yet.</p>
            <Button asChild className="mt-6"><Link to="/">Request a machine</Link></Button>
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
              Active until {desk.expires_at ? new Date(desk.expires_at).toLocaleString() : "—"}
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
          Save your files elsewhere before your access expires.
        </p>
      </main>
    </div>
  );
}

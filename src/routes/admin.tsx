import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Trash2, RotateCcw, Lock, ShieldCheck, Monitor, LogOut, Cpu, MemoryStick, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { unlockAdmin, checkAdminUnlocked, lockAdmin } from "@/lib/admin-gate.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — TempDesk" },
      { name: "description", content: "Manage Windows RDP desktops." },
      { property: "og:title", content: "Admin — TempDesk" },
      { property: "og:description", content: "Manage Windows RDP desktops." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

type Desk = {
  id: string; name: string; rdp_ip: string | null; rdp_port: number;
  rdp_username: string | null; rdp_password: string | null;
  enabled: boolean; assigned_to: string | null; expires_at: string | null;
};

function AdminPage() {
  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  const check = useServerFn(checkAdminUnlocked);

  useEffect(() => {
    check().then((r) => setUnlocked(r.unlocked)).catch(() => setUnlocked(false));
  }, [check]);

  if (unlocked === null)
    return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading…</div>;
  if (!unlocked) return <PasswordGate onUnlock={() => setUnlocked(true)} />;
  return <AdminPanel onLock={() => setUnlocked(false)} />;
}

function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const unlock = useServerFn(unlockAdmin);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const password = new FormData(e.currentTarget).get("password") as string;
    const { ok } = await unlock({ data: { password } });
    setBusy(false);
    if (ok) onUnlock();
    else setError(true);
  }

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-glow">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary/15 text-primary">
          <Lock className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-2xl font-semibold">Admin access</h1>
        <p className="mt-1 text-sm text-muted-foreground">Enter the admin password to manage desktops.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required autoComplete="current-password" autoFocus />
          </div>
          {error && <p className="text-sm text-destructive">Incorrect password.</p>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Checking…" : "Unlock admin panel"}
          </Button>
        </form>
        <Button asChild variant="ghost" className="mt-2 w-full"><Link to="/">Back to site</Link></Button>
      </div>
    </div>
  );
}

function AdminPanel({ onLock }: { onLock: () => void }) {
  const lock = useServerFn(lockAdmin);
  const [rows, setRows] = useState<Desk[]>([]);
  const [name, setName] = useState("");
  const [ip, setIp] = useState("");
  const [port, setPort] = useState("3389");
  const [username, setUsername] = useState("Administrator");
  const [password, setPassword] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase.from("desktops").select("*").order("created_at", { ascending: false });
    setRows((data as Desk[]) ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("desktops").insert({
      name: name || `Windows #${rows.length + 1}`,
      os: "Windows",
      vnc_url: "rdp",
      rdp_ip: ip.trim(),
      rdp_port: Number(port) || 3389,
      rdp_username: username.trim(),
      rdp_password: password,
    });
    if (error) { toast.error(error.message); return; }
    setName(""); setIp(""); setPassword("");
    toast.success("Desktop added");
    load();
  };

  const update = async (id: string, patch: Partial<Desk>) => {
    const { error } = await supabase.from("desktops").update(patch).eq("id", id);
    if (error) toast.error(error.message); else load();
  };
  const remove = async (id: string) => {
    await supabase.from("desktops").delete().eq("id", id); load();
  };

  const inUse = (d: Desk) => d.assigned_to && d.expires_at && new Date(d.expires_at) > new Date();
  const free = rows.filter((d) => d.enabled && !inUse(d)).length;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Monitor className="h-4 w-4" />
            </span>
            <span>TempDesk <span className="text-primary">Admin</span></span>
          </Link>
          <Button variant="outline" size="sm" onClick={async () => { await lock(); onLock(); }}>
            <LogOut className="h-4 w-4" />Lock panel
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold">Windows RDP machines</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Add real Windows machines. Each user who logs in gets one for 30 days.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            { i: Cpu, t: "4 vCPU", d: "per machine" },
            { i: MemoryStick, t: "8 GiB RAM", d: "per machine" },
            { i: HardDrive, t: "300 GB storage", d: "per machine" },
          ].map(({ i: I, t, d }) => (
            <div key={t} className="flex items-center gap-3 rounded-xl border bg-card p-4">
              <I className="h-5 w-5 text-primary" />
              <div><div className="font-semibold">{t}</div><div className="text-xs text-muted-foreground">{d}</div></div>
            </div>
          ))}
        </div>

        <p className="mt-6 font-mono text-xs text-muted-foreground">
          {free} free · {rows.length - free} in use · {rows.length} total
        </p>

        <form onSubmit={add} className="mt-3 grid gap-4 rounded-2xl border bg-card p-5 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5"><Label>Name (optional)</Label>
            <Input placeholder="Windows #1" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>IP address</Label>
            <Input required placeholder="203.0.113.10" value={ip} onChange={(e) => setIp(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>RDP port</Label>
            <Input required type="number" min={1} max={65535} value={port} onChange={(e) => setPort(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Username</Label>
            <Input required value={username} onChange={(e) => setUsername(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Password</Label>
            <Input required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          <div className="flex items-end">
            <Button type="submit" className="w-full"><Plus className="h-4 w-4" />Add machine</Button>
          </div>
        </form>

        <div className="mt-6 overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr className="border-b">
                <th className="p-3">Name</th><th className="p-3">IP : Port</th><th className="p-3">Login</th>
                <th className="p-3">Status</th><th className="p-3">Enabled</th><th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No machines yet.</td></tr>}
              {rows.map((d) => (
                <tr key={d.id} className="border-b last:border-0">
                  <td className="p-3 font-medium">{d.name}</td>
                  <td className="p-3 font-mono text-xs">{d.rdp_ip}:{d.rdp_port}</td>
                  <td className="p-3 font-mono text-xs text-muted-foreground">{d.rdp_username}</td>
                  <td className="p-3">
                    {inUse(d)
                      ? <span className="text-destructive">In use · until {new Date(d.expires_at!).toLocaleDateString()}</span>
                      : <span className="text-success">Free</span>}
                  </td>
                  <td className="p-3"><Switch checked={d.enabled} onCheckedChange={(v) => update(d.id, { enabled: v })} /></td>
                  <td className="p-3 text-right whitespace-nowrap">
                    {inUse(d) && (
                      <Button size="icon" variant="ghost" title="Force release"
                        onClick={() => update(d.id, { assigned_to: null, expires_at: null })}>
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => remove(d.id)}><Trash2 className="h-4 w-4" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Trash2, RotateCcw, Lock, ShieldCheck, Monitor, LogOut, Cpu, MemoryStick, HardDrive, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { unlockAdmin, checkAdminUnlocked, lockAdmin } from "@/lib/admin-gate.functions";
import { addAdminMachine, approveRdp, changeAdminMachine, listAdminRdp } from "@/lib/rdp-admin.functions";
import { canApproveMachine, isMachineAvailable } from "@/lib/rdp-rules";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — TempDesk" },
      { name: "description", content: "Manage Windows RDP desktops." },
      { property: "og:title", content: "Admin — TempDesk" },
      { property: "og:description", content: "Manage Windows RDP desktops." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

type Desk = {
  id: string; name: string; rdp_ip: string | null; rdp_port: number;
  rdp_username: string | null; rdp_password: string | null;
  enabled: boolean; assigned_to: string | null; expires_at: string | null; os: string;
};
type Request = { id: string; user_id: string; created_at: string; status: string };

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
    try {
      const { ok } = await unlock({ data: { password } });
      if (ok) onUnlock(); else setError(true);
    } catch { toast.error("Could not unlock the panel. Try again."); }
    finally { setBusy(false); }
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
  const [requests, setRequests] = useState<Request[]>([]);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [busyRequest, setBusyRequest] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const list = useServerFn(listAdminRdp);
  const approve = useServerFn(approveRdp);
  const addMachine = useServerFn(addAdminMachine);
  const changeMachine = useServerFn(changeAdminMachine);
  const [name, setName] = useState("");
  const [ip, setIp] = useState("");
  const [port, setPort] = useState("3389");
  const [username, setUsername] = useState("Administrator");
  const [password, setPassword] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await list();
      setRows(data.desktops);
      setRequests(data.requests);
      setLoadError(false);
    } catch { setLoadError(true); }
  }, [list]);

  useEffect(() => { void load(); const timer = setInterval(() => { void load(); }, 10000); return () => clearInterval(timer); }, [load]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addMachine({ data: { name: name || `Windows #${rows.length + 1}`, ip, port: Number(port), username, password } });
      setName(""); setIp(""); setPassword("");
      toast.success("Desktop added");
      await load();
    } catch { toast.error("Could not add the machine. Check its connection details."); }
  };

  const update = async (id: string, action: "enable" | "disable" | "release" | "delete") => {
    try { await changeMachine({ data: { id, action } }); await load(); }
    catch { toast.error("Could not update this machine."); }
  };
  const approveRequest = async (id: string) => {
    const desktopId = selected[id];
    if (!desktopId) return;
    setBusyRequest(id);
    try {
      const result = await approve({ data: { requestId: id, desktopId } });
      if (!result.ok) toast.error(result.error); else toast.success("Approved. The user's connection details are now available.");
      await load();
    } catch { toast.error("Approval failed. Refresh and try again."); }
    finally { setBusyRequest(null); }
  };
  const inUse = (d: Desk) => !!d.assigned_to && (!d.expires_at || new Date(d.expires_at) > new Date());
  const free = rows.filter((d) => isMachineAvailable(d)).length;
  const available = rows.filter((d) => canApproveMachine(d));

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
          Approve requests and assign real Windows machines. The 30 days start at approval.
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

        <section className="mt-10 border-y py-7">
          <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold">Pending RDP requests <span className="font-mono text-primary">({requests.length})</span></h2><Button variant="outline" size="icon" title="Refresh requests" onClick={load}><RotateCcw /></Button></div>
          {loadError && <p role="alert" className="mt-4 text-sm text-destructive">Could not refresh the queue. Try again.</p>}
          {!loadError && requests.length === 0 && <p className="mt-5 text-sm text-muted-foreground">No pending requests.</p>}
          <div className="mt-5 space-y-3">{requests.map(request => <div key={request.id} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-card p-4">
            <div className="min-w-0"><p className="text-sm font-semibold">Request <span className="font-mono">{request.id.slice(0, 8)}</span></p><p className="mt-1 break-all font-mono text-xs text-muted-foreground">User: {request.user_id}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(request.created_at).toLocaleString()}</p></div>
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
              <select aria-label={`Machine for request ${request.id.slice(0, 8)}`} className="h-10 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm sm:max-w-64" value={selected[request.id] ?? ""} onChange={e => setSelected(prev => ({ ...prev, [request.id]: e.target.value }))}>
                <option value="">{available.length ? "Select a machine" : "Add an available machine first"}</option>{available.map(d => <option key={d.id} value={d.id}>{d.name} · {d.rdp_ip}</option>)}
              </select>
              <Button disabled={busyRequest !== null || !available.some(d => d.id === selected[request.id])} onClick={() => approveRequest(request.id)}>{busyRequest === request.id ? <Loader2 className="animate-spin" /> : <Check />}Approve</Button>
            </div>
          </div>)}</div>
        </section>

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
            <Input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
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
                      ? <span className="text-destructive">In use{d.expires_at ? ` · until ${new Date(d.expires_at).toLocaleDateString()}` : ""}</span>
                      : <span className="text-success">Free</span>}
                  </td>
                  <td className="p-3"><Switch checked={d.enabled} onCheckedChange={(v) => update(d.id, v ? "enable" : "disable")} /></td>
                  <td className="p-3 text-right whitespace-nowrap">
                    {inUse(d) && (
                      <Button size="icon" variant="ghost" title="Force release"
                        onClick={() => update(d.id, "release")}>
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" title="Delete machine" onClick={() => update(d.id, "delete")}><Trash2 className="h-4 w-4" /></Button>
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

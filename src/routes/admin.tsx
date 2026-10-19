import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — TempDesk" },
      { name: "description", content: "Manage VNC desktops." },
      { property: "og:title", content: "Admin — TempDesk" },
      { property: "og:description", content: "Manage VNC desktops." },
    ],
  }),
  component: AdminPage,
});

const OS_OPTIONS = ["Ubuntu", "Debian", "Fedora", "Kali Linux", "Arch Linux", "Linux Mint", "Alpine"];

type Desk = {
  id: string; name: string; os: string; vnc_url: string; enabled: boolean;
  assigned_to: string | null; expires_at: string | null;
};

function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Desk[]>([]);
  const [os, setOs] = useState("Ubuntu");
  const [custom, setCustom] = useState("");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase.from("desktops").select("*").order("created_at", { ascending: false });
    setRows((data as Desk[]) ?? []);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/auth" });
    else if (isAdmin) load();
  }, [loading, user, isAdmin, load, navigate]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalOs = os === "__custom" ? custom.trim() : os;
    if (!finalOs) return toast.error("Enter an OS name");
    const { error } = await supabase.from("desktops").insert({
      os: finalOs, name: name || `${finalOs} #${rows.length + 1}`, vnc_url: url,
    });
    if (error) return toast.error(error.message);
    setName(""); setUrl(""); toast.success("Desktop added"); load();
  };

  const update = async (id: string, patch: Partial<Desk>) => {
    const { error } = await supabase.from("desktops").update(patch).eq("id", id);
    if (error) toast.error(error.message); else load();
  };
  const remove = async (id: string) => {
    await supabase.from("desktops").delete().eq("id", id); load();
  };

  if (loading) return null;
  if (!isAdmin)
    return (<div className="min-h-screen"><Header />
      <p className="mt-20 text-center text-muted-foreground">You don't have admin access.</p></div>);

  const inUse = (d: Desk) => d.assigned_to && d.expires_at && new Date(d.expires_at) > new Date();

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-2xl font-semibold">Admin panel</h1>
        <p className="text-sm text-muted-foreground">Add VNC links and pick which OS they run.</p>

        <form onSubmit={add} className="mt-6 grid gap-4 rounded-2xl border bg-card p-5 md:grid-cols-[180px_1fr_2fr_auto] md:items-end">
          <div className="space-y-1.5"><Label>OS</Label>
            <Select value={os} onValueChange={setOs}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {OS_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                <SelectItem value="__custom">Other…</SelectItem>
              </SelectContent>
            </Select>
            {os === "__custom" && <Input placeholder="OS name" value={custom} onChange={(e) => setCustom(e.target.value)} />}
          </div>
          <div className="space-y-1.5"><Label>Name (optional)</Label>
            <Input placeholder="Ubuntu #1" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>VNC link</Label>
            <Input type="url" required placeholder="https://host:6080/vnc.html?autoconnect=true"
              value={url} onChange={(e) => setUrl(e.target.value)} /></div>
          <Button type="submit"><Plus className="h-4 w-4" />Add</Button>
        </form>

        <div className="mt-6 overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr className="border-b">
                <th className="p-3">Name</th><th className="p-3">OS</th><th className="p-3">Link</th>
                <th className="p-3">Status</th><th className="p-3">Enabled</th><th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No desktops yet.</td></tr>}
              {rows.map((d) => (
                <tr key={d.id} className="border-b last:border-0">
                  <td className="p-3 font-medium">{d.name}</td>
                  <td className="p-3">{d.os}</td>
                  <td className="max-w-[240px] truncate p-3 font-mono text-xs text-muted-foreground">{d.vnc_url}</td>
                  <td className="p-3">
                    {inUse(d)
                      ? <span className="text-destructive">In use · until {new Date(d.expires_at!).toLocaleTimeString()}</span>
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

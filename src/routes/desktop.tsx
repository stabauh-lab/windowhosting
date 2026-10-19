import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Maximize2, Power, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/desktop")({
  head: () => ({
    meta: [
      { title: "My desktop — TempDesk" },
      { name: "description", content: "Your temporary Linux desktop session." },
      { property: "og:title", content: "My desktop — TempDesk" },
      { property: "og:description", content: "Your temporary Linux desktop session." },
    ],
  }),
  component: DesktopPage,
});

type Desk = { id: string; name: string; os: string; vnc_url: string; expires_at: string | null };

function DesktopPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [desk, setDesk] = useState<Desk | null | undefined>(undefined);
  const [left, setLeft] = useState(0);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("desktops")
      .select("id,name,os,vnc_url,expires_at")
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
    const t = setInterval(() => {
      const ms = new Date(desk.expires_at!).getTime() - Date.now();
      setLeft(Math.max(0, ms));
      if (ms <= 0) setDesk(null);
    }, 1000);
    return () => clearInterval(t);
  }, [desk]);

  const end = async () => {
    await supabase.rpc("release_desktop");
    navigate({ to: "/" });
  };

  if (desk === undefined) return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading…</div>;
  if (!desk)
    return (
      <div className="grid min-h-screen place-items-center px-4 text-center">
        <div>
          <h1 className="text-2xl font-semibold">No active desktop</h1>
          <p className="mt-2 text-muted-foreground">Your session ended or you haven't launched one yet.</p>
          <Button asChild className="mt-6"><Link to="/">Launch a desktop</Link></Button>
        </div>
      </div>
    );

  const m = Math.floor(left / 60000);
  const s = Math.floor((left % 60000) / 1000);
  const low = left < 5 * 60000;

  return (
    <div className="flex h-screen flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-card px-3 py-2">
        <div className="flex items-center gap-3">
          <Link to="/" className="font-semibold">TempDesk</Link>
          <span className="rounded-md bg-secondary px-2 py-0.5 text-xs">{desk.os}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`font-mono text-sm tabular-nums ${low ? "text-destructive" : "text-primary"}`}>
            {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
          </span>
          <Button size="sm" variant="ghost" asChild>
            <a href={desk.vnc_url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>
          </Button>
          <Button size="sm" variant="ghost"
            onClick={() => document.getElementById("vnc")?.requestFullscreen()}>
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="destructive" onClick={end}><Power className="h-4 w-4" />End</Button>
        </div>
      </div>
      <iframe id="vnc" src={desk.vnc_url} title="VNC desktop" className="w-full flex-1 bg-background"
        allow="clipboard-read; clipboard-write; fullscreen" />
    </div>
  );
}

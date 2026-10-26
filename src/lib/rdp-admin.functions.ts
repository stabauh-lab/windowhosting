import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";

function validId(value: string) {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) throw new Error("Invalid selection");
  return value;
}

export const listAdminRdp = createServerFn({ method: "GET" }).handler(async () => {
  const { requireAdminSession } = await import("@/lib/admin-session.server");
  await requireAdminSession();
  setResponseHeader("Cache-Control", "no-store");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [desks, requests] = await Promise.all([
    supabaseAdmin.from("desktops").select("*").order("created_at", { ascending: false }),
    supabaseAdmin.from("rdp_requests").select("id,user_id,status,created_at,approved_at,desktop_id").eq("status", "pending").order("created_at"),
  ]);
  if (desks.error || requests.error) throw new Error("Could not load machines and requests");
  return { desktops: desks.data ?? [], requests: requests.data ?? [] };
});

export const approveRdp = createServerFn({ method: "POST" })
  .inputValidator((data: { requestId: string; desktopId: string }) => ({ requestId: validId(data.requestId), desktopId: validId(data.desktopId) }))
  .handler(async ({ data }) => {
    const { requireAdminSession } = await import("@/lib/admin-session.server");
    await requireAdminSession();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("approve_rdp_request", { _request_id: data.requestId, _desktop_id: data.desktopId });
    if (error) return { ok: false, error: "Approval failed. The request may already be approved, or the machine is no longer available. Refresh and try again." };
    return { ok: true, error: null };
  });

export const addAdminMachine = createServerFn({ method: "POST" })
  .inputValidator((data: { name: string; ip: string; port: number; username: string; password: string }) => {
    if (!data.ip?.trim() || !data.username?.trim() || !data.password || !Number.isInteger(data.port) || data.port < 1 || data.port > 65535) throw new Error("Complete all connection details with a valid port");
    return data;
  })
  .handler(async ({ data }) => {
    const { requireAdminSession } = await import("@/lib/admin-session.server");
    await requireAdminSession();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("desktops").insert({ name: data.name.trim() || "Windows machine", os: "Windows", vnc_url: "rdp", rdp_ip: data.ip.trim(), rdp_port: data.port, rdp_username: data.username.trim(), rdp_password: data.password });
    if (error) throw new Error("Could not add the machine");
    return { ok: true };
  });

export const changeAdminMachine = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; action: "enable" | "disable" | "release" | "delete" }) => {
    validId(data.id);
    if (!["enable", "disable", "release", "delete"].includes(data.action)) throw new Error("Invalid action");
    return data;
  })
  .handler(async ({ data }) => {
    const { requireAdminSession } = await import("@/lib/admin-session.server");
    await requireAdminSession();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const result = data.action === "delete"
      ? await supabaseAdmin.from("desktops").delete().eq("id", data.id)
      : await supabaseAdmin.from("desktops").update(data.action === "release" ? { assigned_to: null, expires_at: null } : { enabled: data.action === "enable" }).eq("id", data.id);
    if (result.error) throw new Error("Could not update the machine");
    return { ok: true };
  });
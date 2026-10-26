import { useSession } from "@tanstack/react-start/server";

export async function adminSession() {
  const password = process.env["ADMIN_SESSION_SECRET"];
  if (!password) throw new Error("Admin access is not configured");
  return useSession<{ unlocked?: boolean }>({
    password,
    name: "tempdesk-admin",
    maxAge: 60 * 60 * 12,
    cookie: { httpOnly: true, secure: true, sameSite: "lax", path: "/" },
  });
}

export async function requireAdminSession() {
  const session = await adminSession();
  if (session.data.unlocked !== true) throw new Error("Admin access required");
}
import { createServerFn } from "@tanstack/react-start";
import { createHash, timingSafeEqual } from "node:crypto";

function passwordMatches(input: string, expected: string): boolean {
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

export const unlockAdmin = createServerFn({ method: "POST" })
  .inputValidator((data: { password: string }) => data)
  .handler(async ({ data }) => {
    const expected = process.env["ADMIN_PASSWORD"];
    if (!expected) throw new Error("ADMIN_PASSWORD is not set");
    if (!passwordMatches(data.password ?? "", expected)) {
      return { ok: false as const };
    }
    const { adminSession } = await import("@/lib/admin-session.server");
    const session = await adminSession();
    await session.update({ unlocked: true });
    return { ok: true as const };
  });

export const checkAdminUnlocked = createServerFn({ method: "GET" }).handler(async () => {
  const { adminSession } = await import("@/lib/admin-session.server");
  const session = await adminSession();
  return { unlocked: !!session.data.unlocked };
});

export const lockAdmin = createServerFn({ method: "POST" }).handler(async () => {
  const { adminSession } = await import("@/lib/admin-session.server");
  const session = await adminSession();
  await session.clear();
  return { ok: true as const };
});

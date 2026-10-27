import { describe, expect, it } from "vitest";
import { canApproveMachine, canShowCredentials, isMachineAvailable } from "@/lib/rdp-rules";

const now = Date.parse("2026-10-27T00:00:00Z");
const expiry = "2026-11-26T00:00:00Z";
const machine = { enabled: true, assigned_to: null, expires_at: null, os: "Windows", rdp_ip: "192.0.2.1", rdp_username: "test-user", rdp_password: "test-only" };
describe("RDP approval rules", () => {
  it("hides credentials while pending", () => {
    expect(canShowCredentials("pending", "user-1", "user-1", expiry, now)).toBe(false);
    expect(canShowCredentials("approved", "user-1", "user-1", expiry, now)).toBe(true);
  });
  it("reveals approved credentials only to the assigned user", () => {
    expect(canShowCredentials("approved", "user-2", "user-1", expiry, now)).toBe(false);
  });
  it("expires credential visibility after 30 days", () => {
    expect(canShowCredentials("approved", "user-1", "user-1", expiry, now + 30 * 86400000)).toBe(false);
  });
  it("requires real connection details before approval", () => {
    expect(canApproveMachine(machine, now)).toBe(true);
    expect(canApproveMachine({ ...machine, rdp_password: "" }, now)).toBe(false);
    expect(canApproveMachine({ ...machine, rdp_ip: "" }, now)).toBe(false);
    expect(canApproveMachine({ ...machine, os: "Linux" }, now)).toBe(false);
  });
  it("does not allocate disabled or active machines", () => {
    expect(isMachineAvailable({ ...machine, enabled: false }, now)).toBe(false);
    expect(isMachineAvailable({ ...machine, assigned_to: "user-2", expires_at: expiry }, now)).toBe(false);
    expect(isMachineAvailable({ ...machine, assigned_to: "user-2" }, now)).toBe(false);
  });
});
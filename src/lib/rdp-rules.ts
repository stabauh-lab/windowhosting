export type Assignment = { enabled: boolean; assigned_to: string | null; expires_at: string | null; os?: string; rdp_ip?: string | null; rdp_username?: string | null; rdp_password?: string | null };

export function isMachineAvailable(machine: Assignment, now = Date.now()) {
  return machine.enabled && (!machine.assigned_to || (!!machine.expires_at && new Date(machine.expires_at).getTime() <= now));
}

export function canApproveMachine(machine: Assignment, now = Date.now()) {
  return isMachineAvailable(machine, now) && machine.os === "Windows" && !!machine.rdp_ip?.trim() && !!machine.rdp_username?.trim() && !!machine.rdp_password;
}

export function canShowCredentials(status: string | null, assignedTo: string | null, userId: string, expiresAt: string | null, now = Date.now()) {
  return status === "approved" && assignedTo === userId && !!expiresAt && new Date(expiresAt).getTime() > now;
}
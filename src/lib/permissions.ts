import "server-only";
import { requireUser } from "./auth";
import type { Module, PermAction, SessionUser } from "./types";

// Owner always has full access, regardless of what's in user.permissions --
// team/user management is intentionally never gated through this table, so a
// misconfigured permission row can never grant someone the ability to manage
// other accounts.
export function hasPermission(
  user: SessionUser,
  module: Module,
  action: PermAction
): boolean {
  if (user.role === "owner") return true;
  return user.permissions[module]?.[action] ?? false;
}

export async function requirePermission(
  module: Module,
  action: PermAction
): Promise<SessionUser> {
  const user = await requireUser();
  if (!hasPermission(user, module, action)) {
    throw new Error("FORBIDDEN");
  }
  return user;
}

export async function requireOwner(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "owner") {
    throw new Error("FORBIDDEN");
  }
  return user;
}

import "server-only";
import { redirect } from "next/navigation";
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

// Redirects (rather than throws) on failure -- this runs both at the top of
// gated pages (a raw thrown error would surface Next's generic crash screen
// for what's really just "you can't see this") and inside Server Actions
// (a quiet redirect is the right response to a bypassed-UI/forged request).
export async function requirePermission(
  module: Module,
  action: PermAction
): Promise<SessionUser> {
  const user = await requireUser();
  if (!hasPermission(user, module, action)) {
    redirect("/dashboard");
  }
  return user;
}

export async function requireOwner(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "owner") {
    redirect("/dashboard");
  }
  return user;
}

// For partner-facing pages: the owner can view/manage any partner, and a
// partner can view their own record -- everyone else (a regular Team member
// who isn't a partner) is redirected away. Financial data, so this is
// hard-coded rather than driven by the configurable permission matrix.
export async function requireOwnerOrSelf(
  targetUserId: number
): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "owner" && user.id !== targetUserId) {
    redirect("/dashboard");
  }
  return user;
}

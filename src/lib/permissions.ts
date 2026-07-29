import type { Role } from "@/generated/prisma/enums";

// Code-level permission map. Kept as plain functions (not a data-driven ACL table)
// because the role set is small and fixed — this is easier to audit than a DB table,
// and every mutation boundary (server actions) calls into this module directly.

export function canEditMaster(role: Role) {
  return role === "ADMIN";
}

export function canManageUsers(role: Role) {
  return role === "ADMIN";
}

export function canEditPO(role: Role) {
  return role === "ADMIN" || role === "PROCUREMENT";
}

export function canImportItemDetails(role: Role) {
  return role === "ADMIN" || role === "PROCUREMENT";
}

export function canImportInward(role: Role) {
  return role === "ADMIN" || role === "STORES";
}

// Kept distinct from STORES: the source workflow relies on a second person
// double-checking before a row is allowed to flow into Master Stock.
export function canReview(role: Role) {
  return role === "ADMIN" || role === "REVIEWER";
}

export function canTransitionMasterStock(role: Role) {
  return role === "ADMIN" || role === "SALES";
}

export function canSplitMasterStock(role: Role) {
  return role === "ADMIN" || role === "SALES";
}

export function isPending(role: Role) {
  return role === "PENDING";
}

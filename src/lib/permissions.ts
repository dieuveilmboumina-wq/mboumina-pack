import type { Role } from "./constants";

/**
 * Matrice des permissions du back-office.
 * Le fondateur a tous les droits, y compris sécurité, rôles et suppression.
 */
export const PERMISSIONS = [
  "dashboard.view",
  "catalog.view", "catalog.edit", "pricing.edit", "purchase_cost.view",
  "orders.view", "orders.edit", "orders.pick",
  "quotes.view", "quotes.edit",
  "customizations.view", "customizations.edit",
  "customers.view", "customers.edit", "companies.verify", "credit.authorize",
  "stock.view", "stock.edit",
  "suppliers.view", "suppliers.edit", "purchases.edit", "purchases.approve",
  "payments.view", "payments.reconcile", "refunds.authorize",
  "logistics.view", "logistics.edit",
  "marketing.edit", "content.edit",
  "reports.view", "finance.view",
  "employees.view", "employees.edit",
  "users.manage", "roles.manage", "settings.edit", "security.view", "audit.view", "features.edit",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const ALL = new Set<Permission>(PERMISSIONS);

const ROLE_PERMS: Record<Role, Set<Permission>> = {
  founder: ALL,
  admin: new Set(PERMISSIONS.filter((p) => p !== "roles.manage" && p !== "credit.authorize")),
  sales: new Set<Permission>([
    "dashboard.view", "catalog.view", "orders.view", "orders.edit", "quotes.view", "quotes.edit",
    "customizations.view", "customizations.edit", "customers.view", "customers.edit", "stock.view",
    "logistics.view", "reports.view", "marketing.edit",
  ]),
  stock: new Set<Permission>([
    "dashboard.view", "catalog.view", "stock.view", "stock.edit", "suppliers.view", "purchases.edit",
    "orders.view", "orders.pick", "purchase_cost.view", "reports.view",
  ]),
  accountant: new Set<Permission>([
    "dashboard.view", "catalog.view", "purchase_cost.view", "orders.view", "quotes.view", "payments.view",
    "payments.reconcile", "suppliers.view", "customers.view", "reports.view", "finance.view",
  ]),
  picker: new Set<Permission>(["dashboard.view", "orders.view", "orders.pick", "stock.view"]),
  logistics: new Set<Permission>([
    "dashboard.view", "orders.view", "orders.pick", "logistics.view", "logistics.edit", "stock.view", "reports.view",
  ]),
  customer: new Set<Permission>(),
};

export function can(role: string | undefined | null, perm: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMS[role as Role]?.has(perm) ?? false;
}

export function isStaff(role: string | undefined | null): boolean {
  return !!role && role !== "customer" && role in ROLE_PERMS;
}

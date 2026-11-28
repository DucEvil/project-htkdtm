import type { UserRole } from "../types/auth";
import { routeEntityId } from "./catalog";

export const roleLabels: Record<UserRole, string> = {
  customer: "Khách hàng",
  vendor: "Chủ quán",
  admin: "Quản trị viên",
};

export function roleHome(role: UserRole): string {
  return role === "vendor"
    ? "/vendor"
    : role === "admin"
      ? "/admin"
      : "/account";
}

export function safeReturnTo(value: unknown, fallback: string): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    Array.from(value).some((character) => character.charCodeAt(0) <= 32)
  )
    return fallback;
  const path = value.split(/[?#]/, 1)[0];
  if (
    ![
      "/account",
      "/vendor",
      "/vendor/profile",
      "/vendor/dashboard",
      "/vendor/menu",
      "/vendor/orders",
      "/vendor/menu/new",
      "/admin",
      "/admin/restaurants",
      "/admin/ingredients",
      "/admin/dishes",
      "/onboarding/taste",
      "/checkout",
      "/orders",
    ].includes(path) &&
    !(
      path.startsWith("/vendor/orders/") &&
      routeEntityId(path.slice(15)) !== null
    ) &&
    !(path.startsWith("/orders/") && routeEntityId(path.slice(8)) !== null) &&
    !(
      path.startsWith("/vendor/menu/") &&
      path.endsWith("/edit") &&
      routeEntityId(path.slice(13, -5)) !== null
    )
  )
    return fallback;
  return value;
}

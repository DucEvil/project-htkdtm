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
      "/admin",
      "/onboarding/taste",
      "/checkout",
      "/orders",
    ].includes(path) &&
    !(path.startsWith("/orders/") && routeEntityId(path.slice(8)) !== null)
  )
    return fallback;
  return value;
}

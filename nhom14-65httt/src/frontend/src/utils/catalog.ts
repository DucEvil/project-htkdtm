import type { RestaurantPublic } from "../types/restaurant";

export const formatPrice = (amount: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    amount,
  );
export function restaurantAvailability(restaurant: RestaurantPublic) {
  return !restaurant.is_open
    ? "Đang đóng cửa"
    : !restaurant.accepting_orders
      ? "Đang tạm ngừng nhận đơn"
      : "Đang nhận đơn";
}
export function routeEntityId(value: string | undefined): number | null {
  if (!value || !/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id <= 2147483647 ? id : null;
}

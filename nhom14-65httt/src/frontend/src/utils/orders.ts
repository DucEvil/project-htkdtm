import type { OrderStatus } from "../types/order";

export const orderStatusLabels: Record<OrderStatus, string> = {
  pending: "Chờ quán xác nhận",
  confirmed: "Quán đã nhận",
  preparing: "Đang chuẩn bị",
  delivering: "Đang giao",
  completed: "Hoàn tất",
  cancelled: "Đã hủy",
  rejected: "Quán từ chối",
};
export function orderTime(value: string): string {
  // SQLite có thể trả timestamp UTC thiếu offset; PostgreSQL trả kèm múi giờ.
  const date = new Date(
    /[zZ]$|[+-]\d{2}:\d{2}$/.test(value) ? value : `${value}Z`,
  );
  return Number.isNaN(date.getTime())
    ? "Chưa có thời gian"
    : new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "Asia/Ho_Chi_Minh",
      }).format(date);
}

import { apiClient } from "./client";
import { queryString, type ReadOptions } from "./query";
import type { PaginationQuery } from "../types/common";
import type { OrderCreate, OrderDetail } from "../types/order";

/** Giữ nguyên payload/key khi thử lại; backend trả 201 hoặc 200 cùng OrderDetail. */
export function createOrder(payload: OrderCreate): Promise<OrderDetail> {
  return apiClient.request("/orders/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** API đơn hàng trả mảng, không trả Page/total. */
export function listOrders(
  { offset, limit }: PaginationQuery = {},
  { signal }: ReadOptions = {},
): Promise<OrderDetail[]> {
  return apiClient.request(`/orders/${queryString({ offset, limit })}`, {
    signal,
  });
}

export function getOrder(
  id: number,
  { signal }: ReadOptions = {},
): Promise<OrderDetail> {
  return apiClient.request(`/orders/${id}`, { signal });
}

export function cancelOrder(id: number): Promise<OrderDetail> {
  return apiClient.request(`/orders/${id}/cancel`, { method: "PATCH" });
}

import { apiClient } from "./client";
import { queryString, type ReadOptions } from "./query";
import type { Page, PaginationQuery } from "../types/common";
import type {
  MenuItemCreate,
  MenuItemDetail,
  MenuItemUpdate,
} from "../types/menu";
import type { OrderDetail } from "../types/order";
import type {
  RestaurantCreate,
  RestaurantDetail,
  RestaurantUpdate,
} from "../types/restaurant";

/** Backend suy ra quán từ membership; không nhận restaurant_id từ caller. */
export function getVendorRestaurant({
  signal,
}: ReadOptions = {}): Promise<RestaurantDetail> {
  return apiClient.request("/vendor/restaurant", { signal });
}

export function createVendorRestaurant(
  payload: RestaurantCreate,
): Promise<RestaurantDetail> {
  return apiClient.request("/vendor/restaurant", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateVendorRestaurant(
  payload: RestaurantUpdate,
): Promise<RestaurantDetail> {
  return apiClient.request("/vendor/restaurant", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function listVendorMenuItems(
  { offset, limit }: PaginationQuery = {},
  { signal }: ReadOptions = {},
): Promise<Page<MenuItemDetail>> {
  return apiClient.request(
    `/vendor/menu-items${queryString({ offset, limit })}`,
    { signal },
  );
}

export function getVendorMenuItem(
  id: number,
  { signal }: ReadOptions = {},
): Promise<MenuItemDetail> {
  return apiClient.request(`/vendor/menu-items/${id}`, { signal });
}

export function createVendorMenuItem(
  payload: MenuItemCreate,
): Promise<MenuItemDetail> {
  return apiClient.request("/vendor/menu-items", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateVendorMenuItem(
  id: number,
  payload: MenuItemUpdate,
): Promise<MenuItemDetail> {
  return apiClient.request(`/vendor/menu-items/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

/** DELETE ngừng bán, giữ món và lịch sử; 204 không có JSON trả về. */
export async function stopSellingVendorMenuItem(id: number): Promise<void> {
  await apiClient.request(`/vendor/menu-items/${id}`, { method: "DELETE" });
}

export function listVendorOrders(
  { offset, limit }: PaginationQuery = {},
  { signal }: ReadOptions = {},
): Promise<OrderDetail[]> {
  return apiClient.request(`/vendor/orders${queryString({ offset, limit })}`, {
    signal,
  });
}

export function getVendorOrder(
  id: number,
  { signal }: ReadOptions = {},
): Promise<OrderDetail> {
  return apiClient.request(`/vendor/orders/${id}`, { signal });
}

export function confirmVendorOrder(id: number): Promise<OrderDetail> {
  return apiClient.request(`/vendor/orders/${id}/confirm`, { method: "PATCH" });
}

export function rejectVendorOrder(
  id: number,
  reason: string,
): Promise<OrderDetail> {
  return apiClient.request(`/vendor/orders/${id}/reject`, {
    method: "PATCH",
    body: JSON.stringify({ reason }),
  });
}

export function prepareVendorOrder(id: number): Promise<OrderDetail> {
  return apiClient.request(`/vendor/orders/${id}/preparing`, {
    method: "PATCH",
  });
}

export function deliverVendorOrder(id: number): Promise<OrderDetail> {
  return apiClient.request(`/vendor/orders/${id}/delivering`, {
    method: "PATCH",
  });
}

export function completeVendorOrder(id: number): Promise<OrderDetail> {
  return apiClient.request(`/vendor/orders/${id}/complete`, {
    method: "PATCH",
  });
}

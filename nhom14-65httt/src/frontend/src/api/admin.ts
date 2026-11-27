import { apiClient } from "./client";
import { queryString, type ReadOptions } from "./query";
import type { AdminRestaurantQuery } from "../types/admin";
import type { Page, PaginationQuery } from "../types/common";
import type {
  CanonicalDishCreate,
  CanonicalDishDetail,
  CanonicalDishUpdate,
  IngredientDetail,
  IngredientInput,
} from "../types/menu";
import type { RestaurantDetail } from "../types/restaurant";

export function listAdminRestaurants(
  { offset, limit, status }: AdminRestaurantQuery = {},
  { signal }: ReadOptions = {},
): Promise<Page<RestaurantDetail>> {
  return apiClient.request(
    `/admin/restaurants${queryString({ offset, limit, status })}`,
    { signal },
  );
}

/** Duyệt không tự bật nhận đơn; dùng trạng thái quán do máy chủ trả về. */
export function approveAdminRestaurant(id: number): Promise<RestaurantDetail> {
  return apiClient.request(`/admin/restaurants/${id}/approve`, {
    method: "PATCH",
  });
}

export function suspendAdminRestaurant(id: number): Promise<RestaurantDetail> {
  return apiClient.request(`/admin/restaurants/${id}/suspend`, {
    method: "PATCH",
  });
}

export function listAdminCanonicalDishes(
  { offset, limit }: PaginationQuery = {},
  { signal }: ReadOptions = {},
): Promise<Page<CanonicalDishDetail>> {
  return apiClient.request(
    `/admin/canonical-dishes${queryString({ offset, limit })}`,
    { signal },
  );
}

export function createAdminCanonicalDish(
  payload: CanonicalDishCreate,
): Promise<CanonicalDishDetail> {
  return apiClient.request("/admin/canonical-dishes", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateAdminCanonicalDish(
  id: number,
  payload: CanonicalDishUpdate,
): Promise<CanonicalDishDetail> {
  return apiClient.request(`/admin/canonical-dishes/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

/** Backend từ chối 409 nếu món chuẩn đang được tham chiếu. */
export async function deleteAdminCanonicalDish(id: number): Promise<void> {
  await apiClient.request(`/admin/canonical-dishes/${id}`, {
    method: "DELETE",
  });
}

export function listAdminIngredients(
  { offset, limit }: PaginationQuery = {},
  { signal }: ReadOptions = {},
): Promise<Page<IngredientDetail>> {
  return apiClient.request(
    `/admin/ingredients${queryString({ offset, limit })}`,
    { signal },
  );
}

export function createAdminIngredient(
  payload: IngredientInput,
): Promise<IngredientDetail> {
  return apiClient.request("/admin/ingredients", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateAdminIngredient(
  id: number,
  payload: IngredientInput,
): Promise<IngredientDetail> {
  return apiClient.request(`/admin/ingredients/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminIngredient(id: number): Promise<void> {
  await apiClient.request(`/admin/ingredients/${id}`, { method: "DELETE" });
}

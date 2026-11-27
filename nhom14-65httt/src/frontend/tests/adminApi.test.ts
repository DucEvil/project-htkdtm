import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { apiClient, AUTH_STORAGE_KEY } from "../src/api/client";
import * as admin from "../src/api/admin";
import type {
  CanonicalDishCreate,
  CanonicalDishDetail,
  CanonicalDishUpdate,
  IngredientDetail,
} from "../src/types/menu";
import type { RestaurantDetail } from "../src/types/restaurant";

const fetcher = vi.fn<typeof fetch>();
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });
const dishInput: CanonicalDishCreate = {
  name: "Phở bò",
  region: "Bắc",
  method: "Nấu",
};
const dishUpdate: CanonicalDishUpdate = {
  ...dishInput,
  spice_level: 0,
  ingredients: ["bò"],
  labels: [],
  source_id: null,
};
const dish: CanonicalDishDetail = { ...dishUpdate, id: 2, is_simulated: false };
const ingredient: IngredientDetail = { id: 1, name: "bò", is_simulated: false };
const restaurant: RestaurantDetail = {
  id: 3,
  name: "Bếp Việt",
  address: "Số 1, Hà Nội",
  latitude: 21,
  longitude: 105,
  delivery_radius_km: 5,
  opens_at: "08:00",
  closes_at: "22:00",
  accepting_orders: false,
  is_open: true,
  can_receive_orders: false,
  status: "approved",
  is_simulated: false,
};
const page = <T>(item: T) => ({ items: [item], total: 1, offset: 0, limit: 5 });
const cases = [
  {
    name: "lọc quán",
    call: () =>
      admin.listAdminRestaurants({ offset: 0, limit: 5, status: "pending" }),
    path: "/restaurants?offset=0&limit=5&status=pending",
    method: "GET",
    result: page({ ...restaurant, status: "pending" }),
  },
  {
    name: "duyệt quán",
    call: () => admin.approveAdminRestaurant(3),
    path: "/restaurants/3/approve",
    method: "PATCH",
    result: restaurant,
  },
  {
    name: "tạm ngừng quán",
    call: () => admin.suspendAdminRestaurant(3),
    path: "/restaurants/3/suspend",
    method: "PATCH",
    result: { ...restaurant, status: "suspended" },
  },
  {
    name: "liệt kê món chuẩn",
    call: () => admin.listAdminCanonicalDishes({ offset: 0, limit: 5 }),
    path: "/canonical-dishes?offset=0&limit=5",
    method: "GET",
    result: page(dish),
  },
  {
    name: "tạo món chuẩn",
    call: () => admin.createAdminCanonicalDish(dishInput),
    path: "/canonical-dishes",
    method: "POST",
    body: dishInput,
    result: dish,
  },
  {
    name: "sửa món chuẩn",
    call: () => admin.updateAdminCanonicalDish(2, dishUpdate),
    path: "/canonical-dishes/2",
    method: "PUT",
    body: dishUpdate,
    result: dish,
  },
  {
    name: "xóa món chuẩn",
    call: () => admin.deleteAdminCanonicalDish(2),
    path: "/canonical-dishes/2",
    method: "DELETE",
    result: undefined,
  },
  {
    name: "liệt kê nguyên liệu",
    call: () => admin.listAdminIngredients({ offset: 0, limit: 5 }),
    path: "/ingredients?offset=0&limit=5",
    method: "GET",
    result: page(ingredient),
  },
  {
    name: "tạo nguyên liệu",
    call: () => admin.createAdminIngredient({ name: " Bò " }),
    path: "/ingredients",
    method: "POST",
    body: { name: " Bò " },
    result: ingredient,
  },
  {
    name: "sửa nguyên liệu",
    call: () => admin.updateAdminIngredient(1, { name: "bò" }),
    path: "/ingredients/1",
    method: "PUT",
    body: { name: "bò" },
    result: ingredient,
  },
  {
    name: "xóa nguyên liệu",
    call: () => admin.deleteAdminIngredient(1),
    path: "/ingredients/1",
    method: "DELETE",
    result: undefined,
  },
];

beforeEach(() => {
  fetcher.mockReset();
  vi.stubGlobal("fetch", fetcher);
  localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({ access_token: "admin-token", refresh_token: "refresh" }),
  );
  apiClient.syncFromStorage();
});
afterEach(() => {
  apiClient.logout();
  vi.unstubAllGlobals();
});

it.each(cases)(
  "$name dùng đúng URL/method/body/token và response admin",
  async (entry) => {
    fetcher.mockResolvedValue(
      entry.result === undefined
        ? new Response(null, { status: 204 })
        : json(entry.result),
    );
    expect(await entry.call()).toEqual(entry.result);
    expect(fetcher).toHaveBeenCalledOnce();
    const [url, options] = fetcher.mock.calls[0];
    expect(url).toBe(`/api/v1/admin${entry.path}`);
    expect(options?.method ?? "GET").toBe(entry.method);
    expect(options?.body).toBe(
      entry.body === undefined ? undefined : JSON.stringify(entry.body),
    );
    expect(new Headers(options?.headers).get("Authorization")).toBe(
      "Bearer admin-token",
    );
  },
);

it.each(cases)("$name yêu cầu phiên đăng nhập", async ({ call }) => {
  apiClient.logout();
  await expect(call()).rejects.toMatchObject({
    status: 401,
    code: "UNAUTHENTICATED",
  });
  expect(fetcher).not.toHaveBeenCalled();
});

it.each([
  { call: () => admin.listAdminRestaurants(), status: 403, code: "FORBIDDEN" },
  {
    call: () => admin.approveAdminRestaurant(999),
    status: 404,
    code: "NOT_FOUND",
  },
  {
    call: () => admin.deleteAdminCanonicalDish(2),
    status: 409,
    code: "CATALOG_IN_USE",
  },
])("giữ lỗi $code và phiên hiện tại", async ({ call, status, code }) => {
  fetcher.mockResolvedValue(
    json(
      { error: { code, message: "Không thể xử lý yêu cầu.", details: {} } },
      status,
    ),
  );
  await expect(call()).rejects.toMatchObject({ status, code, details: {} });
  expect(fetcher).toHaveBeenCalledOnce();
  expect(apiClient.hasSession).toBe(true);
});

it("bỏ bộ lọc và phân trang khi chưa chọn, dùng mặc định backend", async () => {
  fetcher.mockResolvedValue(
    json({ items: [], total: 0, offset: 0, limit: 20 }),
  );
  expect(await admin.listAdminRestaurants()).toEqual({
    items: [],
    total: 0,
    offset: 0,
    limit: 20,
  });
  expect(fetcher.mock.calls[0][0]).toBe("/api/v1/admin/restaurants");
});

it("hủy tải danh mục khi rời trang", async () => {
  const controller = new AbortController();
  fetcher.mockImplementation(
    (_url, options) =>
      new Promise((_resolve, reject) => {
        options?.signal?.addEventListener(
          "abort",
          () => reject(new DOMException("Đã hủy", "AbortError")),
          { once: true },
        );
      }),
  );
  const request = admin.listAdminIngredients({}, { signal: controller.signal });
  controller.abort();
  await expect(request).rejects.toMatchObject({ name: "AbortError" });
});

it("refresh rồi gửi lại PUT giữ source_id null và đủ đặc trưng", async () => {
  fetcher
    .mockResolvedValueOnce(json({ error: { code: "UNAUTHENTICATED" } }, 401))
    .mockResolvedValueOnce(
      json({ access_token: "new-admin", refresh_token: "new-refresh" }),
    )
    .mockResolvedValueOnce(json(dish));
  expect(await admin.updateAdminCanonicalDish(2, dishUpdate)).toEqual(dish);
  expect(fetcher).toHaveBeenCalledTimes(3);
  expect(fetcher.mock.calls[2][1]?.body).toBe(JSON.stringify(dishUpdate));
  expect(fetcher.mock.calls[2][1]?.body).toBe(fetcher.mock.calls[0][1]?.body);
  expect(
    new Headers(fetcher.mock.calls[2][1]?.headers).get("Authorization"),
  ).toBe("Bearer new-admin");
});

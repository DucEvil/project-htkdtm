import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { apiClient, AUTH_STORAGE_KEY } from "../src/api/client";
import * as vendor from "../src/api/vendor";
import type {
  MenuItemCreate,
  MenuItemDetail,
  MenuItemUpdate,
} from "../src/types/menu";
import type {
  RestaurantCreate,
  RestaurantDetail,
  RestaurantUpdate,
} from "../src/types/restaurant";
import type { OrderDetail } from "../src/types/order";

const fetcher = vi.fn<typeof fetch>();
const restaurantInput: RestaurantCreate = {
  name: "Bếp Việt",
  address: "Số 1, Hà Nội",
  latitude: 21,
  longitude: 105,
};
const restaurantUpdate: RestaurantUpdate = {
  ...restaurantInput,
  delivery_radius_km: 5,
  opens_at: "08:00",
  closes_at: "22:00",
  accepting_orders: true,
};
const restaurant: RestaurantDetail = {
  ...restaurantUpdate,
  id: 3,
  status: "approved",
  is_open: true,
  can_receive_orders: true,
  is_simulated: false,
};
const menuInput: MenuItemCreate = {
  canonical_dish_id: 2,
  name: "Phở bò",
  price: 35000,
};
const menuUpdate: MenuItemUpdate = {
  ...menuInput,
  is_available: true,
  ingredients_verified: true,
  ingredient_ids: [1],
};
const item: MenuItemDetail = {
  id: 9,
  restaurant_id: 3,
  restaurant_name: "Bếp Việt",
  canonical_dish_id: 2,
  name: "Phở bò",
  price: 35000,
  is_available: true,
  ingredients_verified: true,
  is_simulated: false,
  canonical_dish: {
    id: 2,
    name: "Phở bò",
    region: "Bắc",
    method: "Nấu",
    spice_level: 0,
    ingredients: ["bò"],
    labels: [],
  },
  ingredients: [{ id: 1, name: "bò" }],
};
const order: OrderDetail = {
  id: 7,
  restaurant_id: 3,
  status: "pending",
  total: 35000,
  delivery_address: "Cổng trường",
  latitude: 21,
  longitude: 105,
  created_at: "2026-11-27T03:00:00Z",
  items: [
    {
      menu_item_id: 9,
      quantity: 1,
      snapshot_price: 35000,
      snapshot_name: "Phở bò",
    },
  ],
  history: [],
};
const cases = [
  {
    name: "đọc hồ sơ",
    call: () => vendor.getVendorRestaurant(),
    path: "/restaurant",
    method: "GET",
    result: restaurant,
  },
  {
    name: "tạo quán",
    call: () => vendor.createVendorRestaurant(restaurantInput),
    path: "/restaurant",
    method: "POST",
    body: restaurantInput,
    result: restaurant,
  },
  {
    name: "sửa quán",
    call: () => vendor.updateVendorRestaurant(restaurantUpdate),
    path: "/restaurant",
    method: "PUT",
    body: restaurantUpdate,
    result: restaurant,
  },
  {
    name: "liệt kê món",
    call: () => vendor.listVendorMenuItems({ offset: 0, limit: 5 }),
    path: "/menu-items?offset=0&limit=5",
    method: "GET",
    result: { items: [item], total: 1, offset: 0, limit: 5 },
  },
  {
    name: "đọc món",
    call: () => vendor.getVendorMenuItem(9),
    path: "/menu-items/9",
    method: "GET",
    result: item,
  },
  {
    name: "tạo món",
    call: () => vendor.createVendorMenuItem(menuInput),
    path: "/menu-items",
    method: "POST",
    body: menuInput,
    result: item,
  },
  {
    name: "sửa món",
    call: () => vendor.updateVendorMenuItem(9, menuUpdate),
    path: "/menu-items/9",
    method: "PUT",
    body: menuUpdate,
    result: item,
  },
  {
    name: "ngừng bán",
    call: () => vendor.stopSellingVendorMenuItem(9),
    path: "/menu-items/9",
    method: "DELETE",
    result: undefined,
  },
  {
    name: "liệt kê đơn",
    call: () => vendor.listVendorOrders({ offset: 0, limit: 5 }),
    path: "/orders?offset=0&limit=5",
    method: "GET",
    result: [order],
  },
  {
    name: "đọc đơn",
    call: () => vendor.getVendorOrder(7),
    path: "/orders/7",
    method: "GET",
    result: order,
  },
  {
    name: "xác nhận",
    call: () => vendor.confirmVendorOrder(7),
    path: "/orders/7/confirm",
    method: "PATCH",
    result: { ...order, status: "confirmed" },
  },
  {
    name: "từ chối",
    call: () => vendor.rejectVendorOrder(7, "Hết nguyên liệu"),
    path: "/orders/7/reject",
    method: "PATCH",
    body: { reason: "Hết nguyên liệu" },
    result: { ...order, status: "rejected" },
  },
  {
    name: "chuẩn bị",
    call: () => vendor.prepareVendorOrder(7),
    path: "/orders/7/preparing",
    method: "PATCH",
    result: { ...order, status: "preparing" },
  },
  {
    name: "giao hàng",
    call: () => vendor.deliverVendorOrder(7),
    path: "/orders/7/delivering",
    method: "PATCH",
    result: { ...order, status: "delivering" },
  },
  {
    name: "hoàn tất",
    call: () => vendor.completeVendorOrder(7),
    path: "/orders/7/complete",
    method: "PATCH",
    result: { ...order, status: "completed" },
  },
];

beforeEach(() => {
  fetcher.mockReset();
  vi.stubGlobal("fetch", fetcher);
  localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({ access_token: "vendor-token", refresh_token: "refresh" }),
  );
  apiClient.syncFromStorage();
});
afterEach(() => {
  apiClient.logout();
  vi.unstubAllGlobals();
});

it.each(cases)(
  "$name gửi đúng request vendor và giữ response",
  async (entry) => {
    const result = entry.result;
    fetcher.mockResolvedValue(
      result === undefined
        ? new Response(null, { status: 204 })
        : new Response(JSON.stringify(result)),
    );
    expect(await entry.call()).toEqual(result);
    expect(fetcher).toHaveBeenCalledOnce();
    const [url, options] = fetcher.mock.calls[0];
    expect(url).toBe(`/api/v1/vendor${entry.path}`);
    expect(options?.method ?? "GET").toBe(entry.method);
    expect(options?.body).toBe(
      entry.body === undefined ? undefined : JSON.stringify(entry.body),
    );
    expect(new Headers(options?.headers).get("Authorization")).toBe(
      "Bearer vendor-token",
    );
  },
);

it.each(cases)("$name chặn gửi mạng khi thiếu phiên", async ({ call }) => {
  apiClient.logout();
  await expect(call()).rejects.toMatchObject({
    status: 401,
    code: "UNAUTHENTICATED",
  });
  expect(fetcher).not.toHaveBeenCalled();
});

it.each([
  { call: () => vendor.getVendorOrder(7), status: 404, code: "NOT_FOUND" },
  {
    call: () => vendor.updateVendorRestaurant(restaurantUpdate),
    status: 403,
    code: "FORBIDDEN",
  },
  {
    call: () => vendor.confirmVendorOrder(7),
    status: 409,
    code: "INVALID_STATE_TRANSITION",
  },
])("giữ lỗi $code và không đổi phiên", async ({ call, status, code }) => {
  fetcher.mockResolvedValue(
    new Response(
      JSON.stringify({
        error: {
          code,
          message: "Không thể xử lý yêu cầu.",
          details: { status: "completed" },
        },
      }),
      { status },
    ),
  );
  await expect(call()).rejects.toMatchObject({
    status,
    code,
    details: { status: "completed" },
  });
  expect(fetcher).toHaveBeenCalledOnce();
  expect(apiClient.hasSession).toBe(true);
});

it("hủy tải thực đơn khi rời trang", async () => {
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
  const request = vendor.listVendorMenuItems({}, { signal: controller.signal });
  controller.abort();
  await expect(request).rejects.toMatchObject({ name: "AbortError" });
});

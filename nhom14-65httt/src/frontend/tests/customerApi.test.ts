import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { apiClient, AUTH_STORAGE_KEY } from "../src/api/client";
import { getPreference, savePreference } from "../src/api/preferences";
import {
  cancelOrder,
  createOrder,
  getOrder,
  listOrders,
} from "../src/api/orders";
import { createReview } from "../src/api/reviews";
import type { Preference } from "../src/types/preference";
import type { OrderCreate, OrderDetail } from "../src/types/order";
import type { ReviewOut } from "../src/types/review";

const fetcher = vi.fn<typeof fetch>();
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });
const preference: Preference = {
  regions: ["Bắc"],
  spice_level: 2,
  liked_ingredients: ["bò"],
  avoided_ingredients: ["đậu phộng"],
  exploration_level: 1,
};
const payload: OrderCreate = {
  restaurant_id: 3,
  items: [{ menu_item_id: 9, quantity: 2, expected_price: 35000 }],
  delivery_address: "Cổng trường, số 1",
  latitude: 21,
  longitude: 105,
  session_id: "b5418601-7286-41fb-b413-dc9a8971e678",
  idempotency_key: "0742f0ac-f59e-469d-946e-5c7fe3944e4e",
};
const order: OrderDetail = {
  id: 7,
  restaurant_id: 3,
  status: "pending",
  total: 70000,
  delivery_address: payload.delivery_address,
  latitude: 21,
  longitude: 105,
  created_at: "2026-11-27T03:00:00Z",
  items: [
    {
      menu_item_id: 9,
      quantity: 2,
      snapshot_price: 35000,
      snapshot_name: "Phở bò",
    },
  ],
  history: [
    { status: "pending", reason: null, created_at: "2026-11-27T03:00:00Z" },
  ],
};
const review: ReviewOut = {
  id: 1,
  order_id: 7,
  menu_item_id: 9,
  rating: 5,
  comment: "Ngon",
  snapshot_name: "Phở bò",
  snapshot_price: 35000,
  created_at: order.created_at,
};
const calls = [
  {
    name: "đọc khẩu vị",
    call: () => getPreference(),
    path: "/preferences/",
    method: "GET",
    result: preference,
    body: undefined,
  },
  {
    name: "lưu khẩu vị",
    call: () => savePreference(preference),
    path: "/preferences/",
    method: "PUT",
    result: preference,
    body: preference,
  },
  {
    name: "tạo đơn",
    call: () => createOrder(payload),
    path: "/orders/",
    method: "POST",
    result: order,
    body: payload,
  },
  {
    name: "danh sách đơn",
    call: () => listOrders({ offset: 0, limit: 5 }),
    path: "/orders/?offset=0&limit=5",
    method: "GET",
    result: [order],
    body: undefined,
  },
  {
    name: "chi tiết đơn",
    call: () => getOrder(7),
    path: "/orders/7",
    method: "GET",
    result: order,
    body: undefined,
  },
  {
    name: "hủy đơn",
    call: () => cancelOrder(7),
    path: "/orders/7/cancel",
    method: "PATCH",
    result: { ...order, status: "cancelled" },
    body: undefined,
  },
  {
    name: "đánh giá",
    call: () =>
      createReview(7, { menu_item_id: 9, rating: 5, comment: "Ngon" }),
    path: "/orders/7/review",
    method: "POST",
    result: review,
    body: { menu_item_id: 9, rating: 5, comment: "Ngon" },
  },
] as const;

beforeEach(() => {
  fetcher.mockReset();
  vi.stubGlobal("fetch", fetcher);
  localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({ access_token: "old", refresh_token: "refresh" }),
  );
  apiClient.syncFromStorage();
});
afterEach(() => {
  apiClient.logout();
  vi.unstubAllGlobals();
});

it.each(calls)(
  "$name gửi đúng method, body và token",
  async ({ call, path, method, result, body }) => {
    fetcher.mockResolvedValue(json(result));
    expect(await call()).toEqual(result);
    expect(fetcher).toHaveBeenCalledOnce();
    const [url, options] = fetcher.mock.calls[0];
    expect(url).toBe(`/api/v1${path}`);
    expect(options?.method ?? "GET").toBe(method);
    expect(options?.body).toBe(
      body === undefined ? undefined : JSON.stringify(body),
    );
    expect(new Headers(options?.headers).get("Authorization")).toBe(
      "Bearer old",
    );
  },
);

it.each(calls)(
  "$name yêu cầu đăng nhập trước khi gửi mạng",
  async ({ call }) => {
    apiClient.logout();
    await expect(call()).rejects.toMatchObject({
      status: 401,
      code: "UNAUTHENTICATED",
    });
    expect(fetcher).not.toHaveBeenCalled();
  },
);

it("refresh rồi gửi lại đơn giữ nguyên key và payload", async () => {
  fetcher
    .mockResolvedValueOnce(json({ error: { code: "UNAUTHENTICATED" } }, 401))
    .mockResolvedValueOnce(
      json({ access_token: "new", refresh_token: "new-refresh" }),
    )
    .mockResolvedValueOnce(json(order, 201));
  expect(await createOrder(payload)).toEqual(order);
  expect(fetcher).toHaveBeenCalledTimes(3);
  expect(fetcher.mock.calls[1][0]).toBe("/api/v1/auth/refresh");
  expect(fetcher.mock.calls[2][1]?.body).toBe(fetcher.mock.calls[0][1]?.body);
  expect(
    new Headers(fetcher.mock.calls[2][1]?.headers).get("Authorization"),
  ).toBe("Bearer new");
});

it("gửi lại cùng đơn nhận 200 và cùng key, không tính lại snapshot phía client", async () => {
  fetcher
    .mockResolvedValueOnce(json(order, 201))
    .mockResolvedValueOnce(json(order));
  expect(await createOrder(payload)).toEqual(order);
  expect(await createOrder(payload)).toEqual(order);
  expect(fetcher.mock.calls[0][1]?.body).toBe(fetcher.mock.calls[1][1]?.body);
  expect(payload.items[0].expected_price).toBe(35000);
});

it.each([
  { call: () => getPreference(), status: 404, code: "NOT_FOUND" },
  {
    call: () => createOrder(payload),
    status: 409,
    code: "ORDER_PRICE_CHANGED",
  },
  { call: () => cancelOrder(7), status: 409, code: "INVALID_STATE_TRANSITION" },
  {
    call: () => createReview(7, { menu_item_id: 9, rating: 5 }),
    status: 409,
    code: "REVIEW_ALREADY_EXISTS",
  },
])("giữ lỗi $code để màn hình xử lý", async ({ call, status, code }) => {
  const details = { menu_item_id: 9, current_price: 40000 };
  fetcher.mockResolvedValue(
    json(
      { error: { code, message: "Yêu cầu không hợp lệ.", details } },
      status,
    ),
  );
  await expect(call()).rejects.toMatchObject({ status, code, details });
  expect(fetcher).toHaveBeenCalledOnce();
  expect(apiClient.hasSession).toBe(true);
});

it("hủy tải danh sách khi rời trang", async () => {
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
  const request = listOrders({}, { signal: controller.signal });
  controller.abort();
  await expect(request).rejects.toMatchObject({ name: "AbortError" });
  expect(apiClient.hasSession).toBe(true);
});

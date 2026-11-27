import { test, expect, type Page } from "@playwright/test";
import { restaurant, dish } from "../tests/fixtures/catalog";
import type { OrderCreate, OrderDetail } from "../src/types/order";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "viviet.auth.v1",
      JSON.stringify({
        access_token: "checkout-access",
        refresh_token: "checkout-refresh",
      }),
    ),
  );
  await page.route("**/api/v1/auth/me", (route) =>
    route.fulfill({
      json: {
        id: 1600,
        email: "checkout@example.vn",
        full_name: "Khách thử nghiệm",
        role: "customer",
        is_simulated: false,
        created_at: "2026-11-27T03:00:00Z",
      },
    }),
  );
  await page.route("**/api/v1/restaurants/3", (route) =>
    route.fulfill({ json: restaurant }),
  );
  await page.route("**/api/v1/menu-items/9", (route) =>
    route.fulfill({ json: dish }),
  );
});
async function openCheckout(page: Page) {
  await page.goto("/menu-items/9");
  await page.getByRole("button", { name: "Thêm vào giỏ" }).click();
  await page.getByRole("link", { name: "Giỏ hàng (1)", exact: true }).click();
  await page.getByRole("link", { name: "Tiếp tục đặt hàng" }).click();
  await page.getByLabel("Vĩ độ", { exact: true }).fill("0");
  await page.getByLabel("Kinh độ", { exact: true }).fill("0");
  await page.getByRole("button", { name: "Dùng tọa độ này" }).click();
  await page.getByLabel("Địa chỉ đầy đủ").fill("Số 1 Hà Nội");
  await page.getByLabel(/Tôi xác nhận địa chỉ/).check();
}
function receipt(payload: OrderCreate): OrderDetail {
  return {
    id: 77,
    restaurant_id: payload.restaurant_id,
    status: "pending",
    total: payload.items[0].expected_price,
    delivery_address: payload.delivery_address,
    latitude: payload.latitude,
    longitude: payload.longitude,
    created_at: "2026-11-27T03:00:00Z",
    items: [
      {
        menu_item_id: 9,
        quantity: 1,
        snapshot_name: dish.name,
        snapshot_price: payload.items[0].expected_price,
      },
    ],
    history: [
      { status: "pending", reason: null, created_at: "2026-11-27T03:00:00Z" },
    ],
  };
}

test("mất phản hồi, reload rồi thử lại giữ nguyên payload/key; checkout responsive", async ({
  page,
}, info) => {
  const requests: OrderCreate[] = [];
  await page.route("**/api/v1/orders/", async (route) => {
    expect(route.request().method()).toBe("POST");
    expect(route.request().headers()["authorization"]).toBe(
      "Bearer checkout-access",
    );
    const payload = route.request().postDataJSON() as OrderCreate;
    requests.push(payload);
    if (requests.length === 1) return route.abort("failed");
    return route.fulfill({ status: 200, json: receipt(payload) });
  });
  await openCheckout(page);
  for (const width of [360, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`checkout-${width}.png`),
      fullPage: true,
    });
  }
  await page.getByRole("button", { name: "Đặt đơn COD" }).click();
  await expect(
    page.getByRole("button", { name: "Thử lại cùng đơn" }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Thử lại cùng đơn" }).click();
  await expect(
    page.getByRole("heading", { name: "Đã ghi nhận đơn #77" }),
  ).toBeVisible();
  expect(requests).toHaveLength(2);
  expect(requests[1]).toEqual(requests[0]);
  expect(
    await page.evaluate(() =>
      Object.keys(sessionStorage).some((key) =>
        key.startsWith("viviet.checkout.pending"),
      ),
    ),
  ).toBe(false);
});

test("backend báo đổi giá phải đồng ý và bấm gửi lại, không tự tạo đơn", async ({
  page,
}) => {
  const requests: OrderCreate[] = [];
  await page.route("**/api/v1/orders/", (route) => {
    const payload = route.request().postDataJSON() as OrderCreate;
    requests.push(payload);
    return requests.length === 1
      ? route.fulfill({
          status: 409,
          json: {
            error: {
              code: "ORDER_PRICE_CHANGED",
              message: "Giá món đã đổi.",
              details: { menu_item_id: 9, current_price: 40000 },
            },
          },
        })
      : route.fulfill({ status: 201, json: receipt(payload) });
  });
  await openCheckout(page);
  await page.getByRole("button", { name: "Đặt đơn COD" }).click();
  await expect(
    page.getByRole("heading", { name: "Giá món đã thay đổi" }),
  ).toBeVisible();
  expect(requests).toHaveLength(1);
  await page.route("**/api/v1/menu-items/9", (route) =>
    route.fulfill({ json: { ...dish, price: 40000 } }),
  );
  await page.getByRole("button", { name: "Đồng ý cập nhật giá" }).click();
  await expect(page.getByRole("button", { name: "Đặt đơn COD" })).toBeVisible();
  expect(requests).toHaveLength(1);
  await page.getByRole("button", { name: "Đặt đơn COD" }).click();
  await expect(
    page.getByRole("heading", { name: "Đã ghi nhận đơn #77" }),
  ).toBeVisible();
  expect(requests[1].items[0].expected_price).toBe(40000);
  expect(requests[1].idempotency_key).not.toBe(requests[0].idempotency_key);
});

import { test, expect } from "@playwright/test";
import { order } from "../tests/fixtures/orders";
import type { OrderDetail } from "../src/types/order";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "viviet.auth.v1",
      JSON.stringify({
        access_token: "orders-access",
        refresh_token: "orders-refresh",
      }),
    ),
  );
  await page.route("**/api/v1/auth/me", (route) =>
    route.fulfill({
      json: {
        id: 1800,
        email: "orders@example.vn",
        full_name: "Khách thử nghiệm",
        role: "customer",
        is_simulated: false,
        created_at: order.created_at,
      },
    }),
  );
});

test("xem đơn, hủy xác nhận/Escape, 409 đọc lại trạng thái quán", async ({
  page,
}) => {
  let current: OrderDetail = order;
  let cancellations = 0;
  await page.route("**/api/v1/orders/?*", (route) =>
    route.fulfill({ json: [current] }),
  );
  await page.route("**/api/v1/orders/77", (route) =>
    route.fulfill({ json: current }),
  );
  await page.route("**/api/v1/orders/77/cancel", (route) => {
    cancellations++;
    expect(route.request().method()).toBe("PATCH");
    expect(route.request().headers()["authorization"]).toBe(
      "Bearer orders-access",
    );
    current = {
      ...order,
      status: "confirmed",
      history: [
        ...order.history,
        {
          status: "confirmed",
          reason: null,
          created_at: "2026-11-27T03:05:00Z",
        },
      ],
    };
    return route.fulfill({
      status: 409,
      json: {
        error: {
          code: "INVALID_STATE_TRANSITION",
          message: "Quán vừa nhận đơn.",
        },
      },
    });
  });
  await page.goto("/orders");
  await page.getByRole("link", { name: "Xem đơn 77" }).click();
  await expect(page.getByText("Phở bò lúc mua", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Hủy đơn hàng" }).click();
  const dialog = page.getByRole("dialog", { name: "Hủy đơn #77?" });
  await expect(
    dialog.getByRole("button", { name: "Giữ đơn hàng" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  expect(cancellations).toBe(0);
  await expect(
    page.getByRole("button", { name: "Hủy đơn hàng" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Hủy đơn hàng" }).click();
  await dialog.getByRole("button", { name: "Xác nhận hủy đơn" }).click();
  await expect(page.getByRole("button", { name: "Hủy đơn hàng" })).toHaveCount(
    0,
  );
  await expect(page.getByText("Quán đã nhận", { exact: true })).toHaveCount(2);
  expect(cancellations).toBe(1);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Đơn #77", level: 1 }),
  ).toBeVisible();
});

test("hủy thành công, snapshot/lý do từ chối và responsive", async ({
  page,
}, info) => {
  let current = order;
  const rejected: OrderDetail = {
    ...order,
    id: 78,
    status: "rejected",
    history: [
      ...order.history,
      {
        status: "rejected",
        reason: "Quán hết nguyên liệu",
        created_at: "2026-11-27T03:05:00Z",
      },
    ],
  };
  await page.route("**/api/v1/orders/?*", (route) =>
    route.fulfill({ json: [current, rejected] }),
  );
  await page.route("**/api/v1/orders/77", (route) =>
    route.fulfill({ json: current }),
  );
  await page.route("**/api/v1/orders/78", (route) =>
    route.fulfill({ json: rejected }),
  );
  await page.route("**/api/v1/orders/77/cancel", (route) => {
    current = {
      ...order,
      status: "cancelled",
      history: [
        ...order.history,
        {
          status: "cancelled",
          reason: null,
          created_at: "2026-11-27T03:05:00Z",
        },
      ],
    };
    return route.fulfill({ json: current });
  });
  await page.goto("/orders/77");
  await page.getByRole("button", { name: "Hủy đơn hàng" }).click();
  await page.getByRole("button", { name: "Xác nhận hủy đơn" }).click();
  await expect(
    page.getByText("Đã hủy đơn hàng.", { exact: true }),
  ).toBeVisible();
  for (const width of [360, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [name, path] of [
      ["list", "/orders"],
      ["detail", "/orders/78"],
    ]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      if (name === "detail")
        await expect(
          page.getByText("Lý do: Quán hết nguyên liệu"),
        ).toBeVisible();
      else
        await expect(
          page.getByRole("link", { name: "Xem đơn 77" }),
        ).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: info.outputPath(`orders-${name}-${width}.png`),
        fullPage: true,
      });
    }
  }
});

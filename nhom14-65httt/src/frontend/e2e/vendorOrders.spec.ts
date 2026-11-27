import { test, expect } from "@playwright/test";
import { order } from "../tests/fixtures/orders";
import type { OrderDetail, OrderStatus } from "../src/types/order";

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
        id: 2000,
        email: "vendor@example.vn",
        full_name: "Chủ quán thử nghiệm",
        role: "vendor",
        is_simulated: false,
        created_at: "2026-11-27T03:00:00Z",
      },
    }),
  );
});

test("danh sách, xác nhận từng bước và snapshot không đổi", async ({
  page,
}, info) => {
  let current: OrderDetail = structuredClone(order);
  const mutations: string[] = [];
  const targets: Record<string, OrderStatus> = {
    confirm: "confirmed",
    preparing: "preparing",
    delivering: "delivering",
    complete: "completed",
  };
  await page.route("**/api/v1/vendor/orders**", (route) => {
    expect(route.request().headers()["authorization"]).toBe(
      "Bearer orders-access",
    );
    const path = new URL(route.request().url()).pathname;
    if (route.request().method() === "PATCH") {
      const action = path.split("/").at(-1)!;
      mutations.push(action);
      current = {
        ...current,
        status: targets[action],
        history: [
          ...current.history,
          {
            status: targets[action],
            reason: null,
            created_at: "2026-11-27T04:00:00Z",
          },
        ],
      };
    }
    return route.fulfill({
      json: path.endsWith("/orders") ? [current] : current,
    });
  });
  await page.goto("/vendor");
  await page
    .getByRole("link", { name: "Đơn hàng của quán", exact: true })
    .click();
  await page.getByRole("link", { name: "Xem đơn 77" }).click();
  await expect(page.getByText("Phở bò lúc mua", { exact: true })).toBeVisible();
  for (const width of [360, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`vendor-order-${width}.png`),
      fullPage: true,
    });
  }
  await page.getByRole("button", { name: "Nhận đơn", exact: true }).click();
  await page.getByRole("button", { name: "Quay lại", exact: true }).click();
  expect(mutations).toEqual([]);
  for (const label of [
    "Nhận đơn",
    "Bắt đầu chuẩn bị",
    "Bắt đầu giao hàng",
    "Xác nhận hoàn tất",
  ]) {
    await page.getByRole("button", { name: label, exact: true }).click();
    await page
      .getByRole("button", { name: "Xác nhận thao tác", exact: true })
      .click();
    await expect(
      page.getByText("Phở bò lúc mua", { exact: true }),
    ).toBeVisible();
  }
  await expect(
    page
      .locator(".order-detail-heading")
      .getByText("Hoàn tất", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Xử lý đơn hàng" }),
  ).not.toBeVisible();
  expect(mutations).toEqual(["confirm", "preparing", "delivering", "complete"]);
});

test("từ chối cần lý do và giữ lý do trong lịch sử", async ({ page }, info) => {
  let current = structuredClone(order);
  const reasons: string[] = [];
  await page.route("**/api/v1/vendor/orders/77**", (route) => {
    if (route.request().method() === "PATCH") {
      const body = route.request().postDataJSON();
      reasons.push(body.reason);
      expect(body).toEqual({ reason: "Hết nguyên liệu" });
      current = {
        ...current,
        status: "rejected",
        history: [
          ...current.history,
          {
            status: "rejected",
            reason: body.reason,
            created_at: "2026-11-27T04:00:00Z",
          },
        ],
      };
    }
    return route.fulfill({ json: current });
  });
  await page.setViewportSize({ width: 360, height: 900 });
  await page.goto("/vendor/orders/77");
  await page.getByRole("button", { name: "Từ chối đơn", exact: true }).click();
  await expect(page.getByLabel("Lý do từ chối")).toBeFocused();
  await page.getByRole("button", { name: "Xác nhận thao tác" }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "Nhập lý do từ chối từ 1 đến 500 ký tự.",
  );
  expect(reasons).toEqual([]);
  await page.getByLabel("Lý do từ chối").fill("  Hết nguyên liệu  ");
  await page.screenshot({
    path: info.outputPath("vendor-reject-360.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Xác nhận thao tác" }).click();
  await expect(
    page.getByText("Lý do: Hết nguyên liệu", { exact: true }),
  ).toBeVisible();
  expect(reasons).toEqual(["Hết nguyên liệu"]);
});

test("mất phản hồi không PATCH lại, GET lỗi khóa thao tác đến khi tải được", async ({
  page,
}) => {
  let mutated = false,
    failRead = true,
    patches = 0;
  await page.route("**/api/v1/vendor/orders/77**", (route) => {
    if (route.request().method() === "PATCH") {
      mutated = true;
      patches++;
      return route.abort("failed");
    }
    if (mutated && failRead)
      return route.fulfill({
        status: 503,
        json: {
          error: {
            code: "UNAVAILABLE",
            message: "Tạm thời chưa đọc được đơn.",
          },
        },
      });
    return route.fulfill({
      json: { ...order, status: mutated ? "confirmed" : "pending" },
    });
  });
  await page.goto("/vendor/orders/77");
  await page.getByRole("button", { name: "Nhận đơn", exact: true }).click();
  await page.getByRole("button", { name: "Xác nhận thao tác" }).click();
  await expect(
    page.getByRole("heading", { name: "Chưa tải được đơn hàng" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Nhận đơn", exact: true }),
  ).not.toBeVisible();
  await expect(
    page.getByRole("link", { name: "Về danh sách đơn" }),
  ).toHaveAttribute("href", "/vendor/orders");
  failRead = false;
  await page.getByRole("button", { name: "Thử lại" }).click();
  await expect(
    page.getByRole("button", { name: "Bắt đầu chuẩn bị" }),
  ).toBeVisible();
  expect(patches).toBe(1);
});

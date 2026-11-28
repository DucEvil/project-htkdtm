import { test, expect } from "@playwright/test";
import { restaurant } from "../tests/fixtures/catalog";
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "viviet.auth.v1",
      JSON.stringify({
        access_token: "vendor-access",
        refresh_token: "vendor-refresh",
      }),
    ),
  );
  await page.route("**/api/v1/auth/me", (route) =>
    route.fulfill({
      json: {
        id: 2,
        full_name: "Chủ quán",
        email: "vendor@example.vn",
        role: "vendor",
        is_simulated: false,
        created_at: "2026-11-28T00:00:00Z",
      },
    }),
  );
});
test("tổng quan theo máy chủ và vẫn mở đơn khi quán tạm ngừng", async ({
  page,
}, info) => {
  let profile = {
    ...restaurant,
    status: "approved",
    accepting_orders: false,
    can_receive_orders: false,
    is_simulated: false,
  };
  await page.route("**/api/v1/vendor/restaurant", (route) => {
    expect(route.request().method()).toBe("GET");
    expect(route.request().headers()["authorization"]).toBe(
      "Bearer vendor-access",
    );
    return route.fulfill({ json: profile });
  });
  await page.goto("/vendor");
  await page.getByRole("link", { name: "Tổng quan quán" }).click();
  await expect(
    page.getByText("Hiện chưa thể nhận đơn mới", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Quán đã được duyệt. Bật nhận đơn trong hồ sơ khi sẵn sàng phục vụ.",
    ),
  ).toBeVisible();
  for (const width of [360, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`vendor-dashboard-${width}.png`),
      fullPage: true,
    });
  }
  profile = { ...profile, status: "suspended" };
  await page.getByRole("button", { name: "Cập nhật tình trạng quán" }).click();
  await expect(page.getByText("Đang tạm ngừng", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Mở đơn hàng của quán" }),
  ).toHaveAttribute("href", "/vendor/orders");
  profile = {
    ...profile,
    status: "approved",
    accepting_orders: true,
    can_receive_orders: true,
  };
  await page.getByRole("button", { name: "Cập nhật tình trạng quán" }).click();
  await expect(
    page.getByText("Đang có thể nhận đơn", { exact: true }),
  ).toBeVisible();
});
test("lỗi mạng không bị hiểu là chưa có quán", async ({ page }) => {
  let missing = false;
  await page.route("**/api/v1/vendor/restaurant", (route) =>
    missing
      ? route.fulfill({
          status: 404,
          json: { error: { code: "NOT_FOUND", message: "Chưa có quán." } },
        })
      : route.abort("failed"),
  );
  await page.goto("/vendor/dashboard");
  await expect(
    page.getByRole("heading", { name: "Chưa tải được tình trạng quán" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Tạo hồ sơ quán" }),
  ).not.toBeVisible();
  missing = true;
  await page.getByRole("button", { name: "Cập nhật tình trạng quán" }).click();
  await expect(
    page.getByRole("link", { name: "Tạo hồ sơ quán" }),
  ).toHaveAttribute("href", "/vendor/profile");
});

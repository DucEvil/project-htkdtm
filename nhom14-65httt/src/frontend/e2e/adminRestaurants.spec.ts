import { test, expect } from "@playwright/test";
import { restaurant } from "../tests/fixtures/catalog";
test("duyệt không bật nhận đơn và tạm ngừng mất phản hồi được đối chiếu", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "viviet.auth.v1",
      JSON.stringify({
        access_token: "admin-access",
        refresh_token: "admin-refresh",
      }),
    ),
  );
  await page.route("**/api/v1/auth/me", (route) =>
    route.fulfill({
      json: {
        id: 1,
        full_name: "Quản trị",
        email: "admin@example.vn",
        role: "admin",
        is_simulated: false,
        created_at: "2026-11-27T00:00:00Z",
      },
    }),
  );
  let status = "pending";
  const mutations: string[] = [];
  await page.route("**/api/v1/admin/restaurants**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (route.request().method() === "PATCH") {
      mutations.push(path);
      status = path.endsWith("approve") ? "approved" : "suspended";
      if (status === "suspended") return route.abort("failed");
      return route.fulfill({
        json: {
          ...restaurant,
          status,
          accepting_orders: false,
          can_receive_orders: false,
          is_simulated: false,
        },
      });
    }
    return route.fulfill({
      json: {
        items: [
          {
            ...restaurant,
            status,
            accepting_orders: false,
            can_receive_orders: false,
            is_simulated: false,
          },
        ],
        total: 1,
        offset: 0,
        limit: 12,
      },
    });
  });
  await page.goto("/admin/restaurants");
  await page.getByRole("button", { name: "Duyệt quán Bếp Việt" }).click();
  await page.getByRole("button", { name: "Quay lại", exact: true }).click();
  expect(mutations).toHaveLength(0);
  await page.getByRole("button", { name: "Duyệt quán Bếp Việt" }).click();
  await page.getByRole("button", { name: "Xác nhận thao tác" }).click();
  await expect(page.locator(".admin-restaurant-status")).toHaveText(
    "Đã được duyệt",
  );
  await expect(
    page.getByText("Hiện chưa thể nhận đơn", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Tạm ngừng quán Bếp Việt" }).click();
  await page.getByRole("button", { name: "Xác nhận thao tác" }).click();
  await expect(page.locator(".admin-restaurant-status")).toHaveText(
    "Đang tạm ngừng",
  );
  await expect(
    page.getByRole("button", { name: "Duyệt quán Bếp Việt" }),
  ).toBeVisible();
  expect(mutations).toEqual([
    "/api/v1/admin/restaurants/3/approve",
    "/api/v1/admin/restaurants/3/suspend",
  ]);
});
test("admin lọc trạng thái và đọc hồ sơ quán trên mobile/desktop", async ({
  page,
}, info) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "viviet.auth.v1",
      JSON.stringify({
        access_token: "admin-access",
        refresh_token: "admin-refresh",
      }),
    ),
  );
  await page.route("**/api/v1/auth/me", (route) =>
    route.fulfill({
      json: {
        id: 1,
        full_name: "Quản trị viên",
        email: "admin@example.vn",
        role: "admin",
        is_simulated: false,
        created_at: "2026-11-27T00:00:00Z",
      },
    }),
  );
  const statuses: string[] = [];
  await page.route("**/api/v1/admin/restaurants?*", (route) => {
    expect(route.request().headers()["authorization"]).toBe(
      "Bearer admin-access",
    );
    const status =
      new URL(route.request().url()).searchParams.get("status") || "approved";
    statuses.push(status);
    return route.fulfill({
      json: {
        items: [
          {
            ...restaurant,
            status,
            is_simulated: true,
            can_receive_orders: false,
          },
        ],
        total: 1,
        limit: 12,
        offset: 0,
      },
    });
  });
  await page.goto("/admin");
  await page.getByRole("link", { name: "Danh sách quán" }).click();
  await expect(
    page.getByRole("heading", { name: restaurant.name }),
  ).toBeVisible();
  await page.getByLabel("Trạng thái quán").selectOption("pending");
  await expect(page.locator(".admin-restaurant-status")).toHaveText(
    "Chờ duyệt",
  );
  await page.getByText("Thông tin quán #3").click();
  await expect(
    page.getByText("Dữ liệu mô phỏng", { exact: true }),
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
      path: info.outputPath(`admin-restaurants-${width}.png`),
      fullPage: true,
    });
  }
  await page.getByLabel("Trạng thái quán").selectOption("suspended");
  await expect(page.locator(".admin-restaurant-status")).toHaveText(
    "Đang tạm ngừng",
  );
  expect(statuses).toContain("pending");
  expect(statuses).toContain("suspended");
});

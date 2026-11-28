import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
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
        created_at: "2026-11-28T00:00:00Z",
      },
    }),
  );
});
test("đọc total thật, nguồn lỗi độc lập và retry riêng", async ({
  page,
}, info) => {
  let fail = true;
  const reads = { restaurants: 0, dishes: 0, ingredients: 0 };
  await page.route("**/api/v1/admin/**", (route) => {
    expect(route.request().method()).toBe("GET");
    expect(route.request().headers()["authorization"]).toBe(
      "Bearer admin-access",
    );
    const url = new URL(route.request().url());
    expect(url.searchParams.get("limit")).toBe("1");
    let total = 0;
    if (url.pathname.endsWith("restaurants")) {
      reads.restaurants++;
      total = url.searchParams.get("status") === "pending" ? 7 : 80;
    }
    if (url.pathname.endsWith("canonical-dishes")) {
      reads.dishes++;
      total = 120;
    }
    if (url.pathname.endsWith("ingredients")) {
      reads.ingredients++;
      if (fail) return route.abort("failed");
      total = 0;
    }
    return route.fulfill({ json: { items: [], total, offset: 0, limit: 1 } });
  });
  await page.goto("/admin");
  await page.getByRole("link", { name: "Tổng quan quản trị" }).click();
  await expect(
    page
      .getByRole("article", { name: "Quán trong hệ thống", exact: true })
      .getByText("80", { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("article", { name: "Quán chờ duyệt", exact: true })
      .getByText("7", { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("article", { name: "Món chuẩn", exact: true })
      .getByText("120", { exact: true }),
  ).toBeVisible();
  const ingredients = page.getByRole("article", {
    name: "Nguyên liệu",
    exact: true,
  });
  await expect(ingredients.getByRole("alert")).toBeVisible();
  const previous = { ...reads };
  fail = false;
  await ingredients.getByRole("button", { name: "Thử lại" }).click();
  await expect(ingredients.getByText("0", { exact: true })).toBeVisible();
  expect(reads.restaurants).toBe(previous.restaurants);
  expect(reads.dishes).toBe(previous.dishes);
  expect(reads.ingredients).toBe(previous.ingredients + 1);
  for (const width of [360, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`admin-dashboard-${width}.png`),
      fullPage: true,
    });
  }
  await expect(
    ingredients.getByRole("link", { name: "Quản lý nguyên liệu" }),
  ).toHaveAttribute("href", "/admin/ingredients");
});
test("total không hợp lệ không hiển thị số liệu giả", async ({ page }) => {
  await page.route("**/api/v1/admin/**", (route) =>
    route.fulfill({ json: { items: [], total: -1, offset: 0, limit: 1 } }),
  );
  await page.goto("/admin/dashboard");
  await expect(page.getByRole("alert")).toHaveCount(4);
  await expect(page.locator(".admin-summary-count")).toHaveCount(0);
});

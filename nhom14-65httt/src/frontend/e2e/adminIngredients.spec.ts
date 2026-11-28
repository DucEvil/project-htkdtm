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
test("thêm sửa, xóa có xác nhận và 409 giữ nguyên liệu", async ({
  page,
}, info) => {
  let items = [{ id: 1, name: "bò", is_simulated: false }];
  let failDelete = true;
  const writes: string[] = [];
  await page.route("**/api/v1/admin/ingredients**", (route) => {
    expect(route.request().headers()["authorization"]).toBe(
      "Bearer admin-access",
    );
    const method = route.request().method();
    if (method !== "GET") writes.push(method);
    if (method === "POST") {
      expect(route.request().postDataJSON()).toEqual({ name: "hành" });
      const item = { id: 2, name: "hành", is_simulated: false };
      items.push(item);
      return route.fulfill({ status: 201, json: item });
    }
    if (method === "PUT") {
      expect(route.request().postDataJSON()).toEqual({ name: "hành lá" });
      items = items.map((item) =>
        item.id === 2 ? { ...item, name: "hành lá" } : item,
      );
      return route.fulfill({ json: items[1] });
    }
    if (method === "DELETE") {
      if (failDelete)
        return route.fulfill({
          status: 409,
          json: {
            error: {
              code: "INGREDIENT_IN_USE",
              message: "Nguyên liệu đang được sử dụng.",
            },
          },
        });
      items = items.filter((item) => item.id !== 2);
      return route.fulfill({ status: 204 });
    }
    return route.fulfill({
      json: { items, total: items.length, offset: 0, limit: 12 },
    });
  });
  await page.goto("/admin");
  await page.getByRole("link", { name: "Danh mục nguyên liệu" }).click();
  await page.getByRole("button", { name: "Lưu nguyên liệu" }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "Tên nguyên liệu cần từ 1 đến 100 ký tự.",
  );
  await page.getByLabel("Tên nguyên liệu").fill("  HÀNH  ");
  await page.getByRole("button", { name: "Lưu nguyên liệu" }).click();
  await page.getByRole("button", { name: "Sửa hành", exact: true }).click();
  await page.getByLabel("Tên nguyên liệu").fill("Hành lá");
  for (const width of [360, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`ingredients-${width}.png`),
      fullPage: true,
    });
  }
  await page.getByRole("button", { name: "Lưu nguyên liệu" }).click();
  await page.getByRole("button", { name: "Xóa hành lá", exact: true }).click();
  await page.getByRole("button", { name: "Giữ nguyên liệu" }).click();
  expect(writes).toEqual(["POST", "PUT"]);
  await page.getByRole("button", { name: "Xóa hành lá", exact: true }).click();
  await page.getByRole("button", { name: "Xác nhận xóa" }).click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Nguyên liệu đang được sử dụng" }),
  ).toContainText("Nguyên liệu đang được sử dụng");
  await expect(
    page.getByRole("heading", { name: "hành lá", exact: true }),
  ).toBeVisible();
  failDelete = false;
  await page.getByRole("button", { name: "Xóa hành lá", exact: true }).click();
  await page.getByRole("button", { name: "Xác nhận xóa" }).click();
  await expect(
    page.getByRole("heading", { name: "hành lá", exact: true }),
  ).not.toBeVisible();
  expect(writes).toEqual(["POST", "PUT", "DELETE", "DELETE"]);
});
test("tạo mất phản hồi khóa gửi, giữ dữ liệu và cho đối chiếu", async ({
  page,
}) => {
  let posted = false,
    count = 0;
  await page.route("**/api/v1/admin/ingredients**", (route) => {
    if (route.request().method() === "POST") {
      posted = true;
      count++;
      return route.abort("failed");
    }
    return route.fulfill({
      json: {
        items: posted ? [{ id: 3, name: "gừng", is_simulated: false }] : [],
        total: posted ? 1 : 0,
        offset: 0,
        limit: 12,
      },
    });
  });
  await page.goto("/admin/ingredients");
  await page.getByLabel("Tên nguyên liệu").fill("gừng");
  await page.getByRole("button", { name: "Lưu nguyên liệu" }).click();
  await expect(
    page.getByRole("button", { name: "Đã đối chiếu, mở biểu mẫu mới" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Lưu nguyên liệu" }),
  ).toBeDisabled();
  await expect(page.getByLabel("Tên nguyên liệu")).toHaveValue("gừng");
  await page.getByRole("button", { name: "Tải lại danh mục" }).click();
  await expect(
    page.getByRole("heading", { name: "gừng", exact: true }),
  ).toBeVisible();
  expect(count).toBe(1);
});

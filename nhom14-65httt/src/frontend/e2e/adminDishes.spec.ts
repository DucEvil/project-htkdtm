import { test, expect } from "@playwright/test";
import { dish } from "../tests/fixtures/catalog";
test("admin tạo sửa đủ đặc trưng và xử lý xóa món chuẩn đang dùng", async ({
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
        full_name: "Quản trị",
        email: "admin@example.vn",
        role: "admin",
        is_simulated: false,
        created_at: "2026-11-28T00:00:00Z",
      },
    }),
  );
  let item = {
    ...dish.canonical_dish,
    source_id: null as string | null,
    is_simulated: false,
  };
  let created = false;
  const writes: string[] = [];
  await page.route("**/api/v1/admin/canonical-dishes**", (route) => {
    const method = route.request().method();
    expect(route.request().headers()["authorization"]).toBe(
      "Bearer admin-access",
    );
    if (method === "POST" || method === "PUT") {
      writes.push(method);
      const payload = route.request().postDataJSON();
      expect(Object.keys(payload).sort()).toEqual([
        "ingredients",
        "labels",
        "method",
        "name",
        "region",
        "source_id",
        "spice_level",
      ]);
      expect(payload.source_id).toBe(null);
      expect(payload.ingredients).toEqual(["bò", "hành"]);
      item = { ...item, ...payload };
      created = true;
      return route.fulfill({ json: item });
    }
    if (method === "DELETE") {
      writes.push(method);
      return route.fulfill({
        status: 409,
        json: {
          error: {
            code: "CATALOG_IN_USE",
            message: "Món chuẩn đang được sử dụng.",
          },
        },
      });
    }
    return route.fulfill({
      json: {
        items: created ? [item] : [],
        total: created ? 1 : 0,
        offset: 0,
        limit: 12,
      },
    });
  });
  await page.goto("/admin/dishes");
  await page.getByLabel("Tên món chuẩn").fill("Phở bò");
  await page.getByLabel("Vùng miền").fill("Bắc");
  await page.getByLabel("Cách chế biến").fill("Nấu");
  await page
    .getByLabel("Nguyên liệu tham khảo (mỗi dòng một mục)")
    .fill("BÒ\nhành");
  await page.getByLabel("Nhãn món (mỗi dòng một mục)").fill("Món nước");
  await page.getByRole("button", { name: "Lưu món chuẩn" }).click();
  await page.getByRole("button", { name: "Sửa Phở bò", exact: true }).click();
  await expect(page.getByLabel("Vùng miền")).toHaveValue("Bắc");
  await page.getByLabel("Mức cay").selectOption("2");
  for (const width of [360, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`dishes-${width}.png`),
      fullPage: true,
    });
  }
  await page.getByRole("button", { name: "Lưu món chuẩn" }).click();
  await page.getByRole("button", { name: "Xóa Phở bò", exact: true }).click();
  await page.getByRole("button", { name: "Xác nhận xóa" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Món chuẩn đang được sử dụng" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Phở bò", exact: true }),
  ).toBeVisible();
  expect(item.spice_level).toBe(2);
  expect(writes).toEqual(["POST", "PUT", "DELETE"]);
});

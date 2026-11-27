import { test, expect } from "@playwright/test";
import { restaurant, dish } from "../tests/fixtures/catalog";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/restaurants/3", (route) =>
    route.fulfill({ json: restaurant }),
  );
  await page.route("**/api/v1/restaurants/3/menu?*", (route) =>
    route.fulfill({
      json: [
        dish,
        { ...dish, id: 10, name: "Phở bò chín" },
        { ...dish, id: 11, name: "Phở bò viên" },
      ],
    }),
  );
  await page.route("**/api/v1/menu-items/9", (route) =>
    route.fulfill({ json: dish }),
  );
});

test("từ tìm kiếm mở món và thực đơn, lỗi 404 không hiện nội dung cũ", async ({
  page,
}) => {
  await page.route("**/api/v1/search/dishes?*", (route) =>
    route.fulfill({
      json: {
        items: [{ ...dish, restaurant, distance_km: 1.25 }],
        total: 1,
        offset: 0,
        limit: 12,
      },
    }),
  );
  await page.goto("/search");
  await page.getByLabel("Vĩ độ", { exact: true }).fill("21");
  await page.getByLabel("Kinh độ", { exact: true }).fill("105");
  await page.getByRole("button", { name: "Dùng tọa độ này" }).click();
  await page.getByRole("link", { name: dish.name, exact: true }).click();
  await expect(page).toHaveURL(/\/menu-items\/9$/);
  await expect(
    page.getByRole("heading", { level: 1, name: dish.name }),
  ).toBeVisible();
  await expect(page.getByText("bò, hành", { exact: true })).toBeVisible();
  await expect(page.getByText("bánh phở, quế", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Xem thực đơn quán" }).click();
  await expect(page).toHaveURL(/\/restaurants\/3$/);
  await expect(
    page.getByRole("link", { name: `Xem món ${dish.name}` }),
  ).toBeVisible();
  await page.getByRole("link", { name: `Xem món ${dish.name}` }).click();
  await page.route("**/api/v1/menu-items/9", (route) =>
    route.fulfill({
      status: 404,
      json: {
        error: { code: "NOT_FOUND", message: "Không tìm thấy món bán." },
      },
    }),
  );
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Chưa tìm thấy món" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: dish.name, level: 1 }),
  ).toHaveCount(0);
});

test("quán và món responsive, lỗi mạng cho thử lại", async ({ page }, info) => {
  let fail = true;
  await page.route("**/api/v1/menu-items/9", (route) => {
    if (fail) {
      return route.fulfill({
        status: 503,
        json: {
          error: { code: "UNAVAILABLE", message: "Tạm thời chưa tải được." },
        },
      });
    }
    return route.fulfill({ json: dish });
  });
  await page.goto("/menu-items/9");
  await expect(page.getByRole("button", { name: "Thử lại" })).toBeVisible();
  fail = false;
  await page.getByRole("button", { name: "Thử lại" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: dish.name }),
  ).toBeVisible();
  for (const width of [360, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [name, path] of [
      ["restaurant", "/restaurants/3"],
      ["dish", "/menu-items/9"],
    ]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      if (name === "restaurant")
        await expect(
          page.getByRole("link", { name: `Xem món ${dish.name}` }),
        ).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: info.outputPath(`${name}-${width}.png`),
        fullPage: true,
      });
    }
  }
});

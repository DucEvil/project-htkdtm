import { test, expect } from "@playwright/test";
import { restaurant, dish } from "../tests/fixtures/catalog";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/restaurants/*", (route) =>
    route.fulfill({
      json: route.request().url().endsWith("/4")
        ? { ...restaurant, id: 4, name: "Bếp mới" }
        : restaurant,
    }),
  );
  await page.route("**/api/v1/menu-items/*", (route) =>
    route.fulfill({
      json: route.request().url().endsWith("/10")
        ? {
            ...dish,
            id: 10,
            name: "Cơm bò",
            restaurant_id: 4,
            restaurant_name: "Bếp mới",
          }
        : dish,
    }),
  );
  await page.route("**/api/v1/search/dishes?*", (route) =>
    route.fulfill({
      json: {
        items: [
          {
            ...dish,
            id: 10,
            name: "Cơm bò",
            restaurant_id: 4,
            restaurant_name: "Bếp mới",
            restaurant: { ...restaurant, id: 4, name: "Bếp mới" },
            distance_km: 1,
          },
        ],
        total: 1,
        offset: 0,
        limit: 12,
      },
    }),
  );
});

test("thêm/xóa/đổi số lượng và xác nhận đổi quán với bàn phím", async ({
  page,
}) => {
  await page.goto("/menu-items/9");
  await page.getByRole("button", { name: "Thêm vào giỏ" }).click();
  await page.getByRole("link", { name: "Giỏ hàng (1)", exact: true }).click();
  await page
    .getByRole("button", { name: `Tăng số lượng ${dish.name}` })
    .click();
  await expect(
    page.getByRole("link", { name: "Giỏ hàng (2)", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Tìm món, quán", exact: true }).click();
  await page.getByLabel("Vĩ độ", { exact: true }).fill("0");
  await page.getByLabel("Kinh độ", { exact: true }).fill("0");
  await page.getByRole("button", { name: "Dùng tọa độ này" }).click();
  await page.getByRole("link", { name: "Cơm bò", exact: true }).click();
  await page.getByRole("button", { name: "Thêm vào giỏ" }).click();
  const dialog = page.getByRole("dialog", { name: "Đổi sang quán khác?" });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Giữ giỏ hiện tại" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Thêm vào giỏ" }),
  ).toBeFocused();
  await expect(
    page.getByRole("link", { name: "Giỏ hàng (2)", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Thêm vào giỏ" }).click();
  await dialog.getByRole("button", { name: "Đổi quán và thêm món" }).click();
  await page.getByRole("link", { name: "Giỏ hàng (1)", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Bếp mới", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: dish.name })).toHaveCount(0);
  await page.getByRole("link", { name: "Đăng nhập", exact: true }).click();
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "Cơm bò", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Xóa món Cơm bò" }).click();
  await expect(
    page.getByRole("heading", { name: "Giỏ hàng đang trống" }),
  ).toBeVisible();
});

test("giỏ responsive và tải lại làm trống giỏ trong bộ nhớ", async ({
  page,
}, info) => {
  await page.goto("/menu-items/9");
  await page
    .getByRole("button", { name: `Tăng số lượng ${dish.name}` })
    .click();
  await page.getByRole("button", { name: "Thêm vào giỏ" }).click();
  await page.getByRole("link", { name: "Giỏ hàng (2)", exact: true }).click();
  for (const width of [360, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`cart-${width}.png`),
      fullPage: true,
    });
  }
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Giỏ hàng đang trống" }),
  ).toBeVisible();
});

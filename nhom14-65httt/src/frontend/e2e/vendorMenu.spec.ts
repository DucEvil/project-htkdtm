import { test, expect } from "@playwright/test";
import { dish, restaurant } from "../tests/fixtures/catalog";
import type { MenuItemDetail, MenuItemUpdate } from "../src/types/menu";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "viviet.auth.v1",
      JSON.stringify({
        access_token: "menu-access",
        refresh_token: "menu-refresh",
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
  await page.route("**/api/v1/vendor/restaurant", (route) =>
    route.fulfill({
      json: { ...restaurant, status: "approved", is_simulated: false },
    }),
  );
  await page.route("**/api/v1/canonical-dishes?*", (route) =>
    route.fulfill({
      json: { items: [dish.canonical_dish], total: 1, offset: 0, limit: 10 },
    }),
  );
  await page.route("**/api/v1/ingredients?*", (route) =>
    route.fulfill({
      json: { items: dish.ingredients, total: 2, offset: 0, limit: 10 },
    }),
  );
});

test("thêm, sửa nguyên liệu và ngừng bán giữ món trong danh sách", async ({
  page,
}, info) => {
  let item: MenuItemDetail | null = null;
  const creates: MenuItemUpdate[] = [],
    updates: MenuItemUpdate[] = [];
  let deletes = 0;
  await page.route("**/api/v1/vendor/menu-items**", (route) => {
    expect(route.request().headers()["authorization"]).toBe(
      "Bearer menu-access",
    );
    const method = route.request().method();
    if (method === "POST" || method === "PUT") {
      const body = route.request().postDataJSON() as MenuItemUpdate;
      (method === "POST" ? creates : updates).push(body);
      item = {
        ...dish,
        ...body,
        is_simulated: false,
        ingredients: dish.ingredients.filter((entry) =>
          body.ingredient_ids.includes(entry.id),
        ),
      };
      return route.fulfill({
        json: item,
        status: method === "POST" ? 201 : 200,
      });
    }
    if (method === "DELETE") {
      deletes++;
      item = { ...item!, is_available: false };
      return route.fulfill({ status: 204 });
    }
    const isDetail = /\/menu-items\/\d+$/.test(
      new URL(route.request().url()).pathname,
    );
    return route.fulfill({
      json: isDetail
        ? item
        : {
            items: item ? [item] : [],
            total: item ? 1 : 0,
            offset: 0,
            limit: 12,
          },
    });
  });
  await page.goto("/vendor/menu");
  await expect(
    page.getByRole("heading", { name: "Thực đơn đang trống" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Thêm món mới" }).click();
  await page.getByLabel("Tên món bán", { exact: true }).fill("Phở bò tại quán");
  await page.getByLabel("Giá bán (VNĐ)", { exact: true }).fill("35000");
  await page.getByRole("radio", { name: "Phở bò", exact: true }).check();
  await expect(
    page.getByRole("checkbox", { name: "bò", exact: true }),
  ).not.toBeChecked();
  await page.getByRole("checkbox", { name: "bò", exact: true }).check();
  await page
    .getByLabel("Tôi xác nhận đã khai báo nguyên liệu thực tế của món")
    .check();
  await page.getByLabel("Cho phép bán món", { exact: true }).check();
  for (const width of [360, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`vendor-menu-form-${width}.png`),
      fullPage: true,
    });
  }
  await page.getByRole("button", { name: "Tạo món", exact: true }).click();
  await expect(
    page.getByText("Đã tạo món trong thực đơn.", { exact: true }),
  ).toBeVisible();
  expect(creates).toEqual([
    {
      canonical_dish_id: 2,
      name: "Phở bò tại quán",
      price: 35000,
      is_available: true,
      ingredients_verified: true,
      ingredient_ids: [1],
    },
  ]);
  await page.getByRole("link", { name: "Chỉnh sửa món vừa tạo" }).click();
  await page.getByLabel("Giá bán (VNĐ)", { exact: true }).fill("38000");
  await page.getByRole("checkbox", { name: "hành", exact: true }).check();
  await page
    .getByRole("button", { name: "Lưu thay đổi món", exact: true })
    .click();
  await expect(
    page.getByText("Đã lưu thay đổi món.", { exact: true }),
  ).toBeVisible();
  expect(updates).toEqual([
    { ...creates[0], price: 38000, ingredient_ids: [1, 2] },
  ]);
  await page.getByRole("link", { name: "Về danh sách thực đơn" }).click();
  const stop = page.getByRole("button", { name: "Ngừng bán Phở bò tại quán" });
  await stop.click();
  await expect(page.getByRole("button", { name: "Giữ bán món" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(stop).toBeFocused();
  expect(deletes).toBe(0);
  await stop.click();
  await page.getByRole("button", { name: "Xác nhận ngừng bán" }).click();
  await expect(page.getByText("Đã ngừng bán", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Sửa món Phở bò tại quán" }),
  ).toBeVisible();
  expect(deletes).toBe(1);
  for (const width of [360, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`vendor-menu-list-${width}.png`),
      fullPage: true,
    });
  }
});

test("mất phản hồi tạo món khóa gửi và cho đối chiếu danh sách", async ({
  page,
}) => {
  let item: MenuItemDetail | null = null;
  let posts = 0;
  await page.route("**/api/v1/vendor/menu-items**", (route) => {
    if (route.request().method() === "POST") {
      posts++;
      const body = route.request().postDataJSON() as MenuItemUpdate;
      item = { ...dish, ...body, ingredients: [], is_simulated: false };
      return route.abort("failed");
    }
    return route.fulfill({
      json: {
        items: item ? [item] : [],
        total: item ? 1 : 0,
        offset: 0,
        limit: 12,
      },
    });
  });
  await page.goto("/vendor/menu/new");
  await page.getByLabel("Tên món bán", { exact: true }).fill("Món đã gửi");
  await page.getByLabel("Giá bán (VNĐ)", { exact: true }).fill("35000");
  await page.getByRole("radio", { name: "Phở bò", exact: true }).check();
  await page.getByRole("button", { name: "Tạo món", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Tạo món", exact: true }),
  ).toBeDisabled();
  await expect(page.getByLabel("Tên món bán", { exact: true })).toHaveValue(
    "Món đã gửi",
  );
  await expect(
    page.getByText("Đã tạo món trong thực đơn.", { exact: true }),
  ).not.toBeVisible();
  await page.getByRole("link", { name: "Kiểm tra thực đơn đã lưu" }).click();
  await expect(
    page.getByRole("heading", { name: "Món đã gửi", exact: true }),
  ).toBeVisible();
  expect(posts).toBe(1);
});

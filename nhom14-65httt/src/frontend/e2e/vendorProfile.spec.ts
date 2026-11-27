import { test, expect } from "@playwright/test";
import { restaurant } from "../tests/fixtures/catalog";
import type {
  RestaurantCreate,
  RestaurantDetail,
  RestaurantUpdate,
} from "../src/types/restaurant";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "viviet.auth.v1",
      JSON.stringify({
        access_token: "profile-access",
        refresh_token: "profile-refresh",
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
const approved: RestaurantDetail = {
  ...restaurant,
  accepting_orders: false,
  can_receive_orders: false,
  status: "approved",
  is_simulated: false,
};

test("tạo mất phản hồi đọc lại hồ sơ, duyệt không tự nhận đơn, PUT đủ trường", async ({
  page,
}) => {
  let profile: RestaurantDetail | null = null;
  const creates: RestaurantCreate[] = [],
    updates: RestaurantUpdate[] = [];
  await page.route("**/api/v1/vendor/restaurant", (route) => {
    expect(route.request().headers()["authorization"]).toBe(
      "Bearer profile-access",
    );
    if (route.request().method() === "POST") {
      const body = route.request().postDataJSON() as RestaurantCreate;
      creates.push(body);
      profile = {
        ...approved,
        ...body,
        status: "pending",
        accepting_orders: false,
        can_receive_orders: false,
      };
      return route.abort("failed");
    }
    if (route.request().method() === "PUT") {
      const body = route.request().postDataJSON() as RestaurantUpdate;
      updates.push(body);
      profile = {
        ...profile!,
        ...body,
        can_receive_orders: body.accepting_orders,
      };
    }
    return profile
      ? route.fulfill({ json: profile })
      : route.fulfill({
          status: 404,
          json: {
            error: { code: "NOT_FOUND", message: "Chưa liên kết quán." },
          },
        });
  });
  await page.goto("/vendor");
  await page.getByRole("link", { name: "Quản lý hồ sơ quán" }).click();
  await page.getByLabel("Tên quán", { exact: true }).fill("  Bếp Việt  ");
  await page.getByLabel("Địa chỉ quán", { exact: true }).fill("Số 1 Hà Nội");
  await page.getByLabel("Vĩ độ quán", { exact: true }).fill("0");
  await page.getByLabel("Kinh độ quán", { exact: true }).fill("0");
  await page.getByRole("button", { name: "Tạo quán và gửi duyệt" }).click();
  await page.getByRole("button", { name: "Kiểm tra hồ sơ đã tạo" }).click();
  await expect(
    page.getByRole("heading", { name: "Chờ duyệt", exact: true }),
  ).toBeVisible();
  expect(creates).toHaveLength(1);
  expect(creates[0]).toEqual({
    name: "Bếp Việt",
    address: "Số 1 Hà Nội",
    latitude: 0,
    longitude: 0,
    delivery_radius_km: 5,
    opens_at: "08:00",
    closes_at: "22:00",
  });
  const receiving = page.getByLabel("Bật nhận đơn khi quán trong giờ phục vụ");
  await expect(receiving).toBeDisabled();
  profile = { ...profile!, status: "approved" };
  await page.getByRole("button", { name: "Kiểm tra trạng thái duyệt" }).click();
  await expect(
    page.getByRole("heading", { name: "Đã được duyệt", exact: true }),
  ).toBeVisible();
  await expect(receiving).not.toBeChecked();
  await page.getByLabel("Giờ mở cửa", { exact: true }).fill("22:00");
  await page.getByLabel("Giờ đóng cửa", { exact: true }).fill("06:00");
  await receiving.check();
  await page.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(
    page.getByText("Đã lưu hồ sơ quán.", { exact: true }),
  ).toBeVisible();
  expect(updates[0]).toEqual({
    name: "Bếp Việt",
    address: "Số 1 Hà Nội",
    latitude: 0,
    longitude: 0,
    delivery_radius_km: 5,
    opens_at: "22:00",
    closes_at: "06:00",
    accepting_orders: true,
  });
});

test("hồ sơ responsive, 409 giữ chỉnh sửa và khóa nhận đơn đến khi đọc trạng thái", async ({
  page,
}, info) => {
  let profile = approved;
  let fail = true;
  await page.route("**/api/v1/vendor/restaurant", (route) => {
    if (route.request().method() === "PUT") {
      if (fail) {
        profile = {
          ...profile,
          status: "suspended",
          accepting_orders: false,
          can_receive_orders: false,
        };
        fail = false;
        return route.fulfill({
          status: 409,
          json: {
            error: {
              code: "RESTAURANT_NOT_APPROVED",
              message: "Quán cần được duyệt trước khi bật nhận đơn.",
            },
          },
        });
      }
      profile = { ...profile, ...route.request().postDataJSON() };
    }
    return route.fulfill({ json: profile });
  });
  await page.goto("/vendor/profile");
  await page
    .getByLabel("Tên quán", { exact: true })
    .fill("Bếp Việt đã chỉnh sửa");
  for (const width of [360, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`vendor-profile-${width}.png`),
      fullPage: true,
    });
  }
  await page.getByLabel("Bật nhận đơn khi quán trong giờ phục vụ").check();
  await page.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Cần kiểm tra lại trạng thái",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByLabel("Tên quán", { exact: true })).toHaveValue(
    "Bếp Việt đã chỉnh sửa",
  );
  await expect(
    page.getByLabel("Bật nhận đơn khi quán trong giờ phục vụ"),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Kiểm tra trạng thái duyệt" }).click();
  await expect(
    page.getByRole("heading", { name: "Đang tạm ngừng", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Tên quán", { exact: true })).toHaveValue(
    "Bếp Việt đã chỉnh sửa",
  );
  await page.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(
    page.getByText("Đã lưu hồ sơ quán.", { exact: true }),
  ).toBeVisible();
  expect(profile.accepting_orders).toBe(false);
});

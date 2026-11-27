import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "viviet.auth.v1",
      JSON.stringify({
        access_token: "test-access",
        refresh_token: "test-refresh",
      }),
    ),
  );
  await page.route("**/api/v1/auth/me", (route) =>
    route.fulfill({
      json: {
        id: 1,
        email: "taste@example.vn",
        full_name: "Khách thử nghiệm",
        role: "customer",
        is_simulated: false,
        created_at: "2026-11-27T03:00:00Z",
      },
    }),
  );
});

test("lưu khẩu vị, giữ dữ liệu khi lỗi, tải lại và bỏ qua không ghi", async ({
  page,
}) => {
  let profile: unknown = null;
  let writes = 0;
  await page.route("**/api/v1/preferences/", async (route) => {
    if (route.request().method() === "PUT") {
      writes++;
      expect(route.request().headers()["authorization"]).toBe(
        "Bearer test-access",
      );
      if (writes === 1)
        return route.fulfill({
          status: 503,
          json: {
            error: {
              code: "UNAVAILABLE",
              message: "Chưa lưu được. Vui lòng thử lại.",
            },
          },
        });
      profile = route.request().postDataJSON();
    }
    return profile
      ? route.fulfill({ json: profile })
      : route.fulfill({
          status: 404,
          json: { error: { code: "NOT_FOUND", message: "Chưa khai báo." } },
        });
  });
  await page.goto("/onboarding/taste");
  await page.getByRole("link", { name: "Bỏ qua lúc này" }).click();
  expect(writes).toBe(0);
  await page.getByRole("link", { name: "Khai báo khẩu vị" }).click();
  await page.getByLabel("Trung", { exact: true }).check();
  await page.getByLabel("Vừa cay", { exact: true }).check();
  await page.getByLabel(/Nguyên liệu nào bạn yêu thích/).fill("bò, nấm");
  await page.getByLabel(/Bạn muốn tránh nguyên liệu nào/).fill("tôm");
  await page.getByLabel("Cân bằng quen và mới", { exact: true }).check();
  await page.getByLabel(/Tôi đồng ý lưu/).check();
  await page.getByRole("button", { name: "Lưu khẩu vị" }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "Chưa lưu được. Vui lòng thử lại.",
  );
  await expect(page.getByLabel(/Nguyên liệu nào bạn yêu thích/)).toHaveValue(
    "bò, nấm",
  );
  await page.getByRole("button", { name: "Lưu khẩu vị" }).click();
  await expect(page.getByRole("status")).toHaveText("Đã lưu khẩu vị của bạn.");
  expect(profile).toEqual({
    regions: ["Trung"],
    spice_level: 2,
    liked_ingredients: ["bò", "nấm"],
    avoided_ingredients: ["tôm"],
    exploration_level: 1,
  });
  await page.reload();
  await expect(page.getByLabel("Vừa cay", { exact: true })).toBeChecked();
  await expect(page.getByLabel(/Tôi đồng ý lưu/)).not.toBeChecked();
  expect(writes).toBe(2);
});

test("khẩu vị responsive và focus lỗi bằng bàn phím", async ({
  page,
}, info) => {
  await page.route("**/api/v1/preferences/", (route) =>
    route.fulfill({
      status: 404,
      json: { error: { code: "NOT_FOUND", message: "Chưa khai báo." } },
    }),
  );
  for (const width of [360, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/onboarding/taste");
    await expect(
      page.getByRole("button", { name: "Lưu khẩu vị" }),
    ).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`taste-${width}.png`),
      fullPage: true,
    });
  }
  await page.getByRole("button", { name: "Lưu khẩu vị" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Không cay", { exact: true })).toBeFocused();
  await page.keyboard.press("Space");
  await expect(page.getByLabel("Không cay", { exact: true })).toBeChecked();
});

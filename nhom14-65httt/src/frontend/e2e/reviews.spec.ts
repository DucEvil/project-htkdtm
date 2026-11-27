import { test, expect } from "@playwright/test";
import { order } from "../tests/fixtures/orders";
import type { ReviewCreate } from "../src/types/review";

const completed = {
  ...order,
  status: "completed",
  total: 115000,
  items: [
    ...order.items,
    {
      menu_item_id: 10,
      snapshot_name: "Cơm gà lúc mua",
      snapshot_price: 45000,
      quantity: 1,
    },
  ],
  history: [
    ...order.history,
    { status: "completed", reason: null, created_at: "2026-11-27T03:30:00Z" },
  ],
};
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "viviet.auth.v1",
      JSON.stringify({
        access_token: "review-access",
        refresh_token: "review-refresh",
      }),
    ),
  );
  await page.route("**/api/v1/auth/me", (route) =>
    route.fulfill({
      json: {
        id: 1900,
        email: "review@example.vn",
        full_name: "Khách thử nghiệm",
        role: "customer",
        is_simulated: false,
        created_at: order.created_at,
      },
    }),
  );
  await page.route("**/api/v1/orders/77", (route) =>
    route.fulfill({ json: completed }),
  );
});

test("lỗi gửi giữ nội dung, trùng không giả điểm cũ; hai món độc lập", async ({
  page,
}) => {
  const requests: ReviewCreate[] = [];
  await page.route("**/api/v1/orders/77/review", (route) => {
    expect(route.request().method()).toBe("POST");
    expect(route.request().headers()["authorization"]).toBe(
      "Bearer review-access",
    );
    const payload = route.request().postDataJSON() as ReviewCreate;
    requests.push(payload);
    if (payload.menu_item_id === 9) {
      if (requests.filter((entry) => entry.menu_item_id === 9).length === 1)
        return route.abort("failed");
      return route.fulfill({
        status: 409,
        json: {
          error: {
            code: "REVIEW_ALREADY_EXISTS",
            message: "Món này đã được đánh giá trong đơn.",
          },
        },
      });
    }
    return route.fulfill({
      status: 201,
      json: {
        id: 12,
        order_id: 77,
        menu_item_id: 10,
        snapshot_name: "Cơm gà lúc mua",
        snapshot_price: 45000,
        rating: payload.rating,
        comment: payload.comment ?? "",
        created_at: "2026-11-27T03:40:00Z",
      },
    });
  });
  await page.goto("/orders/77");
  const first = page.getByRole("article", { name: "Phở bò lúc mua" });
  const second = page.getByRole("article", { name: "Cơm gà lúc mua" });
  await first.getByRole("radio", { name: "5 sao — Rất hài lòng" }).check();
  await first.getByLabel("Nhận xét (không bắt buộc)").fill("Nước dùng thơm");
  await first.getByRole("button", { name: "Gửi đánh giá" }).click();
  await expect(first.getByRole("alert")).toBeVisible();
  await expect(first.getByLabel("Nhận xét (không bắt buộc)")).toHaveValue(
    "Nước dùng thơm",
  );
  await first.getByRole("button", { name: "Gửi đánh giá" }).click();
  await expect(
    first.getByText("Món này đã được đánh giá trong đơn.", { exact: true }),
  ).toBeVisible();
  await expect(first.getByText("Đã lưu đánh giá của bạn.")).toHaveCount(0);
  await expect(
    second.getByRole("radio", { name: "5 sao — Rất hài lòng" }),
  ).not.toBeChecked();
  await second
    .getByRole("radio", { name: "4 sao — Hài lòng", exact: true })
    .check();
  await second.getByLabel("Nhận xét (không bắt buộc)").fill("Cơm mềm, vừa vị");
  await second.getByRole("button", { name: "Gửi đánh giá" }).click();
  await expect(second.getByText("Đã lưu đánh giá của bạn.")).toBeVisible();
  await expect(second.getByText("4/5 · Hài lòng")).toBeVisible();
  await page.getByRole("button", { name: "Cập nhật trạng thái" }).click();
  await expect(second.getByText("Đã lưu đánh giá của bạn.")).toBeVisible();
  expect(requests).toHaveLength(3);
  expect(requests[1]).toEqual(requests[0]);
  expect(requests[2]).toEqual({
    menu_item_id: 10,
    rating: 4,
    comment: "Cơm mềm, vừa vị",
  });
});

test("validation/focus, chọn sao bằng bàn phím và responsive", async ({
  page,
}, info) => {
  await page.goto("/orders/77");
  const form = page.getByRole("article", { name: "Phở bò lúc mua" });
  await form.getByRole("button", { name: "Gửi đánh giá" }).click();
  const firstStar = form.getByRole("radio", {
    name: "1 sao — Rất không hài lòng",
  });
  await expect(firstStar).toBeFocused();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(
    form.getByRole("radio", { name: "3 sao — Bình thường" }),
  ).toBeChecked();
  await form
    .getByLabel("Nhận xét (không bắt buộc)")
    .fill("Món ăn vừa miệng, mình mong phần rau nhiều hơn.");
  for (const width of [360, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`reviews-${width}.png`),
      fullPage: true,
    });
  }
});

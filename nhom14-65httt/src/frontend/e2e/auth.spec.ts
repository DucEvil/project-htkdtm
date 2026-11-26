import { test, expect } from "@playwright/test";

for (const role of ["customer", "vendor"] as const) {
  test(`đăng ký, đăng nhập, tải lại và đăng xuất ${role} với backend thật`, async ({
    page,
  }) => {
    const failures: string[] = [];
    page.on("pageerror", (error) => failures.push(error.message));
    const email = `auth-${role}-${Date.now()}@example.vn`;
    const password = "Mat khau e2e 123!";
    await page.goto("/register");
    await page.getByLabel("Họ và tên").fill("Người dùng kiểm thử");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
    await page.getByLabel("Nhập lại mật khẩu").fill(password);
    await page.getByLabel("Bạn đến với Vị Việt với vai trò").selectOption(role);
    await page.getByRole("button", { name: "Tạo tài khoản" }).click();
    await expect(page.getByRole("status")).toHaveText(
      "Đã tạo tài khoản. Bạn có thể đăng nhập ngay.",
    );
    await expect(page.getByLabel("Email")).toHaveValue(email);
    await page.getByLabel("Mật khẩu", { exact: true }).fill("sai-mat-khau");
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await expect(page.getByRole("alert")).toHaveText(
      "Email hoặc mật khẩu không đúng.",
    );
    await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    const destination = role === "vendor" ? "/vendor" : "/account";
    await expect(page).toHaveURL(new RegExp(destination + "$"));
    await expect(
      page.getByRole("heading", { name: "Chào Người dùng kiểm thử." }),
    ).toBeVisible();
    await page.reload();
    await expect(page.getByText(email, { exact: true })).toBeVisible();
    await page.goto("/admin");
    await expect(
      page.getByRole("heading", { name: "Trang này dành cho vai trò khác." }),
    ).toBeVisible();
    await page.goto(destination);
    await expect(page.getByText(email, { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Đăng xuất" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto(destination);
    await expect(page).toHaveURL(/\/login$/);
    expect(failures).toEqual([]);
  });
}

test("giao diện đăng nhập/đăng ký trên desktop và điện thoại không tràn ngang", async ({
  page,
}, info) => {
  for (const viewport of [
    { width: 1280, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    for (const path of ["/login", "/register"]) {
      await page.goto(path);
      await expect(page.getByLabel("Email")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: info.outputPath(`${path.slice(1)}-${viewport.width}.png`),
        fullPage: true,
      });
    }
  }
});

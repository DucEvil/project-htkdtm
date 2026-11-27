import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import AppRouter from "../src/router";
import { AuthContext, type AuthState } from "../src/contexts/authState";
import { ApiError } from "../src/api/client";
import * as preferences from "../src/api/preferences";
import type { Preference } from "../src/types/preference";
import type { UserRole } from "../src/types/auth";

vi.mock("../src/api/preferences", () => ({
  getPreference: vi.fn(),
  savePreference: vi.fn(),
}));
const profile: Preference = {
  regions: ["Bắc"],
  spice_level: 1,
  liked_ingredients: ["bò"],
  avoided_ingredients: ["tôm"],
  exploration_level: 2,
};
const missing = new ApiError("Chưa khai báo", 404, "NOT_FOUND");
function mount(role: UserRole | null = "customer") {
  const state: AuthState = {
    user: role
      ? {
          id: 1,
          email: "khach@example.vn",
          full_name: "Khách",
          role,
          is_simulated: false,
          created_at: "2026-11-27T03:00:00Z",
        }
      : null,
    status: role ? "authenticated" : "anonymous",
    error: "",
    persisted: true,
    signIn: vi.fn(),
    signOut: vi.fn(),
    retry: vi.fn(),
  };
  return render(
    <AuthContext.Provider value={state}>
      <MemoryRouter initialEntries={["/onboarding/taste"]}>
        <AppRouter />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}
beforeEach(() => {
  vi.mocked(preferences.getPreference).mockReset().mockRejectedValue(missing);
  vi.mocked(preferences.savePreference).mockReset().mockResolvedValue(profile);
});
afterEach(cleanup);

it("bỏ qua hồ sơ chưa có không gọi PUT", async () => {
  mount();
  await userEvent.click(
    await screen.findByRole("link", { name: "Bỏ qua lúc này" }),
  );
  expect(
    await screen.findByRole("heading", { name: "Chào Khách." }),
  ).toBeTruthy();
  expect(preferences.savePreference).not.toHaveBeenCalled();
});

it("đọc hồ sơ đã lưu, giữ vùng tùy chỉnh và chưa tự đồng ý lưu", async () => {
  vi.mocked(preferences.getPreference).mockResolvedValue({
    ...profile,
    regions: ["Tây Bắc"],
  });
  mount();
  const liked = await screen.findByLabelText(/Nguyên liệu nào bạn yêu thích/);
  expect((liked as HTMLInputElement).value).toBe("bò");
  expect((screen.getByLabelText("Tây Bắc") as HTMLInputElement).checked).toBe(
    true,
  );
  expect(
    (screen.getByLabelText(/Tôi đồng ý lưu/) as HTMLInputElement).checked,
  ).toBe(false);
  expect(preferences.savePreference).not.toHaveBeenCalled();
});

it("báo lỗi lựa chọn bắt buộc và focus ô lỗi đầu", async () => {
  mount();
  await userEvent.click(
    await screen.findByRole("button", { name: "Lưu khẩu vị" }),
  );
  expect(screen.getByText("Bạn hãy chọn mức cay.")).toBeTruthy();
  expect(screen.getByText("Bạn hãy chọn mức khám phá.")).toBeTruthy();
  expect(
    screen.getByText("Bạn cần đồng ý trước khi lưu khẩu vị."),
  ).toBeTruthy();
  await waitFor(() =>
    expect(document.activeElement).toBe(screen.getByLabelText("Không cay")),
  );
  expect(preferences.savePreference).not.toHaveBeenCalled();
});

it("lưu đủ năm câu, tách nguyên liệu và dùng hồ sơ chuẩn hóa từ response", async () => {
  mount();
  await userEvent.click(await screen.findByLabelText("Bắc"));
  await userEvent.click(screen.getByLabelText("Ít cay"));
  await userEvent.type(
    screen.getByLabelText(/Nguyên liệu nào bạn yêu thích/),
    " Bò, nấm ",
  );
  await userEvent.click(screen.getByLabelText("Thích khám phá món mới"));
  await userEvent.click(screen.getByLabelText(/Tôi đồng ý lưu/));
  await userEvent.click(screen.getByRole("button", { name: "Lưu khẩu vị" }));
  expect(preferences.savePreference).toHaveBeenCalledWith({
    ...profile,
    liked_ingredients: ["Bò", "nấm"],
    avoided_ingredients: [],
  });
  expect(await screen.findByText("Đã lưu khẩu vị của bạn.")).toBeTruthy();
  expect(
    (screen.getByLabelText(/Nguyên liệu nào bạn yêu thích/) as HTMLInputElement)
      .value,
  ).toBe("bò");
});

it("lỗi tải khóa biểu mẫu và cho thử lại", async () => {
  vi.mocked(preferences.getPreference)
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce(profile);
  mount();
  await userEvent.click(await screen.findByRole("button", { name: "Thử lại" }));
  expect(
    await screen.findByRole("heading", { name: "Điều chỉnh theo vị của bạn" }),
  ).toBeTruthy();
  expect(preferences.savePreference).not.toHaveBeenCalled();
});

it("lưu lỗi giữ dữ liệu, ánh xạ 422 vào ô nhập", async () => {
  vi.mocked(preferences.getPreference).mockResolvedValue(profile);
  vi.mocked(preferences.savePreference).mockRejectedValue(
    new ApiError("Dữ liệu không hợp lệ.", 422, "VALIDATION_ERROR", [
      { field: ["body", "liked_ingredients", 0] },
    ]),
  );
  mount();
  await userEvent.click(await screen.findByLabelText(/Tôi đồng ý lưu/));
  await userEvent.type(
    screen.getByLabelText(/Nguyên liệu nào bạn yêu thích/),
    ", nấm",
  );
  await userEvent.click(screen.getByRole("button", { name: "Lưu khẩu vị" }));
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(
    (screen.getByLabelText(/Nguyên liệu nào bạn yêu thích/) as HTMLInputElement)
      .value,
  ).toBe("bò, nấm");
  expect(
    screen
      .getByLabelText(/Nguyên liệu nào bạn yêu thích/)
      .getAttribute("aria-invalid"),
  ).toBe("true");
});

it("chặn gửi lặp trong lúc chờ lưu", async () => {
  vi.mocked(preferences.getPreference).mockResolvedValue(profile);
  let finish!: (value: Preference) => void;
  vi.mocked(preferences.savePreference).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  mount();
  await userEvent.click(await screen.findByLabelText(/Tôi đồng ý lưu/));
  await userEvent.click(screen.getByRole("button", { name: "Lưu khẩu vị" }));
  await userEvent.click(screen.getByRole("button", { name: "Đang lưu…" }));
  expect(preferences.savePreference).toHaveBeenCalledTimes(1);
  expect(
    (screen.getByLabelText("Ít cay") as HTMLInputElement).disabled ||
      screen.getByLabelText("Ít cay").matches(":disabled"),
  ).toBe(true);
  finish(profile);
  expect(await screen.findByText("Đã lưu khẩu vị của bạn.")).toBeTruthy();
});

it.each(["vendor", "admin"] as const)("chặn vai trò %s", async (role) => {
  mount(role);
  expect(
    await screen.findByRole("heading", {
      name: "Trang này dành cho vai trò khác.",
    }),
  ).toBeTruthy();
  expect(preferences.getPreference).not.toHaveBeenCalled();
});

it("chuyển khách chưa đăng nhập tới form đăng nhập", async () => {
  mount(null);
  expect(
    await screen.findByRole("heading", { name: "Chào mừng bạn trở lại" }),
  ).toBeTruthy();
  expect(preferences.getPreference).not.toHaveBeenCalled();
});

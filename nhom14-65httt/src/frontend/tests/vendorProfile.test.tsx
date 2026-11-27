import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import AppRouter from "../src/router";
import { AuthContext, type AuthState } from "../src/contexts/authState";
import { ApiError } from "../src/api/client";
import * as vendor from "../src/api/vendor";
import {
  emptyVendorProfile,
  profileFromRestaurant,
  validateVendorProfile,
} from "../src/utils/vendorProfileValidation";
import { restaurant } from "./fixtures/catalog";
import type { RestaurantDetail } from "../src/types/restaurant";

vi.mock("../src/api/vendor", () => ({
  getVendorRestaurant: vi.fn(),
  createVendorRestaurant: vi.fn(),
  updateVendorRestaurant: vi.fn(),
}));
const approved: RestaurantDetail = {
  ...restaurant,
  status: "approved",
  is_simulated: false,
};
const pending: RestaurantDetail = {
  ...approved,
  status: "pending",
  accepting_orders: false,
  can_receive_orders: false,
};
const auth: AuthState = {
  user: {
    id: 2,
    full_name: "Chủ quán",
    email: "vendor@example.vn",
    role: "vendor",
    is_simulated: false,
    created_at: "2026-11-27T03:00:00Z",
  },
  status: "authenticated",
  persisted: true,
  error: "",
  signIn: vi.fn(),
  signOut: vi.fn(),
  retry: vi.fn(),
};
beforeEach(() => {
  vi.mocked(vendor.getVendorRestaurant).mockReset().mockResolvedValue(approved);
  vi.mocked(vendor.createVendorRestaurant)
    .mockReset()
    .mockResolvedValue(pending);
  vi.mocked(vendor.updateVendorRestaurant)
    .mockReset()
    .mockImplementation(async (payload) => ({ ...approved, ...payload }));
});
afterEach(cleanup);
function tree(state = auth) {
  return (
    <AuthContext.Provider value={state}>
      <MemoryRouter initialEntries={["/vendor/profile"]}>
        <AppRouter />
      </MemoryRouter>
    </AuthContext.Provider>
  );
}
function mount(state = auth) {
  return render(tree(state));
}
async function fillNew() {
  await userEvent.type(
    await screen.findByLabelText("Tên quán"),
    "  Bếp Việt  ",
  );
  await userEvent.type(
    screen.getByLabelText("Địa chỉ quán"),
    "  Số 1 Hà Nội  ",
  );
  await userEvent.type(screen.getByLabelText("Vĩ độ quán"), "0");
  await userEvent.type(screen.getByLabelText("Kinh độ quán"), "0");
}
const missing = new ApiError("Chưa liên kết", 404, "NOT_FOUND");

it("404 nghiệp vụ mở tạo hồ sơ, POST trim và không tự duyệt/bật đơn", async () => {
  vi.mocked(vendor.getVendorRestaurant).mockRejectedValue(missing);
  mount();
  await fillNew();
  await userEvent.click(
    screen.getByRole("button", { name: "Tạo quán và gửi duyệt" }),
  );
  expect(vendor.createVendorRestaurant).toHaveBeenCalledWith({
    name: "Bếp Việt",
    address: "Số 1 Hà Nội",
    latitude: 0,
    longitude: 0,
    delivery_radius_km: 5,
    opens_at: "08:00",
    closes_at: "22:00",
  });
  expect(
    await screen.findByText("Đã lưu hồ sơ. Quán đang chờ duyệt."),
  ).toBeTruthy();
  expect(
    screen
      .getByLabelText("Bật nhận đơn khi quán trong giờ phục vụ")
      .matches(":disabled"),
  ).toBe(true);
});
it("approved đọc và PUT đủ trường, không nhận restaurant_id/status", async () => {
  mount();
  await userEvent.clear(await screen.findByLabelText("Tên quán"));
  await userEvent.type(screen.getByLabelText("Tên quán"), "Bếp mới");
  await userEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
  expect(vendor.updateVendorRestaurant).toHaveBeenCalledWith({
    name: "Bếp mới",
    address: approved.address,
    latitude: 21,
    longitude: 105,
    delivery_radius_km: 5,
    opens_at: "08:00",
    closes_at: "22:00",
    accepting_orders: true,
  });
  expect(await screen.findByText("Đã lưu hồ sơ quán.")).toBeTruthy();
});
it.each(["pending", "suspended"] as const)(
  "%s không bật nhận đơn nhưng vẫn sửa hồ sơ",
  async (status) => {
    vi.mocked(vendor.getVendorRestaurant).mockResolvedValue({
      ...pending,
      status,
    });
    mount();
    const checkbox = await screen.findByLabelText(
      "Bật nhận đơn khi quán trong giờ phục vụ",
    );
    expect(checkbox.matches(":disabled")).toBe(true);
    await userEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
    expect(vendor.updateVendorRestaurant).toHaveBeenCalledWith(
      expect.objectContaining({ accepting_orders: false }),
    );
  },
);
it("validation focus lỗi đầu, không gửi API", async () => {
  vi.mocked(vendor.getVendorRestaurant).mockRejectedValue(missing);
  mount();
  await userEvent.click(
    await screen.findByRole("button", { name: "Tạo quán và gửi duyệt" }),
  );
  expect(screen.getByText("Tên quán cần từ 1 đến 160 ký tự.")).toBeTruthy();
  await waitFor(() =>
    expect(document.activeElement).toBe(screen.getByLabelText("Tên quán")),
  );
  expect(vendor.createVendorRestaurant).not.toHaveBeenCalled();
});
it("lỗi GET không mở form mới; retry tải lại hồ sơ", async () => {
  vi.mocked(vendor.getVendorRestaurant)
    .mockRejectedValueOnce(new ApiError("Không tìm thấy API", 404, "HTTP_404"))
    .mockResolvedValueOnce(approved);
  mount();
  await userEvent.click(await screen.findByRole("button", { name: "Thử lại" }));
  expect(await screen.findByLabelText("Tên quán")).toBeTruthy();
  expect(vendor.createVendorRestaurant).not.toHaveBeenCalled();
});
it("PUT lỗi giữ dữ liệu và lỗi 422 theo trường", async () => {
  vi.mocked(vendor.updateVendorRestaurant).mockRejectedValue(
    new ApiError("Chưa hợp lệ", 422, "VALIDATION_ERROR", [
      { field: ["body", "name"] },
    ]),
  );
  mount();
  await userEvent.clear(await screen.findByLabelText("Tên quán"));
  await userEvent.type(screen.getByLabelText("Tên quán"), "Bếp khác");
  await userEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
  await screen.findByRole("alert");
  expect((screen.getByLabelText("Tên quán") as HTMLInputElement).value).toBe(
    "Bếp khác",
  );
  expect(screen.getByLabelText("Tên quán").getAttribute("aria-invalid")).toBe(
    "true",
  );
});
it("mất phản hồi tạo quán khóa POST cho tới khi kiểm tra hồ sơ", async () => {
  vi.mocked(vendor.getVendorRestaurant)
    .mockRejectedValueOnce(missing)
    .mockResolvedValueOnce(pending);
  vi.mocked(vendor.createVendorRestaurant).mockRejectedValue(
    new Error("offline"),
  );
  mount();
  await fillNew();
  await userEvent.click(
    screen.getByRole("button", { name: "Tạo quán và gửi duyệt" }),
  );
  await userEvent.click(
    await screen.findByRole("button", { name: "Kiểm tra hồ sơ đã tạo" }),
  );
  expect(
    await screen.findByRole("button", { name: "Lưu thay đổi" }),
  ).toBeTruthy();
  expect(vendor.createVendorRestaurant).toHaveBeenCalledTimes(1);
});
it("tài khoản đã liên kết dẫn tới GET, không tự tạo thêm", async () => {
  vi.mocked(vendor.getVendorRestaurant)
    .mockRejectedValueOnce(missing)
    .mockResolvedValueOnce(approved);
  vi.mocked(vendor.createVendorRestaurant).mockRejectedValue(
    new ApiError("Đã có quán", 409, "RESTAURANT_ALREADY_LINKED"),
  );
  mount();
  await fillNew();
  await userEvent.click(
    screen.getByRole("button", { name: "Tạo quán và gửi duyệt" }),
  );
  await userEvent.click(
    await screen.findByRole("button", { name: "Kiểm tra hồ sơ đã tạo" }),
  );
  expect(
    await screen.findByRole("link", { name: "Xem quán công khai ↗" }),
  ).toBeTruthy();
  expect(vendor.createVendorRestaurant).toHaveBeenCalledTimes(1);
});
it("kiểm tra duyệt không ghi đè chỉnh sửa và không tự bật nhận đơn", async () => {
  vi.mocked(vendor.getVendorRestaurant)
    .mockResolvedValueOnce(pending)
    .mockResolvedValueOnce({ ...approved, accepting_orders: false });
  mount();
  await userEvent.clear(await screen.findByLabelText("Tên quán"));
  await userEvent.type(screen.getByLabelText("Tên quán"), "Chỉnh sửa chưa lưu");
  await userEvent.click(
    screen.getByRole("button", { name: "Kiểm tra trạng thái duyệt" }),
  );
  expect(
    await screen.findByRole("heading", { name: "Đã được duyệt" }),
  ).toBeTruthy();
  expect((screen.getByLabelText("Tên quán") as HTMLInputElement).value).toBe(
    "Chỉnh sửa chưa lưu",
  );
  expect(
    (
      screen.getByLabelText(
        "Bật nhận đơn khi quán trong giờ phục vụ",
      ) as HTMLInputElement
    ).checked,
  ).toBe(false);
});
it("409 chưa được duyệt tắt nhận đơn và yêu cầu đọc lại trạng thái", async () => {
  vi.mocked(vendor.updateVendorRestaurant).mockRejectedValue(
    new ApiError("Chưa được duyệt", 409, "RESTAURANT_NOT_APPROVED"),
  );
  mount();
  await userEvent.click(
    await screen.findByRole("button", { name: "Lưu thay đổi" }),
  );
  expect(
    await screen.findByRole("heading", { name: "Cần kiểm tra lại trạng thái" }),
  ).toBeTruthy();
  expect(
    screen
      .getByLabelText("Bật nhận đơn khi quán trong giờ phục vụ")
      .matches(":disabled"),
  ).toBe(true);
});
it("khóa gửi lặp khi PUT chờ response", async () => {
  let finish!: (value: RestaurantDetail) => void;
  vi.mocked(vendor.updateVendorRestaurant).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  mount();
  await userEvent.click(
    await screen.findByRole("button", { name: "Lưu thay đổi" }),
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Đang lưu hồ sơ…" }),
  );
  expect(vendor.updateVendorRestaurant).toHaveBeenCalledTimes(1);
  await act(async () => finish(approved));
});
it.each(["customer", "admin"] as const)(
  "role %s không tải hồ sơ vendor",
  (role) => {
    mount({ ...auth, user: { ...auth.user!, role } });
    expect(
      screen.getByRole("heading", { name: "Trang này dành cho vai trò khác." }),
    ).toBeTruthy();
    expect(vendor.getVendorRestaurant).not.toHaveBeenCalled();
  },
);
it("guest tới login", () => {
  mount({ ...auth, user: null, status: "anonymous" });
  expect(
    screen.getByRole("heading", { name: "Chào mừng bạn trở lại" }),
  ).toBeTruthy();
});
it("đổi tài khoản không dùng hồ sơ cũ", async () => {
  const result = mount();
  await screen.findByLabelText("Tên quán");
  vi.mocked(vendor.getVendorRestaurant).mockRejectedValue(missing);
  result.rerender(tree({ ...auth, user: { ...auth.user!, id: 5 } }));
  await screen.findByRole("button", { name: "Tạo quán và gửi duyệt" });
  expect((screen.getByLabelText("Tên quán") as HTMLInputElement).value).toBe(
    "",
  );
});
it("response tạo không hợp lệ không báo đã lưu", async () => {
  vi.mocked(vendor.getVendorRestaurant).mockRejectedValue(missing);
  vi.mocked(vendor.createVendorRestaurant).mockResolvedValue(
    null as unknown as RestaurantDetail,
  );
  mount();
  await fillNew();
  await userEvent.click(
    screen.getByRole("button", { name: "Tạo quán và gửi duyệt" }),
  );
  expect(
    await screen.findByRole("button", { name: "Kiểm tra hồ sơ đã tạo" }),
  ).toBeTruthy();
  expect(screen.queryByText("Đã lưu hồ sơ. Quán đang chờ duyệt.")).toBeNull();
});
it.each(["0", "-1", "50.1", "Infinity", "1e2"])(
  "chặn bán kính %s",
  (radius) => {
    expect(
      validateVendorProfile({ ...profileFromRestaurant(approved), radius })
        .errors.radius,
    ).toBeTruthy();
  },
);
it("nhận biên tọa độ, bán kính 50 và giờ cả ngày/qua đêm", () => {
  expect(
    validateVendorProfile({
      ...profileFromRestaurant(approved),
      latitude: "-90",
      longitude: "180",
      radius: "50",
      opens: "00:00",
      closes: "00:00",
    }).payload,
  ).not.toBeNull();
  expect(
    validateVendorProfile({
      ...profileFromRestaurant(approved),
      opens: "22:00",
      closes: "06:00",
    }).payload,
  ).not.toBeNull();
});
it("chặn tên/địa chỉ/giờ vượt giới hạn hoặc thiếu", () => {
  const result = validateVendorProfile({
    ...emptyVendorProfile,
    name: "a".repeat(161),
    address: "a".repeat(501),
    opens: "25:00",
    closes: "8:00",
  });
  expect(result.errors.name).toBeTruthy();
  expect(result.errors.address).toBeTruthy();
  expect(result.errors.opens).toBeTruthy();
  expect(result.errors.closes).toBeTruthy();
  expect(result.payload).toBeNull();
});

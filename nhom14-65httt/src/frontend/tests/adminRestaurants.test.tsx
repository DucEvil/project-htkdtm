import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import AppRouter from "../src/router";
import { AuthContext, type AuthState } from "../src/contexts/authState";
import {
  listAdminRestaurants,
  approveAdminRestaurant,
  suspendAdminRestaurant,
} from "../src/api/admin";
import { restaurant } from "./fixtures/catalog";
import { safeReturnTo } from "../src/utils/auth";
vi.mock("../src/api/admin", () => ({
  listAdminRestaurants: vi.fn(),
  approveAdminRestaurant: vi.fn(),
  suspendAdminRestaurant: vi.fn(),
}));
it("approves after confirmation and rereads", async () => {
  vi.mocked(listAdminRestaurants)
    .mockResolvedValueOnce({
      ...page,
      items: [{ ...record, status: "pending" }],
    })
    .mockResolvedValue(page);
  vi.mocked(approveAdminRestaurant).mockResolvedValue(record);
  mount();
  await userEvent.click(
    await screen.findByRole("button", { name: "Duyệt quán Bếp Việt" }),
  );
  expect(approveAdminRestaurant).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole("button", { name: "Quay lại" }));
  expect(approveAdminRestaurant).not.toHaveBeenCalled();
  await userEvent.click(
    screen.getByRole("button", { name: "Duyệt quán Bếp Việt" }),
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Xác nhận thao tác" }),
  );
  await screen.findByText("Đã duyệt quán Bếp Việt.");
  expect(approveAdminRestaurant).toHaveBeenCalledExactlyOnceWith(3);
  expect(listAdminRestaurants).toHaveBeenCalledTimes(2);
});
it("failed suspension rereads without repeating mutation", async () => {
  vi.mocked(listAdminRestaurants)
    .mockResolvedValueOnce(page)
    .mockResolvedValue({
      ...page,
      items: [{ ...record, status: "suspended", accepting_orders: false }],
    });
  vi.mocked(suspendAdminRestaurant).mockRejectedValue(
    new Error("Mất phản hồi"),
  );
  mount();
  await userEvent.click(
    await screen.findByRole("button", { name: "Tạm ngừng quán Bếp Việt" }),
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Xác nhận thao tác" }),
  );
  await screen.findByRole("button", { name: "Duyệt quán Bếp Việt" });
  expect(suspendAdminRestaurant).toHaveBeenCalledExactlyOnceWith(3);
  expect(screen.queryByText("Đã tạm ngừng quán Bếp Việt.")).toBeNull();
});
const auth: AuthState = {
  user: {
    id: 1,
    full_name: "Quản trị",
    email: "admin@example.vn",
    role: "admin",
    is_simulated: false,
    created_at: "2026-11-27T00:00:00Z",
  },
  status: "authenticated",
  persisted: true,
  error: "",
  signIn: vi.fn(),
  signOut: vi.fn(),
  retry: vi.fn(),
};
const record = {
  ...restaurant,
  status: "approved" as const,
  is_simulated: false,
};
const page = { items: [record], offset: 0, limit: 12, total: 25 };
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
function mount(state = auth) {
  render(
    <AuthContext.Provider value={state}>
      <MemoryRouter initialEntries={["/admin/restaurants"]}>
        <AppRouter />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}
it("reads server availability and profile without public detail requests", async () => {
  vi.mocked(listAdminRestaurants).mockResolvedValue({
    ...page,
    items: [
      {
        ...record,
        accepting_orders: true,
        can_receive_orders: false,
        opens_at: "22:00",
        closes_at: "06:00",
      },
    ],
  });
  mount();
  await screen.findByRole("heading", { name: restaurant.name });
  expect(screen.getByText("Hiện chưa thể nhận đơn")).toBeTruthy();
  await userEvent.click(screen.getByText("Thông tin quán #3"));
  expect(screen.getByText("22:00–06:00 (qua đêm)")).toBeTruthy();
  expect(screen.getByText("Không gắn cờ mô phỏng")).toBeTruthy();
});
it("paginates by 12 and resets offset when filter changes", async () => {
  vi.mocked(listAdminRestaurants).mockResolvedValue(page);
  mount();
  await screen.findByText("25 quán phù hợp bộ lọc");
  await userEvent.click(screen.getByRole("button", { name: "Trang sau" }));
  await screen.findByText("Trang 2");
  expect(listAdminRestaurants).toHaveBeenLastCalledWith(
    { offset: 12, limit: 12, status: undefined },
    { signal: expect.any(AbortSignal) },
  );
  await userEvent.selectOptions(
    screen.getByLabelText("Trạng thái quán"),
    "pending",
  );
  await screen.findByText("Trang 1");
  expect(listAdminRestaurants).toHaveBeenLastCalledWith(
    { offset: 0, limit: 12, status: "pending" },
    { signal: expect.any(AbortSignal) },
  );
});
it("recovers from load error", async () => {
  vi.mocked(listAdminRestaurants)
    .mockRejectedValueOnce(new Error("Lỗi mạng"))
    .mockResolvedValueOnce({ ...page, total: 0, items: [] });
  mount();
  await screen.findByRole("alert");
  await userEvent.click(screen.getByRole("button", { name: "Thử lại" }));
  await screen.findByText("Chưa có quán phù hợp");
});
it.each(["vendor", "customer"] as const)("blocks %s", async (role) => {
  mount({ ...auth, user: { ...auth.user!, role } });
  await screen.findByText("Trang này dành cho vai trò khác.");
  expect(listAdminRestaurants).not.toHaveBeenCalled();
});
it("keeps a safe login return route", () => {
  expect(safeReturnTo("/admin/restaurants", "/")).toBe("/admin/restaurants");
  expect(safeReturnTo("https://other.example/admin/restaurants", "/")).toBe(
    "/",
  );
});

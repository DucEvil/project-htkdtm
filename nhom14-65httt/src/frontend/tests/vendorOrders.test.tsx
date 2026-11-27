import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import AppRouter from "../src/router";
import { AuthContext, type AuthState } from "../src/contexts/authState";
import * as vendor from "../src/api/vendor";
import { order } from "./fixtures/orders";
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

vi.mock("../src/api/vendor", () => ({
  listVendorOrders: vi.fn(),
  getVendorOrder: vi.fn(),
}));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
function mount(path = "/vendor/orders", state = auth) {
  render(
    <AuthContext.Provider value={state}>
      <MemoryRouter initialEntries={[path]}>
        <AppRouter />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}
it("lists snapshots and paginates without inventing totals", async () => {
  vi.mocked(vendor.listVendorOrders)
    .mockResolvedValueOnce(
      Array.from({ length: 11 }, (_, i) => ({ ...order, id: 77 + i })),
    )
    .mockResolvedValueOnce([]);
  mount();
  await screen.findByRole("link", { name: "Xem đơn 77" });
  expect(screen.queryByRole("link", { name: "Xem đơn 87" })).toBeNull();
  await userEvent.click(screen.getByRole("button", { name: "Trang sau" }));
  await screen.findByText("Trang này chưa có đơn");
  expect(vendor.listVendorOrders).toHaveBeenLastCalledWith(
    { offset: 10, limit: 11 },
    { signal: expect.any(AbortSignal) },
  );
});
it("reads private detail and refreshes server status", async () => {
  vi.mocked(vendor.getVendorOrder)
    .mockResolvedValueOnce(order)
    .mockResolvedValueOnce({ ...order, status: "cancelled" });
  mount("/vendor/orders/77");
  await screen.findByText("Phở bò lúc mua");
  expect(screen.getByText(order.delivery_address)).toBeTruthy();
  await userEvent.click(
    screen.getByRole("button", { name: "Cập nhật trạng thái" }),
  );
  await screen.findByText("Đã hủy");
});
it("invalid id never requests private detail", () => {
  mount("/vendor/orders/nope");
  expect(screen.getByText("Mã đơn không hợp lệ")).toBeTruthy();
  expect(vendor.getVendorOrder).not.toHaveBeenCalled();
});
it("customer cannot read vendor orders", async () => {
  mount("/vendor/orders", {
    ...auth,
    user: { ...auth.user!, role: "customer" },
  });
  await screen.findByText("Trang này dành cho vai trò khác.");
  expect(vendor.listVendorOrders).not.toHaveBeenCalled();
});
it("wrong response id cannot show another order", async () => {
  vi.mocked(vendor.getVendorOrder).mockResolvedValue({ ...order, id: 78 });
  mount("/vendor/orders/77");
  await screen.findByRole("alert");
  expect(screen.queryByText("Phở bò lúc mua")).toBeNull();
});

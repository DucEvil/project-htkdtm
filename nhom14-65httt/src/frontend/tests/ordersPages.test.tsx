import {
  act,
  cleanup,
  render,
  renderHook,
  screen,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { Link, MemoryRouter } from "react-router-dom";
import AppRouter from "../src/router";
import { AuthContext, type AuthState } from "../src/contexts/authState";
import { ApiError } from "../src/api/client";
import * as orders from "../src/api/orders";
import { useCustomerOrder } from "../src/hooks/useCustomerOrder";
import { safeReturnTo } from "../src/utils/auth";
import { order } from "./fixtures/orders";
import type { OrderDetail } from "../src/types/order";

vi.mock("../src/api/orders", () => ({
  getOrder: vi.fn(),
  cancelOrder: vi.fn(),
  listOrders: vi.fn(),
  createOrder: vi.fn(),
}));
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
});
beforeEach(() => {
  vi.mocked(orders.getOrder).mockReset().mockResolvedValue(order);
  vi.mocked(orders.listOrders).mockReset().mockResolvedValue([order]);
  vi.mocked(orders.cancelOrder)
    .mockReset()
    .mockResolvedValue({
      ...order,
      status: "cancelled",
      history: [
        ...order.history,
        {
          status: "cancelled",
          reason: null,
          created_at: "2026-11-27T03:05:00Z",
        },
      ],
    });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
const auth: AuthState = {
  user: {
    id: 1,
    full_name: "Khách",
    email: "khach@example.vn",
    role: "customer",
    is_simulated: false,
    created_at: order.created_at,
  },
  status: "authenticated",
  persisted: true,
  error: "",
  signIn: vi.fn(),
  signOut: vi.fn(),
  retry: vi.fn(),
};
function tree(path: string, state = auth) {
  return (
    <AuthContext.Provider value={state}>
      <MemoryRouter initialEntries={[path]}>
        <Link to="/orders/78">Đổi đơn thử nghiệm</Link>
        <AppRouter />
      </MemoryRouter>
    </AuthContext.Provider>
  );
}
function mount(path = "/orders/77", state = auth) {
  return render(tree(path, state));
}

it("danh sách hiển thị snapshot, tổng và liên kết chi tiết", async () => {
  mount("/orders");
  expect(await screen.findByText("Phở bò lúc mua × 2")).toBeTruthy();
  expect(
    screen.getByRole("link", { name: "Xem đơn 77" }).getAttribute("href"),
  ).toBe("/orders/77");
  expect(orders.listOrders).toHaveBeenCalledWith(
    { offset: 0, limit: 11 },
    expect.anything(),
  );
  await userEvent.click(screen.getByRole("link", { name: "Xem đơn 77" }));
  expect(
    await screen.findByRole("heading", { name: "Đơn #77", level: 1 }),
  ).toBeTruthy();
  expect(screen.getByText("Phở bò lúc mua")).toBeTruthy();
});
it("danh sách rỗng và lỗi/retry", async () => {
  vi.mocked(orders.listOrders)
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce([]);
  mount("/orders");
  await userEvent.click(await screen.findByRole("button", { name: "Thử lại" }));
  expect(
    await screen.findByRole("heading", { name: "Bạn chưa có đơn hàng" }),
  ).toBeTruthy();
});
it("danh sách dò món thứ 11 nhưng chỉ hiện 10 đơn, trang sau offset 10", async () => {
  vi.mocked(orders.listOrders)
    .mockResolvedValueOnce(
      Array.from({ length: 11 }, (_, index) => ({ ...order, id: 100 - index })),
    )
    .mockResolvedValueOnce([{ ...order, id: 90 }]);
  mount("/orders");
  await screen.findByRole("link", { name: "Xem đơn 91" });
  expect(screen.queryByRole("link", { name: "Xem đơn 90" })).toBeNull();
  await userEvent.click(screen.getByRole("button", { name: "Trang sau" }));
  expect(await screen.findByRole("link", { name: "Xem đơn 90" })).toBeTruthy();
  expect(orders.listOrders).toHaveBeenLastCalledWith(
    { offset: 10, limit: 11 },
    expect.anything(),
  );
});
it("hủy cần xác nhận và dùng response máy chủ", async () => {
  mount();
  await userEvent.click(
    await screen.findByRole("button", { name: "Hủy đơn hàng" }),
  );
  expect(orders.cancelOrder).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole("button", { name: "Giữ đơn hàng" }));
  expect(orders.cancelOrder).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole("button", { name: "Hủy đơn hàng" }));
  await userEvent.click(
    screen.getByRole("button", { name: "Xác nhận hủy đơn" }),
  );
  expect(await screen.findByText("Đã hủy đơn hàng.")).toBeTruthy();
  expect(orders.cancelOrder).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("button", { name: "Hủy đơn hàng" })).toBeNull();
});
it("409 hủy tải lại trạng thái mới từ quán, không tự hủy lại", async () => {
  vi.mocked(orders.cancelOrder).mockRejectedValue(
    new ApiError(
      "Trạng thái đơn đã thay đổi.",
      409,
      "INVALID_STATE_TRANSITION",
    ),
  );
  vi.mocked(orders.getOrder)
    .mockResolvedValueOnce(order)
    .mockResolvedValue({ ...order, status: "confirmed" });
  mount();
  await userEvent.click(
    await screen.findByRole("button", { name: "Hủy đơn hàng" }),
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Xác nhận hủy đơn" }),
  );
  expect(await screen.findByText("Quán đã nhận")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Hủy đơn hàng" })).toBeNull();
  expect(orders.cancelOrder).toHaveBeenCalledTimes(1);
});
it("lỗi hủy rồi lỗi tải lại giữ dữ liệu cũ nhưng khóa hủy", async () => {
  vi.mocked(orders.cancelOrder).mockRejectedValue(new Error("offline"));
  vi.mocked(orders.getOrder)
    .mockResolvedValueOnce(order)
    .mockRejectedValue(new Error("offline"));
  mount();
  await userEvent.click(
    await screen.findByRole("button", { name: "Hủy đơn hàng" }),
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Xác nhận hủy đơn" }),
  );
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(
    (screen.getByRole("button", { name: "Hủy đơn hàng" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  expect(screen.getByText("Phở bò lúc mua")).toBeTruthy();
});
it.each([
  "confirmed",
  "preparing",
  "delivering",
  "completed",
  "cancelled",
  "rejected",
] as const)("không có nút hủy cho %s", async (status) => {
  vi.mocked(orders.getOrder).mockResolvedValue({ ...order, status });
  mount();
  await screen.findByRole("heading", { name: "Đơn #77", level: 1 });
  expect(screen.queryByRole("button", { name: "Hủy đơn hàng" })).toBeNull();
});
it("từ chối có lịch sử và lý do từ server", async () => {
  vi.mocked(orders.getOrder).mockResolvedValue({
    ...order,
    status: "rejected",
    history: [
      ...order.history,
      {
        status: "rejected",
        reason: "Hết nguyên liệu",
        created_at: "2026-11-27T03:05:00Z",
      },
    ],
  });
  mount();
  expect(await screen.findByText("Lý do: Hết nguyên liệu")).toBeTruthy();
});
it("đơn 404 không lộ snapshot", async () => {
  vi.mocked(orders.getOrder).mockRejectedValue(
    new ApiError("", 404, "NOT_FOUND"),
  );
  mount();
  expect(
    await screen.findByRole("heading", { name: "Chưa tìm thấy đơn hàng" }),
  ).toBeTruthy();
  expect(screen.queryByText("Phở bò lúc mua")).toBeNull();
});
it("ID sai không gửi request", () => {
  mount("/orders/2147483648");
  expect(orders.getOrder).not.toHaveBeenCalled();
});
it.each(["vendor", "admin"] as const)("chặn role %s cho danh sách", (role) => {
  mount("/orders", { ...auth, user: { ...auth.user!, role } });
  expect(
    screen.getByRole("heading", { name: "Trang này dành cho vai trò khác." }),
  ).toBeTruthy();
  expect(orders.listOrders).not.toHaveBeenCalled();
});
it("guest tới login và returnTo chỉ nhận route đơn hợp lệ", () => {
  mount("/orders/77", { ...auth, user: null, status: "anonymous" });
  expect(
    screen.getByRole("heading", { name: "Chào mừng bạn trở lại" }),
  ).toBeTruthy();
  expect(safeReturnTo("/orders/77", "/account")).toBe("/orders/77");
  expect(safeReturnTo("/orders/../admin", "/account")).toBe("/account");
});
it("đổi đơn bỏ phản hồi cũ", async () => {
  let finish!: (value: OrderDetail) => void;
  vi.mocked(orders.getOrder)
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    )
    .mockResolvedValueOnce({ ...order, id: 78 });
  mount();
  await userEvent.click(
    screen.getByRole("link", { name: "Đổi đơn thử nghiệm" }),
  );
  expect(
    await screen.findByRole("heading", { name: "Đơn #78", level: 1 }),
  ).toBeTruthy();
  await act(async () => {
    finish(order);
  });
  expect(
    screen.queryByRole("heading", { name: "Đơn #77", level: 1 }),
  ).toBeNull();
  expect(vi.mocked(orders.getOrder).mock.calls[0][1]?.signal?.aborted).toBe(
    true,
  );
});
it("đổi tài khoản tải lại danh sách, không dùng dữ liệu tài khoản cũ", async () => {
  const result = mount("/orders");
  await screen.findByRole("link", { name: "Xem đơn 77" });
  vi.mocked(orders.listOrders).mockResolvedValue([]);
  result.rerender(tree("/orders", { ...auth, user: { ...auth.user!, id: 2 } }));
  expect(
    await screen.findByRole("heading", { name: "Bạn chưa có đơn hàng" }),
  ).toBeTruthy();
  expect(screen.queryByRole("link", { name: "Xem đơn 77" })).toBeNull();
});

it("poll 15 giây và dừng ở trạng thái cuối", async () => {
  vi.useFakeTimers();
  vi.mocked(orders.getOrder)
    .mockResolvedValueOnce(order)
    .mockResolvedValue({ ...order, status: "completed" });
  const hook = renderHook(() => useCustomerOrder(77));
  await act(async () => {});
  expect(hook.result.current.order?.status).toBe("pending");
  await act(async () => {
    await vi.advanceTimersByTimeAsync(15000);
  });
  expect(hook.result.current.order?.status).toBe("completed");
  await act(async () => {
    await vi.advanceTimersByTimeAsync(30000);
  });
  expect(orders.getOrder).toHaveBeenCalledTimes(2);
});
it("poll không chạy khi tab ẩn, cập nhật khi trở lại", async () => {
  vi.useFakeTimers();
  const visibility = vi
    .spyOn(document, "visibilityState", "get")
    .mockReturnValue("hidden");
  renderHook(() => useCustomerOrder(77));
  await act(async () => {});
  await act(async () => {
    await vi.advanceTimersByTimeAsync(15000);
  });
  expect(orders.getOrder).toHaveBeenCalledTimes(1);
  visibility.mockReturnValue("visible");
  await act(async () => {
    document.dispatchEvent(new Event("visibilitychange"));
  });
  expect(orders.getOrder).toHaveBeenCalledTimes(2);
});
it("khóa PATCH hủy gửi lặp trong lúc chờ", async () => {
  let finish!: (value: OrderDetail) => void;
  vi.mocked(orders.cancelOrder).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const hook = renderHook(() => useCustomerOrder(77));
  await act(async () => {});
  await act(async () => {
    void hook.result.current.cancel();
    void hook.result.current.cancel();
  });
  expect(orders.cancelOrder).toHaveBeenCalledTimes(1);
  expect(hook.result.current.order?.status).toBe("pending");
  await act(async () => {
    finish({ ...order, status: "cancelled" });
  });
  expect(hook.result.current.order?.status).toBe("cancelled");
});

it("GET đang chờ không ghi đè kết quả PATCH hủy", async () => {
  let finish!: (value: OrderDetail) => void;
  vi.mocked(orders.getOrder)
    .mockResolvedValueOnce(order)
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
  const hook = renderHook(() => useCustomerOrder(77));
  await act(async () => {});
  await act(async () => {
    void hook.result.current.refresh();
  });
  await act(async () => {
    await hook.result.current.cancel();
  });
  expect(hook.result.current.order?.status).toBe("cancelled");
  await act(async () => {
    finish(order);
  });
  expect(hook.result.current.order?.status).toBe("cancelled");
  expect(vi.mocked(orders.getOrder).mock.calls[1][1]?.signal?.aborted).toBe(
    true,
  );
});

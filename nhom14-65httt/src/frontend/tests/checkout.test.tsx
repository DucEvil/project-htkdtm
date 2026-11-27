import {
  act,
  cleanup,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import AppRouter from "../src/router";
import { AuthContext, type AuthState } from "../src/contexts/authState";
import { ApiError } from "../src/api/client";
import * as orders from "../src/api/orders";
import * as menu from "../src/api/menu";
import * as restaurants from "../src/api/restaurants";
import { useIdempotency } from "../src/hooks/useIdempotency";
import { checkoutDraft, type CheckoutDraft } from "../src/utils/checkout";
import type { OrderCreate, OrderDetail } from "../src/types/order";
import { dish, restaurant } from "./fixtures/catalog";
import { orderTime } from "../src/utils/orders";

vi.mock("../src/api/menu", () => ({
  getMenuItem: vi.fn(),
  getRestaurantMenu: vi.fn(),
}));
vi.mock("../src/api/restaurants", () => ({ getRestaurant: vi.fn() }));
vi.mock("../src/api/orders", () => ({
  createOrder: vi.fn(),
  listOrders: vi.fn(),
}));
let userId = 800;
const draft: CheckoutDraft = {
  restaurant_id: 3,
  items: [{ menu_item_id: 9, quantity: 1, expected_price: 35000 }],
  delivery_address: "Số 1 Hà Nội",
  latitude: 0,
  longitude: 0,
};
const receipt: OrderDetail = {
  id: 77,
  restaurant_id: 3,
  status: "pending",
  total: 35000,
  delivery_address: draft.delivery_address,
  latitude: 0,
  longitude: 0,
  created_at: "2026-11-27T03:00:00Z",
  items: [
    {
      menu_item_id: 9,
      quantity: 1,
      snapshot_price: 35000,
      snapshot_name: dish.name,
    },
  ],
  history: [],
};
beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  vi.mocked(menu.getMenuItem).mockReset().mockResolvedValue(dish);
  vi.mocked(menu.getRestaurantMenu).mockReset().mockResolvedValue([dish]);
  vi.mocked(restaurants.getRestaurant)
    .mockReset()
    .mockResolvedValue(restaurant);
  vi.mocked(orders.createOrder).mockReset().mockResolvedValue(receipt);
  vi.mocked(orders.listOrders).mockReset().mockResolvedValue([receipt]);
});
afterEach(cleanup);
function mount(
  path = "/menu-items/9",
  role: "customer" | "vendor" | "admin" | null = "customer",
) {
  const auth: AuthState = {
    user: role
      ? {
          id: ++userId,
          full_name: "Khách",
          email: "khach@example.vn",
          role,
          is_simulated: false,
          created_at: receipt.created_at,
        }
      : null,
    status: role ? "authenticated" : "anonymous",
    persisted: true,
    error: "",
    signIn: vi.fn(),
    signOut: vi.fn(),
    retry: vi.fn(),
  };
  return render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={[path]}>
        <AppRouter />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}
async function openForm() {
  mount();
  await userEvent.click(
    await screen.findByRole("button", { name: "Thêm vào giỏ" }),
  );
  await userEvent.click(screen.getByRole("link", { name: "Giỏ hàng (1)" }));
  await userEvent.click(
    screen.getByRole("link", { name: "Tiếp tục đặt hàng" }),
  );
}
async function fill() {
  await userEvent.type(screen.getByLabelText("Vĩ độ"), "0");
  await userEvent.type(screen.getByLabelText("Kinh độ"), "0");
  await userEvent.click(
    screen.getByRole("button", { name: "Dùng tọa độ này" }),
  );
  await userEvent.type(
    screen.getByLabelText("Địa chỉ đầy đủ"),
    draft.delivery_address,
  );
  await userEvent.click(screen.getByLabelText(/Tôi xác nhận địa chỉ/));
}

it("customer tạo đơn bằng tọa độ 0, chỉ xóa giỏ sau response thật", async () => {
  await openForm();
  await fill();
  await userEvent.click(screen.getByRole("button", { name: "Đặt đơn COD" }));
  expect(
    await screen.findByRole("heading", { name: "Đã ghi nhận đơn #77" }),
  ).toBeTruthy();
  expect(orders.createOrder).toHaveBeenCalledWith(
    expect.objectContaining(draft),
  );
  expect(screen.getByRole("link", { name: "Giỏ hàng" })).toBeTruthy();
  expect(screen.getByText("Chờ quán xác nhận")).toBeTruthy();
});
it("lỗi mạng giữ nguyên key/payload và giỏ cho lần thử lại", async () => {
  vi.mocked(orders.createOrder).mockRejectedValueOnce(new Error("offline"));
  await openForm();
  await fill();
  await userEvent.click(screen.getByRole("button", { name: "Đặt đơn COD" }));
  await userEvent.click(
    await screen.findByRole("button", { name: "Thử lại cùng đơn" }),
  );
  expect(
    await screen.findByRole("heading", { name: "Đã ghi nhận đơn #77" }),
  ).toBeTruthy();
  expect(vi.mocked(orders.createOrder).mock.calls[0][0]).toEqual(
    vi.mocked(orders.createOrder).mock.calls[1][0],
  );
});

it("HTTP thành công nhưng body không có đơn hợp lệ không xóa giỏ hoặc key", async () => {
  vi.mocked(orders.createOrder).mockResolvedValue(
    null as unknown as OrderDetail,
  );
  await openForm();
  await fill();
  await userEvent.click(screen.getByRole("button", { name: "Đặt đơn COD" }));
  expect(
    await screen.findByRole("button", { name: "Thử lại cùng đơn" }),
  ).toBeTruthy();
  expect(screen.getByRole("link", { name: "Giỏ hàng (1)" })).toBeTruthy();
  expect(
    screen.queryByRole("heading", { name: "Đã ghi nhận đơn #77" }),
  ).toBeNull();
});
it("khóa gửi lặp trong khi POST đang chờ", async () => {
  let finish!: (value: OrderDetail) => void;
  vi.mocked(orders.createOrder).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  await openForm();
  await fill();
  await userEvent.click(screen.getByRole("button", { name: "Đặt đơn COD" }));
  await userEvent.click(screen.getByRole("button", { name: "Đang gửi đơn…" }));
  expect(orders.createOrder).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("link", { name: "Giỏ hàng (1)" })).toBeTruthy();
  await act(async () => finish(receipt));
});
it("validation giữ địa chỉ và không gửi khi chưa xác nhận điểm giao", async () => {
  await openForm();
  await userEvent.type(screen.getByLabelText("Địa chỉ đầy đủ"), "abc");
  await userEvent.click(screen.getByRole("button", { name: "Đặt đơn COD" }));
  expect(screen.getByText("Địa chỉ giao cần từ 5 đến 500 ký tự.")).toBeTruthy();
  expect(
    (screen.getByLabelText("Địa chỉ đầy đủ") as HTMLTextAreaElement).value,
  ).toBe("abc");
  expect(orders.createOrder).not.toHaveBeenCalled();
});
it("lỗi phạm vi giao mở lại form giữ nguyên câu trả lời", async () => {
  vi.mocked(orders.createOrder).mockRejectedValue(
    new ApiError("Ngoài phạm vi giao.", 400, "OUTSIDE_DELIVERY_AREA"),
  );
  await openForm();
  await fill();
  await userEvent.click(screen.getByRole("button", { name: "Đặt đơn COD" }));
  await waitFor(() =>
    expect(
      (screen.getByLabelText("Địa chỉ đầy đủ") as HTMLTextAreaElement).value,
    ).toBe(draft.delivery_address),
  );
  expect(screen.getByRole("alert").textContent).toBe("Ngoài phạm vi giao.");
});
it("giá đổi cần xác nhận cập nhật và bấm gửi lại với giá mới", async () => {
  vi.mocked(orders.createOrder).mockRejectedValueOnce(
    new ApiError("Giá đã đổi.", 409, "ORDER_PRICE_CHANGED", {
      menu_item_id: 9,
      current_price: 40000,
    }),
  );
  await openForm();
  await fill();
  await userEvent.click(screen.getByRole("button", { name: "Đặt đơn COD" }));
  expect(
    await screen.findByRole("heading", { name: "Giá món đã thay đổi" }),
  ).toBeTruthy();
  expect(orders.createOrder).toHaveBeenCalledTimes(1);
  vi.mocked(menu.getMenuItem).mockResolvedValue({ ...dish, price: 40000 });
  await userEvent.click(
    screen.getByRole("button", { name: "Đồng ý cập nhật giá" }),
  );
  await userEvent.click(
    await screen.findByRole("button", { name: "Đặt đơn COD" }),
  );
  expect(
    vi.mocked(orders.createOrder).mock.calls[1][0].items[0].expected_price,
  ).toBe(40000);
});
it("key hết hạn không tự sinh key mới, cho kiểm tra đơn gần đây", async () => {
  vi.mocked(orders.createOrder).mockRejectedValue(
    new ApiError("Key hết hạn.", 409, "IDEMPOTENCY_EXPIRED"),
  );
  await openForm();
  await fill();
  await userEvent.click(screen.getByRole("button", { name: "Đặt đơn COD" }));
  await userEvent.click(
    await screen.findByRole("button", { name: "Kiểm tra các đơn gần đây" }),
  );
  expect(
    await screen.findByRole("heading", { name: "20 đơn gần nhất" }),
  ).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Thử lại cùng đơn" })).toBeNull();
  expect(orders.createOrder).toHaveBeenCalledTimes(1);
});
it("giỏ trống không hiển thị nút gửi đơn", () => {
  mount("/checkout");
  expect(
    screen.getByRole("heading", { name: "Chưa có món để đặt" }),
  ).toBeTruthy();
});
it.each(["vendor", "admin"] as const)("checkout chặn role %s", (role) => {
  mount("/checkout", role);
  expect(
    screen.getByRole("heading", { name: "Trang này dành cho vai trò khác." }),
  ).toBeTruthy();
});
it("checkout chuyển guest tới đăng nhập", () => {
  mount("/checkout", null);
  expect(
    screen.getByRole("heading", { name: "Chào mừng bạn trở lại" }),
  ).toBeTruthy();
});

it("intent khôi phục cùng payload/key qua remount, tách theo tài khoản", () => {
  const id = ++userId;
  const first = renderHook(() => useIdempotency(id));
  let payload!: OrderCreate;
  act(() => {
    payload = first.result.current.prepare(draft);
  });
  first.unmount();
  const next = renderHook(() => useIdempotency(id));
  expect(next.result.current.intent).toEqual(payload);
  act(() => {
    expect(
      next.result.current.prepare({
        ...draft,
        delivery_address: "Địa chỉ khác",
      }),
    ).toEqual(payload);
  });
  const other = renderHook(() => useIdempotency(++userId));
  expect(other.result.current.intent).toBeNull();
  act(() => next.result.current.release());
  expect(next.result.current.intent).toBeNull();
  expect(sessionStorage.getItem(`viviet.checkout.pending.v1.${id}`)).toBeNull();
});
it("khôi phục yêu cầu từ sessionStorage sau tải lại, localStorage chỉ có key", () => {
  const id = ++userId;
  const payload = {
    ...draft,
    session_id: "59738c0b-55c7-4423-b530-9fcabda63168",
    idempotency_key: "f03f7b22-54eb-4c08-9438-ba829b874da8",
  };
  sessionStorage.setItem(
    `viviet.checkout.pending.v1.${id}`,
    JSON.stringify({ userId: id, payload }),
  );
  const result = renderHook(() => useIdempotency(id));
  expect(result.result.current.intent).toEqual(payload);
  act(() => result.result.current.release());
  act(() => {
    result.result.current.prepare(draft);
  });
  expect(JSON.stringify(localStorage)).not.toContain(draft.delivery_address);
});
it("storage bị chặn vẫn giữ intent trong bộ nhớ và báo hạn chế", () => {
  const id = ++userId;
  const result = renderHook(() => useIdempotency(id));
  const blocked = vi
    .spyOn(Storage.prototype, "setItem")
    .mockImplementation(() => {
      throw new Error("blocked");
    });
  act(() => {
    result.result.current.prepare(draft);
  });
  expect(result.result.current.durable).toBe(false);
  expect(result.result.current.intent).not.toBeNull();
  blocked.mockRestore();
  act(() => result.result.current.release());
});
it("không nhận intent sai tài khoản trong storage", () => {
  const id = ++userId;
  sessionStorage.setItem(
    `viviet.checkout.pending.v1.${id}`,
    JSON.stringify({ userId: 1, payload: {} }),
  );
  expect(renderHook(() => useIdempotency(id)).result.current.intent).toBeNull();
});
it("draft địa chỉ được trim và không nhận tổng/snapshot từ giỏ", () => {
  const result = checkoutDraft(
    [{ ...dish, menu_item_id: dish.id, quantity: 2 }],
    "  Số 1 Hà Nội  ",
    { latitude: 0, longitude: 0, label: "Điểm giao" },
    true,
  );
  expect(result.payload).toEqual({
    ...draft,
    items: [{ menu_item_id: 9, quantity: 2, expected_price: 35000 }],
  });
});

it("thời gian đơn hiển thị theo Việt Nam, nhận cả UTC thiếu offset từ SQLite", () => {
  expect(orderTime("2026-11-27T03:00:00")).toBe(
    orderTime("2026-11-27T03:00:00Z"),
  );
  expect(orderTime("2026-11-27T03:00:00Z")).toContain("10:00");
  expect(orderTime("invalid")).toBe("Chưa có thời gian");
});

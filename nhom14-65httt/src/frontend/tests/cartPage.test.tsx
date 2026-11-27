import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import AppRouter from "../src/router";
import { AuthContext, type AuthState } from "../src/contexts/authState";
import { CartProvider } from "../src/contexts/CartContext";
import { useCart } from "../src/hooks/useCart";
import * as menu from "../src/api/menu";
import * as restaurants from "../src/api/restaurants";
import { dish, restaurant } from "./fixtures/catalog";

vi.mock("../src/api/menu", () => ({
  getMenuItem: vi.fn(),
  getRestaurantMenu: vi.fn(),
}));
vi.mock("../src/api/restaurants", () => ({ getRestaurant: vi.fn() }));
const anonymous: AuthState = {
  user: null,
  status: "anonymous",
  error: "",
  persisted: true,
  signIn: vi.fn(),
  signOut: vi.fn(),
  retry: vi.fn(),
};
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
});
beforeEach(() => {
  vi.mocked(menu.getMenuItem).mockReset().mockResolvedValue(dish);
  vi.mocked(menu.getRestaurantMenu).mockReset().mockResolvedValue([dish]);
  vi.mocked(restaurants.getRestaurant)
    .mockReset()
    .mockResolvedValue(restaurant);
  vi.spyOn(HTMLDialogElement.prototype, "showModal").mockImplementation(
    function (this: HTMLDialogElement) {
      this.open = true;
    },
  );
  vi.spyOn(HTMLDialogElement.prototype, "close").mockImplementation(function (
    this: HTMLDialogElement,
  ) {
    this.open = false;
  });
});
afterEach(cleanup);
function mount(path = "/menu-items/9", auth = anonymous) {
  return render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={[path]}>
        <AppRouter />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}
it("giỏ rỗng có link tìm món", () => {
  mount("/cart");
  expect(
    screen.getByRole("heading", { name: "Giỏ hàng đang trống" }),
  ).toBeTruthy();
  expect(
    screen.getByRole("link", { name: "Tìm món gần bạn" }).getAttribute("href"),
  ).toBe("/search");
});
it("thêm món, đổi số lượng và xóa món cuối qua trang giỏ", async () => {
  mount();
  await userEvent.click(
    await screen.findByRole("button", { name: "Thêm vào giỏ" }),
  );
  await userEvent.click(screen.getByRole("link", { name: "Xem giỏ hàng (1)" }));
  await userEvent.click(
    screen.getByRole("button", { name: `Tăng số lượng ${dish.name}` }),
  );
  expect(screen.getByRole("link", { name: "Giỏ hàng (2)" })).toBeTruthy();
  expect(screen.getAllByText(/70.000/)).toHaveLength(2);
  await userEvent.click(
    screen.getByRole("button", { name: `Xóa món ${dish.name}` }),
  );
  expect(
    screen.getByRole("heading", { name: "Giỏ hàng đang trống" }),
  ).toBeTruthy();
});
it("quán không nhận đơn không cho thêm món", async () => {
  vi.mocked(restaurants.getRestaurant).mockResolvedValue({
    ...restaurant,
    is_open: false,
    can_receive_orders: false,
  });
  mount();
  expect(
    (
      (await screen.findByRole("button", {
        name: "Thêm vào giỏ",
      })) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
});
it("tài khoản vendor không thêm món như customer", async () => {
  mount("/menu-items/9", {
    ...anonymous,
    status: "authenticated",
    user: {
      id: 2,
      full_name: "Chủ quán",
      email: "vendor@example.vn",
      role: "vendor",
      is_simulated: false,
      created_at: "2026-11-27T03:00:00Z",
    },
  });
  expect(
    (
      (await screen.findByRole("button", {
        name: "Thêm vào giỏ",
      })) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
});

function Harness() {
  const cart = useCart();
  const product = {
    menu_item_id: 9,
    restaurant_id: 3,
    restaurant_name: "Bếp Việt",
    name: "Phở",
    price: 35000,
  };
  return (
    <>
      <button onClick={() => cart.add(product, 1)}>Quán một</button>
      <button
        onClick={() =>
          cart.add(
            {
              ...product,
              menu_item_id: 10,
              restaurant_id: 4,
              restaurant_name: "Bếp mới",
            },
            2,
          )
        }
      >
        Quán hai
      </button>
      <output aria-label="Quán trong giỏ">
        {cart.items[0]?.restaurant_name ?? "Trống"}
      </output>
    </>
  );
}
function harness(auth: AuthState) {
  return (
    <AuthContext.Provider value={auth}>
      <CartProvider>
        <Harness />
      </CartProvider>
    </AuthContext.Provider>
  );
}
it("đổi quán yêu cầu xác nhận và hủy giữ giỏ cũ", async () => {
  render(harness(anonymous));
  await userEvent.click(screen.getByRole("button", { name: "Quán một" }));
  await userEvent.click(screen.getByRole("button", { name: "Quán hai" }));
  expect(
    screen.getByRole("dialog", { name: "Đổi sang quán khác?" }),
  ).toBeTruthy();
  await userEvent.click(
    screen.getByRole("button", { name: "Giữ giỏ hiện tại" }),
  );
  expect(screen.getByLabelText("Quán trong giỏ").textContent).toBe("Bếp Việt");
  await userEvent.click(screen.getByRole("button", { name: "Quán hai" }));
  await userEvent.click(
    screen.getByRole("button", { name: "Đổi quán và thêm món" }),
  );
  expect(screen.getByLabelText("Quán trong giỏ").textContent).toBe("Bếp mới");
});
it("guest đăng nhập giữ giỏ, khôi phục phiên giữ giỏ, đăng xuất xóa giỏ", async () => {
  const result = render(harness(anonymous));
  await userEvent.click(screen.getByRole("button", { name: "Quán một" }));
  const authenticated: AuthState = {
    ...anonymous,
    status: "authenticated",
    user: {
      id: 1,
      full_name: "Khách",
      email: "khach@example.vn",
      role: "customer",
      is_simulated: false,
      created_at: "2026-11-27T03:00:00Z",
    },
  };
  result.rerender(harness(authenticated));
  expect(screen.getByLabelText("Quán trong giỏ").textContent).toBe("Bếp Việt");
  result.rerender(harness({ ...anonymous, status: "loading" }));
  expect(screen.getByLabelText("Quán trong giỏ").textContent).toBe("Bếp Việt");
  result.rerender(harness(authenticated));
  expect(screen.getByLabelText("Quán trong giỏ").textContent).toBe("Bếp Việt");
  result.rerender(harness(anonymous));
  expect(screen.getByLabelText("Quán trong giỏ").textContent).toBe("Trống");
});

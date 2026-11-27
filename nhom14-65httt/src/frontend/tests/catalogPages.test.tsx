import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Link, MemoryRouter } from "react-router-dom";
import AppRouter from "../src/router";
import { AuthContext, type AuthState } from "../src/contexts/authState";
import { ApiError } from "../src/api/client";
import * as menu from "../src/api/menu";
import * as restaurants from "../src/api/restaurants";
import { dish, restaurant } from "./fixtures/catalog";
import type { MenuItemPublic } from "../src/types/menu";

vi.mock("../src/api/menu", () => ({
  getMenuItem: vi.fn(),
  getRestaurantMenu: vi.fn(),
}));
vi.mock("../src/api/restaurants", () => ({ getRestaurant: vi.fn() }));
function mount(path = "/restaurants/3") {
  const auth: AuthState = {
    user: null,
    status: "anonymous",
    error: "",
    persisted: true,
    signIn: vi.fn(),
    signOut: vi.fn(),
    retry: vi.fn(),
  };
  return render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={[path]}>
        <Link to="/menu-items/10">Đổi món thử nghiệm</Link>
        <AppRouter />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}
beforeEach(() => {
  vi.mocked(menu.getMenuItem).mockReset().mockResolvedValue(dish);
  vi.mocked(menu.getRestaurantMenu).mockReset().mockResolvedValue([dish]);
  vi.mocked(restaurants.getRestaurant)
    .mockReset()
    .mockResolvedValue(restaurant);
});
afterEach(cleanup);

it("hiển thị quán và thực đơn công khai, đọc thêm một món để xác định trang sau", async () => {
  mount();
  expect(
    await screen.findByRole("heading", { name: "Bếp Việt", level: 1 }),
  ).toBeTruthy();
  expect(
    await screen.findByRole("link", { name: "Xem món Phở bò tái" }),
  ).toBeTruthy();
  expect(menu.getRestaurantMenu).toHaveBeenCalledWith(
    3,
    { offset: 0, limit: 13 },
    expect.objectContaining({ signal: expect.any(AbortSignal) }),
  );
  expect(screen.getByText("Đang nhận đơn")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Trang sau" })).toBeNull();
});

it("trang sau dùng offset 12, không hiển thị món dùng để dò trang", async () => {
  vi.mocked(menu.getRestaurantMenu)
    .mockResolvedValueOnce(
      Array.from({ length: 13 }, (_, index) => ({
        ...dish,
        id: index + 1,
        name: `Món ${index + 1}`,
      })),
    )
    .mockResolvedValueOnce([{ ...dish, id: 13, name: "Món 13" }]);
  mount();
  await screen.findByRole("link", { name: "Xem món Món 12" });
  expect(screen.queryByRole("link", { name: "Xem món Món 13" })).toBeNull();
  await userEvent.click(screen.getByRole("button", { name: "Trang sau" }));
  expect(
    await screen.findByRole("link", { name: "Xem món Món 13" }),
  ).toBeTruthy();
  expect(menu.getRestaurantMenu).toHaveBeenLastCalledWith(
    3,
    { offset: 12, limit: 13 },
    expect.anything(),
  );
  expect(
    (screen.getByRole("button", { name: "Trang sau" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
});

it("thực đơn rỗng có thông báo riêng", async () => {
  vi.mocked(menu.getRestaurantMenu).mockResolvedValue([]);
  mount();
  expect(
    await screen.findByRole("heading", { name: "Quán chưa có món đang bán" }),
  ).toBeTruthy();
});

it("lỗi thực đơn vẫn giữ hồ sơ quán và cho thử lại", async () => {
  vi.mocked(menu.getRestaurantMenu).mockRejectedValueOnce(new Error("offline"));
  mount();
  await userEvent.click(await screen.findByRole("button", { name: "Thử lại" }));
  expect(
    screen.getByRole("heading", { name: "Bếp Việt", level: 1 }),
  ).toBeTruthy();
  expect(
    await screen.findByRole("link", { name: "Xem món Phở bò tái" }),
  ).toBeTruthy();
  expect(restaurants.getRestaurant).toHaveBeenCalledTimes(1);
});

it("quán 404 không tải thực đơn hoặc tự thử lại", async () => {
  vi.mocked(restaurants.getRestaurant).mockRejectedValue(
    new ApiError("", 404, "NOT_FOUND"),
  );
  mount();
  expect(
    await screen.findByRole("heading", { name: "Chưa tìm thấy quán" }),
  ).toBeTruthy();
  expect(menu.getRestaurantMenu).not.toHaveBeenCalled();
  expect(screen.queryByRole("button", { name: "Thử lại" })).toBeNull();
});

it.each(["0", "-1", "1.2", "abc", "2147483648"])(
  "ID %s sai không gửi API ở cả hai route",
  async (id) => {
    const first = mount(`/restaurants/${id}`);
    expect(
      await screen.findByRole("heading", { name: "Chưa tìm thấy quán" }),
    ).toBeTruthy();
    first.unmount();
    mount(`/menu-items/${id}`);
    expect(
      await screen.findByRole("heading", { name: "Chưa tìm thấy món" }),
    ).toBeTruthy();
    expect(menu.getMenuItem).not.toHaveBeenCalled();
    expect(restaurants.getRestaurant).not.toHaveBeenCalled();
  },
);

it("từ thực đơn mở món rồi về quán", async () => {
  mount();
  await userEvent.click(
    await screen.findByRole("link", { name: "Xem món Phở bò tái" }),
  );
  expect(
    await screen.findByRole("heading", { name: dish.name, level: 1 }),
  ).toBeTruthy();
  await userEvent.click(
    screen.getByRole("link", { name: "Xem thực đơn quán" }),
  );
  expect(
    await screen.findByRole("heading", { name: restaurant.name, level: 1 }),
  ).toBeTruthy();
});

it("chi tiết tách nguyên liệu thực tế và đặc trưng món chuẩn", async () => {
  mount("/menu-items/9");
  expect(
    await screen.findByRole("heading", { name: dish.name, level: 1 }),
  ).toBeTruthy();
  expect(screen.getByText("bò, hành")).toBeTruthy();
  expect(screen.getByText("bánh phở, quế")).toBeTruthy();
  expect(screen.getByText("Ít cay")).toBeTruthy();
  expect(screen.getByText(/không bảo đảm an toàn với dị ứng/)).toBeTruthy();
  expect(restaurants.getRestaurant).toHaveBeenCalledWith(3, expect.anything());
});

it("món chưa công khai trả 404, không tải quán", async () => {
  vi.mocked(menu.getMenuItem).mockRejectedValue(
    new ApiError("", 404, "NOT_FOUND"),
  );
  mount("/menu-items/9");
  expect(
    await screen.findByRole("heading", { name: "Chưa tìm thấy món" }),
  ).toBeTruthy();
  expect(restaurants.getRestaurant).not.toHaveBeenCalled();
});

it("lỗi tải quán của món cho phép thử lại toàn bộ chi tiết", async () => {
  vi.mocked(restaurants.getRestaurant).mockRejectedValueOnce(
    new Error("offline"),
  );
  mount("/menu-items/9");
  await userEvent.click(await screen.findByRole("button", { name: "Thử lại" }));
  expect(
    await screen.findByRole("heading", { name: dish.name, level: 1 }),
  ).toBeTruthy();
});

it("thiếu nguyên liệu thực tế không dùng nguyên liệu món chuẩn để thay thế", async () => {
  vi.mocked(menu.getMenuItem).mockResolvedValue({
    ...dish,
    ingredients: [],
    ingredients_verified: false,
  });
  mount("/menu-items/9");
  expect(
    await screen.findByText("Quán chưa khai báo nguyên liệu thực tế."),
  ).toBeTruthy();
  expect(
    screen.getByText("Danh sách nguyên liệu chưa được quán xác nhận."),
  ).toBeTruthy();
});

it("đổi ID bỏ yêu cầu cũ và không tải quán cho món cũ", async () => {
  let finish!: (value: MenuItemPublic) => void;
  vi.mocked(menu.getMenuItem)
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    )
    .mockResolvedValueOnce({ ...dish, id: 10, name: "Món mới" });
  mount("/menu-items/9");
  expect(screen.getByRole("status").textContent).toContain("Đang tải");
  await userEvent.click(
    screen.getByRole("link", { name: "Đổi món thử nghiệm" }),
  );
  expect(
    await screen.findByRole("heading", { name: "Món mới", level: 1 }),
  ).toBeTruthy();
  await act(async () => {
    finish(dish);
  });
  expect(
    screen.queryByRole("heading", { name: dish.name, level: 1 }),
  ).toBeNull();
  await waitFor(() =>
    expect(restaurants.getRestaurant).toHaveBeenCalledTimes(1),
  );
  expect(vi.mocked(menu.getMenuItem).mock.calls[0][1]?.signal?.aborted).toBe(
    true,
  );
});

it.each([
  {
    opens_at: "22:00",
    closes_at: "06:00",
    is_open: false,
    accepting_orders: true,
    can_receive_orders: false,
    expected: "Đang đóng cửa",
    hours: "22:00 – 06:00 (qua đêm)",
  },
  {
    opens_at: "00:00",
    closes_at: "00:00",
    is_open: true,
    accepting_orders: false,
    can_receive_orders: false,
    expected: "Đang tạm ngừng nhận đơn",
    hours: "Cả ngày",
  },
])(
  "giờ và trạng thái quán $expected",
  async ({ expected, hours, ...fields }) => {
    vi.mocked(restaurants.getRestaurant).mockResolvedValue({
      ...restaurant,
      ...fields,
    });
    mount();
    expect(await screen.findByText(expected)).toBeTruthy();
    expect(screen.getByText(hours)).toBeTruthy();
  },
);

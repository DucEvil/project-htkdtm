import { cleanup, render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import AppRouter from "../src/router";
import { AuthContext, type AuthState } from "../src/contexts/authState";
import * as search from "../src/api/search";
import type {
  DishSearchResult,
  RestaurantSearchResult,
} from "../src/types/search";
import type { Page } from "../src/types/common";
import { parseCoordinates } from "../src/utils/locationValidation";

vi.mock("../src/api/search", () => ({
  searchDishes: vi.fn(),
  searchRestaurants: vi.fn(),
}));
const restaurant: RestaurantSearchResult = {
  id: 3,
  name: "Bếp Việt",
  address: "Số 1",
  latitude: 0,
  longitude: 0,
  delivery_radius_km: 5,
  opens_at: "08:00",
  closes_at: "22:00",
  accepting_orders: true,
  is_open: true,
  can_receive_orders: true,
  distance_km: 1.25,
};
const dish: DishSearchResult = {
  id: 9,
  name: "Phở bò",
  restaurant_id: 3,
  restaurant_name: restaurant.name,
  canonical_dish_id: 2,
  price: 35000,
  is_available: true,
  ingredients_verified: false,
  ingredients: [],
  canonical_dish: {
    id: 2,
    name: "Phở",
    region: "Bắc",
    method: "Nấu",
    spice_level: 0,
    ingredients: [],
    labels: [],
  },
  distance_km: 1.25,
  restaurant,
};
const page = <T,>(items: T[], total = items.length, offset = 0): Page<T> => ({
  items,
  total,
  offset,
  limit: 12,
});
const geoDescriptor = Object.getOwnPropertyDescriptor(navigator, "geolocation");
function mount() {
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
      <MemoryRouter initialEntries={["/search"]}>
        <AppRouter />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}
async function choose(latitude = "0", longitude = "0") {
  await userEvent.clear(screen.getByLabelText("Vĩ độ"));
  await userEvent.type(screen.getByLabelText("Vĩ độ"), latitude);
  await userEvent.clear(screen.getByLabelText("Kinh độ"));
  await userEvent.type(screen.getByLabelText("Kinh độ"), longitude);
  await userEvent.click(
    screen.getByRole("button", { name: "Dùng tọa độ này" }),
  );
}
beforeEach(() => {
  vi.mocked(search.searchDishes)
    .mockReset()
    .mockResolvedValue(page([dish]));
  vi.mocked(search.searchRestaurants)
    .mockReset()
    .mockResolvedValue(page([restaurant]));
});
afterEach(() => {
  cleanup();
  if (geoDescriptor)
    Object.defineProperty(navigator, "geolocation", geoDescriptor);
  else Reflect.deleteProperty(navigator, "geolocation");
});

it("không tự định vị/tìm kiếm, báo thiếu vị trí", async () => {
  const locate = vi.fn();
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: { getCurrentPosition: locate },
  });
  mount();
  await userEvent.click(screen.getByRole("button", { name: "Tìm kiếm" }));
  expect(screen.getByRole("alert").textContent).toContain("chọn vị trí");
  expect(locate).not.toHaveBeenCalled();
  expect(search.searchDishes).not.toHaveBeenCalled();
});

it("nhận tọa độ 0, gọi API công khai và hiển thị tiền/khoảng cách/nguyên liệu", async () => {
  mount();
  await choose();
  expect(await screen.findByRole("heading", { name: "Phở bò" })).toBeTruthy();
  expect(search.searchDishes).toHaveBeenCalledWith(
    { lat: 0, lng: 0, q: "", radius: 5, offset: 0, limit: 12 },
    expect.objectContaining({ signal: expect.any(AbortSignal) }),
  );
  expect(screen.getByText(/35.000/)).toBeTruthy();
  expect(screen.getByText("1,25 km")).toBeTruthy();
  await userEvent.click(screen.getByText("Thông tin nguyên liệu"));
  expect(screen.getByText("Quán chưa khai báo nguyên liệu.")).toBeTruthy();
});

it("tìm theo từ khóa/radius rồi đổi chế độ quán", async () => {
  mount();
  await choose();
  await userEvent.type(screen.getByLabelText("Bạn muốn tìm gì?"), " phở ");
  await userEvent.selectOptions(screen.getByLabelText("Trong bán kính"), "10");
  await userEvent.click(screen.getByRole("button", { name: "Tìm kiếm" }));
  await waitFor(() =>
    expect(search.searchDishes).toHaveBeenLastCalledWith(
      expect.objectContaining({ q: "phở", radius: 10, offset: 0 }),
      expect.anything(),
    ),
  );
  await userEvent.click(screen.getByRole("button", { name: "Quán ăn" }));
  expect(await screen.findByRole("heading", { name: "Bếp Việt" })).toBeTruthy();
  expect(search.searchRestaurants).toHaveBeenCalledWith(
    expect.objectContaining({ q: "phở", radius: 10, offset: 0 }),
    expect.anything(),
  );
});

it("phân trang theo total, về trang đầu khi đổi vị trí", async () => {
  vi.mocked(search.searchDishes).mockImplementation(async (params) =>
    page([dish], 25, params.offset),
  );
  mount();
  await choose();
  await userEvent.click(
    await screen.findByRole("button", { name: "Trang sau" }),
  );
  await waitFor(() =>
    expect(search.searchDishes).toHaveBeenLastCalledWith(
      expect.objectContaining({ offset: 12 }),
      expect.anything(),
    ),
  );
  await userEvent.click(screen.getByText("Nhập tọa độ thủ công"));
  await choose("21", "105");
  await waitFor(() =>
    expect(search.searchDishes).toHaveBeenLastCalledWith(
      expect.objectContaining({ lat: 21, lng: 105, offset: 0 }),
      expect.anything(),
    ),
  );
});

it("kết quả rỗng không tự nới phạm vi", async () => {
  vi.mocked(search.searchDishes).mockResolvedValue(page([]));
  mount();
  await choose();
  expect(
    await screen.findByRole("heading", { name: "Chưa có kết quả phù hợp" }),
  ).toBeTruthy();
  expect(search.searchDishes).toHaveBeenCalledTimes(1);
});

it("lỗi mạng có thử lại", async () => {
  vi.mocked(search.searchDishes).mockRejectedValueOnce(new Error("offline"));
  mount();
  await choose();
  await userEvent.click(await screen.findByRole("button", { name: "Thử lại" }));
  expect(await screen.findByRole("heading", { name: "Phở bò" })).toBeTruthy();
});

it("bỏ phản hồi cũ khi từ khóa mới đã trả về", async () => {
  let finish!: (result: Page<DishSearchResult>) => void;
  vi.mocked(search.searchDishes).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  mount();
  await choose();
  expect(screen.getByText("Đang tìm những lựa chọn gần bạn…")).toBeTruthy();
  await userEvent.type(screen.getByLabelText("Bạn muốn tìm gì?"), "cơm");
  await userEvent.click(screen.getByRole("button", { name: "Tìm kiếm" }));
  expect(await screen.findByRole("heading", { name: "Phở bò" })).toBeTruthy();
  await act(async () => {
    finish(page([{ ...dish, name: "Kết quả cũ" }]));
  });
  expect(screen.queryByRole("heading", { name: "Kết quả cũ" })).toBeNull();
  expect(vi.mocked(search.searchDishes).mock.calls[0][1]?.signal?.aborted).toBe(
    true,
  );
});

it("xóa vị trí xóa kết quả và tọa độ nhập", async () => {
  mount();
  await choose();
  await screen.findByRole("heading", { name: "Phở bò" });
  await userEvent.click(screen.getByRole("button", { name: "Xóa vị trí" }));
  expect(screen.queryByRole("heading", { name: "Phở bò" })).toBeNull();
  expect((screen.getByLabelText("Vĩ độ") as HTMLInputElement).value).toBe("");
});

it("từ chối định vị vẫn cho dùng tọa độ thủ công", async () => {
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: {
      getCurrentPosition: (
        _ok: PositionCallback,
        fail: PositionErrorCallback,
      ) => fail({ code: 1 } as GeolocationPositionError),
    },
  });
  mount();
  await userEvent.click(
    screen.getByRole("button", { name: "Dùng vị trí hiện tại" }),
  );
  expect(screen.getByRole("alert").textContent).toContain("chưa cấp quyền");
  await choose();
  expect(await screen.findByRole("heading", { name: "Phở bò" })).toBeTruthy();
});

it("định vị trả chậm không ghi đè tọa độ nhập sau đó", async () => {
  let callback!: PositionCallback;
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: {
      getCurrentPosition: (ok: PositionCallback) => {
        callback = ok;
      },
    },
  });
  mount();
  await userEvent.click(
    screen.getByRole("button", { name: "Dùng vị trí hiện tại" }),
  );
  await choose();
  await act(async () =>
    callback({
      coords: { latitude: 30, longitude: 100 },
    } as GeolocationPosition),
  );
  expect(search.searchDishes).toHaveBeenLastCalledWith(
    expect.objectContaining({ lat: 0, lng: 0 }),
    expect.anything(),
  );
});

it("giữ trạng thái quán đóng cửa trong kết quả", async () => {
  vi.mocked(search.searchRestaurants).mockResolvedValue(
    page([{ ...restaurant, is_open: false, can_receive_orders: false }]),
  );
  mount();
  await choose();
  await userEvent.click(screen.getByRole("button", { name: "Quán ăn" }));
  expect(await screen.findByText("Đang đóng cửa")).toBeTruthy();
});

it("tọa độ lỗi focus trường tương ứng và không gửi API", async () => {
  mount();
  await choose("91", "180");
  expect(document.activeElement).toBe(screen.getByLabelText("Vĩ độ"));
  expect(search.searchDishes).not.toHaveBeenCalled();
});

it.each(["", " ", "NaN", "Infinity", "0x10", "91", "-91"])(
  "chặn vĩ độ %j",
  (value) => {
    expect(parseCoordinates(value, "0").point).toBeNull();
  },
);
it.each(["", "181", "-181"])("chặn kinh độ %j", (value) => {
  expect(parseCoordinates("0", value).point).toBeNull();
});
it("nhận hai biên tọa độ", () => {
  expect(parseCoordinates("-90", "180").point).toEqual({
    latitude: -90,
    longitude: 180,
  });
});

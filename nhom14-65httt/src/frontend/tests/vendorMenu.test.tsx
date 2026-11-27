import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import AppRouter from "../src/router";
import { AuthContext, type AuthState } from "../src/contexts/authState";
import { ApiError } from "../src/api/client";
import * as vendor from "../src/api/vendor";
import * as catalog from "../src/api/menu";
import {
  emptyVendorMenu,
  menuFormFromItem,
  validateVendorMenu,
} from "../src/utils/vendorMenuValidation";
import { safeReturnTo } from "../src/utils/auth";
import { dish, restaurant } from "./fixtures/catalog";
import type { MenuItemDetail } from "../src/types/menu";

vi.mock("../src/api/vendor", () => ({
  getVendorRestaurant: vi.fn(),
  listVendorMenuItems: vi.fn(),
  getVendorMenuItem: vi.fn(),
  createVendorMenuItem: vi.fn(),
  updateVendorMenuItem: vi.fn(),
  stopSellingVendorMenuItem: vi.fn(),
}));
vi.mock("../src/api/menu", () => ({
  listCanonicalDishes: vi.fn(),
  listIngredients: vi.fn(),
}));
const item: MenuItemDetail = { ...dish, is_simulated: false };
const profile = {
  ...restaurant,
  status: "approved" as const,
  is_simulated: false,
};
const page = <T,>(
  items: T[],
  total = items.length,
  offset = 0,
  limit = 12,
) => ({ items, total, offset, limit });
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
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
});
beforeEach(() => {
  vi.mocked(vendor.getVendorRestaurant).mockReset().mockResolvedValue(profile);
  vi.mocked(vendor.listVendorMenuItems)
    .mockReset()
    .mockResolvedValue(page([item]));
  vi.mocked(vendor.getVendorMenuItem).mockReset().mockResolvedValue(item);
  vi.mocked(vendor.createVendorMenuItem).mockReset().mockResolvedValue(item);
  vi.mocked(vendor.updateVendorMenuItem).mockReset().mockResolvedValue(item);
  vi.mocked(vendor.stopSellingVendorMenuItem)
    .mockReset()
    .mockResolvedValue(undefined);
  vi.mocked(catalog.listCanonicalDishes)
    .mockReset()
    .mockResolvedValue(page([dish.canonical_dish], 1, 0, 10));
  vi.mocked(catalog.listIngredients)
    .mockReset()
    .mockResolvedValue(page(dish.ingredients, 2, 0, 10));
});
afterEach(cleanup);
function tree(path: string, state = auth) {
  return (
    <AuthContext.Provider value={state}>
      <MemoryRouter initialEntries={[path]}>
        <AppRouter />
      </MemoryRouter>
    </AuthContext.Provider>
  );
}
function mount(path = "/vendor/menu", state = auth) {
  return render(tree(path, state));
}
async function newFields() {
  await userEvent.type(
    await screen.findByLabelText("Tên món bán"),
    "  Phở riêng của quán  ",
  );
  await userEvent.type(screen.getByLabelText("Giá bán (VNĐ)"), "35000");
  await userEvent.click(
    await screen.findByRole("radio", { name: dish.canonical_dish.name }),
  );
}

it("danh sách có cả món ngừng bán và phân trang theo total", async () => {
  vi.mocked(vendor.listVendorMenuItems)
    .mockResolvedValueOnce(page([{ ...item, is_available: false }], 25))
    .mockResolvedValueOnce(page([item], 25, 12));
  mount();
  expect(await screen.findByText("Đã ngừng bán")).toBeTruthy();
  expect(
    screen.queryByRole("button", { name: `Ngừng bán ${item.name}` }),
  ).toBeNull();
  await userEvent.click(screen.getByRole("button", { name: "Trang sau" }));
  expect(await screen.findByText("Đang cho phép bán")).toBeTruthy();
  expect(vendor.listVendorMenuItems).toHaveBeenLastCalledWith(
    { offset: 12, limit: 12 },
    expect.anything(),
  );
});
it("thực đơn rỗng vẫn có link tạo món", async () => {
  vi.mocked(vendor.listVendorMenuItems).mockResolvedValue(page([]));
  mount();
  expect(
    await screen.findByRole("heading", { name: "Thực đơn đang trống" }),
  ).toBeTruthy();
  expect(
    screen.getByRole("link", { name: "Thêm món mới" }).getAttribute("href"),
  ).toBe("/vendor/menu/new");
});
it("chưa có quán hướng tới hồ sơ thay vì tạo món", async () => {
  vi.mocked(vendor.listVendorMenuItems).mockRejectedValue(
    new ApiError("Chưa có quán", 404, "NOT_FOUND"),
  );
  mount();
  expect(
    await screen.findByRole("link", { name: "Mở hồ sơ quán" }),
  ).toBeTruthy();
  expect(screen.queryByRole("link", { name: "Thêm món mới" })).toBeNull();
});
it("ngừng bán cần xác nhận, đọc lại sau 204 và giữ món", async () => {
  vi.mocked(vendor.listVendorMenuItems)
    .mockResolvedValueOnce(page([item]))
    .mockResolvedValue(page([{ ...item, is_available: false }]));
  mount();
  await userEvent.click(
    await screen.findByRole("button", { name: `Ngừng bán ${item.name}` }),
  );
  expect(vendor.stopSellingVendorMenuItem).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole("button", { name: "Giữ bán món" }));
  await userEvent.click(
    screen.getByRole("button", { name: `Ngừng bán ${item.name}` }),
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Xác nhận ngừng bán" }),
  );
  expect(await screen.findByText("Đã ngừng bán")).toBeTruthy();
  expect(vendor.stopSellingVendorMenuItem).toHaveBeenCalledWith(9);
  expect(
    screen.getByRole("link", { name: `Sửa món ${item.name}` }),
  ).toBeTruthy();
});
it("DELETE lỗi vẫn GET lại khả dụng, không tự DELETE lặp", async () => {
  vi.mocked(vendor.stopSellingVendorMenuItem).mockRejectedValue(
    new Error("offline"),
  );
  mount();
  await userEvent.click(
    await screen.findByRole("button", { name: `Ngừng bán ${item.name}` }),
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Xác nhận ngừng bán" }),
  );
  await screen.findByRole("alert");
  expect(vendor.stopSellingVendorMenuItem).toHaveBeenCalledTimes(1);
  expect(vendor.listVendorMenuItems).toHaveBeenCalledTimes(2);
});
it("tạo món gửi đủ payload, không tự sao chép nguyên liệu món chuẩn", async () => {
  mount("/vendor/menu/new");
  await newFields();
  await userEvent.click(screen.getByRole("button", { name: "Tạo món" }));
  expect(vendor.createVendorMenuItem).toHaveBeenCalledWith({
    canonical_dish_id: 2,
    name: "Phở riêng của quán",
    price: 35000,
    is_available: false,
    ingredients_verified: false,
    ingredient_ids: [],
  });
  expect(await screen.findByText("Đã tạo món trong thực đơn.")).toBeTruthy();
});
it("sửa món dùng nguyên liệu thực tế, PUT đủ trường và giá nguyên", async () => {
  mount("/vendor/menu/9/edit");
  await userEvent.clear(await screen.findByLabelText("Giá bán (VNĐ)"));
  await userEvent.type(screen.getByLabelText("Giá bán (VNĐ)"), "45000");
  await userEvent.click(
    screen.getByRole("button", { name: "Bỏ nguyên liệu bò" }),
  );
  await userEvent.click(screen.getByLabelText("Cho phép bán món"));
  await userEvent.click(
    screen.getByRole("button", { name: "Lưu thay đổi món" }),
  );
  expect(vendor.updateVendorMenuItem).toHaveBeenCalledWith(9, {
    canonical_dish_id: 2,
    name: item.name,
    price: 45000,
    is_available: false,
    ingredients_verified: true,
    ingredient_ids: [2],
  });
});
it("xác nhận cần ít nhất một nguyên liệu thực tế", async () => {
  mount("/vendor/menu/new");
  await newFields();
  await userEvent.click(
    screen.getByLabelText(
      "Tôi xác nhận đã khai báo nguyên liệu thực tế của món",
    ),
  );
  await userEvent.click(screen.getByRole("button", { name: "Tạo món" }));
  expect(
    screen.getByText(
      "Cần khai báo ít nhất một nguyên liệu thực tế trước khi xác nhận.",
    ),
  ).toBeTruthy();
  expect(vendor.createVendorMenuItem).not.toHaveBeenCalled();
});
it("chọn nguyên liệu qua nhiều trang không mất lựa chọn trước", async () => {
  vi.mocked(catalog.listIngredients).mockImplementation(async (params) =>
    params?.offset
      ? page([{ id: 11, name: "nấm" }], 11, 10, 10)
      : page([{ id: 1, name: "bò" }], 11, 0, 10),
  );
  mount("/vendor/menu/new");
  await newFields();
  await userEvent.click(await screen.findByRole("checkbox", { name: "bò" }));
  const group = within(
    screen.getByRole("group", { name: "Nguyên liệu thực tế tại quán" }),
  );
  await userEvent.click(group.getByRole("button", { name: "Trang sau" }));
  await userEvent.click(await group.findByRole("checkbox", { name: "nấm" }));
  await userEvent.click(screen.getByRole("button", { name: "Tạo món" }));
  expect(vendor.createVendorMenuItem).toHaveBeenCalledWith(
    expect.objectContaining({ ingredient_ids: [1, 11] }),
  );
});
it("danh mục món chuẩn lỗi có retry, không cắt mất các trang", async () => {
  vi.mocked(catalog.listCanonicalDishes)
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce(page([dish.canonical_dish], 1, 0, 10));
  mount("/vendor/menu/new");
  await userEvent.click(
    await screen.findByRole("button", { name: "Tải lại món chuẩn" }),
  );
  expect(
    await screen.findByRole("radio", { name: dish.canonical_dish.name }),
  ).toBeTruthy();
});
it("422 giữ form và ánh xạ trường giá", async () => {
  vi.mocked(vendor.createVendorMenuItem).mockRejectedValue(
    new ApiError("Chưa hợp lệ.", 422, "VALIDATION_ERROR", [
      { field: ["body", "price"] },
    ]),
  );
  mount("/vendor/menu/new");
  await newFields();
  await userEvent.click(screen.getByRole("button", { name: "Tạo món" }));
  await screen.findByText(
    "Thông tin chưa hợp lệ. Hãy kiểm tra lại định dạng và giới hạn.",
  );
  expect(
    (screen.getByLabelText("Giá bán (VNĐ)") as HTMLInputElement).value,
  ).toBe("35000");
  expect(
    screen.getByLabelText("Giá bán (VNĐ)").getAttribute("aria-invalid"),
  ).toBe("true");
});
it("tạo mất phản hồi khóa POST tiếp, dẫn tới danh sách để kiểm tra", async () => {
  vi.mocked(vendor.createVendorMenuItem).mockRejectedValue(
    new Error("offline"),
  );
  mount("/vendor/menu/new");
  await newFields();
  await userEvent.click(screen.getByRole("button", { name: "Tạo món" }));
  expect(
    await screen.findByRole("link", { name: "Kiểm tra thực đơn đã lưu" }),
  ).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "Tạo món" }).matches(":disabled"),
  ).toBe(true);
  expect(vendor.createVendorMenuItem).toHaveBeenCalledTimes(1);
});
it("ngăn gửi PUT lặp và chỉ báo lưu sau response", async () => {
  let finish!: (value: MenuItemDetail) => void;
  vi.mocked(vendor.updateVendorMenuItem).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  mount("/vendor/menu/9/edit");
  await userEvent.click(
    await screen.findByRole("button", { name: "Lưu thay đổi món" }),
  );
  await userEvent.click(screen.getByRole("button", { name: "Đang lưu món…" }));
  expect(vendor.updateVendorMenuItem).toHaveBeenCalledTimes(1);
  await act(async () => finish(item));
  expect(screen.getByText("Đã lưu thay đổi món.")).toBeTruthy();
});
it("ID sai hoặc món ngoài quyền không mở form ghi", async () => {
  const first = mount("/vendor/menu/0/edit");
  expect(vendor.getVendorMenuItem).not.toHaveBeenCalled();
  first.unmount();
  vi.mocked(vendor.getVendorMenuItem).mockRejectedValue(
    new ApiError("Không tìm thấy món", 404, "NOT_FOUND"),
  );
  mount("/vendor/menu/9/edit");
  expect(
    await screen.findByRole("heading", { name: "Chưa mở được biểu mẫu" }),
  ).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Lưu thay đổi món" })).toBeNull();
});
it("GET món null không bị hiểu là form tạo mới", async () => {
  vi.mocked(vendor.getVendorMenuItem).mockResolvedValue(
    null as unknown as MenuItemDetail,
  );
  mount("/vendor/menu/9/edit");
  expect(
    await screen.findByRole("heading", { name: "Chưa mở được biểu mẫu" }),
  ).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Tạo món" })).toBeNull();
});
it.each(["customer", "admin"] as const)(
  "role %s không đọc danh sách vendor",
  (role) => {
    mount("/vendor/menu", { ...auth, user: { ...auth.user!, role } });
    expect(
      screen.getByRole("heading", { name: "Trang này dành cho vai trò khác." }),
    ).toBeTruthy();
    expect(vendor.listVendorMenuItems).not.toHaveBeenCalled();
  },
);
it("guest tới login, returnTo chỉ nhận menu route hợp lệ", () => {
  mount("/vendor/menu/9/edit", { ...auth, user: null, status: "anonymous" });
  expect(
    screen.getByRole("heading", { name: "Chào mừng bạn trở lại" }),
  ).toBeTruthy();
  expect(safeReturnTo("/vendor/menu/9/edit", "/vendor")).toBe(
    "/vendor/menu/9/edit",
  );
  expect(safeReturnTo("/vendor/menu/../admin/edit", "/vendor")).toBe("/vendor");
});
it("đổi tài khoản bỏ biểu mẫu cũ", async () => {
  const result = mount("/vendor/menu/9/edit");
  await screen.findByLabelText("Tên món bán");
  vi.mocked(vendor.getVendorMenuItem).mockRejectedValue(
    new ApiError("Không tìm thấy món", 404, "NOT_FOUND"),
  );
  result.rerender(
    tree("/vendor/menu/9/edit", { ...auth, user: { ...auth.user!, id: 5 } }),
  );
  expect(
    await screen.findByRole("heading", { name: "Chưa mở được biểu mẫu" }),
  ).toBeTruthy();
  expect(screen.queryByLabelText("Tên món bán")).toBeNull();
});
it.each(["0", "-1", "1.5", "35.000", "35,000", "10000001", "Infinity"])(
  "không nhận giá %s",
  (price) => {
    expect(
      validateVendorMenu({ ...menuFormFromItem(item), price }).errors.price,
    ).toBeTruthy();
  },
);
it("món chuẩn bắt buộc, ID nguyên liệu phải hợp lệ và không lặp", () => {
  expect(validateVendorMenu(emptyVendorMenu).errors.dish).toBeTruthy();
  expect(
    validateVendorMenu({
      ...menuFormFromItem(item),
      ingredients: [
        { id: 1, name: "bò" },
        { id: 1, name: "bò" },
      ],
    }).errors.ingredients,
  ).toBeTruthy();
});
it("không nhận hơn 100 nguyên liệu", () => {
  expect(
    validateVendorMenu({
      ...menuFormFromItem(item),
      ingredients: Array.from({ length: 101 }, (_, index) => ({
        id: index + 1,
        name: "nguyên liệu",
      })),
    }).errors.ingredients,
  ).toBeTruthy();
});

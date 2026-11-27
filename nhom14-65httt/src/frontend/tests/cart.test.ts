import { expect, it } from "vitest";
import { cartReducer, cartTotal, emptyCart } from "../src/utils/cart";
import type { CartProduct } from "../src/types/cart";

const product: CartProduct = {
  menu_item_id: 9,
  restaurant_id: 3,
  restaurant_name: "Bếp Việt",
  name: "Phở bò",
  price: 35000,
};
const add = (quantity = 1) =>
  cartReducer(emptyCart, { type: "add", product, quantity });
it("gộp cùng món, cập nhật số lượng và tổng tiền nguyên VNĐ", () => {
  const first = add(2);
  const second = cartReducer(first, { type: "add", product, quantity: 3 });
  expect(first.items[0].quantity).toBe(2);
  expect(second.items).toHaveLength(1);
  expect(second.items[0].quantity).toBe(5);
  expect(cartTotal(second.items)).toBe(175000);
  expect(
    cartTotal(
      cartReducer(second, { type: "quantity", id: 9, quantity: 4 }).items,
    ),
  ).toBe(140000);
});
it("thêm quán khác chỉ thay giỏ sau xác nhận, hủy giữ giỏ cũ", () => {
  const first = add();
  const pending = cartReducer(first, {
    type: "add",
    product: {
      ...product,
      menu_item_id: 10,
      restaurant_id: 4,
      restaurant_name: "Bếp mới",
    },
    quantity: 2,
  });
  expect(pending.items).toEqual(first.items);
  expect(pending.pending).not.toBeNull();
  expect(cartReducer(pending, { type: "cancel" }).items).toEqual(first.items);
  const confirmed = cartReducer(pending, { type: "confirm" });
  expect(confirmed.items).toEqual([
    {
      ...product,
      menu_item_id: 10,
      restaurant_id: 4,
      restaurant_name: "Bếp mới",
      quantity: 2,
    },
  ]);
  expect(confirmed.pending).toBeNull();
});
it.each([0, -1, 100, 1.5, NaN, Infinity])(
  "chặn số lượng %s cho thêm/sửa",
  (quantity) => {
    expect(
      cartReducer(emptyCart, { type: "add", product, quantity }).items,
    ).toEqual([]);
    expect(
      cartReducer(add(), { type: "quantity", id: 9, quantity }).items[0]
        .quantity,
    ).toBe(1);
  },
);
it("giới hạn tổng số lượng món khi thêm nhiều lần", () => {
  const state = cartReducer(add(99), { type: "add", product, quantity: 1 });
  expect(state.items[0].quantity).toBe(99);
  expect(state.error).toContain("99");
});
it("chặn món thứ 101 nhưng cho gộp món đã có", () => {
  const state = {
    ...emptyCart,
    items: Array.from({ length: 100 }, (_, id) => ({
      ...product,
      menu_item_id: id + 1,
      quantity: 1,
    })),
  };
  expect(
    cartReducer(state, {
      type: "add",
      product: { ...product, menu_item_id: 101 },
      quantity: 1,
    }).items,
  ).toHaveLength(100);
  expect(
    cartReducer(state, { type: "add", product, quantity: 1 }).items.find(
      (item) => item.menu_item_id === 9,
    )?.quantity,
  ).toBe(2);
});
it("không tự đổi giá cũ khi thêm lại món đã đổi giá", () => {
  const result = cartReducer(add(), {
    type: "add",
    product: { ...product, price: 40000 },
    quantity: 1,
  });
  expect(result.items[0].price).toBe(35000);
  expect(result.items[0].quantity).toBe(1);
  expect(result.error).toContain("Giá món đã thay đổi");
});
it("xóa món cuối và clear đưa giỏ về trống", () => {
  expect(cartReducer(add(), { type: "remove", id: 9 }).items).toEqual([]);
  expect(cartReducer(add(), { type: "clear" })).toEqual(emptyCart);
});
it.each([0, -1, 35000.5, Infinity, 10000001])("chặn giá %s", (price) => {
  expect(
    cartReducer(emptyCart, {
      type: "add",
      product: { ...product, price },
      quantity: 1,
    }).items,
  ).toEqual([]);
});

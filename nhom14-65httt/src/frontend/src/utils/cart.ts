import type { CartProduct, CartState } from "../types/cart";

export type CartAction =
  | { type: "add"; product: CartProduct; quantity: number }
  | { type: "quantity"; id: number; quantity: number }
  | { type: "remove"; id: number }
  | { type: "confirm" | "cancel" | "clear" };
export const emptyCart: CartState = {
  items: [],
  pending: null,
  notice: "",
  error: "",
};
const validQuantity = (value: number) =>
  Number.isInteger(value) && value >= 1 && value <= 99;
const validId = (value: number) =>
  Number.isInteger(value) && value > 0 && value <= 2147483647;

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "clear":
      return emptyCart;
    case "cancel":
      return { ...state, pending: null };
    case "confirm": {
      if (!state.pending) return state;
      const { product, quantity } = state.pending;
      return {
        items: [{ ...product, quantity }],
        pending: null,
        error: "",
        notice: `Đã đổi giỏ sang quán ${product.restaurant_name}.`,
      };
    }
    case "remove":
      return {
        ...state,
        pending: null,
        items: state.items.filter((item) => item.menu_item_id !== action.id),
        error: "",
        notice: "Đã xóa món khỏi giỏ.",
      };
    case "quantity":
      if (!validQuantity(action.quantity))
        return {
          ...state,
          error: "Số lượng mỗi món cần từ 1 đến 99.",
          notice: "",
        };
      return {
        ...state,
        pending: null,
        items: state.items.map((item) =>
          item.menu_item_id === action.id
            ? { ...item, quantity: action.quantity }
            : item,
        ),
        error: "",
        notice: "",
      };
    case "add": {
      const { product, quantity } = action;
      if (
        !validQuantity(quantity) ||
        !validId(product.menu_item_id) ||
        !validId(product.restaurant_id) ||
        !Number.isInteger(product.price) ||
        product.price <= 0 ||
        product.price > 10000000
      )
        return {
          ...state,
          error:
            "Thông tin món hoặc số lượng chưa hợp lệ. Hãy tải lại món và thử lại.",
          notice: "",
        };
      if (
        state.items.length &&
        state.items[0].restaurant_id !== product.restaurant_id
      )
        return {
          ...state,
          pending: { product, quantity },
          error: "",
          notice: "",
        };
      const existing = state.items.find(
        (item) => item.menu_item_id === product.menu_item_id,
      );
      if (existing && existing.price !== product.price)
        return {
          ...state,
          error:
            "Giá món đã thay đổi so với giỏ. Hãy xóa món cũ rồi thêm lại để dùng giá mới.",
          notice: "",
        };
      if (existing && existing.quantity + quantity > 99)
        return {
          ...state,
          error: "Mỗi món chỉ được tối đa 99 phần trong giỏ.",
          notice: "",
        };
      if (!existing && state.items.length >= 100)
        return {
          ...state,
          error: "Một giỏ chỉ được tối đa 100 món khác nhau.",
          notice: "",
        };
      return {
        items: existing
          ? state.items.map((item) =>
              item.menu_item_id === product.menu_item_id
                ? { ...item, quantity: item.quantity + quantity }
                : item,
            )
          : [...state.items, { ...product, quantity }],
        pending: null,
        error: "",
        notice: `Đã thêm ${quantity} phần ${product.name} vào giỏ.`,
      };
    }
  }
}

export const cartTotal = (items: CartState["items"]) =>
  items.reduce((total, item) => total + item.price * item.quantity, 0);

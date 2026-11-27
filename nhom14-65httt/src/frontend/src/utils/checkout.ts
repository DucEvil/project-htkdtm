import type { CartLine } from "../types/cart";
import type { SearchLocation } from "./locationValidation";
import type { OrderCreate } from "../types/order";

export type CheckoutDraft = Omit<OrderCreate, "session_id" | "idempotency_key">;
export function checkoutDraft(
  items: CartLine[],
  address: string,
  location: SearchLocation | null,
  confirmed: boolean,
) {
  const errors: {
    address?: string;
    location?: string;
    confirm?: string;
    cart?: string;
  } = {};
  const cleaned = address.trim();
  if (cleaned.length < 5 || cleaned.length > 500)
    errors.address = "Địa chỉ giao cần từ 5 đến 500 ký tự.";
  if (!location) errors.location = "Bạn hãy chọn tọa độ giao hàng.";
  if (!confirmed)
    errors.confirm = "Bạn cần xác nhận địa chỉ và tọa độ là cùng điểm giao.";
  if (
    !items.length ||
    items.some((item) => item.restaurant_id !== items[0].restaurant_id)
  )
    errors.cart = "Giỏ hàng cần có món từ một quán.";
  const payload: CheckoutDraft | null =
    Object.keys(errors).length || !location
      ? null
      : {
          restaurant_id: items[0].restaurant_id,
          items: items.map((item) => ({
            menu_item_id: item.menu_item_id,
            quantity: item.quantity,
            expected_price: item.price,
          })),
          delivery_address: cleaned,
          latitude: location.latitude,
          longitude: location.longitude,
        };
  return { errors, payload };
}

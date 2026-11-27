import type {
  IngredientPublic,
  MenuItemDetail,
  MenuItemUpdate,
} from "../types/menu";

export interface VendorMenuForm {
  name: string;
  price: string;
  dish: IngredientPublic[];
  ingredients: IngredientPublic[];
  available: boolean;
  verified: boolean;
}
export type MenuFormErrors = Partial<Record<keyof VendorMenuForm, string>>;
export const emptyVendorMenu: VendorMenuForm = {
  name: "",
  price: "",
  dish: [],
  ingredients: [],
  available: false,
  verified: false,
};
export function menuFormFromItem(item: MenuItemDetail): VendorMenuForm {
  return {
    name: item.name,
    price: String(item.price),
    dish: [{ id: item.canonical_dish_id, name: item.canonical_dish.name }],
    ingredients: item.ingredients,
    available: item.is_available,
    verified: item.ingredients_verified,
  };
}
export function validateVendorMenu(form: VendorMenuForm) {
  const errors: MenuFormErrors = {};
  const id = (value: number) =>
    Number.isInteger(value) && value > 0 && value <= 2147483647;
  if (!form.name.trim() || form.name.trim().length > 180)
    errors.name = "Tên món cần từ 1 đến 180 ký tự.";
  const price = Number(form.price);
  if (
    !/^\d+$/.test(form.price.trim()) ||
    !Number.isSafeInteger(price) ||
    price <= 0 ||
    price > 10000000
  )
    errors.price =
      "Giá cần là số nguyên từ 1 đến 10.000.000 VNĐ, không dùng dấu phân cách.";
  if (form.dish.length !== 1 || !id(form.dish[0].id))
    errors.dish = "Bạn hãy chọn một món chuẩn trong danh mục.";
  if (
    form.ingredients.length > 100 ||
    form.ingredients.some((entry) => !id(entry.id)) ||
    new Set(form.ingredients.map((entry) => entry.id)).size !==
      form.ingredients.length
  )
    errors.ingredients = "Chọn tối đa 100 nguyên liệu khác nhau từ danh mục.";
  if (form.verified && !form.ingredients.length)
    errors.ingredients =
      "Cần khai báo ít nhất một nguyên liệu thực tế trước khi xác nhận.";
  const payload: MenuItemUpdate | null = Object.keys(errors).length
    ? null
    : {
        canonical_dish_id: form.dish[0].id,
        name: form.name.trim(),
        price,
        is_available: form.available,
        ingredients_verified: form.verified,
        ingredient_ids: form.ingredients
          .map((entry) => entry.id)
          .sort((a, b) => a - b),
      };
  return { errors, payload };
}
export function isVendorMenuResponse(
  value: MenuItemDetail,
  restaurantId: number,
): boolean {
  return Boolean(
    value &&
    Number.isInteger(value.id) &&
    value.id > 0 &&
    value.restaurant_id === restaurantId &&
    typeof value.name === "string" &&
    Number.isInteger(value.price) &&
    value.price > 0 &&
    value.price <= 10000000 &&
    typeof value.is_available === "boolean" &&
    typeof value.ingredients_verified === "boolean" &&
    Array.isArray(value.ingredients) &&
    value.canonical_dish &&
    Number.isInteger(value.canonical_dish_id),
  );
}

export interface CartProduct {
  menu_item_id: number;
  restaurant_id: number;
  restaurant_name: string;
  name: string;
  price: number;
}
export interface CartLine extends CartProduct {
  quantity: number;
}
export interface CartState {
  items: CartLine[];
  pending: { product: CartProduct; quantity: number } | null;
  notice: string;
  error: string;
}

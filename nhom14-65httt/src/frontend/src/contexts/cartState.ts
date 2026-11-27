import { createContext } from "react";
import type { CartProduct, CartState } from "../types/cart";

export interface CartContextValue extends CartState {
  total: number;
  count: number;
  add: (product: CartProduct, quantity: number) => void;
  setQuantity: (id: number, quantity: number) => void;
  remove: (id: number) => void;
  updatePrice: (id: number, price: number) => void;
  clear: () => void;
  confirm: () => void;
  cancel: () => void;
}
export const CartContext = createContext<CartContextValue | null>(null);

import { useContext } from "react";
import { CartContext } from "../contexts/cartState";

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart cần nằm trong CartProvider.");
  return value;
}

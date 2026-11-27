import { useEffect, useReducer, useRef, type ReactNode } from "react";
import { CartContext } from "./cartState";
import { cartReducer, cartTotal, emptyCart } from "../utils/cart";
import { useAuth } from "../hooks/useAuth";
import ReplaceCartDialog from "../components/cart/ReplaceCartDialog";
import "../components/cart/cart.css";

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, status } = useAuth();
  const previousOwner = useRef(user?.id ?? null);
  const owner =
    status === "loading" || status === "error"
      ? previousOwner.current
      : (user?.id ?? null);
  const [state, dispatch] = useReducer(cartReducer, emptyCart);
  const changedOwner =
    previousOwner.current !== null && previousOwner.current !== owner;
  const visible = changedOwner ? emptyCart : state;
  useEffect(() => {
    if (previousOwner.current !== null && previousOwner.current !== owner)
      dispatch({ type: "clear" });
    previousOwner.current = owner;
  }, [owner]);
  return (
    <CartContext.Provider
      value={{
        ...visible,
        total: cartTotal(visible.items),
        count: visible.items.reduce((count, item) => count + item.quantity, 0),
        add: (product, quantity) =>
          dispatch({ type: "add", product, quantity }),
        setQuantity: (id, quantity) =>
          dispatch({ type: "quantity", id, quantity }),
        remove: (id) => dispatch({ type: "remove", id }),
        updatePrice: (id, price) => dispatch({ type: "price", id, price }),
        clear: () => dispatch({ type: "clear" }),
        confirm: () => dispatch({ type: "confirm" }),
        cancel: () => dispatch({ type: "cancel" }),
      }}
    >
      {children}
      {visible.pending && <ReplaceCartDialog />}
    </CartContext.Provider>
  );
}

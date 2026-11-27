import { useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../../hooks/useCart";
import { useAuth } from "../../hooks/useAuth";
import type { MenuItemPublic } from "../../types/menu";
import type { RestaurantPublic } from "../../types/restaurant";
import QuantityControl from "./QuantityControl";

export default function AddToCart({
  item,
  restaurant,
}: {
  item: MenuItemPublic;
  restaurant: RestaurantPublic;
}) {
  const { user } = useAuth();
  const cart = useCart();
  const [quantity, setQuantity] = useState(1);
  const customer = !user || user.role === "customer";
  const available =
    item.is_available && restaurant.can_receive_orders && customer;
  return (
    <section className="add-to-cart" aria-label="Thêm món vào giỏ">
      <h2>Chọn số phần</h2>
      <QuantityControl
        value={quantity}
        onChange={setQuantity}
        name={item.name}
      />
      <button
        type="button"
        className="button"
        disabled={!available}
        onClick={() =>
          cart.add(
            {
              menu_item_id: item.id,
              restaurant_id: item.restaurant_id,
              restaurant_name: restaurant.name,
              name: item.name,
              price: item.price,
            },
            quantity,
          )
        }
      >
        Thêm vào giỏ
      </button>
      {!available && (
        <p className="cart-muted">
          {!customer
            ? "Thêm món dành cho tài khoản khách hàng."
            : "Quán hoặc món hiện chưa nhận đặt hàng. Bạn có thể quay lại sau."}
        </p>
      )}
      {cart.notice && (
        <p className="cart-success" role="status">
          {cart.notice}
        </p>
      )}
      {cart.error && (
        <p className="cart-error" role="alert">
          {cart.error}
        </p>
      )}
      {cart.items.length > 0 && (
        <Link className="cart-inline-link" to="/cart">
          Xem giỏ hàng ({cart.count})
        </Link>
      )}
    </section>
  );
}

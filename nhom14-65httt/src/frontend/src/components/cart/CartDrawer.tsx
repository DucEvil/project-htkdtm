import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../../hooks/useCart";
import { formatPrice } from "../../utils/catalog";
import QuantityControl from "./QuantityControl";
import "./drawer.css";

export default function CartDrawer({ onClose }: { onClose: () => void }) {
  const cart = useCart();
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const trigger =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      if (dialog.open) dialog.close();
      document.body.style.overflow = overflow;
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={dialogRef}
      className="cart-drawer"
      aria-labelledby="cart-drawer-title"
      onCancel={onClose}
    >
      <header>
        <h2 id="cart-drawer-title">Giỏ hàng nhanh</h2>
        <button
          type="button"
          autoFocus
          onClick={onClose}
          aria-label="Đóng giỏ hàng"
        >
          ×
        </button>
      </header>
      {cart.error && <p role="alert">{cart.error}</p>}
      {!cart.items.length ? (
        <>
          <p>Giỏ hàng đang trống.</p>
          <Link className="button" to="/search" onClick={onClose}>
            Tìm món gần bạn
          </Link>
        </>
      ) : (
        <>
          <p>Món từ {cart.items[0].restaurant_name}</p>
          <ul>
            {cart.items.map((item) => (
              <li key={item.menu_item_id}>
                <h3>
                  <Link
                    to={`/menu-items/${item.menu_item_id}`}
                    onClick={onClose}
                  >
                    {item.name}
                  </Link>
                </h3>
                <p>{formatPrice(item.price)} / phần</p>
                <QuantityControl
                  value={item.quantity}
                  name={item.name}
                  onChange={(quantity) =>
                    cart.setQuantity(item.menu_item_id, quantity)
                  }
                />
                <div className="cart-drawer-line-total">
                  <strong>{formatPrice(item.price * item.quantity)}</strong>
                  <button
                    type="button"
                    aria-label={`Xóa món ${item.name}`}
                    onClick={() => cart.remove(item.menu_item_id)}
                  >
                    Xóa món
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <p className="cart-drawer-total">
            Tạm tính ({cart.count} phần):{" "}
            <strong>{formatPrice(cart.total)}</strong>
          </p>
          <p>Giá và khả năng phục vụ sẽ được kiểm tra lại khi đặt đơn.</p>
          <Link className="button" to="/cart" onClick={onClose}>
            Xem giỏ và đặt hàng
          </Link>
        </>
      )}
      <p>
        Giỏ chỉ được giữ trong lần mở trang này; tải lại hoặc đóng trang sẽ làm
        trống giỏ.
      </p>
    </dialog>
  );
}

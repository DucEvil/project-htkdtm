import { useEffect, useRef } from "react";
import { useCart } from "../../hooks/useCart";

export default function ReplaceCartDialog() {
  const { pending, items, confirm, cancel } = useCart();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const trigger =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, []);
  if (!pending) return null;
  return (
    <dialog
      ref={ref}
      className="cart-dialog"
      aria-labelledby="replace-cart-title"
      onCancel={cancel}
    >
      <span className="eyebrow">MỖI GIỎ, MỘT QUÁN</span>
      <h2 id="replace-cart-title">Đổi sang quán khác?</h2>
      <p>
        Giỏ đang có món từ <strong>{items[0]?.restaurant_name}</strong>. Nếu
        tiếp tục, các món hiện tại sẽ được thay bằng món từ{" "}
        <strong>{pending.product.restaurant_name}</strong>.
      </p>
      <div className="cart-dialog-actions">
        <button
          type="button"
          className="button secondary"
          autoFocus
          onClick={cancel}
        >
          Giữ giỏ hiện tại
        </button>
        <button type="button" className="button" onClick={confirm}>
          Đổi quán và thêm món
        </button>
      </div>
    </dialog>
  );
}

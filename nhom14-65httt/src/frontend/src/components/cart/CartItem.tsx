import { Link } from "react-router-dom";
import type { CartLine } from "../../types/cart";
import { formatPrice } from "../../utils/catalog";
import QuantityControl from "./QuantityControl";

export default function CartItem({
  item,
  onQuantityChange,
  onRemove,
  onNavigate,
  compact = false,
}: {
  item: CartLine;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
  onNavigate?: () => void;
  compact?: boolean;
}) {
  const Heading = compact ? "h3" : "h2";
  return (
    <article className={compact ? "cart-item-compact" : "cart-line"}>
      <div className={compact ? undefined : "cart-line-title"}>
        <Heading>
          <Link to={`/menu-items/${item.menu_item_id}`} onClick={onNavigate}>
            {item.name}
          </Link>
        </Heading>
        <p>{formatPrice(item.price)} / phần</p>
      </div>
      <QuantityControl
        value={item.quantity}
        name={item.name}
        onChange={onQuantityChange}
      />
      <div className={compact ? "cart-drawer-line-total" : "cart-line-total"}>
        <strong>{formatPrice(item.price * item.quantity)}</strong>
        <button
          type="button"
          aria-label={`Xóa món ${item.name}`}
          onClick={onRemove}
        >
          Xóa món
        </button>
      </div>
    </article>
  );
}

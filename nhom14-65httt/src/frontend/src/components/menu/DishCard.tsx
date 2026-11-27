import { Link } from "react-router-dom";
import type { MenuItemPublic } from "../../types/menu";
import { formatPrice } from "../../utils/catalog";

export default function DishCard({ item }: { item: MenuItemPublic }) {
  return (
    <article className="catalog-dish-card">
      <span className="catalog-tag">{item.canonical_dish.region}</span>
      <h3>
        <Link to={`/menu-items/${item.id}`}>{item.name}</Link>
      </h3>
      <p className="catalog-price">{formatPrice(item.price)}</p>
      <p>
        {item.canonical_dish.method} ·{" "}
        {item.ingredients_verified
          ? "Quán đã xác nhận nguyên liệu"
          : "Chưa xác nhận nguyên liệu"}
      </p>
      <Link
        className="catalog-detail-link"
        to={`/menu-items/${item.id}`}
        aria-label={`Xem món ${item.name}`}
      >
        Xem chi tiết <span aria-hidden="true">↗</span>
      </Link>
    </article>
  );
}

import { useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { getMenuItem } from "../../api/menu";
import { getRestaurant } from "../../api/restaurants";
import { ApiError } from "../../api/client";
import { usePublicData } from "../../hooks/usePublicData";
import { formatPrice, routeEntityId } from "../../utils/catalog";
import IngredientInfo from "../../components/menu/IngredientInfo";
import RestaurantInfo from "../../components/menu/RestaurantInfo";
import PublicResourceState from "../../components/common/PublicResourceState";
import AddToCart from "../../components/cart/AddToCart";
import "./catalog.css";

const spiceLabels = ["Không cay", "Ít cay", "Vừa cay", "Rất cay"];
export default function DishDetailPage() {
  const { id } = useParams();
  const parsed = routeEntityId(id);
  return (
    <section className="catalog-page">
      {parsed === null ? (
        <PublicResourceState
          error={new ApiError("", 404, "NOT_FOUND")}
          name="món"
        />
      ) : (
        <DishContent key={parsed} id={parsed} />
      )}
    </section>
  );
}

function DishContent({ id }: { id: number }) {
  const load = useCallback(
    async (signal: AbortSignal) => {
      const item = await getMenuItem(id, { signal });
      if (signal.aborted) throw new DOMException("Đã hủy", "AbortError");
      const restaurant = await getRestaurant(item.restaurant_id, { signal });
      return { item, restaurant };
    },
    [id],
  );
  const result = usePublicData(load);
  if (result.loading) return <p role="status">Đang tải thông tin món…</p>;
  if (result.error)
    return (
      <PublicResourceState
        name="món"
        error={result.error}
        retry={result.retry}
      />
    );
  if (!result.data) return null;
  const { item, restaurant } = result.data;
  const canonical = item.canonical_dish;
  return (
    <>
      <Link className="catalog-back" to={`/restaurants/${restaurant.id}`}>
        ← Thực đơn {restaurant.name}
      </Link>
      <div className="catalog-detail-layout">
        <article className="catalog-detail-card">
          <span className="eyebrow">
            HƯƠNG VỊ TỪ {canonical.region.toLocaleUpperCase("vi-VN")}
          </span>
          <h1>{item.name}</h1>
          <p className="catalog-price">{formatPrice(item.price)}</p>
          <div className="catalog-tags">
            <span>{canonical.region}</span>
            <span>{canonical.method}</span>
            <span>
              {spiceLabels[canonical.spice_level] ?? "Chưa rõ mức cay"}
            </span>
          </div>
          <IngredientInfo item={item} />
          <section className="catalog-canonical">
            <h2>Đặc trưng món chuẩn</h2>
            <p className="catalog-muted">
              Thông tin tham khảo của {canonical.name}, có thể khác cách chế
              biến tại quán.
            </p>
            <p>
              {canonical.ingredients.length
                ? canonical.ingredients.join(", ")
                : "Chưa có thông tin nguyên liệu tham khảo."}
            </p>
            {canonical.labels.length > 0 && (
              <div className="catalog-tags">
                {canonical.labels.map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>
            )}
          </section>
        </article>
        <aside className="catalog-restaurant-card">
          <span className="eyebrow">ĐƯỢC CHẾ BIẾN TẠI</span>
          <h2>
            <Link to={`/restaurants/${restaurant.id}`}>{restaurant.name}</Link>
          </h2>
          <RestaurantInfo restaurant={restaurant} />
          <Link className="button" to={`/restaurants/${restaurant.id}`}>
            Xem thực đơn quán
          </Link>
          <AddToCart item={item} restaurant={restaurant} />
        </aside>
      </div>
    </>
  );
}

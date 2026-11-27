import { useCallback, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getRestaurant } from "../../api/restaurants";
import { getRestaurantMenu } from "../../api/menu";
import { ApiError } from "../../api/client";
import { usePublicData } from "../../hooks/usePublicData";
import { routeEntityId } from "../../utils/catalog";
import DishCard from "../../components/menu/DishCard";
import RestaurantInfo from "../../components/menu/RestaurantInfo";
import PublicResourceState from "../../components/common/PublicResourceState";
import "./catalog.css";

export default function RestaurantPage() {
  const { id } = useParams();
  const parsed = routeEntityId(id);
  return (
    <section className="catalog-page">
      {parsed === null ? (
        <PublicResourceState
          error={new ApiError("", 404, "NOT_FOUND")}
          name="quán"
        />
      ) : (
        <RestaurantContent key={parsed} id={parsed} />
      )}
    </section>
  );
}

function RestaurantContent({ id }: { id: number }) {
  const load = useCallback(
    (signal: AbortSignal) => getRestaurant(id, { signal }),
    [id],
  );
  const profile = usePublicData(load);
  return (
    <>
      <Link className="catalog-back" to="/search">
        ← Tìm món, quán
      </Link>
      {profile.loading ? (
        <p role="status">Đang tải thông tin quán…</p>
      ) : profile.error ? (
        <PublicResourceState
          name="quán"
          error={profile.error}
          retry={profile.retry}
        />
      ) : (
        profile.data && (
          <>
            <header className="catalog-hero">
              <div>
                <span className="eyebrow">MỘT GÓC VỊ VIỆT</span>
                <h1>{profile.data.name}</h1>
                <p>Khám phá thực đơn và những hương vị từ quán.</p>
              </div>
              <RestaurantInfo restaurant={profile.data} />
            </header>
            <RestaurantMenu id={id} />
          </>
        )
      )}
    </>
  );
}

function RestaurantMenu({ id }: { id: number }) {
  const [offset, setOffset] = useState(0);
  const load = useCallback(
    (signal: AbortSignal) =>
      getRestaurantMenu(id, { offset, limit: 13 }, { signal }),
    [id, offset],
  );
  const menu = usePublicData(load);
  return (
    <section className="catalog-menu" aria-labelledby="restaurant-menu-heading">
      <div className="catalog-section-heading">
        <h2 id="restaurant-menu-heading">Thực đơn của quán</h2>
        <p>Giá niêm yết bằng đồng Việt Nam.</p>
      </div>
      {menu.loading ? (
        <p role="status">Đang tải thực đơn…</p>
      ) : menu.error ? (
        <PublicResourceState
          name="thực đơn"
          error={menu.error}
          retry={menu.retry}
        />
      ) : (
        menu.data && (
          <>
            {!menu.data.length ? (
              <div className="catalog-state">
                <h3>
                  {offset
                    ? "Trang này chưa có món"
                    : "Quán chưa có món đang bán"}
                </h3>
                <p>
                  {offset
                    ? "Thực đơn có thể đã thay đổi. Bạn có thể quay lại trang trước."
                    : "Bạn có thể quay lại sau hoặc tìm một quán khác."}
                </p>
              </div>
            ) : (
              <div className="catalog-grid">
                {menu.data.slice(0, 12).map((item) => (
                  <DishCard key={item.id} item={item} />
                ))}
              </div>
            )}
            {(offset > 0 || menu.data.length > 12) && (
              <nav
                className="catalog-pagination"
                aria-label="Phân trang thực đơn"
              >
                <button
                  type="button"
                  disabled={!offset}
                  onClick={() => setOffset((value) => Math.max(0, value - 12))}
                >
                  Trang trước
                </button>
                <span>Trang {offset / 12 + 1}</span>
                <button
                  type="button"
                  disabled={menu.data.length <= 12}
                  onClick={() => setOffset((value) => value + 12)}
                >
                  Trang sau
                </button>
              </nav>
            )}
          </>
        )
      )}
    </section>
  );
}

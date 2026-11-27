import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { listAdminRestaurants } from "../../api/admin";
import { errorMessage } from "../../api/client";
import { useAuth } from "../../hooks/useAuth";
import { usePublicData } from "../../hooks/usePublicData";
import type { RestaurantStatus } from "../../types/restaurant";
import { profileStatusLabels } from "../../utils/vendorProfileValidation";
import "./restaurants.css";

export default function RestaurantManagePage() {
  const { user } = useAuth();
  return user ? <RestaurantList key={user.id} /> : null;
}
function RestaurantList() {
  const [query, setQuery] = useState<{
    offset: number;
    status: RestaurantStatus | "";
  }>({ offset: 0, status: "" });
  const load = useCallback(
    (signal: AbortSignal) =>
      listAdminRestaurants(
        { offset: query.offset, limit: 12, status: query.status || undefined },
        { signal },
      ),
    [query],
  );
  const result = usePublicData(load);
  return (
    <section className="admin-restaurants">
      <Link className="admin-restaurants-back" to="/admin">
        ← Tài khoản quản trị
      </Link>
      <span className="eyebrow">VỊ VIỆT · QUẢN TRỊ</span>
      <h1>Danh sách quán</h1>
      <p>Xem hồ sơ, trạng thái duyệt và khả năng nhận đơn của các quán.</p>
      <div className="admin-restaurant-filters">
        <div>
          <label htmlFor="restaurant-status">Trạng thái quán</label>
          <select
            id="restaurant-status"
            value={query.status}
            onChange={(event) =>
              setQuery({
                offset: 0,
                status: event.target.value as RestaurantStatus | "",
              })
            }
          >
            <option value="">Tất cả trạng thái</option>
            <option value="pending">Chờ duyệt</option>
            <option value="approved">Đã được duyệt</option>
            <option value="suspended">Đang tạm ngừng</option>
          </select>
        </div>
        <button
          className="button"
          disabled={result.loading}
          onClick={result.retry}
        >
          Làm mới danh sách
        </button>
      </div>
      {result.loading ? (
        <p role="status">Đang tải danh sách quán…</p>
      ) : result.error ? (
        <div className="admin-restaurant-card">
          <h2>Chưa tải được danh sách quán</h2>
          <p role="alert">{errorMessage(result.error)}</p>
          <button className="button" onClick={result.retry}>
            Thử lại
          </button>
        </div>
      ) : (
        result.data && (
          <>
            <p>{result.data.total} quán phù hợp bộ lọc</p>
            {!result.data.items.length ? (
              <div className="admin-restaurant-card">
                <h2>
                  {query.offset
                    ? "Trang này chưa có quán"
                    : "Chưa có quán phù hợp"}
                </h2>
                <p>
                  {query.offset
                    ? "Danh sách có thể đã thay đổi. Hãy quay lại trang trước."
                    : "Thử chọn trạng thái khác hoặc làm mới danh sách."}
                </p>
              </div>
            ) : (
              <div className="admin-restaurant-grid">
                {result.data.items.map((restaurant) => (
                  <article
                    className="admin-restaurant-card"
                    key={restaurant.id}
                  >
                    <span
                      className={`admin-restaurant-status ${restaurant.status}`}
                    >
                      {profileStatusLabels[restaurant.status]}
                    </span>
                    <h2>{restaurant.name}</h2>
                    <p>{restaurant.address}</p>
                    <p>
                      {restaurant.can_receive_orders
                        ? "Có thể nhận đơn"
                        : "Hiện chưa thể nhận đơn"}
                    </p>
                    <details>
                      <summary>Thông tin quán #{restaurant.id}</summary>
                      <dl>
                        <dt>Giờ phục vụ (Việt Nam)</dt>
                        <dd>
                          {restaurant.opens_at === restaurant.closes_at
                            ? "Cả ngày"
                            : `${restaurant.opens_at}–${restaurant.closes_at}${restaurant.opens_at > restaurant.closes_at ? " (qua đêm)" : ""}`}
                        </dd>
                        <dt>Bán kính giao hàng</dt>
                        <dd>{restaurant.delivery_radius_km} km</dd>
                        <dt>Tọa độ quán</dt>
                        <dd>
                          {restaurant.latitude}, {restaurant.longitude}
                        </dd>
                        <dt>Trong giờ phục vụ</dt>
                        <dd>{restaurant.is_open ? "Có" : "Không"}</dd>
                        <dt>Chủ quán bật nhận đơn</dt>
                        <dd>
                          {restaurant.accepting_orders ? "Đã bật" : "Đã tắt"}
                        </dd>
                        <dt>Nguồn dữ liệu</dt>
                        <dd>
                          {restaurant.is_simulated
                            ? "Dữ liệu mô phỏng"
                            : "Không gắn cờ mô phỏng"}
                        </dd>
                      </dl>
                    </details>
                  </article>
                ))}
              </div>
            )}
            {(query.offset > 0 || result.data.total > 12) && (
              <nav
                className="admin-restaurant-pagination"
                aria-label="Phân trang danh sách quán"
              >
                <button
                  disabled={!query.offset}
                  onClick={() =>
                    setQuery((previous) => ({
                      ...previous,
                      offset: Math.max(0, previous.offset - 12),
                    }))
                  }
                >
                  Trang trước
                </button>
                <span>Trang {query.offset / 12 + 1}</span>
                <button
                  disabled={
                    query.offset + result.data.limit >= result.data.total
                  }
                  onClick={() =>
                    setQuery((previous) => ({
                      ...previous,
                      offset: previous.offset + 12,
                    }))
                  }
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

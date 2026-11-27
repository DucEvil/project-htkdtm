import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { listOrders } from "../../api/orders";
import { usePublicData as useRemoteData } from "../../hooks/usePublicData";
import { useAuth } from "../../hooks/useAuth";
import { formatPrice } from "../../utils/catalog";
import { orderTime } from "../../utils/orders";
import OrderStatusBadge from "../../components/order/OrderStatusBadge";
import OrderError from "../../components/order/OrderError";
import "./orders.css";

export default function OrderListPage() {
  const { user } = useAuth();
  return user ? <OrderList key={user.id} /> : null;
}
function OrderList() {
  const [offset, setOffset] = useState(0);
  const load = useCallback(
    (signal: AbortSignal) => listOrders({ offset, limit: 11 }, { signal }),
    [offset],
  );
  const result = useRemoteData(load);
  return (
    <section className="orders-page">
      <header className="orders-heading">
        <span className="eyebrow">NHỮNG BỮA NGON CỦA BẠN</span>
        <h1>Đơn hàng của tôi</h1>
        <p>Xem lại món đã đặt và theo dõi từng đơn từ quán.</p>
        <button
          className="order-refresh"
          disabled={result.loading}
          onClick={result.retry}
        >
          Làm mới danh sách
        </button>
      </header>
      {result.loading ? (
        <p role="status">Đang tải đơn hàng…</p>
      ) : result.error ? (
        <OrderError error={result.error} retry={result.retry} />
      ) : (
        result.data && (
          <>
            {!result.data.length ? (
              <div className="order-empty">
                <h2>
                  {offset ? "Trang này chưa có đơn" : "Bạn chưa có đơn hàng"}
                </h2>
                <p>
                  {offset
                    ? "Danh sách có thể đã thay đổi. Hãy quay lại trang trước."
                    : "Một bữa ngon đang chờ bạn khám phá."}
                </p>
                <Link className="button" to="/search">
                  Tìm món
                </Link>
              </div>
            ) : (
              <div className="order-list">
                {result.data.slice(0, 10).map((order) => (
                  <article className="order-list-card" key={order.id}>
                    <div className="order-list-top">
                      <h2>
                        <Link to={`/orders/${order.id}`}>Đơn #{order.id}</Link>
                      </h2>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    <time dateTime={order.created_at}>
                      {orderTime(order.created_at)} · Giờ Việt Nam
                    </time>
                    <p className="order-list-items">
                      {order.items
                        .map(
                          (item) => `${item.snapshot_name} × ${item.quantity}`,
                        )
                        .join(", ")}
                    </p>
                    <p className="order-list-address">
                      Giao đến: {order.delivery_address}
                    </p>
                    <div className="order-list-bottom">
                      <strong>{formatPrice(order.total)}</strong>
                      <Link
                        to={`/orders/${order.id}`}
                        aria-label={`Xem đơn ${order.id}`}
                      >
                        Xem chi tiết <span aria-hidden="true">↗</span>
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
            {(offset > 0 || result.data.length > 10) && (
              <nav
                className="order-pagination"
                aria-label="Phân trang đơn hàng"
              >
                <button
                  disabled={!offset}
                  onClick={() => setOffset((value) => Math.max(0, value - 10))}
                >
                  Trang trước
                </button>
                <span>Trang {offset / 10 + 1}</span>
                <button
                  disabled={result.data.length <= 10}
                  onClick={() => setOffset((value) => value + 10)}
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

import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError, errorMessage } from "../../api/client";
import { useAuth } from "../../hooks/useAuth";
import { useCustomerOrder } from "../../hooks/useCustomerOrder";
import { formatPrice, routeEntityId } from "../../utils/catalog";
import { orderTime } from "../../utils/orders";
import OrderError from "../../components/order/OrderError";
import OrderStatusBadge from "../../components/order/OrderStatusBadge";
import OrderTimeline from "../../components/order/OrderTimeline";
import CancelOrderDialog from "../../components/order/CancelOrderDialog";
import "./orders.css";

export default function OrderDetailPage() {
  const { user } = useAuth();
  const { id } = useParams();
  const parsed = routeEntityId(id);
  return (
    <section className="orders-page">
      {parsed === null ? (
        <OrderError error={new ApiError("", 404, "NOT_FOUND")} />
      ) : (
        user && <OrderDetail key={`${user.id}-${parsed}`} id={parsed} />
      )}
    </section>
  );
}
function OrderDetail({ id }: { id: number }) {
  const state = useCustomerOrder(id);
  const [confirm, setConfirm] = useState(false);
  const { order } = state;
  if (state.loading) return <p role="status">Đang tải chi tiết đơn…</p>;
  if (!order)
    return (
      <OrderError error={state.error} retry={() => void state.refresh()} />
    );
  const terminal = ["completed", "cancelled", "rejected"].includes(
    order.status,
  );
  return (
    <>
      <Link className="order-back" to="/orders">
        ← Tất cả đơn hàng
      </Link>
      <header className="order-detail-heading">
        <div>
          <span className="eyebrow">VỊ VIỆT · ĐƠN HÀNG</span>
          <h1>Đơn #{order.id}</h1>
          <p>Đặt lúc {orderTime(order.created_at)} · Giờ Việt Nam</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </header>
      <div className="order-update">
        <p>
          {terminal
            ? "Đơn đã kết thúc."
            : "Tự cập nhật mỗi 15 giây khi bạn đang xem trang."}
        </p>
        <button
          className="order-refresh"
          disabled={state.refreshing || state.cancelling}
          onClick={() => void state.refresh()}
        >
          {state.refreshing ? "Đang cập nhật…" : "Cập nhật trạng thái"}
        </button>
      </div>
      {state.error && (
        <p className="order-warning" role="alert">
          {errorMessage(state.error)} Thông tin bên dưới là lần tải thành công
          gần nhất.
        </p>
      )}
      {state.cancelMessage && (
        <p className="order-message" role="status">
          {state.cancelMessage}
        </p>
      )}
      <div className="order-detail-layout">
        <div className="order-snapshot">
          <h2>Món bạn đã đặt</h2>
          <ul>
            {order.items.map((item) => (
              <li key={item.menu_item_id}>
                <div>
                  <strong>{item.snapshot_name}</strong>
                  <small>
                    {formatPrice(item.snapshot_price)} / phần × {item.quantity}
                  </small>
                </div>
                <strong>
                  {formatPrice(item.snapshot_price * item.quantity)}
                </strong>
              </li>
            ))}
          </ul>
          <p className="order-snapshot-note">
            Tên và giá được lưu tại thời điểm đặt đơn, không thay đổi theo thực
            đơn hiện tại.
          </p>
          <div className="order-total">
            <span>Tổng tiền món</span>
            <strong>{formatPrice(order.total)}</strong>
          </div>
          <p>Phương thức đã chọn: thanh toán khi nhận hàng (COD).</p>
          <Link
            className="order-back"
            to={`/restaurants/${order.restaurant_id}`}
          >
            Xem quán và thực đơn hiện tại
          </Link>
        </div>
        <aside className="order-delivery">
          <h2>Giao đến</h2>
          <p>{order.delivery_address}</p>
          <p className="order-coordinates">
            Tọa độ đã xác nhận: {order.latitude}, {order.longitude}
          </p>
          <OrderTimeline order={order} />
        </aside>
      </div>
      {order.status === "pending" && (
        <section className="order-cancel">
          <h2>Cần thay đổi kế hoạch?</h2>
          <p>Bạn có thể hủy khi quán chưa xác nhận đơn.</p>
          <button
            className="order-cancel-button"
            disabled={
              state.cancelling || state.refreshing || Boolean(state.error)
            }
            onClick={() => setConfirm(true)}
          >
            {state.cancelling ? "Đang hủy đơn…" : "Hủy đơn hàng"}
          </button>
        </section>
      )}
      {confirm && order.status === "pending" && (
        <CancelOrderDialog
          id={order.id}
          onCancel={() => setConfirm(false)}
          onConfirm={() => {
            setConfirm(false);
            void state.cancel();
          }}
        />
      )}
    </>
  );
}

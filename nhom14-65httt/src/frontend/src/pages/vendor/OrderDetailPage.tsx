import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage } from "../../api/client";
import type { OrderDetail, OrderStatus } from "../../types/order";
import VendorOrderActions from "../../components/order/VendorOrderActions";
import { Link, useParams } from "react-router-dom";
import { getVendorOrder } from "../../api/vendor";
import { useAuth } from "../../hooks/useAuth";
import { usePublicData } from "../../hooks/usePublicData";
import { formatPrice, routeEntityId } from "../../utils/catalog";
import { orderTime } from "../../utils/orders";
import OrderError from "../../components/order/OrderError";
import OrderStatusBadge from "../../components/order/OrderStatusBadge";
import OrderTimeline from "../../components/order/OrderTimeline";
import "../customer/orders.css";
import "./orders.css";

export default function OrderDetailPage() {
  const { user } = useAuth();
  const { id } = useParams();
  const parsed = routeEntityId(id ?? "");
  return (
    <section className="orders-page">
      <Link className="order-back" to="/vendor/orders">
        ← Đơn hàng của quán
      </Link>
      {parsed === null ? (
        <h1>Mã đơn không hợp lệ</h1>
      ) : (
        user && <Detail key={`${user.id}-${parsed}`} id={parsed} />
      )}
    </section>
  );
}
function Detail({ id }: { id: number }) {
  const load = useCallback(
    async (signal: AbortSignal) => {
      const order = await getVendorOrder(id, { signal });
      if (!order || order.id !== id)
        throw new Error("Chưa nhận được đơn hàng hợp lệ.");
      return order;
    },
    [id],
  );
  const result = usePublicData(load);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const lock = useRef(false);
  const active = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  async function submit(run: () => Promise<OrderDetail>, target: OrderStatus) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setMessage("");
    try {
      const updated = await run();
      if (!active.current) return;
      if (
        !updated ||
        updated.id !== id ||
        updated.restaurant_id !== result.data?.restaurant_id ||
        updated.status !== target
      )
        throw new Error("Chưa xác nhận được kết quả xử lý đơn.");
      setMessage("Máy chủ đã ghi nhận thao tác. Đang đọc lại trạng thái đơn.");
    } catch (error) {
      if (active.current)
        setMessage(
          `${errorMessage(error)} Đơn sẽ được đọc lại để kiểm tra trạng thái hiện tại.`,
        );
    } finally {
      lock.current = false;
      if (active.current) {
        setBusy(false);
        result.retry();
      }
    }
  }
  if (result.loading) return <p role="status">Đang tải đơn hàng…</p>;
  if (result.error)
    return (
      <OrderError
        error={result.error}
        retry={result.retry}
        listPath="/vendor/orders"
      />
    );
  const order = result.data;
  if (!order) return null;
  return (
    <>
      <header className="order-detail-heading">
        <div>
          <span className="eyebrow">VỊ VIỆT · ĐƠN TẠI QUÁN</span>
          <h1>Đơn #{order.id}</h1>
          <p>Đặt lúc {orderTime(order.created_at)} · Giờ Việt Nam</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </header>
      <div className="order-update">
        <p>Bấm cập nhật để xem trạng thái mới nhất.</p>
        <button
          className="order-refresh"
          disabled={busy}
          onClick={result.retry}
        >
          Cập nhật trạng thái
        </button>
      </div>
      {message && (
        <p role="status" className="order-message">
          {message}
        </p>
      )}
      <VendorOrderActions
        key={order.status}
        order={order}
        busy={busy}
        submit={(run, target) => void submit(run, target)}
      />
      <div className="order-detail-layout">
        <div className="order-snapshot">
          <h2>Món khách đã đặt</h2>
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
          <p>Thanh toán khi nhận hàng (COD).</p>
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
    </>
  );
}

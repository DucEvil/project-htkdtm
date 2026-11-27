import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { createOrder, listOrders } from "../../api/orders";
import { getMenuItem } from "../../api/menu";
import { ApiError, errorMessage } from "../../api/client";
import { useAuth } from "../../hooks/useAuth";
import { useCart } from "../../hooks/useCart";
import { useIdempotency } from "../../hooks/useIdempotency";
import type { CheckoutDraft } from "../../utils/checkout";
import type { OrderCreate, OrderDetail } from "../../types/order";
import { formatPrice } from "../../utils/catalog";
import { orderStatusLabels, orderTime } from "../../utils/orders";
import CheckoutForm from "../../components/cart/CheckoutForm";
import "./checkout.css";
import "./search.css";

export default function CheckoutPage() {
  const { user } = useAuth();
  return user ? <CheckoutContent key={user.id} userId={user.id} /> : null;
}

function CheckoutContent({ userId }: { userId: number }) {
  const cart = useCart();
  const retry = useIdempotency(userId);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [code, setCode] = useState("");
  const [receipt, setReceipt] = useState<OrderDetail | null>(null);
  const [recent, setRecent] = useState<OrderDetail[] | null>(null);
  const [checking, setChecking] = useState(false);
  const [priceChange, setPriceChange] = useState<{
    id: number;
    old: number;
    current: number;
  } | null>(null);
  const active = useRef(true),
    locked = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);

  async function send(payload: OrderCreate) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setMessage("");
    setCode("");
    try {
      const order = await createOrder(payload);
      if (
        !order ||
        !Number.isInteger(order.id) ||
        order.id <= 0 ||
        order.restaurant_id !== payload.restaurant_id ||
        !Number.isInteger(order.total) ||
        order.total <= 0 ||
        !Object.prototype.hasOwnProperty.call(
          orderStatusLabels,
          order.status,
        ) ||
        !Array.isArray(order.items) ||
        !order.items.length ||
        order.items.some(
          (item) =>
            !Number.isInteger(item.quantity) ||
            item.quantity < 1 ||
            !Number.isInteger(item.snapshot_price) ||
            item.snapshot_price <= 0 ||
            typeof item.snapshot_name !== "string",
        )
      ) {
        throw new Error("Phản hồi chưa xác nhận được đơn hợp lệ.");
      }
      if (!active.current) return;
      setReceipt(order);
      retry.release();
      const sameCart =
        cart.items.length === payload.items.length &&
        cart.items.every(
          (item) =>
            item.restaurant_id === payload.restaurant_id &&
            payload.items.some(
              (line) =>
                line.menu_item_id === item.menu_item_id &&
                line.quantity === item.quantity &&
                line.expected_price === item.price,
            ),
        );
      if (sameCart) cart.clear();
    } catch (error) {
      if (!active.current) return;
      setMessage(errorMessage(error));
      const nextCode = error instanceof ApiError ? error.code : "UNCERTAIN";
      setCode(nextCode);
      // Chỉ mở chỉnh sửa khi backend xác nhận lỗi nghiệp vụ không tạo đơn.
      if (
        error instanceof ApiError &&
        [400, 404, 409, 422].includes(error.status) &&
        !["IDEMPOTENCY_CONFLICT", "IDEMPOTENCY_EXPIRED"].includes(error.code)
      ) {
        retry.release();
        if (error.code === "ORDER_PRICE_CHANGED") {
          const detail = error.details as {
            menu_item_id?: unknown;
            current_price?: unknown;
          } | null;
          const item = cart.items.find(
            (entry) => entry.menu_item_id === detail?.menu_item_id,
          );
          if (item && typeof detail?.current_price === "number")
            setPriceChange({
              id: item.menu_item_id,
              old: item.price,
              current: detail.current_price,
            });
        }
      }
    } finally {
      locked.current = false;
      if (active.current) setBusy(false);
    }
  }
  function submit(draft: CheckoutDraft) {
    if (locked.current || priceChange) return;
    try {
      void send(retry.prepare(draft));
    } catch (error) {
      setMessage(errorMessage(error));
    }
  }
  async function acceptPrice() {
    if (!priceChange || checking) return;
    setChecking(true);
    try {
      const item = await getMenuItem(priceChange.id);
      if (!active.current) return;
      if (item.price !== priceChange.current) {
        setPriceChange({ ...priceChange, current: item.price });
        setMessage("Giá vừa thay đổi thêm. Hãy xem và xác nhận lại.");
        return;
      }
      cart.updatePrice(item.id, item.price);
      setPriceChange(null);
      setCode("");
      setMessage(
        "Đã cập nhật giá trong giỏ. Hãy kiểm tra lại tổng và bấm đặt đơn khi bạn đồng ý.",
      );
    } catch (error) {
      if (active.current) setMessage(errorMessage(error));
    } finally {
      if (active.current) setChecking(false);
    }
  }
  async function checkOrders() {
    if (checking) return;
    setChecking(true);
    try {
      const orders = await listOrders({ limit: 20 });
      if (active.current) setRecent(orders);
    } catch (error) {
      if (active.current) setMessage(errorMessage(error));
    } finally {
      if (active.current) setChecking(false);
    }
  }

  if (receipt)
    return (
      <section className="checkout-page">
        <div className="checkout-receipt">
          <span className="eyebrow">VỊ VIỆT · ĐƠN HÀNG</span>
          <h1>Đã ghi nhận đơn #{receipt.id}</h1>
          <p role="status">
            Đơn đã được máy chủ ghi nhận. Thanh toán khi nhận hàng.
          </p>
          <p>
            Trạng thái từ máy chủ:{" "}
            <strong>{orderStatusLabels[receipt.status]}</strong>
          </p>
          <ul>
            {receipt.items.map((item) => (
              <li key={item.menu_item_id}>
                {item.snapshot_name} × {item.quantity}
                <strong>
                  {formatPrice(item.snapshot_price * item.quantity)}
                </strong>
              </li>
            ))}
          </ul>
          <p>Giao đến: {receipt.delivery_address}</p>
          <p className="checkout-total">
            Tổng tiền: {formatPrice(receipt.total)}
          </p>
          <Link className="button" to="/search">
            Tiếp tục tìm món
          </Link>
          <Link className="cart-inline-link" to="/cart">
            Về giỏ hàng
          </Link>
        </div>
      </section>
    );
  if (!cart.items.length && !retry.intent)
    return (
      <section className="checkout-page">
        <h1>Chưa có món để đặt</h1>
        <p>Hãy chọn món và thêm vào giỏ trước nhé.</p>
        <Link className="button" to="/search">
          Tìm món
        </Link>
      </section>
    );
  const pending = retry.intent;
  const total = pending
    ? pending.items.reduce(
        (sum, item) => sum + item.expected_price * item.quantity,
        0,
      )
    : cart.total;
  return (
    <section className="checkout-page" aria-labelledby="checkout-heading">
      <Link className="cart-inline-link" to="/cart">
        ← Kiểm tra giỏ hàng
      </Link>
      <span className="eyebrow">XÁC NHẬN BỮA NGON</span>
      <h1 id="checkout-heading">Đặt hàng, thanh toán khi nhận</h1>
      <p>Kiểm tra món, địa chỉ và điểm giao trước khi gửi đơn tới quán.</p>
      {message && (
        <p
          role="alert"
          className={priceChange || code ? "checkout-error" : "cart-success"}
        >
          {message}
        </p>
      )}
      {!retry.durable && (
        <p role="alert" className="checkout-error">
          Trình duyệt không cho lưu yêu cầu chờ. Hãy giữ trang này mở và thử lại
          cùng đơn để tránh tạo trùng.
        </p>
      )}
      <div className="checkout-layout">
        <div>
          <div hidden={Boolean(pending) || Boolean(priceChange)}>
            <CheckoutForm onSubmit={submit} busy={busy} />
          </div>
          {priceChange && (
            <section className="checkout-panel">
              <h2>Giá món đã thay đổi</h2>
              <p>
                Giá trong giỏ: {formatPrice(priceChange.old)}. Giá mới:{" "}
                <strong>{formatPrice(priceChange.current)}</strong>.
              </p>
              <button
                className="button"
                disabled={checking}
                onClick={() => void acceptPrice()}
              >
                {checking ? "Đang kiểm tra giá…" : "Đồng ý cập nhật giá"}
              </button>
              <p>Cập nhật giá chưa gửi đơn; bạn sẽ xác nhận đặt lại sau đó.</p>
            </section>
          )}
          {pending && (
            <section className="checkout-panel">
              <h2>
                {busy
                  ? "Đang gửi đơn của bạn…"
                  : "Yêu cầu đặt đơn đang chờ xác nhận"}
              </h2>
              <p>Địa chỉ: {pending.delivery_address}</p>
              <p>
                Tọa độ giao: {pending.latitude}, {pending.longitude}
              </p>
              <p>
                Giữ nguyên nội dung khi thử lại để máy chủ nhận ra cùng một đơn.
                Không tự đặt đơn mới khi chưa biết kết quả lần trước.
              </p>
              {!["IDEMPOTENCY_EXPIRED", "IDEMPOTENCY_CONFLICT"].includes(
                code,
              ) && (
                <button
                  className="button"
                  disabled={busy}
                  onClick={() => void send(pending)}
                >
                  {busy ? "Đang gửi đơn…" : "Thử lại cùng đơn"}
                </button>
              )}
              <button
                type="button"
                className="checkout-review-button"
                disabled={busy || checking}
                onClick={() => void checkOrders()}
              >
                {checking ? "Đang kiểm tra…" : "Kiểm tra các đơn gần đây"}
              </button>
              {recent && (
                <div>
                  <h3>20 đơn gần nhất</h3>
                  {!recent.length ? (
                    <p>Chưa có đơn trong danh sách trả về.</p>
                  ) : (
                    <ul>
                      {recent.map((order) => (
                        <li key={order.id}>
                          #{order.id} · {order.delivery_address} ·{" "}
                          {formatPrice(order.total)}
                          <small>
                            {orderTime(order.created_at)} ·{" "}
                            {orderStatusLabels[order.status]}
                          </small>
                          <small>
                            {order.items
                              .map(
                                (item) =>
                                  `${item.snapshot_name} × ${item.quantity}`,
                              )
                              .join(", ")}
                          </small>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p>
                    Danh sách này không tự xác định đơn nào thuộc lần gửi đang
                    chờ. Nếu muốn đặt mới, hãy kiểm tra kỹ trước khi bỏ yêu cầu
                    cũ.
                  </p>
                  <button
                    type="button"
                    className="checkout-review-button"
                    onClick={() => {
                      if (
                        window.confirm(
                          "Bạn đã kiểm tra các đơn gần đây? Bỏ yêu cầu chờ và đặt lại có thể tạo thêm đơn nếu lần trước đã thành công.",
                        )
                      ) {
                        retry.release();
                        setCode("");
                        setMessage("");
                        setRecent(null);
                      }
                    }}
                  >
                    Tôi đã kiểm tra, bỏ yêu cầu chờ
                  </button>
                </div>
              )}
            </section>
          )}
        </div>
        <aside className="checkout-summary">
          <h2>Đơn của bạn</h2>
          {pending ? (
            <ul>
              {pending.items.map((item) => (
                <li key={item.menu_item_id}>
                  {cart.items.find(
                    (line) => line.menu_item_id === item.menu_item_id,
                  )?.name ?? "Món đã chọn"}{" "}
                  × {item.quantity}
                  <strong>
                    {formatPrice(item.expected_price * item.quantity)}
                  </strong>
                </li>
              ))}
            </ul>
          ) : (
            <ul>
              {cart.items.map((item) => (
                <li key={item.menu_item_id}>
                  {item.name} × {item.quantity}
                  <strong>{formatPrice(item.price * item.quantity)}</strong>
                </li>
              ))}
            </ul>
          )}
          <p className="checkout-total">{formatPrice(total)}</p>
          <p>
            Thanh toán khi nhận hàng (COD). Bản mẫu chưa tính phí giao hàng
            riêng.
          </p>
          <p>Máy chủ kiểm tra giá, giờ mở và phạm vi giao trước khi tạo đơn.</p>
        </aside>
      </div>
    </section>
  );
}

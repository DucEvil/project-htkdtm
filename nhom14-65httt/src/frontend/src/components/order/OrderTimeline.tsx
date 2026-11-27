import type { OrderDetail } from "../../types/order";
import { orderStatusLabels, orderTime } from "../../utils/orders";

export default function OrderTimeline({ order }: { order: OrderDetail }) {
  return (
    <section className="order-timeline" aria-labelledby="timeline-heading">
      <h2 id="timeline-heading">Lịch sử xử lý</h2>
      {!order.history.length ? (
        <p>Chưa có lịch sử được trả về.</p>
      ) : (
        <ol>
          {order.history.map((entry, index) => (
            <li key={`${entry.created_at}-${entry.status}-${index}`}>
              <span className="timeline-dot" aria-hidden="true" />
              <div>
                <strong>{orderStatusLabels[entry.status]}</strong>
                <time dateTime={entry.created_at}>
                  {orderTime(entry.created_at)}
                </time>
                {entry.reason && (
                  <p className="order-reason">Lý do: {entry.reason}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

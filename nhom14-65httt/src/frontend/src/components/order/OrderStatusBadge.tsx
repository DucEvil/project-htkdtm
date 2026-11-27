import type { OrderStatus } from "../../types/order";
import { orderStatusLabels } from "../../utils/orders";

export default function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span aria-live="polite" className={`order-status order-status-${status}`}>
      {orderStatusLabels[status]}
    </span>
  );
}

import { useState } from "react";
import type { OrderDetail, OrderStatus } from "../../types/order";
import * as vendor from "../../api/vendor";

const actions = {
  pending: {
    label: "Nhận đơn",
    target: "confirmed",
    run: (id: number) => vendor.confirmVendorOrder(id),
  },
  confirmed: {
    label: "Bắt đầu chuẩn bị",
    target: "preparing",
    run: (id: number) => vendor.prepareVendorOrder(id),
  },
  preparing: {
    label: "Bắt đầu giao hàng",
    target: "delivering",
    run: (id: number) => vendor.deliverVendorOrder(id),
  },
  delivering: {
    label: "Xác nhận hoàn tất",
    target: "completed",
    run: (id: number) => vendor.completeVendorOrder(id),
  },
} as const;

export default function VendorOrderActions({
  order,
  busy,
  submit,
}: {
  order: OrderDetail;
  busy: boolean;
  submit: (run: () => Promise<OrderDetail>, target: OrderStatus) => void;
}) {
  const [choice, setChoice] = useState<"next" | "reject" | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  if (!(order.status in actions)) return null;
  const action = actions[order.status as keyof typeof actions];
  return (
    <section className="order-cancel" aria-labelledby="vendor-actions-heading">
      <h2 id="vendor-actions-heading">Xử lý đơn hàng</h2>
      {choice === null ? (
        <div className="vendor-order-buttons">
          <button
            className="button"
            disabled={busy}
            onClick={() => setChoice("next")}
          >
            {action.label}
          </button>
          {order.status === "pending" && (
            <button
              className="order-cancel-button"
              disabled={busy}
              onClick={() => setChoice("reject")}
            >
              Từ chối đơn
            </button>
          )}
        </div>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (busy) return;
            if (
              choice === "reject" &&
              (!reason.trim() || reason.trim().length > 500)
            ) {
              setError("Nhập lý do từ chối từ 1 đến 500 ký tự.");
              return;
            }
            submit(
              choice === "reject"
                ? () => vendor.rejectVendorOrder(order.id, reason.trim())
                : () => action.run(order.id),
              choice === "reject" ? "rejected" : action.target,
            );
          }}
        >
          <p>
            {choice === "reject"
              ? "Bạn muốn từ chối đơn này? Lý do sẽ được lưu trong lịch sử đơn."
              : `Xác nhận: ${action.label.toLowerCase()} cho đơn #${order.id}?`}
          </p>
          {choice === "next" && order.status === "delivering" && (
            <p>Chỉ hoàn tất sau khi đã giao hàng và xác nhận thanh toán COD.</p>
          )}
          {choice === "reject" && (
            <>
              <label htmlFor="vendor-reject-reason">Lý do từ chối</label>
              <textarea
                id="vendor-reject-reason"
                autoFocus
                maxLength={500}
                disabled={busy}
                value={reason}
                onChange={(event) => {
                  setReason(event.target.value);
                  setError("");
                }}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "vendor-reject-error" : undefined}
              />
              {error && (
                <p id="vendor-reject-error" role="alert">
                  {error}
                </p>
              )}
            </>
          )}
          <div className="vendor-order-buttons">
            <button className="button" disabled={busy} type="submit">
              {busy ? "Đang xử lý…" : "Xác nhận thao tác"}
            </button>
            <button
              className="order-refresh"
              type="button"
              disabled={busy}
              onClick={() => {
                setChoice(null);
                setError("");
              }}
            >
              Quay lại
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

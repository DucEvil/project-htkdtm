import { useEffect, useRef } from "react";

export default function CancelOrderDialog({
  id,
  onCancel,
  onConfirm,
}: {
  id: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const trigger =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      className="order-dialog"
      ref={ref}
      aria-labelledby="cancel-order-title"
      onCancel={onCancel}
    >
      <span className="eyebrow">XÁC NHẬN CỦA BẠN</span>
      <h2 id="cancel-order-title">Hủy đơn #{id}?</h2>
      <p>
        Chỉ hủy được khi quán chưa xác nhận. Nếu quán vừa nhận đơn, máy chủ sẽ
        giữ trạng thái mới và từ chối yêu cầu hủy.
      </p>
      <div className="order-dialog-actions">
        <button
          type="button"
          className="button secondary"
          autoFocus
          onClick={onCancel}
        >
          Giữ đơn hàng
        </button>
        <button type="button" className="button" onClick={onConfirm}>
          Xác nhận hủy đơn
        </button>
      </div>
    </dialog>
  );
}

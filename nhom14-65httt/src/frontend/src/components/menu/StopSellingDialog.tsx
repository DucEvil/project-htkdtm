import { useEffect, useRef } from "react";

export default function StopSellingDialog({
  name,
  onCancel,
  onConfirm,
}: {
  name: string;
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
      ref={ref}
      className="vendor-menu-dialog"
      aria-labelledby="stop-selling-title"
      onCancel={onCancel}
    >
      <span className="eyebrow">ĐIỀU CHỈNH THỰC ĐƠN</span>
      <h2 id="stop-selling-title">Ngừng bán món này?</h2>
      <p>
        <strong>{name}</strong> sẽ ngừng xuất hiện trong thực đơn công khai. Món
        vẫn được giữ trong danh sách quản lý để bạn bật bán lại; các đơn đã mua
        giữ thông tin lúc đặt.
      </p>
      <div>
        <button
          type="button"
          className="button secondary"
          autoFocus
          onClick={onCancel}
        >
          Giữ bán món
        </button>
        <button type="button" className="button" onClick={onConfirm}>
          Xác nhận ngừng bán
        </button>
      </div>
    </dialog>
  );
}

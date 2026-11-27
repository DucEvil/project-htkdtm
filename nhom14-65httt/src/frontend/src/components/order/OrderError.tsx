import { Link } from "react-router-dom";
import { ApiError, errorMessage } from "../../api/client";

export default function OrderError({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  const missing = error instanceof ApiError && error.status === 404;
  return (
    <div className="order-empty">
      <h2>{missing ? "Chưa tìm thấy đơn hàng" : "Chưa tải được đơn hàng"}</h2>
      <p role="alert">
        {missing
          ? "Đơn không tồn tại hoặc bạn không có quyền xem."
          : errorMessage(error)}
      </p>
      <div className="order-actions">
        {!missing && retry && (
          <button className="button" onClick={retry}>
            Thử lại
          </button>
        )}
        <Link to="/orders">Về danh sách đơn</Link>
      </div>
    </div>
  );
}

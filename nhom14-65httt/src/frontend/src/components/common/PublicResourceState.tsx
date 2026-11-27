import { Link } from "react-router-dom";
import { ApiError, errorMessage } from "../../api/client";

export default function PublicResourceState({
  error,
  retry,
  name,
}: {
  error: unknown;
  retry?: () => void;
  name: string;
}) {
  const missing = error instanceof ApiError && error.status === 404;
  return (
    <div className="catalog-state">
      <h2>{missing ? `Chưa tìm thấy ${name}` : `Chưa tải được ${name}`}</h2>
      <p role="alert">
        {missing
          ? "Nội dung không tồn tại hoặc hiện chưa được công khai."
          : errorMessage(error)}
      </p>
      <div className="catalog-actions">
        {!missing && retry && (
          <button type="button" className="button" onClick={retry}>
            Thử lại
          </button>
        )}
        <Link to="/search">Về tìm kiếm</Link>
      </div>
    </div>
  );
}

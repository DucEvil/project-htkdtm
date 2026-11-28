import { useCallback } from "react";
import { Link } from "react-router-dom";
import { getVendorRestaurant } from "../../api/vendor";
import { ApiError, errorMessage } from "../../api/client";
import { useAuth } from "../../hooks/useAuth";
import { usePublicData } from "../../hooks/usePublicData";
import {
  isProfileResponse,
  profileStatusLabels,
} from "../../utils/vendorProfileValidation";
import "./menu.css";

export default function DashboardPage() {
  const { user } = useAuth();
  return user ? <Dashboard key={user.id} /> : null;
}
function Dashboard() {
  const load = useCallback(async (signal: AbortSignal) => {
    const profile = await getVendorRestaurant({ signal });
    if (
      !isProfileResponse(profile) ||
      typeof profile.can_receive_orders !== "boolean" ||
      typeof profile.is_open !== "boolean"
    )
      throw new Error("Chưa nhận được hồ sơ quán hợp lệ.");
    return profile;
  }, []);
  const result = usePublicData(load);
  const missing =
    result.error instanceof ApiError &&
    result.error.status === 404 &&
    result.error.code === "NOT_FOUND";
  const profile = result.data;
  return (
    <section className="vendor-menu-page">
      <Link className="vendor-menu-back" to="/vendor">
        ← Tài khoản chủ quán
      </Link>
      <span className="eyebrow">VỊ VIỆT · QUÁN CỦA BẠN</span>
      <h1>Tổng quan quán</h1>
      <p>Theo dõi tình trạng phục vụ và mở công việc cần xử lý.</p>
      <button
        className="vendor-menu-secondary"
        disabled={result.loading}
        onClick={result.retry}
      >
        Cập nhật tình trạng quán
      </button>
      {result.loading ? (
        <p role="status">Đang tải tổng quan…</p>
      ) : missing ? (
        <div className="vendor-menu-panel">
          <h2>Bắt đầu với hồ sơ quán</h2>
          <p>
            Tài khoản chưa liên kết quán. Hãy tạo hồ sơ để chuẩn bị thực đơn và
            gửi duyệt.
          </p>
          <Link className="button" to="/vendor/profile">
            Tạo hồ sơ quán
          </Link>
        </div>
      ) : result.error ? (
        <div className="vendor-menu-panel">
          <h2>Chưa tải được tình trạng quán</h2>
          <p role="alert">{errorMessage(result.error)}</p>
        </div>
      ) : (
        profile && (
          <div className="vendor-menu-panel">
            <span className="eyebrow">
              {profileStatusLabels[profile.status]}
            </span>
            <h2>{profile.name}</h2>
            <p>{profile.address}</p>
            <p className="vendor-menu-price">
              {profile.can_receive_orders
                ? "Đang có thể nhận đơn"
                : "Hiện chưa thể nhận đơn mới"}
            </p>
            <p>
              {profile.status === "pending"
                ? "Hồ sơ đang chờ quản trị viên duyệt. Bạn vẫn có thể chuẩn bị thực đơn."
                : profile.status === "suspended"
                  ? "Quán đang tạm ngừng. Hãy tiếp tục xử lý các đơn đã nhận và liên hệ quản trị viên để kiểm tra."
                  : !profile.accepting_orders
                    ? "Quán đã được duyệt. Bật nhận đơn trong hồ sơ khi sẵn sàng phục vụ."
                    : !profile.is_open
                      ? "Quán đang ngoài giờ phục vụ đã khai báo."
                      : "Trạng thái nhận đơn được cập nhật theo thông tin máy chủ."}
            </p>
            <p>
              Giờ Việt Nam:{" "}
              {profile.opens_at === profile.closes_at
                ? "Cả ngày"
                : `${profile.opens_at}–${profile.closes_at}${profile.opens_at > profile.closes_at ? " (qua đêm)" : ""}`}{" "}
              · Phạm vi giao {profile.delivery_radius_km} km
            </p>
          </div>
        )
      )}
      <div className="vendor-menu-grid">
        <article className="vendor-menu-card">
          <h2>Hồ sơ và giờ phục vụ</h2>
          <p>Cập nhật địa chỉ, phạm vi giao và trạng thái nhận đơn.</p>
          <Link className="vendor-menu-back" to="/vendor/profile">
            Quản lý hồ sơ quán
          </Link>
        </article>
        <article className="vendor-menu-card">
          <h2>Thực đơn và nguyên liệu</h2>
          <p>Chuẩn bị món, giá bán và thành phần thực tế tại quán.</p>
          <Link className="vendor-menu-back" to="/vendor/menu">
            Quản lý thực đơn
          </Link>
        </article>
        <article className="vendor-menu-card">
          <h2>Đơn hàng cần xử lý</h2>
          <p>Xem danh sách đơn để nhận, chuẩn bị, giao và hoàn tất.</p>
          <Link className="vendor-menu-back" to="/vendor/orders">
            Mở đơn hàng của quán
          </Link>
        </article>
      </div>
    </section>
  );
}

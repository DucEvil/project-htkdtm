import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  listVendorMenuItems,
  stopSellingVendorMenuItem,
} from "../../api/vendor";
import { ApiError, errorMessage } from "../../api/client";
import { useAuth } from "../../hooks/useAuth";
import { usePublicData as useRemoteData } from "../../hooks/usePublicData";
import type { MenuItemDetail } from "../../types/menu";
import { formatPrice } from "../../utils/catalog";
import StopSellingDialog from "../../components/menu/StopSellingDialog";
import "./menu.css";

export default function MenuManagePage() {
  const { user } = useAuth();
  return user ? <MenuList key={user.id} /> : null;
}
function MenuList() {
  const [offset, setOffset] = useState(0);
  const load = useCallback(
    (signal: AbortSignal) =>
      listVendorMenuItems({ offset, limit: 12 }, { signal }),
    [offset],
  );
  const result = useRemoteData(load);
  const [selected, setSelected] = useState<MenuItemDetail | null>(null);
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const active = useRef(false),
    lock = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  async function stop(item: MenuItemDetail) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setMessage("");
    setSuccess(false);
    try {
      await stopSellingVendorMenuItem(item.id);
      if (!active.current) return;
      setMessage(`Đã ngừng bán ${item.name}.`);
      setSuccess(true);
    } catch (error) {
      if (!active.current) return;
      setMessage(
        `${errorMessage(error)} Danh sách sẽ được đọc lại để kiểm tra trạng thái hiện tại.`,
      );
    } finally {
      lock.current = false;
      if (active.current) {
        setBusy(false);
        result.retry();
      }
    }
  }
  const noProfile =
    result.error instanceof ApiError &&
    result.error.status === 404 &&
    result.error.code === "NOT_FOUND";
  return (
    <section className="vendor-menu-page">
      <Link className="vendor-menu-back" to="/vendor">
        ← Tài khoản chủ quán
      </Link>
      <span className="eyebrow">MÓN NGON TỪ QUÁN CỦA BẠN</span>
      <h1>Quản lý thực đơn</h1>
      <p>Tên, giá và nguyên liệu rõ ràng cho từng món đang phục vụ.</p>
      <div className="vendor-menu-toolbar">
        {result.data && (
          <Link className="button" to="/vendor/menu/new">
            Thêm món mới
          </Link>
        )}
        <button
          className="vendor-menu-secondary"
          disabled={result.loading || busy}
          onClick={result.retry}
        >
          Làm mới thực đơn
        </button>
        <Link to="/vendor/profile">Hồ sơ quán</Link>
      </div>
      {message && (
        <p
          className={success ? "vendor-menu-success" : "vendor-menu-error"}
          role={success ? "status" : "alert"}
        >
          {message}
        </p>
      )}
      {busy && <p role="status">Đang cập nhật trạng thái món…</p>}
      {result.loading ? (
        <p role="status">Đang tải thực đơn…</p>
      ) : result.error ? (
        <div className="vendor-menu-panel">
          <h2>
            {noProfile ? "Chưa có quán liên kết" : "Chưa tải được thực đơn"}
          </h2>
          <p className="vendor-menu-error" role="alert">
            {errorMessage(result.error)}
          </p>
          {noProfile ? (
            <Link className="button" to="/vendor/profile">
              Mở hồ sơ quán
            </Link>
          ) : (
            <button className="button" onClick={result.retry}>
              Thử lại
            </button>
          )}
        </div>
      ) : (
        result.data && (
          <>
            <p className="vendor-menu-hint">
              {result.data.total} món trong thực đơn quản lý, gồm cả món ngừng
              bán.
            </p>
            {!result.data.items.length ? (
              <div className="vendor-menu-panel">
                <h2>
                  {offset ? "Trang này chưa có món" : "Thực đơn đang trống"}
                </h2>
                <p>
                  {offset
                    ? "Danh sách có thể đã thay đổi. Hãy quay về trang trước."
                    : "Bắt đầu bằng món đầu tiên của quán."}
                </p>
              </div>
            ) : (
              <div className="vendor-menu-grid">
                {result.data.items.map((item) => (
                  <article className="vendor-menu-card" key={item.id}>
                    <div className="vendor-menu-card-top">
                      <span
                        className={`vendor-selling ${item.is_available ? "selling" : "stopped"}`}
                      >
                        {item.is_available
                          ? "Đang cho phép bán"
                          : "Đã ngừng bán"}
                      </span>
                      <span>{item.canonical_dish.region}</span>
                    </div>
                    <h2>{item.name}</h2>
                    <p className="vendor-menu-price">
                      {formatPrice(item.price)}
                    </p>
                    <p>Món chuẩn: {item.canonical_dish.name}</p>
                    <p className="vendor-menu-hint">
                      {item.ingredients.length} nguyên liệu ·{" "}
                      {item.ingredients_verified
                        ? "Quán đã xác nhận"
                        : "Chưa xác nhận"}
                    </p>
                    <div className="vendor-menu-card-actions">
                      <Link
                        to={`/vendor/menu/${item.id}/edit`}
                        aria-label={`Sửa món ${item.name}`}
                      >
                        Chỉnh sửa món ↗
                      </Link>
                      {item.is_available && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setSelected(item)}
                          aria-label={`Ngừng bán ${item.name}`}
                        >
                          Ngừng bán
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
            {(result.data.total > 12 || offset > 0) && (
              <nav
                className="vendor-menu-pagination"
                aria-label="Phân trang thực đơn quản lý"
              >
                <button
                  disabled={!offset || busy}
                  onClick={() => setOffset((value) => Math.max(0, value - 12))}
                >
                  Trang trước
                </button>
                <span>Trang {offset / 12 + 1}</span>
                <button
                  disabled={
                    offset + result.data.limit >= result.data.total || busy
                  }
                  onClick={() => setOffset((value) => value + 12)}
                >
                  Trang sau
                </button>
              </nav>
            )}
          </>
        )
      )}
      {selected && (
        <StopSellingDialog
          name={selected.name}
          onCancel={() => setSelected(null)}
          onConfirm={() => {
            const item = selected;
            setSelected(null);
            void stop(item);
          }}
        />
      )}
    </section>
  );
}

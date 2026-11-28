import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Link } from "react-router-dom";
import {
  listAdminCanonicalDishes,
  createAdminCanonicalDish,
  updateAdminCanonicalDish,
  deleteAdminCanonicalDish,
} from "../../api/admin";
import { ApiError, errorMessage } from "../../api/client";
import { useAuth } from "../../hooks/useAuth";
import { usePublicData } from "../../hooks/usePublicData";
import type { CanonicalDishDetail } from "../../types/menu";
import "./restaurants.css";
import { dishPayload, emptyDishFeatures } from "../../utils/dishCatalog";

export default function DishCatalogPage() {
  const { user } = useAuth();
  return user ? <Catalog key={user.id} /> : null;
}
function Catalog() {
  const [offset, setOffset] = useState(0);
  const load = useCallback(
    (signal: AbortSignal) =>
      listAdminCanonicalDishes({ offset, limit: 12 }, { signal }),
    [offset],
  );
  const result = usePublicData(load);
  const [editing, setEditing] = useState<CanonicalDishDetail | null>(null);
  const [name, setName] = useState("");
  const [features, setFeatures] = useState(emptyDishFeatures);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [deleting, setDeleting] = useState<CanonicalDishDetail | null>(null);
  const active = useRef(false),
    lock = useRef(false),
    input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  function reset() {
    setEditing(null);
    setName("");
    setFeatures(emptyDishFeatures);
    setError("");
    setUncertain(false);
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (lock.current || uncertain) return;
    const cleaned = name.trim();
    if (!cleaned || [...cleaned].length > 180) {
      setError("Tên món chuẩn cần từ 1 đến 180 ký tự.");
      input.current?.focus();
      return;
    }
    let payload;
    try {
      payload = dishPayload(name, features);
    } catch (failure) {
      setError(errorMessage(failure));
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const saved = editing
        ? await updateAdminCanonicalDish(editing.id, payload)
        : await createAdminCanonicalDish(payload);
      if (!active.current) return;
      if (
        !saved ||
        !Number.isInteger(saved.id) ||
        saved.id <= 0 ||
        typeof saved.name !== "string" ||
        (editing && saved.id !== editing.id)
      )
        throw new Error("Chưa xác nhận được món chuẩn đã lưu.");
      setNotice(`Đã lưu món chuẩn ${saved.name}.`);
      reset();
      result.retry();
    } catch (failure) {
      if (!active.current) return;
      setError(errorMessage(failure));
      if (
        !editing &&
        !(
          failure instanceof ApiError &&
          [400, 403, 404, 409, 422].includes(failure.status)
        )
      )
        setUncertain(true);
    } finally {
      lock.current = false;
      if (active.current) setBusy(false);
    }
  }
  async function remove() {
    if (!deleting || lock.current) return;
    lock.current = true;
    setBusy(true);
    setNotice("");
    try {
      await deleteAdminCanonicalDish(deleting.id);
      if (active.current) {
        setNotice(`Đã xóa món chuẩn ${deleting.name}.`);
        if (editing?.id === deleting.id) reset();
      }
    } catch (failure) {
      if (active.current)
        setNotice(
          `${errorMessage(failure)} Danh sách sẽ được tải lại để đối chiếu.`,
        );
    } finally {
      lock.current = false;
      if (active.current) {
        setBusy(false);
        setDeleting(null);
        result.retry();
      }
    }
  }
  return (
    <section className="admin-restaurants">
      <Link className="admin-restaurants-back" to="/admin">
        ← Tài khoản quản trị
      </Link>
      <span className="eyebrow">VỊ VIỆT · DANH MỤC</span>
      <h1>Danh mục món chuẩn</h1>
      <p>
        Quản lý đặc trưng tham khảo dùng chung. Thành phần thực tế tại quán được
        khai báo riêng trong thực đơn.
      </p>
      <form className="admin-restaurant-card" onSubmit={save} noValidate>
        <fieldset disabled={busy || uncertain}>
          <legend>Đặc trưng món chuẩn</legend>
          {(
            [
              ["region", "Vùng miền"],
              ["method", "Cách chế biến"],
              ["source", "Mã nguồn dữ liệu (không bắt buộc)"],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label htmlFor={`dish-${key}`}>{label}</label>
              <input
                id={`dish-${key}`}
                value={features[key]}
                onChange={(event) =>
                  setFeatures((previous) => ({
                    ...previous,
                    [key]: event.target.value,
                  }))
                }
              />
            </div>
          ))}
          <label htmlFor="dish-spice">Mức cay</label>
          <select
            id="dish-spice"
            value={features.spice}
            onChange={(event) =>
              setFeatures((previous) => ({
                ...previous,
                spice: event.target.value,
              }))
            }
          >
            {[0, 1, 2, 3].map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
          {(
            [
              ["ingredients", "Nguyên liệu tham khảo"],
              ["labels", "Nhãn món"],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label htmlFor={`dish-${key}`}>{label} (mỗi dòng một mục)</label>
              <textarea
                id={`dish-${key}`}
                value={features[key]}
                onChange={(event) =>
                  setFeatures((previous) => ({
                    ...previous,
                    [key]: event.target.value,
                  }))
                }
              />
            </div>
          ))}
        </fieldset>
        <h2>{editing ? `Sửa món chuẩn #${editing.id}` : "Thêm món chuẩn"}</h2>
        <label htmlFor="dish-name">Tên món chuẩn</label>
        <input
          ref={input}
          id="dish-name"
          value={name}
          disabled={busy || uncertain}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "dish-error" : undefined}
          onChange={(event) => {
            setName(event.target.value);
            setError("");
          }}
        />
        <p>Tên được bỏ khoảng trắng đầu/cuối.</p>
        {error && (
          <p role="alert" id="dish-error">
            {error}
          </p>
        )}
        {uncertain && (
          <p role="alert">
            Lần gửi có thể đã lưu. Hãy tải lại và đối chiếu danh mục trước khi
            tạo tiếp để tránh trùng.
          </p>
        )}
        <div className="admin-restaurant-actions">
          <button className="button" disabled={busy || uncertain}>
            {busy ? "Đang xử lý…" : "Lưu món chuẩn"}
          </button>
          {(editing || uncertain) && (
            <button
              type="button"
              className="button secondary"
              disabled={busy}
              onClick={reset}
            >
              {uncertain ? "Đã đối chiếu, mở biểu mẫu mới" : "Hủy chỉnh sửa"}
            </button>
          )}
        </div>
      </form>
      {notice && <p role="status">{notice}</p>}
      <div className="admin-restaurant-filters">
        <button
          className="button"
          disabled={busy || result.loading}
          onClick={() => {
            setDeleting(null);
            result.retry();
          }}
        >
          Tải lại danh mục
        </button>
      </div>
      {result.loading ? (
        <p role="status">Đang tải món chuẩn…</p>
      ) : result.error ? (
        <p role="alert">
          {errorMessage(result.error)} Bạn có thể tải lại danh mục.
        </p>
      ) : (
        result.data && (
          <>
            <p>{result.data.total} món chuẩn trong danh mục</p>
            {!result.data.items.length && (
              <p>
                {offset
                  ? "Trang này không còn món chuẩn. Hãy quay lại trang trước."
                  : "Danh mục chưa có món chuẩn."}
              </p>
            )}
            <div className="admin-restaurant-grid">
              {result.data.items.map((item) => (
                <article key={item.id} className="admin-restaurant-card">
                  <h2>{item.name}</h2>
                  <p>
                    {item.region} · {item.method} · Mức cay {item.spice_level}
                  </p>
                  <p>
                    Nguyên liệu tham khảo:{" "}
                    {item.ingredients.join(", ") || "Chưa khai báo"}
                  </p>
                  <p>Nhãn: {item.labels.join(", ") || "Chưa có"}</p>
                  <p>
                    {item.is_simulated
                      ? "Dữ liệu mô phỏng"
                      : "Không gắn cờ mô phỏng"}
                  </p>
                  {deleting?.id === item.id ? (
                    <div className="admin-restaurant-confirm">
                      <h3>Xóa món chuẩn này?</h3>
                      <p>
                        Món chuẩn đang được món tham chiếu sẽ không thể xóa, kể
                        cả món đã ngừng bán.
                      </p>
                      <button
                        className="button"
                        disabled={busy}
                        onClick={() => void remove()}
                      >
                        Xác nhận xóa
                      </button>
                      <button
                        className="button secondary"
                        disabled={busy}
                        onClick={() => setDeleting(null)}
                      >
                        Giữ món chuẩn
                      </button>
                    </div>
                  ) : (
                    <div className="admin-restaurant-actions">
                      <button
                        className="button"
                        disabled={busy || uncertain}
                        onClick={() => {
                          setEditing(item);
                          setName(item.name);
                          setFeatures({
                            region: item.region,
                            method: item.method,
                            spice: String(item.spice_level),
                            ingredients: item.ingredients.join("\n"),
                            labels: item.labels.join("\n"),
                            source: item.source_id ?? "",
                          });
                          setError("");
                          setDeleting(null);
                          input.current?.focus();
                        }}
                      >
                        Sửa {item.name}
                      </button>
                      <button
                        className="button secondary"
                        disabled={busy || uncertain}
                        onClick={() => setDeleting(item)}
                      >
                        Xóa {item.name}
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
            {(offset > 0 || result.data.total > 12) && (
              <nav
                className="admin-restaurant-pagination"
                aria-label="Phân trang món chuẩn"
              >
                <button
                  disabled={busy || !offset}
                  onClick={() => {
                    setDeleting(null);
                    setOffset((value) => Math.max(0, value - 12));
                  }}
                >
                  Trang trước
                </button>
                <span>Trang {offset / 12 + 1}</span>
                <button
                  disabled={
                    busy || offset + result.data.limit >= result.data.total
                  }
                  onClick={() => {
                    setDeleting(null);
                    setOffset((value) => value + 12);
                  }}
                >
                  Trang sau
                </button>
              </nav>
            )}
          </>
        )
      )}
    </section>
  );
}

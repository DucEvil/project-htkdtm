import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Link } from "react-router-dom";
import {
  listAdminIngredients,
  createAdminIngredient,
  updateAdminIngredient,
  deleteAdminIngredient,
} from "../../api/admin";
import { ApiError, errorMessage } from "../../api/client";
import { useAuth } from "../../hooks/useAuth";
import { usePublicData } from "../../hooks/usePublicData";
import type { IngredientDetail } from "../../types/menu";
import "./restaurants.css";

export default function IngredientCatalogPage() {
  const { user } = useAuth();
  return user ? <Catalog key={user.id} /> : null;
}
function Catalog() {
  const [offset, setOffset] = useState(0);
  const load = useCallback(
    (signal: AbortSignal) =>
      listAdminIngredients({ offset, limit: 12 }, { signal }),
    [offset],
  );
  const result = usePublicData(load);
  const [editing, setEditing] = useState<IngredientDetail | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [deleting, setDeleting] = useState<IngredientDetail | null>(null);
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
    setError("");
    setUncertain(false);
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (lock.current || uncertain) return;
    const cleaned = name.trim().toLowerCase();
    if (!cleaned || [...cleaned].length > 100) {
      setError("Tên nguyên liệu cần từ 1 đến 100 ký tự.");
      input.current?.focus();
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const saved = editing
        ? await updateAdminIngredient(editing.id, { name: cleaned })
        : await createAdminIngredient({ name: cleaned });
      if (!active.current) return;
      if (
        !saved ||
        !Number.isInteger(saved.id) ||
        saved.id <= 0 ||
        typeof saved.name !== "string" ||
        (editing && saved.id !== editing.id)
      )
        throw new Error("Chưa xác nhận được nguyên liệu đã lưu.");
      setNotice(`Đã lưu nguyên liệu ${saved.name}.`);
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
      await deleteAdminIngredient(deleting.id);
      if (active.current) {
        setNotice(`Đã xóa nguyên liệu ${deleting.name}.`);
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
      <h1>Danh mục nguyên liệu</h1>
      <p>
        Chuẩn bị nguyên liệu dùng chung để chủ quán khai báo thành phần thực tế
        của món.
      </p>
      <form className="admin-restaurant-card" onSubmit={save} noValidate>
        <h2>
          {editing ? `Sửa nguyên liệu #${editing.id}` : "Thêm nguyên liệu"}
        </h2>
        <label htmlFor="ingredient-name">Tên nguyên liệu</label>
        <input
          ref={input}
          id="ingredient-name"
          value={name}
          disabled={busy || uncertain}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "ingredient-error" : undefined}
          onChange={(event) => {
            setName(event.target.value);
            setError("");
          }}
        />
        <p>Tên được chuẩn hóa thành chữ thường và bỏ khoảng trắng đầu/cuối.</p>
        {error && (
          <p role="alert" id="ingredient-error">
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
            {busy ? "Đang xử lý…" : "Lưu nguyên liệu"}
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
        <p role="status">Đang tải nguyên liệu…</p>
      ) : result.error ? (
        <p role="alert">
          {errorMessage(result.error)} Bạn có thể tải lại danh mục.
        </p>
      ) : (
        result.data && (
          <>
            <p>{result.data.total} nguyên liệu trong danh mục</p>
            {!result.data.items.length && (
              <p>
                {offset
                  ? "Trang này không còn nguyên liệu. Hãy quay lại trang trước."
                  : "Danh mục chưa có nguyên liệu."}
              </p>
            )}
            <div className="admin-restaurant-grid">
              {result.data.items.map((item) => (
                <article key={item.id} className="admin-restaurant-card">
                  <h2>{item.name}</h2>
                  <p>
                    {item.is_simulated
                      ? "Dữ liệu mô phỏng"
                      : "Không gắn cờ mô phỏng"}
                  </p>
                  {deleting?.id === item.id ? (
                    <div className="admin-restaurant-confirm">
                      <h3>Xóa nguyên liệu này?</h3>
                      <p>
                        Nguyên liệu đang được món tham chiếu sẽ không thể xóa,
                        kể cả món đã ngừng bán.
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
                        Giữ nguyên liệu
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
                aria-label="Phân trang nguyên liệu"
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

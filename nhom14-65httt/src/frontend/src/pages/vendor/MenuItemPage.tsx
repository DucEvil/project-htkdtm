import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Link, useParams } from "react-router-dom";
import {
  createVendorMenuItem,
  getVendorMenuItem,
  getVendorRestaurant,
  updateVendorMenuItem,
} from "../../api/vendor";
import { ApiError, errorMessage } from "../../api/client";
import { useAuth } from "../../hooks/useAuth";
import { usePublicData as useRemoteData } from "../../hooks/usePublicData";
import { formatPrice, routeEntityId } from "../../utils/catalog";
import {
  isProfileResponse,
  profileStatusLabels,
} from "../../utils/vendorProfileValidation";
import {
  emptyVendorMenu,
  isVendorMenuResponse,
  menuFormFromItem,
  validateVendorMenu,
  type MenuFormErrors,
  type VendorMenuForm,
} from "../../utils/vendorMenuValidation";
import type { MenuItemDetail } from "../../types/menu";
import type { RestaurantDetail } from "../../types/restaurant";
import CatalogPicker from "../../components/menu/CatalogPicker";
import "./menu.css";

export default function MenuItemPage() {
  const { user } = useAuth();
  const { id } = useParams();
  const parsed = id === undefined ? null : routeEntityId(id);
  if (id !== undefined && parsed === null)
    return (
      <section className="vendor-menu-page">
        <h1>Chưa tìm thấy món quản lý</h1>
        <Link className="vendor-menu-back" to="/vendor/menu">
          Về thực đơn
        </Link>
      </section>
    );
  return user ? (
    <MenuItemLoader key={`${user.id}-${id ?? "new"}`} id={parsed} />
  ) : null;
}
function MenuItemLoader({ id }: { id: number | null }) {
  const load = useCallback(
    async (signal: AbortSignal) => {
      const profile = await getVendorRestaurant({ signal });
      if (signal.aborted) throw new DOMException("Đã hủy", "AbortError");
      if (!isProfileResponse(profile))
        throw new Error("Chưa nhận được hồ sơ hợp lệ.");
      const item = id === null ? null : await getVendorMenuItem(id, { signal });
      if (
        id !== null &&
        (!item || !isVendorMenuResponse(item, profile.id) || item.id !== id)
      )
        throw new Error("Chưa nhận được món hợp lệ.");
      return { profile, item };
    },
    [id],
  );
  const result = useRemoteData(load);
  return (
    <section className="vendor-menu-page">
      <Link className="vendor-menu-back" to="/vendor/menu">
        ← Thực đơn của quán
      </Link>
      <span className="eyebrow">CHUẨN BỊ MÓN NGON MỖI NGÀY</span>
      <h1>{id === null ? "Thêm món vào thực đơn" : "Chỉnh sửa món"}</h1>
      {result.loading ? (
        <p role="status">Đang tải thông tin món và quán…</p>
      ) : result.error ? (
        <div className="vendor-menu-panel">
          <h2>Chưa mở được biểu mẫu</h2>
          <p className="vendor-menu-error" role="alert">
            {errorMessage(result.error)}
          </p>
          <div className="vendor-menu-toolbar">
            <button className="button" onClick={result.retry}>
              Thử lại
            </button>
            <Link to="/vendor/profile">Kiểm tra hồ sơ quán</Link>
          </div>
        </div>
      ) : (
        result.data && (
          <MenuEditor profile={result.data.profile} item={result.data.item} />
        )
      )}
    </section>
  );
}
function MenuEditor({
  profile,
  item,
}: {
  profile: RestaurantDetail;
  item: MenuItemDetail | null;
}) {
  const [form, setForm] = useState<VendorMenuForm>(() =>
    item ? menuFormFromItem(item) : emptyVendorMenu,
  );
  const [errors, setErrors] = useState<MenuFormErrors>({});
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const [saved, setSaved] = useState<MenuItemDetail | null>(null);
  const active = useRef(false),
    lock = useRef(false);
  const formRef = useRef<HTMLFormElement>(null),
    errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  function change<K extends keyof VendorMenuForm>(
    field: K,
    value: VendorMenuForm[K],
  ) {
    setForm((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: undefined }));
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (lock.current || uncertain) return;
    const checked = validateVendorMenu(form);
    setErrors(checked.errors);
    setMessage("");
    if (!checked.payload) {
      requestAnimationFrame(() =>
        (
          formRef.current?.querySelector<HTMLElement>(
            '[aria-invalid="true"]',
          ) ?? errorRef.current
        )?.focus(),
      );
      return;
    }
    lock.current = true;
    setBusy(true);
    try {
      const value = item
        ? await updateVendorMenuItem(item.id, checked.payload)
        : await createVendorMenuItem(checked.payload);
      if (!active.current) return;
      if (
        !isVendorMenuResponse(value, profile.id) ||
        (item && value.id !== item.id)
      )
        throw new Error("Chưa xác nhận được món đã lưu.");
      setForm(menuFormFromItem(value));
      setSaved(value);
    } catch (error) {
      if (!active.current) return;
      setMessage(errorMessage(error));
      const definiteFailure =
        error instanceof ApiError &&
        [400, 403, 404, 422].includes(error.status) &&
        ["VALIDATION_ERROR", "NOT_FOUND", "FORBIDDEN"].includes(error.code);
      if (!item && !definiteFailure) setUncertain(true);
      if (
        error instanceof ApiError &&
        error.status === 422 &&
        Array.isArray(error.details)
      ) {
        const fields: Record<string, keyof VendorMenuForm> = {
          name: "name",
          price: "price",
          canonical_dish_id: "dish",
          ingredient_ids: "ingredients",
          ingredients_verified: "ingredients",
          is_available: "available",
        };
        const next: MenuFormErrors = {};
        for (const detail of error.details) {
          if (detail && Array.isArray(detail.field)) {
            const field = fields[detail.field[1]];
            if (field)
              next[field] =
                "Thông tin chưa hợp lệ. Hãy kiểm tra lại định dạng và giới hạn.";
          }
        }
        setErrors(next);
      }
    } finally {
      lock.current = false;
      if (active.current) setBusy(false);
    }
  }
  if (saved)
    return (
      <div className="vendor-menu-panel">
        <p className="vendor-menu-success" role="status">
          {item ? "Đã lưu thay đổi món." : "Đã tạo món trong thực đơn."}
        </p>
        <h2>{saved.name}</h2>
        <p className="vendor-menu-price">{formatPrice(saved.price)}</p>
        <p>
          {saved.is_available ? "Đang cho phép bán" : "Đã ngừng bán"} ·{" "}
          {saved.ingredients_verified
            ? "Đã xác nhận nguyên liệu"
            : "Chưa xác nhận nguyên liệu"}
        </p>
        <div className="vendor-menu-toolbar">
          <Link className="button" to="/vendor/menu">
            Về danh sách thực đơn
          </Link>
          {item ? (
            <button
              className="vendor-menu-secondary"
              onClick={() => setSaved(null)}
            >
              Tiếp tục chỉnh sửa
            </button>
          ) : (
            <Link to={`/vendor/menu/${saved.id}/edit`}>
              Chỉnh sửa món vừa tạo
            </Link>
          )}
        </div>
      </div>
    );
  const blocked = busy || uncertain;
  return (
    <>
      <p className="vendor-menu-hint">
        Quán {profile.name} · {profileStatusLabels[profile.status]}. Món chỉ
        được công khai khi quán đã duyệt; nhận đơn còn phụ thuộc giờ và trạng
        thái quán.
      </p>
      {message && (
        <p className="vendor-menu-error" role="alert">
          {message}
        </p>
      )}
      {uncertain && (
        <div className="vendor-menu-recovery">
          <h2>Hãy kiểm tra thực đơn trước khi tạo tiếp</h2>
          <p>
            Lần gửi vừa rồi có thể đã lưu món. Biểu mẫu đã khóa gửi tiếp để
            tránh tạo trùng; hãy xem danh sách và chỉ tạo lại khi đã đối chiếu.
          </p>
          <Link className="button" to="/vendor/menu">
            Kiểm tra thực đơn đã lưu
          </Link>
        </div>
      )}
      <form
        ref={formRef}
        noValidate
        onSubmit={submit}
        aria-busy={busy}
        className="vendor-menu-form"
      >
        <fieldset disabled={blocked}>
          {Object.values(errors).some(Boolean) && (
            <p
              ref={errorRef}
              tabIndex={-1}
              role="alert"
              className="vendor-menu-error"
            >
              Bạn hãy kiểm tra các trường được báo lỗi.
            </p>
          )}
          <div className="vendor-menu-panel">
            <h2>Thông tin món tại quán</h2>
            <label htmlFor="vendor-item-name">Tên món bán</label>
            <input
              id="vendor-item-name"
              value={form.name}
              maxLength={180}
              onChange={(event) => change("name", event.target.value)}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={
                errors.name ? "vendor-item-name-error" : undefined
              }
            />
            {errors.name && (
              <p id="vendor-item-name-error" className="vendor-menu-error">
                {errors.name}
              </p>
            )}
            <label htmlFor="vendor-item-price">Giá bán (VNĐ)</label>
            <input
              id="vendor-item-price"
              value={form.price}
              inputMode="numeric"
              onChange={(event) => change("price", event.target.value)}
              placeholder="Ví dụ: 35000"
              aria-invalid={Boolean(errors.price)}
              aria-describedby={`vendor-item-price-hint${errors.price ? " vendor-item-price-error" : ""}`}
            />
            <p id="vendor-item-price-hint" className="vendor-menu-hint">
              Nhập số nguyên, không dùng dấu chấm hoặc dấu phẩy phân cách hàng
              nghìn.
            </p>
            {errors.price && (
              <p id="vendor-item-price-error" className="vendor-menu-error">
                {errors.price}
              </p>
            )}
            <label className="vendor-menu-flag">
              <input
                type="checkbox"
                checked={form.available}
                onChange={(event) => change("available", event.target.checked)}
              />
              <span>Cho phép bán món</span>
            </label>
            <p className="vendor-menu-hint">
              Bỏ chọn để giữ món trong thực đơn quản lý nhưng ngừng bán công
              khai. Sửa tên/giá không thay đổi thông tin các đơn đã mua.
            </p>
          </div>
          <div className="vendor-menu-panel">
            <CatalogPicker
              kind="dish"
              selected={form.dish}
              onChange={(items) => change("dish", items)}
              error={errors.dish}
              disabled={blocked}
            />
          </div>
          <div className="vendor-menu-panel">
            <CatalogPicker
              kind="ingredients"
              selected={form.ingredients}
              onChange={(items) => change("ingredients", items)}
              error={errors.ingredients}
              disabled={blocked}
            />
            <label className="vendor-menu-flag">
              <input
                type="checkbox"
                checked={form.verified}
                onChange={(event) => change("verified", event.target.checked)}
              />
              <span>Tôi xác nhận đã khai báo nguyên liệu thực tế của món</span>
            </label>
            <p className="vendor-menu-hint">
              Cần ít nhất một nguyên liệu để xác nhận. Đây là khai báo của quán,
              không phải cam kết an toàn dị ứng.
            </p>
          </div>
          <button type="submit" className="button">
            {busy ? "Đang lưu món…" : item ? "Lưu thay đổi món" : "Tạo món"}
          </button>
        </fieldset>
      </form>
    </>
  );
}

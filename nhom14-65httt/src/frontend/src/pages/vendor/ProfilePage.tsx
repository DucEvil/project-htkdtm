import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  createVendorRestaurant,
  getVendorRestaurant,
  updateVendorRestaurant,
} from "../../api/vendor";
import { ApiError, errorMessage } from "../../api/client";
import { useAuth } from "../../hooks/useAuth";
import type { RestaurantDetail } from "../../types/restaurant";
import {
  emptyVendorProfile,
  isProfileResponse,
  profileFromRestaurant,
  profileStatusLabels,
  updateProfilePayload,
  validateVendorProfile,
  type ProfileErrors,
  type VendorProfileForm,
} from "../../utils/vendorProfileValidation";
import "./profile.css";

export default function ProfilePage() {
  const { user } = useAuth();
  return user ? <ProfileEditor key={user.id} /> : null;
}
function ProfileEditor() {
  const [profile, setProfile] = useState<RestaurantDetail | null>(null);
  const [form, setForm] = useState<VendorProfileForm>(emptyVendorProfile);
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [stage, setStage] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false),
    [checking, setChecking] = useState(false);
  const [message, setMessage] = useState("");
  const [info, setInfo] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [statusOutdated, setStatusOutdated] = useState(false);
  const active = useRef(false),
    lock = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    active.current = true;
    const controller = new AbortController();
    setStage("loading");
    setMessage("");
    void getVendorRestaurant({ signal: controller.signal })
      .then((value) => {
        if (controller.signal.aborted) return;
        if (!isProfileResponse(value)) throw new Error("Chưa có hồ sơ hợp lệ.");
        setProfile(value);
        setForm(profileFromRestaurant(value));
        setStage("ready");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (
          error instanceof ApiError &&
          error.status === 404 &&
          error.code === "NOT_FOUND"
        ) {
          setProfile(null);
          setForm(emptyVendorProfile);
          setStage("ready");
        } else {
          setMessage(errorMessage(error));
          setStage("error");
        }
      });
    return () => {
      active.current = false;
      controller.abort();
    };
  }, [attempt]);
  function change<K extends keyof VendorProfileForm>(
    key: K,
    value: VendorProfileForm[K],
  ) {
    setForm((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => ({ ...previous, [key]: undefined }));
    setSaved(false);
  }
  async function checkStatus() {
    if (lock.current) return;
    lock.current = true;
    setChecking(true);
    setSaved(false);
    setMessage("");
    setInfo(false);
    try {
      const value = await getVendorRestaurant();
      if (!active.current) return;
      if (!isProfileResponse(value)) throw new Error("Chưa có hồ sơ hợp lệ.");
      setProfile(value);
      if (uncertain || !profile) setForm(profileFromRestaurant(value));
      else if (value.status !== "approved")
        setForm((previous) => ({ ...previous, accepting: false }));
      setUncertain(false);
      setStatusOutdated(false);
      setInfo(true);
      setMessage(
        "Đã cập nhật trạng thái từ máy chủ. Quán được duyệt không tự bật nhận đơn.",
      );
    } catch (error) {
      if (!active.current) return;
      if (
        error instanceof ApiError &&
        error.status === 404 &&
        error.code === "NOT_FOUND" &&
        !profile
      ) {
        setUncertain(false);
        setMessage(
          "Chưa tìm thấy quán liên kết. Bạn có thể kiểm tra thông tin và gửi tạo lại.",
        );
      } else {
        setMessage(errorMessage(error));
        if (
          profile &&
          error instanceof ApiError &&
          [401, 403, 404].includes(error.status)
        )
          setStage("error");
      }
    } finally {
      lock.current = false;
      if (active.current) setChecking(false);
    }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (lock.current || uncertain) return;
    const checked = validateVendorProfile(form);
    setErrors(checked.errors);
    setMessage("");
    setSaved(false);
    setInfo(false);
    if (!checked.payload) {
      requestAnimationFrame(() =>
        formRef.current
          ?.querySelector<HTMLElement>('[aria-invalid="true"]')
          ?.focus(),
      );
      return;
    }
    lock.current = true;
    setBusy(true);
    try {
      const value = profile
        ? await updateVendorRestaurant(
            updateProfilePayload(
              checked.payload,
              form,
              profile.status === "approved" && !statusOutdated,
            ),
          )
        : await createVendorRestaurant(checked.payload);
      if (!active.current) return;
      if (!isProfileResponse(value))
        throw new Error("Chưa xác nhận được hồ sơ.");
      setProfile(value);
      setForm(profileFromRestaurant(value));
      setStatusOutdated(false);
      setSaved(true);
    } catch (error) {
      if (!active.current) return;
      setMessage(errorMessage(error));
      if (
        !profile &&
        (!(error instanceof ApiError) ||
          error.status >= 500 ||
          error.code === "RESTAURANT_ALREADY_LINKED")
      )
        setUncertain(true);
      if (
        error instanceof ApiError &&
        error.code === "RESTAURANT_NOT_APPROVED"
      ) {
        setForm((previous) => ({ ...previous, accepting: false }));
        setStatusOutdated(true);
      }
      if (
        error instanceof ApiError &&
        error.status === 422 &&
        Array.isArray(error.details)
      ) {
        const fields: Record<string, keyof VendorProfileForm> = {
          name: "name",
          address: "address",
          latitude: "latitude",
          longitude: "longitude",
          delivery_radius_km: "radius",
          opens_at: "opens",
          closes_at: "closes",
          accepting_orders: "accepting",
        };
        const next: ProfileErrors = {};
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
  const errorFor = (field: keyof VendorProfileForm) =>
    errors[field] ? (
      <p className="vendor-profile-error" id={`profile-${field}-error`}>
        {errors[field]}
      </p>
    ) : null;
  const fieldProps = (field: keyof VendorProfileForm) => ({
    "aria-invalid": Boolean(errors[field]),
    "aria-describedby": errors[field] ? `profile-${field}-error` : undefined,
  });
  return (
    <section className="vendor-profile-page">
      <Link className="vendor-back" to="/vendor">
        ← Tài khoản chủ quán
      </Link>
      <span className="eyebrow">CHĂM CHÚT QUÁN CỦA BẠN</span>
      <h1>Hồ sơ quán</h1>
      <p>Thông tin rõ ràng giúp khách hiểu quán và chọn bữa ăn phù hợp.</p>
      {stage === "loading" ? (
        <p role="status">Đang tải hồ sơ quán…</p>
      ) : stage === "error" ? (
        <div className="vendor-profile-card">
          <h2>Chưa tải được hồ sơ</h2>
          <p role="alert" className="vendor-profile-error">
            {message}
          </p>
          <button
            className="button"
            onClick={() => setAttempt((value) => value + 1)}
          >
            Thử lại
          </button>
        </div>
      ) : (
        <div className="vendor-profile-layout">
          <aside className="vendor-profile-status">
            <span className="eyebrow">TRẠNG THÁI QUÁN</span>
            <h2>
              {statusOutdated
                ? "Cần kiểm tra lại trạng thái"
                : profile
                  ? profileStatusLabels[profile.status]
                  : "Bắt đầu quán của bạn"}
            </h2>
            <p>
              {statusOutdated
                ? "Máy chủ chưa cho phép bật nhận đơn. Hãy kiểm tra lại trạng thái duyệt; các chỉnh sửa khác vẫn được giữ."
                : !profile
                  ? "Tạo hồ sơ để gửi quán chờ quản trị viên duyệt. Quán mới chưa được công khai và chưa nhận đơn."
                  : profile.status === "pending"
                    ? "Quán đang chờ duyệt. Bạn có thể chuẩn bị thông tin; chưa bật nhận đơn được."
                    : profile.status === "suspended"
                      ? "Quán đang bị tạm ngừng. Bạn vẫn sửa hồ sơ được, nhưng chưa bật nhận đơn hoặc công khai quán."
                      : "Quán đã được duyệt. Bạn chủ động bật nhận đơn và kiểm tra giờ phục vụ."}
            </p>
            {profile && (
              <>
                {!statusOutdated && (
                  <p className="vendor-profile-availability">
                    {profile.is_open
                      ? "Trong giờ phục vụ"
                      : "Ngoài giờ phục vụ"}{" "}
                    ·{" "}
                    {profile.accepting_orders
                      ? "Đã bật nhận đơn"
                      : "Đang tắt nhận đơn"}
                  </p>
                )}
                <button
                  className="vendor-check-status"
                  disabled={busy || checking}
                  onClick={() => void checkStatus()}
                >
                  {checking ? "Đang kiểm tra…" : "Kiểm tra trạng thái duyệt"}
                </button>
                {profile.status === "approved" && !statusOutdated && (
                  <Link
                    className="vendor-back"
                    to={`/restaurants/${profile.id}`}
                  >
                    Xem quán công khai ↗
                  </Link>
                )}
              </>
            )}
            <p className="vendor-profile-note">
              Giờ phục vụ theo Việt Nam. Giờ mở bằng giờ đóng nghĩa là mở cả
              ngày; giờ mở lớn hơn giờ đóng nghĩa là phục vụ qua đêm.
            </p>
          </aside>
          <div className="vendor-profile-card">
            <h2>{profile ? "Chỉnh sửa thông tin quán" : "Tạo hồ sơ quán"}</h2>
            {saved && (
              <p className="vendor-profile-success" role="status">
                {profile?.status === "pending"
                  ? "Đã lưu hồ sơ. Quán đang chờ duyệt."
                  : "Đã lưu hồ sơ quán."}
              </p>
            )}
            {message && (
              <p
                className={
                  info ? "vendor-profile-success" : "vendor-profile-error"
                }
                role={info ? "status" : "alert"}
              >
                {message}
              </p>
            )}
            {uncertain && (
              <div className="vendor-profile-recovery">
                <p>
                  Chưa xác nhận được kết quả tạo quán hoặc tài khoản đã có quán.
                  Kiểm tra hồ sơ đã liên kết trước khi gửi tạo tiếp.
                </p>
                <button
                  type="button"
                  className="button"
                  disabled={checking}
                  onClick={() => void checkStatus()}
                >
                  {checking ? "Đang kiểm tra…" : "Kiểm tra hồ sơ đã tạo"}
                </button>
              </div>
            )}
            <form ref={formRef} noValidate onSubmit={submit} aria-busy={busy}>
              <fieldset disabled={busy || checking || uncertain}>
                <label htmlFor="profile-name">Tên quán</label>
                <input
                  id="profile-name"
                  value={form.name}
                  maxLength={160}
                  autoComplete="organization"
                  onChange={(event) => change("name", event.target.value)}
                  {...fieldProps("name")}
                />
                {errorFor("name")}
                <label htmlFor="profile-address">Địa chỉ quán</label>
                <textarea
                  id="profile-address"
                  value={form.address}
                  maxLength={500}
                  autoComplete="street-address"
                  onChange={(event) => change("address", event.target.value)}
                  {...fieldProps("address")}
                />
                {errorFor("address")}
                <p className="vendor-profile-note">
                  Nhập tọa độ đúng vị trí quán. Địa chỉ chưa được tự đổi thành
                  tọa độ.
                </p>
                <div className="vendor-profile-fields">
                  <div>
                    <label htmlFor="profile-latitude">Vĩ độ quán</label>
                    <input
                      id="profile-latitude"
                      value={form.latitude}
                      inputMode="decimal"
                      placeholder="Ví dụ: 21.0285"
                      onChange={(event) =>
                        change("latitude", event.target.value)
                      }
                      {...fieldProps("latitude")}
                    />
                    {errorFor("latitude")}
                  </div>
                  <div>
                    <label htmlFor="profile-longitude">Kinh độ quán</label>
                    <input
                      id="profile-longitude"
                      value={form.longitude}
                      inputMode="decimal"
                      placeholder="Ví dụ: 105.8542"
                      onChange={(event) =>
                        change("longitude", event.target.value)
                      }
                      {...fieldProps("longitude")}
                    />
                    {errorFor("longitude")}
                  </div>
                </div>
                <label htmlFor="profile-radius">Bán kính phục vụ (km)</label>
                <input
                  id="profile-radius"
                  value={form.radius}
                  inputMode="decimal"
                  onChange={(event) => change("radius", event.target.value)}
                  {...fieldProps("radius")}
                />
                {errorFor("radius")}
                <div className="vendor-profile-fields">
                  <div>
                    <label htmlFor="profile-opens">Giờ mở cửa</label>
                    <input
                      id="profile-opens"
                      type="time"
                      value={form.opens}
                      onChange={(event) => change("opens", event.target.value)}
                      {...fieldProps("opens")}
                    />
                    {errorFor("opens")}
                  </div>
                  <div>
                    <label htmlFor="profile-closes">Giờ đóng cửa</label>
                    <input
                      id="profile-closes"
                      type="time"
                      value={form.closes}
                      onChange={(event) => change("closes", event.target.value)}
                      {...fieldProps("closes")}
                    />
                    {errorFor("closes")}
                  </div>
                </div>
                <p className="vendor-profile-hours">
                  {form.opens && form.opens === form.closes
                    ? "Khung giờ hiện tại: phục vụ cả ngày."
                    : form.opens > form.closes
                      ? "Khung giờ hiện tại: phục vụ qua đêm."
                      : "Khung giờ hiện tại theo giờ Việt Nam."}
                </p>
                {profile && (
                  <>
                    <label className="vendor-receiving">
                      <input
                        type="checkbox"
                        disabled={
                          profile.status !== "approved" || statusOutdated
                        }
                        checked={
                          profile.status === "approved" &&
                          !statusOutdated &&
                          form.accepting
                        }
                        onChange={(event) =>
                          change("accepting", event.target.checked)
                        }
                        {...fieldProps("accepting")}
                      />
                      <span>Bật nhận đơn khi quán trong giờ phục vụ</span>
                    </label>
                    {errorFor("accepting")}
                  </>
                )}
                <button type="submit" className="button">
                  {busy
                    ? "Đang lưu hồ sơ…"
                    : profile
                      ? "Lưu thay đổi"
                      : "Tạo quán và gửi duyệt"}
                </button>
              </fieldset>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { getPreference, savePreference } from "../../api/preferences";
import { ApiError, errorMessage } from "../../api/client";
import { useAuth } from "../../hooks/useAuth";
import {
  emptyTaste,
  tasteFromPreference,
  validateTaste,
  type TasteErrors,
  type TasteForm,
} from "../../utils/preferenceValidation";
import "./preferences.css";

const spices = ["Không cay", "Ít cay", "Vừa cay", "Rất cay"];
const explorations = [
  "Ưu tiên món quen",
  "Cân bằng quen và mới",
  "Thích khám phá món mới",
];

export default function PreferencePage() {
  const { user } = useAuth();
  return user ? <TasteEditor key={user.id} /> : null;
}

function TasteEditor() {
  const [form, setForm] = useState<TasteForm>(emptyTaste);
  const [errors, setErrors] = useState<TasteErrors>({});
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const [existing, setExisting] = useState(false);
  const [saving, setSaving] = useState(false);
  const lock = useRef(false);
  const active = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    active.current = true;
    const controller = new AbortController();
    setState("loading");
    setMessage("");
    getPreference({ signal: controller.signal })
      .then((profile) => {
        if (controller.signal.aborted) return;
        setForm(tasteFromPreference(profile));
        setExisting(true);
        setState("ready");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (
          error instanceof ApiError &&
          error.status === 404 &&
          error.code === "NOT_FOUND"
        ) {
          setForm(emptyTaste);
          setExisting(false);
          setState("ready");
        } else {
          setMessage(errorMessage(error));
          setState("error");
        }
      });
    return () => {
      active.current = false;
      controller.abort();
    };
  }, [attempt]);

  function change<K extends keyof TasteForm>(field: K, value: TasteForm[K]) {
    setForm((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: undefined }));
    setMessage("");
    setSaved(false);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (lock.current) return;
    const checked = validateTaste(form);
    setErrors(checked.errors);
    setSaved(false);
    setMessage("");
    if (!checked.payload) {
      requestAnimationFrame(() =>
        formRef.current
          ?.querySelector<HTMLElement>('[aria-invalid="true"]')
          ?.focus(),
      );
      return;
    }
    lock.current = true;
    setSaving(true);
    try {
      const profile = await savePreference(checked.payload);
      if (!active.current) return;
      setForm({ ...tasteFromPreference(profile), consent: true });
      setExisting(true);
      setSaved(true);
    } catch (error) {
      if (!active.current) return;
      setMessage(errorMessage(error));
      if (
        error instanceof ApiError &&
        error.status === 422 &&
        Array.isArray(error.details)
      ) {
        const fields: Record<string, keyof TasteForm> = {
          regions: "regions",
          spice_level: "spice",
          liked_ingredients: "liked",
          avoided_ingredients: "avoided",
          exploration_level: "exploration",
        };
        const next: TasteErrors = {};
        for (const detail of error.details) {
          if (detail && Array.isArray(detail.field)) {
            const field = fields[detail.field[1]];
            if (field)
              next[field] =
                "Câu trả lời chưa hợp lệ. Hãy kiểm tra lại nội dung và giới hạn.";
          }
        }
        setErrors(next);
      }
    } finally {
      lock.current = false;
      if (active.current) setSaving(false);
    }
  }
  const regionChoices = Array.from(
    new Set(["Bắc", "Trung", "Nam", ...form.regions]),
  );
  const fieldError = (field: keyof TasteForm) =>
    errors[field] ? (
      <p className="taste-error" id={`taste-${field}-error`}>
        {errors[field]}
      </p>
    ) : null;

  return (
    <section className="taste-page" aria-labelledby="taste-heading">
      <aside className="taste-intro">
        <span className="eyebrow">VỊ RIÊNG CỦA BẠN</span>
        <h1 id="taste-heading">
          Mỗi người, <br />
          một <span>khẩu vị.</span>
        </h1>
        <p>Năm câu hỏi nhỏ để Vị Việt hiểu điều bạn thích trong mỗi bữa ăn.</p>
        <div className="taste-note">
          <strong>Bạn luôn có quyền lựa chọn</strong>
          <p>
            Có thể bỏ qua và quay lại chỉnh sửa bất cứ lúc nào từ tài khoản.
          </p>
        </div>
        <p className="taste-disclaimer">
          Thông tin được lưu để phục vụ gợi ý sau này. Tính năng gợi ý chưa được
          tích hợp ở phiên bản hiện tại.
        </p>
        <Link to="/account">← Về tài khoản</Link>
      </aside>
      <div className="taste-card">
        {state === "loading" ? (
          <p role="status">Đang tải khẩu vị của bạn…</p>
        ) : state === "error" ? (
          <>
            <h2>Chưa tải được khẩu vị</h2>
            <p role="alert" className="taste-error">
              {message}
            </p>
            <button
              className="button"
              onClick={() => setAttempt((value) => value + 1)}
            >
              Thử lại
            </button>
          </>
        ) : (
          <>
            <div className="taste-card-heading">
              <span className="eyebrow">HỒ SƠ KHẨU VỊ</span>
              <h2>
                {existing
                  ? "Điều chỉnh theo vị của bạn"
                  : "Bắt đầu từ điều bạn thích"}
              </h2>
              <p>Chọn theo sở thích hiện tại. Bạn có thể đổi lại sau.</p>
            </div>
            <form ref={formRef} noValidate onSubmit={submit} aria-busy={saving}>
              <fieldset disabled={saving}>
                <fieldset className="taste-question">
                  <legend>
                    <span>01</span> Bạn thích hương vị vùng nào?
                  </legend>
                  <p id="taste-regions-hint">
                    Chọn nhiều vùng hoặc để trống nếu bạn chưa có ưu tiên.
                  </p>
                  <div className="taste-options">
                    {regionChoices.map((region) => (
                      <label key={region} className="taste-option">
                        <input
                          type="checkbox"
                          checked={form.regions.includes(region)}
                          onChange={(event) =>
                            change(
                              "regions",
                              event.target.checked
                                ? [...form.regions, region]
                                : form.regions.filter(
                                    (entry) => entry !== region,
                                  ),
                            )
                          }
                          aria-describedby={`taste-regions-hint${errors.regions ? " taste-regions-error" : ""}`}
                          aria-invalid={Boolean(errors.regions)}
                        />
                        <span>{region}</span>
                      </label>
                    ))}
                  </div>
                  {fieldError("regions")}
                </fieldset>
                <fieldset className="taste-question">
                  <legend>
                    <span>02</span> Mức cay bạn mong muốn?
                  </legend>
                  <div className="taste-options">
                    {spices.map((label, index) => (
                      <label key={label} className="taste-option">
                        <input
                          type="radio"
                          name="spice"
                          value={index}
                          checked={form.spice === String(index)}
                          onChange={(event) =>
                            change("spice", event.target.value)
                          }
                          aria-invalid={Boolean(errors.spice)}
                          aria-describedby={
                            errors.spice ? "taste-spice-error" : undefined
                          }
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                  {fieldError("spice")}
                </fieldset>
                <div className="taste-question">
                  <label htmlFor="taste-liked">
                    <span>03</span> Nguyên liệu nào bạn yêu thích?
                  </label>
                  <p id="taste-liked-hint">
                    Không bắt buộc. Ngăn cách bằng dấu phẩy, tối đa 100 mục.
                  </p>
                  <input
                    id="taste-liked"
                    value={form.liked}
                    onChange={(event) => change("liked", event.target.value)}
                    placeholder="Ví dụ: bò, nấm, rau thơm"
                    aria-invalid={Boolean(errors.liked)}
                    aria-describedby={`taste-liked-hint${errors.liked ? " taste-liked-error" : ""}`}
                  />
                  {fieldError("liked")}
                </div>
                <div className="taste-question">
                  <label htmlFor="taste-avoided">
                    <span>04</span> Bạn muốn tránh nguyên liệu nào?
                  </label>
                  <p id="taste-avoided-hint">
                    Không bắt buộc. Ngăn cách bằng dấu phẩy, tối đa 100 mục.
                  </p>
                  <input
                    id="taste-avoided"
                    value={form.avoided}
                    onChange={(event) => change("avoided", event.target.value)}
                    placeholder="Ví dụ: đậu phộng, tôm"
                    aria-invalid={Boolean(errors.avoided)}
                    aria-describedby={`taste-avoided-hint${errors.avoided ? " taste-avoided-error" : ""}`}
                  />
                  {fieldError("avoided")}
                  <p className="taste-caution">
                    Khai báo này không bảo đảm món ăn an toàn với dị ứng. Hãy
                    xác nhận trực tiếp với quán trước khi đặt.
                  </p>
                </div>
                <fieldset className="taste-question">
                  <legend>
                    <span>05</span> Bạn sẵn sàng thử món mới đến đâu?
                  </legend>
                  <div className="taste-options taste-options-stack">
                    {explorations.map((label, index) => (
                      <label key={label} className="taste-option">
                        <input
                          type="radio"
                          name="exploration"
                          value={index}
                          checked={form.exploration === String(index)}
                          onChange={(event) =>
                            change("exploration", event.target.value)
                          }
                          aria-invalid={Boolean(errors.exploration)}
                          aria-describedby={
                            errors.exploration
                              ? "taste-exploration-error"
                              : undefined
                          }
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                  {fieldError("exploration")}
                </fieldset>
                <div className="taste-consent">
                  <label>
                    <input
                      type="checkbox"
                      checked={form.consent}
                      onChange={(event) =>
                        change("consent", event.target.checked)
                      }
                      aria-invalid={Boolean(errors.consent)}
                      aria-describedby={
                        errors.consent ? "taste-consent-error" : undefined
                      }
                    />
                    <span>
                      Tôi đồng ý lưu các câu trả lời vào hồ sơ khẩu vị để phục
                      vụ gợi ý món ăn.
                    </span>
                  </label>
                  {fieldError("consent")}
                </div>
                {message && (
                  <p className="taste-error" role="alert">
                    {message}
                  </p>
                )}
                {saved && (
                  <p className="taste-success" role="status">
                    Đã lưu khẩu vị của bạn.
                  </p>
                )}
                <div className="taste-actions">
                  <button type="submit" className="button">
                    {saving ? "Đang lưu…" : "Lưu khẩu vị"}
                  </button>
                  {saving ? (
                    <span role="status">Vui lòng chờ lưu xong.</span>
                  ) : (
                    <Link to="/account">
                      {existing ? "Về tài khoản" : "Bỏ qua lúc này"}
                    </Link>
                  )}
                </div>
              </fieldset>
            </form>
          </>
        )}
      </div>
    </section>
  );
}

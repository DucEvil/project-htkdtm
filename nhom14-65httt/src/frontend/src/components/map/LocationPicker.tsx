import { useRef, useState, type FormEvent } from "react";
import { useLocation } from "../../hooks/useLocation";
import { parseCoordinates } from "../../utils/locationValidation";

export default function LocationPicker({
  purpose = "search",
}: {
  purpose?: "search" | "delivery";
}) {
  const { location, locating, error, locate, choose, clear } = useLocation();
  const [latitude, setLatitude] = useState(
    location ? String(location.latitude) : "",
  );
  const [longitude, setLongitude] = useState(
    location ? String(location.longitude) : "",
  );
  const [label, setLabel] = useState(location?.label ?? "");
  const [errors, setErrors] = useState<{
    latitude?: string;
    longitude?: string;
  }>({});
  const latRef = useRef<HTMLInputElement>(null),
    lngRef = useRef<HTMLInputElement>(null);
  function submit(event: FormEvent) {
    event.preventDefault();
    const result = parseCoordinates(latitude, longitude);
    setErrors(result.errors);
    if (!result.point) {
      (result.errors.latitude ? latRef : lngRef).current?.focus();
      return;
    }
    choose({ ...result.point, label: label.trim() || "Vị trí đã chọn" });
  }
  return (
    <section className="search-location" aria-labelledby="location-heading">
      <span className="eyebrow">BẮT ĐẦU TỪ GẦN BẠN</span>
      <h2 id="location-heading">
        {purpose === "delivery" ? "Bạn muốn giao đến đâu?" : "Bạn đang ở đâu?"}
      </h2>
      <p>Chọn vị trí để tìm trong phạm vi quán có thể phục vụ.</p>
      <p className="location-privacy">
        {purpose === "delivery"
          ? "Chỉ xin quyền khi bạn bấm định vị. Khi gửi đơn, địa chỉ và tọa độ được lưu tạm trong tab để thử lại cùng yêu cầu nếu mất kết nối."
          : "Chỉ xin quyền khi bạn bấm định vị. Vị trí dùng cho tìm kiếm và chỉ được giữ trong bộ nhớ của trang."}
      </p>
      <button
        type="button"
        className="button"
        disabled={locating}
        onClick={locate}
      >
        {locating ? "Đang định vị…" : "Dùng vị trí hiện tại"}
      </button>
      {locating && <p role="status">Đang chờ vị trí từ trình duyệt…</p>}
      {error && (
        <p role="alert" className="search-error">
          {error}
        </p>
      )}
      <details className="manual-location" open={!location}>
        <summary>Nhập tọa độ thủ công</summary>
        <p>
          Chưa có tra cứu địa chỉ tự động. Bạn có thể lấy tọa độ từ bản đồ rồi
          nhập tại đây; tên địa điểm chỉ để bạn dễ nhận biết.
        </p>
        <form onSubmit={submit} noValidate>
          <label htmlFor="location-label">Tên địa điểm (không bắt buộc)</label>
          <input
            id="location-label"
            value={label}
            maxLength={160}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Ví dụ: Cổng trường"
          />
          <label htmlFor="latitude">Vĩ độ</label>
          <input
            id="latitude"
            ref={latRef}
            inputMode="decimal"
            value={latitude}
            onChange={(event) => {
              setLatitude(event.target.value);
              setErrors((previous) => ({ ...previous, latitude: undefined }));
            }}
            placeholder="Ví dụ: 21.0285"
            aria-invalid={Boolean(errors.latitude)}
            aria-describedby={errors.latitude ? "latitude-error" : undefined}
          />
          {errors.latitude && (
            <p id="latitude-error" className="search-error">
              {errors.latitude}
            </p>
          )}
          <label htmlFor="longitude">Kinh độ</label>
          <input
            id="longitude"
            ref={lngRef}
            inputMode="decimal"
            value={longitude}
            onChange={(event) => {
              setLongitude(event.target.value);
              setErrors((previous) => ({ ...previous, longitude: undefined }));
            }}
            placeholder="Ví dụ: 105.8542"
            aria-invalid={Boolean(errors.longitude)}
            aria-describedby={errors.longitude ? "longitude-error" : undefined}
          />
          {errors.longitude && (
            <p id="longitude-error" className="search-error">
              {errors.longitude}
            </p>
          )}
          <button type="submit" className="button secondary">
            Dùng tọa độ này
          </button>
        </form>
      </details>
      {location && (
        <div className="chosen-location" role="status">
          <strong>{location.label}</strong>
          <span>
            {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
          </span>
          <button
            type="button"
            onClick={() => {
              clear();
              setLatitude("");
              setLongitude("");
              setLabel("");
              setErrors({});
            }}
          >
            Xóa vị trí
          </button>
        </div>
      )}
    </section>
  );
}

import { useEffect, useRef, useState, type ReactNode } from "react";
import { LocationContext } from "./locationState";
import type { SearchLocation } from "../utils/locationValidation";

/** Chỉ giữ vị trí trong bộ nhớ, không tự xin quyền khi mở ứng dụng. */
export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<SearchLocation | null>(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const request = useRef(0);
  useEffect(
    () => () => {
      request.current++;
    },
    [],
  );

  function choose(point: SearchLocation) {
    request.current++;
    setLocating(false);
    setError("");
    setLocation(point);
  }
  function clear() {
    request.current++;
    setLocating(false);
    setError("");
    setLocation(null);
  }
  function locate() {
    const version = ++request.current;
    setError("");
    if (!navigator.geolocation) {
      setError(
        "Trình duyệt chưa hỗ trợ định vị. Bạn có thể nhập tọa độ bên dưới.",
      );
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (result) => {
        if (request.current !== version) return;
        const { latitude, longitude } = result.coords;
        if (
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude) ||
          Math.abs(latitude) > 90 ||
          Math.abs(longitude) > 180
        ) {
          setLocating(false);
          setError("Chưa lấy được tọa độ hợp lệ. Hãy nhập tay hoặc thử lại.");
          return;
        }
        choose({ latitude, longitude, label: "Vị trí từ trình duyệt" });
      },
      (failure) => {
        if (request.current !== version) return;
        setLocating(false);
        setError(
          failure.code === 1
            ? "Bạn chưa cấp quyền vị trí. Hãy nhập tọa độ hoặc cho phép rồi thử lại."
            : failure.code === 3
              ? "Định vị quá thời gian chờ. Hãy nhập tọa độ hoặc thử lại."
              : "Chưa xác định được vị trí. Hãy nhập tọa độ hoặc thử lại.",
        );
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  }
  return (
    <LocationContext.Provider
      value={{ location, locating, error, choose, locate, clear }}
    >
      {children}
    </LocationContext.Provider>
  );
}

import type {
  RestaurantCreate,
  RestaurantDetail,
  RestaurantUpdate,
} from "../types/restaurant";
import { parseCoordinates } from "./locationValidation";

export interface VendorProfileForm {
  name: string;
  address: string;
  latitude: string;
  longitude: string;
  radius: string;
  opens: string;
  closes: string;
  accepting: boolean;
}
export type ProfileErrors = Partial<Record<keyof VendorProfileForm, string>>;
export const emptyVendorProfile: VendorProfileForm = {
  name: "",
  address: "",
  latitude: "",
  longitude: "",
  radius: "5",
  opens: "08:00",
  closes: "22:00",
  accepting: false,
};
export const profileStatusLabels = {
  pending: "Chờ duyệt",
  approved: "Đã được duyệt",
  suspended: "Đang tạm ngừng",
};
export function profileFromRestaurant(
  value: RestaurantDetail,
): VendorProfileForm {
  return {
    name: value.name,
    address: value.address,
    latitude: String(value.latitude),
    longitude: String(value.longitude),
    radius: String(value.delivery_radius_km),
    opens: value.opens_at,
    closes: value.closes_at,
    accepting: value.status === "approved" && value.accepting_orders,
  };
}
export function validateVendorProfile(form: VendorProfileForm) {
  const coordinates = parseCoordinates(form.latitude, form.longitude);
  const errors: ProfileErrors = { ...coordinates.errors };
  // Không giữ key undefined để Object.keys chỉ chứa lỗi thực tế.
  if (!form.name.trim() || form.name.trim().length > 160)
    errors.name = "Tên quán cần từ 1 đến 160 ký tự.";
  if (!form.address.trim() || form.address.trim().length > 500)
    errors.address = "Địa chỉ quán cần từ 1 đến 500 ký tự.";
  const radius = Number(form.radius);
  if (
    !/^\d+(?:\.\d+)?$/.test(form.radius.trim()) ||
    !Number.isFinite(radius) ||
    radius <= 0 ||
    radius > 50
  )
    errors.radius = "Bán kính cần lớn hơn 0 và tối đa 50 km.";
  const time = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
  if (!time.test(form.opens)) errors.opens = "Giờ mở cần theo định dạng HH:MM.";
  if (!time.test(form.closes))
    errors.closes = "Giờ đóng cần theo định dạng HH:MM.";
  const payload: RestaurantCreate | null =
    Object.keys(errors).length || !coordinates.point
      ? null
      : {
          name: form.name.trim(),
          address: form.address.trim(),
          ...coordinates.point,
          delivery_radius_km: radius,
          opens_at: form.opens,
          closes_at: form.closes,
        };
  return { errors, payload };
}
export function updateProfilePayload(
  payload: RestaurantCreate,
  form: VendorProfileForm,
  approved: boolean,
): RestaurantUpdate {
  return {
    ...payload,
    delivery_radius_km: Number(form.radius),
    opens_at: form.opens,
    closes_at: form.closes,
    accepting_orders: approved && form.accepting,
  };
}
export function isProfileResponse(value: RestaurantDetail): boolean {
  return Boolean(
    value &&
    Number.isInteger(value.id) &&
    value.id > 0 &&
    typeof value.name === "string" &&
    typeof value.address === "string" &&
    Object.prototype.hasOwnProperty.call(profileStatusLabels, value.status) &&
    typeof value.accepting_orders === "boolean" &&
    Number.isFinite(value.latitude) &&
    Number.isFinite(value.longitude) &&
    Number.isFinite(value.delivery_radius_km) &&
    typeof value.opens_at === "string" &&
    typeof value.closes_at === "string",
  );
}

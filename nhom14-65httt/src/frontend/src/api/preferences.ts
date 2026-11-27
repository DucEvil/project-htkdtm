import { apiClient } from "./client";
import type { ReadOptions } from "./query";
import type { Preference } from "../types/preference";

/** Chưa khai báo trả ApiError 404; không tự tạo hồ sơ rỗng. */
export function getPreference({
  signal,
}: ReadOptions = {}): Promise<Preference> {
  return apiClient.request("/preferences/", { signal });
}

export function savePreference(payload: Preference): Promise<Preference> {
  return apiClient.request("/preferences/", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

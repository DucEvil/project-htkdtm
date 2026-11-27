import { apiClient } from "./client";
import type { ReviewCreate, ReviewOut } from "../types/review";

/** Chỉ món trong đơn completed; gửi trùng trả lỗi 409 từ backend. */
export function createReview(
  orderId: number,
  payload: ReviewCreate,
): Promise<ReviewOut> {
  return apiClient.request(`/orders/${orderId}/review`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

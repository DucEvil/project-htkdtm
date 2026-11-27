import type { ReviewCreate, ReviewOut } from "../types/review";

export type ReviewRating = ReviewCreate["rating"];
export const ratingLabels = [
  "Rất không hài lòng",
  "Chưa hài lòng",
  "Bình thường",
  "Hài lòng",
  "Rất hài lòng",
] as const;
export function validateReview(rating: number | null, comment: string) {
  const errors: { rating?: string; comment?: string } = {};
  if (rating === null || !Number.isInteger(rating) || rating < 1 || rating > 5)
    errors.rating = "Bạn hãy chọn từ 1 đến 5 sao.";
  if (comment.trim().length > 2000)
    errors.comment = "Nhận xét chỉ được tối đa 2000 ký tự.";
  return errors;
}
export function isReviewReceipt(
  value: ReviewOut,
  orderId: number,
  menuItemId: number,
): boolean {
  return Boolean(
    value &&
    Number.isInteger(value.id) &&
    value.id > 0 &&
    value.order_id === orderId &&
    value.menu_item_id === menuItemId &&
    Number.isInteger(value.rating) &&
    value.rating >= 1 &&
    value.rating <= 5 &&
    typeof value.comment === "string" &&
    typeof value.snapshot_name === "string" &&
    Number.isInteger(value.snapshot_price) &&
    value.snapshot_price > 0 &&
    typeof value.created_at === "string",
  );
}

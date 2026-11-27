import { useEffect, useRef, useState, type FormEvent } from "react";
import { createReview } from "../../api/reviews";
import { ApiError, errorMessage } from "../../api/client";
import type { OrderLineOut } from "../../types/order";
import type { ReviewOut } from "../../types/review";
import {
  isReviewReceipt,
  ratingLabels,
  validateReview,
  type ReviewRating,
} from "../../utils/reviewValidation";
import { orderTime } from "../../utils/orders";
import "./review.css";

export default function ReviewForm({
  orderId,
  item,
  disabled = false,
}: {
  orderId: number;
  item: OrderLineOut;
  disabled?: boolean;
}) {
  const [rating, setRating] = useState<ReviewRating | null>(null);
  const [comment, setComment] = useState("");
  const [errors, setErrors] = useState<{ rating?: string; comment?: string }>(
    {},
  );
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [existing, setExisting] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [receipt, setReceipt] = useState<ReviewOut | null>(null);
  const lock = useRef(false),
    active = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const prefix = `review-${orderId}-${item.menu_item_id}`;
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (lock.current || disabled || existing || blocked || receipt) return;
    const checked = validateReview(rating, comment);
    setErrors(checked);
    setMessage("");
    if (Object.keys(checked).length || rating === null) {
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
      const result = await createReview(orderId, {
        menu_item_id: item.menu_item_id,
        rating,
        comment: comment.trim(),
      });
      if (!active.current) return;
      if (!isReviewReceipt(result, orderId, item.menu_item_id))
        throw new Error("Chưa xác nhận được đánh giá.");
      setReceipt(result);
    } catch (error) {
      if (!active.current) return;
      if (error instanceof ApiError && error.code === "REVIEW_ALREADY_EXISTS")
        setExisting(true);
      else {
        if (
          error instanceof ApiError &&
          ["ORDER_NOT_COMPLETED", "NOT_FOUND", "FORBIDDEN"].includes(error.code)
        )
          setBlocked(true);
        setMessage(
          error instanceof ApiError
            ? error.message
            : `${errorMessage(error)} Chưa xác nhận được kết quả gửi; bạn có thể thử lại. Máy chủ chỉ lưu một đánh giá cho món trong đơn này.`,
        );
        if (
          error instanceof ApiError &&
          error.status === 422 &&
          Array.isArray(error.details)
        ) {
          const next: typeof errors = {};
          for (const detail of error.details) {
            if (detail && Array.isArray(detail.field)) {
              if (detail.field[1] === "rating")
                next.rating = "Điểm đánh giá cần là số nguyên từ 1 đến 5.";
              if (detail.field[1] === "comment")
                next.comment =
                  "Nhận xét chưa hợp lệ. Hãy kiểm tra giới hạn 2000 ký tự.";
            }
          }
          setErrors(next);
        }
      }
    } finally {
      lock.current = false;
      if (active.current) setBusy(false);
    }
  }
  return (
    <article className="review-card" aria-labelledby={`${prefix}-title`}>
      <span className="eyebrow">TRẢI NGHIỆM BỮA ĂN CỦA BẠN</span>
      <h3 id={`${prefix}-title`}>{item.snapshot_name}</h3>
      {receipt ? (
        <div className="review-receipt">
          <p className="review-saved" role="status">
            Đã lưu đánh giá của bạn.
          </p>
          <p className="review-score">
            <span aria-hidden="true">
              {"★".repeat(receipt.rating)}
              {"☆".repeat(5 - receipt.rating)}
            </span>
            <strong>
              {receipt.rating}/5 · {ratingLabels[receipt.rating - 1]}
            </strong>
          </p>
          {receipt.comment && (
            <p className="review-comment">{receipt.comment}</p>
          )}
          <time dateTime={receipt.created_at}>
            {orderTime(receipt.created_at)} · Giờ Việt Nam
          </time>
          <p className="review-note">
            Cảm ơn bạn đã chia sẻ cảm nhận về món ăn.
          </p>
        </div>
      ) : existing ? (
        <div className="review-existing" role="status">
          <strong>Món này đã được đánh giá trong đơn.</strong>
          <p>
            Mỗi món được gửi một lần. Điểm và nhận xét đã lưu chưa được tải ở
            màn hình này.
          </p>
        </div>
      ) : (
        <form ref={formRef} onSubmit={submit} noValidate aria-busy={busy}>
          <fieldset disabled={busy || disabled || blocked}>
            <fieldset className="review-rating">
              <legend>Bạn chấm món này mấy sao?</legend>
              <div className="review-stars">
                {([1, 2, 3, 4, 5] as const).map((value) => (
                  <label
                    key={value}
                    className={
                      rating !== null && value <= rating
                        ? "review-star chosen"
                        : "review-star"
                    }
                  >
                    <input
                      type="radio"
                      name={`${prefix}-rating`}
                      value={value}
                      checked={rating === value}
                      onChange={() => {
                        setRating(value);
                        setErrors((previous) => ({
                          ...previous,
                          rating: undefined,
                        }));
                      }}
                      aria-label={`${value} sao — ${ratingLabels[value - 1]}`}
                      aria-invalid={Boolean(errors.rating)}
                      aria-describedby={
                        errors.rating
                          ? `${prefix}-rating-error`
                          : `${prefix}-rating-hint`
                      }
                    />
                    <span aria-hidden="true">
                      {rating !== null && value <= rating ? "★" : "☆"}
                    </span>
                    <small aria-hidden="true">{value}</small>
                  </label>
                ))}
              </div>
              <p
                id={`${prefix}-rating-hint`}
                className="review-note"
                aria-live="polite"
              >
                {rating === null
                  ? "Chọn điểm theo cảm nhận của bạn."
                  : `${rating}/5 — ${ratingLabels[rating - 1]}`}
              </p>
              {errors.rating && (
                <p className="review-error" id={`${prefix}-rating-error`}>
                  {errors.rating}
                </p>
              )}
            </fieldset>
            <label htmlFor={`${prefix}-comment`}>
              Nhận xét (không bắt buộc)
            </label>
            <textarea
              id={`${prefix}-comment`}
              value={comment}
              maxLength={2000}
              placeholder="Bạn thích điều gì hoặc mong quán cải thiện điều gì?"
              onChange={(event) => {
                setComment(event.target.value);
                setErrors((previous) => ({ ...previous, comment: undefined }));
              }}
              aria-invalid={Boolean(errors.comment)}
              aria-describedby={`${prefix}-comment-hint${errors.comment ? ` ${prefix}-comment-error` : ""}`}
            />
            <div id={`${prefix}-comment-hint`} className="review-comment-hint">
              <span>Mỗi món chỉ được đánh giá một lần trong đơn này.</span>
              <span>{comment.length}/2000</span>
            </div>
            {errors.comment && (
              <p className="review-error" id={`${prefix}-comment-error`}>
                {errors.comment}
              </p>
            )}
            <button type="submit" className="button">
              {busy ? "Đang gửi đánh giá…" : "Gửi đánh giá"}
            </button>
          </fieldset>
          {message && (
            <p className="review-error" role="alert">
              {message}
            </p>
          )}
          {disabled && (
            <p className="review-note">
              Hãy cập nhật trạng thái đơn thành công trước khi gửi đánh giá.
            </p>
          )}
          {blocked && (
            <p className="review-note">
              Bạn hãy tải lại trang để kiểm tra quyền và trạng thái hiện tại
              trước khi thử tiếp.
            </p>
          )}
        </form>
      )}
    </article>
  );
}

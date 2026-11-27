import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import AppRouter from "../src/router";
import ReviewForm from "../src/components/order/ReviewForm";
import { AuthContext, type AuthState } from "../src/contexts/authState";
import { ApiError } from "../src/api/client";
import * as reviews from "../src/api/reviews";
import * as orders from "../src/api/orders";
import type { ReviewOut } from "../src/types/review";
import { validateReview } from "../src/utils/reviewValidation";
import { order } from "./fixtures/orders";

vi.mock("../src/api/reviews", () => ({ createReview: vi.fn() }));
vi.mock("../src/api/orders", () => ({
  getOrder: vi.fn(),
  listOrders: vi.fn(),
  cancelOrder: vi.fn(),
  createOrder: vi.fn(),
}));
const item = order.items[0];
const receipt: ReviewOut = {
  id: 12,
  order_id: order.id,
  menu_item_id: item.menu_item_id,
  snapshot_name: item.snapshot_name,
  snapshot_price: item.snapshot_price,
  rating: 5,
  comment: "Rất ngon",
  created_at: "2026-11-27T03:10:00Z",
};
beforeEach(() => {
  vi.mocked(reviews.createReview).mockReset().mockResolvedValue(receipt);
  vi.mocked(orders.getOrder)
    .mockReset()
    .mockResolvedValue({ ...order, status: "completed" });
});
afterEach(cleanup);
function mount(disabled = false) {
  return render(
    <ReviewForm orderId={order.id} item={item} disabled={disabled} />,
  );
}
const choose = () =>
  userEvent.click(screen.getByRole("radio", { name: "5 sao — Rất hài lòng" }));

it("cần chọn sao và focus lựa chọn đầu khi lỗi", async () => {
  mount();
  await userEvent.click(screen.getByRole("button", { name: "Gửi đánh giá" }));
  expect(screen.getByText("Bạn hãy chọn từ 1 đến 5 sao.")).toBeTruthy();
  await waitFor(() =>
    expect(document.activeElement).toBe(
      screen.getByRole("radio", { name: "1 sao — Rất không hài lòng" }),
    ),
  );
  expect(reviews.createReview).not.toHaveBeenCalled();
});
it("gửi đúng món/đơn, trim nhận xét, chỉ hiện thành công với response", async () => {
  mount();
  await choose();
  await userEvent.type(
    screen.getByLabelText("Nhận xét (không bắt buộc)"),
    "  Rất ngon  ",
  );
  await userEvent.click(screen.getByRole("button", { name: "Gửi đánh giá" }));
  expect(reviews.createReview).toHaveBeenCalledWith(77, {
    menu_item_id: 9,
    rating: 5,
    comment: "Rất ngon",
  });
  expect(await screen.findByText("Đã lưu đánh giá của bạn.")).toBeTruthy();
  expect(screen.getByText("5/5 · Rất hài lòng")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Gửi đánh giá" })).toBeNull();
});
it("nhận xét tùy chọn và không tạo dữ liệu thừa", async () => {
  mount();
  await choose();
  await userEvent.click(screen.getByRole("button", { name: "Gửi đánh giá" }));
  expect(reviews.createReview).toHaveBeenCalledWith(77, {
    menu_item_id: 9,
    rating: 5,
    comment: "",
  });
});
it("lỗi mạng giữ sao/nhận xét, thử lại trùng chuyển sang thông báo trung lập", async () => {
  vi.mocked(reviews.createReview)
    .mockRejectedValueOnce(new Error("offline"))
    .mockRejectedValueOnce(
      new ApiError("Đã đánh giá", 409, "REVIEW_ALREADY_EXISTS"),
    );
  mount();
  await choose();
  await userEvent.type(
    screen.getByLabelText("Nhận xét (không bắt buộc)"),
    "Mình thích nước dùng",
  );
  await userEvent.click(screen.getByRole("button", { name: "Gửi đánh giá" }));
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(
    (screen.getByLabelText("Nhận xét (không bắt buộc)") as HTMLTextAreaElement)
      .value,
  ).toBe("Mình thích nước dùng");
  expect(
    (
      screen.getByRole("radio", {
        name: "5 sao — Rất hài lòng",
      }) as HTMLInputElement
    ).checked,
  ).toBe(true);
  await userEvent.click(screen.getByRole("button", { name: "Gửi đánh giá" }));
  expect(
    await screen.findByText("Món này đã được đánh giá trong đơn."),
  ).toBeTruthy();
  expect(screen.queryByText("Đã lưu đánh giá của bạn.")).toBeNull();
  expect(screen.queryByText("5/5 · Rất hài lòng")).toBeNull();
});
it("khóa gửi lặp và các trường trong lúc POST chờ", async () => {
  let finish!: (value: ReviewOut) => void;
  vi.mocked(reviews.createReview).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  mount();
  await choose();
  await userEvent.click(screen.getByRole("button", { name: "Gửi đánh giá" }));
  await userEvent.click(
    screen.getByRole("button", { name: "Đang gửi đánh giá…" }),
  );
  expect(reviews.createReview).toHaveBeenCalledTimes(1);
  expect(
    screen.getByLabelText("Nhận xét (không bắt buộc)").matches(":disabled"),
  ).toBe(true);
  await act(async () => finish(receipt));
  expect(screen.getByText("Đã lưu đánh giá của bạn.")).toBeTruthy();
});
it("422 báo theo trường và không xóa nhận xét", async () => {
  vi.mocked(reviews.createReview).mockRejectedValue(
    new ApiError("Chưa hợp lệ.", 422, "VALIDATION_ERROR", [
      { field: ["body", "comment"] },
    ]),
  );
  mount();
  await choose();
  await userEvent.type(
    screen.getByLabelText("Nhận xét (không bắt buộc)"),
    "Ngon",
  );
  await userEvent.click(screen.getByRole("button", { name: "Gửi đánh giá" }));
  expect(
    await screen.findByText(
      "Nhận xét chưa hợp lệ. Hãy kiểm tra giới hạn 2000 ký tự.",
    ),
  ).toBeTruthy();
  expect(
    screen
      .getByLabelText("Nhận xét (không bắt buộc)")
      .getAttribute("aria-invalid"),
  ).toBe("true");
  expect(
    (screen.getByLabelText("Nhận xét (không bắt buộc)") as HTMLTextAreaElement)
      .value,
  ).toBe("Ngon");
});
it.each(["ORDER_NOT_COMPLETED", "NOT_FOUND", "FORBIDDEN"])(
  "lỗi %s khóa gửi tiếp khi chưa tải lại",
  async (code) => {
    vi.mocked(reviews.createReview).mockRejectedValue(
      new ApiError(
        "Không thể đánh giá đơn này.",
        code === "FORBIDDEN" ? 403 : code === "NOT_FOUND" ? 404 : 409,
        code,
      ),
    );
    mount();
    await choose();
    await userEvent.click(screen.getByRole("button", { name: "Gửi đánh giá" }));
    await screen.findByRole("alert");
    expect(
      screen.getByRole("button", { name: "Gửi đánh giá" }).matches(":disabled"),
    ).toBe(true);
  },
);
it("HTTP 201 thiếu review hợp lệ không hiển thị thành công", async () => {
  vi.mocked(reviews.createReview).mockResolvedValue(
    null as unknown as ReviewOut,
  );
  mount();
  await choose();
  await userEvent.click(screen.getByRole("button", { name: "Gửi đánh giá" }));
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(screen.queryByText("Đã lưu đánh giá của bạn.")).toBeNull();
});
it("hai form cùng đơn độc lập về sao và nội dung", async () => {
  render(
    <>
      <ReviewForm orderId={77} item={item} />
      <ReviewForm
        orderId={77}
        item={{ ...item, menu_item_id: 10, snapshot_name: "Cơm bò" }}
      />
    </>,
  );
  const first = within(
    screen.getByRole("article", { name: item.snapshot_name }),
  );
  const second = within(screen.getByRole("article", { name: "Cơm bò" }));
  await userEvent.click(
    first.getByRole("radio", { name: "5 sao — Rất hài lòng" }),
  );
  await userEvent.type(
    first.getByLabelText("Nhận xét (không bắt buộc)"),
    "Ngon",
  );
  expect(
    (
      second.getByRole("radio", {
        name: "5 sao — Rất hài lòng",
      }) as HTMLInputElement
    ).checked,
  ).toBe(false);
  expect(
    (second.getByLabelText("Nhận xét (không bắt buộc)") as HTMLTextAreaElement)
      .value,
  ).toBe("");
  await userEvent.click(first.getByRole("button", { name: "Gửi đánh giá" }));
  expect(await first.findByText("Đã lưu đánh giá của bạn.")).toBeTruthy();
  expect(second.getByRole("button", { name: "Gửi đánh giá" })).toBeTruthy();
});
it("bỏ response sau unmount không thay form đơn khác", async () => {
  let finish!: (value: ReviewOut) => void;
  vi.mocked(reviews.createReview).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const first = mount();
  await choose();
  await userEvent.click(screen.getByRole("button", { name: "Gửi đánh giá" }));
  first.unmount();
  render(<ReviewForm orderId={78} item={item} />);
  await act(async () => finish(receipt));
  expect(screen.queryByText("Đã lưu đánh giá của bạn.")).toBeNull();
  expect(screen.getByRole("button", { name: "Gửi đánh giá" })).toBeTruthy();
});
it("khóa form khi trạng thái đơn chưa được cập nhật thành công", () => {
  mount(true);
  expect(
    screen.getByRole("button", { name: "Gửi đánh giá" }).matches(":disabled"),
  ).toBe(true);
});
function orderPage() {
  const auth: AuthState = {
    user: {
      id: 1,
      full_name: "Khách",
      email: "khach@example.vn",
      role: "customer",
      is_simulated: false,
      created_at: order.created_at,
    },
    status: "authenticated",
    persisted: true,
    error: "",
    signIn: vi.fn(),
    signOut: vi.fn(),
    retry: vi.fn(),
  };
  return render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={["/orders/77"]}>
        <AppRouter />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}
it("đơn completed hiện form cho món đã mua", async () => {
  orderPage();
  expect(
    await screen.findByRole("heading", { name: "Đánh giá món đã mua" }),
  ).toBeTruthy();
  expect(
    screen.getByRole("article", { name: item.snapshot_name }),
  ).toBeTruthy();
});
it.each([
  "pending",
  "confirmed",
  "preparing",
  "delivering",
  "cancelled",
  "rejected",
] as const)("đơn %s không có form review", async (status) => {
  vi.mocked(orders.getOrder).mockResolvedValue({ ...order, status });
  orderPage();
  await screen.findByRole("heading", { name: "Đơn #77", level: 1 });
  expect(screen.queryByRole("button", { name: "Gửi đánh giá" })).toBeNull();
  expect(reviews.createReview).not.toHaveBeenCalled();
});
it.each([0, 6, 1.5, NaN, null])("validation không nhận điểm %s", (rating) => {
  expect(validateReview(rating, "").rating).toBeTruthy();
});
it("nhận xét cho phép trống, trim, chặn trên 2000 ký tự", () => {
  expect(validateReview(1, "")).toEqual({});
  expect(validateReview(5, " " + "a".repeat(2000) + " ")).toEqual({});
  expect(validateReview(5, "a".repeat(2001)).comment).toBeTruthy();
});

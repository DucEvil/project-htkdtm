import { Component, type ReactNode } from "react";

/** Bắt lỗi render/lifecycle; lỗi API và event handler vẫn do từng luồng xử lý. */
export default class ErrorBoundary extends Component<
  { children: ReactNode; homeLink?: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <section
        className="status-card"
        role="alert"
        aria-labelledby="render-error-heading"
      >
        <span className="eyebrow">VỊ VIỆT · CẦN THỬ LẠI</span>
        <h1 id="render-error-heading">Trang đang gặp sự cố hiển thị.</h1>
        <p>
          Bạn có thể mở lại nội dung hoặc về trang chủ. Chỉnh sửa chưa lưu trong
          biểu mẫu có thể bị mất.
        </p>
        <p>
          Nếu vừa gửi đơn hàng hoặc lưu thay đổi, hãy kiểm tra kết quả trước khi
          gửi lại.
        </p>
        <div className="button-row">
          <button
            className="button"
            onClick={() => this.setState({ failed: false })}
          >
            Mở lại nội dung
          </button>
          {this.props.homeLink ?? (
            <a className="button secondary" href="/">
              Về trang chủ
            </a>
          )}
        </div>
      </section>
    );
  }
}

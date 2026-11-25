import { Link, Route, Routes } from "react-router-dom";

function Home() {
  return (
    <main
      style={{
        maxWidth: 760,
        margin: "4rem auto",
        padding: "2rem",
        fontFamily: "system-ui, sans-serif",
        lineHeight: 1.6,
      }}
    >
      <h1>Vị Việt</h1>
      <p>Website đặt món Việt tích hợp gợi ý cá nhân hóa.</p>
      <p>
        Đã chuẩn bị nền tảng React, TypeScript và FastAPI. Các module nghiệp vụ
        sẽ được bổ sung theo từng phần.
      </p>
      <p>
        <a href="/health" target="_blank" rel="noreferrer">
          Kiểm tra kết nối backend
        </a>
      </p>
    </main>
  );
}

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route
        path="*"
        element={
          <main
            style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}
          >
            <h1>Không tìm thấy trang</h1>
            <Link to="/">Về trang chủ</Link>
          </main>
        }
      />
    </Routes>
  );
}

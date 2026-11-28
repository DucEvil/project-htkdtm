import { useCallback } from "react";
import { Link } from "react-router-dom";
import {
  listAdminRestaurants,
  listAdminCanonicalDishes,
  listAdminIngredients,
} from "../../api/admin";
import { errorMessage } from "../../api/client";
import { useAuth } from "../../hooks/useAuth";
import { usePublicData } from "../../hooks/usePublicData";
import "./restaurants.css";

const sections = [
  {
    title: "Quán trong hệ thống",
    description: "Tất cả trạng thái duyệt, gồm cả quán tạm ngừng.",
    path: "/admin/restaurants",
    link: "Quản lý quán",
    load: (signal: AbortSignal) =>
      listAdminRestaurants({ offset: 0, limit: 1 }, { signal }),
  },
  {
    title: "Quán chờ duyệt",
    description: "Mở danh sách quán và chọn bộ lọc Chờ duyệt để xử lý.",
    path: "/admin/restaurants",
    link: "Mở danh sách xét duyệt",
    load: (signal: AbortSignal) =>
      listAdminRestaurants(
        { offset: 0, limit: 1, status: "pending" },
        { signal },
      ),
  },
  {
    title: "Món chuẩn",
    description: "Đặc trưng món dùng chung cho thực đơn và gợi ý.",
    path: "/admin/dishes",
    link: "Quản lý món chuẩn",
    load: (signal: AbortSignal) =>
      listAdminCanonicalDishes({ offset: 0, limit: 1 }, { signal }),
  },
  {
    title: "Nguyên liệu",
    description: "Danh mục thành phần để chủ quán khai báo món bán.",
    path: "/admin/ingredients",
    link: "Quản lý nguyên liệu",
    load: (signal: AbortSignal) =>
      listAdminIngredients({ offset: 0, limit: 1 }, { signal }),
  },
];

export default function DashboardPage() {
  const { user } = useAuth();
  return user ? (
    <section key={user.id} className="admin-restaurants">
      <Link className="admin-restaurants-back" to="/admin">
        ← Tài khoản quản trị
      </Link>
      <span className="eyebrow">VỊ VIỆT · TỔNG QUAN QUẢN TRỊ</span>
      <h1>Công việc quản trị</h1>
      <p>Theo dõi quán và các danh mục đang được quản lý.</p>
      <p>
        Số lượng được tải riêng theo từng mục, có thể thay đổi khi dữ liệu được
        cập nhật. Bao gồm dữ liệu mô phỏng nếu có.
      </p>
      <div className="admin-restaurant-grid">
        {sections.map((section) => (
          <Summary key={section.title} section={section} />
        ))}
      </div>
    </section>
  ) : null;
}
function Summary({ section }: { section: (typeof sections)[number] }) {
  const load = useCallback(
    async (signal: AbortSignal) => {
      const page = await section.load(signal);
      if (!page || !Number.isSafeInteger(page.total) || page.total < 0)
        throw new Error("Chưa nhận được số lượng hợp lệ.");
      return page.total;
    },
    [section],
  );
  const result = usePublicData(load);
  return (
    <article className="admin-restaurant-card" aria-label={section.title}>
      <h2>{section.title}</h2>
      {result.loading ? (
        <p role="status">Đang tải số lượng…</p>
      ) : result.error ? (
        <p role="alert">{errorMessage(result.error)}</p>
      ) : (
        <p className="admin-summary-count">
          {result.data?.toLocaleString("vi-VN")}
        </p>
      )}
      <p>{section.description}</p>
      <div className="admin-restaurant-actions">
        <Link className="button" to={section.path}>
          {section.link}
        </Link>
        <button
          className="button secondary"
          disabled={result.loading}
          onClick={result.retry}
        >
          {result.error ? "Thử lại" : "Cập nhật số lượng"}
        </button>
      </div>
    </article>
  );
}

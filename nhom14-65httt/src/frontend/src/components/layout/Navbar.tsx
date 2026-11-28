import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import CartDrawer from "../cart/CartDrawer";
import { useAuth } from "../../hooks/useAuth";
import { roleHome, roleLabels } from "../../utils/auth";
import { useCart } from "../../hooks/useCart";

export default function Navbar() {
  const { user, signOut, status } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawer, setDrawer] = useState<string | null>(null);
  const drawerKey = `${location.key}-${user?.id ?? "guest"}`;
  useEffect(() => {
    setDrawer(null);
  }, [drawerKey]);
  function logout() {
    signOut();
    navigate("/login", { replace: true });
  }
  return (
    <header className="site-header">
      <Link className="brand" to="/" aria-label="Vị Việt — Trang chủ">
        <span className="brand-mark" aria-hidden="true">
          v.
        </span>
        Vị Việt<span className="brand-dot">.</span>
      </Link>
      <nav aria-label="Điều hướng chính">
        <NavLink to="/" end>
          Trang chủ
        </NavLink>
        <NavLink to="/search">Tìm món, quán</NavLink>
        <NavLink to="/cart">Giỏ hàng{count > 0 ? ` (${count})` : ""}</NavLink>
        {(!user || user.role === "customer") && (
          <button
            className="nav-action"
            aria-haspopup="dialog"
            onClick={() => setDrawer(drawerKey)}
          >
            Xem giỏ nhanh
          </button>
        )}
        {user?.role === "customer" && <NavLink to="/orders">Đơn hàng</NavLink>}
        {user ? (
          <>
            <NavLink to={roleHome(user.role)}>{roleLabels[user.role]}</NavLink>
            <button className="nav-action" onClick={logout}>
              Đăng xuất
            </button>
          </>
        ) : status === "anonymous" ? (
          <>
            <NavLink to="/login">Đăng nhập</NavLink>
            <Link className="button small" to="/register">
              Tạo tài khoản
            </Link>
          </>
        ) : (
          <span className="nav-muted">Đang kết nối tài khoản</span>
        )}
      </nav>
      {drawer === drawerKey && <CartDrawer onClose={() => setDrawer(null)} />}
    </header>
  );
}

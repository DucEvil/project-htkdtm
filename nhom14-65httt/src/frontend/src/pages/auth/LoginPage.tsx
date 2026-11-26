import { useRef, useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { errorMessage } from "../../api/client";
import { SessionStatus } from "../../components/layout/RoleGuard";
import { useAuth } from "../../hooks/useAuth";
import { roleHome, safeReturnTo } from "../../utils/auth";
import AuthLayout from "./AuthLayout";

export default function LoginPage() {
  const { user, status, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as {
    email?: string;
    registered?: boolean;
    returnTo?: string;
  } | null;
  const [email, setEmail] = useState(state?.email || "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);
  if (status === "loading" || status === "error") return <SessionStatus />;
  if (user)
    return (
      <Navigate
        to={safeReturnTo(state?.returnTo, roleHome(user.role))}
        replace
      />
    );
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setError("");
    try {
      const current = await signIn({ email: email.trim(), password });
      setPassword("");
      navigate(safeReturnTo(state?.returnTo, roleHome(current.role)), {
        replace: true,
      });
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }
  return (
    <AuthLayout
      title="Mừng bạn trở lại."
      intro="Đăng nhập để tiếp tục cùng Vị Việt."
    >
      {state?.registered && (
        <p className="notice success" role="status">
          Đã tạo tài khoản. Bạn có thể đăng nhập ngay.
        </p>
      )}
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      <form onSubmit={submit} aria-busy={pending}>
        <fieldset disabled={pending}>
          <legend className="sr-only">Thông tin đăng nhập</legend>
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="username"
            required
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="ban@example.vn"
          />
          <label htmlFor="login-password">Mật khẩu</label>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={128}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button className="button full" type="submit">
            {pending ? "Đang đăng nhập…" : "Đăng nhập"}
            <span aria-hidden="true">↗</span>
          </button>
        </fieldset>
      </form>
      <p className="auth-switch">
        Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
      </p>
    </AuthLayout>
  );
}

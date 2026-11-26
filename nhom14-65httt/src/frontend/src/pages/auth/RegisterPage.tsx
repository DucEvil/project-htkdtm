import { useRef, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import * as auth from "../../api/auth";
import { errorMessage } from "../../api/client";
import { SessionStatus } from "../../components/layout/RoleGuard";
import { useAuth } from "../../hooks/useAuth";
import { roleHome } from "../../utils/auth";
import AuthLayout from "./AuthLayout";

export default function RegisterPage() {
  const { user, status } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState<"customer" | "vendor">("customer");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  if (status === "loading" || status === "error") return <SessionStatus />;
  if (user) return <Navigate to={roleHome(user.role)} replace />;
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (inFlight.current) return;
    if (!fullName.trim() || !password.trim()) {
      setError("Họ tên và mật khẩu không được chỉ gồm khoảng trắng.");
      return;
    }
    if (password !== confirm) {
      setError("Mật khẩu nhập lại chưa khớp.");
      return;
    }
    inFlight.current = true;
    setPending(true);
    setError("");
    try {
      const created = await auth.register({
        email: email.trim(),
        full_name: fullName.trim(),
        password,
        role,
      });
      setPassword("");
      setConfirm("");
      navigate("/login", {
        replace: true,
        state: { email: created.email, registered: true },
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
      title="Bắt đầu từ hôm nay."
      intro="Tạo tài khoản để cùng khám phá hương vị Việt."
    >
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      <form onSubmit={submit} aria-busy={pending}>
        <fieldset disabled={pending}>
          <legend className="sr-only">Thông tin đăng ký</legend>
          <label htmlFor="register-name">Họ và tên</label>
          <input
            id="register-name"
            name="full_name"
            autoComplete="name"
            required
            maxLength={120}
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Nguyễn Văn A"
          />
          <label htmlFor="register-email">Email</label>
          <input
            id="register-email"
            name="email"
            type="email"
            autoComplete="username"
            required
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="ban@example.vn"
          />
          <div className="field-pair">
            <div>
              <label htmlFor="register-password">Mật khẩu</label>
              <input
                id="register-password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={128}
                aria-describedby="password-hint"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <div>
              <label htmlFor="register-confirm">Nhập lại mật khẩu</label>
              <input
                id="register-confirm"
                name="confirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={128}
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
              />
            </div>
          </div>
          <p id="password-hint" className="field-hint">
            Từ 8 đến 128 ký tự.
          </p>
          <label htmlFor="register-role">Bạn đến với Vị Việt với vai trò</label>
          <select
            id="register-role"
            value={role}
            onChange={(event) =>
              setRole(event.target.value as "customer" | "vendor")
            }
          >
            <option value="customer">Khách hàng</option>
            <option value="vendor">Chủ quán</option>
          </select>
          {role === "vendor" && (
            <p className="field-hint">
              Tài khoản chủ quán cần được liên kết với quán để sử dụng các chức
              năng quản lý.
            </p>
          )}
          <button className="button full" type="submit">
            {pending ? "Đang tạo tài khoản…" : "Tạo tài khoản"}
            <span aria-hidden="true">↗</span>
          </button>
        </fieldset>
      </form>
      <p className="auth-switch">
        Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
      </p>
    </AuthLayout>
  );
}

import type { ReactNode } from "react";

export default function AuthLayout({
  children,
  title,
  intro,
}: {
  children: ReactNode;
  title: string;
  intro: string;
}) {
  return (
    <div className="auth-layout">
      <aside className="auth-story" aria-label="Về Vị Việt">
        <span className="eyebrow">GẦN GŨI TỪ HƯƠNG VỊ</span>
        <h2>
          <span>Mỗi bữa ăn,</span> <span>một chút</span> <em>thân quen.</em>
        </h2>
        <p>
          Từ món quen mỗi ngày đến hương vị mới để khám phá. Bắt đầu hành trình
          của bạn cùng Vị Việt.
        </p>
        <div className="bowl-art" aria-hidden="true">
          <span className="steam one" />
          <span className="steam two" />
          <span className="steam three" />
          <span className="chopsticks" />
          <span className="bowl-rim" />
          <span className="bowl" />
          <span className="bowl-foot" />
          <span className="bowl-caption">ĐẬM VỊ VIỆT · ẤM MỖI NGÀY</span>
        </div>
      </aside>
      <section className="auth-form-panel" aria-labelledby="auth-title">
        <span className="eyebrow">CHÀO BẠN ĐẾN VỚI VỊ VIỆT</span>
        <h1 id="auth-title">{title}</h1>
        <p className="form-intro">{intro}</p>
        {children}
      </section>
    </div>
  );
}

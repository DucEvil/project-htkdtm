# Cài đặt và tạo cơ sở dữ liệu Vị Việt

Hướng dẫn khởi chạy backend có `/health`, tài liệu API tự sinh, API auth và frontend đăng ký/đăng nhập. Đã có migration `001` tạo 15 bảng OLTP, gồm tracking; chưa có API giao dịch, seed hoặc dashboard.

## Cấu hình khóa JWT

Sau khi tạo `.env` từ `.env.example`, thay `SECRET_KEY` mẫu bằng khóa ngẫu nhiên riêng. Có thể chạy lệnh sau với Python đã cài và lưu kết quả vào `SECRET_KEY` trong `.env` một lần:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Giữ nguyên khóa giữa các lần khởi động nếu muốn token tiếp tục hợp lệ; không commit `.env` hoặc đưa khóa vào frontend. Các thao tác cần JWT trả 503 `AUTH_NOT_CONFIGURED` nếu khóa dưới 32 byte hoặc còn bắt đầu bằng `changeme`; health/docs vẫn chạy. `ALGORITHM` chỉ nhận HS256, access mặc định 60 phút và refresh 7 ngày; cấu hình ở `.env.example`. Khi chạy lại phần local bên dưới, không ghi đè `.env` đã chỉnh bằng file mẫu.

## Chạy local trên Windows

Cần Python 3.11 trở lên; Node.js 20.19+, 22.12+ hoặc 24+ theo `engines` frontend. Với PostgreSQL, DB/tài khoản trong `.env` cần tồn tại và máy chủ DB đang chạy; có thể chạy riêng DB bằng `docker compose up db -d` từ thư mục nhóm nếu có Docker. Để thử local chưa có PostgreSQL, dùng lựa chọn SQLite được chú thích trong đoạn lệnh dưới. Từ thư mục `nhom14-65httt/`:

```powershell
# Chỉ copy ở lần đầu; sau đó cấu hình SECRET_KEY như hướng dẫn phía trên:
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
python -m venv src/backend/.venv
src/backend/.venv/Scripts/python.exe -m pip install -r src/backend/requirements.txt -r src/backend/requirements-dev.txt
Set-Location src/backend
# Chỉ bỏ chú thích dòng này nếu muốn dùng SQLite local thay PostgreSQL:
# $env:DATABASE_URL = 'sqlite:///./viviet.db'
.venv/Scripts/python.exe -m alembic upgrade head
.venv/Scripts/python.exe -m alembic current
.venv/Scripts/python.exe -m alembic check
.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Backend: `http://localhost:8000/health`; tài liệu API: `http://localhost:8000/docs`.

Trong `/docs`, thử lần lượt `POST /api/v1/auth/register`, `/login`, nhập access token vào nút Authorize rồi gọi `GET /api/v1/auth/me`. `/refresh` nhận refresh token trong JSON. Mật khẩu/role và mã lỗi xem [API contract](API_CONTRACT.md). Refresh chưa thu hồi token cũ; chưa có logout phía máy chủ. Chưa có tài khoản admin mẫu hoặc seed quán.

Sau migrate, `current` cần báo `001 (head)`, `check` không báo thay đổi schema mới. File SQLite local là dữ liệu phát sinh và được Git bỏ qua. Nếu dùng biến môi trường DATABASE_URL cho SQLite, cần giữ cùng giá trị khi chạy backend và các lệnh Alembic. Không cần seed ở bước này vì chưa có dữ liệu mẫu.

Mở terminal khác tại thư mục nhóm:

```powershell
Set-Location src/frontend
npm ci
npm run dev
```

Frontend: `http://localhost:5173`. Vite chuyển `/api` và `/health` sang backend local. `.env` backend luôn được đọc từ thư mục nhóm, không phụ thuộc thư mục chạy lệnh. Frontend dùng cấu hình riêng tại `src/frontend/.env.local` nếu cần; xem `.env.example` bên cạnh.

Mở `/register` để tạo customer/vendor, sau đó đăng nhập ở `/login`. Khách đến `/account`, chủ quán đến `/vendor`, admin đã được cấp hợp lệ đến `/admin`; hiện các trang này chỉ hiển thị tài khoản và kiểm tra vai trò, chưa có dashboard. Tải lại trang để kiểm tra phục hồi qua `/me`; logout chỉ xóa phiên trình duyệt. Chưa có tài khoản admin mẫu; đăng ký công khai không nhận admin.

## Chạy bằng Docker

Từ thư mục nhóm, sau khi copy `.env.example` thành `.env`:

```powershell
docker compose up --build
```

Compose chạy PostgreSQL 16, backend ở cổng 8000 và frontend ở cổng 5173. Backend dùng hostname `db`; Vite proxy tới `backend:8000` trong mạng Docker. Mở terminal khác tại thư mục nhóm để tạo/kiểm tra schema:

```powershell
docker compose exec backend python -m alembic upgrade head
docker compose exec backend python -m alembic current
docker compose exec backend python -m alembic check
```

Nếu có Make, các lệnh tương ứng là `make migrate`, `make migrate-status`, `make migrate-check`. Chưa chạy `make seed` hoặc `make etl` vì các module đó chưa được tích hợp. Backend không tự chạy migration lúc khởi động.

Docker chưa được kiểm chứng trong phiên phát triển này vì máy không có Docker CLI trong PATH. Cần thử lại trên máy có Docker Desktop trước khi đánh dấu nghiệm thu.

## Kiểm tra

```powershell
# Từ src/backend
.venv/Scripts/python.exe -m pytest tests -q

# Từ src/frontend
npm run build
npm run lint
npm run format:check
npm test
```

Toàn bộ 425 kiểm thử đạt, gồm 84 ca auth, các model OLTP và 23 ca migration. Kiểm thử auth dùng API thật trên SQLite tạm được migration tạo, gồm đăng ký/đăng nhập, JWT/refresh, vai trò/quyền sở hữu và dữ liệu không hợp lệ. Migration kiểm tra nâng/hạ/nâng lại, lệch schema, constraint, đường dẫn, URL và mặc định JSON. PostgreSQL mới kiểm tra SQL offline; chưa xác nhận PostgreSQL/Docker thực tế hoặc API giao dịch/tracking.

Frontend có 54 kiểm thử Vitest/React UI và bốn kịch bản Playwright đạt với backend thật trên SQLite tạm; đã kiểm tra ảnh login/register Material Design 3 ở 360/390/768/1280px, bàn phím, hiện/ẩn mật khẩu, dialog và lựa chọn ghi nhớ đăng nhập. Build, TypeScript (gồm tests/config), lint và format check đạt. Kết quả 425 ca backend là mốc của commit backend auth; lượt frontend không đổi mã Python. npm audit còn bốn cảnh báo thuộc Vite 5/React Router 6 đã có; chưa nâng major toolchain trong phần auth này.

## Kiểm thử auth trên trình duyệt

Các kịch bản E2E tạo tài khoản thử qua giao diện, vì vậy chạy backend với DB SQLite riêng. Sau khi đã cài dependencies, mở terminal tại thư mục nhóm:

```powershell
New-Item -ItemType Directory -Force .runtime | Out-Null
$testDatabase = Join-Path (Get-Location).Path '.runtime/auth-e2e.db'
$backendPython = Join-Path (Get-Location).Path 'src/backend/.venv/Scripts/python.exe'
$env:DATABASE_URL = 'sqlite:///' + $testDatabase.Replace('\', '/')
$env:SECRET_KEY = & $backendPython -c "import secrets; print(secrets.token_urlsafe(48))"
Set-Location src/backend
& $backendPython -m alembic upgrade head
& $backendPython -m uvicorn app.main:app --host 127.0.0.1 --port 8001
```

Terminal thứ hai, từ `src/frontend/`:

```powershell
$env:API_PROXY_TARGET = 'http://127.0.0.1:8001'
npm run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

Terminal thứ ba, từ `src/frontend/` trên Windows có Microsoft Edge:

```powershell
$env:E2E_BASE_URL = 'http://127.0.0.1:5174'
$env:E2E_BROWSER_CHANNEL = 'msedge'
npm run test:e2e
```

Nếu chưa có Edge, có thể cài Chromium dành cho Playwright bằng `npx playwright install chromium`, bỏ biến `E2E_BROWSER_CHANNEL` và chạy lại. Bộ test không tự khởi động server hay chọn DB thay bạn. Không trỏ E2E vào DB ứng dụng cần giữ; dùng Ctrl+C để dừng hai server thử sau khi kiểm tra. Ảnh kiểm tra nằm trong `.runtime/playwright-results/`, không đưa vào Git. Trên Windows bị chặn `npm.ps1`, dùng `npm.cmd` thay `npm`.

## Thay đổi schema sau này

Chạy `alembic revision --autogenerate -m "mo ta thay doi"` rồi review thao tác và kiểm thử trước khi áp dụng. Revision `001` là bản khởi tạo cố định; không sửa để thay cho việc tạo revision mới sau khi nó đã được commit/áp dụng. Các bảng BI/đánh giá mù sẽ được bổ sung ở các phần sau bằng migration mới.

Lệnh `alembic downgrade base` xóa 15 bảng và dữ liệu của chúng. Chỉ dùng để kiểm tra trên DB tạm có thể bỏ, không dùng trên DB cần giữ dữ liệu. Bộ test migration đã kiểm tra rollback trong DB tạm; chưa chạy rollback trên DB ứng dụng của bạn.

Các bước chạy và kiểm tra ở trên không cần `.runtime/pending-implementation/`. Khi clone trên máy khác, cài lại môi trường từ requirements và `package-lock.json`; không cần sao chép bản nháp cục bộ.

Không đưa `.env`, `.venv/`, `node_modules/`, `dist/` hay `.runtime/` vào commit.

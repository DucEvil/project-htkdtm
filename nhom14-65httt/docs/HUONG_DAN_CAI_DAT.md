# Cài đặt và tạo cơ sở dữ liệu Vị Việt

Hướng dẫn khởi chạy backend có `/health`, tài liệu API tự sinh và frontend tối thiểu. Đã có migration `001` tạo 15 bảng OLTP, gồm tracking; chưa có API nghiệp vụ, seed hoặc dashboard.

## Chạy local trên Windows

Cần Python 3.11 trở lên và Node.js 20 trở lên. Với PostgreSQL, DB/tài khoản trong `.env` cần tồn tại và máy chủ DB đang chạy; có thể chạy riêng DB bằng `docker compose up db -d` từ thư mục nhóm nếu có Docker. Để thử local chưa có PostgreSQL, dùng lựa chọn SQLite được chú thích trong đoạn lệnh dưới. Từ thư mục `nhom14-65httt/`:

```powershell
Copy-Item .env.example .env
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

Sau migrate, `current` cần báo `001 (head)`, `check` không báo thay đổi schema mới. File SQLite local là dữ liệu phát sinh và được Git bỏ qua. Nếu dùng biến môi trường DATABASE_URL cho SQLite, cần giữ cùng giá trị khi chạy backend và các lệnh Alembic. Không cần seed ở bước này vì chưa có dữ liệu mẫu.

Mở terminal khác tại thư mục nhóm:

```powershell
Set-Location src/frontend
npm ci
npm run dev
```

Frontend: `http://localhost:5173`. Vite chuyển `/api` và `/health` sang backend local. `.env` backend luôn được đọc từ thư mục nhóm, không phụ thuộc thư mục chạy lệnh. Frontend dùng cấu hình riêng tại `src/frontend/.env.local` nếu cần; xem `.env.example` bên cạnh.

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
```

Toàn bộ 341 kiểm thử đạt, gồm các model OLTP và 23 ca migration: nâng/hạ/nâng lại, kiểm tra lệch schema, ghi dữ liệu trên schema thực sự do Alembic tạo, constraint, đường dẫn cấu hình, URL mật khẩu có ký tự đặc biệt và so sánh mặc định JSON. Kiểm thử DB dùng SQLite tạm; PostgreSQL mới kiểm tra SQL offline. Chưa xác nhận chạy trên PostgreSQL thực tế hoặc API giao dịch/tracking.

## Thay đổi schema sau này

Chạy `alembic revision --autogenerate -m "mo ta thay doi"` rồi review thao tác và kiểm thử trước khi áp dụng. Revision `001` là bản khởi tạo cố định; không sửa để thay cho việc tạo revision mới sau khi nó đã được commit/áp dụng. Các bảng BI/đánh giá mù sẽ được bổ sung ở các phần sau bằng migration mới.

Lệnh `alembic downgrade base` xóa 15 bảng và dữ liệu của chúng. Chỉ dùng để kiểm tra trên DB tạm có thể bỏ, không dùng trên DB cần giữ dữ liệu. Bộ test migration đã kiểm tra rollback trong DB tạm; chưa chạy rollback trên DB ứng dụng của bạn.

Các bước chạy và kiểm tra ở trên không cần `.runtime/pending-implementation/`. Khi clone trên máy khác, cài lại môi trường từ requirements và `package-lock.json`; không cần sao chép bản nháp cục bộ.

Không đưa `.env`, `.venv/`, `node_modules/`, `dist/` hay `.runtime/` vào commit.

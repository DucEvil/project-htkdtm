# Cài đặt Phase 0

Hướng dẫn khởi chạy backend có `/health`, tài liệu API tự sinh và frontend tối thiểu. Đã khai báo các models OLTP của bước F.5, gồm tracking, nhưng chưa có migration tạo bảng nghiệp vụ trong DB ứng dụng hoặc API nghiệp vụ.

## Chạy local trên Windows

Cần Python 3.11 trở lên và Node.js 20 trở lên. Từ thư mục `nhom14-65httt/`:

```powershell
Copy-Item .env.example .env
python -m venv src/backend/.venv
src/backend/.venv/Scripts/python.exe -m pip install -r src/backend/requirements.txt -r src/backend/requirements-dev.txt
Set-Location src/backend
.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Backend: `http://localhost:8000/health`; tài liệu API: `http://localhost:8000/docs`.

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

Compose chạy PostgreSQL 16, backend ở cổng 8000 và frontend ở cổng 5173. Backend dùng hostname `db`; Vite proxy tới `backend:8000` trong mạng Docker. Chưa cần chạy migrate/seed vì chưa có migration revision hoặc dữ liệu mẫu. Các lệnh đó sẽ được bổ sung và kiểm tra theo từng phần.

Docker chưa được kiểm chứng trong phiên phát triển này vì máy không có Docker CLI trong PATH. Cần thử lại trên máy có Docker Desktop trước khi đánh dấu nghiệm thu.

## Kiểm tra

```powershell
# Từ src/backend
.venv/Scripts/python.exe -m pytest tests -q

# Từ src/frontend
npm run build
```

Các kiểm tra gồm health, request ID, CORS, cấu trúc lỗi, cấu hình URL DB và các ràng buộc dữ liệu của models OLTP trên SQLite, gồm chống trùng và liên kết nguồn tracking. Chúng không xác nhận kết nối PostgreSQL, API giao dịch/tracking hoặc các chức năng ở phần sau.

Các bước chạy và kiểm tra ở trên không cần `.runtime/pending-implementation/`. Khi clone trên máy khác, cài lại môi trường từ requirements và `package-lock.json`; không cần sao chép bản nháp cục bộ.

Không đưa `.env`, `.venv/`, `node_modules/`, `dist/` hay `.runtime/` vào commit.

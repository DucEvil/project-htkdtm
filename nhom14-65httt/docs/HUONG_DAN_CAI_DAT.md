# Cài đặt Phase 0

Phase này chỉ khởi chạy backend có `/health`, tài liệu API tự sinh và frontend tối thiểu. Chưa có model, bảng nghiệp vụ, đăng nhập, đặt đơn, AI hay BI.

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

Compose chạy PostgreSQL 16, backend ở cổng 8000 và frontend ở cổng 5173. Backend dùng hostname `db`; Vite proxy tới `backend:8000` trong mạng Docker. Chưa cần chạy migrate/seed ở Phase 0 vì chưa có models hoặc revision. Các lệnh đó sẽ được bổ sung và kiểm tra theo từng phase.

Docker chưa được kiểm chứng trong phiên phát triển này vì máy không có Docker CLI trong PATH. Cần thử lại trên máy có Docker Desktop trước khi đánh dấu nghiệm thu.

## Kiểm tra

```powershell
# Từ src/backend
.venv/Scripts/python.exe -m pytest tests -q

# Từ src/frontend
npm run build
```

Các kiểm tra Phase 0 gồm health, request ID, CORS, cấu trúc lỗi và cấu hình URL DB. Chúng không xác nhận kết nối PostgreSQL hoặc các chức năng ở phase sau.

Không đưa `.env`, `.venv/`, `node_modules/`, `dist/` hay `.runtime/` vào commit.

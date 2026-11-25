# Backend Vị Việt

Đã có nền tảng FastAPI (Phase 0): `/health`, tài liệu OpenAPI tại `/docs`, cấu hình môi trường, SQLAlchemy, Alembic, middleware request ID/CORS/logging và định dạng lỗi thống nhất. Chưa có models, migration revision hoặc API nghiệp vụ.

## Phạm vi dự kiến

- Xác thực và phân quyền khách hàng, chủ quán, quản trị viên.
- Hồ sơ quán, giờ mở cửa, phạm vi phục vụ, thực đơn, nguyên liệu và trạng thái món.
- Giỏ hàng, kiểm tra khả dụng khi đặt, xử lý đơn và lịch sử trạng thái.
- Hồ sơ khẩu vị, lọc ứng viên, gợi ý theo nội dung và giải thích bằng đặc trưng thực.
- Ghi nhận yêu cầu gợi ý, lượt hiển thị, nhấp, đặt và phản hồi; cấp dữ liệu cho ETL/BI.

## Quy tắc nghiệp vụ cần giữ

- Mỗi đơn thuộc một quán; kiểm tra lại giá và khả dụng ở thời điểm đặt.
- Yêu cầu gửi lặp không tạo thêm đơn; chỉ cho phép chuyển trạng thái hợp lệ.
- Chủ quán chỉ xử lý dữ liệu và đơn thuộc quán mình.
- Phải lọc điều kiện bắt buộc trước xếp hạng; không suy diễn nguyên liệu còn thiếu hoặc tự nới điều kiện để đủ 5 gợi ý.
- Phản hồi đánh giá sau đơn hoàn tất; không coi dữ liệu người dùng ViFoodRec là tài khoản khách hàng website.

## Công nghệ và đầu ra khi lập trình

Python >=3.11, FastAPI, SQLAlchemy, PostgreSQL và scikit-learn. Phụ thuộc được khai báo trong `requirements.txt` và `requirements-dev.txt`. Chạy từ thư mục này: `python -m uvicorn app.main:app --reload`; kiểm tra: `python -m pytest tests -q`. Xem [hướng dẫn cài đặt](../../docs/HUONG_DAN_CAI_DAT.md) để tạo môi trường trước khi chạy.

Các module sẽ được thêm theo từng phần, bắt đầu từ `users/models.py`. Alembic trong backend là nguồn schema duy nhất; chỉ thêm migration sau khi các models liên quan được chốt.

Xem [README nhóm](../../README.md), [nguồn dữ liệu](../../docs/NGUON_DU_LIEU.md) và [kế hoạch](../../docs/KE_HOACH_THUC_HIEN.md).


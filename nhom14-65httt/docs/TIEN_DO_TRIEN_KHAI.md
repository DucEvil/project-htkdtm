# Tiến độ triển khai theo từng phần

Mỗi lượt triển khai chỉ thêm một phần để nhóm kiểm tra và commit riêng. Trình tự dưới đây theo phần F của [thiết kế](THIET_KE_CAU_TRUC.md). Có file khung không đồng nghĩa chức năng đã hoàn tất.

| Phần | Nội dung | Trạng thái trong mã nguồn hiện tại |
| :--- | :--- | :--- |
| Phase 0 | Cấu hình môi trường, Docker, backend/frontend chạy tối thiểu | Đã chuẩn bị; xem hướng dẫn cài đặt và kết quả kiểm tra |
| Phase 1.1 | `users/models.py`: tài khoản và vai trò | Chưa đưa vào mã nguồn hiện tại |
| Phase 1.2 | `preferences/models.py`: khẩu vị | Chưa đưa vào mã nguồn hiện tại |
| Phase 1.3 | `restaurants/models.py`: quán và thành viên quản lý | Chưa đưa vào mã nguồn hiện tại |
| Phase 1.4 | `menu/models.py`: món chuẩn, món bán, nguyên liệu | Chưa đưa vào mã nguồn hiện tại |
| Phase 1.5 | `orders/models.py`: đơn, món đặt và lịch sử | Chưa đưa vào mã nguồn hiện tại |
| Phase 1.6 | `reviews/models.py`: đánh giá món | Chưa đưa vào mã nguồn hiện tại |
| Phase 1.7 | `tracking/models.py`: yêu cầu gợi ý, hiển thị, sự kiện | Chưa đưa vào mã nguồn hiện tại |
| Phase 1.8 | Migration ban đầu, ERD và từ điển dữ liệu | Chờ các model được chốt |
| Phase 1.9 | Auth backend, frontend và kiểm thử | Chờ models/migration |
| Phase 2 | Nghiệp vụ giao dịch, vendor/admin và giao diện | Chưa đưa vào mã nguồn hiện tại |
| Phase 3 | AI, tracking và dữ liệu | Chưa đưa vào mã nguồn hiện tại |
| Phase 4 | ETL, BI, Power BI và đánh giá | Chưa đưa vào mã nguồn hiện tại |
| Phase 5 | Tích hợp, kiểm thử và bàn giao | Chưa thực hiện |

Phần đã soạn trước cho các phase sau được lưu cục bộ trong `.runtime/pending-implementation/`, được `.gitignore` bỏ qua. Đây là bản nháp tham khảo, chưa phải thay đổi để commit ở lượt này; mỗi phần phải được kiểm tra lại khi đưa vào dự án.

Không tạo file `.pbix` rỗng thay cho sản phẩm Power BI và không đánh dấu các khảo sát, thử nghiệm người dùng hay kết quả nghiệm thu là hoàn tất khi chưa thực hiện.

## Kết quả kiểm tra Phase 0

- Backend: 5 kiểm thử đạt (health/request ID, định dạng lỗi, CORS, cấu hình URL DB).
- Frontend: `npm run build` và `npm run format:check` đạt.
- Chưa kiểm chứng Docker/PostgreSQL vì môi trường phát triển không có Docker CLI.
- Chưa commit hoặc push. Bước tiếp theo là riêng `User` model và vai trò; không tích hợp các module khác trong cùng lượt.

# Frontend Vị Việt

Đã có ứng dụng tối thiểu React/Vite/TypeScript (Phase 0), trang chủ, trang 404 và liên kết kiểm tra kết nối backend. Các màn hình nghiệp vụ dưới đây chưa được đưa vào mã nguồn; chúng sẽ được triển khai theo từng phần để commit riêng.

## Các màn hình dự kiến

| Vai trò | Nhóm màn hình |
| :--- | :--- |
| Khách hàng | Đăng nhập, khai báo khẩu vị, chọn vị trí, tìm món/quán, danh sách gợi ý có lý do, thực đơn, giỏ hàng, tạo và theo dõi đơn, phản hồi |
| Chủ quán | Hồ sơ quán, giờ mở/phạm vi phục vụ, thực đơn/nguyên liệu/trạng thái, danh sách đơn, cập nhật trạng thái và thống kê quán |
| Quản trị viên | Duyệt quán, danh mục món chuẩn và nhãn, tài khoản, kiểm tra dữ liệu và dashboard |

## Các tình huống phải thể hiện

- Người dùng có thể nhập địa chỉ khi không cấp quyền vị trí.
- Quán xuất hiện trên bản đồ nhưng chưa tham gia hệ thống không có thao tác đặt món qua Vị Việt.
- Hiển thị lý do gợi ý, danh sách ngắn khi ít ứng viên và thông báo chưa cá nhân hóa khi khách bỏ qua khai báo.
- Thông báo khi món hết bán, ngoài phạm vi phục vụ, đơn bị từ chối hoặc trạng thái thay đổi.
- Khóa thao tác gửi lặp trên giao diện kết hợp kiểm soát ở backend; không dựa riêng vào việc ẩn nút để phân quyền.

## Công nghệ và đầu ra khi lập trình

Node.js >=20, React 18, Vite 5 và TypeScript 5.6. Từ thư mục này chạy `npm ci`, `npm run dev`; kiểm tra biên dịch bằng `npm run build`. Dùng `npm run format` để định dạng và `npm run format:check` để kiểm tra định dạng.

`VITE_API_BASE_URL` mặc định `/api/v1`; Vite chuyển `/api` và `/health` tới backend. Chạy local dùng `http://127.0.0.1:8000`; Docker đặt `API_PROXY_TARGET=http://backend:8000`. Không đưa khóa bí mật vào biến môi trường có tiền tố `VITE_` vì chúng có thể xuất hiện trong mã trình duyệt.

Xem [hướng dẫn cài đặt](../../docs/HUONG_DAN_CAI_DAT.md) và [tiến độ từng phần](../../docs/TIEN_DO_TRIEN_KHAI.md).

Xem [README nhóm](../../README.md) và [kế hoạch](../../docs/KE_HOACH_THUC_HIEN.md).


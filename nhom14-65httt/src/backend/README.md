# Backend Vị Việt

Đã có nền tảng FastAPI: `/health`, tài liệu OpenAPI tại `/docs`, cấu hình môi trường, SQLAlchemy, Alembic, middleware request ID/CORS/logging và định dạng lỗi thống nhất. Đã bổ sung models `User`, `Preference`, `Restaurant` và `RestaurantMembership`; chưa có migration revision hoặc API nghiệp vụ.

## Model tài khoản đã bổ sung

`app/users/models.py` định nghĩa bảng `users` và enum `UserRole`:

| Trường | Nội dung |
| :--- | :--- |
| `id` | Khóa chính tự tăng |
| `email` | Bắt buộc, duy nhất; ORM bỏ khoảng trắng đầu/cuối và chuyển chữ thường trước khi lưu |
| `full_name` | Họ tên bắt buộc; ORM loại khoảng trắng đầu/cuối, không nhận chuỗi rỗng |
| `hashed_password` | Chuỗi băm mật khẩu bắt buộc; việc tạo hash sẽ được triển khai trong module auth |
| `role` | `customer`, `vendor`, `admin`; mặc định `customer`, có CHECK constraint ở DB |
| `is_simulated` | Phân biệt tài khoản mô phỏng; mặc định `false` |
| `created_at` | Thời điểm tạo; mặc định UTC phía Python, có mặc định phía DB |

Alembic đã import model để nhận metadata. Chưa tạo bảng trong DB ứng dụng; migration ban đầu sẽ được viết sau khi các model được chốt. Kiểm thử dùng DB SQLite riêng trong bộ nhớ, không thay đổi DB ứng dụng. Khai báo vai trò ở đây chưa phải chức năng xác thực hoặc phân quyền API.

## Model khẩu vị đã bổ sung

`app/preferences/models.py` định nghĩa bảng `preferences`. `user_id` vừa là khóa chính vừa tham chiếu `users.id`, nên mỗi tài khoản có tối đa một hồ sơ. Xóa tài khoản sẽ xóa hồ sơ khẩu vị đi kèm. Người bỏ qua khai báo chưa có bản ghi Preference; không tự tạo hồ sơ rỗng khi tạo User.

Năm câu hỏi được đối chiếu với [đặc tả frontend](../frontend/README.md), mục bản đồ route và luồng khách mới. Bản thiết kế cấu trúc yêu cầu năm câu hỏi nhưng chưa chốt từng cột; các quy ước chi tiết được ghi dưới đây để dùng thống nhất ở API và giao diện sau này.

| Câu hỏi | Trường | Quy ước dữ liệu |
| :--- | :--- | :--- |
| Thích hương vị vùng nào? | `regions` | Danh sách nhãn vùng miền; mặc định `[]` |
| Mức cay mong muốn? | `spice_level` | Số nguyên 0–3: không cay, ít cay, vừa cay, rất cay; mặc định 0 |
| Nguyên liệu yêu thích? | `liked_ingredients` | Danh sách nguyên liệu; mặc định `[]` |
| Nguyên liệu cần tránh? | `avoided_ingredients` | Danh sách nguyên liệu cần loại; mặc định `[]` |
| Sẵn sàng thử món mới đến đâu? | `exploration_level` | Số nguyên 0–2: món quen, cân bằng, ưu tiên khám phá; mặc định 1 |

Gán danh sách qua ORM sẽ bỏ khoảng trắng đầu/cuối và loại trùng không phân biệt hoa/thường; tên nguyên liệu được chuyển chữ thường. Các danh sách dùng MutableList để lưu được thay đổi tại chỗ như `append`/`remove`. Mức cay và mức khám phá có CHECK constraint ở DB. Việc kiểm tra API, mã hóa vector và áp dụng nguyên liệu cần tránh khi gợi ý sẽ được triển khai ở các phần sau; chưa có trong model này.

## Models quán và liên kết quản lý đã bổ sung

Theo mục C.5 và F.5 của [thiết kế](../../docs/THIET_KE_CAU_TRUC.md), `app/restaurants/models.py` định nghĩa `Restaurant`, `RestaurantMembership` và enum `RestaurantStatus`. Các giới hạn, kiểu dữ liệu và mặc định dưới đây là quy ước triển khai chi tiết để API/UI dùng thống nhất.

| Trường Restaurant | Quy ước |
| :--- | :--- |
| `id` | Khóa chính tự tăng |
| `name`, `address` | Bắt buộc; bỏ khoảng trắng đầu/cuối; tối đa 160/500 ký tự |
| `latitude`, `longitude` | Số hữu hạn; trong khoảng [-90, 90] và [-180, 180] |
| `delivery_radius_km` | Lớn hơn 0 và không quá 50 km; mặc định 5 km |
| `opens_at`, `closes_at` | Kiểu TIME theo giờ địa phương Việt Nam (UTC+7); ORM nhận `time` hoặc chuỗi `HH:MM` |
| `accepting_orders` | Cờ nhận đơn; mặc định `false` để quán mới chưa tự nhận đơn |
| `status` | `pending`, `approved`, `suspended`; mặc định `pending`, có CHECK constraint |
| `is_simulated` | Cờ dữ liệu mô phỏng; mặc định `false` |

Giờ phục vụ có độ chính xác đến phút. Chấp nhận khoảng qua đêm, ví dụ 22:00–02:00; hai mốc bằng nhau được quy ước là phục vụ 24 giờ. Mặc định cả hai là 00:00. Việc xác định quán đang mở và kiểm tra kết hợp trạng thái duyệt/cờ nhận đơn sẽ được viết trong service khi triển khai nghiệp vụ; model hiện chỉ lưu giờ và các cờ.

`RestaurantMembership.user_id` vừa là khóa chính vừa tham chiếu `users.id`: mỗi tài khoản quản lý tối đa một quán, phù hợp API `/vendor/restaurant` trong bản thiết kế. `restaurant_id` tham chiếu `restaurants.id`, có index và cho phép nhiều tài khoản cùng liên kết một quán. Đây là quy ước MVP; chưa mở rộng một tài khoản quản lý chuỗi nhiều quán.

Khóa ngoại chặn xóa tài khoản/quán đang có membership để không làm mất liên kết ngoài ý muốn; cần xử lý membership trước khi xóa. FK chỉ kiểm tra đối tượng tồn tại, chưa thay thế kiểm tra vai trò `vendor` và quyền sở hữu trên API. Phần đó thuộc module auth/vendor theo các bước tiếp theo của Markdown. Alembic đã nhận metadata của hai model; chưa tạo migration hay bảng trong DB ứng dụng.

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

Các module được thêm theo từng phần; tiếp theo là `menu/models.py` với CanonicalDish, MenuItem, Ingredient và MenuItemIngredient. Alembic trong backend là nguồn schema duy nhất; chỉ thêm migration sau khi các models liên quan được chốt.

Xem [README nhóm](../../README.md), [nguồn dữ liệu](../../docs/NGUON_DU_LIEU.md) và [kế hoạch](../../docs/KE_HOACH_THUC_HIEN.md).


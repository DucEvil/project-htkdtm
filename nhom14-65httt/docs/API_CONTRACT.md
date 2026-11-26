# Hợp đồng API Vị Việt

Tài liệu hiện mô tả auth F.8 và hồ sơ/duyệt quán ở phần đầu F.10. API khẩu vị, thực đơn, tìm kiếm, giao dịch và tracking chưa triển khai; sẽ bổ sung từng phần. OpenAPI tại `http://localhost:8000/docs` phản ánh request/response đang chạy.

## Quy ước chung

- Base URL local: `http://localhost:8000/api/v1`. Gửi body JSON với `Content-Type: application/json`.
- Endpoint yêu cầu đăng nhập nhận `Authorization: Bearer <access_token>`. Refresh token chỉ gửi trong body `/auth/refresh`, không dùng thay access token.
- ID người dùng là số nguyên; timestamp response dùng ISO 8601. Thời điểm phía ứng dụng dùng UTC; SQLite demo có thể trả timestamp không kèm offset khi đọc lại từ DB.
- Lỗi theo dạng `{"error":{"code":"...","message":"...","details":{}}}`. Với 422, `details` là danh sách trường lỗi; không chứa giá trị input hoặc body mật khẩu. Mọi response có `X-Request-ID`.
- Response đăng nhập/refresh có `Cache-Control: no-store`. Lỗi xác thực 401 có `WWW-Authenticate: Bearer`.

## `POST /auth/register`

Không cần token. Tạo tài khoản và trả UserOut, không tự đăng nhập.

```json
{
  "email": "khach@example.vn",
  "password": "Mat khau demo 123!",
  "full_name": "Nguyễn Văn A",
  "role": "customer"
}
```

| Trường | Bắt buộc | Quy tắc |
| :--- | :--- | :--- |
| `email` | Có | Bỏ khoảng trắng đầu/cuối, chuyển chữ thường, tối đa 254 ký tự; kiểm tra cơ bản dạng `ten@mien.duoi`, không xác minh hộp thư |
| `password` | Có | 8–128 ký tự, không chỉ gồm khoảng trắng; giữ nguyên khoảng trắng đầu/cuối |
| `full_name` | Có | Bỏ khoảng trắng đầu/cuối, dài 1–120 ký tự |
| `role` | Không | Mặc định `customer`; chỉ nhận `customer` hoặc `vendor` |

Các trường ngoài schema bị từ chối 422, bao gồm `is_simulated`, `hashed_password` và thông tin tự cấp quyền. Vai trò `admin` không được tạo qua đăng ký công khai. Đăng ký vendor chưa tạo quán hoặc membership; các bước đó thuộc module quán sau này.

Thành công **201**, body UserOut:

```json
{
  "id": 1,
  "email": "khach@example.vn",
  "full_name": "Nguyễn Văn A",
  "role": "customer",
  "is_simulated": false,
  "created_at": "2026-11-26T10:00:00Z"
}
```

`created_at` trong ví dụ chỉ minh họa định dạng. Response không có mật khẩu hoặc chuỗi băm. Email đã tồn tại sau chuẩn hóa trả **409** `EMAIL_EXISTS`; ràng buộc UNIQUE vẫn bảo vệ khi hai yêu cầu tạo trùng chạy đồng thời.

## `POST /auth/login`

Không cần token. Body:

```json
{
  "email": "khach@example.vn",
  "password": "Mat khau demo 123!"
}
```

Email chuẩn hóa giống đăng ký; password dài 1–128 ký tự và được kiểm tra nguyên dạng. Không nhận trường thừa. Thành công **200**, TokenResponse:

```json
{
  "access_token": "<JWT access>",
  "refresh_token": "<JWT refresh>",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": 1,
    "email": "khach@example.vn",
    "full_name": "Nguyễn Văn A",
    "role": "customer",
    "is_simulated": false,
    "created_at": "2026-11-26T10:00:00Z"
  }
}
```

`expires_in` là số giây sống của access token, lấy từ cấu hình. Email không tồn tại và sai mật khẩu đều trả **401** `INVALID_CREDENTIALS` với cùng thông báo. Email không tồn tại vẫn chạy bước kiểm tra mật khẩu qua hash giả; đây không phải cam kết thời gian phản hồi giống hệt nhau.

Mật khẩu được băm bằng Passlib PBKDF2-SHA256, 600.000 vòng và salt ngẫu nhiên. Không dùng hoặc lưu mật khẩu rõ. Chưa có xác minh email, khôi phục mật khẩu, giới hạn tần suất đăng nhập hoặc chức năng đổi mật khẩu.

## `POST /auth/refresh`

Không cần header Bearer. Body:

```json
{
  "refresh_token": "<JWT refresh>"
}
```

`refresh_token` bắt buộc, dài 1–4096 ký tự; không nhận trường thừa. Thành công **200**, trả TokenResponse với hai token mới và thông tin tài khoản hiện tại. Token access gửi nhầm, token không hợp lệ/hết hạn hoặc tài khoản không còn tồn tại trả **401** `UNAUTHENTICATED`.

Refresh hiện **không lưu trạng thái ở DB**: cấp token mới chưa thu hồi token cũ; token cũ còn dùng được đến hạn. Chưa có denylist, phát hiện dùng lại, thu hồi từng thiết bị hoặc endpoint logout phía máy chủ. `jti` giúp phân biệt token, chưa được lưu để chống phát lại. Logout phía giao diện sau này chỉ xóa token cục bộ; không được mô tả thành thu hồi phiên trên máy chủ. Khi cần thu hồi từng phiên phải bổ sung lưu trữ phiên/token bằng migration mới và cập nhật contract.

## `GET /auth/me`

Yêu cầu access token hợp lệ. Thành công **200** trả UserOut giống response đăng ký. Token không có, sai loại, sai chữ ký, sai thuật toán, sai issuer/audience, thiếu claim bắt buộc, hết hạn hoặc tài khoản đã bị xóa trả **401** `UNAUTHENTICATED`.

Không tin vai trò nằm trong token: backend đọc User từ DB mỗi request. Thay đổi `User.role` có hiệu lực với guard ở lần gọi tiếp theo mà không phải chờ token hết hạn. Model User hiện chưa có trạng thái khóa tài khoản.

## JWT và cấu hình

| Biến | Mặc định | Quy tắc |
| :--- | :--- | :--- |
| `SECRET_KEY` | Placeholder trong `.env.example` | Thay bằng chuỗi ngẫu nhiên; backend từ chối cấp/kiểm tra JWT nếu khóa dưới 32 byte hoặc bắt đầu bằng `changeme` |
| `ALGORITHM` | `HS256` | Chỉ hỗ trợ HS256; cấu hình thuật toán khác không hợp lệ |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | 60 | Số nguyên 1–1440 phút |
| `REFRESH_TOKEN_EXPIRE_DAYS` | 7 | Số nguyên 1–30 ngày |

Token có `sub` là ID User dạng chuỗi, `iss=viviet`, `aud=viviet-api`, `iat`, `exp`, `jti` và `token_type=access|refresh`. Không đặt mật khẩu, hash hoặc vai trò trong token. `iat` không được nằm trong tương lai; `exp` phải lớn hơn thời điểm hiện tại và `iat`. Chữ ký được kiểm tra với thuật toán cấu hình cố định, không lấy thuật toán tùy ý từ client.

Khi SECRET_KEY chưa cấu hình hợp lệ, thao tác cần ký/kiểm tra token trả **503** `AUTH_NOT_CONFIGURED`; `/health` và tài liệu API vẫn chạy. Thay khóa sẽ làm token đã ký bằng khóa cũ không hợp lệ. Hướng dẫn tạo khóa ở [cài đặt](HUONG_DAN_CAI_DAT.md); không đưa khóa vào trình duyệt, Git hoặc log.

## Dependency phân quyền cho các router tiếp theo

| Dependency | Điều kiện | Kết quả |
| :--- | :--- | :--- |
| `get_current_user` | Access token hợp lệ, User còn tồn tại | Trả User từ DB, lỗi 401 khi không xác thực được |
| `require_role(*roles)` | User có một trong các vai trò cho phép | Trả User, lỗi 403 khi không đủ quyền |
| `require_vendor_owner` | Vai trò vendor và membership trùng `restaurant_id` trên route | Trả ID quán, lỗi 403 nếu sai vai trò/chưa có membership/khác quán |

Admin không tự vượt qua guard sở hữu của vendor; router admin dùng guard riêng. Các API hồ sơ quán, duyệt và tạm ngừng quán bên dưới đã áp dụng guard thật; API quản lý thực đơn/đơn hàng/tài khoản admin chưa triển khai.

## Phạm vi kiểm chứng

API auth được kiểm thử với FastAPI TestClient và SQLite tạm có schema tạo bằng migration `001`, gồm dữ liệu tài khoản, token và phân quyền. Frontend F.8 đã tích hợp và được kiểm tra bằng Playwright/Edge với backend thật trên DB SQLite tạm: đăng ký/đăng nhập, tải lại, route theo vai trò và logout. Chưa chạy PostgreSQL/Docker thực tế.

Frontend lưu hai token dưới khóa `viviet.auth.v1`: `localStorage` khi bật “Ghi nhớ đăng nhập”, `sessionStorage` của tab khi tắt. Refresh giữ nguyên nơi lưu, logout xóa cả hai. Không lưu password hoặc dùng User/role trong storage để cấp quyền. Sau tải lại, frontend gọi `/auth/me`; nếu access hết hạn thì gọi `/auth/refresh` và thử lại request một lần. Refresh bị từ chối xóa phiên; lỗi mạng/5xx cho phép thử lại. Request đồng thời dùng chung một refresh; phản hồi từ phiên trước không khôi phục được phiên sau logout/đổi tài khoản. Các phiên localStorage được đồng bộ giữa tab; sessionStorage theo phiên riêng của tab. Backend vẫn nhận token qua JSON/Bearer, chưa có cookie HttpOnly hoặc thu hồi token phía máy chủ.

Giao diện đăng ký yêu cầu đọc/đồng ý nội dung điều khoản và bảo mật của bản thử nghiệm; đây là điều kiện phía client, API hiện chưa nhận/lưu trường chấp thuận. “Quên mật khẩu?” chỉ mở hướng dẫn hỗ trợ; chưa có endpoint reset mật khẩu hoặc đăng nhập Google. Các lỗi validation được hiển thị tiếng Việt tại trường tương ứng; password/confirm không bị xóa khi gửi lỗi.

## Hồ sơ quán và duyệt quán — F.10.1

Prefix chung vẫn là `/api/v1`. Đây là phần API backend; màn hình hồ sơ/duyệt quán sẽ triển khai ở F.12. Các endpoint thực đơn và tìm kiếm chưa có trong phần này.

| Method | Đường dẫn | Quyền | Kết quả |
| :--- | :--- | :--- | :--- |
| GET | `/restaurants/` | Công khai | Trang danh sách quán đã duyệt |
| GET | `/restaurants/{restaurant_id}` | Công khai | Hồ sơ quán đã duyệt, hoặc 404 |
| POST | `/vendor/restaurant` | vendor | Tạo quán pending cùng membership, trả 201 |
| GET | `/vendor/restaurant` | vendor | Hồ sơ quán của tài khoản hiện tại |
| PUT | `/vendor/restaurant` | vendor | Thay toàn bộ hồ sơ quán của tài khoản hiện tại |
| GET | `/admin/restaurants` | admin | Trang danh sách quán ở mọi trạng thái |
| PATCH | `/admin/restaurants/{restaurant_id}/approve` | admin | Duyệt/quyết định hoạt động trở lại, trả 200 |
| PATCH | `/admin/restaurants/{restaurant_id}/suspend` | admin | Tạm ngừng và tắt cờ nhận đơn, trả 200 |

### Tạo quán của vendor

Body `POST /vendor/restaurant`:

```json
{
  "name": "Bếp Vị Việt",
  "address": "Hà Nội",
  "latitude": 21.0285,
  "longitude": 105.8542,
  "delivery_radius_km": 5,
  "opens_at": "08:00",
  "closes_at": "22:00"
}
```

`name`, `address`, `latitude`, `longitude` bắt buộc. Tên/địa chỉ trim trước khi kiểm tra, dài 1–160 và 1–500 ký tự. Tọa độ nhận số JSON hữu hạn trong [-90, 90] và [-180, 180], không nhận chuỗi hoặc Boolean. Bán kính trong (0, 50] km, mặc định 5. Giờ phải đúng chuỗi `HH:MM` địa phương Việt Nam, mặc định cả hai `00:00`; không nhận giây hoặc offset.

Server lấy vendor từ access token, tạo Restaurant và RestaurantMembership trong cùng transaction. Quán mới luôn `status=pending`, `accepting_orders=false`, `is_simulated=false`; không nhận các trường tự gán quyền như `user_id`, `restaurant_id`, `status`, `is_simulated` hoặc `accepting_orders` trong body tạo. Mỗi tài khoản tối đa một membership; tạo lần nữa trả 409, không thay liên kết cũ hoặc tạo quán mồ côi khi thất bại.

### Xem/cập nhật hồ sơ của mình

GET/PUT `/vendor/restaurant` suy ra quán từ membership của người đăng nhập, không nhận ID quán từ body/query để đổi mục tiêu. Chưa có membership trả 404. Nhiều tài khoản được liên kết cùng quán có thể cùng quản lý quán đó theo model hiện tại; chưa có API thêm/chuyển membership giữa tài khoản.

PUT là thay toàn bộ hồ sơ: gửi đủ bảy trường trong ví dụ tạo và thêm `accepting_orders` dạng Boolean. Không dùng PATCH hoặc bỏ trường để sửa từng phần.

```json
{
  "name": "Bếp Vị Việt",
  "address": "Hà Nội",
  "latitude": 21.0285,
  "longitude": 105.8542,
  "delivery_radius_km": 5,
  "opens_at": "08:00",
  "closes_at": "22:00",
  "accepting_orders": true
}
```

Chỉ quán approved mới bật nhận đơn được; pending/suspended gửi `true` trả 409 `RESTAURANT_NOT_APPROVED` và không ghi phần hồ sơ còn lại. Vendor vẫn sửa hồ sơ của quán pending/suspended khi gửi `false`. Sửa hồ sơ không tự thay trạng thái duyệt; vendor không được gửi `status` hoặc cờ mô phỏng. Chưa có thao tác xóa quán qua API; sử dụng trạng thái/cờ nhận đơn để quản lý hoạt động, giữ các tham chiếu lịch sử.

### Duyệt/tạm ngừng

Admin PATCH approve/suspend không cần body. Approve đổi trạng thái sang approved và giữ nguyên cờ nhận đơn; không tự bật nhận đơn cho quán mới hoặc quán vừa tạm ngừng. Suspend đổi sang suspended và đặt `accepting_orders=false`. Gọi lặp cùng thao tác trả 200; có thể approve lại quán suspended, sau đó vendor chủ động bật nhận đơn. Quán không tồn tại trả 404. Vai trò admin được đọc lại từ DB như auth; chưa có API tự cấp admin hoặc seed tài khoản quản trị.

Quán pending/suspended không xuất hiện trong danh sách công khai và chi tiết công khai đều trả cùng 404 với quán không tồn tại. Quán approved vẫn xuất hiện khi đóng cửa hoặc tạm tắt nhận đơn; trạng thái giờ/cờ trong response cho biết điều kiện hiện tại.

### Response và phân trang

`RestaurantPublic` chỉ có các trường sau; ví dụ minh họa một quán được duyệt, đang tắt nhận đơn:

```json
{
  "id": 1,
  "name": "Bếp Vị Việt",
  "address": "Hà Nội",
  "latitude": 21.0285,
  "longitude": 105.8542,
  "delivery_radius_km": 5,
  "opens_at": "08:00",
  "closes_at": "22:00",
  "accepting_orders": false,
  "is_open": true,
  "can_receive_orders": false
}
```

`is_open` được tính tại thời điểm request theo `Asia/Ho_Chi_Minh`: gồm giờ mở, không gồm giờ đóng; qua đêm hợp lệ, hai mốc bằng nhau nghĩa là 24 giờ. `can_receive_orders = approved AND accepting_orders AND is_open` chỉ phản ánh điều kiện của quán, chưa kiểm tra vị trí khách, món bán hoặc nguyên liệu cần tránh. Các kiểm tra đặt đơn/lọc khoảng cách được làm ở phần tiếp theo. Hai trường tính toán không phải cột DB.

Response quản lý (`RestaurantDetail`) thêm `status` và `is_simulated`. API công khai không trả membership/tài khoản chủ quán, trạng thái nội bộ hoặc cờ mô phỏng. Giờ response luôn là `HH:MM`.

Hai endpoint danh sách nhận `offset` mặc định 0, trong 0–2147483647; `limit` mặc định 20, trong 1–100. Sắp xếp tăng dần theo ID, response `{"items":[...],"total":3,"offset":0,"limit":20}`; offset vượt số dòng trả danh sách rỗng, total vẫn là tổng số quán phù hợp. Admin còn nhận filter `status=pending|approved|suspended`; công khai luôn lọc approved. ID trên path trong 1–2147483647; tham số sai trả 422.

| HTTP | Mã lỗi | Trường hợp |
| :--- | :--- | :--- |
| 401 | `UNAUTHENTICATED` | Thiếu/sai/hết hạn access token ở endpoint quản lý |
| 403 | `FORBIDDEN` | Vai trò không đúng; admin cũng không dùng endpoint vendor |
| 404 | `NOT_FOUND` | Chưa liên kết quán, quán không tồn tại hoặc không công khai |
| 409 | `RESTAURANT_ALREADY_LINKED` | Vendor đã có membership |
| 409 | `RESTAURANT_NOT_APPROVED` | Bật nhận đơn khi quán chưa approved |
| 422 | `VALIDATION_ERROR` | Trường thiếu/thừa, kiểu/giới hạn/giờ không hợp lệ |

Phần này không đổi schema/revision `001`. Ghi hồ sơ và trạng thái dùng khóa hàng `FOR UPDATE` khi hệ quản trị hỗ trợ; PK membership vẫn bảo vệ liên kết duy nhất. Kiểm thử hiện dùng SQLite tạm và có ca mô phỏng race/lỗi ghi để kiểm tra rollback; chưa xác nhận khóa hàng hoặc cạnh tranh thực tế trên PostgreSQL.

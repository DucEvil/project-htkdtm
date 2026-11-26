# Hợp đồng API Vị Việt

Tài liệu này hiện mô tả phần auth backend của bước F.8. Các API khẩu vị, tìm kiếm, giao dịch, vendor/admin và tracking chưa triển khai; sẽ bổ sung theo từng phần. Tài liệu OpenAPI trực tiếp tại `http://localhost:8000/docs` phản ánh schema request/response đang chạy.

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

Admin không tự vượt qua guard sở hữu của vendor; router admin sẽ dùng guard riêng. Các guard đã được kiểm thử qua route chỉ tồn tại trong ứng dụng kiểm thử, chưa có endpoint nghiệp vụ vendor/admin được công bố.

## Phạm vi kiểm chứng

API auth được kiểm thử với FastAPI TestClient và SQLite tạm có schema tạo bằng migration `001`, gồm dữ liệu tài khoản, token và phân quyền. Chưa chạy PostgreSQL/Docker thực tế hoặc tích hợp giao diện auth. Backend nhận/trả token trong JSON và header Bearer; chưa triển khai cookie HttpOnly hay storage trình duyệt. Phần frontend F.8 tiếp theo sẽ tích hợp theo contract này.

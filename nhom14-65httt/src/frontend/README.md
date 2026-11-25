# Frontend Vị Việt

Đã có bộ khung React/Vite/TypeScript với trang chủ, trang 404 và liên kết kiểm tra kết nối backend. Các màn hình nghiệp vụ chưa được triển khai và sẽ được bổ sung theo từng phần để commit riêng.

Nội dung dưới đây là đặc tả định hướng, bám theo [đề cương](../../docs/De_cuong_Vi_Viet.docx) (mục 4, 5.3, 6, 7, 8). Phần công nghệ và lệnh chạy đã có được ghi riêng ở mục 6; các đề xuất cho chức năng chưa triển khai cần được chốt theo [thiết kế cấu trúc](../../docs/THIET_KE_CAU_TRUC.md).

Phụ trách dự kiến xem tại [danhsachnhom.md](../../danhsachnhom.md).

## 1. Các màn hình dự kiến

| Vai trò | Nhóm màn hình |
| :--- | :--- |
| Khách hàng | Đăng ký/đăng nhập, khai báo khẩu vị, chọn vị trí, tìm món/quán, danh sách Top 5 gợi ý có lý do, thực đơn quán, giỏ hàng, tạo và theo dõi đơn, phản hồi |
| Chủ quán | Hồ sơ quán, giờ mở/phạm vi phục vụ, thực đơn/nguyên liệu/bật tắt món, danh sách đơn, cập nhật trạng thái và thống kê quán mình |
| Quản trị viên | Duyệt quán, danh mục món chuẩn và nhãn, kiểm tra nội dung, tài khoản, tình trạng xử lý dữ liệu và dashboard |

### Bản đồ route (đề xuất)

| Route | Vai trò | Nội dung |
| :--- | :--- | :--- |
| `/login`, `/register` | Tất cả | Xác thực; điều hướng theo vai trò sau đăng nhập |
| `/onboarding/taste` | Khách | 5 câu khẩu vị: vùng miền, mức cay, nguyên liệu thích, nguyên liệu cần tránh, mức sẵn sàng thử món mới; có nút bỏ qua |
| `/location` | Khách | Cấp quyền vị trí hoặc nhập địa chỉ/chọn điểm thủ công |
| `/` (trang chủ) | Khách | Top 5 gợi ý kèm lý do, ô tìm kiếm, bộ lọc |
| `/search` | Khách | Kết quả tìm món/quán, bản đồ quán |
| `/restaurants/:id` | Khách | Thông tin quán, giờ mở, thực đơn, trạng thái món |
| `/cart`, `/checkout` | Khách | Giỏ hàng một quán, xác nhận địa chỉ giao, thanh toán khi nhận |
| `/orders`, `/orders/:id` | Khách | Lịch sử và tiến trình đơn, hủy đơn, đánh giá sau hoàn tất |
| `/owner/*` | Chủ quán | Hồ sơ quán, thực đơn, nguyên liệu, đơn hàng, thống kê |
| `/admin/*` | Quản trị viên | Duyệt quán, món chuẩn và nhãn, tài khoản, chất lượng dữ liệu |

Chặn route theo vai trò chỉ để cải thiện trải nghiệm; quyền thật do backend kiểm tra ở mọi API.

## 2. Luồng nghiệp vụ chính

### 2.1. Khách mới và gợi ý

1. Đăng nhập lần đầu → màn hình 5 câu khẩu vị (bỏ qua được).
2. Chọn vị trí hoặc nhập địa chỉ. Bán kính mặc định 5 km.
3. Trang chủ hiển thị tối đa 5 món, mỗi món có tên, quán, giá, khoảng cách và **lý do gợi ý do API trả về** (ví dụ: hợp mức cay, có nguyên liệu yêu thích, gần bạn). Frontend không tự sinh lý do.
4. Nếu khách bỏ qua khai báo: hiển thị danh sách khám phá kèm thông báo "Chưa cá nhân hóa — hãy khai báo khẩu vị để nhận gợi ý phù hợp hơn".
5. Nếu ít hơn 5 ứng viên: hiển thị danh sách ngắn và nguyên nhân từ API (ví dụ: ít quán đang mở trong phạm vi); không tự nới bộ lọc.
6. Mỗi món có nút phản hồi **Phù hợp / Không phù hợp**.

### 2.2. Đặt món và trạng thái đơn

Giỏ hàng chỉ chứa món của một quán; khi thêm món quán khác, hỏi khách có muốn làm trống giỏ hiện tại không.

| Trạng thái | Nhãn hiển thị | Thao tác của khách | Thao tác của chủ quán |
| :--- | :--- | :--- | :--- |
| `PENDING` | Chờ quán xác nhận | Hủy đơn | Xác nhận / Từ chối (kèm lý do) |
| `CONFIRMED` | Quán đã nhận đơn | — | Bắt đầu chuẩn bị |
| `PREPARING` | Đang chuẩn bị | — | Chuyển sang đang giao |
| `DELIVERING` | Đang giao | — | Hoàn tất |
| `COMPLETED` | Hoàn tất | Đánh giá món | — |
| `REJECTED` | Quán từ chối | Xem lý do | — |
| `CANCELLED` | Đã hủy | — | — |

Mã trạng thái cần thống nhất với backend. Giao diện chỉ hiện nút cho chuyển trạng thái hợp lệ; backend vẫn từ chối chuyển sai. Tiến trình đơn hiển thị người thao tác và thời điểm từ lịch sử trạng thái.

## 3. Các tình huống phải thể hiện

- Người dùng có thể nhập địa chỉ khi không cấp quyền vị trí; lỗi tải bản đồ không chặn luồng tìm và đặt món.
- Quán xuất hiện trên bản đồ nhưng chưa tham gia hệ thống không có thao tác đặt món qua Vị Việt.
- Hiển thị lý do gợi ý, danh sách ngắn khi ít ứng viên và thông báo chưa cá nhân hóa khi khách bỏ qua khai báo.
- Thông báo khi món hết bán, quán đóng cửa, ngoài phạm vi phục vụ, đơn bị từ chối hoặc trạng thái thay đổi.
- Khi đặt đơn, nếu backend báo giá/tùy chọn/trạng thái món đã đổi: hiển thị khác biệt và yêu cầu khách xác nhận lại, không tự đặt.
- Không hiển thị thông tin nguyên liệu như cam kết an toàn dị ứng; ghi chú rằng khách nên hỏi quán khi có dị ứng nghiêm trọng.
- Chỉ mở đánh giá món khi đơn ở trạng thái hoàn tất.
- Khóa thao tác gửi lặp trên giao diện kết hợp kiểm soát ở backend; không dựa riêng vào việc ẩn nút để phân quyền.
- Trạng thái rỗng, đang tải và lỗi mạng cho mọi danh sách.

## 4. Ghi sự kiện phục vụ gợi ý và BI

Dữ liệu cho `Fact_RecImpression` và `Fact_Session` ([database](../database/README.md)) phát sinh từ frontend, vì vậy cần ghi đúng ngay từ đầu.

| Sự kiện | Khi nào ghi | Trường tối thiểu |
| :--- | :--- | :--- |
| `rec_impression` | Mục gợi ý thực sự hiển thị trên màn hình | `event_id`, `session_id`, `request_id`, `menu_item_id`, `rank`, thời điểm |
| `rec_click` | Khách mở chi tiết món từ danh sách gợi ý | `event_id`, `session_id`, `request_id`, `menu_item_id` |
| `add_to_cart` | Thêm món vào giỏ | `event_id`, `session_id`, `menu_item_id`, `request_id` nếu đến từ gợi ý |
| `rec_feedback` | Bấm phù hợp/không phù hợp | `event_id`, `request_id`, `menu_item_id`, giá trị |
| `session_start` / `session_end` | Mở phiên / hết phiên | `session_id`, kênh truy cập |

Quy tắc:

- `event_id` sinh ở client (UUID) để backend loại trùng khi gửi lại; thời điểm chuẩn lấy ở server.
- `request_id` và phiên bản thuật toán do API gợi ý trả về; frontend chỉ chuyển tiếp, không gắn nhãn thuật toán trên giao diện.
- Khi tạo đơn, gửi kèm `session_id` để backend quy thuộc theo quy tắc 30 phút.
- Gom và gửi theo lô, thử lại khi lỗi mạng; không để việc ghi sự kiện làm chậm thao tác người dùng.
- Không gửi tọa độ chi tiết hoặc địa chỉ giao hàng trong sự kiện hành vi.

### Màn hình thử nghiệm đánh giá (tuần 7)

Phục vụ 150 trường hợp so sánh danh sách phổ biến với mô hình cá nhân hóa: hiển thị hợp hai danh sách Top 5 đã lọc trùng, xáo trộn thứ tự, **ẩn tên thuật toán**, người dùng chấm phù hợp/không phù hợp từng món. Dùng mã người tham gia, tách khỏi dữ liệu giao dịch thật.

## 5. Quyền riêng tư và bảo mật

- Xin đồng thuận trước khi lưu hồ sơ khẩu vị và vị trí; giải thích dữ liệu dùng để gợi ý.
- Không lưu tọa độ chính xác lâu dài trong `localStorage`; ưu tiên giữ trong phiên.
- Không đưa khóa bí mật vào mã nguồn trình duyệt. Khóa Google Maps phía trình duyệt luôn bị lộ, nên phải giới hạn theo HTTP referrer và chỉ bật API cần dùng.
- Token xác thực theo cơ chế backend chốt (ưu tiên cookie `HttpOnly`); không ghi token ra log.

## 6. Công nghệ, lệnh chạy và cấu trúc

### Bộ khung hiện có

Node.js >=20, React 18, Vite 5, TypeScript 5.6 và React Router. Đã có `package.json`, `package-lock.json`, cấu hình môi trường mẫu và Dockerfile.

Từ thư mục `src/frontend/`:

```powershell
npm ci
npm run dev
```

Frontend chạy tại `http://localhost:5173`. Kiểm tra biên dịch bằng `npm run build`; dùng `npm run format` để định dạng và `npm run format:check` để kiểm tra định dạng.

`VITE_API_BASE_URL` trong cấu hình mẫu là `/api/v1`. Vite chuyển `/api` và `/health` tới backend local ở `http://127.0.0.1:8000`; Docker đặt `API_PROXY_TARGET=http://backend:8000`.

Xem [hướng dẫn cài đặt](../../docs/HUONG_DAN_CAI_DAT.md) và [tiến độ từng phần](../../docs/TIEN_DO_TRIEN_KHAI.md).

### Cấu trúc mở rộng (đề xuất)

Thư viện gọi API có cache (ví dụ TanStack Query), Google Maps JavaScript API và cây thư mục dưới đây là đề xuất tham khảo từ đặc tả frontend. Chúng chưa được triển khai; cấu trúc cuối cùng cần đối chiếu với [thiết kế cấu trúc chung](../../docs/THIET_KE_CAU_TRUC.md) trước khi lập trình từng module.

```text
src/frontend/
├── package.json
├── .env.example          # chỉ chứa tên biến và giá trị mẫu
├── src/
│   ├── api/              # client API, kiểu dữ liệu, xử lý lỗi chung
│   ├── features/
│   │   ├── auth/
│   │   ├── taste/        # khai báo khẩu vị
│   │   ├── recommend/    # Top 5, lý do, phản hồi
│   │   ├── restaurant/   # quán, thực đơn, bản đồ
│   │   ├── cart-order/
│   │   ├── owner/
│   │   └── admin/
│   ├── tracking/         # ghi sự kiện, session_id, gửi theo lô
│   ├── components/       # thành phần dùng chung
│   └── routes/           # khai báo route và chặn theo vai trò
└── tests/
```

### Biến môi trường (đề xuất)

| Biến | Ý nghĩa | Ví dụ |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Địa chỉ API backend trong cấu hình mẫu | `/api/v1` |
| `API_PROXY_TARGET` | Đích proxy của Vite dev server | Local: `http://127.0.0.1:8000`; Docker: `http://backend:8000` |
| `VITE_GOOGLE_MAPS_API_KEY` | Khóa Maps phía trình duyệt, đã giới hạn referrer | *(không commit)* |
| `VITE_DEFAULT_CENTER_LAT`, `VITE_DEFAULT_CENTER_LNG` | Tâm khu vực thử nghiệm, chốt tuần 1 | — |
| `VITE_DEFAULT_RADIUS_KM` | Bán kính tìm kiếm mặc định | `5` |

Mọi biến `VITE_*` đều lộ ra trình duyệt, vì vậy không đặt bí mật vào đây.

## 7. Tích hợp API

Danh sách endpoint, định dạng lỗi và mã trạng thái cần thống nhất với [backend](../backend/README.md) và ghi lại khi triển khai. Yêu cầu tối thiểu từ phía frontend:

- API gợi ý trả về `request_id`, danh sách món theo thứ hạng, lý do cho từng món, cờ chưa cá nhân hóa và nguyên nhân khi thiếu ứng viên.
- API tạo đơn nhận khóa chống gửi lặp (ví dụ header `Idempotency-Key`) và trả lỗi riêng cho các trường hợp món hết bán, giá thay đổi, ngoài phạm vi, quán đóng cửa.
- Định dạng lỗi thống nhất có mã lỗi máy đọc được để hiển thị thông báo tiếng Việt phù hợp.
- Có cơ chế cập nhật trạng thái đơn (polling định kỳ là đủ cho bản mẫu).

## 8. Kiểm thử và tiêu chí nghiệm thu liên quan

| Tiêu chí (đề cương mục 7) | Phần việc của frontend |
| :--- | :--- |
| Chức năng giao dịch: 30 ca tạo, hủy, từ chối, gửi lặp, đổi trạng thái sai | Kịch bản thao tác trên giao diện cho cả khách và chủ quán; bấm đặt nhiều lần không tạo đơn trùng |
| Tuân thủ điều kiện | Không hiển thị nút đặt cho món hết bán, quán đóng cửa hoặc ngoài phạm vi |
| Trải nghiệm: ≥ 90% hoàn thành nhiệm vụ, điểm hài lòng ≥ 4/5 | Kịch bản nhiệm vụ cố định, giao diện dùng tốt trên điện thoại |
| Độ tin cậy BI: khớp 100% sau ETL | Sự kiện hiển thị/nhấp ghi đủ, không trùng `event_id` |

Kiểm tra thêm: giao diện co giãn trên điện thoại, điều hướng bằng bàn phím, nhãn cho trường nhập liệu và độ tương phản chữ đủ đọc.

## 9. Mốc thực hiện liên quan

| Tuần | Đầu ra frontend |
| :-: | :--- |
| 2 | Wireframe các màn hình chính, luồng đơn và route |
| 3 | Khởi tạo dự án, đăng nhập, chặn route theo vai trò |
| 4 | Thực đơn, giỏ hàng, đặt món, theo dõi trạng thái, chọn vị trí |
| 5 | Khai báo khẩu vị, hiển thị Top 5 và lý do, phản hồi |
| 6 | Ghi sự kiện, màn hình chủ quán/quản trị hoàn chỉnh |
| 7 | Màn hình thử nghiệm đánh giá mù; kiểm thử giao dịch và trải nghiệm |
| 8 | Sửa lỗi, hướng dẫn cài đặt, kịch bản demo |

## 10. Đầu ra cần bổ sung khi lập trình

- Đã có `package.json`, lockfile, `.env.example` và lệnh cài phụ thuộc/chạy/biên dịch; cập nhật khi thêm module hoặc thay đổi môi trường.
- Tài liệu tích hợp API và danh sách sự kiện đã chốt.
- Ảnh chụp hoặc wireframe các màn hình chính.
- Cập nhật mục khởi chạy trong [README nhóm](../../README.md) và [danhsachnhom.md](../../danhsachnhom.md).

Xem thêm [README nhóm](../../README.md), [backend](../backend/README.md), [cơ sở dữ liệu](../database/README.md) và [đề cương](../../docs/De_cuong_Vi_Viet.docx).

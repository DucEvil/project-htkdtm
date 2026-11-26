# Tiến độ triển khai theo từng phần

Mỗi lượt triển khai chỉ thêm một phần để nhóm kiểm tra và commit riêng. Trình tự dưới đây theo phần F của [thiết kế](THIET_KE_CAU_TRUC.md). Có file khung không đồng nghĩa chức năng đã hoàn tất.

Các nhãn Phase 1.1–1.7 dưới đây là cách chia nhỏ **bước 5 của mục F** để commit riêng từng model, không phải tên mục nguyên bản của tài liệu. Migration vẫn chờ bước 6; API và giao diện sẽ được triển khai sau models theo các bước tiếp theo.

| Phần | Nội dung | Trạng thái trong mã nguồn hiện tại |
| :--- | :--- | :--- |
| Phase 0 | Cấu hình môi trường, Docker, backend/frontend chạy tối thiểu | Đã chuẩn bị; xem hướng dẫn cài đặt và kết quả kiểm tra |
| Phase 1.1 | `users/models.py`: tài khoản và vai trò | Đã bổ sung model và kiểm thử; chưa có migration hoặc API auth |
| Phase 1.2 | `preferences/models.py`: khẩu vị | Đã bổ sung model, liên kết User và kiểm thử; chưa có migration/API |
| Phase 1.3 | `restaurants/models.py`: quán và thành viên quản lý | Đã bổ sung hai model và kiểm thử; chưa có migration/API |
| Phase 1.4 | `menu/models.py`: món chuẩn, món bán, nguyên liệu | Đã bổ sung bốn model và kiểm thử; chưa có migration/API |
| Phase 1.5 | `orders/models.py`: đơn, món đặt và lịch sử | Đã bổ sung ba model và kiểm thử; chưa có migration/service/API |
| Phase 1.6 | `reviews/models.py`: đánh giá món | Đã bổ sung model và kiểm thử; chưa có migration/service/API |
| Phase 1.7 | `tracking/models.py`: yêu cầu gợi ý, hiển thị, sự kiện | Chưa đưa vào mã nguồn hiện tại |
| Phase 1.8 | Migration ban đầu, ERD và từ điển dữ liệu | Chờ các model được chốt |
| Phase 1.9 | Auth backend, frontend và kiểm thử | Chờ models/migration |
| Phase 2 | Nghiệp vụ giao dịch, vendor/admin và giao diện | Chưa đưa vào mã nguồn hiện tại |
| Phase 3 | AI, tracking và dữ liệu | Chưa đưa vào mã nguồn hiện tại |
| Phase 4 | ETL, BI, Power BI và đánh giá | Chưa đưa vào mã nguồn hiện tại |
| Phase 5 | Tích hợp, kiểm thử và bàn giao | Chưa thực hiện |

Phần đã soạn trước cho các phase sau được lưu cục bộ trong `.runtime/pending-implementation/`, được `.gitignore` bỏ qua. Đây là bản nháp tham khảo, chưa phải thay đổi để commit ở lượt này; mỗi phần phải được kiểm tra lại khi đưa vào dự án.

Thư mục nháp cũng được Docker bỏ qua, chưa có file nào trong đó được Git theo dõi và mã ứng dụng trong `src/` không tham chiếu nó. Do không được commit/push, thư mục này không có trên GitHub hoặc khi clone mới. Xóa thư mục, mất máy hoặc dùng `git clean -fdx` có thể làm mất bản nháp; không coi đó là bản sao lưu dài hạn. Các file đã hoàn thiện phải nằm trong `src/` và được commit riêng, không phụ thuộc vào bản nháp. Bản nháp có thể cũ so với models hiện tại nên không chép đè nguyên trạng hoặc dùng `git add -f` để đưa cả `.runtime/` vào repo.

Không tạo file `.pbix` rỗng thay cho sản phẩm Power BI và không đánh dấu các khảo sát, thử nghiệm người dùng hay kết quả nghiệm thu là hoàn tất khi chưa thực hiện.

## Kết quả kiểm tra Phase 0

- Backend: 5 kiểm thử đạt (health/request ID, định dạng lỗi, CORS, cấu hình URL DB).
- Frontend: `npm run build` và `npm run format:check` đạt.
- Chưa kiểm chứng Docker/PostgreSQL vì môi trường phát triển không có Docker CLI.
- Bộ khung, phần hợp nhất tài liệu và models tài khoản/khẩu vị/quán/thực đơn/đơn hàng đã được commit. Sau Review là riêng các models trong `tracking/models.py`; mỗi lượt chỉ thêm một phần.

## Phần tài khoản và vai trò

- Thêm `app/users/models.py` với `User` và `UserRole` (`customer`, `vendor`, `admin`).
- Email được chuẩn hóa ở ORM và có ràng buộc duy nhất; vai trò có CHECK constraint ở DB.
- Thêm `is_simulated`, thời điểm tạo và các mặc định ở ORM/DB.
- Alembic đã đăng ký metadata của User; chưa sinh migration hoặc tạo bảng trong DB ứng dụng.
- Kiểm thử ràng buộc dùng SQLite trong bộ nhớ. Chưa kiểm chứng trên PostgreSQL.
- Kết quả: 20 kiểm thử đạt, gồm 15 ca User model và 5 ca kiểm tra nền tảng.
- Phần User model đã được người dùng commit; không tự commit/push hoặc gộp module khác vào commit đó.

## Phần hồ sơ khẩu vị

- Theo đúng đường dẫn `src/backend/app/preferences/models.py` ở mục F.5; thêm package và đăng ký metadata với Alembic.
- Mục C.5 yêu cầu khẩu vị năm câu nhưng chưa định nghĩa các cột. Đối chiếu mục bản đồ route/luồng khách mới của `src/frontend/README.md`, chốt năm nội dung: vùng miền, mức cay, nguyên liệu thích, nguyên liệu cần tránh và mức sẵn sàng thử món mới.
- Các trường tương ứng là `regions`, `spice_level`, `liked_ingredients`, `avoided_ingredients`, `exploration_level`; quy ước mức cay 0–3 và khám phá 0–2 được ghi trong README backend để API/UI dùng thống nhất.
- `user_id` là khóa chính và khóa ngoại tới User: mỗi tài khoản tối đa một hồ sơ; xóa tài khoản sẽ xóa hồ sơ đi kèm. Bỏ qua khai báo được biểu diễn bằng việc chưa có hồ sơ.
- Các danh sách không dùng chung mặc định giữa tài khoản, được chuẩn hóa khi gán và lưu được cập nhật tại chỗ qua MutableList.
- Kết quả: 54 kiểm thử đạt, gồm 34 ca Preference và 20 ca User/nền tảng. Kiểm thử dữ liệu dùng SQLite; chưa kiểm chứng PostgreSQL.
- Chưa tạo migration, API khẩu vị, bộ mã hóa vector hoặc giao diện khẩu vị. Các nội dung đó vẫn ở phần sau theo Markdown.
- Phần Preference model đã được người dùng commit; các module soạn trước trong `.runtime/` tiếp tục được bỏ qua và không đưa vào cùng lượt.

## Phần quán và người quản lý

- Theo đúng mục F.5, bổ sung `Restaurant` và `RestaurantMembership` tại `src/backend/app/restaurants/models.py`; Alembic đã nhận metadata của cả hai.
- Theo mục C.5 và D.15/17/18/22, lưu hồ sơ quán, tọa độ, giờ mở cửa, bán kính giao, trạng thái duyệt, cờ nhận đơn và liên kết người quản lý.
- Chi tiết kiểu cột, trạng thái `pending`/`approved`/`suspended`, bán kính tối đa 50 km, cờ nhận đơn mặc định false, giờ phục vụ qua đêm/cả ngày được ghi trong README backend. Đây là quy ước triển khai bổ sung cho phần Markdown chưa mô tả từng cột.
- Với API `/vendor/restaurant` của bản thiết kế, MVP chọn mỗi tài khoản tối đa một quán; một quán có thể có nhiều tài khoản quản lý. PK/FK ngăn liên kết trùng và tham chiếu thiếu. Xóa tài khoản/quán đang có membership bị chặn, cần xử lý liên kết trước.
- Chưa kiểm tra quyền API hoặc tự gán quyền theo membership; auth/vendor sẽ kiểm tra vai trò và quyền sở hữu ở phần sau.
- Kết quả: 105 kiểm thử đạt, gồm 51 ca phần quán và 54 ca đã có. Kiểm thử dữ liệu dùng SQLite; chưa kiểm chứng PostgreSQL.
- Chưa tạo migration, API CRUD, kiểm tra đang mở cửa hoặc bộ lọc khoảng cách; chưa thêm models thực đơn ở lượt này.
- Phần quán/người quản lý đã được người dùng commit; không gộp thêm models thực đơn vào commit đó.

## Phần món chuẩn, thực đơn và nguyên liệu

- Theo mục F.5, thêm CanonicalDish, MenuItem, Ingredient và MenuItemIngredient tại `src/backend/app/menu/models.py`; Alembic đã nhận metadata.
- Theo mục C.5 và D.16/33/34, tách đặc trưng món chuẩn khỏi tên/giá/khả dụng của từng món bán và nguyên liệu thực tế của quán. Có mã nguồn truy vết và cờ dữ liệu mô phỏng.
- Giá là số nguyên VNĐ trong (0, 10.000.000]; mức cay 0–3; các giới hạn text và mặc định cờ bán/xác nhận nguyên liệu được ghi trong README backend. Đây là chi tiết triển khai bổ sung cho phần Markdown chưa định nghĩa từng cột.
- PK/FK bảo vệ liên kết quán, món chuẩn và nguyên liệu; khóa ghép chống lặp nguyên liệu của một món bán. Không tự sao chép nguyên liệu đặc trưng thành nguyên liệu thực tế.
- Kết quả: 155 kiểm thử đạt, gồm 50 ca thực đơn và 105 ca đã có. Kiểm thử dữ liệu dùng SQLite; chưa kiểm chứng PostgreSQL.
- Chưa tạo migration, seed, API quản lý thực đơn, kiểm tra quyền vendor hoặc thuật toán lọc nguyên liệu; các phần đó vẫn chờ đúng bước trong Markdown.
- Đã kiểm tra bản nháp cục bộ không bị theo dõi bởi Git hoặc tham chiếu từ mã nguồn chạy chính; ghi thêm README cảnh báo bản nháp có thể cũ ngay trong thư mục nháp.
- Phần thực đơn đã được người dùng commit; không gộp models đơn hàng vào commit đó.

## Phần đơn hàng, món đặt và lịch sử trạng thái

- Theo mục F.5, thêm Order, OrderItem và OrderStatusHistory tại `src/backend/app/orders/models.py`; Alembic đã nhận metadata.
- Theo C.5, D.10–13 và E.2, lưu dữ liệu giao dịch, tên/giá tại thời điểm đặt, đủ bảy trạng thái, lịch sử tài khoản thao tác/thời điểm/lý do. Từ chối đơn bắt buộc có lý do.
- Theo E.4/E.5, idempotency key có UNIQUE toàn bảng và cùng session sử dụng UUID v4; lưu thêm SHA-256 của nội dung yêu cầu để hỗ trợ service gửi lặp sau này. Model chưa thực hiện phản hồi HTTP hoặc cửa sổ 24 giờ.
- Tổng tiền dùng BIGINT, snapshot dùng số nguyên VNĐ, mỗi món tối đa một dòng/đơn. FK bảo vệ dữ liệu giao dịch đang có tham chiếu. Các giới hạn và phần kiểm tra nghiệp vụ chưa triển khai được ghi rõ trong README backend.
- Kết quả: 219 kiểm thử đạt, gồm 64 ca dữ liệu đơn hàng và 155 ca đã có. Kiểm thử dùng SQLite; chưa kiểm chứng PostgreSQL. Chưa thay thế các ca giao dịch/API và state machine trong Markdown.
- Chưa có migration, tạo đơn qua API, transaction đặt đơn, kiểm tra quyền, tính tổng/snapshot tự động hoặc state machine.
- Phần đơn hàng đã được người dùng commit; không gộp Review hoặc tracking vào commit đó.

## Phần đánh giá món đã mua

- Theo mục C.5, D.14 và F.5, thêm Review tại `src/backend/app/reviews/models.py`, đăng ký metadata với Alembic.
- Liên kết Review tới Order, MenuItem, User và dùng FK ghép tới đúng cặp OrderItem để không đánh giá một món chỉ tồn tại ở đơn khác.
- UNIQUE ngăn đánh giá trùng một món trong một đơn; điểm nguyên 1–5, nhận xét tùy chọn tối đa 2000 ký tự. Lưu thời điểm UTC và cờ dữ liệu mô phỏng; đây là quy ước dữ liệu chi tiết trong README backend.
- Quan hệ đọc OrderItem giữ liên kết với tên/giá snapshot của lần mua. FK bảo vệ dữ liệu giao dịch đang được đánh giá tham chiếu.
- Kết quả: 252 kiểm thử đạt, gồm 33 ca Review và 219 ca đã có. Kiểm thử dữ liệu dùng SQLite; chưa kiểm chứng PostgreSQL.
- Chưa có migration/API đánh giá hoặc kiểm tra đơn hoàn tất/người gửi sở hữu đơn; service/auth sẽ thực hiện ở mục F.10. Không trộn Review với feedback gợi ý.
- Chưa tự commit/push; chưa thêm tracking vào lượt này.

## Dọn bản nháp cục bộ

- Theo yêu cầu người dùng, chỉ dọn bản nháp khi bản chính tương ứng đã được tích hợp, kiểm thử, commit và không có thay đổi chưa commit.
- Đã xóa năm bản `models.py` cũ trong `.runtime/pending-implementation/src/backend/app/users/`, `preferences/`, `restaurants/`, `menu/`, `orders/`. Bản chính của chúng vẫn nằm trong `src/` và lịch sử Git.
- Các schema/service/router chưa tích hợp và công cụ Python/uv đang dùng để kiểm tra vẫn được giữ lại. Bản nháp Review sẽ chỉ dọn sau khi phần Review được người dùng commit.
- Không xóa toàn bộ `.runtime/` trong lúc công cụ ở đó vẫn phục vụ kiểm thử; không thêm bản nháp vào commit.

# Danh sách nhóm và phân công nhiệm vụ

## 1. Thông tin chung

- **Tên nhóm và nhánh làm việc:** `nhom14-65httt`.
- **Học phần:** Hệ thống kinh doanh thông minh.
- **Lớp của nhóm:** 65HTTT; **mã lớp học phần:** [Cần xác nhận nếu khác lớp sinh hoạt].
- **Tên đề tài:** Xây dựng website đặt món trực tuyến tích hợp trí tuệ nhân tạo gợi ý ẩm thực Việt Nam theo sở thích và vị trí người dùng.
- **Tên website:** Vị Việt.
- **Giảng viên hướng dẫn:** TS. Đỗ Oanh Cường.
- **Trường:** Trường Đại học Thuỷ Lợi, Khoa Công nghệ thông tin.
- **Giai đoạn hiện tại:** Chuẩn bị đề cương và cấu trúc dự án; chưa có mã nguồn ứng dụng chạy được.

## 2. Danh sách thành viên

Tên thành viên và mã sinh viên dưới đây được đối chiếu với trang bìa của [đề cương](docs/De_cuong_Vi_Viet.docx). Các ô trong dấu ngoặc vuông cần được nhóm bổ sung hoặc xác nhận. Phân công là đề xuất ban đầu, chưa phải xác nhận công việc đã hoàn thành hay tỷ lệ đóng góp thực tế.

| STT | Họ và tên | Mã sinh viên | Lớp sinh hoạt | Vai trò | Nhiệm vụ phân công dự kiến | Tỷ lệ đóng góp (%) | Email |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | Đinh Văn Mạnh | 23511065 [Cần bổ sung phần còn thiếu] | [Cần xác nhận] | [Nhóm trưởng hoặc Thành viên] | Dự kiến: phân tích nghiệp vụ, đặc tả yêu cầu, tổng hợp báo cáo và theo dõi tiến độ | [Cần xác nhận] | [Cần bổ sung] |
| 2 | Đỗ Đình Đức | 2351106510 | [Cần xác nhận] | [Nhóm trưởng hoặc Thành viên] | Dự kiến: giao diện khách hàng, tìm món, bản đồ, giỏ hàng và tích hợp API | [Cần xác nhận] | [Cần bổ sung] |
| 3 | Phạm Hồng Thái | 2351160551 | [Cần xác nhận] | [Nhóm trưởng hoặc Thành viên] | Dự kiến: backend, xác thực, phân quyền, quản lý quán, thực đơn và đơn hàng | [Cần xác nhận] | [Cần bổ sung] |
| 4 | Nguyễn Mạnh Đức | 23511065 [Cần bổ sung phần còn thiếu] | [Cần xác nhận] | [Nhóm trưởng hoặc Thành viên] | Dự kiến: xử lý ViFoodRec, chuẩn hóa đặc trưng món, mô hình gợi ý và đối chứng | [Cần xác nhận] | [Cần bổ sung] |
| 5 | Phạm Trọng Sang | 23511065 [Cần bổ sung phần còn thiếu] | [Cần xác nhận] | [Nhóm trưởng hoặc Thành viên] | Dự kiến: thiết kế cơ sở dữ liệu, ETL, dashboard BI và phối hợp kiểm thử | [Cần xác nhận] | [Cần bổ sung] |

Nhóm cần xác nhận một nhóm trưởng, phân công chính thức và tỷ lệ đóng góp dựa trên kết quả thực hiện. Không dùng các mã sinh viên đang thiếu làm định danh tài khoản hoặc dữ liệu nghiệp vụ.

## 3. Cấu trúc mã nguồn và tài liệu

| Đường dẫn | Nội dung |
| :--- | :--- |
| [README.md](README.md) | Tổng quan đề tài, phạm vi, công nghệ dự kiến và hướng dẫn lấy tài liệu |
| [docs/De_cuong_Vi_Viet.docx](docs/De_cuong_Vi_Viet.docx) | Bản đề cương đã có trên nhánh nhóm |
| [docs/NGUON_DU_LIEU.md](docs/NGUON_DU_LIEU.md) | Nguồn ViFoodRec, nguồn bổ sung và quy trình chuẩn bị dữ liệu |
| [docs/KE_HOACH_THUC_HIEN.md](docs/KE_HOACH_THUC_HIEN.md) | Kế hoạch 8 tuần, đầu ra và tiêu chí đánh giá dự kiến |
| [docs/CHECKLIST_NOP_BAI.md](docs/CHECKLIST_NOP_BAI.md) | Kiểm tra hồ sơ nộp và những việc chưa hoàn thành |
| [src/backend/](src/backend/README.md) | Vị trí dự kiến cho API nghiệp vụ, gợi ý và xử lý sự kiện |
| [src/frontend/](src/frontend/README.md) | Vị trí dự kiến cho giao diện web ba vai trò |
| [src/database/](src/database/README.md) | Vị trí dự kiến cho thiết kế, migration, dữ liệu mẫu và mô hình BI |

## 4. Hướng dẫn cài đặt và thực thi mã nguồn

### 4.1. Môi trường

- Hiện tại cần Git hoặc GitHub Desktop để lấy tài liệu; dùng Microsoft Word hoặc phần mềm tương thích để mở đề cương.
- Công nghệ phát triển dự kiến: React, FastAPI/Python, PostgreSQL, scikit-learn và Power BI.
- Phiên bản runtime, gói phụ thuộc và cách cấu hình sẽ được chốt khi bắt đầu lập trình; hiện chưa có bộ cài đặt ứng dụng để kiểm chứng.

### 4.2. Lấy bản mới nhất trên máy đã clone

Chạy tại thư mục gốc của repository sau khi đã lưu hoặc commit những thay đổi đang làm dở:

```bash
git checkout nhom14-65httt
git pull --ff-only origin nhom14-65httt
```

Sau đó mở `nhom14-65httt/docs/De_cuong_Vi_Viet.docx` và các tài liệu Markdown trong thư mục nhóm.

### 4.3. Khởi chạy ứng dụng

**Chưa áp dụng ở giai đoạn đề cương.** Các thư mục `src/` hiện có tài liệu định hướng, chưa có ứng dụng, dependency manifest hay cấu hình khởi chạy. Khi triển khai, nhóm phải bổ sung phiên bản môi trường, tệp cấu hình mẫu không chứa bí mật, lệnh cài phụ thuộc, tạo dữ liệu, chạy backend/frontend và kiểm tra kết quả; đồng thời cập nhật cả mục này và README của nhóm.


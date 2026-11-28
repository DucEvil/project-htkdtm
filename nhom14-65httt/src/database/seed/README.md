# Dữ liệu Seed & Chuẩn hóa Danh mục Ẩm thực – Vị Việt

> **Người phụ trách:** Nguyễn Mạnh Đức (2351106511) – Nhóm 14, 65HTTT  
> **Thư mục:** `src/database/seed/`

---

## 1. Mục đích của thư mục seed

Thư mục này chứa toàn bộ dữ liệu khởi tạo ban đầu (seed data) phục vụ cho:
1. **Thiết lập danh mục món Việt chuẩn (`CanonicalDish`):** Khởi tạo từ điển 100 món Việt làm sạch từ ViFoodRec cùng bộ từ điển nhãn và nguyên liệu.
2. **Khởi tạo dữ liệu mô phỏng phục vụ phát triển & kiểm thử:** 20 quán ăn, 200 thực đơn món bán, 30 người dùng thử nghiệm và 100 đơn hàng mẫu để kiểm thử luồng giao dịch, đối soát ETL và báo cáo Power BI.

---

## 2. Quy định cờ mô phỏng (`is_simulated`)

Theo yêu cầu nghiêm ngặt trong đề cương và đạo đức học thuật:
- Mọi dữ liệu quán ăn, món bán của quán và đơn hàng sinh ra bởi script seed **bắt buộc** phải gán:
  ```json
  "is_simulated": true
  ```
- Dữ liệu `CanonicalDish` và từ điển nhãn/nguyên liệu không mang tính giao dịch nên dùng làm siêu dữ liệu (metadata) phân loại chung.

---

## 3. Danh sách các file trong thư mục

| Tên file | Mô tả | Trạng thái |
|:---|:---|:---:|
| `regions_and_labels.json` | Danh mục chuẩn vùng miền (Bắc, Trung, Nam), mức cay (0-3), chế độ ăn | Đã tạo |
| `ingredients.json` | Từ điển nguyên liệu chuẩn hóa và danh mục dị nguyên cần tránh | Đã tạo |
| `canonical_dishes.json` | 100 món Việt chuẩn hóa trích xuất từ ViFoodRec | Đang chuẩn bị |
| `sample_restaurants.json` | 20 quán ăn mô phỏng khu vực quanh trường ĐH Thủy Lợi | Đang chuẩn bị |
| `sample_menu_items.json` | 200 mục món ăn thực tế bán tại 20 quán ăn | Đang chuẩn bị |
| `sample_users.json` | 30 hồ sơ người dùng thử nghiệm khai báo khẩu vị | Đang chuẩn bị |
| `sample_orders.json` | 100 đơn hàng kiểm thử luồng trạng thái và ETL | Đang chuẩn bị |

---

## 4. Cách nạp dữ liệu vào cơ sở dữ liệu

Khi hoàn thiện các file JSON, dữ liệu sẽ được nạp tự động qua lệnh:
```bash
python -m scripts.seed
```
Script sẽ đọc các file JSON theo thứ tự ràng buộc khóa ngoại (labels/ingredients $\to$ canonical_dishes $\to$ restaurants $\to$ menu_items $\to$ users $\to$ orders).

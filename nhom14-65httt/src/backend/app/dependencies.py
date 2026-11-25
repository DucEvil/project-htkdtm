"""Dependency injection dùng chung: DB session, current user, role guard."""

from app.database import get_db  # noqa: F401 – re-export

# Các dependency xác thực và phân quyền sẽ được bổ sung
# khi module auth được triển khai (Phase 1).
# Ví dụ:
#   get_current_user  – giải mã JWT, trả User
#   require_role      – kiểm tra role
#   require_vendor_owner – kiểm tra chủ quán sở hữu restaurant_id

"""Chuyển trạng thái và ghi lịch sử trong cùng transaction; API tạo đơn bổ sung sau."""

from sqlalchemy import select, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.exceptions import AppError, ConflictError, ForbiddenError, NotFoundError
from app.orders.models import Order, OrderStatus, OrderStatusHistory
from app.orders.state_machine import validate_transition
from app.restaurants.models import RestaurantMembership
from app.users.models import User, UserRole


def _reason(target: OrderStatus, reason: str | None) -> str | None:
    if target == OrderStatus.REJECTED:
        if not isinstance(reason, str) or not 1 <= len(reason.strip()) <= 500:
            raise AppError("INVALID_REJECTION_REASON", "Lý do từ chối phải có từ 1 đến 500 ký tự.")
        return reason.strip()
    if reason is not None:
        raise AppError("UNEXPECTED_ORDER_REASON", "Chỉ thao tác từ chối đơn nhận lý do.")
    return None


def transition_order(
    db: Session, order_id: int, actor_id: int, target: OrderStatus, *, reason: str | None = None
) -> Order:
    """Dùng session của request; service sở hữu commit/rollback, không ghép ghi việc khác.

    actor_id phải lấy từ dependency xác thực, không lấy trực tiếp từ body.
    Đọc lại quyền/membership và trạng thái từ DB; khóa hàng khi DB hỗ trợ.
    UPDATE có điều kiện trạng thái bảo vệ khỏi ghi đè thay đổi cạnh tranh.
    """
    try:
        actor = db.get(User, actor_id, populate_existing=True)
        if actor is None or actor.role not in (UserRole.CUSTOMER, UserRole.VENDOR):
            raise ForbiddenError()
        conditions = [Order.id == order_id]
        if actor.role == UserRole.CUSTOMER:
            conditions.append(Order.user_id == actor.id)
        else:
            membership = db.get(RestaurantMembership, actor.id, populate_existing=True)
            if membership is None:
                raise NotFoundError("Không tìm thấy đơn hàng.")
            conditions.append(Order.restaurant_id == membership.restaurant_id)
        order = db.scalar(
            select(Order)
            .where(*conditions)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
        if order is None:
            raise NotFoundError("Không tìm thấy đơn hàng.")
        validate_transition(order.status, target, actor.role)
        cleaned_reason = _reason(target, reason)
        previous = order.status
        result = db.execute(
            update(Order)
            .where(*conditions, Order.status == previous)
            .values(status=target)
            .execution_options(synchronize_session=False)
        )
        if result.rowcount != 1:
            raise ConflictError(
                "ORDER_STATE_CHANGED", "Đơn hàng đã thay đổi, hãy tải lại trước khi thao tác."
            )
        db.add(
            OrderStatusHistory(
                order_id=order.id, status=target, actor_id=actor.id, reason=cleaned_reason
            )
        )
        db.commit()
    except (AppError, SQLAlchemyError):
        db.rollback()
        raise
    db.refresh(order)
    return order

"""Duyệt quán không tự bật nhận đơn; tạm ngừng luôn tắt nhận đơn."""

from sqlalchemy.orm import Session

from app.admin.schemas import AdminRestaurantPage
from app.restaurants import service as restaurants
from app.restaurants.models import Restaurant, RestaurantStatus


def list_restaurants(
    db: Session, *, offset: int, limit: int, status: RestaurantStatus | None
) -> AdminRestaurantPage:
    rows, total = restaurants.list_restaurants(
        db, offset=offset, limit=limit, public=False, status=status
    )
    now = restaurants.utcnow()
    return AdminRestaurantPage(
        items=[restaurants.detail_data(row, now) for row in rows],
        total=total,
        offset=offset,
        limit=limit,
    )


def approve(db: Session, restaurant_id: int) -> Restaurant:
    return restaurants.set_status(db, restaurant_id, RestaurantStatus.APPROVED)


def suspend(db: Session, restaurant_id: int) -> Restaurant:
    return restaurants.set_status(db, restaurant_id, RestaurantStatus.SUSPENDED)

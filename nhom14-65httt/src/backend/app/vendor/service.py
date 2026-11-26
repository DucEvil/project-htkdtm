"""Mọi thao tác hồ sơ đều lấy quán từ membership, không nhận ID từ client."""

from sqlalchemy.orm import Session

from app.exceptions import ForbiddenError, NotFoundError
from app.restaurants import service as restaurants
from app.restaurants.models import Restaurant, RestaurantMembership
from app.users.models import User, UserRole
from app.vendor.schemas import VendorRestaurantCreate, VendorRestaurantUpdate


def _check_vendor(user: User) -> None:
    if user.role != UserRole.VENDOR:
        raise ForbiddenError()


def _restaurant_id(db: Session, user: User) -> int:
    _check_vendor(user)
    membership = db.get(RestaurantMembership, user.id)
    if membership is None:
        raise NotFoundError("Tài khoản chưa được liên kết với quán.")
    return membership.restaurant_id


def get_profile(db: Session, user: User) -> Restaurant:
    return restaurants.get_restaurant(db, _restaurant_id(db, user), public=False)


def create_profile(db: Session, user: User, payload: VendorRestaurantCreate) -> Restaurant:
    _check_vendor(user)
    return restaurants.create_with_owner(db, user.id, payload)


def update_profile(db: Session, user: User, payload: VendorRestaurantUpdate) -> Restaurant:
    return restaurants.update_profile(db, _restaurant_id(db, user), payload)

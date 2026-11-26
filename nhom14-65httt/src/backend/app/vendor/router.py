"""API hồ sơ quán của vendor đã đăng nhập."""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import require_role
from app.database import get_db
from app.restaurants.schemas import RestaurantDetail
from app.restaurants.service import detail_data
from app.users.models import User, UserRole
from app.vendor import service
from app.vendor.schemas import VendorRestaurantCreate, VendorRestaurantUpdate

router = APIRouter(prefix="/vendor", tags=["vendor"])
Vendor = Annotated[User, Depends(require_role(UserRole.VENDOR))]
Database = Annotated[Session, Depends(get_db)]


@router.get("/restaurant", response_model=RestaurantDetail)
def profile(db: Database, user: Vendor):
    return detail_data(service.get_profile(db, user))


@router.post("/restaurant", response_model=RestaurantDetail, status_code=201)
def create(payload: VendorRestaurantCreate, db: Database, user: Vendor):
    return detail_data(service.create_profile(db, user, payload))


@router.put("/restaurant", response_model=RestaurantDetail)
def update(payload: VendorRestaurantUpdate, db: Database, user: Vendor):
    return detail_data(service.update_profile(db, user, payload))

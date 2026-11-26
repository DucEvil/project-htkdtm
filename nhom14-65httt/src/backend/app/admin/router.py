"""API quản trị quán, mọi endpoint yêu cầu vai trò admin hiện tại từ DB."""

from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query
from sqlalchemy.orm import Session

from app.admin import service
from app.admin.schemas import AdminRestaurantPage
from app.auth.dependencies import require_role
from app.database import get_db
from app.restaurants.models import RestaurantStatus
from app.restaurants.schemas import RestaurantDetail
from app.restaurants.service import detail_data
from app.users.models import UserRole

router = APIRouter(
    prefix="/admin", tags=["admin"], dependencies=[Depends(require_role(UserRole.ADMIN))]
)
Database = Annotated[Session, Depends(get_db)]
RestaurantId = Annotated[int, Path(gt=0, le=2**31 - 1)]


@router.get("/restaurants", response_model=AdminRestaurantPage)
def listing(
    db: Database,
    offset: Annotated[int, Query(ge=0, le=2**31 - 1)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    status: RestaurantStatus | None = None,
):
    return service.list_restaurants(db, offset=offset, limit=limit, status=status)


@router.patch("/restaurants/{restaurant_id}/approve", response_model=RestaurantDetail)
def approve(restaurant_id: RestaurantId, db: Database):
    return detail_data(service.approve(db, restaurant_id))


@router.patch("/restaurants/{restaurant_id}/suspend", response_model=RestaurantDetail)
def suspend(restaurant_id: RestaurantId, db: Database):
    return detail_data(service.suspend(db, restaurant_id))

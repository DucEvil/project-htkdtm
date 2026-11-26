"""Danh sách quán quản trị có trạng thái và cờ mô phỏng."""

from pydantic import BaseModel

from app.restaurants.schemas import RestaurantDetail


class AdminRestaurantPage(BaseModel):
    items: list[RestaurantDetail]
    total: int
    offset: int
    limit: int

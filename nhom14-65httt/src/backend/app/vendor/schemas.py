"""Schema vendor tái sử dụng validation quán và không cho sửa trạng thái duyệt."""

from app.restaurants.schemas import RestaurantCreate, RestaurantUpdate


class VendorRestaurantCreate(RestaurantCreate):
    pass


class VendorRestaurantUpdate(RestaurantUpdate):
    pass

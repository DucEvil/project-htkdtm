import type { MenuItemPublic } from "../../src/types/menu";
import type { RestaurantPublic } from "../../src/types/restaurant";

export const restaurant: RestaurantPublic = {
  id: 3,
  name: "Bếp Việt",
  address: "Số 1, phố Trần Phú",
  latitude: 21,
  longitude: 105,
  delivery_radius_km: 5,
  opens_at: "08:00",
  closes_at: "22:00",
  accepting_orders: true,
  is_open: true,
  can_receive_orders: true,
};
export const dish: MenuItemPublic = {
  id: 9,
  name: "Phở bò tái",
  restaurant_id: 3,
  restaurant_name: restaurant.name,
  canonical_dish_id: 2,
  price: 35000,
  is_available: true,
  ingredients_verified: true,
  ingredients: [
    { id: 1, name: "bò" },
    { id: 2, name: "hành" },
  ],
  canonical_dish: {
    id: 2,
    name: "Phở bò",
    region: "Bắc",
    method: "Nấu",
    spice_level: 1,
    ingredients: ["bánh phở", "quế"],
    labels: ["Món nước"],
  },
};

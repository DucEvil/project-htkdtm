/** Giờ HH:MM theo Việt Nam; các cờ khả dụng được tính tại máy chủ. */
export interface RestaurantPublic {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  delivery_radius_km: number;
  opens_at: string;
  closes_at: string;
  accepting_orders: boolean;
  is_open: boolean;
  can_receive_orders: boolean;
}

export type RestaurantStatus = "pending" | "approved" | "suspended";

export interface RestaurantDetail extends RestaurantPublic {
  status: RestaurantStatus;
  is_simulated: boolean;
}

export interface RestaurantCreate {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  delivery_radius_km?: number;
  opens_at?: string;
  closes_at?: string;
}

/** PUT thay toàn bộ hồ sơ; không dùng mặc định của POST cho trường bỏ trống. */
export interface RestaurantUpdate extends RestaurantCreate {
  delivery_radius_km: number;
  opens_at: string;
  closes_at: string;
  accepting_orders: boolean;
}

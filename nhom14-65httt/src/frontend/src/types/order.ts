export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "delivering"
  | "completed"
  | "cancelled"
  | "rejected";

export interface OrderLineInput {
  menu_item_id: number;
  quantity: number;
  /** Giá nguyên VNĐ khách đã thấy, để máy chủ phát hiện thay đổi giá. */
  expected_price: number;
}

export interface OrderCreate {
  restaurant_id: number;
  items: OrderLineInput[];
  delivery_address: string;
  latitude: number;
  longitude: number;
  session_id: string;
  /** UUID v4 do checkout tạo một lần; giữ nguyên khi gửi lại cùng đơn. */
  idempotency_key: string;
}

export interface OrderLineOut {
  menu_item_id: number;
  quantity: number;
  snapshot_price: number;
  snapshot_name: string;
}

export interface OrderHistory {
  status: OrderStatus;
  reason: string | null;
  created_at: string;
}

export interface OrderDetail {
  id: number;
  restaurant_id: number;
  status: OrderStatus;
  total: number;
  delivery_address: string;
  latitude: number;
  longitude: number;
  created_at: string;
  items: OrderLineOut[];
  history: OrderHistory[];
}

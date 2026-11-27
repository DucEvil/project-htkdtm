import type { OrderDetail } from "../../src/types/order";

export const order: OrderDetail = {
  id: 77,
  restaurant_id: 3,
  status: "pending",
  total: 70000,
  delivery_address: "Số 1, phố Trần Phú, Hà Nội",
  latitude: 21,
  longitude: 105,
  created_at: "2026-11-27T03:00:00Z",
  items: [
    {
      menu_item_id: 9,
      quantity: 2,
      snapshot_price: 35000,
      snapshot_name: "Phở bò lúc mua",
    },
  ],
  history: [
    { status: "pending", reason: null, created_at: "2026-11-27T03:00:00Z" },
  ],
};

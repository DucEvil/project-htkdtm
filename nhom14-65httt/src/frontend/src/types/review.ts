export interface ReviewCreate {
  menu_item_id: number;
  rating: 1 | 2 | 3 | 4 | 5;
  comment?: string;
}

export interface ReviewOut {
  id: number;
  order_id: number;
  menu_item_id: number;
  snapshot_name: string;
  snapshot_price: number;
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string;
  created_at: string;
}

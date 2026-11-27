export interface IngredientPublic {
  id: number;
  name: string;
}

export interface CanonicalDishPublic {
  id: number;
  name: string;
  region: string;
  method: string;
  spice_level: number;
  ingredients: string[];
  labels: string[];
}

/** Giá nguyên VNĐ; nguyên liệu thực tế tách khỏi đặc trưng của món chuẩn. */
export interface MenuItemPublic {
  id: number;
  restaurant_id: number;
  restaurant_name: string;
  canonical_dish_id: number;
  name: string;
  price: number;
  is_available: boolean;
  ingredients_verified: boolean;
  canonical_dish: CanonicalDishPublic;
  ingredients: IngredientPublic[];
}

export interface MenuItemDetail extends MenuItemPublic {
  is_simulated: boolean;
}

export interface MenuItemCreate {
  canonical_dish_id: number;
  name: string;
  price: number;
  is_available?: boolean;
  ingredients_verified?: boolean;
  ingredient_ids?: number[];
}

/** PUT yêu cầu khai báo đủ trạng thái bán và nguyên liệu thực tế. */
export interface MenuItemUpdate extends MenuItemCreate {
  is_available: boolean;
  ingredients_verified: boolean;
  ingredient_ids: number[];
}

export interface IngredientInput {
  name: string;
}

export interface IngredientDetail extends IngredientPublic {
  is_simulated: boolean;
}

export interface CanonicalDishDetail extends CanonicalDishPublic {
  source_id: string | null;
  is_simulated: boolean;
}

export interface CanonicalDishCreate {
  name: string;
  region: string;
  method: string;
  spice_level?: 0 | 1 | 2 | 3;
  ingredients?: string[];
  labels?: string[];
  source_id?: string | null;
}

/** PUT thay toàn bộ đặc trưng; source_id có thể null nhưng phải được gửi. */
export interface CanonicalDishUpdate extends CanonicalDishCreate {
  spice_level: 0 | 1 | 2 | 3;
  ingredients: string[];
  labels: string[];
  source_id: string | null;
}

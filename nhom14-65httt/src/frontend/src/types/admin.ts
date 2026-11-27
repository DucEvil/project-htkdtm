import type { PaginationQuery } from "./common";
import type { RestaurantStatus } from "./restaurant";

export interface AdminRestaurantQuery extends PaginationQuery {
  status?: RestaurantStatus;
}

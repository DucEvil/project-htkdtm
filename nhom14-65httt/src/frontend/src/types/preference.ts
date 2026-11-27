/** PUT yêu cầu đủ năm câu; bỏ qua onboarding không gọi PUT. */
export interface Preference {
  regions: string[];
  spice_level: 0 | 1 | 2 | 3;
  liked_ingredients: string[];
  avoided_ingredients: string[];
  exploration_level: 0 | 1 | 2;
}

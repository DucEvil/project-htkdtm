import type { CanonicalDishUpdate } from "../types/menu";
export const emptyDishFeatures = {
  region: "",
  method: "",
  spice: "0",
  ingredients: "",
  labels: "",
  source: "",
};
export function dishPayload(
  name: string,
  form: typeof emptyDishFeatures,
): CanonicalDishUpdate {
  const text = (value: string, max: number, label: string) => {
    const cleaned = value.trim();
    if (!cleaned || [...cleaned].length > max)
      throw new Error(`${label} cần từ 1 đến ${max} ký tự.`);
    return cleaned;
  };
  const lines = (value: string) => {
    const result = value
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
    if (result.length > 100 || result.some((item) => [...item].length > 100))
      throw new Error(
        "Mỗi danh sách tối đa 100 dòng; mỗi dòng tối đa 100 ký tự.",
      );
    return result;
  };
  if (!["0", "1", "2", "3"].includes(form.spice))
    throw new Error("Mức cay cần từ 0 đến 3.");
  return {
    name: text(name, 180, "Tên món"),
    region: text(form.region, 40, "Vùng miền"),
    method: text(form.method, 40, "Cách chế biến"),
    spice_level: Number(form.spice) as 0 | 1 | 2 | 3,
    ingredients: lines(form.ingredients).map((value) => value.toLowerCase()),
    labels: lines(form.labels),
    source_id: form.source.trim()
      ? text(form.source, 120, "Mã nguồn dữ liệu")
      : null,
  };
}

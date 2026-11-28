import { expect, it } from "vitest";
import { dishPayload, emptyDishFeatures } from "../src/utils/dishCatalog";
const valid = { ...emptyDishFeatures, region: " Bắc ", method: " Nấu " };
it("sends complete replacement with null source and separate reference ingredients", () => {
  expect(
    dishPayload(" Phở ", {
      ...valid,
      ingredients: " BÒ \n hành ",
      labels: " Món nước ",
    }),
  ).toEqual({
    name: "Phở",
    region: "Bắc",
    method: "Nấu",
    spice_level: 0,
    ingredients: ["bò", "hành"],
    labels: ["Món nước"],
    source_id: null,
  });
});
it.each([
  { region: "" },
  { method: "x".repeat(41) },
  { spice: "4" },
  { source: "x".repeat(121) },
  { ingredients: "x".repeat(101) },
  { labels: Array(101).fill("nhãn").join("\n") },
])("rejects invalid features %j", (change) => {
  expect(() => dishPayload("Phở", { ...valid, ...change })).toThrow();
});

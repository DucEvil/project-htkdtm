import { expect, it } from "vitest";
import { emptyTaste, validateTaste } from "../src/utils/preferenceValidation";

it("không coi ô trống là mức 0, cần đồng ý lưu", () => {
  expect(validateTaste(emptyTaste).errors).toEqual({
    spice: "Bạn hãy chọn mức cay.",
    exploration: "Bạn hãy chọn mức khám phá.",
    consent: "Bạn cần đồng ý trước khi lưu khẩu vị.",
  });
});
it("giữ hai danh sách rỗng, nhận mức 0 và tách dấu phẩy/xuống dòng", () => {
  expect(
    validateTaste({
      ...emptyTaste,
      spice: "0",
      exploration: "0",
      consent: true,
      liked: " bò, ,nấm\nrau ",
    }).payload,
  ).toEqual({
    regions: [],
    spice_level: 0,
    liked_ingredients: ["bò", "nấm", "rau"],
    avoided_ingredients: [],
    exploration_level: 0,
  });
});
it("chặn danh sách và từng mục vượt giới hạn backend", () => {
  const result = validateTaste({
    ...emptyTaste,
    spice: "1",
    exploration: "1",
    consent: true,
    liked: Array(101).fill("bò").join(","),
    avoided: "a".repeat(101),
  });
  expect(result.errors.liked).toBeTruthy();
  expect(result.errors.avoided).toBeTruthy();
  expect(result.payload).toBeUndefined();
});

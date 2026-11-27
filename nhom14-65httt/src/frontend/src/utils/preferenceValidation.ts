import type { Preference } from "../types/preference";

export interface TasteForm {
  regions: string[];
  spice: string;
  liked: string;
  avoided: string;
  exploration: string;
  consent: boolean;
}
export type TasteErrors = Partial<Record<keyof TasteForm, string>>;
export const emptyTaste: TasteForm = {
  regions: [],
  spice: "",
  liked: "",
  avoided: "",
  exploration: "",
  consent: false,
};

export function tasteFromPreference(profile: Preference): TasteForm {
  return {
    regions: profile.regions,
    spice: String(profile.spice_level),
    liked: profile.liked_ingredients.join(", "),
    avoided: profile.avoided_ingredients.join(", "),
    exploration: String(profile.exploration_level),
    consent: false,
  };
}

function ingredients(text: string): string[] {
  return text
    .split(/[,\n]/)
    .map((value) => value.trim())
    .filter(Boolean);
}

export function validateTaste(form: TasteForm): {
  errors: TasteErrors;
  payload?: Preference;
} {
  const errors: TasteErrors = {};
  const liked = ingredients(form.liked),
    avoided = ingredients(form.avoided);
  for (const [field, entries] of [
    ["liked", liked],
    ["avoided", avoided],
    ["regions", form.regions],
  ] as const) {
    if (entries.length > 100) errors[field] = "Chỉ nhập tối đa 100 mục.";
    else if (entries.some((value) => !value.trim() || value.length > 100))
      errors[field] = "Mỗi mục cần từ 1 đến 100 ký tự.";
  }
  if (!["0", "1", "2", "3"].includes(form.spice))
    errors.spice = "Bạn hãy chọn mức cay.";
  if (!["0", "1", "2"].includes(form.exploration))
    errors.exploration = "Bạn hãy chọn mức khám phá.";
  if (!form.consent) errors.consent = "Bạn cần đồng ý trước khi lưu khẩu vị.";
  if (Object.keys(errors).length) return { errors };
  return {
    errors,
    payload: {
      regions: form.regions,
      spice_level: Number(form.spice) as Preference["spice_level"],
      liked_ingredients: liked,
      avoided_ingredients: avoided,
      exploration_level: Number(
        form.exploration,
      ) as Preference["exploration_level"],
    },
  };
}

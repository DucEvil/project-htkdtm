import { useCallback, useState } from "react";
import { listCanonicalDishes, listIngredients } from "../../api/menu";
import { errorMessage } from "../../api/client";
import { usePublicData as useRemoteData } from "../../hooks/usePublicData";
import type { IngredientPublic } from "../../types/menu";
import type { Page } from "../../types/common";

export default function CatalogPicker({
  kind,
  selected,
  onChange,
  error,
  disabled,
}: {
  kind: "dish" | "ingredients";
  selected: IngredientPublic[];
  onChange: (items: IngredientPublic[]) => void;
  error?: string;
  disabled: boolean;
}) {
  const [offset, setOffset] = useState(0);
  const load = useCallback(
    (signal: AbortSignal): Promise<Page<IngredientPublic>> =>
      kind === "dish"
        ? listCanonicalDishes({ offset, limit: 10 }, { signal })
        : listIngredients({ offset, limit: 10 }, { signal }),
    [kind, offset],
  );
  const result = useRemoteData(load);
  function select(item: IngredientPublic, checked: boolean) {
    if (kind === "dish") onChange([item]);
    else
      onChange(
        checked
          ? [...selected.filter((entry) => entry.id !== item.id), item]
          : selected.filter((entry) => entry.id !== item.id),
      );
  }
  return (
    <fieldset className="vendor-catalog" disabled={disabled}>
      <legend>
        {kind === "dish" ? "Món chuẩn" : "Nguyên liệu thực tế tại quán"}
      </legend>
      <p className="vendor-menu-hint">
        {kind === "dish"
          ? "Chọn món chuẩn tương ứng để liên kết danh mục."
          : "Chọn đúng thành phần quán đang dùng. Danh sách này không tự lấy từ món chuẩn."}
      </p>
      {selected.length > 0 && (
        <div
          className="vendor-selected"
          aria-label={
            kind === "dish" ? "Món chuẩn đã chọn" : "Nguyên liệu đã chọn"
          }
        >
          {selected.map((item) => (
            <span key={item.id}>
              {item.name}
              {kind === "ingredients" && (
                <button
                  type="button"
                  onClick={() => select(item, false)}
                  aria-label={`Bỏ nguyên liệu ${item.name}`}
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
      )}
      {kind === "ingredients" && (
        <p className="vendor-menu-hint">
          Đã chọn {selected.length}/100 nguyên liệu. Các lựa chọn được giữ khi
          chuyển trang danh mục.
        </p>
      )}
      {result.loading ? (
        <p role="status">Đang tải danh mục…</p>
      ) : result.error ? (
        <div>
          <p className="vendor-menu-error" role="alert">
            {errorMessage(result.error)}
          </p>
          <button
            type="button"
            className="vendor-menu-secondary"
            onClick={result.retry}
          >
            Tải lại {kind === "dish" ? "món chuẩn" : "nguyên liệu"}
          </button>
        </div>
      ) : (
        result.data && (
          <>
            {!result.data.items.length ? (
              <p className="vendor-menu-hint">
                Danh mục chưa có mục ở trang này. Quản trị viên cần chuẩn bị
                danh mục trước khi bạn chọn.
              </p>
            ) : (
              <div className="vendor-catalog-options">
                {result.data.items.map((item) => (
                  <label key={item.id}>
                    <input
                      type={kind === "dish" ? "radio" : "checkbox"}
                      name={`catalog-${kind}`}
                      checked={selected.some((entry) => entry.id === item.id)}
                      disabled={
                        kind === "ingredients" &&
                        selected.length >= 100 &&
                        !selected.some((entry) => entry.id === item.id)
                      }
                      onChange={(event) => select(item, event.target.checked)}
                      aria-invalid={Boolean(error)}
                      aria-describedby={
                        error ? `catalog-${kind}-error` : undefined
                      }
                    />
                    <span>{item.name}</span>
                  </label>
                ))}
              </div>
            )}
            {(result.data.total > 10 || offset > 0) && (
              <nav
                className="vendor-menu-pagination"
                aria-label={
                  kind === "dish"
                    ? "Phân trang món chuẩn"
                    : "Phân trang nguyên liệu"
                }
              >
                <button
                  type="button"
                  disabled={!offset}
                  onClick={() => setOffset((value) => Math.max(0, value - 10))}
                >
                  Trang trước
                </button>
                <span>Trang {offset / 10 + 1}</span>
                <button
                  type="button"
                  disabled={offset + result.data.limit >= result.data.total}
                  onClick={() => setOffset((value) => value + 10)}
                >
                  Trang sau
                </button>
              </nav>
            )}
          </>
        )
      )}
      {error && (
        <p className="vendor-menu-error" id={`catalog-${kind}-error`}>
          {error}
        </p>
      )}
    </fieldset>
  );
}

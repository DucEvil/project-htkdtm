import type { MenuItemPublic } from "../../types/menu";

export default function IngredientInfo({ item }: { item: MenuItemPublic }) {
  return (
    <section className="catalog-ingredients" aria-label="Nguyên liệu thực tế">
      <h2>Nguyên liệu từ quán</h2>
      <p>
        {item.ingredients.length
          ? item.ingredients.map((entry) => entry.name).join(", ")
          : "Quán chưa khai báo nguyên liệu thực tế."}
      </p>
      <p className="catalog-muted">
        {item.ingredients_verified
          ? "Quán đã xác nhận danh sách nguyên liệu."
          : "Danh sách nguyên liệu chưa được quán xác nhận."}
      </p>
      <p className="catalog-caution">
        Thông tin này không bảo đảm an toàn với dị ứng. Hãy hỏi trực tiếp quán
        về nguyên liệu và cách chế biến trước khi đặt.
      </p>
    </section>
  );
}

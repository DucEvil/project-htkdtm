import { Link } from "react-router-dom";
import { useCart } from "../../hooks/useCart";
import QuantityControl from "../../components/cart/QuantityControl";
import { formatPrice } from "../../utils/catalog";

export default function CartPage() {
  const cart = useCart();
  const restaurant = cart.items[0];
  return (
    <section className="cart-page" aria-labelledby="cart-heading">
      <span className="eyebrow">BỮA NGON BẠN ĐÃ CHỌN</span>
      <h1 id="cart-heading">Giỏ hàng của bạn</h1>
      {cart.error && (
        <p className="cart-error" role="alert">
          {cart.error}
        </p>
      )}
      {cart.notice && (
        <p className="cart-success" role="status">
          {cart.notice}
        </p>
      )}
      {!restaurant ? (
        <div className="cart-empty">
          <h2>Giỏ hàng đang trống</h2>
          <p>Khám phá một món ngon và thêm vào giỏ nhé.</p>
          <Link className="button" to="/search">
            Tìm món gần bạn
          </Link>
        </div>
      ) : (
        <>
          <p className="cart-restaurant">
            Món từ{" "}
            <Link to={`/restaurants/${restaurant.restaurant_id}`}>
              {restaurant.restaurant_name}
            </Link>
          </p>
          <div className="cart-layout">
            <div className="cart-lines">
              {cart.items.map((item) => (
                <article className="cart-line" key={item.menu_item_id}>
                  <div className="cart-line-title">
                    <h2>
                      <Link to={`/menu-items/${item.menu_item_id}`}>
                        {item.name}
                      </Link>
                    </h2>
                    <p>{formatPrice(item.price)} / phần</p>
                  </div>
                  <QuantityControl
                    value={item.quantity}
                    onChange={(quantity) =>
                      cart.setQuantity(item.menu_item_id, quantity)
                    }
                    name={item.name}
                  />
                  <div className="cart-line-total">
                    <strong>{formatPrice(item.price * item.quantity)}</strong>
                    <button
                      type="button"
                      onClick={() => cart.remove(item.menu_item_id)}
                      aria-label={`Xóa món ${item.name}`}
                    >
                      Xóa món
                    </button>
                  </div>
                </article>
              ))}
              <Link
                className="cart-continue"
                to={`/restaurants/${restaurant.restaurant_id}`}
              >
                ← Chọn thêm món cùng quán
              </Link>
            </div>
            <aside className="cart-summary">
              <h2>Tạm tính</h2>
              <dl>
                <div>
                  <dt>Số phần</dt>
                  <dd>{cart.count}</dd>
                </div>
                <div>
                  <dt>Tiền món</dt>
                  <dd>{formatPrice(cart.total)}</dd>
                </div>
              </dl>
              <p>
                Giá trong giỏ là giá lúc bạn thêm món. Giá và khả năng phục vụ
                cần được kiểm tra lại khi đặt đơn.
              </p>
              <Link className="button" to="/checkout">
                Tiếp tục đặt hàng
              </Link>
            </aside>
          </div>
        </>
      )}
      <p className="cart-storage-note">
        Giỏ chỉ được giữ trong lần mở trang này; tải lại hoặc đóng trang sẽ làm
        trống giỏ.
      </p>
    </section>
  );
}

import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useLocation } from "../../hooks/useLocation";
import { useCart } from "../../hooks/useCart";
import { checkoutDraft, type CheckoutDraft } from "../../utils/checkout";
import LocationPicker from "../map/LocationPicker";

export default function CheckoutForm({
  onSubmit,
  busy,
}: {
  onSubmit: (draft: CheckoutDraft) => void;
  busy: boolean;
}) {
  const { location } = useLocation();
  const { items } = useCart();
  const [address, setAddress] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [confirmedPoint, setConfirmedPoint] = useState("");
  const pointKey = JSON.stringify(
    location && [location.latitude, location.longitude],
  );
  const [errors, setErrors] = useState<
    ReturnType<typeof checkoutDraft>["errors"]
  >({});
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const checked = checkoutDraft(
      items,
      address,
      location,
      confirm && confirmedPoint === pointKey,
    );
    setErrors(checked.errors);
    if (checked.payload) onSubmit(checked.payload);
    else {
      const form = event.currentTarget;
      requestAnimationFrame(() =>
        form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
      );
    }
  }
  return (
    <>
      <div className="checkout-location">
        <LocationPicker purpose="delivery" />
      </div>
      <form className="checkout-form" noValidate onSubmit={submit}>
        <fieldset disabled={busy}>
          <h2>Địa chỉ giao hàng</h2>
          <label htmlFor="delivery-address">Địa chỉ đầy đủ</label>
          <textarea
            id="delivery-address"
            autoComplete="street-address"
            maxLength={500}
            value={address}
            onChange={(event) => {
              setAddress(event.target.value);
              setConfirm(false);
            }}
            aria-invalid={Boolean(errors.address)}
            aria-describedby={
              errors.address
                ? "delivery-address-error"
                : "delivery-address-hint"
            }
          />
          <p id="delivery-address-hint">
            Nhập số nhà, đường và khu vực. Địa chỉ chưa được tự đổi thành tọa
            độ.
          </p>
          {errors.address && (
            <p className="cart-error" id="delivery-address-error">
              {errors.address}
            </p>
          )}
          {errors.location && !location && (
            <p className="cart-error" role="alert">
              {errors.location}
            </p>
          )}
          <label className="checkout-confirm">
            <input
              type="checkbox"
              checked={confirm && confirmedPoint === pointKey}
              onChange={(event) => {
                setConfirm(event.target.checked);
                setConfirmedPoint(pointKey);
              }}
              aria-invalid={Boolean(errors.confirm)}
              aria-describedby={
                errors.confirm ? "checkout-confirm-error" : undefined
              }
            />
            <span>
              Tôi xác nhận địa chỉ và tọa độ đã chọn là cùng điểm giao hàng, và
              đồng ý thanh toán khi nhận hàng.
            </span>
          </label>
          {errors.confirm && (
            <p className="cart-error" id="checkout-confirm-error">
              {errors.confirm}
            </p>
          )}
          {errors.cart && (
            <p className="cart-error" role="alert">
              {errors.cart}
            </p>
          )}
          <button type="submit" className="button">
            {busy ? "Đang gửi đơn…" : "Đặt đơn COD"}
          </button>
          <Link className="cart-inline-link" to="/cart">
            Về giỏ hàng
          </Link>
        </fieldset>
      </form>
    </>
  );
}

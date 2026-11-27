import { useState } from "react";
import type { OrderCreate } from "../types/order";
import type { CheckoutDraft } from "../utils/checkout";

interface Intent {
  userId: number;
  payload: OrderCreate;
  durable?: boolean;
}
const memory = new Map<number, Intent>();
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const storageKey = (userId: number) => `viviet.checkout.pending.v1.${userId}`;

function read(userId: number): Intent | null {
  if (memory.has(userId)) return memory.get(userId)!;
  try {
    const raw = sessionStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const record = JSON.parse(raw) as Intent;
    const payload = record.payload;
    if (
      record.userId !== userId ||
      !payload ||
      !uuid.test(payload.idempotency_key) ||
      !uuid.test(payload.session_id) ||
      !Number.isInteger(payload.restaurant_id) ||
      payload.restaurant_id <= 0 ||
      typeof payload.delivery_address !== "string" ||
      payload.delivery_address.trim().length < 5 ||
      payload.delivery_address.length > 500 ||
      !Number.isFinite(payload.latitude) ||
      Math.abs(payload.latitude) > 90 ||
      !Number.isFinite(payload.longitude) ||
      Math.abs(payload.longitude) > 180 ||
      !Array.isArray(payload.items) ||
      !payload.items.length ||
      payload.items.length > 100 ||
      payload.items.some(
        (item) =>
          !Number.isInteger(item.menu_item_id) ||
          item.menu_item_id <= 0 ||
          !Number.isInteger(item.quantity) ||
          item.quantity < 1 ||
          item.quantity > 99 ||
          !Number.isInteger(item.expected_price) ||
          item.expected_price <= 0 ||
          item.expected_price > 10000000,
      )
    )
      return null;
    // Chỉ khôi phục các trường thuộc hợp đồng; dữ liệu trình duyệt không cấp quyền.
    const clean: Intent = {
      userId,
      payload: {
        restaurant_id: payload.restaurant_id,
        delivery_address: payload.delivery_address,
        latitude: payload.latitude,
        longitude: payload.longitude,
        session_id: payload.session_id,
        idempotency_key: payload.idempotency_key,
        items: payload.items.map(
          ({ menu_item_id, quantity, expected_price }) => ({
            menu_item_id,
            quantity,
            expected_price,
          }),
        ),
      },
    };
    memory.set(userId, clean);
    return clean;
  } catch {
    return null;
  }
}

function sessionId() {
  try {
    const existing = sessionStorage.getItem("viviet.session.v1");
    if (existing && uuid.test(existing)) return existing;
    const id = crypto.randomUUID();
    sessionStorage.setItem("viviet.session.v1", id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

/** Một ý định đang gửi được khóa nội dung; thử lại luôn dùng đúng payload/key. */
export function useIdempotency(userId: number) {
  const [intent, setIntent] = useState<Intent | null>(() => read(userId));
  const [durable, setDurable] = useState(() => read(userId)?.durable !== false);
  function prepare(draft: CheckoutDraft): OrderCreate {
    const pending = memory.get(userId) ?? read(userId);
    if (pending) {
      setIntent(pending);
      return pending.payload;
    }
    const record: Intent = {
      userId,
      payload: {
        ...draft,
        session_id: sessionId(),
        idempotency_key: crypto.randomUUID(),
      },
    };
    memory.set(userId, record);
    setIntent(record);
    try {
      sessionStorage.setItem(storageKey(userId), JSON.stringify(record));
      // localStorage chỉ lưu key theo người dùng/phiên, không lưu địa chỉ hoặc tọa độ.
      localStorage.setItem(
        `viviet.checkout.key.v1.${userId}.${record.payload.session_id}`,
        record.payload.idempotency_key,
      );
    } catch {
      record.durable = false;
      setDurable(false);
    }
    return record.payload;
  }
  function release() {
    const record = memory.get(userId) ?? intent;
    memory.delete(userId);
    setIntent(null);
    try {
      sessionStorage.removeItem(storageKey(userId));
      if (record)
        localStorage.removeItem(
          `viviet.checkout.key.v1.${userId}.${record.payload.session_id}`,
        );
    } catch {
      setDurable(false);
    }
  }
  return { intent: intent?.payload ?? null, prepare, release, durable };
}

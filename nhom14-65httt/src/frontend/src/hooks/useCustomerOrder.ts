import { useCallback, useEffect, useRef, useState } from "react";
import { cancelOrder, getOrder } from "../api/orders";
import { ApiError, errorMessage } from "../api/client";
import type { OrderDetail } from "../types/order";
import { orderStatusLabels } from "../utils/orders";

export function useCustomerOrder(id: number) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelMessage, setCancelMessage] = useState("");
  const active = useRef(false),
    sequence = useRef(0),
    mutation = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const validate = useCallback(
    (value: OrderDetail) => {
      if (
        !value ||
        value.id !== id ||
        !Object.prototype.hasOwnProperty.call(
          orderStatusLabels,
          value.status,
        ) ||
        !Array.isArray(value.items) ||
        !Array.isArray(value.history)
      )
        throw new Error("Chưa nhận được dữ liệu đơn hợp lệ.");
      return value;
    },
    [id],
  );
  const refresh = useCallback(async () => {
    if (mutation.current) return;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    const version = ++sequence.current;
    setRefreshing(true);
    try {
      const value = validate(await getOrder(id, { signal: abort.signal }));
      if (
        active.current &&
        version === sequence.current &&
        !abort.signal.aborted
      ) {
        setOrder(value);
        setError(null);
      }
    } catch (failure) {
      if (
        active.current &&
        version === sequence.current &&
        !abort.signal.aborted
      ) {
        setError(failure);
        if (
          failure instanceof ApiError &&
          [401, 403, 404].includes(failure.status)
        )
          setOrder(null);
      }
    } finally {
      if (
        active.current &&
        version === sequence.current &&
        !abort.signal.aborted
      ) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [id, validate]);
  useEffect(() => {
    active.current = true;
    void refresh();
    return () => {
      active.current = false;
      controller.current?.abort();
    };
  }, [refresh]);
  const terminal = order
    ? ["completed", "cancelled", "rejected"].includes(order.status)
    : false;
  const hasOrder = order !== null;
  useEffect(() => {
    if (!hasOrder || terminal) return;
    const update = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const timer = setInterval(update, 15000);
    document.addEventListener("visibilitychange", update);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", update);
    };
  }, [hasOrder, terminal, refresh]);

  async function cancel() {
    if (mutation.current || order?.status !== "pending" || error) return;
    mutation.current = true;
    controller.current?.abort();
    sequence.current++;
    setCancelling(true);
    setRefreshing(false);
    setCancelMessage("");
    try {
      const value = validate(await cancelOrder(id));
      if (active.current) {
        setOrder(value);
        setError(null);
        setCancelMessage(
          value.status === "cancelled"
            ? "Đã hủy đơn hàng."
            : "Đã nhận trạng thái mới từ máy chủ.",
        );
      }
    } catch (failure) {
      if (active.current) {
        setCancelMessage(
          `${errorMessage(failure)} Đang kiểm tra lại trạng thái đơn; không tự gửi lại yêu cầu hủy.`,
        );
        mutation.current = false;
        await refresh();
      }
    } finally {
      mutation.current = false;
      if (active.current) setCancelling(false);
    }
  }
  return {
    order,
    loading,
    refreshing,
    error,
    refresh,
    cancelling,
    cancel,
    cancelMessage,
  };
}

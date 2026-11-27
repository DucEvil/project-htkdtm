import { useEffect, useState } from "react";

/** Caller giữ loader ổn định bằng useCallback; hủy và bỏ phản hồi cũ khi đổi trang. */
export function usePublicData<T>(loader: (signal: AbortSignal) => Promise<T>) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{
    data: T | null;
    loading: boolean;
    error: unknown;
  }>({ data: null, loading: true, error: null });
  useEffect(() => {
    const controller = new AbortController();
    setState({ data: null, loading: true, error: null });
    void loader(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted)
          setState({ data, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setState({ data: null, loading: false, error });
      });
    return () => controller.abort();
  }, [loader, attempt]);
  return { ...state, retry: () => setAttempt((value) => value + 1) };
}

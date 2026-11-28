import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ErrorBoundary from "../src/components/common/ErrorBoundary";
import RouteErrorBoundary from "../src/components/common/RouteErrorBoundary";

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
function Broken(): never {
  throw new Error("private-token-test-value");
}
it("shows recovery without exposing exception details", () => {
  render(
    <ErrorBoundary>
      <Broken />
    </ErrorBoundary>,
  );
  expect(screen.getByRole("alert")).toBeTruthy();
  expect(screen.queryByText(/private-token-test-value/)).toBeNull();
  expect(
    screen.getByRole("link", { name: "Về trang chủ" }).getAttribute("href"),
  ).toBe("/");
});
it("retries a recovered child only after user action", async () => {
  let broken = true;
  function Content() {
    if (broken) throw new Error("render failed");
    return <p>Nội dung đã mở</p>;
  }
  render(
    <ErrorBoundary>
      <Content />
    </ErrorBoundary>,
  );
  broken = false;
  expect(screen.queryByText("Nội dung đã mở")).toBeNull();
  await userEvent.click(
    screen.getByRole("button", { name: "Mở lại nội dung" }),
  );
  expect(screen.getByText("Nội dung đã mở")).toBeTruthy();
});
it("route recovery keeps providers outside the boundary mounted", async () => {
  const mounted = vi.fn();
  function Shell() {
    mounted();
    return (
      <RouteErrorBoundary>
        <Routes>
          <Route path="/broken" element={<Broken />} />
          <Route path="/" element={<p>Trang chủ hoạt động</p>} />
        </Routes>
      </RouteErrorBoundary>
    );
  }
  render(
    <MemoryRouter initialEntries={["/broken"]}>
      <Shell />
    </MemoryRouter>,
  );
  const initial = mounted.mock.calls.length;
  await userEvent.click(screen.getByRole("link", { name: "Về trang chủ" }));
  expect(screen.getByText("Trang chủ hoạt động")).toBeTruthy();
  expect(mounted).toHaveBeenCalledTimes(initial);
});

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RouteError } from "./route-error";

function renderError(digest?: string) {
  const retry = vi.fn();
  const error = Object.assign(new Error("boom"), { digest });
  vi.spyOn(console, "error").mockImplementation(() => {});
  render(
    <RouteError
      error={error}
      retry={retry}
      description="Give it another go."
      home={{ href: "/dashboard", label: "Back to my dashboard" }}
    />
  );
  return retry;
}

describe("RouteError", () => {
  it("retries the segment when asked", () => {
    const retry = renderError();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("links back to the area's own dashboard, not the homepage", () => {
    renderError();
    expect(screen.getByRole("link", { name: /back to my dashboard/i })).toHaveAttribute(
      "href",
      "/dashboard"
    );
  });

  it("shows the reference only when there is one, never the message", () => {
    renderError("abc123");
    expect(screen.getByText("Reference: abc123")).toBeInTheDocument();
    expect(screen.queryByText("boom")).not.toBeInTheDocument();
  });
});

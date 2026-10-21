import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RiCalendarLine } from "@remixicon/react";
import { EmptyState } from "./empty-state";

describe("EmptyState", () => {
  it("shows the title, description and action", () => {
    render(
      <EmptyState
        icon={<RiCalendarLine />}
        title="No shifts yet"
        description="Pick your next mahi from the roster."
        action={<a href="/shifts">Browse the roster</a>}
      />
    );

    expect(screen.getByText("No shifts yet")).toBeInTheDocument();
    expect(screen.getByText("Pick your next mahi from the roster.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse the roster" })).toHaveAttribute(
      "href",
      "/shifts"
    );
  });

  it("stands alone in a card by default, and drops it when bare", () => {
    const { container, rerender } = render(<EmptyState title="Nothing here" />);
    expect(container.querySelector('[data-slot="card"]')).toBeInTheDocument();

    rerender(<EmptyState title="Nothing here" bare />);
    expect(container.querySelector('[data-slot="card"]')).not.toBeInTheDocument();
    expect(container.querySelector('[data-slot="empty-state"]')).toBeInTheDocument();
  });

  it("prefers the illustration over an icon, and keeps the art decorative", () => {
    const { container } = render(
      <EmptyState illustration="book" icon={<RiCalendarLine data-testid="icon" />} title="No training" />
    );

    const img = container.querySelector("img");
    expect(img).toHaveAttribute("src", "/brand/illustrations/book.webp");
    expect(img).toHaveAttribute("alt", "");
    expect(screen.queryByTestId("icon")).not.toBeInTheDocument();
  });

  it("renders the icon in a hidden chip when there is no illustration", () => {
    render(<EmptyState icon={<RiCalendarLine data-testid="icon" />} title="No shifts" />);
    expect(screen.getByTestId("icon").parentElement).toHaveAttribute("aria-hidden", "true");
  });

  it("scales the art down in the compact size", () => {
    const { container } = render(
      <EmptyState illustration="korero" title="Nothing new" size="compact" />
    );
    expect(container.querySelector("img")).toHaveAttribute("width", "48");
  });

  it("puts className on the outermost element", () => {
    const { container, rerender } = render(
      <EmptyState title="Nothing here" className="custom" />
    );
    expect(container.firstElementChild).toHaveClass("custom");

    rerender(<EmptyState title="Nothing here" className="custom" bare />);
    expect(container.firstElementChild).toHaveClass("custom");
  });
});

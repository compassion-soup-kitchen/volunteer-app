import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageHeaderSkeleton, PageSkeleton } from "./page-skeleton";

describe("PageSkeleton", () => {
  it("announces the wait once and hides the placeholders", () => {
    const { container } = render(
      <PageSkeleton>
        <PageHeaderSkeleton back actions={2} />
      </PageSkeleton>
    );

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-busy", "true");
    expect(status).toHaveTextContent("Loading…");
    expect(container.querySelector('[aria-hidden="true"]')).toContainElement(
      container.querySelector('[data-slot="skeleton"]') as HTMLElement
    );
  });
});

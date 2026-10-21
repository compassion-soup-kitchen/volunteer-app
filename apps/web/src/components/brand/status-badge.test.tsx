import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PersonBadges } from "./person-badges";
import { StatusBadge } from "./status-badge";

describe("StatusBadge", () => {
  it("gives a shift you're on the same colour as booked training", () => {
    render(
      <>
        <StatusBadge status="SIGNED_UP" />
        <StatusBadge status="REGISTERED" label="Booked" />
      </>
    );
    expect(screen.getByText("Signed up")).toHaveAttribute("data-variant", "info");
    expect(screen.getByText("Booked")).toHaveAttribute("data-variant", "info");
  });

  it("keeps namespaced states apart from their plain namesakes", () => {
    render(
      <>
        <StatusBadge status="CANCELLED" />
        <StatusBadge status="EVENT_CANCELLED" />
        <StatusBadge status="DECLINED" />
        <StatusBadge status="OFFER_DECLINED" />
      </>
    );
    const [shift, event] = screen.getAllByText("Cancelled");
    expect(shift).toHaveAttribute("data-variant", "neutral");
    expect(event).toHaveAttribute("data-variant", "destructive");
    expect(screen.getByText("Declined")).toHaveAttribute("data-variant", "destructive");
    expect(screen.getByText("Passed")).toHaveAttribute("data-variant", "neutral");
  });

  it("falls back to a neutral, readable label for an unknown status", () => {
    render(<StatusBadge status="SOMETHING_NEW" />);
    expect(screen.getByText("Something new")).toHaveAttribute("data-variant", "neutral");
  });
});

describe("PersonBadges", () => {
  it("badges the kitchen team, offline records and archived accounts", () => {
    render(<PersonBadges role="COORDINATOR" isOffline status="ARCHIVED" />);
    expect(screen.getByText("Coordinator")).toHaveAttribute("data-variant", "info");
    expect(screen.getByText("Offline")).toBeInTheDocument();
    expect(screen.getByText("Archived")).toBeInTheDocument();
  });

  it("leaves an ordinary active volunteer unbadged", () => {
    const { container } = render(<PersonBadges role="VOLUNTEER" status="ACTIVE" />);
    expect(container).toBeEmptyDOMElement();
  });
});

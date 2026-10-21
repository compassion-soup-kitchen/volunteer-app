import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const { signOut, deleteOwnAccount } = vi.hoisted(() => ({
  signOut: vi.fn(),
  deleteOwnAccount: vi.fn(),
}));

vi.mock("next-auth/react", () => ({ signOut }));
vi.mock("@/lib/account-actions", () => ({
  deleteOwnAccount,
  getOwnAccountDeletionSummary: vi.fn().mockResolvedValue({
    email: "aroha@example.com",
    erases: {
      shiftSignups: 0,
      attendedShifts: 0,
      trainingAttendances: 0,
      documents: 0,
      signedAgreements: 0,
    },
    authored: { shifts: 0, trainingSessions: 0, announcements: 0 },
    blocker: null,
  }),
}));

import { DeleteAccountCard } from "./delete-account-card";

async function confirmDeletion() {
  render(<DeleteAccountCard />);
  fireEvent.click(screen.getByRole("button", { name: "Delete my account" }));
  fireEvent.change(await screen.findByLabelText(/to confirm/i), {
    target: { value: "aroha@example.com" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Delete permanently" }));
}

describe("<DeleteAccountCard />", () => {
  const assign = vi.fn();
  const location = window.location;

  afterEach(() => {
    Object.defineProperty(window, "location", { value: location, configurable: true });
    vi.clearAllMocks();
  });

  it("still leaves when signing out fails after the account is erased", async () => {
    Object.defineProperty(window, "location", {
      value: { ...location, assign },
      configurable: true,
    });
    deleteOwnAccount.mockResolvedValue({ success: true });
    signOut.mockRejectedValue(new Error("network down"));

    await confirmDeletion();

    await waitFor(() =>
      expect(assign).toHaveBeenCalledWith(
        `${location.origin}/api/auth/session-ended`
      )
    );
    expect(deleteOwnAccount).toHaveBeenCalledWith("aroha@example.com");
  });
});

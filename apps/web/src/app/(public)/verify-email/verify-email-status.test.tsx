import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const verifyEmailMock = vi.fn();

vi.mock("@/lib/auth-actions", () => ({
  verifyEmail: (...args: unknown[]) => verifyEmailMock(...args),
  resendVerificationEmail: vi.fn(),
}));

import { VerifyEmailStatus } from "./verify-email-status";

beforeEach(() => {
  verifyEmailMock.mockReset();
});

describe("<VerifyEmailStatus />", () => {
  it("explains and offers a resend form when the token is missing", () => {
    render(<VerifyEmailStatus token="" />);

    expect(screen.getByRole("alert")).toHaveTextContent(/missing its token/i);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /resend verification email/i }),
    ).toBeInTheDocument();
    expect(verifyEmailMock).not.toHaveBeenCalled();
  });

  it("redeems the token on load and shows the success state", async () => {
    verifyEmailMock.mockResolvedValueOnce({ status: "success" });

    render(<VerifyEmailStatus token="raw-token" />);

    expect(
      await screen.findByText(/email confirmed/i),
    ).toBeInTheDocument();
    expect(verifyEmailMock).toHaveBeenCalledTimes(1);
    expect(verifyEmailMock).toHaveBeenCalledWith(null, "raw-token");
    expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  it("shows the error and a resend form when the token is dead", async () => {
    verifyEmailMock.mockResolvedValueOnce({
      status: "error",
      message: "This verification link has expired or already been used.",
    });

    render(<VerifyEmailStatus token="raw-token" />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /expired or already been used/i,
    );
    expect(
      screen.getByRole("button", { name: /resend verification email/i }),
    ).toBeInTheDocument();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/lib/auth-actions", () => ({
  register: vi.fn(),
  resendVerificationEmail: vi.fn(),
}));

vi.mock("next-auth/react", () => ({
  signIn: vi.fn(),
}));

import { register } from "@/lib/auth-actions";
import { RegisterForm } from "./register-form";

/** Submits the sign-up form, letting the mocked action drive the next state. */
function submitForm() {
  const form = screen
    .getByRole("button", { name: /create account/i })
    .closest("form");
  fireEvent.submit(form!);
}

beforeEach(() => {
  vi.mocked(register).mockReset();
});

describe("<RegisterForm />", () => {
  it("renders all required fields and submit button", () => {
    render(<RegisterForm />);

    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create account/i }),
    ).toBeInTheDocument();
  });

  it("uses correct input types and autocomplete hints", () => {
    render(<RegisterForm />);

    const email = screen.getByLabelText(/email/i) as HTMLInputElement;
    const password = screen.getByLabelText(/^password$/i) as HTMLInputElement;
    const confirm = screen.getByLabelText(
      /confirm password/i,
    ) as HTMLInputElement;

    expect(email).toHaveAttribute("type", "email");
    expect(email).toHaveAttribute("autoComplete", "email");
    expect(password).toHaveAttribute("type", "password");
    expect(password).toHaveAttribute("minLength", "8");
    expect(confirm).toHaveAttribute("type", "password");
  });

  it("renders the Google sign-up button", () => {
    render(<RegisterForm />);
    expect(
      screen.getByRole("button", { name: /google/i }),
    ).toBeInTheDocument();
  });

  it("does not render an error alert until the action returns one", () => {
    render(<RegisterForm />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows the returned error in an alert", async () => {
    vi.mocked(register).mockResolvedValueOnce({
      error: "An account with this email already exists",
    });
    render(<RegisterForm />);

    submitForm();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /already exists/i,
    );
    // The form stays up so the details can be corrected.
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
  });

  it("replaces the form with the check-your-inbox panel once the verification link is sent", async () => {
    vi.mocked(register).mockResolvedValueOnce({
      verificationSentTo: "aroha@b.co",
    });
    render(<RegisterForm />);

    submitForm();

    expect(await screen.findByText(/check your inbox/i)).toBeInTheDocument();
    expect(screen.getByText("aroha@b.co")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /resend verification email/i }),
    ).toBeInTheDocument();
    // The sign-up form is gone - the account already exists at this point.
    expect(screen.queryByLabelText(/full name/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /create account/i }),
    ).not.toBeInTheDocument();
  });
});

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/auth-actions", () => ({
  register: vi.fn(),
}));

vi.mock("next-auth/react", () => ({
  signIn: vi.fn(),
}));

import { RegisterForm } from "./register-form";

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
});

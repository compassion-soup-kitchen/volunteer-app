import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("@/lib/auth-actions", () => ({
  login: vi.fn(),
  demoLogin: vi.fn(),
  resendVerificationEmail: vi.fn(),
}));

vi.mock("next-auth/react", () => ({
  signIn: vi.fn(),
}));

import { demoLogin, login } from "@/lib/auth-actions";
import { LoginForm } from "./login-form";

/** Submits the sign-in form, letting the mocked action drive the next state. */
function submitForm() {
  const form = screen
    .getByRole("button", { name: /^sign in$/i })
    .closest("form");
  fireEvent.submit(form!);
}

beforeEach(() => {
  vi.mocked(login).mockReset();
  vi.mocked(demoLogin).mockReset();
});

describe("<LoginForm />", () => {
  it("renders the credential fields and submit button", () => {
    render(<LoginForm />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^sign in$/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows only the error alert for an ordinary failed sign-in", async () => {
    vi.mocked(login).mockResolvedValueOnce({
      error: "Invalid email or password",
    });
    render(<LoginForm />);

    submitForm();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /invalid email or password/i,
    );
    expect(
      screen.queryByRole("button", { name: /resend verification email/i }),
    ).not.toBeInTheDocument();
  });

  it("hides the demo accounts by default", () => {
    render(<LoginForm />);

    expect(screen.queryByText(/demo accounts/i)).not.toBeInTheDocument();
  });

  it("signs in as the chosen demo account with one click", async () => {
    vi.mocked(demoLogin).mockResolvedValueOnce(null);
    render(<LoginForm showDemoAccounts />);

    fireEvent.click(screen.getByRole("button", { name: /admin/i }));

    await waitFor(() => expect(vi.mocked(demoLogin)).toHaveBeenCalledTimes(1));
    // Only the role travels to the server - credentials never reach the client.
    const formData = vi.mocked(demoLogin).mock.calls[0][1];
    expect(formData.get("role")).toBe("admin");
    expect([...formData.keys()]).toEqual(["role"]);
    expect(vi.mocked(login)).not.toHaveBeenCalled();
  });

  it("surfaces an error when demo sign-in is refused", async () => {
    vi.mocked(demoLogin).mockResolvedValueOnce({
      error: "Demo sign-in is not available.",
    });
    render(<LoginForm showDemoAccounts />);

    fireEvent.click(screen.getByRole("button", { name: /volunteer/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /demo sign-in is not available/i,
    );
  });

  it("offers a resend button when sign-in failed only because the email is unverified", async () => {
    vi.mocked(login).mockResolvedValueOnce({
      error:
        "Almost there - please verify your email address first. We sent you a link when you signed up.",
      unverifiedEmail: "aroha@b.co",
    });
    render(<LoginForm />);

    submitForm();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /verify your email/i,
    );
    const resend = screen.getByRole("button", {
      name: /resend verification email/i,
    });
    expect(resend).toBeInTheDocument();
    // The resend form targets the address that just failed to sign in.
    expect(resend.closest("form")).toContainHTML('value="aroha@b.co"');
  });
});

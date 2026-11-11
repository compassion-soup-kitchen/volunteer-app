import { describe, expect, it } from "vitest";
import { signInErrorMessage } from "./sign-in-errors";

describe("signInErrorMessage", () => {
  it("shows nothing without an error", () => {
    expect(signInErrorMessage(undefined)).toBeNull();
    expect(signInErrorMessage("")).toBeNull();
  });

  it("stays out of the way of the password form's own errors", () => {
    expect(signInErrorMessage("CredentialsSignin")).toBeNull();
  });

  it("points someone with an existing account back to how they signed up", () => {
    expect(signInErrorMessage("OAuthAccountNotLinked")).toMatch(
      /already an account with that email/
    );
  });

  it("explains how to get past Apple withholding the email", () => {
    expect(signInErrorMessage("AppleNoEmail")).toMatch(/remove Compassion/);
  });

  it("has a plain fallback for anything else", () => {
    expect(signInErrorMessage("OAuthCallbackError")).toMatch(/try again/);
    expect(signInErrorMessage("Configuration")).toMatch(/try again/);
  });

  it("reads the first value of a repeated query param", () => {
    expect(signInErrorMessage(["AppleNoEmail", "x"])).toMatch(/remove Compassion/);
  });
});

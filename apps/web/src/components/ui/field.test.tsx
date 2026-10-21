import { useState } from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import {
  Field,
  FieldControl,
  FieldControlGroup,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "./field";
import { Input } from "./input";

describe("<Field />", () => {
  it("names the control by its label", () => {
    render(
      <Field>
        <FieldLabel>Phone number</FieldLabel>
        <FieldControl>
          <Input />
        </FieldControl>
      </Field>
    );

    expect(screen.getByRole("textbox", { name: "Phone number" })).toBeInTheDocument();
  });

  it("uses the id it's given for the control", () => {
    render(
      <Field id="phone">
        <FieldLabel>Phone number</FieldLabel>
        <FieldControl>
          <Input />
        </FieldControl>
      </Field>
    );

    expect(screen.getByLabelText("Phone number")).toHaveAttribute("id", "phone");
  });

  it("leaves a valid control unmarked and renders no error", () => {
    render(
      <Field>
        <FieldLabel>Phone number</FieldLabel>
        <FieldControl>
          <Input />
        </FieldControl>
        <FieldError />
      </Field>
    );

    const input = screen.getByLabelText("Phone number");
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).not.toHaveAttribute("aria-describedby");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("marks the control invalid and describes it by an announced error", () => {
    render(
      <Field error="Phone number is required">
        <FieldLabel>Phone number</FieldLabel>
        <FieldControl>
          <Input />
        </FieldControl>
        <FieldError />
      </Field>
    );

    const input = screen.getByLabelText("Phone number");
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Phone number is required");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Phone number is required");
  });

  it("describes the control by its hint, after any error", () => {
    render(
      <Field error="Too many">
        <FieldLabel>Capacity</FieldLabel>
        <FieldControl>
          <Input />
        </FieldControl>
        <FieldError />
        <FieldDescription>Most volunteers for this shift</FieldDescription>
      </Field>
    );

    expect(screen.getByLabelText("Capacity")).toHaveAccessibleDescription(
      "Too many Most volunteers for this shift"
    );
  });

  it("drops a hint from the description once it's gone", () => {
    function Toggle() {
      const [hint, setHint] = useState(true);
      return (
        <Field>
          <FieldLabel>Held until</FieldLabel>
          <FieldControl>
            <Input />
          </FieldControl>
          {hint && <FieldDescription>Opens to everyone after</FieldDescription>}
          <button type="button" onClick={() => setHint(false)}>
            Hide hint
          </button>
        </Field>
      );
    }
    render(<Toggle />);

    const input = screen.getByLabelText("Held until");
    expect(input).toHaveAccessibleDescription("Opens to everyone after");

    fireEvent.click(screen.getByRole("button", { name: "Hide hint" }));
    expect(input).not.toHaveAttribute("aria-describedby");
  });

  it("announces a required field without reading the star aloud", () => {
    render(
      <Field required>
        <FieldLabel>Address</FieldLabel>
        <FieldControl>
          <Input />
        </FieldControl>
      </Field>
    );

    const input = screen.getByRole("textbox", { name: "Address" });
    expect(input).toHaveAttribute("aria-required", "true");
    expect(screen.getByText("*")).toHaveAttribute("aria-hidden", "true");
  });

  it("labels a group of choices and ties its error to it", () => {
    render(
      <Field error="Pick at least one day">
        <FieldLabel>On these days</FieldLabel>
        <FieldControlGroup>
          <button type="button">Mon</button>
        </FieldControlGroup>
        <FieldError />
      </Field>
    );

    const group = screen.getByRole("group", { name: "On these days" });
    expect(group).toHaveAccessibleDescription("Pick at least one day");
    expect(group).not.toHaveAttribute("aria-invalid");
    expect(group).not.toHaveAttribute("aria-required");
  });

  it("refuses to render its parts outside a Field", () => {
    // React logs the thrown error; keep the test output clean.
    const error = console.error;
    console.error = () => {};
    try {
      expect(() => render(<FieldError />)).toThrow(/inside a <Field>/);
    } finally {
      console.error = error;
    }
  });
});

import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

const toastError = vi.fn();
vi.mock("sonner", () => ({ toast: { error: (...args: unknown[]) => toastError(...args) } }));

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./alert-dialog";

/** A promise the test settles by hand, standing in for a server action. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function ConfirmDelete({
  onConfirm,
  onClick,
}: {
  onConfirm?: () => Promise<boolean> | boolean;
  onClick?: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger>Delete shift</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this shift?</AlertDialogTitle>
          <AlertDialogDescription>Everyone on it is told.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it</AlertDialogCancel>
          <AlertDialogAction onConfirm={onConfirm} onClick={onClick}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function open() {
  fireEvent.click(screen.getByRole("button", { name: "Delete shift" }));
  return screen.getByRole("alertdialog");
}

const action = () => screen.getByRole("button", { name: "Delete" });
const cancel = () => screen.getByRole("button", { name: "Keep it" });

describe("<AlertDialogAction onConfirm />", () => {
  it("stays open and pending until the confirmation settles, then closes", async () => {
    const request = deferred<boolean>();
    render(<ConfirmDelete onConfirm={() => request.promise} />);
    open();

    fireEvent.click(action());

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(action()).toBeDisabled();
    expect(action()).toHaveAttribute("aria-busy", "true");
    expect(cancel()).toBeDisabled();

    await act(async () => request.resolve(true));

    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    );
  });

  it("keeps the dialog open to try again when the confirmation fails", async () => {
    const request = deferred<boolean>();
    render(<ConfirmDelete onConfirm={() => request.promise} />);
    open();

    fireEvent.click(action());
    await act(async () => request.resolve(false));

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(action()).toBeEnabled();
    expect(action()).not.toHaveAttribute("aria-busy");
    expect(cancel()).toBeEnabled();
  });

  it("keeps the dialog open and says so when the confirmation throws", async () => {
    const request = deferred<boolean>();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<ConfirmDelete onConfirm={() => request.promise} />);
    open();

    fireEvent.click(action());
    await act(async () => request.reject(new Error("network down")));

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(action()).toBeEnabled();
    expect(toastError).toHaveBeenCalledWith("Something went wrong. Please try again.");
    consoleError.mockRestore();
  });

  it("ignores Escape while the confirmation is in flight", async () => {
    const request = deferred<boolean>();
    render(<ConfirmDelete onConfirm={() => request.promise} />);
    const dialog = open();

    fireEvent.click(action());
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();

    await act(async () => request.resolve(true));
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    );
  });

  it("closes a controlled dialog through onOpenChange", async () => {
    function Controlled() {
      const [target, setTarget] = useState<string | null>("Breakfast");
      return (
        <>
          <p>Target: {target ?? "none"}</p>
          <AlertDialog
            open={target !== null}
            onOpenChange={(next) => !next && setTarget(null)}
          >
            <AlertDialogContent>
              <AlertDialogTitle>Delete {target}?</AlertDialogTitle>
              <AlertDialogDescription>It can&apos;t be undone.</AlertDialogDescription>
              <AlertDialogCancel>Keep it</AlertDialogCancel>
              <AlertDialogAction onConfirm={async () => true}>Delete</AlertDialogAction>
            </AlertDialogContent>
          </AlertDialog>
        </>
      );
    }
    render(<Controlled />);

    fireEvent.click(action());

    await waitFor(() => expect(screen.getByText("Target: none")).toBeInTheDocument());
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("closes at once for a plain onClick action", () => {
    const onClick = vi.fn();
    render(<ConfirmDelete onClick={onClick} />);
    open();

    fireEvent.click(action());

    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});

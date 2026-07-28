import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { FileDropzone } from "./file-dropzone";
import { MAX_UPLOAD_BYTES } from "@/lib/uploads";

function makeFile(name: string, type: string, size: number): File {
  const file = new File(["x"], name, { type });
  // `size` is read-only, and building a real 11 MB buffer just to exercise the
  // ceiling would be wasteful.
  Object.defineProperty(file, "size", { value: size });
  return file;
}

const pdf = (name = "policy.pdf", size = 1024) =>
  makeFile(name, "application/pdf", size);

/** The file input behind the zone, addressed the way a caller labels it. */
function input(): HTMLInputElement {
  return document.getElementById("attachments") as HTMLInputElement;
}

function choose(files: File[]) {
  fireEvent.change(input(), { target: { files } });
}

describe("<FileDropzone />", () => {
  it("associates the input with a caller's visible label", () => {
    render(
      <>
        <label htmlFor="attachments">Attachments</label>
        <FileDropzone id="attachments" onFilesAccepted={vi.fn()} />
      </>
    );

    expect(screen.getByLabelText(/attachments/i)).toBe(input());
    expect(input().type).toBe("file");
  });

  it("hands accepted files to the caller", () => {
    const onFilesAccepted = vi.fn();
    render(<FileDropzone id="attachments" onFilesAccepted={onFilesAccepted} />);

    choose([pdf()]);

    expect(onFilesAccepted).toHaveBeenCalledTimes(1);
    expect(onFilesAccepted.mock.calls[0][0].map((f: File) => f.name)).toEqual([
      "policy.pdf",
    ]);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("refuses an oversized file inline rather than passing it on", () => {
    const onFilesAccepted = vi.fn();
    render(<FileDropzone id="attachments" onFilesAccepted={onFilesAccepted} />);

    choose([pdf("huge.pdf", MAX_UPLOAD_BYTES + 1)]);

    expect(onFilesAccepted).not.toHaveBeenCalled();
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("huge.pdf");
    expect(alert).toHaveTextContent(/the limit is/i);
  });

  it("refuses an unsupported type", () => {
    const onFilesAccepted = vi.fn();
    render(<FileDropzone id="attachments" onFilesAccepted={onFilesAccepted} />);

    choose([makeFile("roster.csv", "text/csv", 512)]);

    expect(onFilesAccepted).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/isn't supported/i);
  });

  it("passes on the good files from a mixed batch", () => {
    const onFilesAccepted = vi.fn();
    render(
      <FileDropzone id="attachments" multiple onFilesAccepted={onFilesAccepted} />
    );

    choose([pdf("good.pdf"), pdf("huge.pdf", MAX_UPLOAD_BYTES + 1)]);

    expect(onFilesAccepted.mock.calls[0][0].map((f: File) => f.name)).toEqual([
      "good.pdf",
    ]);
    expect(screen.getByRole("alert")).toHaveTextContent("huge.pdf");
  });

  it("takes only what fits and names what it dropped", () => {
    const onFilesAccepted = vi.fn();
    render(
      <FileDropzone
        id="attachments"
        multiple
        maxFiles={1}
        maxFilesMessage="A pānui can carry 3 files at most."
        onFilesAccepted={onFilesAccepted}
      />
    );

    choose([pdf("one.pdf"), pdf("two.pdf")]);

    expect(onFilesAccepted.mock.calls[0][0].map((f: File) => f.name)).toEqual([
      "one.pdf",
    ]);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "A pānui can carry 3 files at most."
    );
  });

  it("clears an earlier refusal once a good file arrives", () => {
    render(<FileDropzone id="attachments" onFilesAccepted={vi.fn()} />);

    choose([pdf("huge.pdf", MAX_UPLOAD_BYTES + 1)]);
    expect(screen.getByRole("alert")).toBeInTheDocument();

    choose([pdf()]);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("takes files dropped onto the zone", () => {
    const onFilesAccepted = vi.fn();
    render(<FileDropzone id="attachments" onFilesAccepted={onFilesAccepted} />);

    fireEvent.drop(screen.getByText(/drop a file here/i).closest("label")!, {
      dataTransfer: { files: [pdf()] },
    });

    expect(onFilesAccepted).toHaveBeenCalledTimes(1);
  });

  it("ignores a drop while disabled", () => {
    const onFilesAccepted = vi.fn();
    render(
      <FileDropzone
        id="attachments"
        disabled
        onFilesAccepted={onFilesAccepted}
      />
    );

    fireEvent.drop(screen.getByText(/drop a file here/i).closest("label")!, {
      dataTransfer: { files: [pdf()] },
    });

    expect(onFilesAccepted).not.toHaveBeenCalled();
  });
});

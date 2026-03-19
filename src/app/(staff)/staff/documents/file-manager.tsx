"use client";

import { useState, useTransition, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "@/components/ui/alert-dialog";
import {
  RiUploadLine,
  RiDeleteBinLine,
  RiDownloadLine,
  RiLoader4Line,
  RiFileLine,
  RiFileTextLine,
} from "@remixicon/react";
import {
  uploadDocument,
  deleteDocument,
  getDocumentDownloadUrl,
  type UploadedDocument,
} from "@/lib/document-actions";

const TYPE_LABELS: Record<string, string> = {
  POLICY: "Policy",
  TRAINING_MATERIAL: "Training Material",
  ID: "ID Document",
  MOJ_FORM: "MOJ Form",
  SIGNED_AGREEMENT: "Signed Agreement",
};

const TYPE_COLORS: Record<string, string> = {
  POLICY: "text-blue-600 border-blue-200",
  TRAINING_MATERIAL: "text-purple-600 border-purple-200",
  ID: "text-gray-600 border-gray-200",
  MOJ_FORM: "text-green-600 border-green-200",
  SIGNED_AGREEMENT: "text-amber-600 border-amber-200",
};

export function FileManager({ documents }: { documents: UploadedDocument[] }) {
  const [uploading, startUpload] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [downloading, setDownloading] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [docType, setDocType] = useState("POLICY");
  const fileRef = useRef<HTMLInputElement>(null);

  function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("type", docType);

    startUpload(async () => {
      await uploadDocument(formData);
      if (fileRef.current) fileRef.current.value = "";
    });
  }

  function handleDelete(id: string) {
    setDeletingId(null);
    startDelete(async () => {
      await deleteDocument(id);
    });
  }

  async function handleDownload(id: string, fileName: string) {
    setDownloading(id);
    try {
      const url = await getDocumentDownloadUrl(id);
      if (url) {
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.target = "_blank";
        a.click();
      }
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Upload Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload Document</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="doc-type">Document Type</Label>
                <Select value={docType} onValueChange={setDocType}>
                  <SelectTrigger id="doc-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="POLICY">Policy</SelectItem>
                    <SelectItem value="TRAINING_MATERIAL">
                      Training Material
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="file">File</Label>
                <input
                  ref={fileRef}
                  id="file"
                  name="file"
                  type="file"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  required
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium"
                />
              </div>
            </div>
            <Button type="submit" disabled={uploading} size="sm">
              {uploading ? (
                <RiLoader4Line className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <RiUploadLine className="mr-1.5 size-3.5" />
              )}
              Upload
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Document List */}
      {documents.length > 0 ? (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between rounded-md border border-border p-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <RiFileLine className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{doc.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(doc.uploadedAt).toLocaleDateString("en-NZ", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                    {doc.uploadedByName && ` · ${doc.uploadedByName}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge
                  variant="outline"
                  className={`text-xs ${TYPE_COLORS[doc.type] || ""}`}
                >
                  {TYPE_LABELS[doc.type] || doc.type}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleDownload(doc.id, doc.fileName)}
                  disabled={downloading === doc.id}
                  aria-label="Download"
                >
                  {downloading === doc.id ? (
                    <RiLoader4Line className="size-3.5 animate-spin" />
                  ) : (
                    <RiDownloadLine className="size-3.5" />
                  )}
                </Button>

                <AlertDialog
                  open={deletingId === doc.id}
                  onOpenChange={(open) => !open && setDeletingId(null)}
                >
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setDeletingId(doc.id)}
                      aria-label="Delete"
                    >
                      <RiDeleteBinLine className="size-3.5 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Document</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete &ldquo;{doc.fileName}
                        &rdquo;? This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(doc.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <RiFileTextLine className="mx-auto size-8 text-muted-foreground/40" />
            <p className="mt-2 text-sm text-muted-foreground">
              No files uploaded yet
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

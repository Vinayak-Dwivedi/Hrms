"use client";

import { useEffect, useState } from "react";
import {
  fetchOnboardingDocument,
  type OnboardingDocument,
} from "../api/hr-onboarding.client";
import EmployeeModalShell from "./EmployeeModalShell";

interface Props {
  open: boolean;
  document: OnboardingDocument | null;
  onClose: () => void;
}

export default function OnboardingDocumentPreviewModal({
  open,
  document,
  onClose,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !document) {
      setLoading(false);
      setError(null);
      setMimeType(null);
      setFilename(null);
      setObjectUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetchOnboardingDocument(document.id)
      .then((result) => {
        if (cancelled) return;
        const url = URL.createObjectURL(result.blob);
        setObjectUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
        setMimeType(result.mimeType);
        setFilename(result.filename);
      })
      .catch((e) => {
        if (!cancelled) setError((e as Error).message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, document]);

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  const title = document
    ? `${document.documentType} — ${document.originalFilename}`
    : "Document preview";

  const isImage = mimeType?.startsWith("image/");
  const isPdf = mimeType === "application/pdf";

  return (
    <EmployeeModalShell
      open={open}
      title={title}
      onClose={onClose}
      maxWidthClass="max-w-4xl"
    >
      <div className="p-6 min-h-[200px]">
        {loading && (
          <p className="text-sm text-gray-500 m-0 text-center py-12">
            Loading document…
          </p>
        )}
        {error && (
          <p className="text-sm text-red-600 m-0 text-center py-12">{error}</p>
        )}
        {!loading && !error && objectUrl && (
          <>
            {isImage && (
              <img
                src={objectUrl}
                alt={filename ?? document?.documentType ?? "Document"}
                className="max-w-full max-h-[70vh] mx-auto rounded border border-gray-100"
              />
            )}
            {isPdf && (
              <iframe
                src={objectUrl}
                title={filename ?? "Document preview"}
                className="w-full h-[70vh] rounded border border-gray-100"
              />
            )}
            {!isImage && !isPdf && (
              <div className="text-center py-12 space-y-3">
                <p className="text-sm text-gray-600 m-0">
                  Preview is not available for this file type.
                </p>
                <a
                  href={objectUrl}
                  download={filename ?? "document"}
                  className="inline-flex px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
                >
                  Download {filename}
                </a>
              </div>
            )}
          </>
        )}
      </div>
    </EmployeeModalShell>
  );
}

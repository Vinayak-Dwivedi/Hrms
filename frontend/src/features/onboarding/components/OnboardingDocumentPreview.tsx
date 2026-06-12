"use client";

import { useEffect, useState } from "react";
import { fetchOnboardingDocumentFile } from "../api/onboarding.client";
import { onboardingErrorAlertClass } from "../constants/onboarding-theme";

type FetchedDocument = {
  blob: Blob;
  mimeType: string;
  filename: string;
};

interface Props {
  documentId: string;
  documentType: string;
  alt?: string;
  fetchDocument?: (documentId: string) => Promise<FetchedDocument>;
}

export default function OnboardingDocumentPreview({
  documentId,
  documentType,
  alt,
  fetchDocument,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    void (fetchDocument ?? fetchOnboardingDocumentFile)(documentId)
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
  }, [documentId, fetchDocument]);

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  if (loading) {
    return (
      <p className="text-sm text-gray-500 m-0 py-6 text-center">
        Loading preview…
      </p>
    );
  }

  if (error) {
    return (
      <p className={`m-0 text-sm ${onboardingErrorAlertClass}`} role="alert">
        {error}
      </p>
    );
  }

  if (!objectUrl) return null;

  const isImage = mimeType?.startsWith("image/");
  const isPdf = mimeType === "application/pdf";
  const label = alt ?? documentType;

  if (isImage) {
    return (
      <img
        src={objectUrl}
        alt={label}
        className="max-w-full max-h-80 rounded-lg border border-gray-200 bg-gray-50 object-contain"
      />
    );
  }

  if (isPdf) {
    return (
      <iframe
        src={objectUrl}
        title={filename ?? label}
        className="w-full h-72 rounded-lg border border-gray-200 bg-gray-50"
      />
    );
  }

  return (
    <div className="text-center py-4 space-y-2">
      <p className="text-sm text-gray-600 m-0">
        Preview not available for this file type.
      </p>
      <a
        href={objectUrl}
        download={filename ?? "document"}
        className="text-sm font-medium text-[#e91e63] hover:underline"
      >
        Download {filename}
      </a>
    </div>
  );
}

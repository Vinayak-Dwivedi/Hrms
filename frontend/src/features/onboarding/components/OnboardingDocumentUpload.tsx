"use client";

import { Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import {
  deleteOnboardingDocument,
  uploadOnboardingDocument,
} from "../api/onboarding.client";
import {
  onboardingBtnDestructiveClass,
  onboardingBtnOutlineClass,
  onboardingDocCardClass,
  onboardingErrorAlertClass,
  onboardingStatusPendingClass,
  onboardingStatusRejectedClass,
  onboardingStatusUploadedClass,
  onboardingStatusVerifiedClass,
} from "../constants/onboarding-theme";
import {
  ONBOARDING_DOCUMENT_SECTIONS,
  type OnboardingDocumentType,
} from "../constants/documents";

type DocStatus = "Pending" | "Uploaded" | "Verified" | "Rejected";

interface DocRow {
  id?: string;
  documentType: string;
  originalFilename?: string;
  status: DocStatus;
}

interface Props {
  documents: DocRow[];
  onUploaded: () => void;
  onUpload?: (documentType: OnboardingDocumentType, file: File) => Promise<void>;
  onDelete?: (documentId: string, documentType: string) => Promise<void>;
}

const STATUS_CLASS: Record<DocStatus, string> = {
  Pending: onboardingStatusPendingClass,
  Uploaded: onboardingStatusUploadedClass,
  Verified: onboardingStatusVerifiedClass,
  Rejected: onboardingStatusRejectedClass,
};

const FILE_ACCEPT =
  ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";
const MAX_UPLOAD_MB = 3;
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

export default function OnboardingDocumentUpload({
  documents,
  onUploaded,
  onUpload,
  onDelete,
}: Props) {
  const [uploading, setUploading] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  function findDocument(docType: string) {
    return documents.find((d) => d.documentType === docType);
  }

  async function handleFile(
    documentType: OnboardingDocumentType,
    file: File | undefined,
  ) {
    if (!file) return;
    setError(null);
    if (file.size > MAX_UPLOAD_BYTES) {
      setError(`File size must be ${MAX_UPLOAD_MB} MB or less.`);
      const input = inputRefs.current[documentType];
      if (input) input.value = "";
      return;
    }
    setUploading(documentType);
    try {
      if (onUpload) {
        await onUpload(documentType, file);
      } else {
        await uploadOnboardingDocument(documentType, file);
      }
      onUploaded();
    } catch (e) {
      const err = e as { message?: string };
      setError(err.message ?? "Upload failed.");
    } finally {
      setUploading(null);
      const input = inputRefs.current[documentType];
      if (input) input.value = "";
    }
  }

  async function handleDelete(documentId: string, documentType: string) {
    setError(null);
    setDeleting(documentId);
    try {
      if (onDelete) {
        await onDelete(documentId, documentType);
      } else {
        await deleteOnboardingDocument(documentId);
      }
      onUploaded();
    } catch (e) {
      const err = e as { message?: string };
      setError(err.message ?? "Could not remove document.");
    } finally {
      setDeleting(null);
      const input = inputRefs.current[documentType];
      if (input) input.value = "";
    }
  }

  return (
    <div className="space-y-8">
      <p className="text-sm text-gray-600 m-0">
        Upload PDF or image files (max 3 MB each). Images are compressed
        automatically before upload.
      </p>

      {ONBOARDING_DOCUMENT_SECTIONS.map((section) => (
        <section key={section.id} className="space-y-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900 m-0">
              {section.title}
              {section.required ? (
                <span className="text-red-500 font-normal"> *</span>
              ) : null}
            </h2>
            {section.description ? (
              <p className="text-sm text-gray-500 mt-1 mb-0">
                {section.description}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {section.types.map((docType) => {
              const row = findDocument(docType);
              const status: DocStatus = row?.status ?? "Pending";
              const uploaded = !!row?.id;
              const busy = uploading === docType || deleting === row?.id;

              return (
                <div key={docType} className={onboardingDocCardClass}>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 m-0">
                      {docType}
                    </p>
                    <span
                      className={`${STATUS_CLASS[uploaded ? "Uploaded" : status]} mt-1`}
                    >
                      {uploaded ? "Uploaded" : status}
                    </span>
                    {row?.originalFilename ? (
                      <p className="text-xs text-gray-500 mt-1 m-0 truncate">
                        {row.originalFilename}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      ref={(el) => {
                        inputRefs.current[docType] = el;
                      }}
                      type="file"
                      accept={FILE_ACCEPT}
                      className="hidden"
                      onChange={(e) =>
                        void handleFile(docType, e.target.files?.[0])
                      }
                    />
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => inputRefs.current[docType]?.click()}
                      className={onboardingBtnOutlineClass}
                    >
                      <Upload size={16} />
                      {uploading === docType
                        ? "Uploading…"
                        : uploaded
                          ? "Replace"
                          : "Upload"}
                    </button>
                    {uploaded && row?.id ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleDelete(row.id!, docType)}
                        className={onboardingBtnDestructiveClass}
                        title="Remove document"
                      >
                        <Trash2 size={16} />
                        {deleting === row.id ? "Removing…" : "Remove"}
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {error && (
        <p className={`m-0 ${onboardingErrorAlertClass}`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

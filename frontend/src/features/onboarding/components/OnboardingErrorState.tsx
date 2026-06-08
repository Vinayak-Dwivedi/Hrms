"use client";

import { AlertCircle } from "lucide-react";

interface Props {
  title: string;
  message: string;
}

export default function OnboardingErrorState({ title, message }: Props) {
  return (
    <div
      className="rounded-xl p-8 text-center max-w-md mx-auto"
      style={{ border: "1px solid #e5e7eb", background: "#fff" }}
    >
      <div
        className="inline-flex items-center justify-center rounded-full mb-4"
        style={{ width: 48, height: 48, background: "#fef2f2" }}
      >
        <AlertCircle size={24} style={{ color: "#dc2626" }} />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 m-0 mb-2">{title}</h2>
      <p className="text-sm text-gray-600 m-0">{message}</p>
    </div>
  );
}

export function OnboardingInlineError({ message }: { message: string }) {
  return (
    <div
      className="flex items-start gap-2 rounded-lg mb-4"
      style={{
        background: "#fef2f2",
        border: "1px solid #fecaca",
        color: "#991b1b",
        padding: "8px 12px",
        fontSize: 12,
      }}
      role="alert"
    >
      <AlertCircle size={14} className="shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  );
}

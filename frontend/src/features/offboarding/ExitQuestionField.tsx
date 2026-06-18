"use client";

import { Star } from "lucide-react";
import type { ExitQuestion } from "@/features/offboarding/api/offboarding.client";
import { inputClass } from "@/features/offboarding/offboarding-ui";

// Renders a single exit-interview question. Editable when onChange is given,
// otherwise a read-only summary of the answer (used by the HR view).
export default function ExitQuestionField({
  question,
  value,
  onChange,
}: {
  question: ExitQuestion;
  value: unknown;
  onChange?: (v: unknown) => void;
}) {
  const readOnly = !onChange;

  if (readOnly) {
    return (
      <div>
        <p className="text-[13px] font-medium text-gray-800 mb-1">
          {question.label}
          {question.required && <span className="text-red-500"> *</span>}
        </p>
        <p className="text-[13px] text-gray-600">{renderReadValue(question, value)}</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-[13px] font-medium text-gray-800 mb-2">
        {question.label}
        {question.required && <span className="text-red-500"> *</span>}
      </p>
      {renderInput(question, value, onChange)}
    </div>
  );
}

function renderReadValue(q: ExitQuestion, value: unknown): string {
  if (value == null || value === "") return "—";
  switch (q.type) {
    case "yes_no":
      return value === true ? "Yes" : value === false ? "No" : String(value);
    case "star":
      return `${value} / ${q.scaleMax ?? 5} ★`;
    case "rating_scale":
      return `${value} / ${q.scaleMax ?? 5}`;
    case "nps":
      return `${value} / 10`;
    case "multiple_choice":
      return Array.isArray(value) ? value.join(", ") : String(value);
    default:
      return String(value);
  }
}

const scaleBtn = (active: boolean) =>
  [
    "min-w-[34px] h-[34px] px-2 rounded-lg text-sm font-medium border transition-colors",
    active
      ? "bg-[lab(36.9089%_35.0961_-85.6872)] border-[lab(36.9089%_35.0961_-85.6872)] text-white"
      : "bg-white border-gray-300 text-gray-600 hover:border-[lab(36.9089%_35.0961_-85.6872)]/50",
  ].join(" ");

function renderInput(
  q: ExitQuestion,
  value: unknown,
  onChange: (v: unknown) => void,
) {
  switch (q.type) {
    case "yes_no":
      return (
        <div className="flex gap-2">
          {[
            { label: "Yes", v: true },
            { label: "No", v: false },
          ].map((o) => (
            <button
              key={o.label}
              type="button"
              onClick={() => onChange(o.v)}
              className={scaleBtn(value === o.v)}
            >
              {o.label}
            </button>
          ))}
        </div>
      );

    case "nps":
      return (
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 11 }, (_, i) => i).map((n) => (
            <button key={n} type="button" onClick={() => onChange(n)} className={scaleBtn(value === n)}>
              {n}
            </button>
          ))}
        </div>
      );

    case "rating_scale": {
      const max = q.scaleMax ?? 5;
      return (
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
            <button key={n} type="button" onClick={() => onChange(n)} className={scaleBtn(value === n)}>
              {n}
            </button>
          ))}
        </div>
      );
    }

    case "star": {
      const max = q.scaleMax ?? 5;
      const current = typeof value === "number" ? value : 0;
      return (
        <div className="flex gap-1">
          {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className="p-0.5"
              title={`${n}`}
            >
              <Star
                size={26}
                className={n <= current ? "fill-[lab(36.9089%_35.0961_-85.6872)] text-[lab(36.9089%_35.0961_-85.6872)]" : "text-gray-300"}
              />
            </button>
          ))}
        </div>
      );
    }

    case "single_choice":
      return (
        <div className="space-y-1.5">
          {(q.options ?? []).map((opt) => (
            <label key={opt} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                className="w-4 h-4 accent-[lab(36.9089%_35.0961_-85.6872)]"
                checked={value === opt}
                onChange={() => onChange(opt)}
              />
              <span className="text-sm text-gray-700">{opt}</span>
            </label>
          ))}
        </div>
      );

    case "multiple_choice": {
      const arr = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="space-y-1.5">
          {(q.options ?? []).map((opt) => {
            const checked = arr.includes(opt);
            return (
              <label key={opt} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-[lab(36.9089%_35.0961_-85.6872)]"
                  checked={checked}
                  onChange={() =>
                    onChange(checked ? arr.filter((x) => x !== opt) : [...arr, opt])
                  }
                />
                <span className="text-sm text-gray-700">{opt}</span>
              </label>
            );
          })}
        </div>
      );
    }

    case "date":
      return (
        <input
          className={inputClass}
          type="date"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "comments":
    default:
      return (
        <textarea
          className={`${inputClass} h-auto min-h-[72px] py-2 resize-y`}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Your answer…"
        />
      );
  }
}

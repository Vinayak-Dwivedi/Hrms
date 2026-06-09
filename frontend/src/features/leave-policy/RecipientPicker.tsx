"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";

// Recipient picker — opens as a popover next to the field that triggers it.
// Left sidebar lists categories (System options, Users, Roles, Departments,
// Locations, Form fields); right side lists the items in the chosen category
// with a search box and per-row checkboxes. Mirrors the Zoho "Add recipients"
// flow from the screenshot.
//
// Data sources right now:
//   - "System options" + "Form fields" are hard-coded (they describe runtime
//     concepts: the person performing the action, current approver, etc.).
//   - "Users / Roles / Departments / Locations" are stubs — these need to be
//     wired to /api/hrms/employees, /api/admin/roles, /api/hrms/departments,
//     /api/hrms/locations in a follow-up. The shape is already correct so the
//     swap is a one-line change.

export type Recipient = {
  category: Category;
  id: string;     // unique key — e.g. "system:dept_head", "user:42", "field:employee_id"
  label: string;  // shown in the chip
};

type Category =
  | "system"
  | "users"
  | "roles"
  | "departments"
  | "locations"
  | "fields";

const CATEGORIES: { key: Category; label: string }[] = [
  { key: "system", label: "System options" },
  { key: "users", label: "Users" },
  { key: "roles", label: "Roles" },
  { key: "departments", label: "Departments" },
  { key: "locations", label: "Locations" },
  { key: "fields", label: "Form fields" },
];

// Hard-coded entries for the runtime-concept categories.
const SYSTEM_OPTIONS = [
  { id: "system:dept_head", label: "Department head of the logged in user" },
  { id: "system:team_email", label: "Team email address of the person performing the action" },
  { id: "system:reporting_manager", label: "Reporting manager of the employee logged in" },
  { id: "system:current_approver", label: "Current Approver" },
  { id: "system:performer", label: "Person performing this action" },
  { id: "system:hr_admin", label: "HR Administrator" },
];

const FORM_FIELDS = [
  { id: "field:added_by", label: "Added By" },
  { id: "field:added_time", label: "Added Time" },
  { id: "field:date_of_request", label: "Date of request" },
  { id: "field:employee_id", label: "Employee ID" },
  { id: "field:from", label: "From" },
  { id: "field:to", label: "To" },
  { id: "field:leave_type", label: "Leave Type" },
  { id: "field:reason", label: "Reason" },
];

// Stub data — swap with API calls when the endpoints are ready.
const STUB_USERS = [
  { id: "user:1", label: "Rahul Mehta (ILD-2847)" },
  { id: "user:2", label: "Priya Sharma (ILD-1042)" },
  { id: "user:3", label: "Aarav Singh (ILD-3001)" },
  { id: "user:4", label: "Kavya Bhatt (ILD-3002)" },
  { id: "user:5", label: "Rohan Thapa (ILD-3003)" },
  { id: "user:6", label: "Ishaan Pant (ILD-3004)" },
  { id: "user:7", label: "Vikram Negi (ILD-3005)" },
  { id: "user:8", label: "Neha Kapoor (ILD-4001)" },
  { id: "user:16", label: "HR Admin (ILD-0001)" },
];

const STUB_ROLES = [
  { id: "role:employee", label: "Employee" },
  { id: "role:manager", label: "Manager" },
  { id: "role:admin", label: "Administrator" },
];

const STUB_DEPARTMENTS = [
  { id: "dept:1", label: "Operations" },
  { id: "dept:2", label: "Engineering" },
  { id: "dept:3", label: "Sales" },
  { id: "dept:4", label: "Human Resources" },
];

const STUB_LOCATIONS = [
  { id: "loc:1", label: "iLeads Dehradun HQ" },
  { id: "loc:2", label: "Bangalore Branch" },
  { id: "loc:3", label: "Delhi Branch" },
];

function itemsFor(c: Category): { id: string; label: string }[] {
  switch (c) {
    case "system": return SYSTEM_OPTIONS;
    case "users": return STUB_USERS;
    case "roles": return STUB_ROLES;
    case "departments": return STUB_DEPARTMENTS;
    case "locations": return STUB_LOCATIONS;
    case "fields": return FORM_FIELDS;
  }
}

export default function RecipientPicker({
  open,
  anchor,
  selectedIds,
  onClose,
  onCommit,
}: {
  open: boolean;
  anchor?: "right" | "below";
  selectedIds: Set<string>;
  onClose: () => void;
  onCommit: (next: Recipient[]) => void;
}) {
  const [category, setCategory] = useState<Category>("system");
  const [search, setSearch] = useState("");
  const [draftIds, setDraftIds] = useState<Set<string>>(new Set(selectedIds));
  const [notifyAll, setNotifyAll] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Keep the draft in sync with the parent each time we re-open.
  useEffect(() => {
    if (open) {
      setDraftIds(new Set(selectedIds));
      setSearch("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Click-outside closes (and discards staged changes).
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!popoverRef.current?.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    // setTimeout so the click that opened the popover doesn't immediately close it.
    const id = setTimeout(() => {
      document.addEventListener("mousedown", onDocClick);
      document.addEventListener("keydown", onKey);
    }, 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const visibleItems = useMemo(() => {
    const base = itemsFor(category);
    const q = search.trim().toLowerCase();
    if (!q) return base;
    return base.filter((it) => it.label.toLowerCase().includes(q));
  }, [category, search]);

  function toggle(id: string) {
    setDraftIds((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function commit() {
    // Build Recipient[] for the parent — we look up each id in every category
    // so we know which label belongs to it.
    const lookup = new Map<string, Recipient>();
    for (const cat of CATEGORIES) {
      for (const item of itemsFor(cat.key)) {
        lookup.set(item.id, {
          category: cat.key,
          id: item.id,
          label: item.label,
        });
      }
    }
    const out: Recipient[] = [];
    for (const id of draftIds) {
      const r = lookup.get(id);
      if (r) out.push(r);
    }
    onCommit(out);
    onClose();
  }

  if (!open) return null;

  return (
    <div
      ref={popoverRef}
      className={[
        "absolute z-30 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden",
        "w-[520px] h-[340px] flex flex-col",
        anchor === "right" ? "top-0 left-full ml-2" : "top-full mt-2 left-0",
        "animate-in fade-in slide-in-from-top-1 duration-150",
      ].join(" ")}
    >
      {/* Body */}
      <div className="flex-1 flex min-h-0">
        {/* Category sidebar */}
        <nav className="w-[155px] border-r border-gray-100 overflow-y-auto py-2">
          {CATEGORIES.map((c) => {
            const active = c.key === category;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => setCategory(c.key)}
                className={[
                  "w-full text-left px-3 py-2 text-[12.5px] font-medium transition-colors",
                  active
                    ? "bg-[#FF014F] text-white"
                    : "text-gray-700 hover:bg-gray-50",
                ].join(" ")}
              >
                {c.label}
              </button>
            );
          })}
        </nav>

        {/* Items panel */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="px-3 py-2 border-b border-gray-100">
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-100 focus-within:bg-white focus-within:border-gray-300">
              <Search size={13} className="text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search"
                className="flex-1 bg-transparent text-[12.5px] text-gray-800 outline-none"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {visibleItems.length === 0 ? (
              <p className="text-[12px] text-gray-400 text-center py-8">
                Nothing matches "{search}".
              </p>
            ) : (
              visibleItems.map((it) => {
                const checked = draftIds.has(it.id);
                return (
                  <label
                    key={it.id}
                    className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(it.id)}
                      className="w-3.5 h-3.5 rounded border-gray-300 text-[#FF014F] focus:ring-[#fda4af]"
                    />
                    <span className="text-[12.5px] text-gray-700 leading-snug">
                      {it.label}
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 px-3 py-2 flex items-center justify-between bg-gray-50/60">
        <label className="flex items-center gap-2 text-[12px] text-gray-700">
          <input
            type="checkbox"
            checked={notifyAll}
            onChange={(e) => setNotifyAll(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-gray-300 text-[#FF014F] focus:ring-[#fda4af]"
          />
          Notify All
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 rounded-md text-[12px] font-medium text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={commit}
            className="px-3 py-1 rounded-md text-[12px] font-bold text-white bg-gradient-to-r from-[#FF014F] to-[#eb0249] hover:shadow-md transition-shadow"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── tiny helper for showing existing chips next to the trigger button ────

export function RecipientChips({
  items,
  onRemove,
}: {
  items: Recipient[];
  onRemove: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((r) => (
        <span
          key={r.id}
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11.5px] font-medium bg-[#fff1f2] border border-[#fecdd3] text-[#be185d]"
        >
          {r.label}
          <button
            type="button"
            onClick={() => onRemove(r.id)}
            className="text-[#be185d]/60 hover:text-[#be185d]"
          >
            <X size={11} />
          </button>
        </span>
      ))}
    </div>
  );
}

"use client";

import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  createLocation,
  deleteLocation,
  fetchLocations,
  type LocationInput,
  updateLocation,
} from "@/lib/hrms-client";

interface LocationRow {
  id: number;
  name: string;
  code: string;
  city: string;
  state: string;
  country: string;
}

// Country / State data is loaded live:
//   • Countries  → RestCountries (https://restcountries.com/v3.1)
//   • States     → CountryStateCity (https://countrystatecity.in), keyed by the
//                  country's ISO2 code. Needs a free API key supplied via the
//                  NEXT_PUBLIC_CSC_API_KEY env var.
const CSC_API_KEY = process.env.NEXT_PUBLIC_CSC_API_KEY ?? "";
const DEFAULT_COUNTRY = "India";

interface Country {
  name: string;
  iso2: string;
}

const PAGE_SIZE = 10;
const PINK_GRADIENT = "linear-gradient(135deg, #ec4899 0%, #be185d 100%)";
const COLUMNS = ["Name", "Code", "City", "State", "Country", "Actions"];

// ── form state ───────────────────────────────────────────────────────────────

interface LocationFormState {
  name: string;
  code: string;
  city: string;
  country: string;
  state: string;
}

const EMPTY_FORM: LocationFormState = {
  name: "",
  code: "",
  city: "",
  country: DEFAULT_COUNTRY,
  state: "",
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "#374151",
  display: "block",
  marginBottom: 6,
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: "9px 12px",
  fontSize: 13,
  outline: "none",
  background: "#fff",
  boxSizing: "border-box",
};

function Req() {
  return <span style={{ color: "#dc2626" }}> *</span>;
}

// ── slide-in Add / Edit panel ────────────────────────────────────────────────

function LocationFormPanel({
  open,
  initial,
  onClose,
  onSubmit,
  submitting,
}: {
  open: boolean;
  initial: LocationRow | null;
  onClose: () => void;
  onSubmit: (form: LocationFormState) => void;
  submitting: boolean;
}) {
  const [form, setForm] = useState<LocationFormState>(EMPTY_FORM);
  const isEdit = initial !== null;

  const [countries, setCountries] = useState<Country[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(false);
  const [countriesError, setCountriesError] = useState<string | null>(null);

  const [states, setStates] = useState<string[]>([]);
  const [statesLoading, setStatesLoading] = useState(false);
  const [statesError, setStatesError] = useState<string | null>(null);

  // Populate (edit) or reset (add) whenever the panel opens.
  useEffect(() => {
    if (!open) return;
    setForm(
      initial
        ? {
            name: initial.name,
            code: initial.code,
            city: initial.city,
            country: initial.country,
            state: initial.state,
          }
        : EMPTY_FORM,
    );
  }, [open, initial]);

  // Countries — RestCountries, fetched once.
  useEffect(() => {
    let cancelled = false;
    setCountriesLoading(true);
    setCountriesError(null);
    fetch("https://restcountries.com/v3.1/all?fields=name,cca2")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: Array<{ name: { common: string }; cca2: string }>) => {
        if (cancelled) return;
        setCountries(
          data
            .map((c) => ({ name: c.name.common, iso2: c.cca2 }))
            .sort((a, b) => a.name.localeCompare(b.name)),
        );
      })
      .catch(() => {
        if (!cancelled) setCountriesError("Couldn't load countries.");
      })
      .finally(() => {
        if (!cancelled) setCountriesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ISO2 of the currently selected country — needed to query states.
  const selectedIso2 = useMemo(
    () => countries.find((c) => c.name === form.country)?.iso2 ?? "",
    [countries, form.country],
  );

  // States — CountryStateCity, reloaded whenever the country changes.
  useEffect(() => {
    if (!selectedIso2) {
      setStates([]);
      setStatesError(null);
      return;
    }
    if (!CSC_API_KEY) {
      setStates([]);
      setStatesError(
        "State lookup needs an API key (set NEXT_PUBLIC_CSC_API_KEY).",
      );
      return;
    }
    let cancelled = false;
    setStatesLoading(true);
    setStatesError(null);
    fetch(
      `https://api.countrystatecity.in/v1/countries/${selectedIso2}/states`,
      { headers: { "X-CSCAPI-KEY": CSC_API_KEY } },
    )
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: Array<{ name: string }>) => {
        if (cancelled) return;
        setStates(data.map((s) => s.name).sort((a, b) => a.localeCompare(b)));
      })
      .catch(() => {
        if (cancelled) return;
        setStates([]);
        setStatesError("Couldn't load states. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setStatesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedIso2]);

  function set<K extends keyof LocationFormState>(
    key: K,
    val: LocationFormState[K],
  ) {
    setForm((p) => ({ ...p, [key]: val }));
  }

  // Switching country always resets the chosen state.
  function handleCountry(country: string) {
    setForm((p) => ({ ...p, country, state: "" }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (
      !form.name.trim() ||
      !form.code.trim() ||
      !form.city.trim() ||
      !form.country ||
      !form.state
    ) {
      toast.error("Please fill in all required fields.");
      return;
    }
    onSubmit({
      name: form.name.trim(),
      code: form.code.trim(),
      city: form.city.trim(),
      country: form.country,
      state: form.state,
    });
  }

  return (
    <div
      aria-hidden={!open}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        pointerEvents: open ? "auto" : "none",
      }}
    >
      {/* Backdrop */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop click-to-close; panel has an explicit ✕ button */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: backdrop overlay */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(15,23,42,0.45)",
          opacity: open ? 1 : 0,
          transition: "opacity 300ms ease",
        }}
      />

      {/* Panel */}
      <div
        className="flex flex-col"
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          height: "100%",
          width: 440,
          maxWidth: "100%",
          background: "#fff",
          boxShadow: "-12px 0 40px rgba(0,0,0,0.12)",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 300ms ease",
        }}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between px-6 py-5"
          style={{ borderBottom: "1px solid #f3f4f6" }}
        >
          <div>
            <h2 className="text-[17px] font-bold text-gray-900">
              {isEdit ? "Edit Location" : "Add New Location"}
            </h2>
            <p className="text-[12px] mt-0.5" style={{ color: "#9ca3af" }}>
              Enter location details
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex items-center justify-center rounded-lg"
            style={{
              width: 32,
              height: 32,
              border: "1px solid #e5e7eb",
              color: "#6b7280",
              cursor: "pointer",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col flex-1 overflow-auto"
        >
          <div className="flex flex-col gap-4 px-6 py-5 flex-1">
            <div>
              <label htmlFor="loc-name" style={labelStyle}>
                Location Name
                <Req />
              </label>
              <input
                id="loc-name"
                style={inputStyle}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Enter location name"
              />
            </div>

            <div>
              <label htmlFor="loc-code" style={labelStyle}>
                Code
                <Req />
              </label>
              <input
                id="loc-code"
                style={inputStyle}
                value={form.code}
                onChange={(e) => set("code", e.target.value)}
                placeholder="Enter location code"
              />
            </div>

            <div>
              <label htmlFor="loc-city" style={labelStyle}>
                City
                <Req />
              </label>
              <input
                id="loc-city"
                style={inputStyle}
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
                placeholder="Enter city"
              />
            </div>

            {/* Country + State side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="loc-country" style={labelStyle}>
                  Country
                  <Req />
                </label>
                <select
                  id="loc-country"
                  style={inputStyle}
                  value={form.country}
                  onChange={(e) => handleCountry(e.target.value)}
                  disabled={countriesLoading || countries.length === 0}
                >
                  {countries.length === 0 ? (
                    <option value={form.country}>
                      {countriesLoading ? "Loading countries…" : form.country}
                    </option>
                  ) : (
                    countries.map((c) => (
                      <option key={c.iso2} value={c.name}>
                        {c.name}
                      </option>
                    ))
                  )}
                </select>
                {countriesError && (
                  <p className="text-[11px] mt-1" style={{ color: "#dc2626" }}>
                    {countriesError}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="loc-state" style={labelStyle}>
                  State
                  <Req />
                </label>
                <select
                  id="loc-state"
                  style={inputStyle}
                  value={form.state}
                  onChange={(e) => set("state", e.target.value)}
                  disabled={
                    statesLoading || (states.length === 0 && !form.state)
                  }
                >
                  <option value="">
                    {statesLoading ? "Loading states…" : "Select state"}
                  </option>
                  {states.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                  {/* Keep an edited value visible even if the list failed/changed */}
                  {form.state && !states.includes(form.state) && (
                    <option value={form.state}>{form.state}</option>
                  )}
                </select>
                {statesError && (
                  <p className="text-[11px] mt-1" style={{ color: "#dc2626" }}>
                    {statesError}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div
            className="flex items-center justify-end gap-3 px-6 py-4"
            style={{ borderTop: "1px solid #f3f4f6" }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl text-[13px] font-semibold px-5 py-2.5 bg-white"
              style={{
                border: "1px solid #e5e7eb",
                color: "#374151",
                cursor: submitting ? "not-allowed" : "pointer",
                opacity: submitting ? 0.6 : 1,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl text-[13px] font-bold text-white px-6 py-2.5"
              style={{
                background: PINK_GRADIENT,
                border: "none",
                cursor: submitting ? "not-allowed" : "pointer",
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? "Saving…" : isEdit ? "Save Changes" : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── page ───────────────────────────────────────────────────────────────────

export default function LocationPage() {
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<LocationRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function reload() {
    const data = await fetchLocations();
    setLocations(data);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchLocations();
        if (!cancelled) setLocations(data);
      } catch (e) {
        if (!cancelled) setLoadError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return locations;
    return locations.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q) ||
        l.city.toLowerCase().includes(q) ||
        l.state.toLowerCase().includes(q) ||
        l.country.toLowerCase().includes(q),
    );
  }, [locations, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(start, start + PAGE_SIZE);

  function openAdd() {
    setEditing(null);
    setPanelOpen(true);
  }

  function openEdit(row: LocationRow) {
    setEditing(row);
    setPanelOpen(true);
  }

  function closePanel() {
    setPanelOpen(false);
  }

  async function handleSubmit(form: LocationFormState) {
    const input: LocationInput = {
      name: form.name,
      code: form.code,
      city: form.city,
      country: form.country,
      state: form.state,
    };
    setSubmitting(true);
    try {
      if (editing) {
        await updateLocation(editing.id, input);
        toast.success("Location updated");
      } else {
        await createLocation(input);
        toast.success("Location added");
        setPage(1);
      }
      await reload();
      setPanelOpen(false);
      setEditing(null);
    } catch (e) {
      toast.error(`Failed to save location: ${(e as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(row: LocationRow) {
    if (!window.confirm(`Delete "${row.name}"?`)) return;
    setDeletingId(row.id);
    try {
      await deleteLocation(row.id);
      setLocations((prev) => prev.filter((l) => l.id !== row.id));
      toast.success("Location deleted");
    } catch (e) {
      toast.error(`Failed to delete: ${(e as Error).message}`);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="pt-2">
      {loadError && (
        <div
          className="mb-4"
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#991b1b",
            padding: "10px 14px",
            borderRadius: 8,
            fontSize: 13,
          }}
        >
          Failed to load locations: {loadError}
        </div>
      )}

      {/* Card */}
      <div
        className="rounded-2xl bg-white overflow-hidden"
        style={{ border: "1px solid #e5e7eb" }}
      >
        {/* Controls */}
        <div className="flex items-center justify-between gap-3 p-4">
          <div
            className="flex items-center gap-2 rounded-xl px-3 flex-1"
            style={{ border: "1px solid #e5e7eb", maxWidth: 360, height: 40 }}
          >
            <Search size={16} style={{ color: "#9ca3af" }} />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search locations..."
              className="flex-1 text-[13px] text-gray-700"
              style={{
                border: "none",
                outline: "none",
                background: "transparent",
              }}
            />
          </div>
          <button
            type="button"
            onClick={openAdd}
            className="flex items-center gap-2 rounded-xl text-[13px] font-bold text-white px-4 py-2.5"
            style={{
              background: PINK_GRADIENT,
              border: "none",
              cursor: "pointer",
            }}
          >
            <Plus size={16} />
            Add Location
          </button>
          {/* <button
            type="button"
            className="flex items-center gap-2 rounded-xl text-[13px] font-medium px-4 bg-white"
            style={{
              border: "1px solid #e5e7eb",
              color: "#374151",
              height: 40,
              cursor: "pointer",
            }}
          >
            <SlidersHorizontal size={15} />
            Filters
          </button> */}
        </div>

        {/* Table */}
        <table
          style={{
            width: "100%",
            tableLayout: "fixed",
            borderCollapse: "collapse",
          }}
        >
          <colgroup>
            <col style={{ width: "30%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "15%" }} />
          </colgroup>
          <thead>
            <tr
              style={{
                background: "#f9fafb",
                borderTop: "1px solid #f3f4f6",
                borderBottom: "1px solid #f3f4f6",
              }}
            >
              {COLUMNS.map((c) => {
                const isActions = c === "Actions";
                return (
                  <th
                    key={c}
                    className="px-5 py-3 text-[10px] font-bold tracking-wider"
                    style={{
                      color: "#9ca3af",
                      textAlign: isActions ? "right" : "left",
                    }}
                  >
                    {c.toUpperCase()}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={COLUMNS.length}
                  className="px-5 py-10 text-center text-[13px]"
                  style={{ color: "#9ca3af" }}
                >
                  Loading locations…
                </td>
              </tr>
            ) : pageRows.length === 0 ? (
              <tr>
                <td
                  colSpan={COLUMNS.length}
                  className="px-5 py-10 text-center text-[13px]"
                  style={{ color: "#9ca3af" }}
                >
                  {search.trim()
                    ? "No locations match your search."
                    : "No locations yet. Click “Add Location” to create one."}
                </td>
              </tr>
            ) : (
              pageRows.map((loc) => (
                <tr key={loc.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <span
                        className="flex items-center justify-center rounded-lg shrink-0"
                        style={{ width: 34, height: 34, background: "#fce7f3" }}
                      >
                        <MapPin size={16} style={{ color: "#db2777" }} />
                      </span>
                      <span className="text-[13px] font-semibold text-gray-900">
                        {loc.name}
                      </span>
                    </div>
                  </td>
                  <td
                    className="px-5 py-3.5 text-[13px] font-medium"
                    style={{ color: "#be185d" }}
                  >
                    {loc.code}
                  </td>
                  <td className="px-5 py-3.5 text-[13px] text-gray-700">
                    {loc.city}
                  </td>
                  <td className="px-5 py-3.5 text-[13px] text-gray-700">
                    {loc.state}
                  </td>
                  <td className="px-5 py-3.5 text-[13px] text-gray-700">
                    {loc.country}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(loc)}
                        aria-label={`Edit ${loc.name}`}
                        className="flex items-center justify-center rounded-lg bg-white"
                        style={{
                          width: 32,
                          height: 32,
                          border: "1px solid #e5e7eb",
                          color: "#374151",
                          cursor: "pointer",
                        }}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(loc)}
                        disabled={deletingId === loc.id}
                        aria-label={`Delete ${loc.name}`}
                        className="flex items-center justify-center rounded-lg bg-white"
                        style={{
                          width: 32,
                          height: 32,
                          border: "1px solid #fecaca",
                          color: "#dc2626",
                          cursor: deletingId === loc.id ? "wait" : "pointer",
                          opacity: deletingId === loc.id ? 0.5 : 1,
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderTop: "1px solid #f3f4f6" }}
        >
          <span className="text-[12px]" style={{ color: "#6b7280" }}>
            {filtered.length === 0
              ? "Showing 0 locations"
              : `Showing ${start + 1} to ${Math.min(start + PAGE_SIZE, filtered.length)} of ${filtered.length} locations`}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label="Previous page"
              disabled={safePage === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="flex items-center justify-center rounded-lg bg-white"
              style={{
                width: 32,
                height: 32,
                border: "1px solid #e5e7eb",
                color: safePage === 1 ? "#d1d5db" : "#374151",
                cursor: safePage === 1 ? "default" : "pointer",
              }}
            >
              <ChevronLeft size={15} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPage(n)}
                className="flex items-center justify-center rounded-lg text-[12px] font-semibold"
                style={{
                  width: 32,
                  height: 32,
                  border:
                    n === safePage ? "1px solid #db2777" : "1px solid #e5e7eb",
                  background: n === safePage ? "#fdf2f8" : "#fff",
                  color: n === safePage ? "#be185d" : "#374151",
                  cursor: "pointer",
                }}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              aria-label="Next page"
              disabled={safePage === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="flex items-center justify-center rounded-lg bg-white"
              style={{
                width: 32,
                height: 32,
                border: "1px solid #e5e7eb",
                color: safePage === totalPages ? "#d1d5db" : "#374151",
                cursor: safePage === totalPages ? "default" : "pointer",
              }}
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>

      <LocationFormPanel
        open={panelOpen}
        initial={editing}
        onClose={closePanel}
        onSubmit={handleSubmit}
        submitting={submitting}
      />
    </div>
  );
}

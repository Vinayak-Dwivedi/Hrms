"use client";

import { PlusCircle, RotateCcw, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import AddLocationModal from "@/features/locations/components/AddLocationModal";
import EditLocationModal from "@/features/locations/components/EditLocationModal";
import LocationsTable from "@/features/locations/components/LocationsTable";
import ViewLocationModal from "@/features/locations/components/ViewLocationModal";
import {
  deleteLocation,
  fetchLocationsList,
  type LocationListItem,
} from "@/features/locations/api/locations.client";
import {
  employeeBtnSmClass,
  employeeCardClass,
  employeeErrorBannerClass,
  employeeFilterLabelClass,
  employeeIconSm,
  employeeIconXs,
  employeeInputClass,
  employeeLoadingClass,
  employeeSelectClass,
} from "@/features/employees/employee-theme";

const ALL_ADDRESSES = "All";

export default function LocationsPage() {
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<LocationListItem[]>([]);

  const [search, setSearch] = useState("");
  const [addressFilter, setAddressFilter] = useState(ALL_ADDRESSES);

  const [viewId, setViewId] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const loadLocations = useCallback(async () => {
    try {
      const rows = await fetchLocationsList();
      setLocations(rows);
      setLoadError(null);
    } catch (e) {
      setLoadError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLocations();
  }, [loadLocations]);

  const addressOptions = useMemo(() => {
    const areas = new Set<string>();
    for (const location of locations) {
      if (location.address?.trim()) {
        areas.add(location.address.trim());
      }
    }
    return [...areas].sort((a, b) => a.localeCompare(b));
  }, [locations]);

  const filteredLocations = useMemo(() => {
    const q = search.trim().toLowerCase();
    return locations.filter((location) => {
      if (
        addressFilter !== ALL_ADDRESSES &&
        (location.address ?? "") !== addressFilter
      ) {
        return false;
      }
      if (!q) return true;
      const haystack = [location.name, location.address ?? ""]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [locations, search, addressFilter]);

  function resetFilters() {
    setSearch("");
    setAddressFilter(ALL_ADDRESSES);
  }

  function openView(id: number) {
    setEditId(null);
    setAddOpen(false);
    setViewId(id);
  }

  function openEdit(id: number) {
    setViewId(null);
    setAddOpen(false);
    setEditId(id);
  }

  function openAdd() {
    setViewId(null);
    setEditId(null);
    setAddOpen(true);
  }

  function switchViewToEdit(id: number) {
    setViewId(null);
    setEditId(id);
  }

  async function handleDelete(location: LocationListItem) {
    if (
      !confirm(
        `Permanently delete "${location.name}"? This cannot be undone.`,
      )
    ) {
      return;
    }
    try {
      await deleteLocation(location.id);
      await loadLocations();
    } catch (e) {
      alert((e as Error).message);
    }
  }

  return (
    <>
      <div className={`${employeeCardClass} p-5 mb-6`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={employeeFilterLabelClass} htmlFor="loc-search">
              Search
            </label>
            <div className="relative">
              <input
                className={`${employeeInputClass} pl-10`}
                id="loc-search"
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search locations..."
                type="text"
                value={search}
              />
              <Search
                className={`${employeeIconSm} text-gray-400 absolute left-3 top-1/2 -translate-y-1/2`}
              />
            </div>
          </div>

          <div>
            <label className={employeeFilterLabelClass} htmlFor="loc-address">
              Address
            </label>
            <select
              className={employeeSelectClass}
              id="loc-address"
              onChange={(e) => setAddressFilter(e.target.value)}
              value={addressFilter}
            >
              <option value={ALL_ADDRESSES}>All Addresses</option>
              {addressOptions.map((address) => (
                <option key={address} value={address}>
                  {address}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
          <button
            className="inline-flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 font-medium text-sm transition-colors bg-transparent border-0 cursor-pointer"
            onClick={resetFilters}
            type="button"
          >
            <RotateCcw className={employeeIconSm} />
            Reset Filters
          </button>
          <button className={employeeBtnSmClass} onClick={openAdd} type="button">
            <PlusCircle className={employeeIconXs} />
            Add Location
          </button>
        </div>
      </div>

      {loadError && (
        <div className={employeeErrorBannerClass}>
          Failed to load locations: {loadError}
        </div>
      )}

      {loading ? (
        <div className={employeeLoadingClass}>Loading locations…</div>
      ) : (
        <LocationsTable
          key={`${search}-${addressFilter}`}
          locations={filteredLocations}
          onDelete={handleDelete}
          onEdit={openEdit}
          onView={openView}
        />
      )}

      <ViewLocationModal
        locationId={viewId}
        onClose={() => setViewId(null)}
        onEdit={switchViewToEdit}
        open={viewId != null}
      />

      <EditLocationModal
        locationId={editId}
        onClose={() => setEditId(null)}
        onSaved={() => void loadLocations()}
        open={editId != null}
      />

      <AddLocationModal
        onClose={() => setAddOpen(false)}
        onSaved={() => void loadLocations()}
        open={addOpen}
      />
    </>
  );
}

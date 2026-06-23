"use client";

import { PlusCircle, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import AddLocationModal from "@/features/locations/components/AddLocationModal";
import EditLocationModal from "@/features/locations/components/EditLocationModal";
import LocationsTable from "@/features/locations/components/LocationsTable";
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
} from "@/features/employees/employee-theme";

export default function LocationsPage() {
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<LocationListItem[]>([]);

  const [search, setSearch] = useState("");

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

  const filteredLocations = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return locations;
    return locations.filter((location) => {
      const haystack = [location.name, location.address ?? ""]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [locations, search]);

  function openEdit(id: number) {
    setAddOpen(false);
    setEditId(id);
  }

  function openAdd() {
    setEditId(null);
    setAddOpen(true);
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
        <div className="flex items-end gap-4">
          <div className="flex-1">
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
          key={search}
          locations={filteredLocations}
          onDelete={handleDelete}
          onEdit={openEdit}
        />
      )}

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

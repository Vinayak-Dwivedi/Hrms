"use client";

import { PlusCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
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
  employeeIconXs,
  employeeLoadingClass,
} from "@/features/employees/employee-theme";

export default function LocationsPage() {
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<LocationListItem[]>([]);

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
      <div className={`${employeeCardClass} p-5 mb-6 flex justify-end`}>
        <button className={employeeBtnSmClass} onClick={openAdd} type="button">
          <PlusCircle className={employeeIconXs} />
          Add Location
        </button>
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
          locations={locations}
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

import { useEffect, useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import { AppLayout } from "../components/layout/AppLayout";
import {
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTd,
  DataTh,
  EmptyState,
  LoadingState,
} from "../components/table/DataTable";
import {
  getActiveOfficeLocation,
  listOfficeLocations,
  saveOfficeLocation,
} from "../lib/api";
import type { OfficeLocation } from "../types";

const emptyForm = {
  name: "Main Office",
  latitude: 0,
  longitude: 0,
  radiusMeters: 200,
  address: "",
};

export function AdminGeofencePage() {
  const [items, setItems] = useState<OfficeLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const loadLocations = async () => {
    setLoading(true);
    try {
      const [locations, active] = await Promise.all([
        listOfficeLocations(),
        getActiveOfficeLocation().catch(() => null),
      ]);
      setItems(locations.items);
      if (active) {
        setForm({
          name: active.name,
          latitude: active.latitude,
          longitude: active.longitude,
          radiusMeters: active.radiusMeters,
          address: active.address || "",
        });
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load office locations",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLocations();
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) {
      toast.error("Location name is required");
      return;
    }
    if (!form.latitude || !form.longitude) {
      toast.error("Latitude and longitude are required");
      return;
    }
    setSaving(true);
    try {
      await saveOfficeLocation({
        name: form.name.trim(),
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        radiusMeters: Number(form.radiusMeters) || 200,
        address: form.address.trim(),
      });
      toast.success("Office geofence saved");
      await loadLocations();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to save geofence",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout title="Office Geofence">
      <div className="space-y-8">
        <section className="rounded-4xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-white">
              Office location
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Set the office center point and allowed radius for attendance
              check-ins.
            </p>
          </div>

          <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">
                Location name
              </span>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">
                Allowed radius (meters)
              </span>
              <input
                className="input"
                type="number"
                value={form.radiusMeters}
                onChange={(e) =>
                  setForm({ ...form, radiusMeters: Number(e.target.value) })
                }
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">
                Latitude
              </span>
              <input
                className="input"
                type="number"
                step="any"
                value={form.latitude}
                onChange={(e) =>
                  setForm({ ...form, latitude: Number(e.target.value) })
                }
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">
                Longitude
              </span>
              <input
                className="input"
                type="number"
                step="any"
                value={form.longitude}
                onChange={(e) =>
                  setForm({ ...form, longitude: Number(e.target.value) })
                }
              />
            </label>
            <label className="block md:col-span-2">
              <span className="mb-2 block text-sm font-medium text-slate-300">
                Address
              </span>
              <input
                className="input"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Office address or landmark"
              />
            </label>
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save geofence"}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-4xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-white">
                Saved locations
              </h3>
              <p className="text-sm text-slate-400">
                The active office is used during clock-in validation.
              </p>
            </div>
            <button
              onClick={loadLocations}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white"
            >
              Refresh
            </button>
          </div>

          <DataTable>
            <DataTableHead>
              <tr>
                <DataTh>Name</DataTh>
                <DataTh>Coordinates</DataTh>
                <DataTh>Radius</DataTh>
                <DataTh>Status</DataTh>
              </tr>
            </DataTableHead>
            <DataTableBody>
              {loading ? (
                <LoadingState colSpan={4} message="Loading geofence..." />
              ) : null}
              {!loading && items.length
                ? items.map((location) => (
                    <tr key={location.id}>
                      <DataTd>{location.name}</DataTd>
                      <DataTd>
                        {location.latitude.toFixed(5)},{" "}
                        {location.longitude.toFixed(5)}
                      </DataTd>
                      <DataTd>{location.radiusMeters}m</DataTd>
                      <DataTd>
                        {location.isActive ? "Active" : "Inactive"}
                      </DataTd>
                    </tr>
                  ))
                : null}
              {!loading && !items.length ? (
                <EmptyState colSpan={4} message="No office locations found." />
              ) : null}
            </DataTableBody>
          </DataTable>
        </section>
      </div>
    </AppLayout>
  );
}

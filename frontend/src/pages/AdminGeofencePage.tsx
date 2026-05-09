import { useEffect, useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import { AppLayout } from "../components/layout/AppLayout";
import { LocationMapPicker } from "../components/map/LocationMapPicker";
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
      toast.error("Pick a location on the map");
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

          <form
            onSubmit={submit}
            className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]"
          >
            <div className="space-y-4 rounded-[1.75rem] border border-white/10 bg-slate-950/30 p-5">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-300">
                  Location name
                </span>
                <input
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Main Office"
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
                  placeholder="200"
                />
              </label>
              <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-4">
                <LocationMapPicker
                  value={{
                    latitude: form.latitude,
                    longitude: form.longitude,
                    address: form.address,
                  }}
                  onChange={(selection) =>
                    setForm({
                      ...form,
                      latitude: selection.latitude,
                      longitude: selection.longitude,
                      address: selection.address,
                    })
                  }
                />
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/30 p-5">
              <div className="mb-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Latitude
                  </div>
                  <div className="mt-1 text-sm font-medium text-white">
                    {form.latitude ? form.latitude.toFixed(6) : "Select on map"}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Longitude
                  </div>
                  <div className="mt-1 text-sm font-medium text-white">
                    {form.longitude
                      ? form.longitude.toFixed(6)
                      : "Select on map"}
                  </div>
                </div>
                <div className="sm:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Address
                  </div>
                  <div className="mt-1 text-sm font-medium text-white">
                    {form.address ||
                      "Auto-populated from the selected map point"}
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save geofence"}
                </button>
              </div>
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

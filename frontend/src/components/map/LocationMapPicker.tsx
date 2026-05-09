import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

import marker2x from "leaflet/dist/images/marker-icon-2x.png";
import marker from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

export type LocationSelection = {
  latitude: number;
  longitude: number;
  address: string;
};

type LocationMapPickerProps = {
  value: LocationSelection;
  onChange: (value: LocationSelection) => void;
};

const defaultCenter: [number, number] = [23.8103, 90.4125];

const officeMarkerIcon = L.icon({
  iconRetinaUrl: marker2x,
  iconUrl: marker,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = officeMarkerIcon;

export function LocationMapPicker({ value, onChange }: LocationMapPickerProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (open) {
      setDraft(value);
    }
  }, [open, value]);

  const center = useMemo<[number, number]>(() => {
    if (draft.latitude && draft.longitude) {
      return [draft.latitude, draft.longitude];
    }
    return defaultCenter;
  }, [draft.latitude, draft.longitude]);

  const saveSelection = () => {
    onChange(draft);
    setOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-3xl border border-white/10 bg-slate-950/40 p-4 sm:grid-cols-3">
        <SummaryCard
          label="Latitude"
          value={value.latitude ? value.latitude.toFixed(6) : "Not selected"}
        />
        <SummaryCard
          label="Longitude"
          value={value.longitude ? value.longitude.toFixed(6) : "Not selected"}
        />
        <SummaryCard
          label="Address"
          value={value.address || "Select a point on the map"}
        />
      </div>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
      >
        Pick on map
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <MapLocationModal
              center={center}
              draft={draft}
              onDraftChange={setDraft}
              onClose={() => setOpen(false)}
              onSave={saveSelection}
            />,
            document.body,
          )
        : null}
    </div>
  );
}

function MapLocationModal({
  center,
  draft,
  onDraftChange,
  onClose,
  onSave,
}: {
  center: [number, number];
  draft: LocationSelection;
  onDraftChange: (value: LocationSelection) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-slate-950/80 px-4 py-6 backdrop-blur-sm">
      <div className="animate-modal-in flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 shadow-2xl shadow-black/50">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-white">
              Select office location
            </h3>
            <p className="text-sm text-slate-400">
              Click the map or drag the marker to place the office center.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
          >
            Close
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-4 p-4 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="min-h-[60vh] overflow-hidden rounded-[1.75rem] border border-white/10">
            <MapContainer
              center={center}
              zoom={15}
              className="h-full w-full"
              scrollWheelZoom
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapInteraction draft={draft} onDraftChange={onDraftChange} />
            </MapContainer>
          </div>

          <div className="flex flex-col gap-4 rounded-[1.75rem] border border-white/10 bg-white/5 p-4">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Selected point
              </div>
              <div className="mt-3 grid gap-3 text-sm text-slate-200">
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Latitude
                  </div>
                  <div className="mt-1 font-medium">
                    {draft.latitude ? draft.latitude.toFixed(6) : "-"}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Longitude
                  </div>
                  <div className="mt-1 font-medium">
                    {draft.longitude ? draft.longitude.toFixed(6) : "-"}
                  </div>
                </div>
                <label className="rounded-2xl border border-white/10 bg-slate-950/40 p-3">
                  <span className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Address
                  </span>
                  <textarea
                    value={draft.address}
                    onChange={(event) =>
                      onDraftChange({ ...draft, address: event.target.value })
                    }
                    rows={4}
                    className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500"
                    placeholder="Reverse geocoded address will appear here"
                  />
                </label>
              </div>
            </div>

            <div className="mt-auto flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => requestCurrentLocation(onDraftChange)}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
              >
                Use current location
              </button>
              <button
                type="button"
                onClick={onSave}
                className="rounded-2xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                Save selection
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MapInteraction({
  draft,
  onDraftChange,
}: {
  draft: LocationSelection;
  onDraftChange: (value: LocationSelection) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (draft.latitude && draft.longitude) {
      map.setView([draft.latitude, draft.longitude], 15, { animate: true });
    }
  }, [draft.latitude, draft.longitude, map]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      if (!draft.latitude || !draft.longitude) {
        return;
      }
      void reverseGeocode(draft.latitude, draft.longitude, controller.signal)
        .then((address) => {
          if (address) {
            onDraftChange({ ...draft, address });
          }
        })
        .catch(() => undefined);
    }, 450);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [draft.latitude, draft.longitude]);

  useMapEvents({
    click(event) {
      onDraftChange({
        ...draft,
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
      });
    },
  });

  return draft.latitude && draft.longitude ? (
    <Marker
      position={[draft.latitude, draft.longitude]}
      draggable
      eventHandlers={{
        dragend(event) {
          const markerInstance = event.target as L.Marker;
          const position = markerInstance.getLatLng();
          onDraftChange({
            ...draft,
            latitude: position.lat,
            longitude: position.lng,
          });
        },
      }}
    >
      <Popup>Office center</Popup>
    </Marker>
  ) : null;
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3">
      <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
        {label}
      </div>
      <div className="mt-1 break-words text-sm font-medium text-white">
        {value}
      </div>
    </div>
  );
}

async function reverseGeocode(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
    { signal },
  );
  if (!response.ok) {
    return "";
  }
  const data = (await response.json()) as { display_name?: string };
  return data.display_name ?? "";
}

async function requestCurrentLocation(
  onDraftChange: (value: LocationSelection) => void,
) {
  if (!navigator.geolocation) {
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (position) => {
      onDraftChange({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        address: "",
      });
    },
    () => undefined,
    { enableHighAccuracy: true, timeout: 10000 },
  );
}

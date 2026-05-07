import { Camera, MapPin, RefreshCcw, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { StatCard } from "../components/dashboard/StatCard";
import { AppLayout } from "../components/layout/AppLayout";
import { useAuth } from "../context/AuthContext";
import { useCamera } from "../hooks/useCamera";
import { useGeolocation } from "../hooks/useGeolocation";
import {
  clockIn,
  clockOut,
  recentAttendance,
  resolveUploadUrl,
} from "../lib/api";
import type { Attendance } from "../types";

export function EmployeeDashboardPage() {
  const { user } = useAuth();
  const {
    videoRef,
    cameraActive,
    cameraError,
    openCamera,
    capturePhoto,
    stopCamera,
  } = useCamera();
  const {
    location,
    error: locationError,
    requestLocation,
    setLocation,
  } = useGeolocation();
  const [recentLogs, setRecentLogs] = useState<Attendance[]>([]);
  const [busy, setBusy] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);

  const activeAttendance =
    recentLogs.find((entry) => entry.status === "clocked-in") ?? null;

  const loadRecent = async () => {
    if (!user) {
      return;
    }
    try {
      const items = await recentAttendance(user.id, 8);
      setRecentLogs(items);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load attendance",
      );
    }
  };

  useEffect(() => {
    loadRecent();
    const interval = window.setInterval(loadRecent, 20000);
    return () => window.clearInterval(interval);
  }, [user?.id]);

  const beginClockIn = async () => {
    if (!user) {
      return;
    }
    setPreparing(true);
    try {
      const coords = await requestLocation();
      setLocation(coords);
      await openCamera();
      toast.success("Location and camera ready");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to prepare clock in",
      );
    } finally {
      setPreparing(false);
    }
  };

  const submitClockIn = async () => {
    if (!user || !location) {
      toast.error("Location is required before clock in");
      return;
    }
    setBusy(true);
    try {
      const file = capturedFile ?? (await capturePhoto());
      const formData = new FormData();
      formData.append("employeeId", user.id);
      formData.append("latitude", String(location.latitude));
      formData.append("longitude", String(location.longitude));
      formData.append("deviceInfo", navigator.userAgent);
      formData.append("image", file);
      await clockIn(formData);
      toast.success("Clock in recorded");
      setCapturedFile(null);
      stopCamera();
      await loadRecent();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to clock in",
      );
    } finally {
      setBusy(false);
    }
  };

  const captureSelfie = async () => {
    try {
      const file = await capturePhoto();
      setCapturedFile(file);
      toast.success("Selfie captured");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to capture selfie",
      );
    }
  };

  const submitClockOut = async () => {
    if (!user) {
      return;
    }
    if (!activeAttendance) {
      toast.error("No active attendance found");
      return;
    }
    setBusy(true);
    try {
      const coords = await requestLocation();
      setLocation(coords);
      await clockOut({
        attendanceId: activeAttendance.id,
        latitude: coords.latitude,
        longitude: coords.longitude,
        deviceInfo: navigator.userAgent,
      });
      toast.success("Clock out recorded");
      await loadRecent();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to clock out",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppLayout title="Employee Dashboard">
      <div className="space-y-8">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Session status"
            value={activeAttendance ? "Clocked in" : "Ready"}
            helper={
              activeAttendance
                ? "Active attendance detected"
                : "Start a new session"
            }
          />
          <StatCard
            label="Location"
            value={location ? "Captured" : "Pending"}
            helper={
              location
                ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
                : locationError || "Permission required"
            }
          />
          <StatCard
            label="Camera"
            value={cameraActive ? "Open" : "Closed"}
            helper={cameraError || "Selfie capture ready"}
          />
          <StatCard
            label="Logs"
            value={recentLogs.length}
            helper="Recent attendance entries"
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
          <div className="rounded-4xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-white">
                Clock in / out
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Follow the location permission, open camera, capture selfie,
                then send everything together.
              </p>
            </div>

            <div className="space-y-4">
              <button
                onClick={beginClockIn}
                disabled={preparing || busy}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60"
              >
                <MapPin className="h-4 w-4" />
                {preparing ? "Preparing..." : "Start clock in"}
              </button>

              <button
                onClick={captureSelfie}
                disabled={!cameraActive || busy}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
              >
                <Camera className="h-4 w-4" />
                Capture selfie
              </button>

              <button
                onClick={submitClockIn}
                disabled={busy || !location}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:opacity-60"
              >
                <Upload className="h-4 w-4" />
                {busy ? "Submitting..." : "Submit clock in"}
              </button>

              <button
                onClick={submitClockOut}
                disabled={busy || !activeAttendance}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-400/20 bg-amber-400/90 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-300 disabled:opacity-60"
              >
                <RefreshCcw className="h-4 w-4" />
                {busy ? "Saving clock out..." : "Clock out"}
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <InfoBox
                title="Current location"
                value={
                  location
                    ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`
                    : "Waiting for permission"
                }
              />
              <InfoBox
                title="Device"
                value={navigator.userAgent.slice(0, 64)}
              />
            </div>
          </div>

          <div className="rounded-4xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold text-white">
                  Camera preview
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Open the camera, capture a selfie, and verify your identity.
                </p>
              </div>
              <button
                onClick={loadRecent}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white"
              >
                Refresh
              </button>
            </div>

            <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950/60">
              <video
                ref={videoRef}
                playsInline
                muted
                className="h-112 w-full object-cover"
              />
            </div>

            {capturedFile ? (
              <div className="mt-4 rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-50">
                Captured file ready: {capturedFile.name}
              </div>
            ) : null}

            {activeAttendance ? (
              <div className="mt-4 rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-4 text-sm text-cyan-50">
                Active attendance detected from{" "}
                {new Date(activeAttendance.clockIn).toLocaleString()}.
              </div>
            ) : null}
          </div>
        </section>

        <section className="rounded-4xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <div className="mb-5">
            <h2 className="text-2xl font-semibold text-white">
              Recent attendance
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Latest clock in/out events for your account.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {recentLogs.map((entry) => (
              <div
                key={entry.id}
                className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/40"
              >
                <div className="aspect-16/10 bg-slate-900">
                  {entry.image ? (
                    <img
                      src={resolveUploadUrl(entry.image)}
                      alt="Attendance selfie"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-400">
                      No image
                    </div>
                  )}
                </div>
                <div className="space-y-2 p-4 text-sm text-slate-300">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-white">
                      {entry.status}
                    </span>
                    <span className="rounded-full border border-white/10 px-2 py-1 text-xs text-slate-400">
                      {new Date(entry.clockIn).toLocaleDateString()}
                    </span>
                  </div>
                  <div>{new Date(entry.clockIn).toLocaleTimeString()}</div>
                  <div>
                    {entry.latitude.toFixed(4)}, {entry.longitude.toFixed(4)}
                  </div>
                </div>
              </div>
            ))}
            {!recentLogs.length ? (
              <div className="rounded-3xl border border-dashed border-white/10 p-10 text-center text-slate-400 md:col-span-2 xl:col-span-4">
                No attendance records yet.
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}

function InfoBox({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-4">
      <div className="text-sm text-slate-400">{title}</div>
      <div className="mt-2 wrap-break-word text-sm font-medium text-white">
        {value}
      </div>
    </div>
  );
}

import { Camera, MapPin, RefreshCcw, Upload } from "lucide-react";
import { useEffect, useState, type ChangeEvent } from "react";
import toast from "react-hot-toast";
import { StatCard } from "../components/dashboard/StatCard";
import { AppLayout } from "../components/layout/AppLayout";
import { useAuth } from "../context/AuthContext";
import { useCamera } from "../hooks/useCamera";
import { useGeolocation } from "../hooks/useGeolocation";
import {
  clockIn,
  clockOut,
  myAttendanceSummary,
  recentAttendance,
  resolveUploadUrl,
} from "../lib/api";
import { buildDeviceInfoString, formatDeviceInfoLabel } from "../lib/device";
import type { Attendance, EmployeeAttendanceProfile } from "../types";

function toHours(minutes?: number) {
  if (!minutes) {
    return "0h 0m";
  }
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

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
  const [summary, setSummary] = useState<EmployeeAttendanceProfile | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [deviceLabel, setDeviceLabel] = useState("Loading device info...");

  const activeAttendance =
    recentLogs.find(
      (entry) => !entry.clockOut && entry.approvalStatus === "pending",
    ) ?? null;

  const loadRecent = async () => {
    if (!user) {
      return;
    }
    try {
      const [items, profile] = await Promise.all([
        recentAttendance(user.id, 8),
        myAttendanceSummary(),
      ]);
      setRecentLogs(items);
      setSummary(profile);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load attendance",
      );
    }
  };

  useEffect(() => {
    buildDeviceInfoString()
      .then((value) => {
        setDeviceLabel(formatDeviceInfoLabel(value));
      })
      .catch(() => {
        setDeviceLabel("Unknown device");
      });
  }, []);

  useEffect(() => {
    loadRecent();
    const interval = window.setInterval(loadRecent, 25000);
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

      try {
        await openCamera();
        toast.success("Location and camera ready");
      } catch (error) {
        toast.error(
          error instanceof Error
            ? `${error.message}. Upload a selfie image instead.`
            : "Camera unavailable. Upload a selfie image instead.",
        );
      }
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
      let file = capturedFile;
      if (!file && cameraActive) {
        file = await capturePhoto();
      }
      if (!file) {
        throw new Error("Selfie is required. Capture or upload an image");
      }
      const formData = new FormData();
      const deviceInfo = await buildDeviceInfoString();

      formData.append("employeeId", user.id);
      formData.append("latitude", String(location.latitude));
      formData.append("longitude", String(location.longitude));
      formData.append("deviceInfo", deviceInfo);
      formData.append("image", file);

      const submitted = await clockIn(formData);
      if (submitted.geoFenceStatus === "outside" || submitted.isOutsideOffice) {
        toast(
          "You are outside the allowed office area. This record requires review.",
          {
            icon: "⚠️",
          },
        );
      } else {
        toast.success("Attendance submitted for approval");
      }
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

  const handleUploadSelfie = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setCapturedFile(file);
    toast.success("Selfie selected");
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
    if (!activeAttendance) {
      toast.error("No active attendance found");
      return;
    }
    setBusy(true);
    try {
      const coords = await requestLocation();
      const deviceInfo = await buildDeviceInfoString();
      setLocation(coords);

      await clockOut({
        attendanceId: activeAttendance.id,
        latitude: coords.latitude,
        longitude: coords.longitude,
        deviceInfo,
      });
      toast.success("Clock out submitted for approval");
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
            label="Present Days"
            value={summary?.totalPresentDays ?? 0}
          />
          <StatCard label="Absent Days" value={summary?.totalAbsentDays ?? 0} />
          <StatCard
            label="Pending Approvals"
            value={summary?.pendingApprovals ?? 0}
          />
          <StatCard
            label="Rejected"
            value={summary?.totalRejectedAttendance ?? 0}
          />
          <StatCard label="Late Days" value={summary?.totalLateDays ?? 0} />
          <StatCard
            label="Average Work Hours"
            value={toHours(summary?.averageWorkDuration)}
          />
          <StatCard
            label="Today Status"
            value={summary?.todayStatus || "absent"}
          />
          <StatCard
            label="Device"
            value={deviceLabel}
            helper="Used for attendance validation"
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
          <div className="rounded-4xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-white">
                Smart Clock In / Out
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Capture live location, selfie proof, then submit attendance for
                admin approval.
              </p>
            </div>

            <div className="space-y-4">
              <button
                onClick={beginClockIn}
                disabled={preparing || busy}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60"
              >
                <MapPin className="h-4 w-4" />
                {preparing
                  ? "Preparing..."
                  : "Step 1: Capture location + camera"}
              </button>

              <button
                onClick={captureSelfie}
                disabled={!cameraActive || busy}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
              >
                <Camera className="h-4 w-4" />
                Step 2A: Capture selfie
              </button>

              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-400">
                  Step 2B: Upload from gallery
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadSelfie}
                  className="input"
                />
              </label>

              <button
                onClick={submitClockIn}
                disabled={busy || !location}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:opacity-60"
              >
                <Upload className="h-4 w-4" />
                {busy ? "Submitting..." : "Step 3: Submit attendance"}
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
                    : locationError || "Waiting for permission"
                }
              />
              <InfoBox
                title="Camera"
                value={cameraError || (cameraActive ? "Open" : "Closed")}
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
                  Preview and upload proof image for attendance verification.
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
                Proof image ready: {capturedFile.name}
              </div>
            ) : null}
          </div>
        </section>

        <section className="rounded-4xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <div className="mb-5">
            <h2 className="text-2xl font-semibold text-white">
              Attendance History
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Clock in/out, work duration, approval status and location logs.
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
                      {entry.approvalStatus || "pending"}
                    </span>
                  </div>
                  <div>{new Date(entry.clockIn).toLocaleString()}</div>
                  <div>{toHours(entry.workDuration)}</div>
                  <div>
                    {entry.city || ""} {entry.area ? `, ${entry.area}` : ""}
                  </div>
                  <div>
                    Late: {entry.lateMinutes || 0}m | OT:{" "}
                    {entry.overtimeMinutes || 0}m
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

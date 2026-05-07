import { useEffect, useState } from "react";
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
import { listAuditLogs } from "../lib/api";
import type { AuditLog } from "../types";

export function AdminAuditLogsPage() {
  const [items, setItems] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await listAuditLogs(100);
      setItems(data.items);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load audit logs",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <AppLayout title="Audit Logs">
      <section className="rounded-4xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-white">
              Activity history
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Track auth, approval, device, and admin activity.
            </p>
          </div>
          <button
            onClick={loadLogs}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white"
          >
            Refresh
          </button>
        </div>

        <DataTable>
          <DataTableHead>
            <tr>
              <DataTh>Action</DataTh>
              <DataTh>Entity</DataTh>
              <DataTh>Actor</DataTh>
              <DataTh>Device</DataTh>
              <DataTh>Time</DataTh>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {loading ? (
              <LoadingState colSpan={5} message="Loading audit logs..." />
            ) : null}
            {!loading && items.length
              ? items.map((item) => (
                  <tr key={item.id}>
                    <DataTd>{item.action}</DataTd>
                    <DataTd>{item.entityType}</DataTd>
                    <DataTd>{item.actorId || "-"}</DataTd>
                    <DataTd>
                      <div className="max-w-72 text-xs text-slate-300">
                        <div>{item.ipAddress || "-"}</div>
                        <div className="truncate text-slate-500">
                          {item.deviceInfo || "-"}
                        </div>
                      </div>
                    </DataTd>
                    <DataTd>{new Date(item.createdAt).toLocaleString()}</DataTd>
                  </tr>
                ))
              : null}
            {!loading && !items.length ? (
              <EmptyState colSpan={5} message="No audit events yet." />
            ) : null}
          </DataTableBody>
        </DataTable>
      </section>
    </AppLayout>
  );
}

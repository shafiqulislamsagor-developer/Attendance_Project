import type { ReactNode } from "react";
import { Skeleton } from "../ui/Skeleton";

export function DataTable({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-3xl border border-white/10">
      <table className="min-w-full divide-y divide-white/10 text-left text-sm text-slate-200">
        {children}
      </table>
    </div>
  );
}

export function DataTableHead({ children }: { children: ReactNode }) {
  return (
    <thead className="bg-white/5 text-xs uppercase tracking-[0.2em] text-slate-400">
      {children}
    </thead>
  );
}

export function DataTableBody({ children }: { children: ReactNode }) {
  return (
    <tbody className="divide-y divide-white/10 bg-slate-950/40">
      {children}
    </tbody>
  );
}

export function DataTh({ children }: { children?: ReactNode }) {
  return <th className="px-4 py-3 font-medium">{children}</th>;
}

export function DataTd({
  children,
  colSpan,
}: {
  children: ReactNode;
  colSpan?: number;
}) {
  return (
    <td colSpan={colSpan} className="px-4 py-4 align-top">
      {children}
    </td>
  );
}

export function EmptyState({
  message,
  colSpan,
}: {
  message: string;
  colSpan: number;
}) {
  return (
    <tr>
      <DataTd colSpan={colSpan}>
        <div className="py-10 text-center text-slate-400">{message}</div>
      </DataTd>
    </tr>
  );
}

export function LoadingState({
  message,
  colSpan,
}: {
  message?: string;
  colSpan: number;
}) {
  return (
    <tr>
      <DataTd colSpan={colSpan}>
        <div className="space-y-4 py-4">
          <div className="grid gap-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="grid gap-3 md:grid-cols-6">
                <Skeleton className="h-4 md:col-span-2" />
                <Skeleton className="h-4 md:col-span-1" />
                <Skeleton className="h-4 md:col-span-1" />
                <Skeleton className="h-4 md:col-span-1" />
                <Skeleton className="h-4 md:col-span-1" />
              </div>
            ))}
          </div>
          {message ? (
            <div className="text-center text-sm text-slate-400">{message}</div>
          ) : null}
        </div>
      </DataTd>
    </tr>
  );
}

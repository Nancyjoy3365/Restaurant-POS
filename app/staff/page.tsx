"use client";

import { useRef, useState } from "react";
import clsx from "clsx";
import {
  Clock,
  Plus,
  Upload,
  Download,
  Search,
  X,
  AlertCircle,
  CalendarOff,
  Gift,
  CheckCircle2,
  Check,
  Ban,
} from "lucide-react";
import { usePosStore } from "@/lib/store";
import { formatKES, formatDateTime, formatHours, toDateKey } from "@/lib/utils";
import {
  getCurrentWeekLabel,
  getCurrentMonthLabel,
  getPayPeriodRange,
  isOnShift,
  openShift,
  daysWorkedThisWeek,
  commissionEarned,
  hoursWorkedInRange,
  approvedLeaveDaysInRange,
  incentiveTotalInRange,
} from "@/lib/payroll";
import {
  parseStaffCsv,
  STAFF_CSV_TEMPLATE,
  type StaffImportResult,
} from "@/lib/staffImport";
import { LeaveModal } from "@/components/staff/LeaveModal";
import { IncentiveModal } from "@/components/staff/IncentiveModal";
import type {
  CommissionType,
  LeaveRecord,
  PayType,
  StaffMember,
  StaffRole,
} from "@/lib/types";

function formatLeaveDateRange(l: LeaveRecord): string {
  return `${l.startDate.slice(5)} – ${l.endDate.slice(5)}`;
}

const ROLE_OPTIONS: StaffRole[] = [
  "Waiter",
  "Chef",
  "Kitchen Assistant",
  "Cashier",
  "Admin",
];
const PAY_TYPE_OPTIONS: PayType[] = ["daily", "monthly", "commission"];

function downloadTemplate() {
  const blob = new Blob([STAFF_CSV_TEMPLATE], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "staff-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function StaffPage() {
  const staff = usePosStore((s) => s.staff);
  const shifts = usePosStore((s) => s.shifts);
  const payments = usePosStore((s) => s.payments);
  const leaveRecords = usePosStore((s) => s.leaveRecords);
  const incentiveRecords = usePosStore((s) => s.incentiveRecords);
  const addStaffMember = usePosStore((s) => s.addStaffMember);
  const updateStaffMember = usePosStore((s) => s.updateStaffMember);
  const updateLeaveRecord = usePosStore((s) => s.updateLeaveRecord);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [importResult, setImportResult] = useState<StaffImportResult | null>(
    null
  );
  const [importedCount, setImportedCount] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [leaveModalStaff, setLeaveModalStaff] = useState<StaffMember | null>(null);
  const [incentiveModalStaff, setIncentiveModalStaff] = useState<StaffMember | null>(null);
  const [tab, setTab] = useState<"list" | "requests">("list");
  const [decliningLeave, setDecliningLeave] = useState<LeaveRecord | null>(null);
  const [declineReasonDraft, setDeclineReasonDraft] = useState("");

  const pendingLeave = leaveRecords
    .filter((l) => l.status === "pending")
    .sort((a, b) => (b.requestedAt ?? 0) - (a.requestedAt ?? 0));
  const decidedLeave = leaveRecords
    .filter((l) => l.status === "approved" || l.status === "declined")
    .sort((a, b) => (b.requestedAt ?? 0) - (a.requestedAt ?? 0));

  function staffName(staffId: string): string {
    return staff.find((m) => m.id === staffId)?.name ?? "Unknown";
  }

  function approveLeave(l: LeaveRecord) {
    const { id, ...rest } = l;
    updateLeaveRecord(id, { ...rest, status: "approved" });
  }

  function openDecline(l: LeaveRecord) {
    setDecliningLeave(l);
    setDeclineReasonDraft("");
  }

  function confirmDecline() {
    if (!decliningLeave) return;
    const { id, ...rest } = decliningLeave;
    updateLeaveRecord(id, {
      ...rest,
      status: "declined",
      declineReason: declineReasonDraft.trim() || undefined,
    });
    setDecliningLeave(null);
  }

  const todayKey = toDateKey(new Date());
  const query = search.trim().toLowerCase();
  const visibleStaff = query
    ? staff.filter(
        (m) =>
          m.name.toLowerCase().includes(query) ||
          m.role.toLowerCase().includes(query) ||
          (m.title ?? "").toLowerCase().includes(query)
      )
    : staff;

  const [form, setForm] = useState({
    name: "",
    phone: "",
    role: "Waiter" as StaffRole,
    payType: "daily" as PayType,
    rate: "",
    commissionType: "percent_of_sales" as CommissionType,
    commissionValue: "",
  });

  function resetForm() {
    setForm({
      name: "",
      phone: "",
      role: "Waiter",
      payType: "daily",
      rate: "",
      commissionType: "percent_of_sales",
      commissionValue: "",
    });
  }

  function openAddStaff() {
    setEditingStaff(null);
    resetForm();
    setStaffModalOpen(true);
  }

  function openEditStaff(member: StaffMember) {
    setEditingStaff(member);
    setForm({
      name: member.name,
      phone: member.phone ?? "",
      role: member.role,
      payType: member.payType,
      rate: member.payType === "commission" ? "" : String(member.rate),
      commissionType: member.commissionType ?? "percent_of_sales",
      commissionValue:
        member.commissionValue !== undefined ? String(member.commissionValue) : "",
    });
    setStaffModalOpen(true);
  }

  function closeStaffModal() {
    setStaffModalOpen(false);
    setEditingStaff(null);
  }

  const canSaveStaff =
    form.name.trim() !== "" &&
    (form.payType === "commission"
      ? form.commissionValue.trim() !== "" && !Number.isNaN(Number(form.commissionValue))
      : form.rate.trim() !== "" && Number(form.rate) > 0);

  function handleSaveStaff() {
    if (!canSaveStaff) return;
    const payload: Omit<StaffMember, "id"> = {
      name: form.name.trim(),
      title: editingStaff?.title,
      phone: form.phone.trim() || undefined,
      role: form.role,
      payType: form.payType,
      rate: form.payType === "commission" ? 0 : Number(form.rate) || 0,
      commissionType:
        form.payType === "commission" ? form.commissionType : undefined,
      commissionValue:
        form.payType === "commission"
          ? Number(form.commissionValue) || 0
          : undefined,
    };
    if (editingStaff) {
      updateStaffMember(editingStaff.id, payload);
    } else {
      addStaffMember(payload);
    }
    closeStaffModal();
    resetForm();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      setImportResult(parseStaffCsv(text));
      setImportedCount(null);
    };
    reader.readAsText(file);
  }

  function confirmImport() {
    if (!importResult) return;
    for (const row of importResult.valid) {
      addStaffMember(row);
    }
    setImportedCount(importResult.valid.length);
    setImportResult(null);
  }

  return (
    <div className="flex-1 flex flex-col lg:h-full lg:overflow-hidden">
      <header className="shrink-0 min-h-16 flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-warm-200 bg-white">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-black text-slate-900">Staff & Payroll</h1>
          <div className="flex items-center rounded-full border border-warm-200 p-0.5">
            <button
              type="button"
              onClick={() => setTab("list")}
              className={clsx(
                "rounded-full px-4 py-1.5 text-xs font-extrabold transition-colors",
                tab === "list"
                  ? "bg-accent-600 text-white"
                  : "text-slate-500 hover:text-accent-700"
              )}
            >
              Staff List
            </button>
            <button
              type="button"
              onClick={() => setTab("requests")}
              className={clsx(
                "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-extrabold transition-colors",
                tab === "requests"
                  ? "bg-accent-600 text-white"
                  : "text-slate-500 hover:text-accent-700"
              )}
            >
              Leave Requests
              {pendingLeave.length > 0 && (
                <span
                  className={clsx(
                    "rounded-full text-[10px] font-extrabold px-1.5 py-0.5",
                    tab === "requests"
                      ? "bg-white/25 text-white"
                      : "bg-rose-500 text-white"
                  )}
                >
                  {pendingLeave.length}
                </span>
              )}
            </button>
          </div>
        </div>
        <div className="relative w-full sm:w-72">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or role"
            className="w-full rounded-full border border-warm-200 bg-white pl-8 pr-8 py-2 text-sm font-semibold outline-none focus:border-accent-400"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={downloadTemplate}
            title="Download a CSV template with the expected columns"
            className="flex items-center gap-1.5 rounded-full text-slate-500 hover:text-accent-700 text-xs font-extrabold px-2"
          >
            <Download size={14} /> Template
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-full border-2 border-accent-300 text-accent-700 hover:bg-accent-50 text-sm font-extrabold px-4 py-2.5"
          >
            <Upload size={15} /> Upload CSV
          </button>
          <button
            type="button"
            onClick={openAddStaff}
            className="flex items-center gap-1.5 rounded-full bg-accent-600 hover:bg-accent-700 text-white text-sm font-extrabold px-4 py-2.5"
          >
            <Plus size={16} strokeWidth={3} /> Add Staff
          </button>
        </div>
      </header>

      {importedCount !== null && (
        <div className="flex items-center gap-2 px-6 py-2.5 bg-emerald-50 text-emerald-700 text-sm font-bold border-b border-emerald-100">
          <CheckCircle2 size={16} />
          Imported {importedCount} staff member{importedCount === 1 ? "" : "s"}.
          <button
            type="button"
            onClick={() => setImportedCount(null)}
            aria-label="Dismiss"
            className="ml-auto text-emerald-600 hover:text-emerald-800"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <main className="flex-1 lg:min-h-0 overflow-y-auto p-6">
        {tab === "list" && (
        <div className="rounded-xl border border-warm-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs font-extrabold uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-2 py-3">Role</th>
                <th className="text-left px-2 py-3">Phone</th>
                <th className="text-center px-2 py-3">Pay Type</th>
                <th className="text-right px-2 py-3">Rate</th>
                <th className="text-left px-2 py-3">Pay Period</th>
                <th className="text-right px-2 py-3">Hours Worked</th>
                <th className="text-right px-2 py-3">Earned</th>
                <th className="text-center px-2 py-3">Leave</th>
                <th className="text-center px-2 py-3">Incentives</th>
                <th className="text-center px-4 py-3">Shift Status</th>
              </tr>
            </thead>
            <tbody>
              {visibleStaff.map((member) => {
                const onShift = isOnShift(shifts, member.id);
                const shift = openShift(shifts, member.id);
                const period =
                  member.payType === "monthly"
                    ? getCurrentMonthLabel()
                    : getCurrentWeekLabel();
                const { start: periodStart, end: periodEnd } = getPayPeriodRange(
                  member.payType
                );
                const hoursWorked = hoursWorkedInRange(
                  shifts,
                  member.id,
                  periodStart,
                  periodEnd
                );
                const baseEarned =
                  member.payType === "daily"
                    ? member.rate * daysWorkedThisWeek(shifts, member.id)
                    : member.payType === "commission"
                    ? commissionEarned(payments, member)
                    : member.rate;
                // Only monthly-rate pay assumes every day was worked — daily
                // and commission staff already earn nothing on a day they
                // don't clock in or sell, so leave doesn't need to subtract
                // anything extra for them. Only unpaid leave reduces pay —
                // an approved paid day is, by definition, still paid.
                const leaveDays =
                  member.payType === "monthly"
                    ? approvedLeaveDaysInRange(
                        leaveRecords,
                        member.id,
                        periodStart,
                        periodEnd,
                        false
                      )
                    : 0;
                const daysInPeriodMonth = new Date(
                  periodStart.getFullYear(),
                  periodStart.getMonth() + 1,
                  0
                ).getDate();
                const leaveDeduction =
                  leaveDays > 0
                    ? Math.round((member.rate / daysInPeriodMonth) * leaveDays)
                    : 0;
                const incentivesTotal = incentiveTotalInRange(
                  incentiveRecords,
                  member.id,
                  periodStart,
                  periodEnd
                );
                const earned = Math.max(0, baseEarned - leaveDeduction) + incentivesTotal;
                // Purely informational here — pending/declined requests live
                // on the Leave Requests tab, never on this at-a-glance column.
                const upcomingLeave = leaveRecords
                  .filter(
                    (l) =>
                      l.staffId === member.id &&
                      l.status === "approved" &&
                      l.endDate >= todayKey
                  )
                  .sort((a, b) => (a.startDate < b.startDate ? -1 : 1))[0];

                return (
                  <tr key={member.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-bold text-slate-900">
                      <button
                        type="button"
                        onClick={() => openEditStaff(member)}
                        title="Edit staff member"
                        className="text-left hover:text-accent-700 hover:underline underline-offset-2"
                      >
                        {member.name}
                      </button>
                    </td>
                    <td className="px-2 py-3 text-slate-600 font-semibold">
                      {member.title ?? member.role}
                    </td>
                    <td className="px-2 py-3 text-slate-600 font-semibold">
                      {member.phone ?? "—"}
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex justify-center">
                        <span className="rounded-full bg-accent-100 text-accent-700 text-[11px] font-extrabold px-2.5 py-1 capitalize">
                          {member.payType}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 py-3 text-right font-semibold text-slate-700">
                      {member.payType === "commission"
                        ? `${member.commissionValue}% of sales`
                        : `${formatKES(member.rate)}${
                            member.payType === "daily" ? "/day" : "/mo"
                          }`}
                    </td>
                    <td className="px-2 py-3 text-slate-500 font-semibold text-xs">
                      {period}
                    </td>
                    <td className="px-2 py-3 text-right font-semibold text-slate-700">
                      {formatHours(hoursWorked)}
                    </td>
                    <td className="px-2 py-3 text-right font-extrabold text-slate-900">
                      {formatKES(earned)}
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex justify-center">
                        <button
                          type="button"
                          onClick={() => setLeaveModalStaff(member)}
                          className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-accent-700"
                        >
                          <CalendarOff size={12} />
                          {upcomingLeave
                            ? `${upcomingLeave.startDate.slice(5)} – ${upcomingLeave.endDate.slice(5)}`
                            : "—"}
                        </button>
                      </div>
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex justify-center">
                        <button
                          type="button"
                          onClick={() => setIncentiveModalStaff(member)}
                          className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-accent-700"
                        >
                          <Gift size={12} />
                          {incentivesTotal > 0 ? `+${formatKES(incentivesTotal)}` : "—"}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-center justify-center gap-0.5 min-h-[38px]">
                        <span
                          className={clsx(
                            "inline-flex items-center gap-1 rounded-full text-[11px] font-extrabold px-2.5 py-1 text-white",
                            onShift ? "bg-status-free" : "bg-slate-400"
                          )}
                        >
                          <Clock size={11} />
                          {onShift ? "On Shift" : "Off Shift"}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold">
                          {onShift && shift ? `since ${formatDateTime(shift.clockIn)}` : " "}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        )}

        {tab === "requests" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-warm-200 bg-white overflow-hidden">
              <div className="px-5 py-4 border-b border-warm-200">
                <h2 className="font-extrabold text-slate-900">
                  Pending Approvals ({pendingLeave.length})
                </h2>
              </div>
              {pendingLeave.length === 0 ? (
                <p className="text-slate-400 font-semibold text-center py-12">
                  No pending leave requests.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500 text-xs font-extrabold uppercase tracking-wide">
                      <tr>
                        <th className="text-left px-5 py-3">Staff</th>
                        <th className="text-left px-2 py-3">Date Range</th>
                        <th className="text-left px-2 py-3">Reason</th>
                        <th className="text-left px-2 py-3">Requested</th>
                        <th className="text-center px-5 py-3">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingLeave.map((l) => (
                        <tr key={l.id} className="border-t border-slate-100">
                          <td className="px-5 py-3 font-bold text-slate-900">
                            {staffName(l.staffId)}
                          </td>
                          <td className="px-2 py-3 text-slate-700 font-semibold whitespace-nowrap">
                            {formatLeaveDateRange(l)}
                          </td>
                          <td className="px-2 py-3 text-slate-600 font-semibold">
                            {l.reason || "—"}
                          </td>
                          <td className="px-2 py-3 text-slate-500 font-semibold whitespace-nowrap">
                            {l.requestedAt ? formatDateTime(l.requestedAt) : "—"}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => approveLeave(l)}
                                className="inline-flex items-center gap-1 rounded-full bg-status-free text-white text-xs font-extrabold px-3 py-1.5 hover:opacity-90"
                              >
                                <Check size={13} /> Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => openDecline(l)}
                                className="inline-flex items-center gap-1 rounded-full border-2 border-rose-300 text-rose-600 hover:bg-rose-50 text-xs font-extrabold px-3 py-1.5"
                              >
                                <Ban size={13} /> Decline
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-warm-200 bg-white overflow-hidden">
              <div className="px-5 py-4 border-b border-warm-200">
                <h2 className="font-extrabold text-slate-900">
                  Decided Requests
                </h2>
              </div>
              {decidedLeave.length === 0 ? (
                <p className="text-slate-400 font-semibold text-center py-12">
                  No leave requests have been decided yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500 text-xs font-extrabold uppercase tracking-wide">
                      <tr>
                        <th className="text-left px-5 py-3">Staff</th>
                        <th className="text-left px-2 py-3">Date Range</th>
                        <th className="text-center px-2 py-3">Status</th>
                        <th className="text-left px-4 py-3">Decline Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {decidedLeave.map((l) => (
                        <tr key={l.id} className="border-t border-slate-100">
                          <td className="px-5 py-3 font-bold text-slate-900">
                            {staffName(l.staffId)}
                          </td>
                          <td className="px-2 py-3 text-slate-700 font-semibold whitespace-nowrap">
                            {formatLeaveDateRange(l)}
                          </td>
                          <td className="px-2 py-3">
                            <div className="flex justify-center">
                              <span
                                className={clsx(
                                  "rounded-full text-[11px] font-extrabold px-2.5 py-1 capitalize",
                                  l.status === "approved"
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-rose-50 text-rose-700"
                                )}
                              >
                                {l.status}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-500 font-semibold">
                            {l.declineReason || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {staffModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={closeStaffModal}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-slate-900">
                {editingStaff ? "Edit Staff" : "Add Staff"}
              </h3>
              <button
                type="button"
                onClick={closeStaffModal}
                aria-label="Close"
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
                  Name
                </label>
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="e.g. John Otieno"
                  autoFocus
                  className="mt-1 w-full rounded-lg border border-warm-200 px-3 py-2 text-sm font-bold outline-none focus:border-accent-400"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
                  Phone (optional)
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, phone: e.target.value }))
                  }
                  placeholder="e.g. 0712345678"
                  className="mt-1 w-full rounded-lg border border-warm-200 px-3 py-2 text-sm font-bold outline-none focus:border-accent-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
                    Role
                  </label>
                  <select
                    value={form.role}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        role: e.target.value as StaffRole,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-warm-200 px-3 py-2 text-sm font-bold outline-none focus:border-accent-400 bg-white"
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
                    Pay Type
                  </label>
                  <select
                    value={form.payType}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        payType: e.target.value as PayType,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-warm-200 px-3 py-2 text-sm font-bold outline-none focus:border-accent-400 bg-white capitalize"
                  >
                    {PAY_TYPE_OPTIONS.map((p) => (
                      <option key={p} value={p} className="capitalize">
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {form.payType === "commission" ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
                      Commission Type
                    </label>
                    <select
                      value={form.commissionType}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          commissionType: e.target.value as CommissionType,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-warm-200 px-3 py-2 text-xs font-bold outline-none focus:border-accent-400 bg-white"
                    >
                      <option value="percent_of_sales">% of sales</option>
                      <option value="flat_per_order">Flat per order</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
                      {form.commissionType === "percent_of_sales"
                        ? "Percent"
                        : "KES per order"}
                    </label>
                    <input
                      type="number"
                      value={form.commissionValue}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          commissionValue: e.target.value,
                        }))
                      }
                      placeholder={
                        form.commissionType === "percent_of_sales" ? "10" : "50"
                      }
                      className="mt-1 w-full rounded-lg border border-warm-200 px-3 py-2 text-sm font-bold outline-none focus:border-accent-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
                    Rate (KES{form.payType === "daily" ? "/day" : "/month"})
                  </label>
                  <input
                    type="number"
                    value={form.rate}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, rate: e.target.value }))
                    }
                    placeholder="e.g. 800"
                    className="mt-1 w-full rounded-lg border border-warm-200 px-3 py-2 text-sm font-bold outline-none focus:border-accent-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              )}
            </div>

            <button
              type="button"
              disabled={!canSaveStaff}
              onClick={handleSaveStaff}
              className="w-full mt-5 flex items-center justify-center gap-2 rounded-lg bg-accent-600 hover:bg-accent-700 disabled:bg-slate-300 text-white font-extrabold py-3 transition-colors"
            >
              {editingStaff ? (
                <>
                  <Check size={16} strokeWidth={3} /> Save Changes
                </>
              ) : (
                <>
                  <Plus size={16} strokeWidth={3} /> Add Staff
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {importResult && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setImportResult(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-5 max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-extrabold text-slate-900">
                Import Preview
              </h3>
              <button
                type="button"
                onClick={() => setImportResult(null)}
                aria-label="Close"
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-slate-500 font-semibold mb-3">
              {importResult.valid.length} row
              {importResult.valid.length === 1 ? "" : "s"} ready to import
              {importResult.errors.length > 0 &&
                `, ${importResult.errors.length} row${
                  importResult.errors.length === 1 ? "" : "s"
                } skipped`}
              .
            </p>

            <div className="flex-1 overflow-y-auto space-y-3">
              {importResult.valid.length > 0 && (
                <div className="rounded-lg border border-warm-200 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-warm-50 text-slate-500 font-extrabold uppercase tracking-wide">
                      <tr>
                        <th className="text-left px-3 py-2">Name</th>
                        <th className="text-left px-2 py-2">Role</th>
                        <th className="text-left px-2 py-2">Pay Type</th>
                        <th className="text-right px-3 py-2">Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importResult.valid.map((row, i) => (
                        <tr key={i} className="border-t border-warm-100">
                          <td className="px-3 py-2 font-bold text-slate-900">
                            {row.name}
                          </td>
                          <td className="px-2 py-2 text-slate-600 font-semibold">
                            {row.role}
                          </td>
                          <td className="px-2 py-2 text-slate-600 font-semibold capitalize">
                            {row.payType}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-slate-700">
                            {row.payType === "commission"
                              ? `${row.commissionValue}${
                                  row.commissionType === "flat_per_order"
                                    ? " KES/order"
                                    : "%"
                                }`
                              : formatKES(row.rate)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {importResult.errors.length > 0 && (
                <div className="rounded-lg bg-rose-50 p-3 space-y-1.5">
                  {importResult.errors.map((err, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-1.5 text-xs font-bold text-rose-700"
                    >
                      <AlertCircle size={13} className="shrink-0 mt-0.5" />
                      Line {err.line}: {err.message}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => setImportResult(null)}
                className="flex-1 rounded-lg border-2 border-warm-200 text-slate-500 hover:border-slate-300 font-extrabold py-2.5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={importResult.valid.length === 0}
                onClick={confirmImport}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-accent-600 hover:bg-accent-700 disabled:bg-slate-300 text-white font-extrabold py-2.5 transition-colors"
              >
                <Upload size={15} /> Import {importResult.valid.length}
              </button>
            </div>
          </div>
        </div>
      )}

      {leaveModalStaff && (
        <LeaveModal
          staff={leaveModalStaff}
          onClose={() => setLeaveModalStaff(null)}
        />
      )}

      {incentiveModalStaff && (
        <IncentiveModal
          staff={incentiveModalStaff}
          onClose={() => setIncentiveModalStaff(null)}
        />
      )}

      {decliningLeave && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setDecliningLeave(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-extrabold text-slate-900">Decline Leave Request</h3>
              <button
                type="button"
                onClick={() => setDecliningLeave(null)}
                aria-label="Close"
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-slate-500 font-semibold mb-3 mt-1">
              {staffName(decliningLeave.staffId)} — {formatLeaveDateRange(decliningLeave)}
            </p>

            <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
              Reason (optional)
            </label>
            <textarea
              value={declineReasonDraft}
              onChange={(e) => setDeclineReasonDraft(e.target.value)}
              placeholder="e.g. Short-staffed that week"
              rows={2}
              className="mt-1 w-full rounded-lg border border-warm-200 px-3 py-2 text-sm font-semibold outline-none focus:border-accent-400 resize-none"
            />

            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => setDecliningLeave(null)}
                className="flex-1 rounded-lg border-2 border-warm-200 text-slate-500 hover:border-slate-300 font-extrabold py-2.5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDecline}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-extrabold py-2.5 transition-colors"
              >
                <Ban size={15} /> Decline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

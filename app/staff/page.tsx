"use client";

import clsx from "clsx";
import { LogIn, LogOut, Clock } from "lucide-react";
import { usePosStore } from "@/lib/store";
import { formatKES, formatDateTime } from "@/lib/utils";
import {
  getCurrentWeekLabel,
  getCurrentMonthLabel,
  isOnShift,
  openShift,
  daysWorkedThisWeek,
} from "@/lib/payroll";

export default function StaffPage() {
  const staff = usePosStore((s) => s.staff);
  const shifts = usePosStore((s) => s.shifts);
  const clockIn = usePosStore((s) => s.clockIn);
  const clockOut = usePosStore((s) => s.clockOut);

  return (
    <div className="flex-1 flex flex-col">
      <header className="h-16 flex items-center px-6 border-b border-slate-200 bg-white">
        <h1 className="text-xl font-black text-slate-900">Staff & Payroll</h1>
      </header>
      <main className="flex-1 overflow-y-auto p-6">
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs font-extrabold uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-2 py-3">Role</th>
                <th className="text-center px-2 py-3">Pay Type</th>
                <th className="text-right px-2 py-3">Rate</th>
                <th className="text-left px-2 py-3">Pay Period</th>
                <th className="text-right px-2 py-3">Earned</th>
                <th className="text-center px-2 py-3">Shift Status</th>
                <th className="text-center px-4 py-3">Clock</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((member) => {
                const onShift = isOnShift(shifts, member.id);
                const shift = openShift(shifts, member.id);
                const period =
                  member.payType === "daily"
                    ? getCurrentWeekLabel()
                    : getCurrentMonthLabel();
                const earned =
                  member.payType === "daily"
                    ? member.rate * daysWorkedThisWeek(shifts, member.id)
                    : member.rate;

                return (
                  <tr key={member.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-bold text-slate-900">
                      {member.name}
                    </td>
                    <td className="px-2 py-3 text-slate-600 font-semibold">
                      {member.role}
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex justify-center">
                        <span className="rounded-full bg-accent-100 text-accent-700 text-[11px] font-extrabold px-2.5 py-1 capitalize">
                          {member.payType}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 py-3 text-right font-semibold text-slate-700">
                      {formatKES(member.rate)}
                      {member.payType === "daily" ? "/day" : "/mo"}
                    </td>
                    <td className="px-2 py-3 text-slate-500 font-semibold text-xs">
                      {period}
                    </td>
                    <td className="px-2 py-3 text-right font-extrabold text-slate-900">
                      {formatKES(earned)}
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex flex-col items-center gap-0.5">
                        <span
                          className={clsx(
                            "inline-flex items-center gap-1 rounded-full text-[11px] font-extrabold px-2.5 py-1 text-white",
                            onShift ? "bg-status-free" : "bg-slate-400"
                          )}
                        >
                          <Clock size={11} />
                          {onShift ? "On Shift" : "Off Shift"}
                        </span>
                        {onShift && shift && (
                          <span className="text-[10px] text-slate-400 font-semibold">
                            since {formatDateTime(shift.clockIn)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        {onShift ? (
                          <button
                            onClick={() => clockOut(member.id)}
                            className="flex items-center gap-1.5 rounded-full border-2 border-rose-500 text-rose-600 hover:bg-rose-50 text-xs font-extrabold px-3 py-1.5"
                          >
                            <LogOut size={13} /> Clock Out
                          </button>
                        ) : (
                          <button
                            onClick={() => clockIn(member.id)}
                            className="flex items-center gap-1.5 rounded-full border-2 border-accent-600 text-accent-700 hover:bg-accent-50 text-xs font-extrabold px-3 py-1.5"
                          >
                            <LogIn size={13} /> Clock In
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

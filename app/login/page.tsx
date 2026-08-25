"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Delete } from "lucide-react";
import clsx from "clsx";
import { usePosStore } from "@/lib/store";

const PIN_LENGTH = 4;

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function LoginPage() {
  const router = useRouter();
  const staff = usePosStore((s) => s.staff);
  const login = usePosStore((s) => s.login);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const selected = staff.find((s) => s.id === selectedId) ?? null;

  function pressDigit(d: string) {
    if (pin.length >= PIN_LENGTH) return;
    setError(false);
    const next = pin + d;
    setPin(next);
    if (next.length === PIN_LENGTH) {
      setTimeout(() => {
        if (selected) {
          login(selected.id);
          router.push("/");
        }
      }, 150);
    }
  }

  function backspace() {
    setError(false);
    setPin((p) => p.slice(0, -1));
  }

  return (
    <div className="flex-1 flex items-center justify-center bg-slate-50 min-h-screen">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-sm p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-accent-700 tracking-tight">
            Baraka Grill
          </h1>
          <p className="text-sm font-bold text-slate-500 mt-1">Staff Login</p>
        </div>

        {!selected ? (
          <div className="grid grid-cols-3 gap-3">
            {staff.map((member) => (
              <button
                key={member.id}
                type="button"
                onClick={() => {
                  setSelectedId(member.id);
                  setPin("");
                  setError(false);
                }}
                className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 p-3 hover:border-accent-400 hover:bg-accent-50 transition-colors"
              >
                <span className="h-12 w-12 flex items-center justify-center rounded-full bg-accent-600 text-white font-black text-sm">
                  {initials(member.name)}
                </span>
                <span className="text-xs font-extrabold text-slate-800 text-center leading-tight">
                  {member.name.split(" ")[0]}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  {member.role}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <span className="h-14 w-14 flex items-center justify-center rounded-full bg-accent-600 text-white font-black mb-2">
              {initials(selected.name)}
            </span>
            <div className="font-extrabold text-slate-900">{selected.name}</div>
            <div className="text-xs font-bold text-slate-400 uppercase mb-6">
              {selected.role} · Enter PIN
            </div>

            <div className="flex gap-3 mb-6">
              {Array.from({ length: PIN_LENGTH }, (_, i) => (
                <span
                  key={i}
                  className={clsx(
                    "h-3.5 w-3.5 rounded-full border-2",
                    i < pin.length
                      ? error
                        ? "bg-rose-500 border-rose-500"
                        : "bg-accent-600 border-accent-600"
                      : "border-slate-300"
                  )}
                />
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3 w-56">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => pressDigit(d)}
                  className="h-14 rounded-xl bg-slate-100 hover:bg-accent-100 font-black text-lg text-slate-800"
                >
                  {d}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setSelectedId(null);
                  setPin("");
                }}
                className="h-14 rounded-xl text-xs font-extrabold text-slate-400 hover:text-slate-600"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => pressDigit("0")}
                className="h-14 rounded-xl bg-slate-100 hover:bg-accent-100 font-black text-lg text-slate-800"
              >
                0
              </button>
              <button
                type="button"
                onClick={backspace}
                className="h-14 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600"
                aria-label="Backspace"
              >
                <Delete size={20} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

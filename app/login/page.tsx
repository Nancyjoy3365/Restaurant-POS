"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import {
  UtensilsCrossed,
  ChefHat,
  CookingPot,
  Briefcase,
  Wallet,
  ArrowLeft,
  Lock,
} from "lucide-react";
import { usePosStore } from "@/lib/store";
import { ROLE_LOGIN_ORDER, getDefaultRouteForRole } from "@/lib/roles";
import type { StaffRole } from "@/lib/types";

const ROLE_ICON: Record<StaffRole, typeof UtensilsCrossed> = {
  Waiter: UtensilsCrossed,
  Chef: ChefHat,
  "Kitchen Assistant": CookingPot,
  Manager: Briefcase,
  Cashier: Wallet,
};

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

type Step = "role" | "pin" | "staff";

export default function LoginPage() {
  const router = useRouter();
  const staff = usePosStore((s) => s.staff);
  const staffPin = usePosStore((s) => s.staffPin);
  const login = usePosStore((s) => s.login);

  const [step, setStep] = useState<Step>("role");
  const [role, setRole] = useState<StaffRole | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  function selectRole(r: StaffRole) {
    setRole(r);
    setPin("");
    setError(false);
    setStep("pin");
  }

  function submitPin(candidate: string) {
    if (!role) return;
    if (candidate === staffPin) {
      setError(false);
      setStep("staff");
    } else {
      setError(true);
      setPin("");
    }
  }

  function handlePinChange(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 3);
    setPin(digits);
    setError(false);
    if (digits.length === 3) submitPin(digits);
  }

  function selectStaff(staffId: string) {
    login(staffId);
    router.push(role ? getDefaultRouteForRole(role) : "/");
  }

  const roleStaff = role ? staff.filter((m) => m.role === role) : [];

  return (
    <div className="flex-1 flex items-center justify-center bg-background min-h-screen p-4">
      <div className="w-full max-w-md rounded-2xl border border-warm-200 bg-white shadow-sm p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-accent-700 tracking-tight">
            Samaki Mjini Restaurant
          </h1>
          <p className="text-sm font-bold text-slate-500 mt-1">
            {step === "role" && "Select your role"}
            {step === "pin" && `${role} Login`}
            {step === "staff" && `${role} · Who’s clocking in?`}
          </p>
        </div>

        {step === "role" && (
          <div className="grid grid-cols-2 gap-3">
            {ROLE_LOGIN_ORDER.map((r) => {
              const Icon = ROLE_ICON[r];
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => selectRole(r)}
                  className="flex flex-col items-center gap-2 rounded-xl border border-warm-200 p-4 hover:border-accent-400 hover:bg-accent-50 transition-colors"
                >
                  <span className="h-12 w-12 flex items-center justify-center rounded-full bg-accent-600 text-white">
                    <Icon size={22} />
                  </span>
                  <span className="text-sm font-extrabold text-slate-800">
                    {r}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {step === "pin" && role && (
          <div className="flex flex-col items-center">
            <span className="h-14 w-14 flex items-center justify-center rounded-full bg-accent-600 text-white mb-3">
              <Lock size={22} />
            </span>
            <div className="font-extrabold text-slate-900 mb-4">
              Enter PIN
            </div>
            <div className="relative mb-2">
              <div className="flex items-center gap-3">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className={clsx(
                      "h-14 w-12 rounded-lg border-2 flex items-center justify-center text-2xl font-black transition-colors",
                      error
                        ? "border-rose-400 text-rose-600"
                        : pin.length > i
                        ? "border-accent-500 text-slate-900"
                        : "border-warm-200 text-slate-300"
                    )}
                  >
                    {pin[i] ? "•" : ""}
                  </span>
                ))}
              </div>
              <input
                type="tel"
                inputMode="numeric"
                autoComplete="off"
                value={pin}
                onChange={(e) => handlePinChange(e.target.value)}
                autoFocus
                aria-label="3-digit PIN"
                className="absolute inset-0 opacity-0 cursor-default"
              />
            </div>
            {error && (
              <p className="text-xs font-extrabold text-rose-600 mb-2">
                Incorrect PIN — try again.
              </p>
            )}
            <button
              type="button"
              onClick={() => setStep("role")}
              className="flex items-center gap-1 text-xs font-extrabold text-slate-400 hover:text-slate-600 mt-4"
            >
              <ArrowLeft size={13} /> Choose a different role
            </button>
          </div>
        )}

        {step === "staff" && role && (
          <div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {roleStaff.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => selectStaff(member.id)}
                  className="flex flex-col items-center gap-2 rounded-xl border border-warm-200 p-3 hover:border-accent-400 hover:bg-accent-50 transition-colors"
                >
                  <span className="h-12 w-12 flex items-center justify-center rounded-full bg-accent-600 text-white font-black text-sm">
                    {initials(member.name)}
                  </span>
                  <span className="text-xs font-extrabold text-slate-800 text-center leading-tight">
                    {member.name.split(" ")[0]}
                  </span>
                </button>
              ))}
              {roleStaff.length === 0 && (
                <p className="col-span-3 text-sm text-slate-400 font-semibold text-center py-6">
                  No staff on file for this role yet.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setStep("role")}
              className="flex items-center gap-1 text-xs font-extrabold text-slate-400 hover:text-slate-600 mx-auto"
            >
              <ArrowLeft size={13} /> Switch role
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

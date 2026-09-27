"use client";

import { CheckCircle2, XCircle } from "lucide-react";

// Mirrors validate_password_strength() in apps/api/modules/auth/schemas.py —
// keep the two in sync.
export const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "One number", test: (p: string) => /\d/.test(p) },
  { label: "One special character", test: (p: string) => /[\W_]/.test(p) },
];

export const passwordMeetsAllRules = (p: string) => PASSWORD_RULES.every((r) => r.test(p));

export function PasswordRules({ password }: { password: string }) {
  return (
    <div className="mt-2 grid grid-cols-1 gap-1 rounded-xl bg-neutral-50 border border-neutral-100 p-3">
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(password);
        return (
          <div key={rule.label} className="flex items-center gap-1.5">
            {ok ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-neutral-300 shrink-0" />
            )}
            <span className={`text-xs ${ok ? "text-green-600" : "text-neutral-500"}`}>
              {rule.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

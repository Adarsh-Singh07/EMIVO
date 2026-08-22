"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { ArrowLeft, User, Mail, Lock, Phone, Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();

  /* ── Profile state ── */
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  /* ── Password state ── */
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || "");
      setLastName(user.last_name || "");
      setEmail(user.email || "");
      setPhone((user as any).phone || "");
    }
  }, [user]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone && !/^\d{10}$/.test(phone)) {
      toast.error("Mobile number must be exactly 10 digits");
      return;
    }
    setSaving(true);
    try {
      await apiClient.put("/users/me", {
        first_name: firstName,
        last_name: lastName,
        email: email,
        ...(phone ? { phone } : {}),
      });
      await refreshUser();
      toast.success("Profile updated successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error("Enter your current password");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    setChangingPw(true);
    try {
      await apiClient.post("/auth/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to change password. Check your current password.");
    } finally {
      setChangingPw(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-8">
      <Link
        href="/account"
        className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500 hover:text-neutral-950 mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Account
      </Link>

      <h1 className="text-2xl font-bold tracking-tight mb-8">Your Profile</h1>

      {/* Profile form */}
      <div className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 mb-6">
        <h2 className="text-base font-semibold mb-6 flex items-center gap-2">
          <User className="w-5 h-5 text-neutral-500" /> Personal Information
        </h2>
        <form onSubmit={handleUpdate} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-700">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="block w-full px-4 py-2.5 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-neutral-950 focus:border-neutral-950 outline-none text-sm"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-700">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="block w-full px-4 py-2.5 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-neutral-950 focus:border-neutral-950 outline-none text-sm"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-700">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                <Mail className="h-4 w-4" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-neutral-950 focus:border-neutral-950 outline-none text-sm"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-700">
              Mobile Number <span className="text-neutral-400 text-xs font-normal">(optional)</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                <Phone className="h-4 w-4" />
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="10-digit mobile number"
                maxLength={10}
                className="block w-full pl-10 pr-3 py-2.5 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-neutral-950 focus:border-neutral-950 outline-none text-sm"
              />
            </div>
            {phone && !/^\d{10}$/.test(phone) && (
              <p className="text-xs text-red-500">Must be exactly 10 digits</p>
            )}
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-neutral-950 text-white rounded-full text-sm font-semibold hover:bg-neutral-800 disabled:opacity-50 transition-colors"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>

      {/* Change password */}
      <div className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8">
        <h2 className="text-base font-semibold mb-6 flex items-center gap-2">
          <Lock className="w-5 h-5 text-neutral-500" /> Change Password
        </h2>
        <form onSubmit={handleChangePassword} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-700">Current Password</label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="block w-full px-4 pr-10 py-2.5 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-neutral-950 focus:border-neutral-950 outline-none text-sm"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-700"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-700">New Password</label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                minLength={8}
                className="block w-full px-4 pr-10 py-2.5 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-neutral-950 focus:border-neutral-950 outline-none text-sm"
                required
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-700"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-700">Confirm New Password</label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="block w-full px-4 pr-10 py-2.5 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-neutral-950 focus:border-neutral-950 outline-none text-sm"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-700"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-red-500">Passwords do not match</p>
            )}
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={changingPw}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-neutral-950 text-white rounded-full text-sm font-semibold hover:bg-neutral-800 disabled:opacity-50 transition-colors"
            >
              {changingPw && <Loader2 className="w-4 h-4 animate-spin" />}
              {changingPw ? "Updating…" : "Change Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

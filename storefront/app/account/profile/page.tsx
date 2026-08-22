"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { ArrowLeft, User, Mail, Lock } from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  const router = useRouter();
  const { user, mutate } = useAuth();
  
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || "");
      setLastName(user.last_name || "");
      setEmail(user.email || "");
    }
  }, [user]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient.put("/users/me", {
        first_name: firstName,
        last_name: lastName,
        email: email
      });
      await mutate();
      toast.success("Profile updated successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-16">
      <Link
        href="/account"
        className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500 hover:text-neutral-950 mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Account
      </Link>

      <h1 className="text-3xl font-bold tracking-tight mb-8">Your Profile</h1>

      <div className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8">
        <form onSubmit={handleUpdate} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-700">First Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                  <User className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-700">Last Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                  <User className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none"
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-700">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                <Mail className="h-5 w-5" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none"
                required
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between">
            <Link href="/forgot-password" className="text-sm text-neutral-600 hover:text-black underline flex items-center gap-1">
              <Lock className="w-4 h-4" /> Change Password
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-black text-white rounded-full font-medium hover:bg-neutral-800 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

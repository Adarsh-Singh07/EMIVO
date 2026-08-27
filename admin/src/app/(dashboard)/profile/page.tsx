"use client";

import { useState, useEffect, useCallback } from "react";
import { Shield, Save, Loader2, Mail, User as UserIcon, Plus } from "lucide-react";
import { toast } from "sonner";
import { apiClient, ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { RoleBadge } from "@/components/admin/status-badges";

export default function ProfilePage() {
  const { user } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || "");
      setLastName(user.last_name || "");
      setEmail(user.email || "");
    }
  }, [user]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      await apiClient.put("/users/me", {
        first_name: firstName,
        last_name: lastName,
        email: email,
      });
      toast.success("Profile updated successfully. Please log out and log in again to see changes everywhere.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update profile");
    } finally {
      setProfileSaving(false);
    }
  };

  const inputClass =
    "w-full h-11 px-4 rounded-xl bg-white border border-neutral-200 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-500";
  const labelClass = "block text-sm font-semibold text-neutral-700 mb-1.5";

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 flex items-center gap-3">
          <UserIcon className="w-8 h-8 text-amber-500" />
          My Profile & Team
        </h1>
        <p className="text-neutral-500 text-sm mt-1">
          Manage your personal account details and invite team members.
        </p>
      </div>

      <form onSubmit={saveProfile} className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8 space-y-6">
        <div className="flex items-center gap-2">
          <UserIcon className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-bold text-neutral-900">Personal Details</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>First Name</label>
            <input className={inputClass} value={firstName} onChange={e => setFirstName(e.target.value)} required />
          </div>
          <div>
            <label className={labelClass}>Last Name</label>
            <input className={inputClass} value={lastName} onChange={e => setLastName(e.target.value)} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Email Address</label>
          <input type="email" className={inputClass} value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={profileSaving}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 transition-all hover:from-amber-600 hover:to-orange-700 disabled:opacity-50"
          >
            {profileSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {profileSaving ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </form>

      <ChangePassword />
      <TeamManagement />
    </div>
  );
}

function ChangePassword() {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw !== confirmPw) { toast.error("Passwords do not match"); return; }
    if (newPw.length < 8) { toast.error("New password must be at least 8 characters"); return; }
    setSaving(true);
    try {
      await apiClient.post("/auth/change-password", { current_password: currentPw, new_password: newPw });
      toast.success("Password changed successfully");
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to change password");
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full h-11 px-4 rounded-xl bg-white border border-neutral-200 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-500";
  const labelClass = "block text-sm font-semibold text-neutral-700 mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-amber-500" />
          <h2 className="text-base font-bold text-neutral-900">Change Password</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={labelClass}>Current Password</label>
            <input type="password" className={inputClass} placeholder="••••••••" value={currentPw} onChange={e => setCurrentPw(e.target.value)} required />
          </div>
          <div>
            <label className={labelClass}>New Password</label>
            <input type="password" className={inputClass} placeholder="••••••••" value={newPw} onChange={e => setNewPw(e.target.value)} required minLength={8} />
          </div>
          <div>
            <label className={labelClass}>Confirm New Password</label>
            <input type="password" className={inputClass} placeholder="••••••••" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} required minLength={8} />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 transition-all hover:from-amber-600 hover:to-orange-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Changing..." : "Change Password"}
          </button>
        </div>
    </form>
  );
}

function TeamManagement() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [inviting, setInviting] = useState(false);

  const loadAdmins = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<any>("/admin/users?page=1&page_size=100");
      // Filter only users with admin or owner roles
      const team = (res.items || []).filter((u: any) => u.roles && (u.roles.includes("admin") || u.roles.includes("owner") || u.roles.includes("staff") || u.roles.includes("platform_admin")));
      setAdmins(team);
    } catch (err) {
      toast.error("Failed to load team members");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdmins();
  }, [loadAdmins]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    try {
      await apiClient.post("/admin/users/invite", {
        email, first_name: firstName, last_name: lastName, password
      });
      toast.success("Admin access granted successfully!");
      setIsOpen(false);
      setEmail(""); setFirstName(""); setLastName(""); setPassword("");
      loadAdmins();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to invite admin");
    } finally {
      setInviting(false);
    }
  };
  
  const handleRevoke = async (userId: string) => {
    if (!confirm("Are you sure you want to revoke this user's admin access?")) return;
    try {
      await apiClient.delete(`/admin/users/${userId}/revoke`);
      toast.success("Admin access revoked");
      loadAdmins();
    } catch (err) {
      toast.error("Failed to revoke access");
    }
  };

  const inputClass = "w-full h-11 px-4 rounded-xl bg-white border border-neutral-200 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-500";
  const labelClass = "block text-sm font-semibold text-neutral-700 mb-1.5";

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-amber-500" />
          <h2 className="text-base font-bold text-neutral-900">Team Members</h2>
        </div>
        <button onClick={() => setIsOpen(!isOpen)} className="inline-flex items-center gap-2 rounded-lg bg-neutral-100 px-3 py-1.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-200">
          <Plus className="w-4 h-4" /> Add Admin
        </button>
      </div>

      {isOpen && (
        <form onSubmit={handleInvite} className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl space-y-4">
          <h3 className="text-sm font-bold">Grant Admin Access</h3>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>First Name</label><input className={inputClass} value={firstName} onChange={e=>setFirstName(e.target.value)} required /></div>
            <div><label className={labelClass}>Last Name</label><input className={inputClass} value={lastName} onChange={e=>setLastName(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>Email</label><input type="email" className={inputClass} value={email} onChange={e=>setEmail(e.target.value)} required /></div>
            <div><label className={labelClass}>Initial Password</label><input type="password" className={inputClass} value={password} onChange={e=>setPassword(e.target.value)} required /></div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 text-sm text-neutral-600">Cancel</button>
            <button type="submit" disabled={inviting} className="px-4 py-2 text-sm text-white bg-amber-600 rounded-lg hover:bg-amber-700">Save</button>
          </div>
        </form>
      )}

      {loading ? (
         <div className="h-10 animate-pulse bg-neutral-100 rounded-xl w-full" />
      ) : (
        <div className="overflow-x-auto border border-neutral-200 rounded-xl">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50/60 border-b border-neutral-200">
              <tr>
                <th className="px-4 py-3 font-semibold text-neutral-500">User</th>
                <th className="px-4 py-3 font-semibold text-neutral-500">Role</th>
                <th className="px-4 py-3 font-semibold text-neutral-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {admins.map(a => (
                <tr key={a.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-neutral-900">{a.first_name} {a.last_name}</div>
                    <div className="text-xs text-neutral-500">{a.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">{a.roles.map((r: string) => <RoleBadge key={r} role={r} />)}</div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleRevoke(a.id)} className="text-red-500 text-xs font-semibold hover:underline">Revoke</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from"react";
import { User, Store, Mail, Phone, MapPin, ShieldCheck, Star, Lock, Save, CheckCircle, Truck } from"lucide-react";
import { apiClient, ApiError, authStorage } from"@/lib/api-client";
import { toast } from"sonner";

interface SellerProfile {
 id: string;
 name: string;
 business_name: string;
 contact_person?: string | null;
 email: string;
 phone?: string | null;
 address?: string | null;
 address_line2?: string | null;
 city?: string | null;
 state?: string | null;
 pincode?: string | null;
 gstin?: string | null;
 status: string;
 rating: number;
 rating_count: number;
}

export default function SellerProfilePage() {
 const [profile, setProfile] = useState<SellerProfile | null>(null);
 const [loading, setLoading] = useState(true);

 // Profile Form State
 const [businessName, setBusinessName] = useState("");
 const [contactPerson, setContactPerson] = useState("");
 const [phone, setPhone] = useState("");
 const [gstin, setGstin] = useState("");

 // Warehouse Address
 const [addressLine1, setAddressLine1] = useState("");
 const [addressLine2, setAddressLine2] = useState("");
 const [city, setCity] = useState("");
 const [state, setState] = useState("");
 const [pincode, setPincode] = useState("");

 const [savingProfile, setSavingProfile] = useState(false);

 // Password Change State
 const [currentPassword, setCurrentPassword] = useState("");
 const [newPassword, setNewPassword] = useState("");
 const [confirmPassword, setConfirmPassword] = useState("");
 const [changingPassword, setChangingPassword] = useState(false);

 useEffect(() => {
 async function loadProfile() {
 try {
 setLoading(true);
 const data = await apiClient.get<SellerProfile>("/seller/me");
 setProfile(data);
 authStorage.setSeller(data as unknown as Record<string, unknown>);

 setBusinessName(data.business_name ||"");
 setContactPerson(data.contact_person || data.name ||"");
 setPhone(data.phone ||"");
 setGstin(data.gstin ||"");
 setAddressLine1(data.address ||"");
 setAddressLine2(data.address_line2 ||"");
 setCity(data.city ||"");
 setState(data.state ||"");
 setPincode(data.pincode ||"");
 } catch (err) {
 toast.error("Failed to load merchant profile");
 } finally {
 setLoading(false);
 }
 }
 loadProfile();
 }, []);

 const handleSaveProfile = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!pincode.trim() || pincode.trim().length !== 6 || isNaN(Number(pincode))) {
 toast.error("Please enter a valid 6-digit postal pincode for pickup");
 return;
 }

 setSavingProfile(true);
 try {
 const updated = await apiClient.put<SellerProfile>("/seller/me", {
 business_name: businessName.trim(),
 name: contactPerson.trim(),
 contact_person: contactPerson.trim(),
 phone: phone.trim(),
 gstin: gstin.trim().toUpperCase(),
 address: addressLine1.trim(),
 address_line2: addressLine2.trim(),
 city: city.trim(),
 state: state.trim(),
 pincode: pincode.trim(),
 });

 setProfile(updated);
 authStorage.setSeller(updated as unknown as Record<string, unknown>);
 toast.success("Merchant profile and warehouse address updated successfully!");
 } catch (err) {
 const msg = err instanceof ApiError ? err.message :"Failed to update profile";
 toast.error(msg);
 } finally {
 setSavingProfile(false);
 }
 };

 const handleChangePassword = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!currentPassword) {
 toast.error("Please enter your current password");
 return;
 }
 if (newPassword.length < 6) {
 toast.error("New password must be at least 6 characters");
 return;
 }
 if (newPassword !== confirmPassword) {
 toast.error("New passwords do not match");
 return;
 }

 setChangingPassword(true);
 try {
 await apiClient.post("/seller/me/change-password", {
 current_password: currentPassword,
 new_password: newPassword,
 });

 toast.success("Password changed successfully!");
 setCurrentPassword("");
 setNewPassword("");
 setConfirmPassword("");
 } catch (err) {
 const msg = err instanceof ApiError ? err.message :"Failed to change password";
 toast.error(msg);
 } finally {
 setChangingPassword(false);
 }
 };

 if (loading) {
 return (
 <div className="max-w-4xl mx-auto space-y-4">
 <div className="h-8 w-48 bg-neutral-200 animate-pulse rounded-md" />
 <div className="h-64 bg-white border border-neutral-200 rounded-md animate-pulse" />
 </div>
 );
 }

 return (
 <div className="max-w-4xl mx-auto space-y-6">
 {/* Header */}
 <div>
 <h1 className="text-xl font-semibold tracking-tight text-neutral-900 flex items-center gap-2.5">
 <Store className="w-5 h-5 text-emerald-700" />
 Merchant Settings & Warehouse Pickup
 </h1>
 <p className="text-xs text-neutral-500 mt-0.5">
 Manage your verified business credentials, dispatch address, and account credentials.
 </p>
 </div>

 {/* Account Status Card */}
 {profile && (
 <div className="rounded-md border border-neutral-200/90 bg-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div className="flex items-center gap-3.5">
 <div className="w-11 h-11 rounded-md bg-neutral-900 text-neutral-400 flex items-center justify-center font-semibold text-base">
 {profile.business_name.charAt(0)}
 </div>
 <div>
 <h2 className="text-base font-semibold text-neutral-900">{profile.business_name}</h2>
 <p className="text-xs text-neutral-500">{profile.email} &bull; ID: {profile.id.slice(0, 8)}</p>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
 <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
 {profile.status}
 </span>
 <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
 <Star className="w-3.5 h-3.5 fill-amber-500 text-neutral-500" />
 {profile.rating > 0 && (profile.rating_count || 0) > 0
 ?`${Number(profile.rating).toFixed(1)} / 5.0 Rating`
 :"New Seller"}
 </span>
 </div>
 </div>
 )}

 {/* Profile & Warehouse Form */}
 <form onSubmit={handleSaveProfile} className="space-y-6">
 {/* Business Info Card */}
 <div className="rounded-md border border-neutral-200/90 bg-white p-6 space-y-4">
 <h2 className="text-sm font-semibold text-neutral-900 border-b border-neutral-100 pb-3 flex items-center gap-2">
 <User className="w-4 h-4 text-neutral-500" />
 Merchant Identity & Legal Information
 </h2>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-semibold text-neutral-700">Business / Store Name</label>
 <input
 type="text"
 required
 value={businessName}
 onChange={(e) => setBusinessName(e.target.value)}
 placeholder="e.g. Apana Enterprises"
 className="ex-input mt-1.5 w-full rounded-md border border-neutral-200 px-3.5 text-sm text-neutral-900"
 />
 </div>

 <div>
 <label className="block text-xs font-semibold text-neutral-700">Authorized Contact Person</label>
 <input
 type="text"
 required
 value={contactPerson}
 onChange={(e) => setContactPerson(e.target.value)}
 placeholder="e.g. Aman Gupta"
 className="ex-input mt-1.5 w-full rounded-md border border-neutral-200 px-3.5 text-sm text-neutral-900"
 />
 </div>

 <div>
 <label className="block text-xs font-semibold text-neutral-700">Contact Mobile / Phone</label>
 <input
 type="tel"
 value={phone}
 onChange={(e) => setPhone(e.target.value)}
 placeholder="e.g. +91 9876543210"
 className="ex-input mt-1.5 w-full rounded-md border border-neutral-200 px-3.5 text-sm text-neutral-900"
 />
 </div>

 <div>
 <label className="block text-xs font-semibold text-neutral-700">GSTIN Identification</label>
 <input
 type="text"
 value={gstin}
 onChange={(e) => setGstin(e.target.value)}
 placeholder="e.g. 07AAAAA0000A1Z5"
 className="ex-input mt-1.5 w-full rounded-md border border-neutral-200 px-3.5 text-sm font-mono text-neutral-900"
 />
 </div>
 </div>
 </div>

 {/* Warehouse Pickup Address */}
 <div className="rounded-md border border-neutral-200 bg-white p-6 space-y-4">
 <div className="border-b border-neutral-100 pb-3 flex items-center justify-between">
 <h2 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
 <Truck className="w-4 h-4 text-emerald-600" />
 Warehouse Pickup Address
 </h2>
 <span className="text-xs text-neutral-400 font-medium">Used for courier pickup generation</span>
 </div>

 <div className="space-y-4">
 <div>
 <label className="block text-xs font-semibold text-neutral-700">
 Address Line 1 (Building No, Floor, Street Name) <span className="text-red-500">*</span>
 </label>
 <input
 type="text"
 required
 value={addressLine1}
 onChange={(e) => setAddressLine1(e.target.value)}
 placeholder="Plot No. 42, Industrial Area, Phase II"
 className="ex-input mt-1.5 w-full rounded-md border border-neutral-200 px-3.5 text-sm text-neutral-900"
 />
 </div>

 <div>
 <label className="block text-xs font-semibold text-neutral-700">
 Address Line 2 (Area, Sector, Landmark)
 </label>
 <input
 type="text"
 value={addressLine2}
 onChange={(e) => setAddressLine2(e.target.value)}
 placeholder="Near State Bank of India, Okhla"
 className="ex-input mt-1.5 w-full rounded-md border border-neutral-200 px-3.5 text-sm text-neutral-900"
 />
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 <div>
 <label className="block text-xs font-semibold text-neutral-700">
 City <span className="text-red-500">*</span>
 </label>
 <input
 type="text"
 required
 value={city}
 onChange={(e) => setCity(e.target.value)}
 placeholder="New Delhi"
 className="ex-input mt-1.5 w-full rounded-md border border-neutral-200 px-3.5 text-sm text-neutral-900"
 />
 </div>

 <div>
 <label className="block text-xs font-semibold text-neutral-700">
 State <span className="text-red-500">*</span>
 </label>
 <input
 type="text"
 required
 value={state}
 onChange={(e) => setState(e.target.value)}
 placeholder="Delhi"
 className="ex-input mt-1.5 w-full rounded-md border border-neutral-200 px-3.5 text-sm text-neutral-900"
 />
 </div>

 <div>
 <label className="block text-xs font-semibold text-neutral-700">
 Pincode (6 digits) <span className="text-red-500">*</span>
 </label>
 <input
 type="text"
 maxLength={6}
 required
 value={pincode}
 onChange={(e) => setPincode(e.target.value.replace(/\D/g,""))}
 placeholder="110020"
 className="ex-input mt-1.5 w-full rounded-md border border-neutral-200 px-3.5 text-sm font-mono text-neutral-900"
 />
 </div>
 </div>
 </div>

 <div className="pt-2 flex justify-end">
 <button
 type="submit"
 disabled={savingProfile}
 className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-700 transition-colors disabled:opacity-50"
 >
 <Save className="w-3.5 h-3.5" />
 {savingProfile ?"Saving Changes..." :"Save Merchant Profile"}
 </button>
 </div>
 </div>
 </form>

 {/* Password Management Card */}
 <div className="rounded-md border border-neutral-200 bg-white p-6 space-y-4">
 <h2 className="text-sm font-semibold text-neutral-900 border-b border-neutral-100 pb-3 flex items-center gap-2">
 <Lock className="w-4 h-4 text-neutral-500" />
 Security & Password
 </h2>

 <form onSubmit={handleChangePassword} className="space-y-4">
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 <div>
 <label className="block text-xs font-semibold text-neutral-700">Current Password</label>
 <input
 type="password"
 required
 value={currentPassword}
 onChange={(e) => setCurrentPassword(e.target.value)}
 placeholder="••••••••"
 className="ex-input mt-1.5 w-full rounded-md border border-neutral-200 px-3.5 text-sm text-neutral-900"
 />
 </div>

 <div>
 <label className="block text-xs font-semibold text-neutral-700">New Password (min 6 chars)</label>
 <input
 type="password"
 required
 value={newPassword}
 onChange={(e) => setNewPassword(e.target.value)}
 placeholder="••••••••"
 className="ex-input mt-1.5 w-full rounded-md border border-neutral-200 px-3.5 text-sm text-neutral-900"
 />
 </div>

 <div>
 <label className="block text-xs font-semibold text-neutral-700">Confirm New Password</label>
 <input
 type="password"
 required
 value={confirmPassword}
 onChange={(e) => setConfirmPassword(e.target.value)}
 placeholder="••••••••"
 className="ex-input mt-1.5 w-full rounded-md border border-neutral-200 px-3.5 text-sm text-neutral-900"
 />
 </div>
 </div>

 <div className="pt-2 flex justify-end">
 <button
 type="submit"
 disabled={changingPassword}
 className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md border border-neutral-300 text-neutral-900 text-xs font-semibold hover:bg-neutral-50 transition-colors disabled:opacity-50"
 >
 <Lock className="w-3.5 h-3.5" />
 {changingPassword ?"Updating Password..." :"Update Password"}
 </button>
 </div>
 </form>
 </div>
 </div>
 );
}

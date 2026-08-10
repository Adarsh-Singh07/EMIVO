"use client";

import { useState, useEffect } from "react";
import { fetchApi } from "@/lib/api-client";
import { Settings, Save, Loader2, RefreshCw, AlertCircle, Shield, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { BRAND_CONFIG } from "@/config/branding";

interface BusinessSettings {
  id: string;
  business_id: string;
  config: {
    currency?: string;
    locale?: string;
    theme?: {
      primaryColor?: string;
    };
    branding?: {
      logoUrl?: string;
      companyName?: string;
    };
  };
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [currency, setCurrency] = useState("INR");
  const [companyName, setCompanyName] = useState(BRAND_CONFIG.company.name);
  const [primaryColor, setPrimaryColor] = useState("#f59e0b");

  const loadSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchApi<BusinessSettings>("/settings");
      if (data) {
        setSettings(data);
        if (data.config?.currency) setCurrency(data.config.currency);
        if (data.config?.branding?.companyName) setCompanyName(data.config.branding.companyName);
        if (data.config?.theme?.primaryColor) setPrimaryColor(data.config.theme.primaryColor);
      }
    } catch (err: any) {
      console.error("Failed to load settings:", err);
      setError(err?.message || "Could not fetch business settings from ELEKTRIX API");
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const updatedConfig = {
        ...(settings?.config || {}),
        currency,
        theme: {
          ...(settings?.config?.theme || {}),
          primaryColor,
        },
        branding: {
          ...(settings?.config?.branding || {}),
          companyName,
        },
      };

      const data = await fetchApi<BusinessSettings>("/settings", {
        method: "PUT",
        body: JSON.stringify({ config: updatedConfig }),
      });

      setSettings(data);
      toast.success("Business settings saved successfully");
    } catch (err: any) {
      console.error("Failed to save settings:", err);
      toast.error(err?.message || "Failed to update business settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Settings className="w-8 h-8 text-amber-500" />
            Account Settings
          </h1>
          <p className="text-neutral-400 text-sm mt-1">
            Manage your tenant configuration and store parameters for {BRAND_CONFIG.name}.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={loadSettings}
          disabled={loading}
          className="border-neutral-800 bg-neutral-900 text-neutral-300 hover:bg-neutral-800 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Reload
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Form Card */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 backdrop-blur-xl p-6 sm:p-8 shadow-xl">
        {loading ? (
          <div className="space-y-6 animate-pulse">
            <div className="h-6 w-1/3 bg-neutral-800 rounded-md" />
            <div className="h-12 w-full bg-neutral-800/50 rounded-xl" />
            <div className="h-12 w-full bg-neutral-800/50 rounded-xl" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            {/* General Info */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Globe className="w-5 h-5 text-amber-500" />
                Store Branding & Information
              </h2>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-neutral-300">
                  Company / Store Name
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>
            </div>

            <hr className="border-neutral-800" />

            {/* Currency & Financials */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-500" />
                Financial Configuration
              </h2>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-neutral-300">
                  Default Store Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="INR">INR (₹) — Indian Rupee</option>
                  <option value="USD">USD ($) — US Dollar</option>
                  <option value="EUR">EUR (€) — Euro</option>
                  <option value="GBP">GBP (£) — British Pound</option>
                </select>
                <p className="text-xs text-neutral-500">
                  All monetary values are calculated in integer minor units (paise / cents).
                </p>
              </div>
            </div>

            <hr className="border-neutral-800" />

            {/* Theme Customization */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Theme Accent Color</h2>
              <div className="flex items-center gap-4">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-10 w-16 rounded-lg bg-neutral-950 border border-neutral-800 cursor-pointer p-1"
                />
                <span className="font-mono text-sm text-neutral-400">{primaryColor}</span>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <Button
                type="submit"
                disabled={saving}
                className="bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold hover:from-amber-600 hover:to-orange-700 shadow-lg shadow-amber-500/20"
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Save className="w-4 h-4" /> Save Settings
                  </span>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

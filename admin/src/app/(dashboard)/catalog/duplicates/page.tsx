"use client";

import { useEffect, useState, useCallback } from "react";
import { 
  GitMerge, 
  Sparkles, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ArrowRight, 
  Image as ImageIcon,
  Store,
  Layers,
  ShieldCheck
} from "lucide-react";
import { apiClient, ApiError } from "@/lib/api-client";
import { formatINR } from "@/lib/money";
import { toast } from "sonner";

interface DuplicateCandidate {
  id: string;
  product_a_id: string;
  product_a_name: string;
  product_a_brand?: string;
  product_a_price: number;
  product_a_seller_name?: string;
  product_a_image?: string;
  product_b_id: string;
  product_b_name: string;
  product_b_brand?: string;
  product_b_price: number;
  product_b_seller_name?: string;
  product_b_image?: string;
  suggested_master_id?: string;
  similarity_score: number;
  confidence_score: number;
  ai_reason?: string;
  suggested_clean_title?: string;
  status: string;
  detected_at?: string;
}

export default function DuplicateMergesPage() {
  const [candidates, setCandidates] = useState<DuplicateCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [mergingId, setMergingId] = useState<string | null>(null);

  // Selected for merge modal
  const [selectedCandidate, setSelectedCandidate] = useState<DuplicateCandidate | null>(null);
  const [selectedMasterId, setSelectedMasterId] = useState<string>("");
  const [cleanTitle, setCleanTitle] = useState("");

  const loadCandidates = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<DuplicateCandidate[]>("/admin/catalog/duplicates");
      setCandidates(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error("Failed to load duplicate candidates");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCandidates();
  }, [loadCandidates]);

  // Trigger Immediate AI Scan
  const handleTriggerScan = async () => {
    setScanning(true);
    toast.info("Scanning catalog with Gemini / 100MillionSeek AI...");
    try {
      const res = await apiClient.post<{ status: string; new_duplicates_detected: number }>(
        "/admin/catalog/duplicates/trigger-scan",
        {}
      );
      toast.success(
        res.new_duplicates_detected > 0
          ? `Scan complete: Found ${res.new_duplicates_detected} new duplicate candidate(s)!`
          : "Scan complete: No new duplicate products found."
      );
      loadCandidates();
    } catch {
      toast.error("AI deduplication scan failed");
    } finally {
      setScanning(false);
    }
  };

  // Open Merge Modal
  const handleOpenMergeModal = (c: DuplicateCandidate) => {
    setSelectedCandidate(c);
    setSelectedMasterId(c.suggested_master_id || c.product_a_id);
    setCleanTitle(c.suggested_clean_title || c.product_a_name);
  };

  // Confirm Merge
  const handleConfirmMerge = async () => {
    if (!selectedCandidate) return;

    setMergingId(selectedCandidate.id);
    try {
      await apiClient.post(`/admin/catalog/duplicates/${selectedCandidate.id}/merge`, {
        master_product_id: selectedMasterId,
        clean_title: cleanTitle.trim() || undefined,
      });

      toast.success("Products merged successfully! Seller offers unified under master product.");
      setSelectedCandidate(null);
      loadCandidates();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to merge products";
      toast.error(msg);
    } finally {
      setMergingId(null);
    }
  };

  // Dismiss Candidate
  const handleDismiss = async (id: string) => {
    try {
      await apiClient.post(`/admin/catalog/duplicates/${id}/dismiss`, {});
      toast.success("Duplicate candidate dismissed.");
      setCandidates((prev) => prev.filter((c) => c.id !== id));
    } catch {
      toast.error("Failed to dismiss candidate");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 flex items-center gap-2.5">
            <GitMerge className="w-5 h-5 text-amber-600" />
            Duplicate Product Merges & Deduplication
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            AI-flagged product duplicates detected by the nightly 12:00 AM auditor. Merge offers to unify catalog pages.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadCandidates}
            disabled={loading}
            className="p-2 rounded-xl border border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            type="button"
            onClick={handleTriggerScan}
            disabled={scanning}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 transition-colors disabled:opacity-50 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            {scanning ? "Auditing Catalog..." : "Run AI Scan Now"}
          </button>
        </div>
      </div>

      {/* Candidate List */}
      {loading ? (
        <div className="space-y-4">
          <div className="h-40 bg-white border border-neutral-200 rounded-2xl animate-pulse" />
          <div className="h-40 bg-white border border-neutral-200 rounded-2xl animate-pulse" />
        </div>
      ) : (candidates || []).length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-neutral-900">All Catalog Products Are Unified</h3>
          <p className="text-xs text-neutral-500 max-w-md mx-auto">
            No duplicate candidates pending review. The nightly 12:00 AM AI cron automatically audits newly added items and will surface candidate pairs here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {(candidates || []).map((c) => (
            <div
              key={c.id}
              className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4 hover:border-neutral-300 transition-all"
            >
              {/* Card Header: AI Confidence Badge & Reason */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    {c.confidence_score}% Match Confidence (AI)
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    Similarity: {c.similarity_score}%
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenMergeModal(c)}
                    className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 transition-colors shadow-sm"
                  >
                    <GitMerge className="w-3.5 h-3.5" />
                    Review & Merge
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDismiss(c.id)}
                    className="px-3 py-1.5 rounded-xl border border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 text-xs font-semibold transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>

              {/* AI Explanation Box */}
              {c.ai_reason && (
                <div className="p-3 bg-neutral-50 border border-neutral-200/80 rounded-xl text-xs text-neutral-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-neutral-900">AI Analysis: </span>
                    {c.ai_reason}
                  </div>
                </div>
              )}

              {/* Side-by-Side Product Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Product A */}
                <div
                  className={`rounded-xl border p-4 space-y-3 ${
                    c.suggested_master_id === c.product_a_id
                      ? "border-amber-300 bg-amber-50/20"
                      : "border-neutral-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                      Product A
                    </span>
                    {c.suggested_master_id === c.product_a_id && (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                        ★ Suggested Master
                      </span>
                    )}
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-14 h-14 rounded-lg bg-neutral-50 border border-neutral-200 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                      {c.product_a_image ? (
                        <img src={c.product_a_image} alt="" className="w-full h-full object-contain" />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-neutral-300" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-neutral-900 line-clamp-2">{c.product_a_name}</h4>
                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        Brand: {c.product_a_brand || "None"} • Seller: {c.product_a_seller_name || "Apana Enterprises"}
                      </p>
                      <p className="text-xs font-semibold text-neutral-900 mt-1">
                        Price: {formatINR(c.product_a_price)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Product B */}
                <div
                  className={`rounded-xl border p-4 space-y-3 ${
                    c.suggested_master_id === c.product_b_id
                      ? "border-amber-300 bg-amber-50/20"
                      : "border-neutral-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                      Product B
                    </span>
                    {c.suggested_master_id === c.product_b_id && (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                        ★ Suggested Master
                      </span>
                    )}
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-14 h-14 rounded-lg bg-neutral-50 border border-neutral-200 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                      {c.product_b_image ? (
                        <img src={c.product_b_image} alt="" className="w-full h-full object-contain" />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-neutral-300" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-neutral-900 line-clamp-2">{c.product_b_name}</h4>
                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        Brand: {c.product_b_brand || "None"} • Seller: {c.product_b_seller_name || "Apana Enterprises"}
                      </p>
                      <p className="text-xs font-semibold text-neutral-900 mt-1">
                        Price: {formatINR(c.product_b_price)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* MODAL: MERGE CONFIRMATION & MASTER SELECTION                          */}
      {/* --------------------------------------------------------------------- */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-neutral-200 space-y-5">
            <div className="flex items-start justify-between border-b border-neutral-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                  <GitMerge className="w-4 h-4 text-amber-600" />
                  Merge Duplicate Product Catalog Listings
                </h3>
                <p className="text-xs text-neutral-500">
                  Select which product remains the Master. The duplicate&apos;s seller offer will be transferred with zero data loss.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCandidate(null)}
                className="text-neutral-400 hover:text-neutral-600 text-sm p-1"
              >
                ✕
              </button>
            </div>

            {/* Master Selector */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-neutral-700">
                Choose the Master Product (To Keep Active):
              </label>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedMasterId(selectedCandidate.product_a_id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedMasterId === selectedCandidate.product_a_id
                      ? "border-neutral-900 bg-neutral-900 text-white shadow-sm"
                      : "border-neutral-200 bg-white text-neutral-900 hover:border-neutral-300"
                  }`}
                >
                  <p className="text-[10px] font-bold uppercase opacity-80">Product A</p>
                  <p className="text-xs font-semibold mt-1 line-clamp-2">{selectedCandidate.product_a_name}</p>
                  <p className="text-[11px] mt-1 opacity-80">{selectedCandidate.product_a_seller_name}</p>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMasterId(selectedCandidate.product_b_id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedMasterId === selectedCandidate.product_b_id
                      ? "border-neutral-900 bg-neutral-900 text-white shadow-sm"
                      : "border-neutral-200 bg-white text-neutral-900 hover:border-neutral-300"
                  }`}
                >
                  <p className="text-[10px] font-bold uppercase opacity-80">Product B</p>
                  <p className="text-xs font-semibold mt-1 line-clamp-2">{selectedCandidate.product_b_name}</p>
                  <p className="text-[11px] mt-1 opacity-80">{selectedCandidate.product_b_seller_name}</p>
                </button>
              </div>
            </div>

            {/* Standardized Title Editor */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700">
                Standardized Master Product Title:
              </label>
              <input
                type="text"
                value={cleanTitle}
                onChange={(e) => setCleanTitle(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 font-semibold"
              />
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/60 text-[11px] text-amber-800 leading-relaxed">
              <strong>Zero Data Loss Guarantee:</strong> All inventory, stock units, and historical orders will be preserved. The duplicate seller will simply appear as a competing seller offer on the Master Product page.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedCandidate(null)}
                className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmMerge}
                disabled={Boolean(mergingId)}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 disabled:opacity-50 shadow-sm"
              >
                <GitMerge className="w-3.5 h-3.5" />
                {mergingId ? "Merging Products..." : "Confirm & Execute Merge"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

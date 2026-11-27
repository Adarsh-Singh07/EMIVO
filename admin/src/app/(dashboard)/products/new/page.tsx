"use client";

import Link from"next/link";
import { Store, ArrowLeft, ExternalLink, ShieldCheck, CheckCircle2 } from"lucide-react";

export default function NewProductPage() {
 return (
 <div className="max-w-2xl mx-auto py-12 px-4">
 <div className="rounded-md border border-amber-200 bg-white p-8 text-center space-y-6">
 <div className="mx-auto w-16 h-16 rounded-md bg-amber-50 border border-amber-200 flex items-center justify-center text-emerald-700">
 <Store className="w-8 h-8" />
 </div>

 <div className="space-y-2">
 <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
 Product Creation Managed in Seller Portal
 </h1>
 <p className="text-sm text-neutral-500 max-w-lg mx-auto">
 Direct product listing is disabled in the Admin Console. Catalog items are created and maintained exclusively through verified merchant accounts in Seller Central.
 </p>
 </div>

 <div className="rounded-md bg-amber-50/70 border border-amber-200 p-4 text-left text-xs text-amber-900 space-y-2.5">
 <div className="flex items-start gap-2.5">
 <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
 <p>
 <strong className="font-semibold">Apana Enterprises (In-House Catalog):</strong> To add or edit products for the in-house store, sign in to <strong>Seller Central</strong> using your admin email (<code>admin@elektrix.in</code>) via Email OTP.
 </p>
 </div>
 <div className="flex items-start gap-2.5">
 <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
 <p>
 <strong className="font-semibold">Marketplace Governance:</strong> The Admin Console oversees marketplace governance, seller verifications, category approvals, and central logistics dispatch.
 </p>
 </div>
 </div>

 <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
 <a
 href="https://sell.elektrix.in"
 target="_blank"
 rel="noreferrer"
 className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-md bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-neutral-700 transition-colors"
 >
 <span>Open Seller Central</span>
 <ExternalLink className="w-4 h-4" />
 </a>
 <Link
 href="/products"
 className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-md border border-neutral-200 bg-white px-5 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
 >
 <ArrowLeft className="w-4 h-4" />
 Back to Catalog
 </Link>
 </div>
 </div>
 </div>
 );
}

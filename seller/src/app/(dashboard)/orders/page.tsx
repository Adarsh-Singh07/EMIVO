"use client";

import { useEffect, useState, useCallback, useMemo } from"react";
import Link from"next/link";
import { 
 ShoppingCart, 
 Search, 
 RefreshCw, 
 AlertCircle, 
 CheckCircle2, 
 Clock, 
 Truck, 
 MapPin,
 Box,
 KeyRound,
 FileText,
 Barcode,
 ExternalLink,
 Store,
 Upload,
} from"lucide-react";
import { apiClient, ApiError, authStorage } from"@/lib/api-client";
import { uploadMediaFile } from"@/lib/media";
import { formatINR } from"@/lib/money";
import { toast } from"sonner";
import { Modal } from"@/components/Modal";

interface SellerOrderItem {
 order_id: string;
 order_number?: string;
 item_id: string;
 product_id: string;
 product_name: string;
 variant_name?: string;
 quantity: number;
 unit_price: number;
 total: number;
 fulfillment_status:"PENDING" |"PACKED" |"OUT_FOR_DELIVERY" |"DELIVERED";
 order_status?: string;
 fulfillment_type?: string;
 invoice_number?: string;
 manual_invoice_url?: string;
 serial_numbers?: string[];
 imei_numbers?: string[];
 customer_city?: string;
 customer_pincode?: string;
 created_at?: string;
}

const STATUS_FILTERS = ["ALL","PENDING","PACKED","OUT_FOR_DELIVERY","DELIVERED"] as const;

export default function SellerOrdersPage() {
 const [orders, setOrders] = useState<SellerOrderItem[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [search, setSearch] = useState("");
 const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("ALL");
 const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

 // OTP Verification modal state
 const [activeOtpOrder, setActiveOtpOrder] = useState<SellerOrderItem | null>(null);
 const [otpInput, setOtpInput] = useState("");
 const [otpSubmitting, setOtpSubmitting] = useState(false);

 // Serials / IMEI & Store Bill modal state
 const [activeFulfillmentItem, setActiveFulfillmentItem] = useState<SellerOrderItem | null>(null);
 const [serialsInput, setSerialsInput] = useState("");
 const [imeisInput, setImeisInput] = useState("");
 const [manualInvoiceUrl, setManualInvoiceUrl] = useState("");
 const [fulfillmentSubmitting, setFulfillmentSubmitting] = useState(false);
 const [uploadingBill, setUploadingBill] = useState(false);

 const handleDownloadInvoice = async (orderId: string) => {
 // The invoice must come from the seller route: the customer route runs
 // under optional_db_context, which pins the tenant to the seller's own
 // business and therefore 404s on store-tenant orders. Fetch with the auth
 // header rather than ?token= so the JWT never appears in a URL/log.
 const token = authStorage.getToken() ||"";
 const base = process.env.NEXT_PUBLIC_API_URL ||"https://api.elektrix.in/api/v1";
 try {
 const res = await fetch(`${base}/seller/orders/${orderId}/invoice`, {
 headers: token ? { Authorization:`Bearer ${token}`} : {},
 });
 if (!res.ok) {
 const data = await res.json().catch(() => ({} as Record<string, unknown>));
 throw new Error(
 (typeof data.error ==="string" && data.error) ||
 (typeof data.detail ==="string" && data.detail) ||
`Invoice unavailable (${res.status})`
 );
 }
 const html = await res.text();
 const blob = new Blob([html], { type:"text/html" });
 const url = URL.createObjectURL(blob);
 window.open(url,"_blank");
 setTimeout(() => URL.revokeObjectURL(url), 60_000);
 } catch (err) {
 toast.error(err instanceof Error ? err.message :"Could not open invoice");
 }
 };

 const loadOrders = useCallback(async () => {
 try {
 setLoading(true);
 setError(null);
 const data = await apiClient.get<SellerOrderItem[]>("/seller/orders");
 setOrders(Array.isArray(data) ? data : []);
 } catch (err) {
 const msg = err instanceof ApiError ? err.message :"Failed to load seller orders";
 setError(msg);
 toast.error(msg);
 } finally {
 setLoading(false);
 }
 }, []);

 useEffect(() => {
 loadOrders();
 }, [loadOrders]);

 const filtered = useMemo(() => {
 const list = Array.isArray(orders) ? orders : [];
 return list.filter((o) => {
 const curStatus = (o.order_status || o.fulfillment_status ||"").toUpperCase();
 if (statusFilter !=="ALL") {
 if (statusFilter ==="PENDING" && !["PENDING","CONFIRMED","PROCESSING"].includes(curStatus)) return false;
 if (statusFilter ==="PACKED" && curStatus !=="PACKED" && curStatus !=="SHIPPED") return false;
 if (statusFilter ==="OUT_FOR_DELIVERY" && curStatus !=="OUT_FOR_DELIVERY") return false;
 if (statusFilter ==="DELIVERED" && curStatus !=="DELIVERED") return false;
 }
 if (!search.trim()) return true;
 const q = search.trim().toLowerCase();
 return (
 (o.product_name ||"").toLowerCase().includes(q) ||
 (o.order_number ||"").toLowerCase().includes(q) ||
 (o.customer_city ||"").toLowerCase().includes(q) ||
 (o.customer_pincode ||"").includes(q)
 );
 });
 }, [orders, statusFilter, search]);

 const handleMarkPacked = async (orderId: string, itemId: string, productName: string) => {
 setActionLoadingId(itemId);
 try {
 await apiClient.post(`/seller/orders/${orderId}/items/${itemId}/pack`);
 toast.success(`'${productName}' marked as PACKED. Ready for admin courier dispatch.`);
 loadOrders();
 } catch (err) {
 const msg = err instanceof ApiError ? err.message :"Failed to mark item as packed";
 toast.error(msg);
 } finally {
 setActionLoadingId(null);
 }
 };

 const handleDirectDelivery = async (orderId: string, productName: string) => {
 setActionLoadingId(orderId);
 try {
 const res = await apiClient.post<{ status: string; delivery_otp?: string }>(`/seller/orders/${orderId}/direct-delivery`);
 toast.success(`Direct pickup initiated for '${productName}'! OTP dispatched to customer.`);
 loadOrders();
 } catch (err) {
 const msg = err instanceof ApiError ? err.message :"Failed to initiate store pickup";
 toast.error(msg);
 } finally {
 setActionLoadingId(null);
 }
 };

 const handleVerifyOtp = async () => {
 if (!activeOtpOrder || !otpInput.trim()) {
 toast.error("Please enter the 6-digit customer OTP");
 return;
 }
 setOtpSubmitting(true);
 try {
 await apiClient.post(`/seller/orders/${activeOtpOrder.order_id}/verify-delivery-otp`, {
 otp: otpInput.trim(),
 });
 toast.success("Delivery confirmed via customer OTP! Tax invoice generated.");
 setActiveOtpOrder(null);
 setOtpInput("");
 loadOrders();
 } catch (err) {
 const msg = err instanceof ApiError ? err.message :"Invalid OTP";
 toast.error(msg);
 } finally {
 setOtpSubmitting(false);
 }
 };

 const handleSaveFulfillment = async () => {
 if (!activeFulfillmentItem) return;
 setFulfillmentSubmitting(true);
 try {
 const serialList = serialsInput.split(",").map((s) => s.trim()).filter(Boolean);
 const imeiList = imeisInput.split(",").map((s) => s.trim()).filter(Boolean);
 await apiClient.post(`/seller/orders/${activeFulfillmentItem.order_id}/fulfillment`, {
 manual_invoice_url: manualInvoiceUrl.trim() || null,
 item_serials: serialList.length > 0 ? { [activeFulfillmentItem.item_id]: serialList } : null,
 item_imeis: imeiList.length > 0 ? { [activeFulfillmentItem.item_id]: imeiList } : null,
 });
 toast.success("Product serials, IMEIs, and store bill saved!");
 setActiveFulfillmentItem(null);
 loadOrders();
 } catch (err) {
 const msg = err instanceof ApiError ? err.message :"Failed to save details";
 toast.error(msg);
 } finally {
 setFulfillmentSubmitting(false);
 }
 };

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div>
 <h1 className="text-xl font-semibold tracking-tight text-neutral-900 flex items-center gap-2.5">
 <ShoppingCart className="w-6 h-6 text-neutral-800" />
 Orders & Fulfillment
 </h1>
 <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
 Pack items for courier dispatch or directly deliver to walk-in counter customers with OTP verification.
 </p>
 </div>
 <button
 onClick={loadOrders}
 disabled={loading}
 className="inline-flex items-center gap-2 rounded-md border border-neutral-300 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors disabled:opacity-50"
 >
 <RefreshCw className={`w-3.5 h-3.5 ${loading ?"animate-spin" :""}`} />
 Refresh
 </button>
 </div>

 {/* Central Dispatch & Direct Pickup Notice */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4 text-xs text-neutral-700 flex items-start gap-3">
 <Truck className="w-4 h-4 text-neutral-900 shrink-0 mt-0.5" />
 <p className="leading-relaxed">
 <strong className="font-semibold text-neutral-900">Courier Dispatch:</strong> Mark items as <span className="font-semibold text-neutral-900 bg-neutral-200 px-1 py-0.5 rounded">Packed</span> when ready in warehouse. The Elektrix admin team generates the shipping label and arranges courier pickup.
 </p>
 </div>
 <div className="rounded-md border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900 flex items-start gap-3">
 <Store className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
 <p className="leading-relaxed">
 <strong className="font-semibold text-amber-900">Walk-In Counter Delivery:</strong> If a customer arrives at your store, click <span className="font-semibold text-amber-950 bg-amber-50/80 px-1 py-0.5 rounded">Store Pickup</span>. Enter customer&apos;s 6-digit OTP to instantly mark delivered &amp; generate official tax invoice.
 </p>
 </div>
 </div>

 {/* Filters */}
 <div className="flex flex-col sm:flex-row gap-3">
 <div className="relative flex-1">
 <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
 <input
 type="text"
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 placeholder="Search by product name, order #, city, or pincode..."
 className="ex-input w-full rounded-md border border-neutral-300 bg-white pl-10 pr-4 text-sm text-neutral-900 placeholder-neutral-400 focus:border-neutral-900"
 />
 </div>
 <div className="flex flex-wrap gap-1.5">
 {STATUS_FILTERS.map((f) => (
 <button
 key={f}
 onClick={() => setStatusFilter(f)}
 className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
 statusFilter === f
 ?"bg-neutral-900 text-white"
 :"bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
 }`}
 >
 {f ==="ALL"
 ?"All Orders"
 : f ==="PENDING"
 ?"Needs Packing"
 : f ==="PACKED"
 ?"Packed / Dispatched"
 : f ==="OUT_FOR_DELIVERY"
 ?"Store Pickup / In Transit"
 :"Delivered"}
 </button>
 ))}
 </div>
 </div>

 {error && (
 <div className="rounded-md border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 flex items-center gap-2.5">
 <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
 <p>{error}</p>
 </div>
 )}

 {/* Orders Table */}
 {loading && (orders || []).length === 0 ? (
 <div className="space-y-2">
 {Array.from({ length: 4 }).map((_, i) => (
 <div key={i} className="h-16 animate-pulse rounded-md border border-neutral-200 bg-white" />
 ))}
 </div>
 ) : (filtered || []).length === 0 ? (
 <div className="rounded-md border border-dashed border-neutral-300 bg-white p-12 text-center">
 <Box className="w-9 h-9 text-neutral-400 mx-auto mb-2" />
 <h3 className="text-sm font-semibold text-neutral-900">No orders found</h3>
 <p className="text-xs text-neutral-500 mt-0.5 max-w-sm mx-auto">
 {search || statusFilter !=="ALL"
 ?"No orders match your filter criteria."
 :"When customers order products from your seller inventory, they will appear here for packaging and direct pickup."}
 </p>
 </div>
 ) : (
 <div className="overflow-hidden rounded-md border border-neutral-200/90 bg-white">
 <div className="overflow-x-auto">
 <table className="w-full text-left text-sm">
 <thead className="bg-neutral-50/80 border-b border-neutral-200 text-xs font-semibold text-neutral-500">
 <tr>
 <th className="px-5 py-3">Order / Date</th>
 <th className="px-5 py-3">Product</th>
 <th className="px-5 py-3 text-center">Quantity</th>
 <th className="px-5 py-3 text-right">Price</th>
 <th className="px-5 py-3">Destination</th>
 <th className="px-5 py-3">Status</th>
 <th className="px-5 py-3 text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-neutral-100">
 {(filtered || []).map((item) => {
 const rawStatus = (item.order_status || item.fulfillment_status ||"PENDING").toUpperCase();
 const isDelivered = rawStatus ==="DELIVERED";
 const isOutForDelivery = rawStatus ==="OUT_FOR_DELIVERY";
 const isPacked = rawStatus ==="PACKED" || rawStatus ==="SHIPPED";
 const isPending = !isDelivered && !isOutForDelivery && !isPacked;
 const isBusy = actionLoadingId === item.item_id || actionLoadingId === item.order_id;

 return (
 <tr key={item.item_id} className="hover:bg-neutral-50/70 transition-colors">
 <td className="px-5 py-3.5">
 <Link
 href={`/orders/${item.order_id}`}
 className="font-mono text-xs font-semibold text-neutral-900 hover:text-emerald-800 hover:underline transition-colors block"
 >
 #{item.order_number || item.order_id.slice(0, 8)}
 </Link>
 <span className="text-xs text-neutral-400">
 {item.created_at
 ? new Date(item.created_at).toLocaleDateString("en-IN", {
 day:"numeric",
 month:"short",
 year:"numeric",
 })
 :"Recent"}
 </span>
 </td>

 <td className="px-5 py-3.5">
 <Link
 href={`/orders/${item.order_id}`}
 className="font-semibold text-neutral-900 block truncate max-w-[220px] hover:text-emerald-800 transition-colors"
 >
 {item.product_name}
 </Link>
 {item.variant_name && (
 <span className="text-xs text-neutral-500 block">{item.variant_name}</span>
 )}
 {item.serial_numbers && item.serial_numbers.length > 0 && (
 <span className="text-xs font-mono text-neutral-500 block truncate max-w-[200px]" title={item.serial_numbers.join(",")}>
 SN: {item.serial_numbers.join(",")}
 </span>
 )}
 {item.imei_numbers && item.imei_numbers.length > 0 && (
 <span className="text-xs font-mono text-neutral-500 block truncate max-w-[200px]" title={item.imei_numbers.join(",")}>
 IMEI: {item.imei_numbers.join(",")}
 </span>
 )}
 </td>

 <td className="px-5 py-3.5 text-center font-semibold text-neutral-900">
 {item.quantity}
 </td>

 <td className="px-5 py-3.5 text-right">
 <span className="font-semibold text-neutral-900">{formatINR(item.total)}</span>
 {item.quantity > 1 && (
 <div className="text-xs text-neutral-400">
 {formatINR(item.unit_price)} each
 </div>
 )}
 </td>

 <td className="px-5 py-3.5">
 <div className="flex items-center gap-1.5 text-xs text-neutral-600">
 <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
 <span>{item.customer_city ||"India"}</span>
 {item.customer_pincode && (
 <span className="text-neutral-400">({item.customer_pincode})</span>
 )}
 </div>
 </td>

 <td className="px-5 py-3.5">
 {isDelivered ? (
 <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
 <CheckCircle2 className="w-3 h-3 text-emerald-600" />
 Delivered
 </span>
 ) : isOutForDelivery ? (
 <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-neutral-50 text-neutral-800 border border-neutral-200">
 <Truck className="w-3 h-3 text-neutral-600" />
 Out For Delivery / Store Pickup
 </span>
 ) : isPacked ? (
 <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200">
 <Box className="w-3 h-3 text-sky-600" />
 Packed
 </span>
 ) : (
 <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
 <Clock className="w-3 h-3 text-emerald-700" />
 Needs Packing
 </span>
 )}
 </td>

 <td className="px-5 py-3.5 text-right">
 <div className="flex items-center justify-end gap-1.5 flex-wrap">
 {/* Serials / IMEI Modal trigger */}
 <button
 onClick={() => {
 setActiveFulfillmentItem(item);
 setSerialsInput((item.serial_numbers || []).join(","));
 setImeisInput((item.imei_numbers || []).join(","));
 setManualInvoiceUrl(item.manual_invoice_url ||"");
 }}
 title="Add Serial Numbers / IMEI & Store Bill"
 className="p-1.5 rounded-md border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
 >
 <Barcode className="w-3.5 h-3.5" />
 </button>

 {/* Packing action */}
 {isPending && (
 <button
 onClick={() => handleMarkPacked(item.order_id, item.item_id, item.product_name)}
 disabled={isBusy}
 className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-neutral-900 text-xs font-semibold text-white hover:bg-neutral-700 transition-colors disabled:opacity-50"
 >
 <Box className="w-3 h-3 text-neutral-400" />
 {isBusy ?"Packing..." :"Mark Packed"}
 </button>
 )}

 {/* Store Pickup / Direct Delivery trigger */}
 {(isPending || isPacked) && (
 <button
 onClick={() => handleDirectDelivery(item.order_id, item.product_name)}
 disabled={isBusy}
 className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-amber-200 bg-amber-50 text-xs font-semibold text-amber-900 hover:bg-amber-50 transition-colors disabled:opacity-50"
 >
 <Store className="w-3 h-3 text-emerald-700" />
 Store Pickup
 </button>
 )}

 {/* OTP Verification trigger */}
 {isOutForDelivery && (
 <button
 onClick={() => {
 setActiveOtpOrder(item);
 setOtpInput("");
 }}
 className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
 >
 <KeyRound className="w-3 h-3" />
 Verify OTP
 </button>
 )}

 {/* Delivered tax invoice download */}
 {isDelivered && (
 <button
 type="button"
 onClick={() => handleDownloadInvoice(item.order_id)}
 className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-neutral-900 text-white text-xs font-semibold text-neutral-900 hover:bg-amber-400 transition-colors cursor-pointer"
 >
 <FileText className="w-3 h-3" />
 Invoice
 </button>
 )}

 {item.manual_invoice_url && (
 <a
 href={item.manual_invoice_url}
 target="_blank"
 rel="noreferrer"
 title="View Store Receipt / Bill"
 className="p-1.5 rounded-md border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100 transition-colors"
 >
 <ExternalLink className="w-3.5 h-3.5" />
 </a>
 )}
 </div>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 </div>
 )}

 {/* OTP Verification Modal */}
 <Modal
 open={!!activeOtpOrder}
 onClose={() => setActiveOtpOrder(null)}
 title="Verify Customer Delivery OTP"
 footer={
 <>
 <button
 onClick={() => setActiveOtpOrder(null)}
 className="rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
 >
 Cancel
 </button>
 <button
 onClick={handleVerifyOtp}
 disabled={otpSubmitting || !otpInput.trim()}
 className="inline-flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
 >
 {otpSubmitting ?"Verifying..." :"Verify & Complete Delivery"}
 </button>
 </>
 }
 >
 <div className="space-y-4">
 <p className="text-sm text-neutral-600">
 Ask the walk-in customer for the 6-digit delivery OTP received on their WhatsApp or phone to confirm goods handover.
 </p>
 <div>
 <label className="mb-1.5 block text-xs font-semibold text-neutral-600">
 6-Digit Customer Delivery OTP
 </label>
 <input
 type="text"
 maxLength={6}
 value={otpInput}
 onChange={(e) => setOtpInput(e.target.value.replace(/\D/g,""))}
 placeholder="Enter 6-digit OTP from customer"
 className="ex-input w-full rounded-md border border-neutral-200 bg-neutral-50 px-4 text-center font-mono text-xl font-semibold tracking-widest text-neutral-900 focus:bg-white"
 autoFocus
 />
 </div>
 <p className="text-xs text-neutral-500 italic">
 Customer must disclose this verification code at delivery handover. Handover cannot be completed without customer verification.
 </p>
 </div>
 </Modal>

 {/* Serials / IMEI & Store Bill Modal */}
 <Modal
 open={!!activeFulfillmentItem}
 onClose={() => setActiveFulfillmentItem(null)}
 title="Product Serials / IMEI & Store Bill"
 footer={
 <>
 <button
 onClick={() => setActiveFulfillmentItem(null)}
 className="rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
 >
 Cancel
 </button>
 <button
 onClick={handleSaveFulfillment}
 disabled={fulfillmentSubmitting || uploadingBill}
 className="inline-flex items-center gap-2 rounded-md border border-neutral-900 bg-neutral-900 text-white px-4 py-2 text-sm font-semibold text-neutral-900 transition-colors hover:bg-amber-400 disabled:opacity-50"
 >
 {fulfillmentSubmitting ?"Saving..." :"Save Details"}
 </button>
 </>
 }
 >
 <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
 <p className="text-sm text-neutral-600">
 Record unit serials and IMEIs in separate fields below. Both are optional. If skipped, the invoice will be generated without them. You can also upload your manual store receipt/bill to Cloudflare R2.
 </p>

 <div className="space-y-3">
 <div>
 <label className="block text-xs font-semibold text-neutral-700 mb-1">
 Serial Number(s) <span className="text-neutral-400 font-normal">(Optional)</span>
 </label>
 <input
 type="text"
 placeholder="e.g. SN123456789, SN987654321"
 value={serialsInput}
 onChange={(e) => setSerialsInput(e.target.value)}
 className="ex-input w-full rounded-md border border-neutral-200 bg-white px-3 text-xs font-mono text-neutral-900"
 />
 </div>

 <div>
 <label className="block text-xs font-semibold text-neutral-700 mb-1">
 IMEI Number(s) <span className="text-neutral-400 font-normal">(Optional)</span>
 </label>
 <input
 type="text"
 placeholder="e.g. 864523051234567, 864523051234568"
 value={imeisInput}
 onChange={(e) => setImeisInput(e.target.value)}
 className="ex-input w-full rounded-md border border-neutral-200 bg-white px-3 text-xs font-mono text-neutral-900"
 />
 </div>
 </div>

 <div className="pt-3 border-t border-neutral-200 space-y-2">
 <label className="block text-xs font-semibold text-neutral-800">
 Physical Store Receipt / Manual Invoice (Optional)
 </label>
 <p className="text-xs text-neutral-500">
 Upload your counter bill (PDF, PNG, JPG) directly to Cloudflare R2.
 </p>

 {manualInvoiceUrl ? (
 <div className="flex items-center justify-between rounded-md border border-emerald-200 bg-emerald-50/70 p-3">
 <div className="flex items-center gap-2 overflow-hidden">
 <FileText className="h-4 w-4 text-emerald-700 shrink-0" />
 <a
 href={manualInvoiceUrl}
 target="_blank"
 rel="noopener noreferrer"
 className="truncate text-xs font-semibold text-emerald-800 underline hover:text-emerald-900"
 >
 View Uploaded Store Bill
 </a>
 </div>
 <button
 type="button"
 onClick={() => setManualInvoiceUrl("")}
 className="text-xs font-semibold text-red-600 hover:text-red-700 ml-2"
 >
 Remove
 </button>
 </div>
 ) : (
 <div>
 <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-neutral-300 bg-white px-4 py-3 text-xs font-semibold text-neutral-700 hover:border-amber-400 hover:bg-amber-50/30 transition-colors w-full">
 <Upload className="h-4 w-4 text-emerald-700" />
 {uploadingBill ?"Uploading to Cloudflare R2..." :"Click to Upload Bill / Invoice (PDF, PNG, JPG)"}
 <input
 type="file"
 accept=".pdf,.png,.jpg,.jpeg,.webp"
 disabled={uploadingBill}
 onChange={async (e) => {
 const file = e.target.files?.[0];
 if (!file) return;
 setUploadingBill(true);
 try {
 const url = await uploadMediaFile(file);
 setManualInvoiceUrl(url);
 toast.success("Bill uploaded to Cloudflare R2!");
 } catch (err: any) {
 toast.error(err instanceof Error ? err.message :"Failed to upload file");
 } finally {
 setUploadingBill(false);
 e.target.value ="";
 }
 }}
 className="ex-input hidden"
 />
 </label>
 </div>
 )}

 <details className="text-xs text-neutral-500 pt-1">
 <summary className="cursor-pointer hover:text-neutral-700">Or enter manual URL directly</summary>
 <input
 type="url"
 placeholder="https://... (Cloudflare R2 or image link)"
 value={manualInvoiceUrl}
 onChange={(e) => setManualInvoiceUrl(e.target.value)}
 className="ex-input mt-1 h-8 w-full rounded-md border border-neutral-200 bg-white px-2.5 text-xs text-neutral-900"
 />
 </details>
 </div>
 </div>
 </Modal>
 </div>
 );
}

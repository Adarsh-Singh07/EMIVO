"use client";

import { useState, useEffect, useCallback } from"react";
import { useParams, useRouter } from"next/navigation";
import Link from"next/link";
import {
 ChevronLeft,
 RefreshCw,
 AlertCircle,
 CheckCircle2,
 Package,
 Truck,
 Home,
 XCircle,
 RotateCcw,
 Ticket,
 Loader2,
 MapPin,
 Store,
 FileText,
 Barcode,
 KeyRound,
 ShieldCheck,
 ExternalLink,
 Upload,
} from"lucide-react";
import { toast } from"sonner";
import { apiClient, ApiError, getAccessToken } from"@/lib/api-client";
import { uploadMediaFile } from"@/lib/media";
import { formatINR } from"@/lib/money";
import { OrderStatusBadge, PaymentMethodBadge, PaymentStatusBadge, ReturnStatusBadge, RETURN_REASON_LABELS } from"@/components/admin/status-badges";
import { Modal } from"@/components/admin/Modal";

interface OrderItem {
 id: string;
 product_id: string;
 product_name: string;
 variant_name: string | null;
 seller_id?: string | null;
 seller_name?: string | null;
 quantity: number;
 unit_price: number;
 subtotal: number;
 serial_numbers?: string[] | null;
 imei_numbers?: string[] | null;
 hsn_code?: string | null;
}

interface OrderNote {
 id: string;
 body: string;
 created_at: string | null;
 author_name: string | null;
}

interface ShippingAddress {
 full_name?: string;
 phone?: string;
 line1?: string;
 line2?: string | null;
 city?: string;
 state?: string;
 pincode?: string;
 country?: string;
}

interface Order {
 id: string;
 order_number: string | null;
 seller_name?: string | null;
 seller_id?: string | null;
 status: string;
 subtotal: number;
 tax_total: number;
 shipping_total: number;
 discount_total: number;
 total: number;
 currency: string;
 payment_method: string | null;
 payment_status: string | null;
 coupon_code: string | null;
 tracking_number: string | null;
 tracking_url: string | null;
 shipped_at: string | null;
 delivered_at: string | null;
 delivery_otp?: string | null;
 delivery_verified_at?: string | null;
 invoice_number?: string | null;
 invoice_generated_at?: string | null;
 manual_invoice_url?: string | null;
 fulfillment_type?: string | null;
 notes: string | null;
 shipping_address: ShippingAddress | null;
 items: OrderItem[];
 created_at: string;
}

interface Payment {
 id: string;
 order_id: string;
 amount: number;
 currency: string;
 status: string;
 provider: string;
 provider_payment_id?: string | null; // gateway payment id (easepayid)
 metadata_info?: { txnid?: string } | null;
 created_at: string;
 updated_at: string;
}

interface OrderAction {
 label: string;
 target: string;
 style:"primary" |"danger" |"neutral" |"brand";
 tracking?: boolean;
 reason?: boolean;
 delhivery?: boolean;
 otp?: boolean;
}

/** Backend state machine: PENDING→CONFIRMED→PROCESSING→PACKED→SHIPPED/OUT_FOR_DELIVERY→DELIVERED */
const NEXT_ACTIONS: Record<string, Array<OrderAction>> = {
 PENDING: [
 { label:"Confirm Order", target:"CONFIRMED", style:"primary" },
 { label:"Cancel", target:"CANCELLED", style:"danger", reason: true },
 ],
 CONFIRMED: [
 { label:"Ship via Delhivery", target:"SHIPPED", style:"brand", delhivery: true },
 { label:"Ship via Other Courier", target:"SHIPPED", style:"neutral", tracking: true },
 { label:"Store Pickup / Direct Delivery", target:"OUT_FOR_DELIVERY", style:"primary" },
 { label:"Start Processing", target:"PROCESSING", style:"neutral" },
 { label:"Cancel", target:"CANCELLED", style:"danger", reason: true },
 ],
 PROCESSING: [
 { label:"Ship via Delhivery", target:"SHIPPED", style:"brand", delhivery: true },
 { label:"Ship via Other Courier", target:"SHIPPED", style:"neutral", tracking: true },
 { label:"Store Pickup / Direct Delivery", target:"OUT_FOR_DELIVERY", style:"primary" },
 { label:"Cancel", target:"CANCELLED", style:"danger", reason: true },
 ],
 PACKED: [
 { label:"Ship via Delhivery", target:"SHIPPED", style:"brand", delhivery: true },
 { label:"Ship via Other Courier", target:"SHIPPED", style:"neutral", tracking: true },
 { label:"Store Pickup / Direct Delivery", target:"OUT_FOR_DELIVERY", style:"primary" },
 { label:"Cancel", target:"CANCELLED", style:"danger", reason: true },
 ],
 SHIPPED: [
 { label:"Mark Out For Delivery", target:"OUT_FOR_DELIVERY", style:"primary" },
 { label:"Mark Delivered", target:"DELIVERED", style:"neutral" },
 { label:"Cancel", target:"CANCELLED", style:"danger", reason: true },
 ],
 OUT_FOR_DELIVERY: [
 { label:"Verify Delivery OTP & Deliver", target:"DELIVERED", style:"primary", otp: true },
 { label:"Cancel", target:"CANCELLED", style:"danger", reason: true },
 ],
 DELIVERED: [],
 RETURNED: [],
 CANCELLED: [],
 REFUNDED: [],
};

export default function OrderDetailPage() {
 const params = useParams<{ id: string }>();
 const id = params?.id;
 const router = useRouter();
 const [order, setOrder] = useState<Order | null>(null);
 const [payments, setPayments] = useState<Payment[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [transitioning, setTransitioning] = useState(false);
 // Staff-only internal notes
 const [notes, setNotes] = useState<OrderNote[]>([]);
 const [newNote, setNewNote] = useState("");
 const [noteSaving, setNoteSaving] = useState(false);

 // Ship modal
 const [shipOpen, setShipOpen] = useState(false);
 const [trackingNumber, setTrackingNumber] = useState("");
 const [trackingUrl, setTrackingUrl] = useState("");

 // Cancel modal
 const [cancelOpen, setCancelOpen] = useState(false);
 const [cancelReason, setCancelReason] = useState("");

 // Delhivery manifest modal
 const [delhiveryOpen, setDelhiveryOpen] = useState(false);
 const [delhiveryLoading, setDelhiveryLoading] = useState(false);
 const [pickupName, setPickupName] = useState("ELEKTRIX");
 const [pickupAdd, setPickupAdd] = useState("DS1, 109, Near Indian Petrol Pump, Vijayipur");
 const [pickupCity, setPickupCity] = useState("Gopalganj");
 const [pickupState, setPickupState] = useState("Bihar");
 const [pickupPin, setPickupPin] = useState("841508");
 const [pickupPhone, setPickupPhone] = useState("8092024066");
 const [sellerName, setSellerName] = useState("Apana Enterprises");

 // Refund modal
 const [refundPayment, setRefundPayment] = useState<Payment | null>(null);
 const [refundAmount, setRefundAmount] = useState(""); // rupees, empty = full
 const [refundReason, setRefundReason] = useState("");

 // Delivery OTP Verification modal
 const [otpOpen, setOtpOpen] = useState(false);
 const [deliveryOtpInput, setDeliveryOtpInput] = useState("");
 const [otpVerifying, setOtpVerifying] = useState(false);

 // IMEI / Serials & Manual Invoice modal
 const [fulfillmentOpen, setFulfillmentOpen] = useState(false);
 const [itemSerials, setItemSerials] = useState<Record<string, string>>({});
 const [itemImeis, setItemImeis] = useState<Record<string, string>>({});
 const [manualInvoiceUrl, setManualInvoiceUrl] = useState("");
 const [fulfillmentSaving, setFulfillmentSaving] = useState(false);
 const [uploadingBill, setUploadingBill] = useState(false);

 // Return Requests on this order
 interface OrderReturnRow {
  id: string;
  return_number: string | null;
  product_name: string | null;
  qty: number;
  reason: string;
  status: string;
  refund_amount: number;
  requested_at: string;
 }
 const [orderReturns, setOrderReturns] = useState<OrderReturnRow[]>([]);
 const [createReturnOpen, setCreateReturnOpen] = useState(false);
 const [retItemId, setRetItemId] = useState("");
 const [retQty, setRetQty] = useState(1);
 const [retReason, setRetReason] = useState("DEFECTIVE");
 const [retNote, setRetNote] = useState("");
 const [retBypassWindow, setRetBypassWindow] = useState(false);
 const [retSaving, setRetSaving] = useState(false);

 const load = useCallback(async () => {
 if (!id) return;
 try {
 setLoading(true);
 setError(null);
 const [o, p] = await Promise.all([
 apiClient.get<Order>(`/orders/${id}`),
 apiClient.get<{ items: Payment[] }>(`/payments?order_id=${id}`).catch(() => ({ items: [] as Payment[] })),
 ]);
 // Every render path below reads`order.items.length`/`.map`, so
 // normalize once here — a payload without`items`must not be able to
 // crash the page with"Cannot read properties of undefined (reading
 // 'length')".
 setOrder({ ...o, items: Array.isArray(o?.items) ? o.items : [] });
 setPayments(Array.isArray(p?.items) ? p.items : []);
 apiClient
 .get<OrderNote[]>(`/orders/${id}/notes`)
 .then((n) => setNotes(Array.isArray(n) ? n : []))
 .catch(() => setNotes([]));
 apiClient
 .get<{ items: OrderReturnRow[] }>(`/orders/${id}/return-requests`)
 .then((r) => setOrderReturns(Array.isArray(r?.items) ? r.items : []))
 .catch(() => setOrderReturns([]));
 apiClient.get<any>("/admin/store-settings").then((cfg) => {
 if (cfg?.pickup_location) {
 setPickupName(cfg.pickup_location.name ||"ELEKTRIX");
 setPickupAdd(cfg.pickup_location.add ||"DS1, 109, Near Indian Petrol Pump, Vijayipur");
 setPickupCity(cfg.pickup_location.city ||"Gopalganj");
 setPickupState(cfg.pickup_location.state ||"Bihar");
 setPickupPin(cfg.pickup_location.pin_code ||"841508");
 setPickupPhone(cfg.pickup_location.phone ||"8092024066");
 }
 }).catch(() => {});
 } catch (err) {
 setError(err instanceof ApiError ?`${err.message}${err.code ?`(${err.code})`:""}`:"Failed to load order");
 } finally {
 setLoading(false);
 }
 }, [id]);

 useEffect(() => {
 load();
 }, [load]);

 const addNote = async () => {
 if (!newNote.trim()) return;
 setNoteSaving(true);
 try {
 await apiClient.post(`/orders/${id}/notes`, { body: newNote.trim() });
 setNotes(await apiClient.get<OrderNote[]>(`/orders/${id}/notes`));
 setNewNote("");
 toast.success("Note added");
 } catch (err) {
 toast.error(err instanceof ApiError ? err.message :"Failed to add note");
 } finally {
 setNoteSaving(false);
 }
 };

 const verifyDeliveryOtp = async () => {
 if (!deliveryOtpInput.trim()) {
 toast.error("Please enter the 6-digit customer OTP");
 return;
 }
 setOtpVerifying(true);
 try {
 const updated = await apiClient.post<Order>(`/orders/${id}/verify-delivery-otp`, {
 otp: deliveryOtpInput.trim(),
 });
 setOrder(updated);
 toast.success("Delivery verified! Tax Invoice generated successfully.");
 setOtpOpen(false);
 setDeliveryOtpInput("");
 load();
 } catch (err: any) {
 toast.error(err instanceof ApiError ? err.message :"Failed to verify OTP");
 } finally {
 setOtpVerifying(false);
 }
 };

 const handleDownloadInvoice = async () => {
 if (!order?.id) return;
 // Admin keeps its session in the`access_token`cookie, not localStorage.
 // Reading localStorage here sent no header at all, so the API saw an
 // anonymous request and answered 404"Order not found".
 const token = getAccessToken();
 const base = process.env.NEXT_PUBLIC_API_URL ||"https://api.elektrix.in/api/v1";
 try {
 // Fetch with a Bearer header and open a blob URL instead of putting the
 // token in a query string: the URL form leaked the JWT into proxy logs
 // and browser history, and returned 404 because the session had no RLS
 // context.
 const res = await fetch(`${base}/orders/${order.id}/invoice`, {
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
 const url = URL.createObjectURL(new Blob([html], { type:"text/html" }));
 window.open(url,"_blank");
 setTimeout(() => URL.revokeObjectURL(url), 60_000);
 } catch (err) {
 toast.error(err instanceof Error ? err.message :"Could not open invoice");
 }
 };

 const saveFulfillmentDetails = async () => {
 setFulfillmentSaving(true);
 try {
 const serialsPayload: Record<string, string[]> = {};
 for (const [itemId, textVal] of Object.entries(itemSerials)) {
 if (textVal && textVal.trim()) {
 serialsPayload[itemId] = textVal.split(",").map((s) => s.trim()).filter(Boolean);
 }
 }
 const imeisPayload: Record<string, string[]> = {};
 for (const [itemId, textVal] of Object.entries(itemImeis)) {
 if (textVal && textVal.trim()) {
 imeisPayload[itemId] = textVal.split(",").map((s) => s.trim()).filter(Boolean);
 }
 }
 const updated = await apiClient.post<Order>(`/orders/${id}/fulfillment`, {
 manual_invoice_url: manualInvoiceUrl.trim() || null,
 item_serials: Object.keys(serialsPayload).length > 0 ? serialsPayload : null,
 item_imeis: Object.keys(imeisPayload).length > 0 ? imeisPayload : null,
 });
 setOrder(updated);
 toast.success("Product serials, IMEIs, and invoice details saved!");
 setFulfillmentOpen(false);
 load();
 } catch (err) {
 toast.error(err instanceof ApiError ? err.message :"Failed to save details");
 } finally {
 setFulfillmentSaving(false);
 }
 };

 const submitDelhiveryShipment = async () => {
 if (!order) return;
 setDelhiveryLoading(true);
 try {
 const payload = {
 pickup_location: {
 name: pickupName.trim() ||"ELEKTRIX",
 add: pickupAdd.trim(),
 city: pickupCity.trim(),
 state: pickupState.trim(),
 pin_code: pickupPin.trim(),
 phone: pickupPhone.trim(),
 },
 seller_name: sellerName.trim() ||"Apana Enterprises",
 };
 const updated = await apiClient.post<Order>(`/orders/${order.id}/ship-delhivery`, payload);
 setOrder(updated);
 toast.success(`Delhivery shipment created! AWB: ${updated.tracking_number ||"Generated"}`);
 setDelhiveryOpen(false);
 load();
 } catch (err: any) {
 toast.error(err instanceof ApiError ? err.message : err.response?.data?.detail ||"Delhivery integration failed");
 } finally {
 setDelhiveryLoading(false);
 }
 };

 const applyTransition = async (
 target: string,
 extra?: { reason?: string; tracking_number?: string; tracking_url?: string }
 ) => {
 setTransitioning(true);
 try {
 const payload: Record<string, unknown> = { status: target };
 if (extra?.reason) payload.reason = extra.reason;
 if (extra?.tracking_number) payload.tracking_number = extra.tracking_number;
 if (extra?.tracking_url) payload.tracking_url = extra.tracking_url;
 const updated = await apiClient.patch<Order>(`/orders/${id}/status`, payload);
 setOrder(updated);
 toast.success(`Order moved to ${target}`);
 // Money already captured on a cancelled order? Offer the refund
 // immediately — the admin decides the amount and reason, nothing is
 // refunded automatically by this prompt.
 if (target ==="CANCELLED") {
 const paid = payments.find(
 (p) => ["SUCCESS","CAPTURED"].includes(p.status?.toUpperCase() ||"")
 );
 if (paid) {
 setRefundPayment(paid);
 setRefundAmount(""); // empty = full refund, editable
 setRefundReason("Order cancelled by admin");
 toast.info("Order cancelled — refund captured money if applicable.");
 }
 }
 load();
 } catch (err) {
 toast.error(err instanceof ApiError ?`${err.message}${err.code ?`(${err.code})`:""}`:"Transition failed");
 } finally {
 setTransitioning(false);
 }
 };

 const submitRefund = async () => {
 if (!refundPayment) return;
 setTransitioning(true);
 try {
 const payload: Record<string, unknown> = {};
 if (refundAmount.trim() !=="") {
 const paise = Math.round(parseFloat(refundAmount.replace(/[₹,\s]/g,"")) * 100);
 if (!Number.isFinite(paise) || paise <= 0) {
 toast.error("Refund amount must be a positive ₹ value");
 setTransitioning(false);
 return;
 }
 payload.amount = paise;
 }
 if (refundReason.trim()) payload.reason = refundReason.trim();
 await apiClient.post(`/payments/${refundPayment.id}/refund`, payload);
 toast.success("Refund issued");
 setRefundPayment(null);
 setRefundAmount("");
 setRefundReason("");
 load();
 } catch (err) {
 toast.error(err instanceof ApiError ?`${err.message}${err.code ?`(${err.code})`:""}`:"Refund failed");
 } finally {
 setTransitioning(false);
 }
 };

 if (loading) {
 return (
 <div className="flex h-64 items-center justify-center">
 <Loader2 className="h-8 w-8 animate-spin text-neutral-500" />
 </div>
 );
 }

 if (error || !order) {
 return (
 <div className="flex flex-col items-center gap-4 rounded-md border border-red-200 bg-red-50 p-10 text-center">
 <AlertCircle className="h-8 w-8 text-red-500" />
 <p className="text-sm font-semibold text-red-700">{error ||"Order not found"}</p>
 <button onClick={() => router.push("/orders")} className="text-sm font-semibold text-red-700 underline">
 Back to orders
 </button>
 </div>
 );
 }

 const actions = NEXT_ACTIONS[order.status?.toUpperCase()] || [];
 const capturedPayments = payments.filter((p) => p.status?.toUpperCase() ==="CAPTURED");
 const addr = order.shipping_address;

 return (
 <div className="flex flex-col gap-6">
 {/* Header */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div className="flex items-center gap-4">
 <Link
 href="/orders"
 className="rounded-md border border-neutral-200 bg-white p-2.5 text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
 >
 <ChevronLeft className="w-5 h-5" />
 </Link>
 <div>
 <div className="flex items-center gap-3">
 <h1 className="font-mono text-xl font-semibold tracking-tight text-neutral-900">{order.order_number || order.id.slice(0, 8)}</h1>
 <OrderStatusBadge status={order.status} />
 </div>
 <p className="mt-0.5 text-sm text-neutral-500">
 Placed {new Date(order.created_at).toLocaleString("en-IN")} · {order.items.length} item{order.items.length === 1 ?"" :"s"}
 </p>
 </div>
 </div>
 <button
 onClick={load}
 disabled={loading}
 className="inline-flex items-center gap-2 self-start rounded-md border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50"
 >
 <RefreshCw className="h-4 w-4" />
 Refresh
 </button>
 </div>

 {/* Timeline / tracking */}
 {(order.tracking_number || order.tracking_url || order.shipped_at || order.delivered_at) && (
 <div className="flex flex-wrap items-center gap-4 rounded-md border border-neutral-200 bg-white px-5 py-4 text-sm">
 {order.shipped_at && (
 <span className="inline-flex items-center gap-2 text-neutral-600">
 <Truck className="h-4 w-4 text-neutral-500" />
 Shipped {new Date(order.shipped_at).toLocaleString("en-IN")}
 </span>
 )}
 {order.delivered_at && (
 <span className="inline-flex items-center gap-2 text-neutral-600">
 <Home className="h-4 w-4 text-emerald-500" />
 Delivered {new Date(order.delivered_at).toLocaleString("en-IN")}
 </span>
 )}
 {order.tracking_number && (
 <span className="inline-flex items-center gap-2 text-neutral-600">
 <Package className="h-4 w-4 text-neutral-400" />
 Tracking: <span className="font-mono">{order.tracking_number}</span>
 </span>
 )}
 {order.tracking_url && (
 <a
 href={order.tracking_url}
 target="_blank"
 rel="noreferrer"
 className="font-semibold text-emerald-700 underline underline-offset-2"
 >
 Open tracking link
 </a>
 )}
 </div>
 )}

 <div className="grid items-start gap-6 lg:grid-cols-3">
 {/* Main column */}
 <div className="min-w-0 space-y-6 lg:col-span-2">
 {/* Items */}
 <section className="overflow-hidden rounded-md border border-neutral-200 bg-white">
 <h2 className="border-b border-neutral-200 px-5 py-4 text-base font-semibold text-neutral-900">Items</h2>
 <div className="overflow-x-auto">
 <table className="w-full text-left text-sm">
 <thead className="bg-neutral-50 border-b border-neutral-200 text-xs font-semibold text-neutral-400">
 <tr>
 <th className="px-5 py-3">Product</th>
 <th className="px-5 py-3">Merchant / Seller</th>
 <th className="px-5 py-3 text-right">Unit Price</th>
 <th className="px-5 py-3 text-right">Qty</th>
 <th className="px-5 py-3 text-right">Subtotal</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-neutral-100">
 {order.items.map((item) => (
 <tr key={item.id}>
 <td className="px-5 py-3.5">
 <Link href={`/products/${item.product_id}`} className="font-semibold text-neutral-900 hover:text-emerald-800">
 {item.product_name}
 </Link>
 {item.variant_name && <p className="text-xs text-neutral-400">{item.variant_name}</p>}
 </td>
 <td className="px-5 py-3.5">
 <span className="inline-flex items-center gap-1.5 text-xs text-neutral-600">
 <Store className="w-3 h-3 text-neutral-400" />
 {item.seller_name || order.seller_name ||"Apana Enterprises"}
 </span>
 </td>
 <td className="px-5 py-3.5 text-right font-mono text-xs text-neutral-600">{formatINR(item.unit_price)}</td>
 <td className="px-5 py-3.5 text-right font-mono text-neutral-700">{item.quantity}</td>
 <td className="px-5 py-3.5 text-right font-semibold text-neutral-900">{formatINR(item.subtotal)}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </section>

 {/* Payments */}
 <section className="overflow-hidden rounded-md border border-neutral-200 bg-white">
 <h2 className="border-b border-neutral-200 px-5 py-4 text-base font-semibold text-neutral-900">Payments</h2>
 {payments.length === 0 ? (
 <p className="px-5 py-8 text-center text-sm text-neutral-400">
 No payment records{order.payment_method ==="COD" ?"(collect on delivery)" :""}.
 </p>
 ) : (
 <ul className="divide-y divide-neutral-100">
 {payments.map((p) => (
 <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
 <div className="flex flex-wrap items-center gap-3">
 <span className="font-semibold text-neutral-900">{formatINR(p.amount)}</span>
 <PaymentStatusBadge status={p.status} />
 <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-xs font-semibold text-neutral-500">
 {p.provider}
 </span>
 {p.provider_payment_id && (
 <span className="font-mono text-xs text-neutral-500" title="Gateway payment ID">
 {p.provider_payment_id}
 </span>
 )}
 {p.metadata_info?.txnid && (
 <span className="font-mono text-xs text-neutral-400" title="Transaction ID">
 txn:{p.metadata_info.txnid}
 </span>
 )}
 <span className="font-mono text-xs text-neutral-400">{p.id.slice(0, 8)}</span>
 </div>
 <div className="flex items-center gap-3">
 <span className="font-mono text-xs text-neutral-400">
 {new Date(p.created_at).toLocaleString("en-IN")}
 </span>
 {["CAPTURED","SUCCESS"].includes(p.status?.toUpperCase() ||"") && (
 <button
 onClick={() => {
 setRefundPayment(p);
 setRefundAmount("");
 setRefundReason("");
 }}
 disabled={transitioning}
 className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
 >
 <RotateCcw className="h-3.5 w-3.5" /> Refund
 </button>
 )}
 </div>
 </li>
 ))}
 </ul>
 )}
 </section>

 {orderReturns.length > 0 && (
 <section className="rounded-md border border-neutral-200 bg-white p-5">
 <div className="mb-3 flex items-center justify-between gap-2">
 <h2 className="text-base font-semibold text-neutral-900">Return Requests</h2>
 <Link href="/returns" className="text-xs font-semibold text-emerald-800 hover:underline">
 Manage in Returns Queue
 </Link>
 </div>
 <ul className="space-y-2.5">
 {orderReturns.map((rr) => (
 <li key={rr.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-neutral-100 bg-neutral-50 px-3.5 py-2.5">
 <div className="min-w-0">
 <div className="flex flex-wrap items-center gap-2">
 <span className="font-mono text-xs font-semibold text-neutral-900">{rr.return_number || rr.id.slice(0, 8)}</span>
 <ReturnStatusBadge status={rr.status} />
 <span className="text-xs text-neutral-500">{RETURN_REASON_LABELS[rr.reason] || rr.reason}</span>
 </div>
 <p className="mt-0.5 text-xs text-neutral-700">
 {rr.product_name || "Item"} &times; {rr.qty} &middot; Refund {formatINR(rr.refund_amount)}
 </p>
 </div>
 <span className="font-mono text-xs text-neutral-400">
 {new Date(rr.requested_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
 </span>
 </li>
 ))}
 </ul>
 </section>
 )}

 {/* Internal notes (staff-only) */}
 <section className="rounded-md border border-neutral-200 bg-white p-5">
 <h2 className="mb-1 text-base font-semibold text-neutral-900">Internal Notes</h2>
 <p className="mb-3 text-xs text-neutral-400">Visible to staff only — customers never see these.</p>
 {notes.length > 0 ? (
 <ul className="mb-4 space-y-3">
 {notes.map((n) => (
 <li key={n.id} className="rounded-md bg-neutral-50 border border-neutral-100 px-4 py-3">
 <p className="text-sm text-neutral-800 whitespace-pre-wrap">{n.body}</p>
 <p className="mt-1 text-xs text-neutral-400">
 {n.author_name ||"Staff"}{n.created_at ?`· ${new Date(n.created_at).toLocaleString("en-IN", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" })}`:""}
 </p>
 </li>
 ))}
 </ul>
 ) : (
 <p className="mb-4 text-sm text-neutral-400">No internal notes yet.</p>
 )}
 <textarea
 value={newNote}
 onChange={(e) => setNewNote(e.target.value)}
 placeholder="e.g. customer called — reshipping on Monday"
 className="ex-input min-h-[70px] w-full rounded-md border border-neutral-200 px-3 text-sm text-neutral-900"
 />
 <button
 onClick={addNote}
 disabled={noteSaving || !newNote.trim()}
 className="mt-2 inline-flex items-center gap-2 rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-700 disabled:opacity-50"
 >
 {noteSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
 Add note
 </button>
 </section>
 </div>

 {/* Side column */}
 <div className="min-w-0 space-y-6">
 {/* Status actions */}
 <section className="rounded-md border border-neutral-200 bg-white p-5">
 <h2 className="mb-3 text-base font-semibold text-neutral-900">Actions</h2>
 <div className="flex flex-col gap-2">
 {actions.map((action) => (
 <button
 key={action.label}
 onClick={() => {
 if (action.delhivery) {
 setDelhiveryOpen(true);
 } else if (action.tracking) {
 setTrackingNumber("");
 setTrackingUrl("");
 setShipOpen(true);
 } else if (action.otp) {
 setDeliveryOtpInput("");
 setOtpOpen(true);
 } else if (action.reason) {
 setCancelReason("");
 setCancelOpen(true);
 } else {
 applyTransition(action.target);
 }
 }}
 disabled={transitioning}
 className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
 action.style ==="primary"
 ?"bg-neutral-900 hover:bg-neutral-700 text-white hover:bg-neutral-700"
 : action.style ==="brand"
 ?"bg-neutral-900 text-white hover:bg-black"
 : action.style ==="danger"
 ?"border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
 :"border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
 }`}
 >
 {action.delhivery ? <Truck className="h-4 w-4" /> : action.otp ? <KeyRound className="h-4 w-4" /> : action.style ==="danger" ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
 {action.label}
 </button>
 ))}

 {order.status ==="DELIVERED" && (
 <button
 type="button"
 onClick={handleDownloadInvoice}
 className="inline-flex items-center justify-center gap-2 rounded-md bg-neutral-900 text-white px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-700 transition-colors text-center cursor-pointer"
 >
 <FileText className="h-4 w-4" /> Download Official Tax Invoice
 </button>
 )}

 {(order.status ==="DELIVERED" || order.status ==="RETURNED") && order.items.length > 0 && (
 <button
 type="button"
 onClick={() => {
 setRetItemId(order.items[0].id);
 setRetQty(1);
 setRetReason("DEFECTIVE");
 setRetNote("");
 setRetBypassWindow(false);
 setCreateReturnOpen(true);
 }}
 className="inline-flex items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 transition-colors cursor-pointer"
 >
 <RotateCcw className="h-4 w-4" /> Create Return Request
 </button>
 )}

 {order.manual_invoice_url && (
 <a
 href={order.manual_invoice_url}
 target="_blank"
 rel="noreferrer"
 className="inline-flex items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors text-center"
 >
 <ExternalLink className="h-4 w-4" /> View Store Receipt / Bill
 </a>
 )}

 <button
 type="button"
 onClick={() => {
 const initialSerials: Record<string, string> = {};
 const initialImeis: Record<string, string> = {};
 for (const item of order.items) {
 initialSerials[item.id] = (item.serial_numbers || []).join(",");
 initialImeis[item.id] = (item.imei_numbers || []).join(",");
 }
 setItemSerials(initialSerials);
 setItemImeis(initialImeis);
 setManualInvoiceUrl(order.manual_invoice_url ||"");
 setFulfillmentOpen(true);
 }}
 className="inline-flex items-center justify-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
 >
 <Barcode className="h-3.5 w-3.5" /> Product Serials / IMEI & Bill
 </button>

 {actions.length === 0 && (
 <p className="rounded-md border border-dashed border-neutral-200 p-3 text-center text-xs text-neutral-400">
 {order.status ==="REFUNDED" || order.status ==="CANCELLED" ?"This order is in a terminal state." :"No further actions."}
 </p>
 )}
 {order.status ==="DELIVERED" && capturedPayments.length > 0 && (
 <p className="text-center text-xs text-neutral-400">Use “Refund” on a captured payment below to refund this order.</p>
 )}
 </div>
 </section>

 {/* Totals */}
 <section className="rounded-md border border-neutral-200 bg-white p-5">
 <h2 className="mb-3 text-base font-semibold text-neutral-900">Totals</h2>
 <dl className="space-y-2 text-sm">
 <div className="flex justify-between">
 <dt className="text-neutral-500">Subtotal</dt>
 <dd className="font-mono text-neutral-800">{formatINR(order.subtotal)}</dd>
 </div>
 {order.discount_total > 0 && (
 <div className="flex justify-between">
 <dt className="inline-flex items-center gap-1 text-neutral-500">
 Discount
 {order.coupon_code && (
 <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-xs font-semibold text-emerald-700">
 <Ticket className="h-2.5 w-2.5" />
 {order.coupon_code}
 </span>
 )}
 </dt>
 <dd className="font-mono text-emerald-600">-{formatINR(order.discount_total)}</dd>
 </div>
 )}
 <div className="flex justify-between">
 <dt className="text-neutral-500">Shipping</dt>
 <dd className="font-mono text-neutral-800">{order.shipping_total > 0 ? formatINR(order.shipping_total) :"Free"}</dd>
 </div>
 <div className="flex justify-between">
 <dt className="text-neutral-500">Tax</dt>
 <dd className="font-mono text-neutral-800">{formatINR(order.tax_total)}</dd>
 </div>
 <div className="flex justify-between border-t border-neutral-200 pt-2.5">
 <dt className="font-semibold text-neutral-900">Total</dt>
 <dd className="font-mono text-base font-semibold text-neutral-900">{formatINR(order.total)}</dd>
 </div>
 </dl>
 <div className="mt-3 flex items-center gap-2">
 <PaymentMethodBadge method={order.payment_method} />
 {order.payment_status && <PaymentStatusBadge status={order.payment_status} />}
 </div>
 </section>

 {/* Customer + address */}
 <section className="rounded-md border border-neutral-200 bg-white p-5">
 <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-neutral-900">
 <MapPin className="h-4 w-4 text-neutral-500" />
 Customer &amp; Address
 </h2>
 {addr ? (
 <div className="space-y-1 text-sm text-neutral-600">
 <p className="font-semibold text-neutral-900">{addr.full_name ||"—"}</p>
 {addr.phone && <p className="font-mono text-xs">{addr.phone}</p>}
 <p>
 {addr.line1}
 {addr.line2 ?`, ${addr.line2}`:""}
 </p>
 <p>
 {addr.city}
 {addr.state ?`, ${addr.state}`:""} {addr.pincode}
 </p>
 <p className="text-xs text-neutral-400">{addr.country ||"IN"}</p>
 </div>
 ) : (
 <p className="text-sm text-neutral-400">No address snapshot on this order.</p>
 )}

 <div className="mt-4 pt-4 border-t border-neutral-100">
 <div className="flex items-center justify-between mb-2">
 <h3 className="text-sm font-semibold text-neutral-900">Notes & Complaints</h3>
 </div>
 <textarea
 className="ex-input w-full rounded-md border border-neutral-200 bg-white p-3 text-sm text-neutral-900 placeholder-neutral-400"
 rows={3}
 placeholder="Log internal notes, customer complaints, or special instructions here..."
 defaultValue={order.notes ||""}
 onBlur={async (e) => {
 if (e.target.value === (order.notes ||"")) return;
 try {
 await apiClient.patch(`/orders/${order.id}/notes`, { notes: e.target.value });
 toast.success("Notes updated");
 } catch (err) {
 toast.error("Failed to update notes");
 }
 }}
 />
 <p className="text-xs text-neutral-500 mt-1">Changes are saved automatically when you click outside.</p>
 </div>
 </section>
 </div>
 </div>

 {/* Ship modal */}
 <Modal
 open={shipOpen}
 onClose={() => setShipOpen(false)}
 title="Mark order as shipped"
 footer={
 <>
 <button
 onClick={() => setShipOpen(false)}
 className="rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
 >
 Cancel
 </button>
 <button
 onClick={() => {
 setShipOpen(false);
 applyTransition("SHIPPED", {
 tracking_number: trackingNumber.trim() || undefined,
 tracking_url: trackingUrl.trim() || undefined,
 });
 }}
 className="inline-flex items-center gap-2 rounded-md bg-neutral-900 hover:bg-neutral-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-neutral-700"
 >
 <Truck className="h-4 w-4" /> Ship Order
 </button>
 </>
 }
 >
 <div className="space-y-3">
 <p className="text-xs text-neutral-500">Tracking details are optional but recommended — they are emailed to the customer.</p>
 <div>
 <label className="mb-1.5 block text-sm font-semibold text-neutral-700">Tracking number</label>
 <input
 value={trackingNumber}
 onChange={(e) => setTrackingNumber(e.target.value)}
 placeholder="e.g. 1234567890"
 className="ex-input w-full rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-900"
 />
 </div>
 <div>
 <label className="mb-1.5 block text-sm font-semibold text-neutral-700">Tracking URL</label>
 <input
 value={trackingUrl}
 onChange={(e) => setTrackingUrl(e.target.value)}
 placeholder="https://courier.example/track/..."
 className="ex-input w-full rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-900"
 />
 </div>
 </div>
 </Modal>

 {/* Cancel modal */}
 <Modal
 open={cancelOpen}
 onClose={() => setCancelOpen(false)}
 title="Cancel order"
 footer={
 <>
 <button
 onClick={() => setCancelOpen(false)}
 className="rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
 >
 Keep Order
 </button>
 <button
 onClick={() => {
 setCancelOpen(false);
 applyTransition("CANCELLED", { reason: cancelReason.trim() ||"Cancelled by store" });
 }}
 className="inline-flex items-center gap-2 rounded-md border border-red-300 bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
 >
 <XCircle className="h-4 w-4" /> Cancel Order
 </button>
 </>
 }
 >
 <div className="space-y-3">
 <p className="text-xs text-neutral-500">
 Cancelling releases reserved stock (and restocks confirmed COD orders). This cannot be undone.
 </p>
 <div>
 <label className="mb-1.5 block text-sm font-semibold text-neutral-700">Reason</label>
 <input
 value={cancelReason}
 onChange={(e) => setCancelReason(e.target.value)}
 placeholder="e.g. customer request, out of stock"
 className="ex-input w-full rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-900"
 />
 </div>
 </div>
 </Modal>

 {/* Delhivery Express Manifest Modal */}
 <Modal
 open={delhiveryOpen}
 onClose={() => !delhiveryLoading && setDelhiveryOpen(false)}
 title="Ship via Delhivery B2C Express"
 footer={
 <>
 <button
 onClick={() => setDelhiveryOpen(false)}
 disabled={delhiveryLoading}
 className="rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors disabled:opacity-50"
 >
 Cancel
 </button>
 <button
 onClick={submitDelhiveryShipment}
 disabled={delhiveryLoading}
 className="inline-flex items-center gap-2 rounded-md bg-neutral-900 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-black disabled:opacity-50"
 >
 {delhiveryLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4 text-neutral-400" />}
 {delhiveryLoading ?"Manifesting..." :"Confirm & Generate AWB"}
 </button>
 </>
 }
 >
 <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
 {/* Destination Preview */}
 <div className="rounded-md border border-neutral-200 bg-neutral-50/70 p-3.5 text-xs space-y-1.5">
 <div className="flex items-center justify-between">
 <span className="font-semibold text-neutral-800 flex items-center gap-1.5">
 <MapPin className="h-3.5 w-3.5 text-emerald-700" /> Destination Customer
 </span>
 <span className="font-semibold px-2 py-0.5 rounded bg-white border border-neutral-200 text-neutral-700">
 {order?.payment_method ==="ONLINE" ?"PRE-PAID" :`COD: ${formatINR(order?.total || 0)}`}
 </span>
 </div>
 <p className="font-medium text-neutral-900">{addr?.full_name ||"Customer"}</p>
 <p className="text-neutral-600">
 {addr?.line1}{addr?.line2 ?`, ${addr.line2}`:""}, {addr?.city}, {addr?.state} — {addr?.pincode}
 </p>
 <p className="text-neutral-500 font-mono">Phone: {addr?.phone ||"Not specified"}</p>
 </div>

 {/* Pickup Warehouse / Multi-seller Origin Form */}
 <div className="space-y-3">
 <div className="flex items-center justify-between">
 <label className="text-xs font-semibold text-neutral-700">
 Pickup Origin Warehouse
 </label>
 <span className="text-xs text-neutral-500 border border-neutral-200 rounded px-2 py-0.5">
 Multi-Seller / Drop-shipping Ready
 </span>
 </div>
 <p className="text-xs text-neutral-500">
 The warehouse name must match the name registered in your Delhivery Client Portal.
 </p>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="mb-1 block text-xs font-semibold text-neutral-700">Warehouse Name</label>
 <input
 value={pickupName}
 onChange={(e) => setPickupName(e.target.value)}
 placeholder="e.g. ELEKTRIX"
 className="ex-input w-full rounded-md border border-neutral-200 bg-white px-3 text-xs text-neutral-900"
 />
 </div>
 <div>
 <label className="mb-1 block text-xs font-semibold text-neutral-700">Seller / Vendor Name</label>
 <input
 value={sellerName}
 onChange={(e) => setSellerName(e.target.value)}
 placeholder="e.g. ELEKTRIX"
 className="ex-input w-full rounded-md border border-neutral-200 bg-white px-3 text-xs text-neutral-900"
 />
 </div>
 </div>

 <div>
 <label className="mb-1 block text-xs font-semibold text-neutral-700">Pickup Street Address</label>
 <input
 value={pickupAdd}
 onChange={(e) => setPickupAdd(e.target.value)}
 placeholder="e.g. DS1, 109, Near Indian Petrol Pump, Vijayipur"
 className="ex-input w-full rounded-md border border-neutral-200 bg-white px-3 text-xs text-neutral-900"
 />
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="mb-1 block text-xs font-semibold text-neutral-700">City</label>
 <input
 value={pickupCity}
 onChange={(e) => setPickupCity(e.target.value)}
 placeholder="e.g. Gopalganj"
 className="ex-input w-full rounded-md border border-neutral-200 bg-white px-3 text-xs text-neutral-900"
 />
 </div>
 <div>
 <label className="mb-1 block text-xs font-semibold text-neutral-700">State</label>
 <input
 value={pickupState}
 onChange={(e) => setPickupState(e.target.value)}
 placeholder="e.g. Bihar"
 className="ex-input w-full rounded-md border border-neutral-200 bg-white px-3 text-xs text-neutral-900"
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="mb-1 block text-xs font-semibold text-neutral-700">Origin Pincode</label>
 <input
 value={pickupPin}
 onChange={(e) => setPickupPin(e.target.value)}
 placeholder="e.g. 841508"
 maxLength={6}
 className="ex-input w-full rounded-md border border-neutral-200 bg-white px-3 text-xs text-neutral-900 font-mono"
 />
 </div>
 <div>
 <label className="mb-1 block text-xs font-semibold text-neutral-700">Warehouse Phone</label>
 <input
 value={pickupPhone}
 onChange={(e) => setPickupPhone(e.target.value)}
 placeholder="10-digit mobile"
 maxLength={10}
 className="ex-input w-full rounded-md border border-neutral-200 bg-white px-3 text-xs text-neutral-900 font-mono"
 />
 </div>
 </div>
 </div>
 </div>
 </Modal>

 {/* Refund modal */}
 <Modal
 open={!!refundPayment}
 onClose={() => setRefundPayment(null)}
 title="Refund payment"
 footer={
 <>
 <button
 onClick={() => setRefundPayment(null)}
 className="rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
 >
 Cancel
 </button>
 <button
 onClick={submitRefund}
 disabled={transitioning}
 className="inline-flex items-center gap-2 rounded-md border border-red-300 bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
 >
 <RotateCcw className="h-4 w-4" /> Confirm Refund
 </button>
 </>
 }
 >
 {refundPayment && (
 <div className="space-y-3">
 <p className="text-sm text-neutral-600">
 Refund payment <span className="font-mono text-xs">{refundPayment.id.slice(0, 8)}</span> of{""}
 <span className="font-semibold">{formatINR(refundPayment.amount)}</span>. Leave the amount empty for a full refund.
 </p>
 <div>
 <label className="mb-1.5 block text-sm font-semibold text-neutral-700">Amount (₹, optional)</label>
 <div className="relative">
 <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400">₹</span>
 <input
 type="number"
 min="0"
 step="0.01"
 value={refundAmount}
 onChange={(e) => setRefundAmount(e.target.value)}
 placeholder={`full refund (${formatINR(refundPayment.amount)})`}
 className="ex-input w-full rounded-md border border-neutral-200 bg-white pl-8 pr-3 text-sm text-neutral-900"
 />
 </div>
 </div>
 <div>
 <label className="mb-1.5 block text-sm font-semibold text-neutral-700">Reason (optional)</label>
 <input
 value={refundReason}
 onChange={(e) => setRefundReason(e.target.value)}
 placeholder="e.g. damaged item"
 className="ex-input w-full rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-900"
 />
 </div>
 </div>
 )}
 </Modal>

 {/* Delivery OTP Verification modal */}
 <Modal
 open={otpOpen}
 onClose={() => setOtpOpen(false)}
 title="Verify Customer Delivery OTP"
 footer={
 <>
 <button
 onClick={() => setOtpOpen(false)}
 className="rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
 >
 Cancel
 </button>
 <button
 onClick={verifyDeliveryOtp}
 disabled={otpVerifying || !deliveryOtpInput.trim()}
 className="inline-flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
 >
 {otpVerifying ?"Verifying..." :"Verify & Complete Delivery"}
 </button>
 </>
 }
 >
 <div className="space-y-4">
 <p className="text-sm text-neutral-600">
 Ask the customer for the 6-digit delivery OTP sent to their mobile number/WhatsApp upon delivery.
 </p>
 <div>
 <label className="mb-1.5 block text-xs font-semibold text-neutral-600">
 6-Digit Customer Delivery OTP
 </label>
 <input
 type="text"
 maxLength={6}
 value={deliveryOtpInput}
 onChange={(e) => setDeliveryOtpInput(e.target.value.replace(/\D/g,""))}
 placeholder="Enter 6-digit OTP from customer"
 className="ex-input w-full rounded-md border border-neutral-200 bg-neutral-50 px-4 text-center font-mono text-xl font-semibold tracking-widest text-neutral-900 focus:bg-white"
 autoFocus
 />
 </div>
 <p className="text-xs text-neutral-500 italic">
 Customer must provide this OTP at physical handover/open-box inspection. The delivery cannot be completed without customer verification.
 </p>
 </div>
 </Modal>

 {/* Product Serials / IMEI & Manual Invoice modal */}
 <Modal
 open={fulfillmentOpen}
 onClose={() => setFulfillmentOpen(false)}
 title="Product Serials / IMEI & Store Invoice"
 footer={
 <>
 <button
 onClick={() => setFulfillmentOpen(false)}
 className="rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
 >
 Cancel
 </button>
 <button
 onClick={saveFulfillmentDetails}
 disabled={fulfillmentSaving || uploadingBill}
 className="inline-flex items-center gap-2 rounded-md border border-neutral-900 bg-neutral-900 text-white px-4 py-2 text-sm font-semibold text-neutral-900 transition-colors hover:bg-amber-400 disabled:opacity-50"
 >
 {fulfillmentSaving ?"Saving..." :"Save Details"}
 </button>
 </>
 }
 >
 <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
 <p className="text-sm text-neutral-600">
 Add serial numbers and IMEIs in separate fields below. Both are optional. If skipped, the invoice will be generated without them. You can also upload a manual store invoice/bill to Cloudflare R2.
 </p>

 <div className="space-y-4">
 <h3 className="text-xs font-semibold text-neutral-500">Order Items</h3>
 {order?.items?.map((item) => (
 <div key={item.id} className="rounded-md border border-neutral-200 p-3 bg-neutral-50/50 space-y-2">
 <div className="flex items-center justify-between text-xs font-semibold text-neutral-900 mb-1">
 <span className="truncate pr-2 font-medium">{item.product_name}</span>
 <span className="text-neutral-500 text-xs">Qty: {item.quantity}</span>
 </div>
 
 {/* Serial Number Box */}
 <div>
 <label className="block text-xs font-medium text-neutral-600 mb-0.5">
 Serial Number(s) <span className="text-neutral-400 font-normal">(Optional)</span>
 </label>
 <input
 type="text"
 placeholder="e.g. SN123456789, SN987654321"
 value={itemSerials[item.id] !== undefined ? itemSerials[item.id] : (item.serial_numbers?.join(",") ||"")}
 onChange={(e) => setItemSerials({ ...itemSerials, [item.id]: e.target.value })}
 className="ex-input h-8 w-full rounded-md border border-neutral-200 bg-white px-2.5 text-xs font-mono text-neutral-900"
 />
 </div>

 {/* IMEI Number Box */}
 <div>
 <label className="block text-xs font-medium text-neutral-600 mb-0.5">
 IMEI Number(s) <span className="text-neutral-400 font-normal">(Optional)</span>
 </label>
 <input
 type="text"
 placeholder="e.g. 864523051234567, 864523051234568"
 value={itemImeis[item.id] !== undefined ? itemImeis[item.id] : (item.imei_numbers?.join(",") ||"")}
 onChange={(e) => setItemImeis({ ...itemImeis, [item.id]: e.target.value })}
 className="ex-input h-8 w-full rounded-md border border-neutral-200 bg-white px-2.5 text-xs font-mono text-neutral-900"
 />
 </div>
 </div>
 ))}
 </div>

 <div className="pt-3 border-t border-neutral-200 space-y-2">
 <label className="block text-xs font-semibold text-neutral-800">
 Manual Counter Bill / Store Invoice (Optional)
 </label>
 <p className="text-xs text-neutral-500">
 Upload a physical counter bill (PDF or image) to Cloudflare R2.
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
 View Uploaded Store Invoice
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
 toast.success("Invoice uploaded to Cloudflare R2!");
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
 placeholder="https://... (Cloudflare R2 or public URL)"
 value={manualInvoiceUrl}
 onChange={(e) => setManualInvoiceUrl(e.target.value)}
 className="ex-input mt-1 h-8 w-full rounded-md border border-neutral-200 bg-white px-2.5 text-xs text-neutral-900"
 />
 </details>
 </div>
 </div>
 </Modal>

 {/* Create Return Request modal */}
 <Modal
 open={createReturnOpen}
 onClose={() => setCreateReturnOpen(false)}
 title="Create return request"
 footer={
 <>
 <button
 type="button"
 onClick={() => setCreateReturnOpen(false)}
 className="rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
 >
 Cancel
 </button>
 <button
 type="button"
 disabled={retSaving || !retItemId}
 onClick={async () => {
 if (!order || !retItemId) return;
 setRetSaving(true);
 try {
 await apiClient.post("/admin/return-requests", {
 order_id: order.id,
 order_item_id: retItemId,
 qty: retQty,
 reason: retReason,
 customer_note: retNote.trim() || undefined,
 bypass_window: retBypassWindow,
 });
 toast.success("Return request created");
 setCreateReturnOpen(false);
 load();
 } catch (err) {
 toast.error(err instanceof ApiError ? err.message : "Failed to create return request");
 } finally {
 setRetSaving(false);
 }
 }}
 className="inline-flex items-center gap-2 rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-700 disabled:opacity-50"
 >
 <RotateCcw className="h-4 w-4" /> {retSaving ? "Creating…" : "Create Return"}
 </button>
 </>
 }
 >
 <div className="space-y-3">
 <div>
 <label className="mb-1.5 block text-xs font-semibold text-neutral-700">Order Item</label>
 <select
 value={retItemId}
 onChange={(e) => {
 setRetItemId(e.target.value);
 setRetQty(1);
 }}
 className="ex-input w-full rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-900"
 >
 {order.items.map((item) => (
 <option key={item.id} value={item.id}>
 {item.product_name} (qty {item.quantity} · {formatINR(item.unit_price)})
 </option>
 ))}
 </select>
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="mb-1.5 block text-xs font-semibold text-neutral-700">Quantity</label>
 <input
 type="number"
 min={1}
 max={order.items.find((i) => i.id === retItemId)?.quantity || 1}
 value={retQty}
 onChange={(e) => setRetQty(Math.max(1, Number(e.target.value) || 1))}
 className="ex-input w-full rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-900"
 />
 </div>
 <div>
 <label className="mb-1.5 block text-xs font-semibold text-neutral-700">Reason</label>
 <select
 value={retReason}
 onChange={(e) => setRetReason(e.target.value)}
 className="ex-input w-full rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-900"
 >
 <option value="DAMAGED">Physically damaged</option>
 <option value="DEFECTIVE">Defective / not working</option>
 <option value="WRONG_ITEM">Wrong item received</option>
 <option value="NOT_AS_DESCRIBED">Not as described</option>
 </select>
 </div>
 </div>
 <div>
 <label className="mb-1.5 block text-xs font-semibold text-neutral-700">Customer Note (optional)</label>
 <textarea
 rows={2}
 value={retNote}
 onChange={(e) => setRetNote(e.target.value)}
 placeholder="Details shared by customer on WhatsApp/phone/email"
 className="w-full rounded-md border border-neutral-200 bg-white p-2.5 text-sm text-neutral-900"
 />
 </div>
 <label className="flex items-center gap-2 text-xs text-neutral-700">
 <input
 type="checkbox"
 checked={retBypassWindow}
 onChange={(e) => setRetBypassWindow(e.target.checked)}
 className="h-4 w-4 rounded border-neutral-300"
 />
 Override 7-day return window (staff exception)
 </label>
 </div>
 </Modal>
 </div>
 );
}

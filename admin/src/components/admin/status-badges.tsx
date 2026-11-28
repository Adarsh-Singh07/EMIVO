import { Badge } from "@/components/ui/badge";

/**
 * Status badges shared across the admin console.
 * Five tones only: neutral, accent (done/success), attention (needs action),
 * danger (failed), progress (in motion). Same status = same tone everywhere.
 */

export function OrderStatusBadge({ status }: { status: string }) {
  // Shared mapping with the storefront account orders page (design-system 4b):
  // same status = same tone on both apps.
  const s = status?.toUpperCase() || "";
  switch (s) {
    case "PENDING":
      return <Badge tone="attention">Pending</Badge>;
    case "CONFIRMED":
      return <Badge tone="progress">Confirmed</Badge>;
    case "PROCESSING":
      return <Badge tone="progress">Processing</Badge>;
    case "PACKED":
      return <Badge tone="progress">Packed</Badge>;
    case "SHIPPED":
      return <Badge tone="progress">Shipped</Badge>;
    case "OUT_FOR_DELIVERY":
      return <Badge tone="progress">Out for delivery</Badge>;
    case "DELIVERED":
      return <Badge tone="accent">Delivered</Badge>;
    case "RETURNED":
      return <Badge tone="attention">Returned</Badge>;
    case "CANCELLED":
      return <Badge tone="danger">Cancelled</Badge>;
    case "REFUNDED":
      return <Badge tone="neutral">Refunded</Badge>;
    default:
      return <Badge>{s || "—"}</Badge>;
  }
}

export function PaymentStatusBadge({ status }: { status: string }) {
  const s = status?.toUpperCase() || "";
  switch (s) {
    case "PENDING":
      return <Badge tone="attention">Pending</Badge>;
    case "CAPTURED":
      return <Badge tone="accent">Captured</Badge>;
    case "FAILED":
      return <Badge tone="danger">Failed</Badge>;
    case "REFUNDED":
      return <Badge tone="neutral">Refunded</Badge>;
    default:
      return <Badge>{s || "—"}</Badge>;
  }
}

export function ProductStatusBadge({ status }: { status: string }) {
  const s = status?.toUpperCase() || "";
  switch (s) {
    case "ACTIVE":
      return <Badge tone="accent">Active</Badge>;
    case "DRAFT":
      return <Badge tone="neutral">Draft</Badge>;
    case "COMING_SOON":
      return <Badge tone="progress">Coming soon</Badge>;
    case "ARCHIVED":
      return <Badge tone="neutral">Archived</Badge>;
    default:
      return <Badge>{s || "—"}</Badge>;
  }
}

export function StockBadge({
  available,
  isLowStock,
  isOutOfStock,
}: {
  available: number;
  isLowStock?: boolean;
  isOutOfStock?: boolean;
}) {
  if (isOutOfStock || available <= 0) return <Badge tone="danger">Out of stock</Badge>;
  if (isLowStock) return <Badge tone="attention">Low · {available}</Badge>;
  return <Badge>{available} in stock</Badge>;
}

export function RoleBadge({ role }: { role: string }) {
  return <Badge>{role}</Badge>;
}

export function PaymentMethodBadge({ method }: { method: string | null | undefined }) {
  const m = method?.toUpperCase() || "";
  if (m === "COD") return <Badge tone="attention">COD</Badge>;
  if (m === "ONLINE") return <Badge>Online</Badge>;
  return <Badge>{m || "—"}</Badge>;
}

export function ReturnStatusBadge({ status }: { status: string }) {
  const s = status?.toUpperCase() || "";
  switch (s) {
    case "REQUESTED":
      return <Badge tone="attention">Requested</Badge>;
    case "APPROVED":
      return <Badge tone="progress">Approved</Badge>;
    case "PICKUP_SCHEDULED":
      return <Badge tone="progress">Pickup scheduled</Badge>;
    case "RETURNED":
      return <Badge tone="attention">Received</Badge>;
    case "REFUNDED":
      return <Badge tone="accent">Refunded</Badge>;
    case "REJECTED":
      return <Badge tone="danger">Rejected</Badge>;
    case "CLOSED":
      return <Badge tone="neutral">Closed</Badge>;
    default:
      return <Badge>{s || "—"}</Badge>;
  }
}

export const RETURN_REASON_LABELS: Record<string, string> = {
  DAMAGED: "Physically damaged",
  DEFECTIVE: "Defective / not working",
  WRONG_ITEM: "Wrong item received",
  NOT_AS_DESCRIBED: "Not as described",
};

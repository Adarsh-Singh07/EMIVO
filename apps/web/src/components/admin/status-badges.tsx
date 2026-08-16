import { cn } from "@/lib/utils";

/**
 * Status badges shared across the admin console.
 * Light theme, matching the dashboard visual language (rounded-full, /10 backgrounds).
 */

type BadgeTone = "amber" | "emerald" | "blue" | "red" | "purple" | "neutral" | "cyan";

const toneClasses: Record<BadgeTone, string> = {
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  red: "bg-red-50 text-red-600 border-red-200",
  purple: "bg-purple-50 text-purple-700 border-purple-200",
  neutral: "bg-neutral-100 text-neutral-600 border-neutral-200",
  cyan: "bg-cyan-50 text-cyan-700 border-cyan-200",
};

function Pill({ tone, children, className }: { tone: BadgeTone; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function OrderStatusBadge({ status }: { status: string }) {
  const s = status?.toUpperCase() || "";
  switch (s) {
    case "PENDING":
      return <Pill tone="amber">Pending</Pill>;
    case "CONFIRMED":
      return <Pill tone="cyan">Confirmed</Pill>;
    case "PROCESSING":
      return <Pill tone="blue">Processing</Pill>;
    case "SHIPPED":
      return <Pill tone="purple">Shipped</Pill>;
    case "DELIVERED":
      return <Pill tone="emerald">Delivered</Pill>;
    case "CANCELLED":
      return <Pill tone="red">Cancelled</Pill>;
    case "REFUNDED":
      return <Pill tone="neutral">Refunded</Pill>;
    default:
      return <Pill tone="neutral">{s || "—"}</Pill>;
  }
}

export function PaymentStatusBadge({ status }: { status: string }) {
  const s = status?.toUpperCase() || "";
  switch (s) {
    case "PENDING":
      return <Pill tone="amber">Pending</Pill>;
    case "CAPTURED":
      return <Pill tone="emerald">Captured</Pill>;
    case "FAILED":
      return <Pill tone="red">Failed</Pill>;
    case "REFUNDED":
      return <Pill tone="purple">Refunded</Pill>;
    default:
      return <Pill tone="neutral">{s || "—"}</Pill>;
  }
}

export function ProductStatusBadge({ status }: { status: string }) {
  const s = status?.toUpperCase() || "";
  switch (s) {
    case "ACTIVE":
      return <Pill tone="emerald">Active</Pill>;
    case "DRAFT":
      return <Pill tone="amber">Draft</Pill>;
    case "ARCHIVED":
      return <Pill tone="neutral">Archived</Pill>;
    default:
      return <Pill tone="neutral">{s || "—"}</Pill>;
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
  if (isOutOfStock || available <= 0) return <Pill tone="red">Out of stock</Pill>;
  if (isLowStock) return <Pill tone="amber">Low · {available}</Pill>;
  return <Pill tone="emerald">{available} in stock</Pill>;
}

export function RoleBadge({ role }: { role: string }) {
  switch (role) {
    case "owner":
      return <Pill tone="purple">{role}</Pill>;
    case "platform_admin":
      return <Pill tone="red">{role}</Pill>;
    case "staff":
      return <Pill tone="blue">{role}</Pill>;
    default:
      return <Pill tone="neutral">{role}</Pill>;
  }
}

export function PaymentMethodBadge({ method }: { method: string | null | undefined }) {
  const m = method?.toUpperCase() || "";
  if (m === "COD") return <Pill tone="amber">COD</Pill>;
  if (m === "ONLINE") return <Pill tone="blue">Online</Pill>;
  return <Pill tone="neutral">{m || "—"}</Pill>;
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Order Tracking",
  description: "Track your ELEKTRIX order — dispatch, in-transit and delivered milestones.",
};

export default function OrderTrackingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

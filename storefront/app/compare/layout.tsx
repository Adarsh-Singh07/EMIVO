import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compare Products",
  description: "Compare specs, prices and offers across ELEKTRIX products side by side.",
};

export default function CompareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

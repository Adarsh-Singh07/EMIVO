import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers about delivery, no-cost EMI, warranty, returns and coupons at ELEKTRIX.",
};

export default function FaqLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

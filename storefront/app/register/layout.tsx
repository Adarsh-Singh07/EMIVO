import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Create your ELEKTRIX account to shop genuine products across our E-commerce marketplace with order tracking and wishlist.",
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

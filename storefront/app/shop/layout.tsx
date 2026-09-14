import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shop",
  description: "Browse genuine smartphones, laptops, appliances, audio and wearables. Filter by price, availability and more.",
};

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

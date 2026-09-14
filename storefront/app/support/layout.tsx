import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Help & Support",
  description: "Raise and track support tickets for your ELEKTRIX orders.",
};

export default function SupportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

import { redirect } from "next/navigation";

export default async function CategoryRedirect({ params }: { params: Promise<{ slug: string }> }) {
  // In a real app, we'd load the specific category.
  // For the demo, we redirect to the main catalog.
  redirect("/products");
}

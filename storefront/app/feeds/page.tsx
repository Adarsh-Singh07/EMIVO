import { notFound } from "next/navigation";

/** Only /feeds/google.xml is a real route; the parent path must not render
 * Vercel's static directory listing. */
export default function FeedsIndex() {
  notFound();
}

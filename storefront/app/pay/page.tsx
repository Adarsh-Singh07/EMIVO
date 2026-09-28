import { notFound } from "next/navigation";

/** Payments live at /pay/[orderId]; the bare /pay path must not render
 * Vercel's static directory listing. */
export default function PayIndex() {
  notFound();
}

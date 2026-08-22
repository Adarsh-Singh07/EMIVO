export const metadata = {
  title: "Refund & Return Policy | ELEKTRIX",
  description: "Refund and Return Policy for ELEKTRIX",
};

export default function RefundPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 md:py-20 text-neutral-800">
      <h1 className="text-3xl font-bold mb-8">Refund & Return Policy</h1>
      
      <div className="prose prose-neutral max-w-none">
        <p><strong>Effective Date:</strong> January 1, 2026</p>

        <h2 className="text-xl font-bold mt-8 mb-4">1. Return Eligibility</h2>
        <p>
          We accept returns within <strong>10 days of delivery</strong> for products that are defective, damaged upon arrival, or incorrect. To be eligible for a return, the item must be unused, in its original packaging, and include all accessories, manuals, and warranty cards.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-4">2. Exclusions</h2>
        <p>The following items cannot be returned:</p>
        <ul className="list-disc pl-6 mb-4">
          <li>Products with physical damage caused by the customer.</li>
          <li>Items with missing original packaging or accessories.</li>
          <li>Digital goods, software, or gift cards.</li>
          <li>Personal care appliances (if unsealed).</li>
        </ul>

        <h2 className="text-xl font-bold mt-8 mb-4">3. Refund Process & Timeline</h2>
        <p>
          Once your return is received and inspected, we will notify you of the approval or rejection of your refund. If approved, refunds are processed within <strong>5-7 business days</strong>.
        </p>
        <ul className="list-disc pl-6 mb-4">
          <li><strong>Prepaid Orders:</strong> Refunded to the original payment method (via Cashfree).</li>
          <li><strong>COD Orders:</strong> Refunded via bank transfer or UPI (details will be collected securely by our support team).</li>
        </ul>

        <h2 className="text-xl font-bold mt-8 mb-4">4. Order Cancellations</h2>
        <p>
          You may cancel your order at any time before it has been shipped. Once an order is marked as <em>Shipped</em>, it cannot be cancelled, but you may refuse delivery or request a return upon receiving it.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-4">5. Contact for Returns</h2>
        <p>
          To initiate a return, please contact our support team at <strong>support@elektrix.in</strong> with your Order ID and photographic evidence of the defect or damage.
        </p>
      </div>
    </div>
  );
}

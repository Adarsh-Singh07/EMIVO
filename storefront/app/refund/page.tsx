export const metadata = {
  title: "Return Policy",
  description: "Return Policy for ELEKTRIX — Easy Replacement on Damaged/Defective Delivery.",
};

export default function RefundPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 md:py-20 text-neutral-800">
      <h1 className="text-3xl font-bold mb-8">Return Policy</h1>
      
      <div className="prose prose-neutral max-w-none">
        <p><strong>Effective Date:</strong> August 22, 2026</p>

        <h2 className="text-xl font-bold mt-8 mb-4">1. Open-Box Delivery Policy</h2>
        <p>
          To ensure complete transparency and prevent fraud, ELEKTRIX mandates an <strong>Open-Box Delivery Policy</strong> for all shipments. You or your authorized receiver MUST open the package and inspect the product in the presence of the delivery executive before accepting the delivery and sharing the delivery OTP.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-4">2. Returns After Acceptance — Damaged or Wrong Items Only</h2>
        <p>
          Once a delivery is accepted following the open-box inspection, returns and refunds are available <strong>only if the product delivered is physically damaged or is a different product from what you ordered</strong>. If you notice damage or a wrong product during the inspection, please do not accept the delivery. If damage is discovered immediately after acceptance, report it to our support team the same day with photos so we can arrange a replacement or a refund. For any other reason, including a change of mind, returns are not accepted after the open-box acceptance — by accepting the package, you confirm that the product was received in good physical condition.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-4">3. Manufacturing Defects & Warranty</h2>
        <p>
          For internal manufacturing defects or technical issues discovered after the device has been powered on, the product is covered by the manufacturer's standard warranty. Customers must visit the respective brand's authorized service center for repairs or replacements. ELEKTRIX does not directly process warranty claims.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-4">4. Order Cancellations</h2>
        <p>
          You may cancel your order at any time before the status changes to <em>Out for Delivery</em>. Once an order is out for delivery, it cannot be cancelled. Refunds for valid online cancellations will be processed to the original payment method (via Cashfree) within <strong>5-7 business days</strong>.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-4">5. Contact Information</h2>
        <p>
          If you face any issues during the open-box delivery process or need assistance with a cancellation, please contact our support team at <strong>support@elektrix.in</strong>.
        </p>
      </div>
    </div>
  );
}

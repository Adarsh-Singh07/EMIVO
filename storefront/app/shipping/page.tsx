export const metadata = {
  title: "Shipping Policy | ELEKTRIX",
  description: "Shipping Policy for ELEKTRIX",
};

export default function ShippingPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 md:py-20 text-neutral-800">
      <h1 className="text-3xl font-bold mb-8">Shipping Policy</h1>
      
      <div className="prose prose-neutral max-w-none">
        <p><strong>Effective Date:</strong> January 1, 2026</p>

        <h2 className="text-xl font-bold mt-8 mb-4">1. Delivery Regions</h2>
        <p>
          ELEKTRIX currently ships to all major pin codes across India. If your area is unserviceable by our courier partners, we will notify you and cancel the order with a full refund.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-4">2. Processing Time</h2>
        <p>
          All orders are processed within <strong>1-2 business days</strong>. Orders are not shipped or delivered on Sundays or public holidays. In case of high order volumes, shipments may be delayed by a few days.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-4">3. Estimated Delivery</h2>
        <p>
          Standard delivery typically takes <strong>3-7 business days</strong> depending on your location. Delivery to remote areas may take longer.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-4">4. Shipping Charges</h2>
        <p>
          Shipping charges for your order will be calculated and displayed at checkout. We offer <strong>free shipping</strong> on prepaid orders above ₹4,999. Cash on Delivery (COD) orders may incur an additional handling fee.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-4">5. Order Tracking</h2>
        <p>
          Once your order has shipped, you will receive a confirmation email containing your tracking number(s). You can also track your order directly on our website using the <strong>Order Tracking</strong> page.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-4">6. Failed Delivery</h2>
        <p>
          Our delivery partners will attempt delivery up to 3 times. If delivery fails due to an incorrect address or unavailability, the package will be returned to us. In such cases, the order will be cancelled and a refund (minus shipping charges) will be issued.
        </p>
      </div>
    </div>
  );
}

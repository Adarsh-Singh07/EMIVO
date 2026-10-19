export const metadata = {
  title: "Terms & Conditions",
  description: "Terms and Conditions for ELEKTRIX",
};

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 md:py-20 text-neutral-800">
      <h1 className="text-3xl font-bold mb-8">Terms & Conditions</h1>
      
      <div className="prose prose-neutral max-w-none">
        <p><strong>Effective Date:</strong> January 1, 2026</p>
        <p>
          Welcome to ELEKTRIX. These Terms & Conditions govern your use of the ELEKTRIX website and services.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-4">1. Use of the Site</h2>
        <p>
          By accessing or using our website, you agree to comply with and be bound by these Terms. You must be at least 18 years old or visiting the site under the supervision of a parent or guardian.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-4">2. Orders and Pricing</h2>
        <p>
          All product prices are subject to change without notice. We reserve the right to limit the quantity of items purchased and to cancel any order for reasons such as limited stock, inaccurate pricing, or suspected fraud.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-4">3. Payments</h2>
        <p>
          All payments on ELEKTRIX are made online through our secure payment partners (such as Cashfree) using UPI, cards, net-banking or EMI. We do not offer Cash on Delivery — an order is confirmed only after successful online payment.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-4">4. Shipping and Delivery</h2>
        <p>
          Delivery timelines are estimates and are not guaranteed. We are not responsible for delays caused by external shipping carriers or unforeseen circumstances.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-4">5. Limitation of Liability</h2>
        <p>
          ELEKTRIX shall not be liable for any indirect, incidental, or consequential damages arising from the use of our products or website. Our liability is limited to the purchase price of the product in question.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-4">6. Governing Law</h2>
        <p>
          These Terms shall be governed by and construed in accordance with the laws of India. Any disputes arising out of these Terms will be subject to the exclusive jurisdiction of the courts in Gopalganj, Bihar.
        </p>
      </div>
    </div>
  );
}

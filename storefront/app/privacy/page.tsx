export const metadata = {
  title: "Privacy Policy | ELEKTRIX",
  description: "Privacy Policy for ELEKTRIX",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 md:py-20 text-neutral-800">
      <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
      
      <div className="prose prose-neutral max-w-none">
        <p><strong>Effective Date:</strong> January 1, 2026</p>

        <h2 className="text-xl font-bold mt-8 mb-4">1. Information We Collect</h2>
        <p>
          At ELEKTRIX, we collect information that you provide directly to us when you create an account, make a purchase, or contact our support. This includes:
        </p>
        <ul className="list-disc pl-6 mb-4">
          <li><strong>Account Information:</strong> Name, email address, password, and phone number.</li>
          <li><strong>Order & Shipping Information:</strong> Delivery addresses, billing addresses, and order history.</li>
          <li><strong>Payment Processing:</strong> All payments are processed securely by our trusted gateway (Cashfree). We do not store raw credit card numbers or sensitive payment details on our servers.</li>
        </ul>

        <h2 className="text-xl font-bold mt-8 mb-4">2. How We Use Your Information</h2>
        <p>We use the information we collect to:</p>
        <ul className="list-disc pl-6 mb-4">
          <li>Process and fulfill your orders, including sending emails regarding your purchase and shipping status.</li>
          <li>Communicate with you about products, services, offers, and promotions (if you have opted into our newsletter).</li>
          <li>Protect against fraudulent transactions and unauthorized access.</li>
        </ul>

        <h2 className="text-xl font-bold mt-8 mb-4">3. Information Sharing</h2>
        <p>
          We do not sell or rent your personal information to third parties. We may share your information with trusted third-party service providers (such as shipping partners and payment gateways) strictly for the purpose of fulfilling your orders.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-4">4. Cookies and Analytics</h2>
        <p>
          We use cookies and similar tracking technologies to track the activity on our Service and hold certain information to improve your browsing experience. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-4">5. Data Security</h2>
        <p>
          We implement a variety of security measures to maintain the safety of your personal information. Your personal information is contained behind secured networks and is only accessible by a limited number of persons who have special access rights to such systems.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-4">6. Your Rights</h2>
        <p>
          Depending on your location, you may have the right to request access to, correction, or deletion of your personal data. Please contact us to exercise these rights.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-4">7. Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy, please contact us at: <br/>
          <strong>Email:</strong> support@elektrix.in<br/>
          <strong>Address:</strong> APANA ENTERPRISES, DS1, 109, Near Indian Petrol Pump, Vijayipur, Gopalganj, Bihar - 841508
        </p>
      </div>
    </div>
  );
}

import Link from "next/link";
import { Globe, MessageCircle, Send, Rss, Mail, Phone, MapPin } from "lucide-react";
import NewsletterForm from "./NewsletterForm";

export default function Footer() {
  return (
    <footer className="bg-neutral-950 text-neutral-300 mt-24">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-16 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
        <div className="col-span-2">
          <Link href="/" className="flex items-center gap-1.5">
            <div className="w-9 h-9 rounded-lg bg-white text-neutral-950 grid place-items-center font-bold">
              E
            </div>
            <span className="text-2xl font-bold text-white">ELEKTRIX</span>
          </Link>
          <p className="mt-5 text-sm max-w-sm text-neutral-400">
            Premium electronics store bringing you the latest mobiles, laptops, appliances and audio
            gear with unbeatable prices and fast delivery.
          </p>
          <div className="mt-6 space-y-2.5 text-sm text-neutral-400">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-neutral-500" /> +91 80920 24066
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-neutral-500" /> support@elektrix.in
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-neutral-500 mt-1 shrink-0" />
              <div>
                <span className="font-semibold text-white">APANA ENTERPRISES</span>
                <br />
                DS1, 109, Near Indian Petrol Pump,
                <br />
                Vijayipur, Gopalganj, Bihar - 841508
              </div>
            </div>
            <div className="text-xs pt-1.5 text-neutral-500 font-mono">
              GSTIN: 10COMPG4070G1ZB
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-4">Shop</h4>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/shop?category=mobiles">Mobiles</Link>
            </li>
            <li>
              <Link href="/shop?category=laptops">Laptops</Link>
            </li>
            <li>
              <Link href="/shop?category=audio">Audio</Link>
            </li>
            <li>
              <Link href="/shop?category=appliances">Appliances</Link>
            </li>
            <li>
              <Link href="/shop?category=wearables">Wearables</Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-4">Company & Legal</h4>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/about">About Us</Link>
            </li>
            <li>
              <Link href="/contact">Contact</Link>
            </li>
            <li>
              <Link href="/faq">FAQ</Link>
            </li>
            <li>
              <Link href="/privacy">Privacy Policy</Link>
            </li>
            <li>
              <Link href="/terms">Terms & Conditions</Link>
            </li>
            <li>
              <Link href="/refund">Return Policy</Link>
            </li>
            <li>
              <Link href="/shipping">Shipping Policy</Link>
            </li>
            <li>
              <Link href="/cookie">Cookie Policy</Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-4">Newsletter</h4>
          <p className="text-sm text-neutral-400 mb-1">Deals, drops and restocks — no spam.</p>
          <NewsletterForm />
          <div className="flex gap-3 mt-6">
            {[Globe, MessageCircle, Send, Rss].map((Ic, k) => (
              <a
                key={k}
                className="w-9 h-9 rounded-full bg-neutral-900 hover:bg-neutral-800 grid place-items-center"
                href="#"
                aria-label="Social link"
              >
                <Ic className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-neutral-900">
        <div className="max-w-[1400px] mx-auto px-4 py-5 text-xs text-neutral-500 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>© {new Date().getFullYear()} ELEKTRIX. All rights reserved.</span>
          <span>Secured by VISA · MasterCard · UPI · Netbanking · COD</span>
        </div>
      </div>
    </footer>
  );
}

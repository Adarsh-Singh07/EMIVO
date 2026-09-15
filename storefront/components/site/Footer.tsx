import Link from "next/link";
import { Mail, Phone, MapPin } from "lucide-react";
import NewsletterForm from "./NewsletterForm";

// Brand glyphs are inline SVGs: this lucide-react build no longer ships
// brand icons (Twitter/Facebook/Instagram/Linkedin were removed upstream).
const XIcon = (p: { className?: string }) => (
  <svg className={p.className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.13l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);
const LinkedInIcon = (p: { className?: string }) => (
  <svg className={p.className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9.351h3.414v1.561h.046c.476-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.936zM5.337 7.433c-1.134 0-2.062-.926-2.062-2.061 0-1.135.928-2.063 2.062-2.063 1.135 0 2.063.928 2.063 2.063 0 1.135-.928 2.061-2.063 2.061zm1.782 13.019H3.555V9.351h3.564v11.101zM22.225 0H1.771C.792 0 0 .774 0 1.719v20.562C0 23.225.792 24 1.771 24h20.451C23.2 24 24 23.225 24 22.281V1.719C24 .774 23.2 0 22.225 0z" />
  </svg>
);
const FacebookIcon = (p: { className?: string }) => (
  <svg className={p.className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.232 2.686.232v2.971h-1.513c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);
const InstagramIcon = (p: { className?: string }) => (
  <svg className={p.className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2.163c3.204 0 3.983.012 5.425.061 1.44.055 2.449.263 3.38.658.94.395 1.74.983 2.49 1.734.75.75 1.339 1.55 1.734 2.49.395.93.603 1.94.658 3.38.048 1.44.06 2.22.06 5.424 0 3.205-.012 3.984-.06 5.425-.055 1.44-.264 2.449-.658 3.38-.395.94-.984 1.74-1.735 2.49-.75.75-1.55 1.339-2.49 1.734-.93.395-1.94.603-3.38.658-1.44.048-2.22.06-5.424.06-3.205 0-3.984-.012-5.425-.06-1.44-.055-2.449-.264-3.38-.658-.94-.395-1.74-.984-2.49-1.734-.75-.75-1.339-1.55-1.734-2.49-.395-.93-.603-1.94-.658-3.38-.048-1.44-.06-2.22-.06-5.424 0-3.205.012-3.984.06-5.425.055-1.44.264-2.449.658-3.38.395-.94.984-1.74 1.734-2.49.75-.75 1.55-1.339 2.49-1.734.93-.395 1.94-.603 3.38-.658 1.44-.048 2.22-.06 5.425-.06zm0 1.338c-3.158 0-3.908.012-5.323.059-1.3.053-2.007.248-2.473.409-.615.219-1.055.48-1.504.93-.45.45-.711.89-.93 1.504-.161.467-.356 1.174-.41 2.473-.047 1.416-.058 2.165-.058 5.324 0 3.158.012 3.908.058 5.323.054 1.3.249 2.007.41 2.473.219.615.48 1.055.93 1.504.45.45.89.711 1.504.93.467.162 1.174.356 2.473.41 1.416.046 2.165.058 5.324.058 3.158 0 3.908-.012 5.323-.058 1.3-.054 2.007-.249 2.473-.41.615-.219 1.055-.48 1.504-.93.45-.45.711-.89.93-1.504.162-.467.356-1.174.41-2.473.046-1.416.058-2.165.058-5.324 0-3.158-.012-3.908-.058-5.323-.054-1.3-.249-2.007-.41-2.473-.219-.615-.48-1.055-.93-1.504-.45-.45-.89-.711-1.504-.93-.467-.162-1.174-.356-2.473-.41-1.416-.046-2.165-.058-5.324-.058zm0 2.59c-3.537 0-6.399 2.862-6.399 6.399 0 3.537 2.862 6.399 6.399 6.399 3.537 0 6.399-2.862 6.399-6.399 0-3.537-2.862-6.399-6.399-6.399zm0 10.573c-2.296 0-4.174-1.859-4.174-4.175S9.704 8.88 12 8.88s4.174 1.859 4.174 4.174-1.858 4.175-4.174 4.175z" />
  </svg>
);

const SOCIAL_LINKS = [
  { label: "Elektrix on X (Twitter)", href: "https://x.com/elektrix_in", Icon: XIcon },
  { label: "Elektrix on LinkedIn", href: "https://www.linkedin.com/company/elektrix-in/", Icon: LinkedInIcon },
  { label: "Elektrix on Facebook", href: "https://www.facebook.com/share/1HaVFzFU7k/", Icon: FacebookIcon },
  { label: "Elektrix on Instagram", href: "https://www.instagram.com/elektrix.in/", Icon: InstagramIcon },
];

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
                <span className="font-semibold text-white">M/S APANA ENTERPRISES</span>
                <br />
                DS1, 109, Near Indian Petrol Pump,
                <br />
                Vijayipur, Gopalganj, Bihar - 841508
              </div>
            </div>
            <div className="text-xs pt-1.5 text-neutral-500 font-mono">
              GSTIN: 10COMPG4070G1ZB
            </div>
            <div className="flex gap-3 pt-3">
              {SOCIAL_LINKS.map(({ label, href, Icon }) => (
                <a
                  key={href}
                  className="w-9 h-9 rounded-full bg-neutral-900 hover:bg-neutral-800 grid place-items-center text-neutral-300 hover:text-white transition-colors"
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
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
              <Link href="/support">Help &amp; Support</Link>
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

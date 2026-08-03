export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  category: string;
  readMins: number;
  body: string[];
}

export const POSTS: BlogPost[] = [
  {
    slug: "iphone-16-pro-review",
    title: "iPhone 16 Pro review: titanium, AI and a camera that keeps up",
    excerpt: "Two weeks with Apple's flagship — is the A18 Pro worth the upgrade?",
    date: "Jul 28, 2026",
    category: "Reviews",
    readMins: 6,
    body: [
      "After two weeks with the iPhone 16 Pro as my daily driver, the headline is simple: this is the most complete iPhone Apple has shipped. The titanium frame shaves real weight, the A18 Pro feels effortless in everything from photo processing to on-device AI, and the camera system finally keeps up with what the hardware promises.",
      "The 48MP Fusion camera is the star. Low-light shots that used to look muddy now come out clean and detailed, and the new 5x telephoto makes portrait photography genuinely fun. Battery life comfortably clears a full day even with the always-on display and heavy camera use.",
      "Is it worth upgrading? If you're on a 14 Pro or older, absolutely. If you're on a 15 Pro, the camera and AI improvements are nice but not essential. Either way, it's the phone to beat this year.",
    ],
  },
  {
    slug: "best-anc-headphones-2026",
    title: "Best noise-cancelling headphones in 2026",
    excerpt: "Sony, Bose and JBL go head to head in our annual ANC shootout.",
    date: "Jul 15, 2026",
    category: "Guides",
    readMins: 8,
    body: [
      "We tested nine pairs of over-ear ANC headphones across a month of commutes, flights and open-plan offices. Three stood out.",
      "The Sony WH-1000XM5 remains the class leader — its noise cancellation is the quietest we've measured, and the 30-hour battery plus speak-to-chat make it the most practical daily companion. The Bose range counters with better comfort for long sessions and a more neutral sound signature.",
      "For budget buyers, the active noise-cancelling RW75 is a knockout at its price, cutting train and office hum with surprising effectiveness. Our full recommendation matrix is below — every one of these is in stock at EMIVO.",
    ],
  },
  {
    slug: "buying-guide-macbook",
    title: "MacBook buying guide: Air M3 vs Pro",
    excerpt: "Which Apple silicon laptop is actually right for your workload?",
    date: "Jun 30, 2026",
    category: "Guides",
    readMins: 5,
    body: [
      "The MacBook Air M3 is the answer for most people. It's fanless, silent, weighs barely anything, and handles everyday productivity, web work and even 4K video editing with room to spare. Eighteen hours of battery means most people charge it every other day.",
      "You only need the Pro if you push sustained workloads — long 4K/8K exports, heavy code compilation, or large data models — where the extra cores and active cooling make a real difference. The Pro's screen and ports are nicer, but it's heavier and pricier.",
      "Rule of thumb: if you can't name the task that would throttle an M3, the Air is the better buy and the savings are real.",
    ],
  },
];

export function getPost(slug: string): BlogPost | undefined {
  return POSTS.find((p) => p.slug === slug);
}

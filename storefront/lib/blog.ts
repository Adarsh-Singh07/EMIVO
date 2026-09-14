export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  category: string;
  readMins: number;
  body: string[];
}

/**
 * Buying guides written for ELEKTRIX customers. Deliberately no first-person
 * "we tested / we measured" claims — these are spec- and use-case-based guides,
 * not lab reviews, and must not read as fabricated editorial testing.
 */
export const POSTS: BlogPost[] = [
  {
    slug: "iphone-16-pro-review",
    title: "iPhone 16 Pro: what the titanium redesign and A18 Pro actually change",
    excerpt: "The headline upgrades explained — and who should genuinely consider upgrading.",
    date: "Jul 28, 2026",
    category: "Guides",
    readMins: 6,
    body: [
      "The iPhone 16 Pro's most talked-about changes are easy to summarise: a lighter titanium frame, the A18 Pro chip built for on-device AI, and a 48MP Fusion camera system with a longer reach on the telephoto end. Here's what each of those means in day-to-day use.",
      "The A18 Pro's advantage shows up in sustained tasks — photo processing, on-device AI features and gaming — where the 6-core GPU and faster neural engine do the heavy lifting. The 48MP Fusion camera pairs a larger main sensor with a 5x telephoto, so low-light shots keep more detail and portraits hold up at longer zoom than earlier Pro models.",
      "Who should upgrade? If you're coming from an iPhone 14 Pro or older, the combined jump in camera, chip and display tech is significant. If you're on a 15 Pro, you already have most of this experience — the 16 Pro refines it rather than redefines it. Choose on camera zoom and battery needs, not the model number.",
    ],
  },
  {
    slug: "best-anc-headphones-2026",
    title: "How to choose noise-cancelling headphones in 2026",
    excerpt: "ANC, battery life and comfort compared across Sony, Bose and JBL — without the jargon.",
    date: "Jul 15, 2026",
    category: "Guides",
    readMins: 8,
    body: [
      "Noise-cancelling headphones are the most spec-heavy category in audio, but only three things really separate them: how well the ANC handles your environment, how long the battery lasts, and whether you can wear them for hours without fatigue.",
      "For commuting and flights, prioritise ANC depth — the Sony WH-1000XM5 is the benchmark here, with adaptive noise sensing and a 30-hour battery that covers long-haul travel. For long work sessions, comfort and a neutral sound signature matter more; that's where Bose's over-ear lineup is strongest. On a budget, hybrid ANC models like the RW75 cut steady low-frequency hum (trains, offices, fans) at a fraction of the flagship price.",
      "Quick checklist before you buy: ear cushion material (memory foam lasts longer), multipoint pairing if you switch between phone and laptop, a detachable or included cable for zero-latency wired use, and quick-charge support. Every model we stock lists these specs on its product page.",
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

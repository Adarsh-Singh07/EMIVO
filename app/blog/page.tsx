import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { POSTS } from "@/lib/blog";

export default function BlogPage() {
  return (
    <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-3">The EMIVO Journal</p>
      <h1 className="text-4xl font-semibold tracking-tight mb-10">Buying guides, reviews &amp; tech news</h1>

      <div className="space-y-6">
        {POSTS.map((p) => (
          <article key={p.slug} className="group border border-neutral-200 rounded-3xl p-6 hover:border-neutral-950 transition-colors">
            <div className="flex items-center gap-3 text-xs text-neutral-500 mb-2">
              <span className="bg-neutral-950 text-white px-2.5 py-0.5 rounded-full">{p.category}</span>
              <span>{p.date}</span>
            </div>
            <h2 className="text-xl font-semibold group-hover:text-neutral-600">{p.title}</h2>
            <p className="text-neutral-500 mt-1.5 text-sm">{p.excerpt}</p>
            <Link
              href={`/blog/${p.slug}`}
              className="inline-flex items-center gap-1.5 text-sm font-medium mt-4 hover:text-neutral-500"
            >
              Read article <ArrowRight className="w-4 h-4" />
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
